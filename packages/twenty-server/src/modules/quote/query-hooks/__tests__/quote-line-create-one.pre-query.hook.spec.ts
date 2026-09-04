import { CommonQueryRunnerException } from 'src/engine/api/common/common-query-runners/errors/common-query-runner.exception';
import { type CreateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { QuoteLineCreateOnePreQueryHook } from 'src/modules/quote/query-hooks/quote-line-create-one.pre-query.hook';
import { QuoteLinePricingService } from 'src/modules/quote/quote-line-pricing/services/quote-line-pricing.service';
import { type QuoteLineWorkspaceEntity } from 'src/modules/quote/standard-objects/quote-line.workspace-entity';

describe('QuoteLineCreateOnePreQueryHook', () => {
  let hook: QuoteLineCreateOnePreQueryHook;
  let quoteLinePricingService: { computePricing: jest.Mock };

  const authContext = {
    workspace: { id: 'workspace-1' },
  } as WorkspaceAuthContext;

  const buildPayload = (
    data: Partial<QuoteLineWorkspaceEntity>,
  ): CreateOneResolverArgs<QuoteLineWorkspaceEntity> => ({
    data: data as QuoteLineWorkspaceEntity,
  });

  beforeEach(() => {
    quoteLinePricingService = { computePricing: jest.fn() };

    hook = new QuoteLineCreateOnePreQueryHook(
      quoteLinePricingService as unknown as QuoteLinePricingService,
    );
  });

  it('does not compute pricing when productId is missing', async () => {
    const payload = buildPayload({ quantity: 2 });

    const result = await hook.execute(authContext, 'quoteLine', payload);

    expect(quoteLinePricingService.computePricing).not.toHaveBeenCalled();
    expect(result).toBe(payload);
  });

  it('computes pricing with defaults for absent quantity/discountPercent/fieldValues', async () => {
    quoteLinePricingService.computePricing.mockResolvedValue({
      unitPrice: 50,
      totalPrice: 90,
    });

    await hook.execute(
      authContext,
      'quoteLine',
      buildPayload({ productId: 'product-1' }),
    );

    expect(quoteLinePricingService.computePricing).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      productId: 'product-1',
      fieldValues: {},
      quantity: 1,
      discountPercent: 0,
      manualUnitPrice: undefined,
    });
  });

  it('sets unitPrice and totalPrice as CurrencyMetadata on success', async () => {
    quoteLinePricingService.computePricing.mockResolvedValue({
      unitPrice: 50,
      totalPrice: 90,
    });

    const payload = buildPayload({
      productId: 'product-1',
      fieldValues: { seats: 5 },
      quantity: 2,
      discountPercent: 10,
    });

    const result = await hook.execute(authContext, 'quoteLine', payload);

    expect(result.data.unitPrice).toEqual({
      amountMicros: 50_000_000,
      currencyCode: 'USD',
    });
    expect(result.data.totalPrice).toEqual({
      amountMicros: 90_000_000,
      currencyCode: 'USD',
    });
  });

  it('preserves a manually-provided currencyCode', async () => {
    quoteLinePricingService.computePricing.mockResolvedValue({
      unitPrice: 42,
      totalPrice: 126,
    });

    const payload = buildPayload({
      productId: 'product-2',
      unitPrice: { amountMicros: 42_000_000, currencyCode: 'EUR' },
    });

    const result = await hook.execute(authContext, 'quoteLine', payload);

    expect(quoteLinePricingService.computePricing).toHaveBeenCalledWith(
      expect.objectContaining({ manualUnitPrice: 42 }),
    );
    expect(result.data.unitPrice).toEqual({
      amountMicros: 42_000_000,
      currencyCode: 'EUR',
    });
  });

  it('throws a CommonQueryRunnerException when pricing computation fails', async () => {
    quoteLinePricingService.computePricing.mockResolvedValue({
      errors: ['Field "seats" is required but no value was provided'],
    });

    await expect(
      hook.execute(
        authContext,
        'quoteLine',
        buildPayload({ productId: 'product-1' }),
      ),
    ).rejects.toThrow(CommonQueryRunnerException);
  });

  it('propagates an exceptional error (e.g. product not found) unwrapped', async () => {
    quoteLinePricingService.computePricing.mockRejectedValue(
      new Error('Product product-1 not found'),
    );

    await expect(
      hook.execute(
        authContext,
        'quoteLine',
        buildPayload({ productId: 'product-1' }),
      ),
    ).rejects.toThrow('Product product-1 not found');
  });
});
