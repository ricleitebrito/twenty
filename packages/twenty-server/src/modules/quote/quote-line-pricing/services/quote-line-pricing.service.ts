import { Injectable } from '@nestjs/common';

import { type CurrencyMetadata } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { CostTemplateCalculationService } from 'src/modules/quote/cost-template-calculation/services/cost-template-calculation.service';
import {
  type CostTemplateCalculationFieldInput,
  type CostTemplateCalculationStepInput,
} from 'src/modules/quote/cost-template-calculation/types/cost-template-calculation.types';
import { type CostTemplateFieldWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template-field.workspace-entity';
import { type CostTemplateStepWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template-step.workspace-entity';
import { type ProductWorkspaceEntity } from 'src/modules/quote/standard-objects/product.workspace-entity';
import { type QuoteLineWorkspaceEntity } from 'src/modules/quote/standard-objects/quote-line.workspace-entity';

export type ComputePricingArgs = {
  workspaceId: string;
  productId: string;
  fieldValues: Record<string, unknown>;
  quantity: number;
  discountPercent: number | null;
  // Already unwrapped from CurrencyMetadata into a plain major-unit number
  // by the caller (the pre-query hooks) — this service works entirely in
  // plain numbers, the same domain CostTemplateCalculationService's formulas
  // operate in, and never touches CurrencyMetadata itself.
  manualUnitPrice: number | undefined;
};

export type QuoteLinePricingResult =
  | { unitPrice: number; totalPrice: number }
  | { errors: string[] };

type ResolveEffectiveQuoteLineStateArgs = {
  workspaceId: string;
  recordId: string;
  // The product relation isn't legitimately nullable (see
  // product.workspace-entity.ts's isNullable: false), but the workspace
  // entity's generated type is `string | null` like every relation id, so
  // this accepts null defensively even though resolveEffectiveValue would
  // only ever see it from corrupt data, never a legitimate client payload.
  productId: string | null | undefined;
  fieldValues: Record<string, unknown> | null | undefined;
  quantity: number | undefined;
  discountPercent: number | null | undefined;
  unitPrice: CurrencyMetadata | null | undefined;
};

export type EffectiveQuoteLineState = {
  productId: string | null;
  fieldValues: Record<string, unknown> | null;
  quantity: number;
  discountPercent: number | null;
  unitPrice: CurrencyMetadata | null;
};

type ComputeTotalPriceArgs = {
  unitPrice: number;
  quantity: number;
  discountPercent: number | null;
};

const computeTotalPrice = ({
  unitPrice,
  quantity,
  discountPercent,
}: ComputeTotalPriceArgs): number =>
  unitPrice * quantity * (1 - (discountPercent ?? 0) / 100);

const toCalculationFieldInput = (
  field: CostTemplateFieldWorkspaceEntity,
): CostTemplateCalculationFieldInput => ({
  // variableName is only null on the entity for a field that was never
  // finished being configured — such a field can't be referenced by any
  // formula, so it's filtered out by the caller before this runs (see
  // isDefined(field.variableName) below) and this cast is safe.
  variableName: field.variableName as string,
  fieldType: field.fieldType,
  isRequired: field.isRequired,
});

const toCalculationStepInput = (
  step: CostTemplateStepWorkspaceEntity,
): CostTemplateCalculationStepInput => ({
  variableName: step.variableName as string,
  formula: step.formula,
  isOutput: step.isOutput,
});

// A payload value of `undefined` means "the client didn't touch this field
// in the update" (dataArgProcessor drops undefined-valued keys entirely
// before pre-query hooks run — see data-arg-processor.service.ts), so it
// falls back to the existing record. `null` is a value the client
// deliberately sent (e.g. clearing discountPercent) and must be kept as-is,
// not conflated with "absent" the way `??` would.
const resolveEffectiveValue = <TValue>(
  payloadValue: TValue | undefined,
  existingValue: TValue,
): TValue => (payloadValue !== undefined ? payloadValue : existingValue);

@Injectable()
export class QuoteLinePricingService {
  constructor(
    private readonly workspaceOrmManager: WorkspaceOrmManager,
    private readonly costTemplateCalculationService: CostTemplateCalculationService,
  ) {}

  // Update payloads only carry the fields the client actually changed, so a
  // QuoteLine update needs its full effective post-update state (product,
  // fieldValues, quantity, discountPercent, unitPrice) resolved by always
  // fetching the existing record and merging it with whatever the payload
  // carries — mirroring CostTemplateValidationService's
  // resolveEffectiveFieldState/resolveEffectiveStepState pattern, which
  // exists specifically because a narrower "only fetch when field X is
  // missing" conditional proved buggy in this codebase before.
  async resolveEffectiveState({
    workspaceId,
    recordId,
    productId,
    fieldValues,
    quantity,
    discountPercent,
    unitPrice,
  }: ResolveEffectiveQuoteLineStateArgs): Promise<EffectiveQuoteLineState | null> {
    const authContext = buildSystemAuthContext(workspaceId);

    const existingRecord =
      await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
        const repository =
          this.workspaceOrmManager.getRepository<QuoteLineWorkspaceEntity>(
            'quoteLine',
            { shouldBypassPermissionChecks: true },
          );

        return repository.findOne({ where: { id: recordId } });
      }, authContext);

    if (!isDefined(existingRecord)) {
      return null;
    }

    return {
      productId: resolveEffectiveValue(productId, existingRecord.productId),
      fieldValues: resolveEffectiveValue(
        fieldValues,
        existingRecord.fieldValues,
      ),
      quantity: resolveEffectiveValue(quantity, existingRecord.quantity),
      discountPercent: resolveEffectiveValue(
        discountPercent,
        existingRecord.discountPercent,
      ),
      unitPrice: resolveEffectiveValue(unitPrice, existingRecord.unitPrice),
    };
  }

  async computePricing({
    workspaceId,
    productId,
    fieldValues,
    quantity,
    discountPercent,
    manualUnitPrice,
  }: ComputePricingArgs): Promise<QuoteLinePricingResult> {
    const authContext = buildSystemAuthContext(workspaceId);

    const product = await this.workspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const productRepository =
          this.workspaceOrmManager.getRepository<ProductWorkspaceEntity>(
            'product',
            { shouldBypassPermissionChecks: true },
          );

        return productRepository.findOne({
          where: { id: productId },
          relations: { costTemplate: { fields: true, steps: true } },
        });
      },
      authContext,
    );

    // The referenced productId doesn't exist at all — a caller/data-integrity
    // problem, not a formula/validation problem, so this throws rather than
    // returning a structured { errors } result.
    if (!isDefined(product)) {
      throw new Error(`Product ${productId} not found`);
    }

    if (!isDefined(product.costTemplate)) {
      const unitPrice = manualUnitPrice ?? 0;

      return {
        unitPrice,
        totalPrice: computeTotalPrice({ unitPrice, quantity, discountPercent }),
      };
    }

    const calculationResult = this.costTemplateCalculationService.calculate({
      fields: product.costTemplate.fields
        .filter((field) => isDefined(field.variableName))
        .map(toCalculationFieldInput),
      steps: product.costTemplate.steps
        .filter((step) => isDefined(step.variableName))
        .map(toCalculationStepInput),
      fieldValues,
    });

    if (!calculationResult.success) {
      return {
        errors: calculationResult.errors.map((error) => error.message),
      };
    }

    const unitPrice = calculationResult.value;

    return {
      unitPrice,
      totalPrice: computeTotalPrice({ unitPrice, quantity, discountPercent }),
    };
  }
}
