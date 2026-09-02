import { Injectable } from '@nestjs/common';

import { Calculator } from 'dentaku';

import {
  type CostTemplateCalculationError,
  type CostTemplateCalculationFieldInput,
  type CostTemplateCalculationStepInput,
} from 'src/modules/quote/cost-template-calculation/types/cost-template-calculation.types';
import { coerceCostTemplateFieldValues } from 'src/modules/quote/cost-template-calculation/utils/coerce-cost-template-field-values.util';

type CalculateArgs = {
  fields: CostTemplateCalculationFieldInput[];
  steps: CostTemplateCalculationStepInput[];
  fieldValues: Record<string, unknown>;
};

export type CostTemplateCalculationResult =
  | { success: true; value: number }
  | { success: false; errors: CostTemplateCalculationError[] };

@Injectable()
export class CostTemplateCalculationService {
  calculate({
    fields,
    steps,
    fieldValues,
  }: CalculateArgs): CostTemplateCalculationResult {
    const coercionResult = coerceCostTemplateFieldValues({
      fields,
      fieldValues,
    });

    if (!coercionResult.success) {
      return { success: false, errors: coercionResult.errors };
    }

    const outputStep = steps.find((step) => step.isOutput);

    if (!outputStep) {
      return {
        success: false,
        errors: [
          {
            type: 'NO_OUTPUT_STEP',
            message:
              'No step is marked as the output step for this cost template',
          },
        ],
      };
    }

    // A fresh Calculator per call: memory (store) is mutable instance
    // state, and calculations for different templates/field values must
    // never share it.
    const calculator = new Calculator();

    calculator.store(coercionResult.coercedValues);

    // solve(), not storeFormula+evaluate: every step is solved as one
    // batch, in dependency order, regardless of declaration order — and
    // (unlike storeFormula+evaluate) it's the only dentaku entry point
    // that throws a catchable CycleError instead of overflowing the
    // stack on a circular step reference.
    const formulas: Record<string, string> = {};

    for (const step of steps) {
      formulas[step.variableName] = step.formula;
    }

    const solved = calculator.solve(formulas);
    const value = solved[outputStep.variableName];

    if (typeof value !== 'number') {
      return {
        success: false,
        errors: [
          {
            type: 'NON_NUMERIC_OUTPUT',
            message: `Output step "${outputStep.variableName}" did not evaluate to a number`,
            variableName: outputStep.variableName,
          },
        ],
      };
    }

    return { success: true, value };
  }
}
