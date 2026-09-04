import { msg } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';

import { type WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { type CreateManyResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

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

@WorkspaceQueryHook(`quoteLine.createMany`)
export class QuoteLineCreateManyPreQueryHook implements WorkspacePreQueryHookInstance {
  constructor(
    private readonly quoteLinePricingService: QuoteLinePricingService,
  ) {}

  async execute(
    authContext: WorkspaceAuthContext,
    _objectName: string,
    payload: CreateManyResolverArgs<QuoteLineWorkspaceEntity>,
  ): Promise<CreateManyResolverArgs<QuoteLineWorkspaceEntity>> {
    // Each record in a createMany batch is independent (no uniqueness
    // constraint between sibling QuoteLines, unlike costTemplateField/Step's
    // variableName collisions), so every record with a productId is priced
    // on its own.
    const entries = payload.data
      .map((record, index) =>
        isDefined(record.productId) ? { index, record } : null,
      )
      .filter(isDefined);

    if (entries.length === 0) {
      return payload;
    }

    const results = await Promise.all(
      entries.map(({ record }) =>
        this.quoteLinePricingService.computePricing({
          workspaceId: authContext.workspace.id,
          // isDefined-filtered above.
          productId: record.productId as string,
          fieldValues: record.fieldValues ?? {},
          quantity: record.quantity ?? 1,
          discountPercent: record.discountPercent ?? 0,
          manualUnitPrice: currencyMetadataToAmount(record.unitPrice),
        }),
      ),
    );

    const failures = entries
      .map(({ index }, position) => ({ index, result: results[position] }))
      .filter(
        (entry): entry is { index: number; result: { errors: string[] } } =>
          'errors' in entry.result,
      );

    // Fail the whole batch rather than persisting some records with prices
    // and silently skipping others — mirrors
    // CostTemplateFieldCreateManyPreQueryHook's collision check, which also
    // rejects the entire createMany payload on any one record's problem
    // rather than partially applying it.
    if (failures.length > 0) {
      const detail = failures
        .map(
          ({ index, result }) => `record ${index}: ${result.errors.join('; ')}`,
        )
        .join(' | ');

      throw new CommonQueryRunnerException(
        `Could not compute pricing for ${failures.length} quote line(s) in this batch: ${detail}`,
        CommonQueryRunnerExceptionCode.INVALID_QUERY_INPUT,
        {
          userFriendlyMessage: msg`Some quote lines in this batch could not be priced: ${detail}`,
        },
      );
    }

    entries.forEach(({ index, record }, position) => {
      const result = results[position] as Exclude<
        QuoteLinePricingResult,
        { errors: string[] }
      >;
      const currencyCode =
        record.unitPrice?.currencyCode ??
        result.productCurrencyCode ??
        DEFAULT_QUOTE_LINE_CURRENCY_CODE;

      payload.data[index].unitPrice = amountToCurrencyMetadata(
        result.unitPrice,
        currencyCode,
      );
      payload.data[index].totalPrice = amountToCurrencyMetadata(
        result.totalPrice,
        currencyCode,
      );
    });

    return payload;
  }
}
