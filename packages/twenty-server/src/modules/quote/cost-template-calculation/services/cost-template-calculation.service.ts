import { Injectable } from '@nestjs/common';

import {
  ArgumentCountError,
  Calculator,
  CycleError,
  DentakuError,
  MathDomainError,
  TypeMismatchError,
  UnboundVariableError,
  ZeroDivisionError,
} from 'dentaku';

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

    // solve(), not storeFormula+evaluate: every step is solved as one
    // batch, in dependency order, regardless of declaration order — and
    // (unlike storeFormula+evaluate) it's the only dentaku entry point
    // that throws a catchable CycleError instead of overflowing the
    // stack on a circular step reference.
    const formulas: Record<string, string> = {};

    for (const step of steps) {
      formulas[step.variableName] = step.formula;
    }

    let solved: Record<string, unknown>;

    try {
      // store() inside the try, not before it: it can also throw (e.g.
      // TypeMismatchError for a non-finite number), and any store()-time
      // throw must be mapped through mapDentakuErrorToCalculationError
      // like a solve()-time one, not escape as a raw exception.
      calculator.store(coercionResult.coercedValues);
      solved = calculator.solve(formulas);
    } catch (error) {
      return {
        success: false,
        errors: [
          mapDentakuErrorToCalculationError(error, outputStep.variableName),
        ],
      };
    }

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

const mapDentakuErrorToCalculationError = (
  error: unknown,
  fallbackVariableName: string,
): CostTemplateCalculationError => {
  if (!(error instanceof DentakuError)) {
    // Not a DentakuError at all (e.g. a real bug) — not this function's
    // job to swallow, per the spec's "never a raw 500" applying only to
    // *formula* errors, not to genuine defects.
    throw error;
  }

  // solve()'s bulk errors carry .key naming the specific formula that
  // failed — an intermediate step, not necessarily the output step.
  // Falls back to the output step's name for the rare case key is unset.
  const variableName = error.key ?? fallbackVariableName;

  if (error instanceof UnboundVariableError) {
    return { type: 'UNBOUND_VARIABLE', message: error.message, variableName };
  }
  if (error instanceof CycleError) {
    return { type: 'CYCLE', message: error.message, variableName };
  }
  if (error instanceof TypeMismatchError) {
    return { type: 'TYPE_MISMATCH', message: error.message, variableName };
  }
  if (error instanceof ZeroDivisionError) {
    return { type: 'ZERO_DIVISION', message: error.message, variableName };
  }
  if (error instanceof MathDomainError) {
    return { type: 'MATH_DOMAIN', message: error.message, variableName };
  }
  if (error instanceof ArgumentCountError) {
    return { type: 'ARGUMENT_COUNT', message: error.message, variableName };
  }

  // ParseError, or any DentakuError subclass added to the library after
  // this mapping was written — still a formula problem, not a bug here.
  return { type: 'PARSE_ERROR', message: error.message, variableName };
};
