# Quote/CPQ Calculation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `CostTemplateCalculationService` — given a CostTemplate's fields/steps and a caller-supplied set of field values, coerce and validate the values, run the template's formulas through `dentaku`, and return the computed output (or a structured, non-thrown validation error) — fully unit-tested and independent of the (not-yet-built) Quote/QuoteLine objects.

**Architecture:** Standalone `@Injectable()` NestJS service with zero constructor dependencies (pure computation, no DB access), living in a new `packages/twenty-server/src/modules/quote/cost-template-calculation/` directory alongside the existing `cost-template-validation/` module from Phase 1. A private coercion utility handles field-value type conversion (validated separately, before any `dentaku` involvement); the service wires that utility together with `dentaku`'s `Calculator`, catching every one of `dentaku`'s typed errors and mapping each to a structured result rather than letting it propagate as an exception. Not registered into any NestJS module yet — nothing consumes it via dependency injection until the QuoteLine recalculation hook (a later phase) is built; it is fully testable and mergeable standalone per the spec's phase-independence requirement.

**Tech Stack:** NestJS, TypeScript, `dentaku` (npm package `dentaku@^0.1.0`, "the TypeScript successor to the Ruby dentaku calculator" — a safe formula parser/evaluator with typed errors), Jest.

**Spec:** `docs/superpowers/specs/2026-09-01-quote-cpq-design.md` (`## Calculation engine` and `### Error handling` sections; this plan implements Implementation-phases item 2, "Calculation engine").

## Global Constraints

