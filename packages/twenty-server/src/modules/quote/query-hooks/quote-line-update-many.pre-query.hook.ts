import { msg } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';

import { type WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { type UpdateManyResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import {
  CommonQueryRunnerException,
  CommonQueryRunnerExceptionCode,
} from 'src/engine/api/common/common-query-runners/errors/common-query-runner.exception';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import {
  QuoteLinePricingService,
  type QuoteLinePricingResult,
} from 'src/modules/quote/quote-line-pricing/services/quote-line-pricing.service';
import {
  amountToCurrencyMetadata,
  currencyMetadataToAmount,
  DEFAULT_QUOTE_LINE_CURRENCY_CODE,
} from 'src/modules/quote/quote-line-pricing/utils/quote-line-currency-metadata.util';
import { type QuoteLineWorkspaceEntity } from 'src/modules/quote/standard-objects/quote-line.workspace-entity';

type QuoteLineUpdateManyFilter = { id: { in: string[] } };

@WorkspaceQueryHook(`quoteLine.updateMany`)
export class QuoteLineUpdateManyPreQueryHook implements WorkspacePreQueryHookInstance {
  constructor(
    private readonly quoteLinePricingService: QuoteLinePricingService,
  ) {}

  async execute(
    authContext: WorkspaceAuthContext,
    _objectName: string,
    payload: UpdateManyResolverArgs<
      QuoteLineWorkspaceEntity,
      QuoteLineUpdateManyFilter
    >,
  ): Promise<
    UpdateManyResolverArgs<QuoteLineWorkspaceEntity, QuoteLineUpdateManyFilter>
  > {
    const ids = payload.filter?.id?.in;

    // updateMany applies the same `data` patch to every matched record. Bulk
    // edit in this app always scopes updateMany with `id: { in: [...] }`
    // (see cost-template-field-update-many.pre-query.hook.ts for the same
    // precedent); if we can't resolve the affected ids we can't safely
    // price, so we skip rather than guess.
    if (!isDefined(ids) || ids.length === 0) {
      return payload;
    }

    const effectiveStates = await Promise.all(
      ids.map((id) =>
        this.quoteLinePricingService.resolveEffectiveState({
          workspaceId: authContext.workspace.id,
          recordId: id,
          productId: payload.data.productId,
          fieldValues: payload.data.fieldValues,
          quantity: payload.data.quantity,
          discountPercent: payload.data.discountPercent,
          unitPrice: payload.data.unitPrice,
        }),
      ),
    );

    const pricingInputs = effectiveStates
      .map((state, position) =>
        isDefined(state) && isDefined(state.productId)
          ? {
              id: ids[position],
              state: { ...state, productId: state.productId as string },
            }
          : null,
      )
      .filter(isDefined);

    if (pricingInputs.length === 0) {
      return payload;
    }

    const results = await Promise.all(
      pricingInputs.map(({ state }) =>
        this.quoteLinePricingService.computePricing({
          workspaceId: authContext.workspace.id,
          productId: state.productId,
          fieldValues: state.fieldValues ?? {},
          quantity: state.quantity,
          discountPercent: state.discountPercent,
          manualUnitPrice: currencyMetadataToAmount(state.unitPrice),
        }),
      ),
    );

    const failures = pricingInputs
      .map(({ id }, position) => ({ id, result: results[position] }))
      .filter(
        (entry): entry is { id: string; result: { errors: string[] } } =>
          'errors' in entry.result,
      );

    if (failures.length > 0) {
      const detail = failures
        .map(({ id, result }) => `${id}: ${result.errors.join('; ')}`)
        .join(' | ');

      throw new CommonQueryRunnerException(
        `Could not compute pricing for ${failures.length} quote line(s) in this batch: ${detail}`,
        CommonQueryRunnerExceptionCode.INVALID_QUERY_INPUT,
        {
          userFriendlyMessage: msg`Some quote lines in this update could not be priced: ${detail}`,
        },
      );
    }

    const successes = results as Exclude<
      QuoteLinePricingResult,
      { errors: string[] }
    >[];
    const [first, ...rest] = successes;
    const allIdentical = rest.every(
      (result) =>
        result.unitPrice === first.unitPrice &&
        result.totalPrice === first.totalPrice,
    );

    // UpdateManyResolverArgs.data is a single object applied uniformly to
    // every matched record via one filtered UPDATE (see
    // CommonUpdateManyQueryRunnerService.run: one `data`, one `filter`, no
    // per-record branching downstream) — a differentiated per-record price
    // can't be expressed through this hook's return value the way it can
    // for createOne/updateOne/createMany. It's only safe to write a single
    // computed price here when every matched line prices out identically;
    // otherwise silently applying one line's price to every other line in
    // the batch would corrupt data, so this fails loudly instead and asks
    // the caller to update lines individually.
    //
    // This means the most common realistic bulk-edit action (a uniform
    // discountPercent bump across QuoteLines on different products, which
    // will almost always price differently) is currently always rejected.
    // Tracked as a known limitation, not a silent gap — see the plan's
    // "Known limitation surfaced during Task 3" section in
    // docs/superpowers/plans/2026-09-03-quote-cpq-quote-quoteline-objects.md
    // for the follow-up (a dedicated bulk-recompute mechanism, or a product
    // decision that price-affecting bulk edits go one-at-a-time).
    if (!allIdentical) {
      throw new CommonQueryRunnerException(
        'This update would compute different prices for different quote lines in the batch, which updateMany cannot apply per-record',
        CommonQueryRunnerExceptionCode.INVALID_QUERY_INPUT,
        {
          userFriendlyMessage: msg`These quote lines would end up with different prices — update them individually instead of in bulk.`,
        },
      );
    }

    const currencyCode =
      payload.data.unitPrice?.currencyCode ??
      pricingInputs[0].state.unitPrice?.currencyCode ??
      first.productCurrencyCode ??
      DEFAULT_QUOTE_LINE_CURRENCY_CODE;

    payload.data.unitPrice = amountToCurrencyMetadata(
      first.unitPrice,
      currencyCode,
    );
    payload.data.totalPrice = amountToCurrencyMetadata(
      first.totalPrice,
      currencyCode,
    );

    return payload;
  }
}
