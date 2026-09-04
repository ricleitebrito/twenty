import { CommonQueryRunnerException } from 'src/engine/api/common/common-query-runners/errors/common-query-runner.exception';
import { type CreateManyResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { QuoteLineCreateManyPreQueryHook } from 'src/modules/quote/query-hooks/quote-line-create-many.pre-query.hook';
import { QuoteLinePricingService } from 'src/modules/quote/quote-line-pricing/services/quote-line-pricing.service';
import { type QuoteLineWorkspaceEntity } from 'src/modules/quote/standard-objects/quote-line.workspace-entity';

describe('QuoteLineCreateManyPreQueryHook', () => {
  let hook: QuoteLineCreateManyPreQueryHook;
  let quoteLinePricingService: { computePricing: jest.Mock };

  const authContext = {
    workspace: { id: 'workspace-1' },
  } as WorkspaceAuthContext;

  const buildPayload = (
    data: Array<Partial<QuoteLineWorkspaceEntity>>,
  ): CreateManyResolverArgs<QuoteLineWorkspaceEntity> => ({
    data: data as QuoteLineWorkspaceEntity[],
  });

  beforeEach(() => {
    quoteLinePricingService = { computePricing: jest.fn() };

    hook = new QuoteLineCreateManyPreQueryHook(
      quoteLinePricingService as unknown as QuoteLinePricingService,
    );
  });

  it('skips records with no productId and does not compute pricing for them', async () => {
    const payload = buildPayload([{ quantity: 2 }]);

    const result = await hook.execute(authContext, 'quoteLine', payload);

    expect(quoteLinePricingService.computePricing).not.toHaveBeenCalled();
    expect(result).toBe(payload);
  });

  it('prices every record with a productId independently', async () => {
    quoteLinePricingService.computePricing
      .mockResolvedValueOnce({ unitPrice: 50, totalPrice: 90 })
      .mockResolvedValueOnce({ unitPrice: 20, totalPrice: 20 });

    const payload = buildPayload([
      { productId: 'product-1', quantity: 2, discountPercent: 10 },
      { productId: 'product-2', quantity: 1 },
    ]);

    const result = await hook.execute(authContext, 'quoteLine', payload);

    expect(quoteLinePricingService.computePricing).toHaveBeenCalledTimes(2);
    expect(result.data[0].unitPrice).toEqual({
      amountMicros: 50_000_000,
      currencyCode: 'USD',
    });
    expect(result.data[1].unitPrice).toEqual({
      amountMicros: 20_000_000,
      currencyCode: 'USD',
    });
  });

  // Regression: falls back to each record's product basePrice currencyCode
  // ahead of the hardcoded USD default.
  it("falls back to the product's basePrice currencyCode instead of the hardcoded USD default", async () => {
    quoteLinePricingService.computePricing.mockResolvedValueOnce({
      unitPrice: 50,
      totalPrice: 90,
      productCurrencyCode: 'EUR',
    });

    const payload = buildPayload([
      { productId: 'product-1', quantity: 2, discountPercent: 10 },
    ]);

    const result = await hook.execute(authContext, 'quoteLine', payload);

    expect(result.data[0].unitPrice).toEqual({
      amountMicros: 50_000_000,
      currencyCode: 'EUR',
    });
  });

  it('fails the whole batch, naming every failing record, when any record cannot be priced', async () => {
    quoteLinePricingService.computePricing
      .mockResolvedValueOnce({ unitPrice: 50, totalPrice: 90 })
      .mockResolvedValueOnce({ errors: ['Field "seats" is required'] });

    const payload = buildPayload([
      { productId: 'product-1', quantity: 2 },
      { productId: 'product-2', quantity: 1 },
    ]);

    await expect(
      hook.execute(authContext, 'quoteLine', payload),
    ).rejects.toThrow(CommonQueryRunnerException);

    // Neither record's payload data should be mutated on batch failure.
    expect(payload.data[0].unitPrice).toBeUndefined();
    expect(payload.data[1].unitPrice).toBeUndefined();
  });

  it('names the failing record index in the exception message', async () => {
    quoteLinePricingService.computePricing.mockResolvedValue({
      errors: ['Field "seats" is required'],
    });

    const payload = buildPayload([{ productId: 'product-1', quantity: 1 }]);

    await expect(
      hook.execute(authContext, 'quoteLine', payload),
    ).rejects.toThrow(/record 0/);
  });
});
