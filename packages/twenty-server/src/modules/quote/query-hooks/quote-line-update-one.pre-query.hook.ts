import { msg } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';

import { type WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { type UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import {
  CommonQueryRunnerException,
  CommonQueryRunnerExceptionCode,
} from 'src/engine/api/common/common-query-runners/errors/common-query-runner.exception';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { QuoteLinePricingService } from 'src/modules/quote/quote-line-pricing/services/quote-line-pricing.service';
import {
  amountToCurrencyMetadata,
  currencyMetadataToAmount,
  DEFAULT_QUOTE_LINE_CURRENCY_CODE,
} from 'src/modules/quote/quote-line-pricing/utils/quote-line-currency-metadata.util';
import { type QuoteLineWorkspaceEntity } from 'src/modules/quote/standard-objects/quote-line.workspace-entity';

@WorkspaceQueryHook(`quoteLine.updateOne`)
export class QuoteLineUpdateOnePreQueryHook implements WorkspacePreQueryHookInstance {
  constructor(
    private readonly quoteLinePricingService: QuoteLinePricingService,
  ) {}

  async execute(
    authContext: WorkspaceAuthContext,
    _objectName: string,
    payload: UpdateOneResolverArgs<QuoteLineWorkspaceEntity>,
  ): Promise<UpdateOneResolverArgs<QuoteLineWorkspaceEntity>> {
    // Always resolve the effective post-update state (payload value, falling
    // back to the existing record) rather than branching on which pricing
    // field happens to be present in this partial update — e.g. a
    // discountPercent-only change must still be priced against the line's
    // existing product/quantity/fieldValues just as much as a product swap.
    const effectiveState =
      await this.quoteLinePricingService.resolveEffectiveState({
        workspaceId: authContext.workspace.id,
        recordId: payload.id,
        productId: payload.data.productId,
        fieldValues: payload.data.fieldValues,
        quantity: payload.data.quantity,
        discountPercent: payload.data.discountPercent,
        unitPrice: payload.data.unitPrice,
      });

    if (!isDefined(effectiveState) || !isDefined(effectiveState.productId)) {
      return payload;
    }

    const result = await this.quoteLinePricingService.computePricing({
      workspaceId: authContext.workspace.id,
      productId: effectiveState.productId,
      fieldValues: effectiveState.fieldValues ?? {},
      quantity: effectiveState.quantity,
      discountPercent: effectiveState.discountPercent,
      manualUnitPrice: currencyMetadataToAmount(effectiveState.unitPrice),
    });

    if ('errors' in result) {
      throw new CommonQueryRunnerException(
        `Could not compute pricing for this quote line: ${result.errors.join('; ')}`,
        CommonQueryRunnerExceptionCode.INVALID_QUERY_INPUT,
        {
          userFriendlyMessage: msg`This quote line's pricing could not be computed: ${result.errors.join('; ')}`,
        },
      );
    }

    const currencyCode =
      effectiveState.unitPrice?.currencyCode ??
      DEFAULT_QUOTE_LINE_CURRENCY_CODE;

    payload.data.unitPrice = amountToCurrencyMetadata(
      result.unitPrice,
      currencyCode,
    );
    payload.data.totalPrice = amountToCurrencyMetadata(
      result.totalPrice,
      currencyCode,
    );

    return payload;
  }
}
