export type CostTemplateCalculationFieldType =
  | 'NUMBER'
  | 'CURRENCY'
  | 'PERCENTAGE'
  | 'BOOLEAN'
  | 'PICKLIST';

export type CostTemplateCalculationFieldInput = {
  variableName: string;
  fieldType: CostTemplateCalculationFieldType;
  isRequired: boolean;
};

export type CostTemplateCalculationStepInput = {
  variableName: string;
  formula: string;
  isOutput: boolean;
};

export type CostTemplateCalculationErrorType =
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_FIELD_VALUE'
  | 'NO_OUTPUT_STEP'
  | 'PARSE_ERROR'
  | 'UNBOUND_VARIABLE'
  | 'TYPE_MISMATCH'
  | 'ARGUMENT_COUNT'
  | 'ZERO_DIVISION'
  | 'MATH_DOMAIN'
  | 'CYCLE'
  | 'NON_NUMERIC_OUTPUT';

export type CostTemplateCalculationError = {
  type: CostTemplateCalculationErrorType;
  message: string;
  // The variableName of the offending field or step, when the error can be
  // attributed to one. Absent for template-wide errors (e.g. NO_OUTPUT_STEP).
  variableName?: string;
};
