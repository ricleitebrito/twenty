# Quote / CPQ — Design Spec

## Overview

Add a CPQ (Configure, Price, Quote) capability to Twenty, inspired by
Salesforce CPQ: a `Quote` object with `QuoteLine` items, where each line's
price is computed by a reusable `CostTemplate` (a library of user-defined
input `Fields` and formula `Steps`, evaluated with the `dentaku` expression
engine). Quotes render into a customer-facing proposal document from a
markdown `ProposalTemplate` with merge fields, exportable as PDF.

## Goals

- Let workspace admins define reusable pricing logic (Cost Templates) without
  writing code, using named input fields and an ordered chain of formulas.
- Let sales reps build a Quote from an Opportunity, add QuoteLines against a
  Product catalog, fill in the cost template's inputs per line, and get an
  automatically computed price.
- Let workspace admins define a markdown proposal document (with merge
  fields pulling Quote/Company/QuoteLine data) and render/export it per Quote.

## Non-goals (v1)

- Multi-currency conversion, tax calculation, approval workflows, contract
  management, subscription/renewal quoting, discount schedules/tiers, or a
  visual formula builder (Steps are authored as raw dentaku expressions).
- Editing the rendered proposal document after generation (it's a read-only
  render of the template + live Quote data, not a separate editable
  document).

## Architecture decision: native core objects

Built as standard objects in `twenty-server` core (workspace-entities +
flat-field-metadata + the standard `twenty-standard-application` wiring —
view fields, view groups, page layout, index metadata, dev seeds), the same
way `Opportunity` and `Workflow` are built. Not a Twenty App / SDK extension.
Rationale: this is core product functionality on par with other CRM
primitives, not a workspace-specific customization, and it needs the same
level of integration (GraphQL, views, migrations) that other standard
objects get.

New module: `packages/twenty-server/src/modules/quote/`, following the same
internal layout as `packages/twenty-server/src/modules/workflow/` (a
`common/standard-objects/` folder for entities, plus service/module folders
for the calculation and rendering logic).

## Data model

Seven new standard objects, all under the `quote` module.

### Product

Catalog entry. A product may reference at most one `CostTemplate`; if none
is set, `QuoteLine.unitPrice` for that product must be entered manually
(no formula to compute it) — manual override is in scope, see QuoteLine below.

| Field | Type | Notes |
|---|---|---|
| `name` | TEXT | |
| `sku` | TEXT | nullable |
| `description` | TEXT | nullable |
| `basePrice` | CURRENCY | nullable; list price, usable as a variable in Step formulas |
| `isActive` | BOOLEAN | default true |
| `costTemplate` | RELATION → CostTemplate (MANY_TO_ONE) | nullable |
| `quoteLines` | RELATION → QuoteLine (ONE_TO_MANY) | |

### CostTemplate

A reusable pricing-logic definition. Many Products can point to the same
CostTemplate.

| Field | Type | Notes |
|---|---|---|
| `name` | TEXT | |
| `description` | TEXT | nullable |
| `products` | RELATION → Product (ONE_TO_MANY) | |
| `fields` | RELATION → CostTemplateField (ONE_TO_MANY) | |
| `steps` | RELATION → CostTemplateStep (ONE_TO_MANY) | |

### CostTemplateField

One input the user fills in on a QuoteLine.

| Field | Type | Notes |
|---|---|---|
| `costTemplate` | RELATION → CostTemplate (MANY_TO_ONE) | required |
| `name` | TEXT | display label |
| `variableName` | TEXT | dentaku variable key; unique within the template; validated as a valid identifier (letters/digits/underscore, not starting with a digit) |
| `fieldType` | SELECT: `NUMBER`, `CURRENCY`, `PERCENTAGE`, `BOOLEAN`, `PICKLIST` | `PERCENTAGE` is stored/evaluated as a plain number (e.g. `15` meaning 15%); formulas divide by 100 explicitly where needed — the type only changes UI rendering (adds a `%` suffix) |
| `picklistOptions` | RAW_JSON | `{ label: string; value: string }[]`; required when `fieldType = PICKLIST`; `value` can be any string — dentaku compares strings natively (`region = "north"`) |
| `defaultValue` | TEXT | nullable; stringified, parsed per `fieldType` when applied |
| `isRequired` | BOOLEAN | default true |
| `position` | NUMBER | display order |

### CostTemplateStep

One formula in the pricing pipeline.

