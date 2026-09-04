import { CommonQueryRunnerException } from 'src/engine/api/common/common-query-runners/errors/common-query-runner.exception';
import { type UpdateManyResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { QuoteLineUpdateManyPreQueryHook } from 'src/modules/quote/query-hooks/quote-line-update-many.pre-query.hook';
import { QuoteLinePricingService } from 'src/modules/quote/quote-line-pricing/services/quote-line-pricing.service';
import { type QuoteLineWorkspaceEntity } from 'src/modules/quote/standard-objects/quote-line.workspace-entity';

describe('QuoteLineUpdateManyPreQueryHook', () => {
  let hook: QuoteLineUpdateManyPreQueryHook;
  let quoteLinePricingService: {
    resolveEffectiveState: jest.Mock;
    computePricing: jest.Mock;
  };

  const authContext = {
    workspace: { id: 'workspace-1' },
  } as WorkspaceAuthContext;

  const buildPayload = (
    ids: string[],
    data: Partial<QuoteLineWorkspaceEntity>,
  ): UpdateManyResolverArgs<
    QuoteLineWorkspaceEntity,
    { id: { in: string[] } }
  > => ({
    filter: { id: { in: ids } },
    data: data as QuoteLineWorkspaceEntity,
  });

  beforeEach(() => {
    quoteLinePricingService = {
      resolveEffectiveState: jest.fn(),
      computePricing: jest.fn(),
    };

    hook = new QuoteLineUpdateManyPreQueryHook(
      quoteLinePricingService as unknown as QuoteLinePricingService,
    );
  });

  it('skips pricing when the filter does not resolve to a bounded set of ids', async () => {
    const payload = {
      filter: {},
      data: { discountPercent: 10 },
    } as unknown as UpdateManyResolverArgs<
      QuoteLineWorkspaceEntity,
      { id: { in: string[] } }
    >;

    const result = await hook.execute(authContext, 'quoteLine', payload);

    expect(
      quoteLinePricingService.resolveEffectiveState,
    ).not.toHaveBeenCalled();
    expect(result).toBe(payload);
  });

  it('skips a matched record whose existing row cannot be found', async () => {
    quoteLinePricingService.resolveEffectiveState.mockResolvedValue(null);

    const payload = buildPayload(['missing'], { discountPercent: 10 });
    const result = await hook.execute(authContext, 'quoteLine', payload);

    expect(quoteLinePricingService.computePricing).not.toHaveBeenCalled();
    expect(result).toBe(payload);
  });

  it('sets a uniform unitPrice/totalPrice when every matched line prices identically', async () => {
    quoteLinePricingService.resolveEffectiveState.mockImplementation(
      ({ recordId }: { recordId: string }) =>
        Promise.resolve({
          productId: 'product-1',
          fieldValues: { seats: 5 },
          quantity: 2,
          discountPercent: 10,
          unitPrice: null,
          recordId,
        }),
    );
    quoteLinePricingService.computePricing.mockResolvedValue({
      unitPrice: 50,
      totalPrice: 90,
    });

    const result = await hook.execute(
      authContext,
      'quoteLine',
      buildPayload(['line-1', 'line-2'], { discountPercent: 10 }),
    );

    expect(quoteLinePricingService.computePricing).toHaveBeenCalledTimes(2);
    expect(result.data.unitPrice).toEqual({
      amountMicros: 50_000_000,
      currencyCode: 'USD',
    });
    expect(result.data.totalPrice).toEqual({
      amountMicros: 90_000_000,
      currencyCode: 'USD',
    });
  });

  it('throws when the matched lines would price differently, without mutating data', async () => {
    quoteLinePricingService.resolveEffectiveState.mockImplementation(
      ({ recordId }: { recordId: string }) =>
        Promise.resolve({
          productId: recordId === 'line-1' ? 'product-1' : 'product-2',
          fieldValues: {},
          quantity: 1,
          discountPercent: null,
          unitPrice: null,
        }),
    );
    quoteLinePricingService.computePricing
      .mockResolvedValueOnce({ unitPrice: 50, totalPrice: 50 })
      .mockResolvedValueOnce({ unitPrice: 20, totalPrice: 20 });

    const payload = buildPayload(['line-1', 'line-2'], {
      discountPercent: 10,
    });

    await expect(
      hook.execute(authContext, 'quoteLine', payload),
    ).rejects.toThrow(CommonQueryRunnerException);

    expect(payload.data.unitPrice).toBeUndefined();
  });

  it('throws naming every failing line when pricing computation fails', async () => {
    quoteLinePricingService.resolveEffectiveState.mockResolvedValue({
      productId: 'product-1',
      fieldValues: {},
      quantity: 1,
      discountPercent: null,
      unitPrice: null,
    });
    quoteLinePricingService.computePricing.mockResolvedValue({
      errors: ['Field "seats" is required'],
    });

    const payload = buildPayload(['line-1'], { discountPercent: 10 });

    await expect(
      hook.execute(authContext, 'quoteLine', payload),
    ).rejects.toThrow(/line-1/);
  });
});
