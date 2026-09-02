import { Test } from '@nestjs/testing';

import { CostTemplateCalculationService } from 'src/modules/quote/cost-template-calculation/services/cost-template-calculation.service';

describe('CostTemplateCalculationService', () => {
  let service: CostTemplateCalculationService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [CostTemplateCalculationService],
    }).compile();

    service = moduleRef.get(CostTemplateCalculationService);
  });

  it('computes the output step from fields through intermediate steps', () => {
    const result = service.calculate({
      fields: [
        { variableName: 'seats', fieldType: 'NUMBER', isRequired: true },
        {
          variableName: 'pricePerSeat',
          fieldType: 'CURRENCY',
          isRequired: true,
        },
      ],
      steps: [
        {
          variableName: 'subtotal',
          formula: 'seats * pricePerSeat',
          isOutput: false,
        },
        {
          variableName: 'total',
          formula: 'subtotal * 1.1',
          isOutput: true,
        },
      ],
      fieldValues: { seats: 5, pricePerSeat: 10 },
    });

    expect(result).toEqual({ success: true, value: 55 });
  });

  it('resolves steps out of declaration order via dentaku dependency resolution', () => {
    const result = service.calculate({
      fields: [{ variableName: 'base', fieldType: 'NUMBER', isRequired: true }],
      steps: [
        // "total" is declared before "doubled", the step it depends on —
        // dentaku must still resolve this correctly.
        { variableName: 'total', formula: 'doubled + 1', isOutput: true },
        { variableName: 'doubled', formula: 'base * 2', isOutput: false },
      ],
      fieldValues: { base: 3 },
    });

    expect(result).toEqual({ success: true, value: 7 });
  });

  it('handles a boolean field used in a conditional formula', () => {
    const result = service.calculate({
      fields: [
        { variableName: 'isAnnual', fieldType: 'BOOLEAN', isRequired: true },
        { variableName: 'monthly', fieldType: 'CURRENCY', isRequired: true },
      ],
      steps: [
        {
          variableName: 'total',
          formula: 'IF(isAnnual = 1, monthly * 10, monthly * 12)',
          isOutput: true,
        },
      ],
      fieldValues: { isAnnual: true, monthly: 100 },
    });

    expect(result).toEqual({ success: true, value: 1000 });
  });

  it('returns field validation errors without attempting evaluation', () => {
    const result = service.calculate({
      fields: [
        { variableName: 'seats', fieldType: 'NUMBER', isRequired: true },
      ],
      steps: [{ variableName: 'total', formula: 'seats * 10', isOutput: true }],
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

  it('returns a NO_OUTPUT_STEP error when no step is marked as output', () => {
    const result = service.calculate({
      fields: [],
      steps: [{ variableName: 'subtotal', formula: '1 + 1', isOutput: false }],
      fieldValues: {},
    });

    expect(result).toEqual({
      success: false,
      errors: [
        {
          type: 'NO_OUTPUT_STEP',
          message:
            'No step is marked as the output step for this cost template',
        },
      ],
    });
  });
});