| Field | Type | Notes |
|---|---|---|
| `costTemplate` | RELATION → CostTemplate (MANY_TO_ONE) | required |
| `name` | TEXT | display label |
| `variableName` | TEXT | output variable name; unique within the template (and disjoint from field `variableName`s); same identifier validation as fields |
| `formula` | TEXT | a dentaku expression; may reference field `variableName`s and other steps' `variableName`s |
| `position` | NUMBER | display order (execution order is resolved by dentaku's dependency graph, not by `position` — see Calculation engine) |
| `isOutput` | BOOLEAN | default false; exactly one step per template must have `isOutput = true` — validated on write |

### Quote

| Field | Type | Notes |
|---|---|---|
| `name` | TEXT | |
| `status` | SELECT: `DRAFT`, `IN_REVIEW`, `APPROVED`, `SENT`, `ACCEPTED`, `REJECTED`, `EXPIRED` | default `DRAFT` |
| `opportunity` | RELATION → Opportunity (MANY_TO_ONE) | required |
| `company` | RELATION → Company (MANY_TO_ONE) | nullable |
| `person` | RELATION → Person (MANY_TO_ONE) | nullable |
| `proposalTemplate` | RELATION → ProposalTemplate (MANY_TO_ONE) | nullable |
| `validUntil` | DATE | nullable |
| `totalAmount` | CURRENCY | computed; sum of `quoteLines.totalPrice`, recalculated whenever a line changes |
| `quoteLines` | RELATION → QuoteLine (ONE_TO_MANY) | |
| `attachments` | RELATION → Attachment (ONE_TO_MANY) | new `targetQuote` relation on `Attachment`, mirroring `targetOpportunity` |

### QuoteLine

| Field | Type | Notes |
|---|---|---|
| `quote` | RELATION → Quote (MANY_TO_ONE) | required |
| `product` | RELATION → Product (MANY_TO_ONE) | required |
| `quantity` | NUMBER | default 1 |
| `discountPercent` | NUMBER | nullable, default 0 |
| `fieldValues` | RAW_JSON | `{ [variableName: string]: string \| number \| boolean }`; user-entered values for the product's cost template fields |
| `unitPrice` | CURRENCY | computed from the cost template's output step; manually editable when the product has no cost template |
| `totalPrice` | CURRENCY | computed: `unitPrice * quantity * (1 - discountPercent / 100)` |
| `position` | NUMBER | display order within the quote |

### ProposalTemplate

| Field | Type | Notes |
|---|---|---|
| `name` | TEXT | |
| `description` | TEXT | nullable |
| `content` | TEXT | raw markdown with `{{ }}` merge fields (see Proposal rendering) |
| `isDefault` | BOOLEAN | default false; at most one default per workspace — enforced on write |
| `quotes` | RELATION → Quote (ONE_TO_MANY) | |

## Calculation engine

New service: `CostTemplateCalculationService`
(`packages/twenty-server/src/modules/quote/cost-template-calculation/`).

Given a QuoteLine (with its `product.costTemplate` loaded, including
`fields` and `steps`):

1. If the product has no `costTemplate`, skip calculation — `unitPrice` is
   whatever was entered manually.
2. Validate `fieldValues` against the template's `fields`: every
   `isRequired` field must have a value; coerce each value per `fieldType`
   (`BOOLEAN` → `0`/`1`; `PICKLIST` → the selected option's `value`, left as
   a string; `NUMBER`/`CURRENCY`/`PERCENTAGE` → number). Missing/invalid
   values produce a field-level validation error, not a thrown exception.
3. Create a `Calculator` (dentaku), `store()` the coerced field values.
4. For every step, `storeFormula(step.variableName, step.formula)`. dentaku
   resolves inter-step dependencies itself — steps do not need to be
   evaluated in `position` order; `position` is purely for the template
   editor's display order.
5. `evaluate(outputStep.variableName)` → `QuoteLine.unitPrice`.
6. `totalPrice` is computed in plain code from `unitPrice`, `quantity`,
   `discountPercent` — not part of the dentaku formula graph.

### Error handling

dentaku's typed errors (`UnboundVariableError`, `CycleError`,
`TypeMismatchError`, `ZeroDivisionError`, `MathDomainError`, `ParseError`)
are caught and mapped to a structured validation error identifying the
offending field/step by name, surfaced to the GraphQL caller — never a raw
500.

### Template-level validation (on CostTemplateStep/CostTemplateField writes)

- `variableName` is unique across all fields and steps in the same
  template.
- Exactly one step has `isOutput = true`.
- (Best-effort, non-blocking) a step's formula does not reference an
  undefined variable — checked by attempting a dry parse; a template can
  still be saved with an incomplete formula while being authored, but a
  QuoteLine using it will surface the `UnboundVariableError` at calculation
  time.

### Recalculation trigger

