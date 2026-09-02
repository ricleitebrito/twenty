import { isDefined } from 'twenty-shared/utils';

import {
  type CostTemplateCalculationError,
  type CostTemplateCalculationFieldInput,
} from 'src/modules/quote/cost-template-calculation/types/cost-template-calculation.types';

type CoerceCostTemplateFieldValuesArgs = {
  fields: CostTemplateCalculationFieldInput[];
  fieldValues: Record<string, unknown>;
};

export type CoerceCostTemplateFieldValuesResult =
  | { success: true; coercedValues: Record<string, string | number> }
  | { success: false; errors: CostTemplateCalculationError[] };

export const coerceCostTemplateFieldValues = ({
  fields,
  fieldValues,
}: CoerceCostTemplateFieldValuesArgs): CoerceCostTemplateFieldValuesResult => {
  const errors: CostTemplateCalculationError[] = [];
  const coercedValues: Record<string, string | number> = {};

  for (const field of fields) {
    const rawValue = fieldValues[field.variableName];
    const hasValue = isDefined(rawValue) && rawValue !== '';

    if (!hasValue) {
      if (field.isRequired) {
        errors.push({
          type: 'MISSING_REQUIRED_FIELD',
          message: `Field "${field.variableName}" is required but no value was provided`,
          variableName: field.variableName,
        });
      }
      continue;
    }

    switch (field.fieldType) {
      case 'NUMBER':
      case 'CURRENCY':
      case 'PERCENTAGE': {
        const numericValue = Number(rawValue);

        if (Number.isNaN(numericValue)) {
          errors.push({
            type: 'INVALID_FIELD_VALUE',
            message: `Field "${field.variableName}" expected a numeric value, received "${String(rawValue)}"`,
            variableName: field.variableName,
          });
          continue;
        }

        coercedValues[field.variableName] = numericValue;
        break;
      }
      case 'BOOLEAN': {
        if (typeof rawValue !== 'boolean') {
          errors.push({
            type: 'INVALID_FIELD_VALUE',
            message: `Field "${field.variableName}" expected a boolean value, received "${String(rawValue)}"`,
            variableName: field.variableName,
          });
          continue;
        }

        coercedValues[field.variableName] = rawValue ? 1 : 0;
        break;
      }
      case 'PICKLIST': {
        if (typeof rawValue !== 'string') {
          errors.push({
            type: 'INVALID_FIELD_VALUE',
            message: `Field "${field.variableName}" expected a string value, received "${String(rawValue)}"`,
            variableName: field.variableName,
          });
          continue;
        }

        coercedValues[field.variableName] = rawValue;
        break;
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, coercedValues };
};
