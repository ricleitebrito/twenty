import { msg } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';

import { type WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { type CreateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

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

@WorkspaceQueryHook(`quoteLine.createOne`)
export class QuoteLineCreateOnePreQueryHook implements WorkspacePreQueryHookInstance {
  constructor(
    private readonly quoteLinePricingService: QuoteLinePricingService,
  ) {}

  async execute(
    authContext: WorkspaceAuthContext,
    _objectName: string,
    payload: CreateOneResolverArgs<QuoteLineWorkspaceEntity>,
  ): Promise<CreateOneResolverArgs<QuoteLineWorkspaceEntity>> {
    const { productId } = payload.data;

    // productId is the only pricing input with no usable fallback (quantity,
    // discountPercent and fieldValues all have safe defaults); without it
    // there's nothing to price, and the mutation's own not-null validation
    // will already reject the create with a clearer message than this hook
    // could produce.
    if (!isDefined(productId)) {
      return payload;
    }

    const result = await this.quoteLinePricingService.computePricing({
      workspaceId: authContext.workspace.id,
      productId,
      fieldValues: payload.data.fieldValues ?? {},
      quantity: payload.data.quantity ?? 1,
      discountPercent: payload.data.discountPercent ?? 0,
      manualUnitPrice: currencyMetadataToAmount(payload.data.unitPrice),
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
      payload.data.unitPrice?.currencyCode ?? DEFAULT_QUOTE_LINE_CURRENCY_CODE;

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
