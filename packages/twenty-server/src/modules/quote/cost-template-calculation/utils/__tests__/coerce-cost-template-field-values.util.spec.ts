import { coerceCostTemplateFieldValues } from 'src/modules/quote/cost-template-calculation/utils/coerce-cost-template-field-values.util';

describe('coerceCostTemplateFieldValues', () => {
  it('coerces NUMBER, CURRENCY, and PERCENTAGE fields to number', () => {
    const result = coerceCostTemplateFieldValues({
      fields: [
        { variableName: 'seats', fieldType: 'NUMBER', isRequired: true },
        { variableName: 'rate', fieldType: 'CURRENCY', isRequired: true },
        { variableName: 'discount', fieldType: 'PERCENTAGE', isRequired: true },
      ],
      fieldValues: { seats: '5', rate: 12.5, discount: '0.1' },
    });

    expect(result).toEqual({
      success: true,
      coercedValues: { seats: 5, rate: 12.5, discount: 0.1 },
    });
  });

  it('coerces BOOLEAN true/false to 1/0', () => {
    const result = coerceCostTemplateFieldValues({
      fields: [
        { variableName: 'isAnnual', fieldType: 'BOOLEAN', isRequired: true },
      ],
      fieldValues: { isAnnual: true },
    });

    expect(result).toEqual({
      success: true,
      coercedValues: { isAnnual: 1 },
    });

    const resultFalse = coerceCostTemplateFieldValues({
      fields: [
        { variableName: 'isAnnual', fieldType: 'BOOLEAN', isRequired: true },
      ],
      fieldValues: { isAnnual: false },
    });

    expect(resultFalse).toEqual({
      success: true,
      coercedValues: { isAnnual: 0 },
    });
  });

  it('passes PICKLIST values through unchanged as a string', () => {
    const result = coerceCostTemplateFieldValues({
      fields: [
        { variableName: 'tier', fieldType: 'PICKLIST', isRequired: true },
      ],
      fieldValues: { tier: 'gold' },
    });

    expect(result).toEqual({
      success: true,
      coercedValues: { tier: 'gold' },
    });
  });

  it('reports a MISSING_REQUIRED_FIELD error when a required field has no value', () => {
    const result = coerceCostTemplateFieldValues({
      fields: [
        { variableName: 'seats', fieldType: 'NUMBER', isRequired: true },
      ],
      fieldValues: {},
    });

    expect(result).toEqual({
      success: false,
      errors: [
        {
          type: 'MISSING_REQUIRED_FIELD',
          message: 'Field "seats" is required but no value was provided',
          variableName: 'seats',
        },
      ],
    });
  });

  it('does not report an error when a non-required field has no value', () => {
    const result = coerceCostTemplateFieldValues({
      fields: [
        { variableName: 'seats', fieldType: 'NUMBER', isRequired: false },
      ],
      fieldValues: {},
    });

    expect(result).toEqual({ success: true, coercedValues: {} });
  });

  it('reports an INVALID_FIELD_VALUE error for a non-numeric NUMBER value', () => {
    const result = coerceCostTemplateFieldValues({
      fields: [
        { variableName: 'seats', fieldType: 'NUMBER', isRequired: true },
      ],
      fieldValues: { seats: 'not-a-number' },
    });

    expect(result).toEqual({
      success: false,
      errors: [
        {
          type: 'INVALID_FIELD_VALUE',
          message:
            'Field "seats" expected a numeric value, received "not-a-number"',
          variableName: 'seats',
        },
      ],
    });
  });

  it('reports an INVALID_FIELD_VALUE error for a non-boolean BOOLEAN value', () => {
    const result = coerceCostTemplateFieldValues({
      fields: [
        { variableName: 'isAnnual', fieldType: 'BOOLEAN', isRequired: true },
      ],
      fieldValues: { isAnnual: 'yes' },
    });

    expect(result).toEqual({
      success: false,
      errors: [
        {
          type: 'INVALID_FIELD_VALUE',
          message: 'Field "isAnnual" expected a boolean value, received "yes"',
          variableName: 'isAnnual',
        },
      ],
    });
  });

  it('reports an INVALID_FIELD_VALUE error for a non-string PICKLIST value', () => {
    const result = coerceCostTemplateFieldValues({
      fields: [
        { variableName: 'tier', fieldType: 'PICKLIST', isRequired: true },
      ],
      fieldValues: { tier: 42 },
    });

    expect(result).toEqual({
      success: false,
      errors: [
        {
          type: 'INVALID_FIELD_VALUE',
          message: 'Field "tier" expected a string value, received "42"',
          variableName: 'tier',
        },
      ],
    });
  });

  it('collects multiple field errors across different fields', () => {
    const result = coerceCostTemplateFieldValues({
      fields: [
        { variableName: 'seats', fieldType: 'NUMBER', isRequired: true },
        { variableName: 'tier', fieldType: 'PICKLIST', isRequired: true },
      ],
      fieldValues: { seats: 'bad', tier: 42 },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toHaveLength(2);
      expect(result.errors.map((error) => error.variableName)).toEqual([
        'seats',
        'tier',
      ]);
    }
  });
});