Recalculation runs synchronously as part of persisting a QuoteLine, via the
same pre-persistence hook mechanism Twenty already uses for computed system
fields (e.g. `searchVector`) — triggered whenever `fieldValues`, `quantity`,
`product`, or `discountPercent` changes. No separate "Calculate" mutation.
After a QuoteLine's `totalPrice` changes, the parent `Quote.totalAmount` is
recomputed the same way (sum of sibling lines). The exact hook API
(pre-create/pre-update workspace query hook vs. TypeORM subscriber) is
confirmed during implementation by following the existing `searchVector`
computation as a reference implementation — not fully pinned down here
because it depends on code only visible at implementation time.

## Proposal rendering

New service: `ProposalRenderingService`
(`packages/twenty-server/src/modules/quote/proposal-rendering/`).

`ProposalTemplate.content` is raw markdown with Handlebars-style merge
fields: `{{quote.name}}`, `{{company.name}}`, `{{quote.totalAmount}}`,
`{{#each quoteLines}}...{{/each}}` for the line-item table, etc.

Rendering pipeline, given a `Quote`:

1. Build a plain data context: the Quote plus its loaded relations
   (`opportunity`, `company`, `person`, `quoteLines` with their `product`).
2. Compile and render `proposalTemplate.content` with `handlebars` (new
   dependency) against that context → merged markdown.
3. Convert merged markdown → HTML with a markdown renderer (library choice —
   e.g. `marked` — finalized during implementation).
4. Expose the rendered HTML via GraphQL for an in-app preview panel on the
   Quote record page (reusing existing front-end text-rendering
   components where possible).
5. **PDF export**: render the HTML to PDF using a headless-Chromium-based
   renderer (e.g. `puppeteer`) for full visual fidelity with the preview,
   then attach the resulting file to the Quote via the new `targetQuote`
   Attachment relation. Infra cost (headless browser running server-side)
   is accepted in exchange for fidelity, per explicit decision.

## Frontend

Product, CostTemplate, CostTemplateField, CostTemplateStep, Quote,
QuoteLine, and ProposalTemplate get standard table/kanban/record-detail
pages for free through Twenty's generic `object-record` UI, since they're
ordinary standard objects. Custom UI work is limited to:

- **CostTemplate editor**: manage a template's Fields and Steps list (add,
  reorder, delete), with inline validation for unique `variableName`s and
  the single-output-step rule.
- **QuoteLine field-value form**: dynamically generated from the selected
  Product's CostTemplate fields (one input per field, typed per
  `fieldType`), shown when adding/editing a QuoteLine.
- **Proposal preview panel**: a tab/panel on the Quote record page showing
  the rendered HTML, with a "Download PDF" action.

## Testing strategy

- **CostTemplateCalculationService**: unit tests covering the happy path
  (fields → steps → output), each dentaku error type mapped correctly,
  field-type coercion (boolean/picklist/number), and the no-cost-template
  (manual price) path.
- **Template validation**: unit tests for duplicate `variableName`,
  zero/multiple output steps.
- **ProposalRenderingService**: unit tests for merge-field substitution
  (including the `{{#each quoteLines}}` loop) and markdown→HTML conversion,
  independent of PDF generation.
- **Integration tests**: creating a Quote with QuoteLines end-to-end
  (GraphQL) and verifying `unitPrice`/`totalPrice`/`totalAmount` rollups,
  following the existing integration test patterns for other standard
  objects (e.g. Opportunity).
- PDF generation itself is smoke-tested (produces a non-empty PDF) rather
  than asserting exact byte content.

## Implementation phases

1. **Foundation objects**: `Product`, `CostTemplate`, `CostTemplateField`,
   `CostTemplateStep` — entities, flat field metadata, standard views, dev
   seeds. Template-level validation (unique variable names, single output
   step).
2. **Calculation engine**: `CostTemplateCalculationService` (dentaku
   integration) with full unit test coverage, independent of QuoteLine
   wiring.
3. **Quote / QuoteLine objects**: entities, relations to Opportunity/
   Company/Person/Product, recalculation hook wiring, `totalAmount` rollup.
4. **ProposalTemplate + rendering**: object, `ProposalRenderingService`
   (merge + markdown→HTML), GraphQL exposure for preview.
5. **PDF export**: headless-Chromium rendering, `targetQuote` Attachment
   relation, attach-to-Quote flow.
6. **Frontend**: CostTemplate editor, dynamic QuoteLine field-value form,
   proposal preview panel.

Each phase should be independently mergeable and testable; phase 1 has no
dependency on 3-6 and can ship (as inert, empty-of-quotes objects) before
the rest lands if needed.

## Open questions deferred to implementation

- Exact hook mechanism for QuoteLine recalculation (confirm against the
  `searchVector` reference implementation).
- Specific markdown-rendering library (`marked` vs. alternatives) and
  PDF-rendering library/setup (`puppeteer` vs. a managed headless-Chromium
  service), to be settled based on what's already present in the
  dependency tree and self-host deployment constraints.
