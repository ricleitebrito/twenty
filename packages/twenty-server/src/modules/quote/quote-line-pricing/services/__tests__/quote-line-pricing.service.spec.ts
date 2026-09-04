import { Test } from '@nestjs/testing';

import { CostTemplateCalculationService } from 'src/modules/quote/cost-template-calculation/services/cost-template-calculation.service';
import { QuoteLinePricingService } from 'src/modules/quote/quote-line-pricing/services/quote-line-pricing.service';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';

describe('QuoteLinePricingService', () => {
  let service: QuoteLinePricingService;
  let productRepository: { findOne: jest.Mock };
  let quoteLineRepository: { findOne: jest.Mock };
  let getRepositoryMock: jest.Mock;

  beforeEach(async () => {
    productRepository = { findOne: jest.fn() };
    quoteLineRepository = { findOne: jest.fn() };
    getRepositoryMock = jest.fn((objectMetadataName: string) =>
      objectMetadataName === 'product'
        ? productRepository
        : quoteLineRepository,
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        QuoteLinePricingService,
        // Real CostTemplateCalculationService: it has no side effects (no DB,
        // pure dentaku math), so using the genuine implementation here
        // exercises the real coercion/formula pipeline instead of a mock
        // that could silently drift from its real error/success shapes.
        CostTemplateCalculationService,
        {
          provide: WorkspaceOrmManager,
          useValue: {
            getRepository: getRepositoryMock,
            executeInWorkspaceContext: jest.fn((fn: () => unknown) => fn()),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(QuoteLinePricingService);
  });

  describe('computePricing', () => {
    it('computes unitPrice and totalPrice when the product has a cost template', async () => {
      productRepository.findOne.mockResolvedValue({
        id: 'product-1',
        costTemplate: {
          id: 'cost-template-1',
          fields: [
            {
              id: 'field-1',
              variableName: 'seats',
              fieldType: 'NUMBER',
              isRequired: true,
            },
          ],
          steps: [
            {
              id: 'step-1',
              variableName: 'total',
              formula: 'seats * 10',
              isOutput: true,
            },
          ],
        },
      });

      // seats=5 -> total = 5 * 10 = 50 -> unitPrice = 50
      // totalPrice = 50 * 2 * (1 - 10/100) = 100 * 0.9 = 90
      await expect(
        service.computePricing({
          workspaceId: 'workspace-1',
          productId: 'product-1',
          fieldValues: { seats: 5 },
          quantity: 2,
          discountPercent: 10,
          manualUnitPrice: undefined,
        }),
      ).resolves.toEqual({ unitPrice: 50, totalPrice: 90 });

      expect(getRepositoryMock).toHaveBeenCalledWith('product', {
        shouldBypassPermissionChecks: true,
      });
      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        relations: { costTemplate: { fields: true, steps: true } },
      });
    });

    it('returns the manually-provided unitPrice unchanged when the product has no cost template', async () => {
      productRepository.findOne.mockResolvedValue({
        id: 'product-2',
        costTemplate: null,
      });

      // No cost template -> unitPrice passes through as-is.
      // totalPrice = 42 * 3 * (1 - 0/100) = 126
      await expect(
        service.computePricing({
          workspaceId: 'workspace-1',
          productId: 'product-2',
          fieldValues: {},
          quantity: 3,
          discountPercent: null,
          manualUnitPrice: 42,
        }),
      ).resolves.toEqual({ unitPrice: 42, totalPrice: 126 });
    });

    it('defaults to a zero unitPrice when the product has no cost template and none was provided manually', async () => {
      productRepository.findOne.mockResolvedValue({
        id: 'product-2',
        costTemplate: null,
      });

      await expect(
        service.computePricing({
          workspaceId: 'workspace-1',
          productId: 'product-2',
          fieldValues: {},
          quantity: 3,
          discountPercent: null,
          manualUnitPrice: undefined,
        }),
      ).resolves.toEqual({ unitPrice: 0, totalPrice: 0 });
    });

    it('returns errors when the product has a cost template but calculation fails', async () => {
      productRepository.findOne.mockResolvedValue({
        id: 'product-1',
        costTemplate: {
          id: 'cost-template-1',
          fields: [
            {
              id: 'field-1',
              variableName: 'seats',
              fieldType: 'NUMBER',
              isRequired: true,
            },
          ],
          steps: [
            {
              id: 'step-1',
              variableName: 'total',
              formula: 'seats * 10',
              isOutput: true,
            },
          ],
        },
      });

      // seats is required but missing from fieldValues.
      await expect(
        service.computePricing({
          workspaceId: 'workspace-1',
          productId: 'product-1',
          fieldValues: {},
          quantity: 1,
          discountPercent: null,
          manualUnitPrice: undefined,
        }),
      ).resolves.toEqual({
        errors: ['Field "seats" is required but no value was provided'],
      });
    });

    it('throws when the product itself cannot be found', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(
        service.computePricing({
          workspaceId: 'workspace-1',
          productId: 'missing-product',
          fieldValues: {},
          quantity: 1,
          discountPercent: null,
          manualUnitPrice: undefined,
        }),
      ).rejects.toThrow('Product missing-product not found');
    });

    it('filters out fields and steps with no variableName before calculating', async () => {
      productRepository.findOne.mockResolvedValue({
        id: 'product-1',
        costTemplate: {
          id: 'cost-template-1',
          fields: [
            {
              id: 'field-1',
              variableName: null,
              fieldType: 'NUMBER',
              isRequired: false,
            },
            {
              id: 'field-2',
              variableName: 'seats',
              fieldType: 'NUMBER',
              isRequired: true,
            },
          ],
          steps: [
            {
              id: 'step-1',
              variableName: 'total',
              formula: 'seats * 10',
              isOutput: true,
            },
          ],
        },
      });

      await expect(
        service.computePricing({
          workspaceId: 'workspace-1',
          productId: 'product-1',
          fieldValues: { seats: 5 },
          quantity: 1,
          discountPercent: null,
          manualUnitPrice: undefined,
        }),
      ).resolves.toEqual({ unitPrice: 50, totalPrice: 50 });
    });
  });

  describe('resolveEffectiveState', () => {
    it('falls back to the existing record for whichever fields are absent from the call', async () => {
      quoteLineRepository.findOne.mockResolvedValue({
        id: 'quote-line-1',
        productId: 'product-1',
        fieldValues: { seats: 5 },
        quantity: 2,
        discountPercent: 10,
        unitPrice: { amountMicros: 50_000_000, currencyCode: 'USD' },
      });

      await expect(
        service.resolveEffectiveState({
          workspaceId: 'workspace-1',
          recordId: 'quote-line-1',
          productId: undefined,
          fieldValues: undefined,
          quantity: 3,
          discountPercent: undefined,
          unitPrice: undefined,
        }),
      ).resolves.toEqual({
        productId: 'product-1',
        fieldValues: { seats: 5 },
        quantity: 3,
        discountPercent: 10,
        unitPrice: { amountMicros: 50_000_000, currencyCode: 'USD' },
      });

      expect(quoteLineRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'quote-line-1' },
      });
    });

    it('keeps an explicit null rather than falling back to the existing value', async () => {
      quoteLineRepository.findOne.mockResolvedValue({
        id: 'quote-line-1',
        productId: 'product-1',
        fieldValues: { seats: 5 },
        quantity: 2,
        discountPercent: 10,
        unitPrice: { amountMicros: 50_000_000, currencyCode: 'USD' },
      });

      await expect(
        service.resolveEffectiveState({
          workspaceId: 'workspace-1',
          recordId: 'quote-line-1',
          productId: undefined,
          fieldValues: undefined,
          quantity: undefined,
          discountPercent: null,
          unitPrice: null,
        }),
      ).resolves.toEqual({
        productId: 'product-1',
        fieldValues: { seats: 5 },
        quantity: 2,
        discountPercent: null,
        unitPrice: null,
      });
    });

    it('returns null when the existing record cannot be found', async () => {
      quoteLineRepository.findOne.mockResolvedValue(null);

      await expect(
        service.resolveEffectiveState({
          workspaceId: 'workspace-1',
          recordId: 'missing-quote-line',
          productId: undefined,
          fieldValues: undefined,
          quantity: undefined,
          discountPercent: undefined,
          unitPrice: undefined,
        }),
      ).resolves.toBeNull();
    });
  });
});