- New files go under `packages/twenty-server/src/modules/quote/cost-template-calculation/`.
- `dentaku`'s `Calculator` is stateful (`store`/`solve` mutate/read its internal memory) — always construct a fresh `Calculator` per calculation call; never share or reuse one across calls (no caching, no module-level singleton).
- **Use `Calculator.solve(formulas)` (the bulk solver), not `storeFormula` + `evaluate`, to run a template's steps.** This was empirically verified during planning (not a guess): `storeFormula` + `evaluate` does NOT throw `dentaku`'s `CycleError` for a circular step reference — it throws a raw `RangeError: Maximum call stack size exceeded` from infinite recursion instead, which is unacceptable per the spec's "never a raw 500." `solve()` throws a proper `CycleError` (confirmed: `formula dependencies form a cycle: a → b → a`, with `.cycle` listing the members) for the identical scenario. `solve()` also has a second advantage the spec doesn't call out but this plan relies on: every `DentakuError` thrown by `solve()` carries a `.key` property naming the *specific* formula key that failed — verified this correctly identifies an intermediate step (not just the output step) when the error originates there, e.g. solving `{ subtotal: '10 / seats', total: 'subtotal * 2' }` with `seats: 0` throws `ZeroDivisionError` with `.key === 'subtotal'`, not `'total'`. Use `error.key` (falling back to the output step's name only if absent) to attribute errors to the actual offending step, not always the output step.
- Every one of `dentaku`'s 7 typed error classes (`ParseError`, `UnboundVariableError`, `TypeMismatchError`, `ArgumentCountError`, `ZeroDivisionError`, `MathDomainError`, `CycleError` — all extending the abstract `DentakuError`) must be caught inside the service and mapped to a structured `CostTemplateCalculationError`; the service's public method must never throw a `DentakuError` (or any of its subclasses) to its caller — per the spec's "never a raw 500."
- Field-value coercion follows the spec exactly: `BOOLEAN` → `1`/`0` (not native `true`/`false` — `dentaku` supports native booleans, but the spec is explicit about numeric coercion here and this plan follows it verbatim); `PICKLIST` → the value passed through unchanged as a `string` (no lookup against `picklistOptions` — out of scope for this phase, YAGNI); `NUMBER`/`CURRENCY`/`PERCENTAGE` → `number` (via `Number(value)`, `NaN` is an invalid-value error).
- Missing-required-field and invalid-field-value are field-level validation errors, produced *before* any `dentaku` call — if there is at least one such error, the service must not attempt to evaluate the template's formulas at all (return early).
- After `packages/twenty-server/package.json` is edited to add the `dentaku` dependency, run `yarn install` from the repo root before trusting any typecheck/test run that imports it.
- Run `npx tsgo -p tsconfig.json --noEmit` inside `packages/twenty-server` to typecheck, and lint changed files with `npx oxlint --type-aware --fix -c .oxlintrc.json <files>` then `npx oxfmt <files>` from `packages/twenty-server` (do not run `nx lint:diff-with-main` — this repo's branch has no useful merge-base for it, per prior-phase precedent).
- Follow this codebase's established style for this module: `@Injectable()` classes, named-args object parameters with a dedicated `type` per method (not positional args), short `//` WHY-only comments (never restating what the code does), no JSDoc blocks. Mirror `packages/twenty-server/src/modules/quote/cost-template-validation/services/cost-template-validation.service.ts`'s conventions exactly (already-committed Phase 1 code, read it before starting Task 2).

---

## Task 1: Field-value coercion and validation utility

**Files:**
- Create: `packages/twenty-server/src/modules/quote/cost-template-calculation/types/cost-template-calculation.types.ts`
- Create: `packages/twenty-server/src/modules/quote/cost-template-calculation/utils/coerce-cost-template-field-values.util.ts`
- Test: `packages/twenty-server/src/modules/quote/cost-template-calculation/utils/__tests__/coerce-cost-template-field-values.util.spec.ts`

**Interfaces:**
- Produces: the shared types `CostTemplateCalculationFieldInput`, `CostTemplateCalculationStepInput`, `CostTemplateCalculationError`, and the function `coerceCostTemplateFieldValues({ fields, fieldValues }): CoerceCostTemplateFieldValuesResult` where `CoerceCostTemplateFieldValuesResult = { success: true; coercedValues: Record<string, string | number> } | { success: false; errors: CostTemplateCalculationError[] }`. Task 2 consumes both the types and this function directly.

- [ ] **Step 1: Write the shared types file**

Create `packages/twenty-server/src/modules/quote/cost-template-calculation/types/cost-template-calculation.types.ts`:

```ts
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
```

- [ ] **Step 2: Write the failing test for the coercion utility**

Create `packages/twenty-server/src/modules/quote/cost-template-calculation/utils/__tests__/coerce-cost-template-field-values.util.spec.ts`:

```ts
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
      fields: [{ variableName: 'isAnnual', fieldType: 'BOOLEAN', isRequired: true }],
      fieldValues: { isAnnual: true },
    });

    expect(result).toEqual({
      success: true,
      coercedValues: { isAnnual: 1 },
    });

    const resultFalse = coerceCostTemplateFieldValues({
      fields: [{ variableName: 'isAnnual', fieldType: 'BOOLEAN', isRequired: true }],
      fieldValues: { isAnnual: false },
    });

    expect(resultFalse).toEqual({
      success: true,
      coercedValues: { isAnnual: 0 },
    });
  });

  it('passes PICKLIST values through unchanged as a string', () => {
    const result = coerceCostTemplateFieldValues({
      fields: [{ variableName: 'tier', fieldType: 'PICKLIST', isRequired: true }],
      fieldValues: { tier: 'gold' },
    });

    expect(result).toEqual({
      success: true,
      coercedValues: { tier: 'gold' },
    });
  });

  it('reports a MISSING_REQUIRED_FIELD error when a required field has no value', () => {
    const result = coerceCostTemplateFieldValues({
      fields: [{ variableName: 'seats', fieldType: 'NUMBER', isRequired: true }],
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
      fields: [{ variableName: 'seats', fieldType: 'NUMBER', isRequired: false }],
      fieldValues: {},
    });

    expect(result).toEqual({ success: true, coercedValues: {} });
  });

  it('reports an INVALID_FIELD_VALUE error for a non-numeric NUMBER value', () => {
    const result = coerceCostTemplateFieldValues({
      fields: [{ variableName: 'seats', fieldType: 'NUMBER', isRequired: true }],
      fieldValues: { seats: 'not-a-number' },
    });

    expect(result).toEqual({
      success: false,
      errors: [
        {
          type: 'INVALID_FIELD_VALUE',
          message: 'Field "seats" expected a numeric value, received "not-a-number"',
          variableName: 'seats',
        },
      ],
    });
  });

  it('reports an INVALID_FIELD_VALUE error for a non-boolean BOOLEAN value', () => {
    const result = coerceCostTemplateFieldValues({
      fields: [{ variableName: 'isAnnual', fieldType: 'BOOLEAN', isRequired: true }],
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
      fields: [{ variableName: 'tier', fieldType: 'PICKLIST', isRequired: true }],
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
```

- [ ] **Step 3: Run the test to see it fail**

Run: `npx jest packages/twenty-server/src/modules/quote/cost-template-calculation/utils/__tests__/coerce-cost-template-field-values.util.spec.ts --config=packages/twenty-server/jest.config.mjs`
Expected: FAIL — `Cannot find module 'src/modules/quote/cost-template-calculation/utils/coerce-cost-template-field-values.util'`.

- [ ] **Step 4: Implement the coercion utility**

Create `packages/twenty-server/src/modules/quote/cost-template-calculation/utils/coerce-cost-template-field-values.util.ts`:

```ts
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
```

- [ ] **Step 5: Run the test to see it pass**

Run: `npx jest packages/twenty-server/src/modules/quote/cost-template-calculation/utils/__tests__/coerce-cost-template-field-values.util.spec.ts --config=packages/twenty-server/jest.config.mjs`
Expected: all tests PASS.

- [ ] **Step 6: Typecheck and lint**

Run: `cd packages/twenty-server && npx tsgo -p tsconfig.json --noEmit`
Run: `cd packages/twenty-server && npx oxlint --type-aware --fix -c .oxlintrc.json src/modules/quote/cost-template-calculation/types/cost-template-calculation.types.ts src/modules/quote/cost-template-calculation/utils/coerce-cost-template-field-values.util.ts src/modules/quote/cost-template-calculation/utils/__tests__/coerce-cost-template-field-values.util.spec.ts`
Run: `cd packages/twenty-server && npx oxfmt src/modules/quote/cost-template-calculation/types/cost-template-calculation.types.ts src/modules/quote/cost-template-calculation/utils/coerce-cost-template-field-values.util.ts src/modules/quote/cost-template-calculation/utils/__tests__/coerce-cost-template-field-values.util.spec.ts`
Expected: all clean (0 errors from tsgo touching these files; 0 warnings/errors from oxlint).

- [ ] **Step 7: Commit**

```bash
git add packages/twenty-server/src/modules/quote/cost-template-calculation/types/cost-template-calculation.types.ts \
        packages/twenty-server/src/modules/quote/cost-template-calculation/utils/coerce-cost-template-field-values.util.ts \
        packages/twenty-server/src/modules/quote/cost-template-calculation/utils/__tests__/coerce-cost-template-field-values.util.spec.ts
git commit -m "feat: add cost template field-value coercion utility"
```

---

## Task 2: `dentaku` dependency and `CostTemplateCalculationService` happy path

**Files:**
- Modify: `packages/twenty-server/package.json`
- Create: `packages/twenty-server/src/modules/quote/cost-template-calculation/services/cost-template-calculation.service.ts`
- Test: `packages/twenty-server/src/modules/quote/cost-template-calculation/services/__tests__/cost-template-calculation.service.spec.ts`

**Interfaces:**
- Consumes: `coerceCostTemplateFieldValues` and the shared types from Task 1.
- Produces: `CostTemplateCalculationService.calculate({ fields, steps, fieldValues }): CostTemplateCalculationResult` where `CostTemplateCalculationResult = { success: true; value: number } | { success: false; errors: CostTemplateCalculationError[] }`. This is the method Task 3 extends with full `dentaku` error handling, and the method a later phase's QuoteLine recalculation hook will call.

- [ ] **Step 1: Add the `dentaku` dependency**

In `packages/twenty-server/package.json`, add to the `dependencies` object (alphabetically, near other single-purpose libraries — check the surrounding entries and match the existing sort order in the file):

```json
    "dentaku": "^0.1.0",
```

Run from the repo root: `yarn install`
Expected: succeeds, `node_modules/dentaku` is populated, `yarn.lock` gets a new entry for `dentaku` (and its own dependency `decimal.js`, if not already present — check first with `ls node_modules/decimal.js`; it may already be in the tree via another package).

- [ ] **Step 2: Write the failing test for the happy path**

Create `packages/twenty-server/src/modules/quote/cost-template-calculation/services/__tests__/cost-template-calculation.service.spec.ts`:

```ts
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
        { variableName: 'pricePerSeat', fieldType: 'CURRENCY', isRequired: true },
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
      fields: [{ variableName: 'seats', fieldType: 'NUMBER', isRequired: true }],
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
          message: 'No step is marked as the output step for this cost template',
        },
      ],
    });
  });
});
```

- [ ] **Step 3: Run the test to see it fail**

Run: `npx jest packages/twenty-server/src/modules/quote/cost-template-calculation/services/__tests__/cost-template-calculation.service.spec.ts --config=packages/twenty-server/jest.config.mjs`
Expected: FAIL — `Cannot find module 'src/modules/quote/cost-template-calculation/services/cost-template-calculation.service'`.

- [ ] **Step 4: Implement the service's happy path**

Create `packages/twenty-server/src/modules/quote/cost-template-calculation/services/cost-template-calculation.service.ts`:

```ts
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
    const coercionResult = coerceCostTemplateFieldValues({ fields, fieldValues });

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
```

- [ ] **Step 5: Run the test to see it pass**

Run: `npx jest packages/twenty-server/src/modules/quote/cost-template-calculation/services/__tests__/cost-template-calculation.service.spec.ts --config=packages/twenty-server/jest.config.mjs`
Expected: all 5 tests PASS.

- [ ] **Step 6: Typecheck and lint**

Run: `cd packages/twenty-server && npx tsgo -p tsconfig.json --noEmit`
Run: `cd packages/twenty-server && npx oxlint --type-aware --fix -c .oxlintrc.json src/modules/quote/cost-template-calculation/services/cost-template-calculation.service.ts src/modules/quote/cost-template-calculation/services/__tests__/cost-template-calculation.service.spec.ts`
Run: `cd packages/twenty-server && npx oxfmt src/modules/quote/cost-template-calculation/services/cost-template-calculation.service.ts src/modules/quote/cost-template-calculation/services/__tests__/cost-template-calculation.service.spec.ts`
Expected: clean. Confirm zero NEW typecheck errors from the pre-existing unrelated error baseline (grep the tsgo output for `quote|cost-template|costTemplate|dentaku` — expect no hits referencing your new files).

- [ ] **Step 7: Commit**

```bash
git add packages/twenty-server/package.json \
        yarn.lock \
        packages/twenty-server/src/modules/quote/cost-template-calculation/services/cost-template-calculation.service.ts \
        packages/twenty-server/src/modules/quote/cost-template-calculation/services/__tests__/cost-template-calculation.service.spec.ts
git commit -m "feat: add CostTemplateCalculationService happy path with dentaku"
```

---

## Task 3: `dentaku` typed-error handling

**Files:**
- Modify: `packages/twenty-server/src/modules/quote/cost-template-calculation/services/cost-template-calculation.service.ts`
- Modify: `packages/twenty-server/src/modules/quote/cost-template-calculation/services/__tests__/cost-template-calculation.service.spec.ts`

**Interfaces:**
- Consumes: `dentaku`'s exported error classes (`ParseError`, `UnboundVariableError`, `TypeMismatchError`, `ArgumentCountError`, `ZeroDivisionError`, `MathDomainError`, `CycleError`, all extending the abstract `DentakuError`).
- Produces: no new public interface — `calculate()`'s signature and `CostTemplateCalculationResult` type are unchanged from Task 2; this task only makes error paths through the same method return structured errors instead of throwing.

- [ ] **Step 1: Write the failing tests for each error type**

Add to `packages/twenty-server/src/modules/quote/cost-template-calculation/services/__tests__/cost-template-calculation.service.spec.ts`, inside the existing `describe('CostTemplateCalculationService', ...)` block (after the existing tests). Every formula/scenario below was run directly against the real `dentaku` package during planning to confirm it actually triggers the named error class (not a guess):

```ts
  it('maps an UNBOUND_VARIABLE error when a formula references an unknown variable', () => {
    const result = service.calculate({
      fields: [],
      steps: [
        { variableName: 'total', formula: 'undeclaredVariable + 1', isOutput: true },
      ],
      fieldValues: {},
    });

    expect(result).toEqual({
      success: false,
      errors: [
        {
          type: 'UNBOUND_VARIABLE',
          message: expect.stringContaining('undeclaredVariable'),
          variableName: 'total',
        },
      ],
    });
  });

  it('maps a PARSE_ERROR when a formula is syntactically invalid', () => {
    const result = service.calculate({
      fields: [],
      steps: [{ variableName: 'total', formula: '1 + + 2', isOutput: true }],
      fieldValues: {},
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('PARSE_ERROR');
      expect(result.errors[0].variableName).toBe('total');
    }
  });

  it('maps a ZERO_DIVISION error', () => {
    const result = service.calculate({
      fields: [{ variableName: 'divisor', fieldType: 'NUMBER', isRequired: true }],
      steps: [
        { variableName: 'total', formula: '10 / divisor', isOutput: true },
      ],
      fieldValues: { divisor: 0 },
    });

    expect(result).toEqual({
      success: false,
      errors: [
        {
          type: 'ZERO_DIVISION',
          message: expect.any(String),
          variableName: 'total',
        },
      ],
    });
  });

  it('maps a CYCLE error when steps reference each other circularly', () => {
    const result = service.calculate({
      fields: [],
      steps: [
        { variableName: 'a', formula: 'b + 1', isOutput: false },
        { variableName: 'b', formula: 'a + 1', isOutput: true },
      ],
      fieldValues: {},
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('CYCLE');
    }
  });

  it('maps a MATH_DOMAIN error', () => {
    const result = service.calculate({
      fields: [],
      steps: [{ variableName: 'total', formula: 'SQRT(-1)', isOutput: true }],
      fieldValues: {},
    });

    expect(result).toEqual({
      success: false,
      errors: [
        {
          type: 'MATH_DOMAIN',
          message: expect.any(String),
          variableName: 'total',
        },
      ],
    });
  });

  it('maps a TYPE_MISMATCH error', () => {
    const result = service.calculate({
      fields: [{ variableName: 'tier', fieldType: 'PICKLIST', isRequired: true }],
      steps: [{ variableName: 'total', formula: 'tier + 1', isOutput: true }],
      fieldValues: { tier: 'gold' },
    });

    expect(result).toEqual({
      success: false,
      errors: [
        {
          type: 'TYPE_MISMATCH',
          message: expect.any(String),
          variableName: 'total',
        },
      ],
    });
  });

  it('attributes an error to the intermediate step that actually failed, not the output step', () => {
    const result = service.calculate({
      fields: [{ variableName: 'seats', fieldType: 'NUMBER', isRequired: true }],
      steps: [
        { variableName: 'subtotal', formula: '10 / seats', isOutput: false },
        { variableName: 'total', formula: 'subtotal * 2', isOutput: true },
      ],
      fieldValues: { seats: 0 },
    });

    expect(result).toEqual({
      success: false,
      errors: [
        {
          type: 'ZERO_DIVISION',
          message: expect.any(String),
          variableName: 'subtotal',
        },
      ],
    });
  });
```

`ArgumentCountError` is handled in the implementation (mapped defensively, same as every other `DentakuError` subclass) but deliberately has no dedicated test here: every formula tried during planning that looks like an arg-count violation (e.g. `SQRT(1, 2, 3)`) actually threw `ParseError` instead ("sqrt has too many operands"), and inventing an untested claim about which formula shape triggers `ArgumentCountError` specifically would violate this plan's own no-guessing standard. If you find a real trigger for it while implementing, add the test; otherwise leave it uncovered — the generic `DentakuError` fallback path (tested via the other 6 error types) already proves the mapping mechanism works.

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx jest packages/twenty-server/src/modules/quote/cost-template-calculation/services/__tests__/cost-template-calculation.service.spec.ts --config=packages/twenty-server/jest.config.mjs`
Expected: FAIL — the 7 new tests throw uncaught `dentaku` errors (e.g. `UnboundVariableError`) instead of returning a structured result, since `calculate()` does not yet catch anything `solve()` throws.

- [ ] **Step 3: Implement error handling**

Modify `packages/twenty-server/src/modules/quote/cost-template-calculation/services/cost-template-calculation.service.ts`. Add the error-class imports:

```ts
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
```

(`ParseError` is not imported as a class here — see the mapping function below, it is the fallback branch, not a checked `instanceof`.)

Replace the body of `calculate()` from `const solved = calculator.solve(formulas);` onward with:

```ts
    let solved: Record<string, unknown>;

    try {
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
```

Add this function below the class (module-level, not a method — it has no dependency on instance state):

```ts
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
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npx jest packages/twenty-server/src/modules/quote/cost-template-calculation/services/__tests__/cost-template-calculation.service.spec.ts --config=packages/twenty-server/jest.config.mjs`
Expected: all 12 tests PASS (5 from Task 2 + 7 new error-mapping tests).

- [ ] **Step 5: Typecheck and lint**

Run: `cd packages/twenty-server && npx tsgo -p tsconfig.json --noEmit`
Run: `cd packages/twenty-server && npx oxlint --type-aware --fix -c .oxlintrc.json src/modules/quote/cost-template-calculation/services/cost-template-calculation.service.ts src/modules/quote/cost-template-calculation/services/__tests__/cost-template-calculation.service.spec.ts`
Run: `cd packages/twenty-server && npx oxfmt src/modules/quote/cost-template-calculation/services/cost-template-calculation.service.ts src/modules/quote/cost-template-calculation/services/__tests__/cost-template-calculation.service.spec.ts`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add packages/twenty-server/src/modules/quote/cost-template-calculation/services/cost-template-calculation.service.ts \
        packages/twenty-server/src/modules/quote/cost-template-calculation/services/__tests__/cost-template-calculation.service.spec.ts
git commit -m "feat: map dentaku typed errors to structured calculation errors"
```

---

## Out of scope for this plan (deferred)

- **Best-effort dry-parse validation** (spec's "a step's formula does not reference an undefined variable — checked by attempting a dry parse", under `### Template-level validation`): deliberately deferred. It has no consumer yet — there is no UI surface to show a non-blocking warning, and Phase 1's `CostTemplateValidationService` already enforces the two *blocking* invariants (unique variable names, single output step). Revisit when the CostTemplate editor (Implementation phase 6) or another concrete consumer exists to make the warning visible; implementing it now would be unused code.
- **QuoteLine wiring** (recalculation trigger, `totalPrice`/`totalAmount` rollup): Implementation phase 3, requires the `Quote`/`QuoteLine` objects which do not exist yet.
- **`fieldValues` sourced from a real `QuoteLine.fieldValues` GraphQL `RAW_JSON` field**: this plan's `calculate()` takes a plain `Record<string, unknown>`, which is exactly what a future QuoteLine hook will pass in — no interface change anticipated, but confirm against the real field's runtime shape when Phase 3 is built.
