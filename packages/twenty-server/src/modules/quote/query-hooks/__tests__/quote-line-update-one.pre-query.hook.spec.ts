import { CommonQueryRunnerException } from 'src/engine/api/common/common-query-runners/errors/common-query-runner.exception';
import { type UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { QuoteLineUpdateOnePreQueryHook } from 'src/modules/quote/query-hooks/quote-line-update-one.pre-query.hook';
import { QuoteLinePricingService } from 'src/modules/quote/quote-line-pricing/services/quote-line-pricing.service';
import { type QuoteLineWorkspaceEntity } from 'src/modules/quote/standard-objects/quote-line.workspace-entity';

describe('QuoteLineUpdateOnePreQueryHook', () => {
  let hook: QuoteLineUpdateOnePreQueryHook;
  let quoteLinePricingService: {
    resolveEffectiveState: jest.Mock;
    computePricing: jest.Mock;
  };

  const authContext = {
    workspace: { id: 'workspace-1' },
  } as WorkspaceAuthContext;

  const buildPayload = (
    id: string,
    data: Partial<QuoteLineWorkspaceEntity>,
  ): UpdateOneResolverArgs<QuoteLineWorkspaceEntity> => ({
    id,
    data: data as QuoteLineWorkspaceEntity,
  });

  beforeEach(() => {
    quoteLinePricingService = {
      resolveEffectiveState: jest.fn(),
      computePricing: jest.fn(),
    };

    hook = new QuoteLineUpdateOnePreQueryHook(
      quoteLinePricingService as unknown as QuoteLinePricingService,
    );
  });

  it('always resolves effective state, even when the payload only touches an unrelated field', async () => {
    quoteLinePricingService.resolveEffectiveState.mockResolvedValue(null);

    await hook.execute(
      authContext,
      'quoteLine',
      buildPayload('quote-line-1', { discountPercent: 20 }),
    );

    expect(quoteLinePricingService.resolveEffectiveState).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      recordId: 'quote-line-1',
      productId: undefined,
      fieldValues: undefined,
      quantity: undefined,
      discountPercent: 20,
      unitPrice: undefined,
    });
  });

  it('returns the payload unchanged when the existing record cannot be found', async () => {
    quoteLinePricingService.resolveEffectiveState.mockResolvedValue(null);

    const payload = buildPayload('missing', { discountPercent: 20 });
    const result = await hook.execute(authContext, 'quoteLine', payload);

    expect(quoteLinePricingService.computePricing).not.toHaveBeenCalled();
    expect(result).toBe(payload);
  });

  it('computes pricing from the effective state and sets unitPrice/totalPrice', async () => {
    quoteLinePricingService.resolveEffectiveState.mockResolvedValue({
      productId: 'product-1',
      fieldValues: { seats: 5 },
      quantity: 2,
      discountPercent: 10,
      unitPrice: null,
    });
    quoteLinePricingService.computePricing.mockResolvedValue({
      unitPrice: 50,
      totalPrice: 90,
    });

    const result = await hook.execute(
      authContext,
      'quoteLine',
      buildPayload('quote-line-1', { discountPercent: 10 }),
    );

    expect(quoteLinePricingService.computePricing).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      productId: 'product-1',
      fieldValues: { seats: 5 },
      quantity: 2,
      discountPercent: 10,
      manualUnitPrice: undefined,
    });
    expect(result.data.unitPrice).toEqual({
      amountMicros: 50_000_000,
      currencyCode: 'USD',
    });
    expect(result.data.totalPrice).toEqual({
      amountMicros: 90_000_000,
      currencyCode: 'USD',
    });
  });

  it('inherits the currencyCode from the effective existing unitPrice', async () => {
    quoteLinePricingService.resolveEffectiveState.mockResolvedValue({
      productId: 'product-1',
      fieldValues: {},
      quantity: 1,
      discountPercent: null,
      unitPrice: { amountMicros: 10_000_000, currencyCode: 'EUR' },
    });
    quoteLinePricingService.computePricing.mockResolvedValue({
      unitPrice: 50,
      totalPrice: 50,
    });

    const result = await hook.execute(
      authContext,
      'quoteLine',
      buildPayload('quote-line-1', {}),
    );

    expect(result.data.unitPrice).toEqual({
      amountMicros: 50_000_000,
      currencyCode: 'EUR',
    });
  });

  it('throws a CommonQueryRunnerException when pricing computation fails', async () => {
    quoteLinePricingService.resolveEffectiveState.mockResolvedValue({
      productId: 'product-1',
      fieldValues: {},
      quantity: 1,
      discountPercent: null,
      unitPrice: null,
    });
    quoteLinePricingService.computePricing.mockResolvedValue({
      errors: ['Field "seats" is required but no value was provided'],
    });

    await expect(
      hook.execute(authContext, 'quoteLine', buildPayload('quote-line-1', {})),
    ).rejects.toThrow(CommonQueryRunnerException);
  });

  it('skips pricing when the effective productId is missing', async () => {
    quoteLinePricingService.resolveEffectiveState.mockResolvedValue({
      productId: null,
      fieldValues: {},
      quantity: 1,
      discountPercent: null,
      unitPrice: null,
    });

    const payload = buildPayload('quote-line-1', {});
    const result = await hook.execute(authContext, 'quoteLine', payload);

    expect(quoteLinePricingService.computePricing).not.toHaveBeenCalled();
    expect(result).toBe(payload);
  });
});
