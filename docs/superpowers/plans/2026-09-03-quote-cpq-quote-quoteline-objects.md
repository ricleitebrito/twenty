# Quote/CPQ Quote & QuoteLine Objects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `Quote` and `QuoteLine` standard objects, wire `QuoteLine.unitPrice`/`totalPrice` to `CostTemplateCalculationService` via synchronous pre-query hooks, and roll up `Quote.totalAmount` from sibling `QuoteLine`s via an asynchronous listener+job — completing Implementation phase 3 of the Quote/CPQ spec.

**Architecture:** Two new standard objects following the exact `twenty-standard-application` pattern established in Phases 1-2 (already merged): flat metadata builders under `twenty-standard-application/utils/`, universal identifiers in `twenty-shared`. `QuoteLine`'s pricing computation is a **synchronous pre-query hook** (`quoteLine.createOne`/`updateOne`/`createMany`/`updateMany`) that fetches the line's `Product.costTemplate` (with fields/steps) and calls `CostTemplateCalculationService.calculate()` — mirroring this module's own `dashboard.createOne` pre-query hook precedent for "compute a field from sibling fields on the same payload before persistence" (the spec's suggested `searchVector` analogy turned out to be a Postgres `GENERATED` column, not an application hook — verified during planning, not guessed). `Quote.totalAmount`'s rollup from sibling `QuoteLine`s is a **cross-record write** (child write → parent update), for which no synchronous precedent exists anywhere in this codebase; it follows the one real precedent found — `WorkflowVersionStatusListener` + `WorkflowStatusesUpdateJob` — an `@OnDatabaseBatchEvent` listener enqueuing a message-queue job that recomputes and persists the parent. This is a deliberate, user-approved deviation from the spec's literal "recomputed the same way [synchronously]" wording; see Global Constraints.

**Tech Stack:** NestJS, TypeScript, TypeORM, BullMQ (via this codebase's `MessageQueueService`), `dentaku` (via the already-built `CostTemplateCalculationService`), Jest.

**Spec:** `docs/superpowers/specs/2026-09-01-quote-cpq-design.md` (`### Quote`, `### QuoteLine` under `## Data model`, and `### Recalculation trigger` under `## Calculation engine`). Depends on Phase 1 (`CostTemplate`/`CostTemplateField`/`CostTemplateStep`/`Product`, merged) and Phase 2 (`CostTemplateCalculationService`, merged).

## Global Constraints

- New files go under `packages/twenty-server/src/modules/quote/`, following this module's existing layout (`standard-objects/`, `query-hooks/`, and new `quote-line-pricing/`, `quote-total-amount-rollup/` subfolders).
- Every label/description string uses `i18nLabel(msg({ message: ..., context: ... }))` — never a bare string.
- Never reuse or mutate a universal identifier once committed. All UUIDs used in this plan were freshly generated and checked against the entire codebase for collisions (`grep -rF` across every `.ts` file under `packages/`, zero hits) — use them exactly as given, do not invent new ones.
- Every new custom field name must not collide with the 8 system field names every standard object already has: `id`, `createdAt`, `updatedAt`, `deletedAt`, `createdBy`, `updatedBy`, `position`, `searchVector`. **`QuoteLine.position` ("display order within the quote") is the existing system `position` field — do NOT declare a second custom `position` field.**
- `Quote.proposalTemplate` (a nullable relation to the not-yet-built `ProposalTemplate` object) is explicitly OUT OF SCOPE for this plan — `ProposalTemplate` doesn't exist until Phase 4. Phase 4's plan will add this relation to `Quote`'s existing field-metadata builder then, the same way Phase 1's Tasks 2-4 each added a relation to `CostTemplate`'s already-existing file.
- **Ruling, made with the user's explicit sign-off:** `Quote.totalAmount`'s rollup is asynchronous (listener + queue job), not synchronous, deviating from the spec's literal wording. Verified during planning: no pre-query hook anywhere in this codebase writes to a repository for an object other than the one being persisted (`grep` across every `*pre-query.hook.ts` for a second `getRepository<` call: zero hits) — the only real precedent for "child record write triggers a parent record update" is `WorkflowVersionStatusListener`/`WorkflowStatusesUpdateJob`, which is fully asynchronous via `@OnDatabaseBatchEvent` + `MessageQueueService`. `QuoteLine.unitPrice`/`totalPrice` (computed from the line's OWN fields, same-record) remain synchronous per the spec — only the cross-record `Quote.totalAmount` step is async. Cost of this deviation: `Quote.totalAmount` is eventually consistent — a GraphQL client that creates/updates a `QuoteLine` and immediately re-queries the parent `Quote.totalAmount` may see a stale value for the short window until the queue job processes (typically sub-second in this repo's dev/prod queue setup, not tested/bounded here).
- After editing any file under `packages/twenty-shared/src`, run `npx nx build twenty-shared --skip-nx-cache` before trusting any typecheck/test run in `twenty-server`.
- Run `npx tsgo -p tsconfig.json --noEmit` inside `packages/twenty-server` to typecheck, and `npx oxlint --type-aware --fix -c .oxlintrc.json <files>` then `npx oxfmt <files>` from `packages/twenty-server` before each commit (do not run `nx lint:diff-with-main` — no useful merge-base for it on this repo's branch setup).
- Relation field settings always need a matching pair: the `MANY_TO_ONE` side's `targetFieldName` must equal the reverse `ONE_TO_MANY` side's own field name, and vice versa.
- `Attachment.targetQuote` is a `MORPH_RELATION` (not a plain `RELATION`), reusing `Attachment`'s existing morph group (`STANDARD_OBJECTS.attachment.morphIds.targetMorphId.morphId`, already defined — do not create a new morphId), mirroring `Attachment.targetOpportunity` exactly.

---

## Task 1: Quote standard object + Attachment.targetQuote relation

**Files:**
- Create: `packages/twenty-server/src/modules/quote/standard-objects/quote.workspace-entity.ts`
- Modify: `packages/twenty-shared/src/metadata/constants/standard-object-universal-identifiers.constant.ts`
- Modify: `packages/twenty-shared/src/metadata/constants/standard-object-fields.constant.ts`
- Modify: `packages/twenty-shared/src/metadata/constants/standard-object.constant.ts`
- Modify: `packages/twenty-shared/src/metadata/constants/standard-page-layout-universal-identifiers.constant.ts`
- Create: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/compute-quote-standard-flat-field-metadata.util.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/build-standard-flat-field-metadata-maps.util.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/object-metadata/create-standard-flat-object-metadata.util.ts`
- Create: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view/compute-standard-quote-views.util.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view/build-standard-flat-view-metadata-maps.util.ts`
- Create: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field/compute-standard-quote-view-fields.util.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field/build-standard-flat-view-field-metadata-maps.util.ts`
- Create: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/compute-standard-quote-view-field-groups.util.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/build-standard-flat-view-field-group-metadata-maps.util.ts`
- Create: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/page-layout-config/standard-quote-page-layout.config.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/page-layout-config/index.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/constants/standard-page-layout.constant.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/workspace-migration/constant/standard-object-icons.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/page-layout-widget/build-standard-flat-page-layout-widget-metadata-maps.util.ts` (register `quote: 'quoteRecordPageFields'` in `RECORD_PAGE_FIELDS_VIEW_NAME_BY_OBJECT` — a required registration Phase 1's own plan omitted and had to add after the fact; do it up front this time)
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/constants/search-fields-by-standard-object-name.constant.ts` (add `quote: [{ name: 'name', type: FieldMetadataType.TEXT }]`, following `costTemplate`'s own entry)
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/compute-attachment-standard-flat-field-metadata.util.ts` (add `targetQuote`)
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/index/compute-attachment-standard-flat-index-metadata.util.ts` (add `quoteIdIndex`)
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field/compute-standard-attachment-view-fields.util.ts` (add `targetQuote` to `allAttachments`)
- Test: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/__tests__/compute-quote-standard-metadata.spec.ts`

**Interfaces:**
- Consumes: `STANDARD_OBJECTS.attachment` (existing), `TWENTY_STANDARD_APPLICATION_UNIVERSAL_IDENTIFIER` (existing).
- Produces: object name `'quote'` registered in `STANDARD_OBJECTS`; fields `name`, `status`, `opportunity`, `company`, `person`, `validUntil`, `totalAmount`, `attachments` (+ 8 system fields). `attachments` is a plain `ONE_TO_MANY` reverse of `Attachment.targetQuote` (a new `MORPH_RELATION` on `Attachment`). Task 2 will add `quoteLines` to this same object.

- [ ] **Step 1: Add Quote's universal identifier**

In `packages/twenty-shared/src/metadata/constants/standard-object-universal-identifiers.constant.ts`, add inside `STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS`:

```ts
  quote: '52d45abe-28c4-4b82-bb5c-6ce738ab2395',
```

- [ ] **Step 2: Add Quote's field identifiers**

In `packages/twenty-shared/src/metadata/constants/standard-object-fields.constant.ts`, add a new top-level entry:

```ts
  quote: {
    ...buildStandardObjectSystemFields(STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.quote),
    name: { universalIdentifier: 'a1e89815-852d-4916-a32b-00c053af7649' },
    status: { universalIdentifier: '445c5d19-c4c3-411d-b81d-060720ca1a41' },
    opportunity: { universalIdentifier: '6c75a0f8-b21f-44bd-9d05-3b28ce6e6e1e' },
    company: { universalIdentifier: '7f98389f-3a5e-44e5-a47c-a49e1a557abc' },
    person: { universalIdentifier: 'cc5f2f88-921f-4dd4-99c8-3e624e8651cd' },
    validUntil: { universalIdentifier: '941db528-3e40-481b-8f1d-e10881aa1d7a' },
    totalAmount: { universalIdentifier: 'f1da9b3c-751d-4b7e-aecc-acfdff8dac03' },
    attachments: { universalIdentifier: 'b95ec13f-5cc5-4d80-8a36-e72ca09f9172' },
  },
```

Also, in the SAME file, add `targetQuote` to the EXISTING `attachment` entry (find the `attachment: { ... }` block, add alongside its existing `targetOpportunity`/etc. entries):

```ts
    targetQuote: { universalIdentifier: '33b24536-8aaf-4535-907d-1adfe0d7fd11' },
```

- [ ] **Step 3: Declare Quote's views in the shared constant**

In `packages/twenty-shared/src/metadata/constants/standard-object.constant.ts`, add a new top-level entry to `STANDARD_OBJECTS` (mirroring `costTemplate`'s shape from Phase 1 — one index-metadata block only if you add an index; Quote needs none beyond system indexes, so omit `indexes` or leave it `{}` matching `costTemplate`'s pattern):

```ts
  quote: {
    universalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.quote,
    fields: STANDARD_OBJECT_FIELDS.quote,
    views: {
      allQuotes: {
        universalIdentifier: '724add83-dd18-4334-9903-ec7f8dc164fb',
        viewFieldNames: ['name', 'status', 'opportunity', 'totalAmount'],
      },
      quoteRecordPageFields: {
        universalIdentifier: '5bbdf86f-344b-4960-a4df-697c90624c9e',
        viewFieldGroups: {
          general: {
            universalIdentifier: '45b3f507-5f12-45ac-a789-d72d245773a6',
          },
          system: {
            universalIdentifier: 'd62d6f4f-3ddf-416b-aa26-10debd58d491',
          },
        },
        viewFieldNames: [
          'status',
          'opportunity',
          'company',
          'person',
          'validUntil',
          'totalAmount',
          'attachments',
          'createdAt',
          'createdBy',
          'updatedAt',
          'updatedBy',
        ],
      },
    },
  },
```

Note: `name` is deliberately excluded from `quoteRecordPageFields.viewFieldNames` — per Phase 1's final review, the majority convention (company/opportunity/person/note/task) excludes the label-identifier field from its own record-page fields view since it already renders in the record header; `costTemplate` was corrected to match this in Phase 1's fix wave. Follow the corrected convention from the start here.

Also add Attachment's new index identifier to the EXISTING `attachment` entry's `indexes` block:

```ts
      quoteIdIndex: { universalIdentifier: '76131f87-17ce-47e6-a6ec-406b07daf86e' },
```

And append `'targetQuote'` to the EXISTING `attachment.views.allAttachments.viewFieldNames` array.

- [ ] **Step 4: Declare Quote's record-page layout identifiers**

In `packages/twenty-shared/src/metadata/constants/standard-page-layout-universal-identifiers.constant.ts`, add (mirroring `costTemplateRecordPage`'s single-tab, single-widget shape from Phase 1):

```ts
  quoteRecordPage: {
    universalIdentifier: '65f79a89-c868-4ece-9018-ba9a933b1afe',
    tabs: {
      home: {
        universalIdentifier: '529af85d-771d-46b1-bb52-541b60570944',
        widgets: {
          fields: {
            universalIdentifier: '903e8da7-c70b-4984-98cb-b5706cb61c4b',
          },
        },
      },
    },
  },
```

- [ ] **Step 5: Build twenty-shared**

Run: `npx nx build twenty-shared --skip-nx-cache`

- [ ] **Step 6: Create the workspace-entity file**

Create `packages/twenty-server/src/modules/quote/standard-objects/quote.workspace-entity.ts`:

```ts
import { type ActorMetadata } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';
import { type AttachmentWorkspaceEntity } from 'src/modules/attachment/standard-objects/attachment.workspace-entity';
import { type CompanyWorkspaceEntity } from 'src/modules/company/standard-objects/company.workspace-entity';
import { type OpportunityWorkspaceEntity } from 'src/modules/opportunity/standard-objects/opportunity.workspace-entity';
import { type PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';

export type QuoteStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'SENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED';

export class QuoteWorkspaceEntity extends BaseWorkspaceEntity {
  name: string | null;
  status: QuoteStatus;
  opportunity: EntityRelation<OpportunityWorkspaceEntity> | null;
  opportunityId: string | null;
  company: EntityRelation<CompanyWorkspaceEntity> | null;
  companyId: string | null;
  person: EntityRelation<PersonWorkspaceEntity> | null;
  personId: string | null;
  validUntil: string | null;
  totalAmount: { amountMicros: number; currencyCode: string } | null;
  attachments: EntityRelation<AttachmentWorkspaceEntity[]>;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  searchVector: string;
}
```

Before finalizing this file, confirm the exact import paths for `CompanyWorkspaceEntity`, `OpportunityWorkspaceEntity`, `PersonWorkspaceEntity`, and `AttachmentWorkspaceEntity` by checking where each actually lives (`find packages/twenty-server/src -iname "*.workspace-entity.ts" | grep -iE "company|opportunity|person|attachment"`) — the paths above are best-effort based on this codebase's usual `modules/<object>/standard-objects/<object>.workspace-entity.ts` convention, not independently verified during planning; correct them if the real paths differ. Also confirm the exact `CURRENCY` field's TypeScript shape (`{ amountMicros: number; currencyCode: string }`) against `ProductWorkspaceEntity.basePrice`'s own type in `packages/twenty-server/src/modules/quote/standard-objects/product.workspace-entity.ts` (already-committed Phase 1 code) rather than trusting the guess above.

- [ ] **Step 6.5: Add the required `quotes` reverse field to Opportunity, Company, and Person**

**Discovered during implementation, not in the original plan draft — a real gap, now resolved by this ruling, not a step to skip.** `Quote.opportunity`/`company`/`person` are plain (non-morph) `MANY_TO_ONE` relations. Unlike `MORPH_RELATION`s (where the shared morph group is the structure), this codebase's flat-metadata system requires every plain `RELATION` field to have a paired reverse field ALREADY DECLARED on the target object — `createStandardRelationFieldFlatMetadata` looks up `targetFieldIds[targetFieldName].id` and throws if it's missing. `Opportunity`, `Company`, and `Person` (pre-existing core objects, not owned by this module) have no `quotes` field today.

**Ruling:** add a `quotes` `ONE_TO_MANY` reverse field to all three objects. Use the **deterministic identifier derivation** (`getSystemRelationFieldUniversalIdentifier`), not a hand-typed UUID — this is the established, already-in-use pattern for exactly this shape of reverse relation on these same three objects (their existing `attachments`/`taskTargets`/`noteTargets`/`timelineActivities` fields all use it; read at least one of those to confirm the exact call shape before writing this). Surface `quotes` in **`Opportunity`'s existing `opportunityRecordPageFields` view only** — the spec's own primary workflow is "let sales reps build a Quote from an Opportunity," making this a genuinely load-bearing navigation feature there. Do **NOT** add `quotes` to `Company`'s or `Person`'s existing curated record-page-fields views (both relations are nullable/secondary on `Quote`; adding a visible section to two busy, heavily-used core objects for a not-yet-fully-built feature is unwarranted UI clutter) — the field still exists and is fully queryable via GraphQL even when absent from the default page layout, same as many other system relation fields in this codebase.

Files to modify (beyond Task 1's original list):
- `compute-opportunity-standard-flat-field-metadata.util.ts` — add `quotes` (`ONE_TO_MANY`, `targetObjectName: 'quote'`, `targetFieldName: 'opportunity'`, `isSystemSideEffect: true`, `isUIEditable: false`, icon/description your call, matching the style of that object's other reverse-relation fields, e.g. `attachments` — read it for the exact shape to mirror).
- `compute-company-standard-flat-field-metadata.util.ts` — add `quotes` (same shape, `targetFieldName: 'company'`).
- `compute-person-standard-flat-field-metadata.util.ts` — add `quotes` (same shape, `targetFieldName: 'person'`).
- `standard-object-fields.constant.ts` — add `quotes` to the existing `opportunity`, `company`, and `person` blocks, each via `getSystemRelationFieldUniversalIdentifier(...)` (matching how `attachments` is derived there for the same three objects — read the exact call signature from one of those before writing the other two).
- `standard-object.constant.ts`'s `opportunity.views.opportunityRecordPageFields.viewFieldNames` (or equivalent — read the real key name) — append `'quotes'`. Do NOT touch `company`'s or `person`'s equivalent view-field-name lists.
- The corresponding view-field builder for `opportunity` (`compute-standard-opportunity-view-fields.util.ts` or equivalent — find the real file) — add the `quotes` view field to `opportunityRecordPageFields`, mirroring how that file already adds `attachments` or a similar reverse-relation view field.

Confirm via the metadata-build test (Step 20/21) that `Opportunity`/`Company`/`Person` still build correctly with the new field, and that `Quote.opportunity`/`company`/`person` now resolve without the `TypeError` this gap caused.

- [ ] **Step 7: Create the field-metadata builder**

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/compute-quote-standard-flat-field-metadata.util.ts`, following `compute-cost-template-standard-flat-field-metadata.util.ts`'s exact structure (8 system fields via `buildStandardObjectSystemFields`, then custom fields). Field-by-field:

```ts
name: createStandardFieldFlatMetadata({
  objectName, workspaceId,
  context: {
    fieldName: 'name', type: FieldMetadataType.TEXT,
    label: i18nLabel(msg({ message: `Name`, context: 'fieldMetadata.label' })),
    description: i18nLabel(msg({ message: `Quote name`, context: 'fieldMetadata.description' })),
    icon: 'IconFileText', isNullable: false, defaultValue: "''",
  },
  standardObjectMetadataRelatedEntityIds, dependencyFlatEntityMaps, twentyStandardApplicationId, now,
}),
status: createStandardFieldFlatMetadata({
  objectName, workspaceId,
  context: {
    fieldName: 'status', type: FieldMetadataType.SELECT,
    label: i18nLabel(msg({ message: `Status`, context: 'fieldMetadata.label' })),
    description: i18nLabel(msg({ message: `Quote status`, context: 'fieldMetadata.description' })),
    icon: 'IconProgressCheck', isNullable: false, defaultValue: "'DRAFT'",
    options: [
      { id: 'fd47e557-cf5b-4ce4-819d-62397c108118', value: 'DRAFT', label: i18nLabel(msg({ message: `Draft`, context: 'fieldMetadata.label' })), position: 0, color: 'gray' },
      { id: 'e0591387-d400-4b4b-83f0-dde80b233f4a', value: 'IN_REVIEW', label: i18nLabel(msg({ message: `In Review`, context: 'fieldMetadata.label' })), position: 1, color: 'yellow' },
      { id: '00d7fec4-ca51-4de4-859c-d8b2df7d8a18', value: 'APPROVED', label: i18nLabel(msg({ message: `Approved`, context: 'fieldMetadata.label' })), position: 2, color: 'sky' },
      { id: '9c8e5863-2982-4a07-8967-66292dd2acea', value: 'SENT', label: i18nLabel(msg({ message: `Sent`, context: 'fieldMetadata.label' })), position: 3, color: 'blue' },
      { id: '5528c9b8-6312-4e1b-93e2-bfb5ecc57b58', value: 'ACCEPTED', label: i18nLabel(msg({ message: `Accepted`, context: 'fieldMetadata.label' })), position: 4, color: 'green' },
      { id: '8338c650-b4b0-45cd-95a4-91cd621f7edd', value: 'REJECTED', label: i18nLabel(msg({ message: `Rejected`, context: 'fieldMetadata.label' })), position: 5, color: 'red' },
      { id: '7f472930-8ffa-4e1b-982a-c15007f6e09f', value: 'EXPIRED', label: i18nLabel(msg({ message: `Expired`, context: 'fieldMetadata.label' })), position: 6, color: 'orange' },
    ],
  },
  standardObjectMetadataRelatedEntityIds, dependencyFlatEntityMaps, twentyStandardApplicationId, now,
}),
opportunity: createStandardRelationFieldFlatMetadata({
  objectName, workspaceId,
  context: {
    type: FieldMetadataType.RELATION,
    fieldName: 'opportunity',
    label: i18nLabel(msg({ message: `Opportunity`, context: 'fieldMetadata.label' })),
    description: i18nLabel(msg({ message: `Quote opportunity`, context: 'fieldMetadata.description' })),
    icon: 'IconTargetArrow', isNullable: false, isUIEditable: true,
    targetObjectName: 'opportunity', targetFieldName: 'quotes',
    settings: { relationType: RelationType.MANY_TO_ONE, onDelete: RelationOnDeleteAction.CASCADE, joinColumnName: 'opportunityId' },
  },
  standardObjectMetadataRelatedEntityIds, dependencyFlatEntityMaps, twentyStandardApplicationId, now,
}),
company: createStandardRelationFieldFlatMetadata({
  objectName, workspaceId,
  context: {
    type: FieldMetadataType.RELATION,
    fieldName: 'company',
    label: i18nLabel(msg({ message: `Company`, context: 'fieldMetadata.label' })),
    description: i18nLabel(msg({ message: `Quote company`, context: 'fieldMetadata.description' })),
    icon: 'IconBuildingSkyscraper', isNullable: true, isUIEditable: true,
    targetObjectName: 'company', targetFieldName: 'quotes',
    settings: { relationType: RelationType.MANY_TO_ONE, onDelete: RelationOnDeleteAction.SET_NULL, joinColumnName: 'companyId' },
  },
  standardObjectMetadataRelatedEntityIds, dependencyFlatEntityMaps, twentyStandardApplicationId, now,
}),
person: createStandardRelationFieldFlatMetadata({
  objectName, workspaceId,
  context: {
    type: FieldMetadataType.RELATION,
    fieldName: 'person',
    label: i18nLabel(msg({ message: `Person`, context: 'fieldMetadata.label' })),
    description: i18nLabel(msg({ message: `Quote person`, context: 'fieldMetadata.description' })),
    icon: 'IconUser', isNullable: true, isUIEditable: true,
    targetObjectName: 'person', targetFieldName: 'quotes',
    settings: { relationType: RelationType.MANY_TO_ONE, onDelete: RelationOnDeleteAction.SET_NULL, joinColumnName: 'personId' },
  },
  standardObjectMetadataRelatedEntityIds, dependencyFlatEntityMaps, twentyStandardApplicationId, now,
}),
validUntil: createStandardFieldFlatMetadata({
  objectName, workspaceId,
  context: {
    fieldName: 'validUntil', type: FieldMetadataType.DATE,
    label: i18nLabel(msg({ message: `Valid Until`, context: 'fieldMetadata.label' })),
    description: i18nLabel(msg({ message: `Date this quote's pricing is valid until`, context: 'fieldMetadata.description' })),
    icon: 'IconCalendarClock', isNullable: true,
  },
  standardObjectMetadataRelatedEntityIds, dependencyFlatEntityMaps, twentyStandardApplicationId, now,
}),
totalAmount: createStandardFieldFlatMetadata({
  objectName, workspaceId,
  context: {
    fieldName: 'totalAmount', type: FieldMetadataType.CURRENCY,
    label: i18nLabel(msg({ message: `Total Amount`, context: 'fieldMetadata.label' })),
    description: i18nLabel(msg({ message: `Sum of this quote's line totals`, context: 'fieldMetadata.description' })),
    icon: 'IconCurrencyDollar', isNullable: true, isUIEditable: false,
  },
  standardObjectMetadataRelatedEntityIds, dependencyFlatEntityMaps, twentyStandardApplicationId, now,
}),
attachments: createStandardRelationFieldFlatMetadata({
  objectName, workspaceId,
  context: {
    type: FieldMetadataType.RELATION,
    fieldName: 'attachments',
    label: i18nLabel(msg({ message: `Attachments`, context: 'fieldMetadata.label' })),
    description: i18nLabel(msg({ message: `Quote attachments`, context: 'fieldMetadata.description' })),
    icon: 'IconFileImport', isNullable: false, isUIEditable: false, isSystemSideEffect: true,
    targetObjectName: 'attachment', targetFieldName: 'targetQuote',
    settings: { relationType: RelationType.ONE_TO_MANY },
  },
  standardObjectMetadataRelatedEntityIds, dependencyFlatEntityMaps, twentyStandardApplicationId, now,
}),
```

**Before writing this file, read `compute-cost-template-standard-flat-field-metadata.util.ts` and `compute-product-standard-flat-field-metadata.util.ts` in full first** — the exact `createStandardFieldFlatMetadata`/`createStandardRelationFieldFlatMetadata` helper signatures, the `RelationType`/`RelationOnDeleteAction`/`FieldMetadataType` import paths, and whether reverse `ONE_TO_MANY` relations need `isNullable`/`isUIEditable` set a specific way are already established in that file — mirror it exactly rather than trusting the snippet above blindly, the same discipline every prior task in this plan sequence has used. `totalAmount` has NO `defaultValue` since it's computed and starts `null` until the first `QuoteLine` is added (confirm this is a valid `isNullable: true` CURRENCY field with no default, matching how a nullable computed field should look — cross-check against any other computed/rollup CURRENCY field elsewhere in this codebase if one exists, e.g. search `grep -rn "isUIEditable: false" --include="*.ts" packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/ | grep -i currency`).

- [ ] **Step 8: Register the field-metadata builder**

In `build-standard-flat-field-metadata-maps.util.ts`, add the `quote` entry alphabetically (between `product` and whatever follows), calling `computeQuoteStandardFlatFieldMetadatas`.

- [ ] **Step 9: Register the object-metadata builder**

In `create-standard-flat-object-metadata.util.ts`, add the `quote` object-metadata entry (icon `IconFileText`, `isSearchable: true`, `labelIdentifierFieldMetadataName: 'name'`), mirroring `costTemplate`'s/`product`'s entries exactly.

- [ ] **Step 10: Create the views builder**

Create `compute-standard-quote-views.util.ts`, mirroring `compute-standard-cost-template-views.util.ts` (2 views: `allQuotes` INDEX, `quoteRecordPageFields` FIELDS_WIDGET).

- [ ] **Step 11: Register the views builder**

In `build-standard-flat-view-metadata-maps.util.ts`, add `quote`.

- [ ] **Step 12: Create the view-fields builder**

Create `compute-standard-quote-view-fields.util.ts`, mirroring `compute-standard-cost-template-view-fields.util.ts`. `allQuotes` gets `name`, `status`, `opportunity`, `totalAmount`. `quoteRecordPageFields` gets the 11 fields listed in Step 3 above, split `status`/`opportunity`/`company`/`person`/`validUntil`/`totalAmount`/`attachments` into the `general` group and the 4 system fields into `system`, following `costTemplate`'s corrected (post-fix-wave) grouping convention exactly.

Also modify `compute-standard-attachment-view-fields.util.ts`: add `allAttachmentsTargetQuote` to the `allAttachments` view (position after the existing `targetOpportunity`-equivalent entry, `size: 150`), mirroring the existing `targetOpportunity` view-field entry in that same file exactly.

- [ ] **Step 13: Register the view-fields builder**

In `build-standard-flat-view-field-metadata-maps.util.ts`, add `quote`.

- [ ] **Step 14: Create the view-field-groups builder**

Create `compute-standard-quote-view-field-groups.util.ts` (2 groups: `general`, `system`), mirroring `compute-standard-cost-template-view-field-groups.util.ts`.

- [ ] **Step 15: Register the view-field-groups builder**

In `build-standard-flat-view-field-group-metadata-maps.util.ts`, add `quote`.

- [ ] **Step 16: Create the page-layout config**

Create `standard-quote-page-layout.config.ts` (single `home` tab, single `fields` widget), mirroring `standard-cost-template-page-layout.config.ts`.

- [ ] **Step 17: Export and register the page-layout config**

In `page-layout-config/index.ts` and `standard-page-layout.constant.ts`, add `quote`.

- [ ] **Step 18: Register the object's icon, search fields, and record-page-fields widget entry**

In `standard-object-icons.ts`: `quote: 'IconFileText'`.
In `search-fields-by-standard-object-name.constant.ts`: `quote: [{ name: 'name', type: FieldMetadataType.TEXT }]`.
In `build-standard-flat-page-layout-widget-metadata-maps.util.ts`'s `RECORD_PAGE_FIELDS_VIEW_NAME_BY_OBJECT`: `quote: 'quoteRecordPageFields'`.

(These three registrations were each independently discovered as required-but-unlisted in Phase 1's task reviews — doing them up front here, not as an afterthought.)

- [ ] **Step 19: Add and register `Attachment.targetQuote`**

In `compute-attachment-standard-flat-field-metadata.util.ts`, add (mirroring the existing `targetOpportunity` field exactly — same file, read it first):

```ts
targetQuote: createStandardRelationFieldFlatMetadata({
  objectName, workspaceId,
  context: {
    type: FieldMetadataType.MORPH_RELATION,
    morphId: STANDARD_OBJECTS.attachment.morphIds.targetMorphId.morphId,
    fieldName: 'targetQuote',
    label: i18nLabel(msg({ message: `Quote`, context: 'fieldMetadata.label' })),
    description: i18nLabel(msg({ message: `Attachment target`, context: 'fieldMetadata.description' })),
    icon: 'IconFileImport', isNullable: true, isUIEditable: false, isSystemSideEffect: true,
    targetObjectName: 'quote', targetFieldName: 'attachments',
    settings: { relationType: RelationType.MANY_TO_ONE, onDelete: RelationOnDeleteAction.CASCADE, joinColumnName: 'targetQuoteId' },
  },
  standardObjectMetadataRelatedEntityIds, dependencyFlatEntityMaps, twentyStandardApplicationId, now,
}),
```

In `compute-attachment-standard-flat-index-metadata.util.ts`, add (mirroring the existing index for `targetOpportunity`):

```ts
quoteIdIndex: createStandardIndexFlatMetadata({
  objectName, workspaceId,
  context: { indexName: 'quoteIdIndex', relatedFieldNames: ['targetQuote'] },
  standardObjectMetadataRelatedEntityIds, dependencyFlatEntityMaps, twentyStandardApplicationId, now,
}),
```

- [ ] **Step 20: Write the metadata-build test**

Create `compute-quote-standard-metadata.spec.ts`, mirroring `compute-cost-template-standard-metadata.spec.ts`'s structure exactly (uses `computeTwentyStandardApplicationAllFlatEntityMaps`, no mocks). Cover at minimum:
- `quote` object builds with all 7 custom fields + 8 system fields.
- `status` field has exactly 7 options with the expected `value`s.
- `allQuotes` and `quoteRecordPageFields` views build with the expected view-field counts.
- `costTemplateRecordPageFields`-style assertion adapted: `quoteRecordPageFields`'s declared `viewFieldNames` (from `standard-object.constant.ts`) exactly match what's instantiated (guards against the Phase 1 I3 class of bug — a declared-but-never-built view field).
- `attachment` object's `targetQuote` field exists, is a `MORPH_RELATION` on the SAME `morphId` as `targetOpportunity`, with `targetFieldName: 'attachments'`.
- `quote.attachments` field exists as the reverse `ONE_TO_MANY`, `targetFieldName: 'targetQuote'`.

- [ ] **Step 21: Run the test**

Run: `npx jest packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/__tests__/compute-quote-standard-metadata.spec.ts --config=packages/twenty-server/jest.config.mjs`
Expected: all tests PASS.

- [ ] **Step 22: Typecheck and lint**

Run: `cd packages/twenty-server && npx tsgo -p tsconfig.json --noEmit`
Run: `cd packages/twenty-server && npx oxlint --type-aware --fix -c .oxlintrc.json <every file touched in this task>`
Run: `cd packages/twenty-server && npx oxfmt <same files>`
Expected: both clean.

- [ ] **Step 23: Commit**

```bash
git add packages/twenty-shared/src/metadata/constants/standard-object-universal-identifiers.constant.ts \
        packages/twenty-shared/src/metadata/constants/standard-object-fields.constant.ts \
        packages/twenty-shared/src/metadata/constants/standard-object.constant.ts \
        packages/twenty-shared/src/metadata/constants/standard-page-layout-universal-identifiers.constant.ts \
        packages/twenty-server/src/modules/quote/standard-objects/quote.workspace-entity.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/compute-quote-standard-flat-field-metadata.util.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/build-standard-flat-field-metadata-maps.util.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/compute-attachment-standard-flat-field-metadata.util.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/object-metadata/create-standard-flat-object-metadata.util.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view/compute-standard-quote-views.util.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view/build-standard-flat-view-metadata-maps.util.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field/compute-standard-quote-view-fields.util.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field/compute-standard-attachment-view-fields.util.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field/build-standard-flat-view-field-metadata-maps.util.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/compute-standard-quote-view-field-groups.util.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/build-standard-flat-view-field-group-metadata-maps.util.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/page-layout-config/standard-quote-page-layout.config.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/page-layout-config/index.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/constants/standard-page-layout.constant.ts \
        packages/twenty-server/src/engine/workspace-manager/workspace-migration/constant/standard-object-icons.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/page-layout-widget/build-standard-flat-page-layout-widget-metadata-maps.util.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/constants/search-fields-by-standard-object-name.constant.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/index/compute-attachment-standard-flat-index-metadata.util.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/__tests__/compute-quote-standard-metadata.spec.ts
git commit -m "feat: add Quote standard object and Attachment.targetQuote relation"
```

---

## Task 2: QuoteLine standard object

**Files:** same category of files as Task 1, for a new `quoteLine` object, plus modifying `quote.workspace-entity.ts` and `compute-quote-standard-flat-field-metadata.util.ts` to add the reverse `quoteLines` relation (mirroring how Phase 1's Tasks 2-4 each added a reverse relation to `CostTemplate`'s existing files).

- Create: `packages/twenty-server/src/modules/quote/standard-objects/quote-line.workspace-entity.ts`
- Modify: `quote.workspace-entity.ts` (add `quoteLines: EntityRelation<QuoteLineWorkspaceEntity[]>`)
- Modify: `packages/twenty-shared/src/metadata/constants/standard-object-universal-identifiers.constant.ts`
- Modify: `packages/twenty-shared/src/metadata/constants/standard-object-fields.constant.ts` (new `quoteLine` entry AND add `quoteLines` to the existing `quote` entry)
- Modify: `packages/twenty-shared/src/metadata/constants/standard-object.constant.ts` (new `quoteLine` entry, index declaration, extend `quote`'s record-page view's `viewFieldNames` with `'quoteLines'`)
- Modify: `packages/twenty-shared/src/metadata/constants/standard-page-layout-universal-identifiers.constant.ts`
- Create: `compute-quote-line-standard-flat-field-metadata.util.ts`
- Modify: `compute-quote-standard-flat-field-metadata.util.ts` (add `quoteLines` reverse relation)
- Modify: `build-standard-flat-field-metadata-maps.util.ts`
- Modify: `create-standard-flat-object-metadata.util.ts`
- Create: `compute-quote-line-standard-flat-index-metadata.util.ts` (a `quoteIdIndex` on `QuoteLine`, non-unique, mirroring `CostTemplateField`'s `costTemplateIdIndex` shape from Phase 1)
- Modify: `build-standard-flat-index-metadata-maps.util.ts`
- Create: `compute-standard-quote-line-views.util.ts`
- Modify: `build-standard-flat-view-metadata-maps.util.ts`
- Create: `compute-standard-quote-line-view-fields.util.ts`
- Modify: `build-standard-flat-view-field-metadata-maps.util.ts`
- Create: `compute-standard-quote-line-view-field-groups.util.ts`
- Modify: `build-standard-flat-view-field-group-metadata-maps.util.ts`
- Create: `standard-quote-line-page-layout.config.ts`
- Modify: `page-layout-config/index.ts`, `standard-page-layout.constant.ts`, `standard-object-icons.ts`, `build-standard-flat-page-layout-widget-metadata-maps.util.ts`, `search-fields-by-standard-object-name.constant.ts` (`quoteLine: []` — no natural search field, matching `costTemplateField`/`costTemplateStep`'s precedent)
- Test: `compute-quote-line-standard-metadata.spec.ts`

**Interfaces:**
- Consumes: object `'quote'` (Task 1) as the `quote` relation's target; object `'product'` (Phase 1, already merged) as the `product` relation's target.
- Produces: object name `'quoteLine'`; fields `quote` (relation, required), `product` (relation, required), `quantity`, `discountPercent`, `fieldValues`, `unitPrice`, `totalPrice`. `Quote` gains a `quoteLines` reverse-relation field. Task 3 consumes `quoteLine.fieldValues`/`quantity`/`discountPercent`/`product`/`unitPrice`/`totalPrice` field names directly.

- [ ] **Step 1: Add universal identifiers**

```ts
  quoteLine: 'e72c4a66-ee2a-4215-b817-90caff3b26f3',
```

- [ ] **Step 2: Add field identifiers, including the reverse relation on Quote**

```ts
  quoteLine: {
    ...buildStandardObjectSystemFields(STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.quoteLine),
    quote: { universalIdentifier: '0798bff0-2e84-468d-a0a1-b20f80f755b7' },
    product: { universalIdentifier: '590b4fcd-3258-40ae-8a2a-b84a11c66546' },
    quantity: { universalIdentifier: '682e6d0c-c906-470d-975b-f75f9ae848a3' },
    discountPercent: { universalIdentifier: '0c8991e6-2ace-430e-bcca-d26b17082520' },
    fieldValues: { universalIdentifier: '288f43a4-bbab-4d40-9a50-bcbb158afeb4' },
    unitPrice: { universalIdentifier: 'd8887c62-c9d5-41fd-8c27-583ae916464f' },
    totalPrice: { universalIdentifier: '943d59fa-b304-4641-8487-abd87278c642' },
  },
```

And add to the EXISTING `quote` entry from Task 1:

```ts
    quoteLines: { universalIdentifier: 'd82bc675-37b5-498b-a2c9-0ceb5d7332e6' },
```

- [ ] **Step 3: Add views + index declaration for quoteLine, and extend quote's record-page view**

```ts
  quoteLine: {
    universalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.quoteLine,
    fields: STANDARD_OBJECT_FIELDS.quoteLine,
    indexes: {
      quoteIdIndex: { universalIdentifier: '6a965497-00c7-4974-acbd-3ce8da2f8c9c' },
    },
    views: {
      allQuoteLines: {
        universalIdentifier: '3c887167-d66e-47c3-85ed-2b73756b26bb',
        viewFieldNames: ['quote', 'product', 'quantity', 'unitPrice', 'totalPrice'],
      },
      quoteLineRecordPageFields: {
        universalIdentifier: '3da3012d-9a75-48bb-9ffb-d211943f2324',
        viewFieldGroups: {
          general: { universalIdentifier: 'cd73b9da-05a0-453b-ba57-1721e6156d54' },
          system: { universalIdentifier: 'cc5ecfaa-5e2c-42a0-886d-3df802347723' },
        },
        viewFieldNames: [
          'quote', 'product', 'quantity', 'discountPercent', 'fieldValues', 'unitPrice', 'totalPrice',
          'createdAt', 'createdBy', 'updatedAt', 'updatedBy',
        ],
      },
    },
  },
```

Append `'quoteLines'` to `quote.views.quoteRecordPageFields.viewFieldNames` (from Task 1).

- [ ] **Step 4: Add page-layout identifiers for quoteLine**

```ts
  quoteLineRecordPage: {
    universalIdentifier: 'e5b61242-7562-448c-a930-5c2369445690',
    tabs: {
      home: {
        universalIdentifier: 'd7d0057e-8997-414c-9423-007eb583318a',
        widgets: {
          fields: { universalIdentifier: 'adb2dcb0-6552-4cd0-ae2f-4da37412f88f' },
        },
      },
    },
  },
```

- [ ] **Step 5: Build twenty-shared**

Run: `npx nx build twenty-shared --skip-nx-cache`

- [ ] **Step 6: Create the workspace-entity file**

Create `packages/twenty-server/src/modules/quote/standard-objects/quote-line.workspace-entity.ts`:

```ts
import { type ActorMetadata } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';
import { type ProductWorkspaceEntity } from 'src/modules/quote/standard-objects/product.workspace-entity';
import { type QuoteWorkspaceEntity } from 'src/modules/quote/standard-objects/quote.workspace-entity';

export class QuoteLineWorkspaceEntity extends BaseWorkspaceEntity {
  quote: EntityRelation<QuoteWorkspaceEntity> | null;
  quoteId: string | null;
  product: EntityRelation<ProductWorkspaceEntity> | null;
  productId: string | null;
  quantity: number;
  discountPercent: number | null;
  fieldValues: Record<string, string | number | boolean> | null;
  unitPrice: { amountMicros: number; currencyCode: string } | null;
  totalPrice: { amountMicros: number; currencyCode: string } | null;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  searchVector: string;
}
```

Cross-check the exact `CURRENCY` and `RAW_JSON` TypeScript shapes against `ProductWorkspaceEntity.basePrice` and `CostTemplateFieldWorkspaceEntity.picklistOptions` respectively (both already-committed Phase 1 code) rather than trusting the guess above.

- [ ] **Step 7: Edit Quote's workspace-entity to add the reverse relation**

In `quote.workspace-entity.ts`:

```ts
  quoteLines: EntityRelation<QuoteLineWorkspaceEntity[]>;
```

(with the corresponding import added)

- [ ] **Step 8: Create the field-metadata builder for QuoteLine**

Create `compute-quote-line-standard-flat-field-metadata.util.ts`, mirroring `compute-cost-template-field-standard-flat-field-metadata.util.ts`'s structure. Field-by-field:

```ts
quote: createStandardRelationFieldFlatMetadata({
  objectName, workspaceId,
  context: {
    type: FieldMetadataType.RELATION,
    fieldName: 'quote',
    label: i18nLabel(msg({ message: `Quote`, context: 'fieldMetadata.label' })),
    description: i18nLabel(msg({ message: `QuoteLine quote`, context: 'fieldMetadata.description' })),
    icon: 'IconFileText', isNullable: false, isUIEditable: false, isSystemSideEffect: true,
    targetObjectName: 'quote', targetFieldName: 'quoteLines',
    settings: { relationType: RelationType.MANY_TO_ONE, onDelete: RelationOnDeleteAction.CASCADE, joinColumnName: 'quoteId' },
  },
  standardObjectMetadataRelatedEntityIds, dependencyFlatEntityMaps, twentyStandardApplicationId, now,
}),
product: createStandardRelationFieldFlatMetadata({
  objectName, workspaceId,
  context: {
    type: FieldMetadataType.RELATION,
    fieldName: 'product',
    label: i18nLabel(msg({ message: `Product`, context: 'fieldMetadata.label' })),
    description: i18nLabel(msg({ message: `QuoteLine product`, context: 'fieldMetadata.description' })),
    icon: 'IconPackage', isNullable: false, isUIEditable: true,
    targetObjectName: 'product', targetFieldName: 'quoteLines',
    settings: { relationType: RelationType.MANY_TO_ONE, onDelete: RelationOnDeleteAction.RESTRICT, joinColumnName: 'productId' },
  },
  standardObjectMetadataRelatedEntityIds, dependencyFlatEntityMaps, twentyStandardApplicationId, now,
}),
quantity: createStandardFieldFlatMetadata({
  objectName, workspaceId,
  context: {
    fieldName: 'quantity', type: FieldMetadataType.NUMBER,
    label: i18nLabel(msg({ message: `Quantity`, context: 'fieldMetadata.label' })),
    description: i18nLabel(msg({ message: `Quantity`, context: 'fieldMetadata.description' })),
    icon: 'IconHash', isNullable: false, defaultValue: '1',
  },
  standardObjectMetadataRelatedEntityIds, dependencyFlatEntityMaps, twentyStandardApplicationId, now,
}),
discountPercent: createStandardFieldFlatMetadata({
  objectName, workspaceId,
  context: {
    fieldName: 'discountPercent', type: FieldMetadataType.NUMBER,
    label: i18nLabel(msg({ message: `Discount Percent`, context: 'fieldMetadata.label' })),
    description: i18nLabel(msg({ message: `Discount percentage applied to this line`, context: 'fieldMetadata.description' })),
    icon: 'IconDiscount2', isNullable: true, defaultValue: '0',
  },
  standardObjectMetadataRelatedEntityIds, dependencyFlatEntityMaps, twentyStandardApplicationId, now,
}),
fieldValues: createStandardFieldFlatMetadata({
  objectName, workspaceId,
  context: {
    fieldName: 'fieldValues', type: FieldMetadataType.RAW_JSON,
    label: i18nLabel(msg({ message: `Field Values`, context: 'fieldMetadata.label' })),
    description: i18nLabel(msg({ message: `Values for the product's cost template fields`, context: 'fieldMetadata.description' })),
    icon: 'IconForms', isNullable: true,
  },
  standardObjectMetadataRelatedEntityIds, dependencyFlatEntityMaps, twentyStandardApplicationId, now,
}),
unitPrice: createStandardFieldFlatMetadata({
  objectName, workspaceId,
  context: {
    fieldName: 'unitPrice', type: FieldMetadataType.CURRENCY,
    label: i18nLabel(msg({ message: `Unit Price`, context: 'fieldMetadata.label' })),
    description: i18nLabel(msg({ message: `Computed from the product's cost template, or entered manually if it has none`, context: 'fieldMetadata.description' })),
    icon: 'IconCurrencyDollar', isNullable: true, isUIEditable: true,
  },
  standardObjectMetadataRelatedEntityIds, dependencyFlatEntityMaps, twentyStandardApplicationId, now,
}),
totalPrice: createStandardFieldFlatMetadata({
  objectName, workspaceId,
  context: {
    fieldName: 'totalPrice', type: FieldMetadataType.CURRENCY,
    label: i18nLabel(msg({ message: `Total Price`, context: 'fieldMetadata.label' })),
    description: i18nLabel(msg({ message: `unitPrice * quantity * (1 - discountPercent / 100)`, context: 'fieldMetadata.description' })),
    icon: 'IconCurrencyDollar', isNullable: true, isUIEditable: false,
  },
  standardObjectMetadataRelatedEntityIds, dependencyFlatEntityMaps, twentyStandardApplicationId, now,
}),
```

`quote`'s `isUIEditable: false` + `isSystemSideEffect: true` mirrors how a required parent-link relation is typically locked from direct UI editing on the child (confirm this against `costTemplateField.costTemplate`'s own settings in the already-committed Phase 1 file — mirror whichever pattern that field actually uses, don't diverge without checking). `product`'s `onDelete: RESTRICT` is a deliberate choice (a Product with existing QuoteLines referencing it shouldn't be deletable out from under them) — confirm `RelationOnDeleteAction.RESTRICT` is a real enum member (`grep -n "RESTRICT" packages/twenty-server/src/engine/metadata-modules -r`) before relying on it; if it doesn't exist, use `RelationOnDeleteAction.SET_NULL` instead and make `product` nullable — but re-check against the spec first, which says `product` is "required", so `SET_NULL` would contradict that; if `RESTRICT` doesn't exist, escalate this as a real open question rather than silently picking a fallback that violates the spec's own field constraint.

- [ ] **Step 9: Add the reverse `quoteLines` relation to Quote's field-metadata builder**

In `compute-quote-standard-flat-field-metadata.util.ts`:

```ts
quoteLines: createStandardRelationFieldFlatMetadata({
  objectName, workspaceId,
  context: {
    type: FieldMetadataType.RELATION,
    fieldName: 'quoteLines',
    label: i18nLabel(msg({ message: `Quote Lines`, context: 'fieldMetadata.label' })),
    description: i18nLabel(msg({ message: `Lines on this quote`, context: 'fieldMetadata.description' })),
    icon: 'IconListDetails', isNullable: false, isUIEditable: false, isSystemSideEffect: true,
    targetObjectName: 'quoteLine', targetFieldName: 'quote',
    settings: { relationType: RelationType.ONE_TO_MANY },
  },
  standardObjectMetadataRelatedEntityIds, dependencyFlatEntityMaps, twentyStandardApplicationId, now,
}),
```

- [ ] **Step 9.5: Add the required `quoteLines` reverse field to Product**

**Same class of gap Task 1 hit and fixed for Opportunity/Company/Person — this plan draft repeated the mistake for `Product`, catch it now rather than at implementation time.** `QuoteLine.product` (Step 8, above) is a plain `MANY_TO_ONE` relation with `targetFieldName: 'quoteLines'`, which requires `Product` to already declare a `quoteLines` field — it doesn't, and this task's original file list never included modifying `product.workspace-entity.ts` or `compute-product-standard-flat-field-metadata.util.ts`.

**Ruling (same reasoning as Task 1's Step 6.5):** add `quoteLines` (`ONE_TO_MANY`, `targetObjectName: 'quoteLine'`, `targetFieldName: 'product'`, `isSystemSideEffect: true`, `isUIEditable: false`) to `Product`'s field-metadata builder, using a fresh universal identifier checked for collisions the same way every other identifier in this plan sequence was (or, if you find `Product` already uses `getSystemRelationFieldUniversalIdentifier` for its OTHER reverse relations — check `costTemplate.products`' own identifier derivation in Phase 1's already-committed code first — match whichever approach `Product`'s existing reverse relations actually use, don't introduce a third convention). Do **NOT** add `quoteLines` to `Product`'s existing `productRecordPageFields` view — same conservative reasoning as Company/Person in Step 6.5 (a Product can accumulate many QuoteLines over time; a not-yet-fully-built feature doesn't need a visible section on every Product record yet; the field stays fully queryable regardless).

Files to modify (beyond this task's original list):
- `packages/twenty-shared/src/metadata/constants/standard-object-fields.constant.ts` — add `quoteLines` to the existing `product` block.
- `packages/twenty-server/.../field-metadata/compute-product-standard-flat-field-metadata.util.ts` — add the `quoteLines` field, mirroring `product.costTemplate`'s own reverse-relation sibling if one exists, or `Quote.attachments`'s shape (Task 1, already committed) otherwise.

Confirm via the metadata-build test that `Product` still builds correctly and `QuoteLine.product` now resolves without error.

- [ ] **Step 10: Register the field-metadata builder**

- [ ] **Step 11: Register the object-metadata builder**

(icon `IconReceipt2`, `isSearchable: false` — no natural search field, matching `costTemplateField`/`costTemplateStep`'s precedent, `labelIdentifierFieldMetadataName`: check what a relation-only object with no natural label field uses elsewhere, e.g. `costTemplateField` itself already solved this in Phase 1 — mirror its exact choice.)

- [ ] **Step 12: Create views/view-fields/view-field-groups builders**

Mirror Phase 1's `costTemplateField` pattern exactly (2 views, 2 groups, view fields split general/system).

- [ ] **Step 13: Register views/view-fields/view-field-groups builders**

- [ ] **Step 14: Create and register the index-metadata builder**

`quoteIdIndex` on `quote` (single-column, non-unique — mirroring `costTemplateField.costTemplateIdIndex`'s exact shape from Phase 1, NOT the composite-unique `variableNameUniqueIndex` pattern, which doesn't apply here).

- [ ] **Step 15: Create and register the page-layout config**

- [ ] **Step 16: Register the icon, search fields, record-page-fields widget entry**

`quoteLine: 'IconReceipt2'`; `quoteLine: []` in search fields; `quoteLine: 'quoteLineRecordPageFields'` in the widget map.

- [ ] **Step 17: Write the metadata-build test**

Mirror `compute-cost-template-field-standard-metadata.spec.ts`'s structure. Cover: object builds with all 7 custom fields; `quote`/`product` relation settings (`targetFieldName` pairing both directions); `quote.quoteLines` reverse relation exists; `quoteLineRecordPageFields`'s declared vs. instantiated view-field-name parity (same guard as Task 1's Step 20).

- [ ] **Step 18: Run tests**

- [ ] **Step 19: Typecheck and lint**

- [ ] **Step 20: Commit**

```bash
git commit -m "feat: add QuoteLine standard object"
```

(stage the full file list from this task's **Files** section)

---

## Task 3: QuoteLine pricing — synchronous pre-query hooks calling CostTemplateCalculationService

**Files:**
- Create: `packages/twenty-server/src/modules/quote/quote-line-pricing/services/quote-line-pricing.service.ts`
- Test: `packages/twenty-server/src/modules/quote/quote-line-pricing/services/__tests__/quote-line-pricing.service.spec.ts`
- Create: `packages/twenty-server/src/modules/quote/query-hooks/quote-line-create-one.pre-query.hook.ts`
- Create: `packages/twenty-server/src/modules/quote/query-hooks/quote-line-update-one.pre-query.hook.ts`
- Create: `packages/twenty-server/src/modules/quote/query-hooks/quote-line-create-many.pre-query.hook.ts`
- Create: `packages/twenty-server/src/modules/quote/query-hooks/quote-line-update-many.pre-query.hook.ts`
- Test: 4 corresponding spec files under `packages/twenty-server/src/modules/quote/query-hooks/__tests__/`
- Modify: `packages/twenty-server/src/modules/quote/query-hooks/quote-query-hook.module.ts`

**Interfaces:**
- Consumes: `CostTemplateCalculationService.calculate()` (Phase 2, merged) with its `CostTemplateCalculationFieldInput`/`CostTemplateCalculationStepInput`/`CostTemplateCalculationResult` types; `WorkspaceOrmManager`/`buildSystemAuthContext` (Phase 1's established pattern); `ProductWorkspaceEntity`, `CostTemplateFieldWorkspaceEntity`, `CostTemplateStepWorkspaceEntity`, `QuoteLineWorkspaceEntity` (Phase 1/2, this plan's Task 2).
- Produces: `QuoteLinePricingService.computePricing({ workspaceId, productId, fieldValues, quantity, discountPercent }): Promise<QuoteLinePricingResult>` where `QuoteLinePricingResult = { unitPrice: number; totalPrice: number } | { errors: string[] }` (a plain array of human-readable messages, not `CostTemplateCalculationError[]` directly — the hooks throw a single `CommonQueryRunnerException` from this, following `CostTemplateValidationService`'s established exception pattern, so the service's job is to reduce `CostTemplateCalculationService`'s structured errors down to caller-facing text, not to re-expose dentaku's internal error taxonomy at the GraphQL boundary).

- [ ] **Step 1: Read the real Product/CostTemplate relation shape before writing anything**

Read `packages/twenty-server/src/modules/quote/standard-objects/product.workspace-entity.ts` (Phase 1, has `costTemplate: EntityRelation<CostTemplateWorkspaceEntity> | null`) and `packages/twenty-server/src/modules/quote/standard-objects/cost-template.workspace-entity.ts` (has `fields: EntityRelation<CostTemplateFieldWorkspaceEntity[]>`, `steps: EntityRelation<CostTemplateStepWorkspaceEntity[]>`). Also re-read `packages/twenty-server/src/modules/quote/cost-template-validation/services/cost-template-validation.service.ts` in full (the established `WorkspaceOrmManager`/`executeInWorkspaceContext`/`buildSystemAuthContext`/`getRepository<T>('objectName', { shouldBypassPermissionChecks: true })` pattern this plan's service below must follow) and `packages/twenty-server/src/modules/quote/cost-template-calculation/services/cost-template-calculation.service.ts` (Phase 2, the `calculate()` method this service calls, and its exact `CostTemplateCalculationFieldInput`/`StepInput` shapes to map into).

- [ ] **Step 2: Write the failing tests for the pricing service**

Create `packages/twenty-server/src/modules/quote/quote-line-pricing/services/__tests__/quote-line-pricing.service.spec.ts`, mocking `WorkspaceOrmManager` the same way `cost-template-validation.service.spec.ts` does (a `getRepository` jest mock keyed by object name, `executeInWorkspaceContext: jest.fn((fn) => fn())`). Cover:

```ts
describe('QuoteLinePricingService', () => {
  // ... setup mocking productRepository.findOne to return a product with a costTemplate
  // relation eagerly loaded (fields + steps), matching how the repository call in the
  // real service will actually request the relation (confirm the real find-with-relations
  // syntax against an existing example elsewhere in this codebase before writing this test
  // — do not assume `relations: [...]` works without checking a real precedent, TypeORM's
  // relation-loading option names vary by codebase convention).

  it('computes unitPrice and totalPrice when the product has a cost template', async () => {
    // product.costTemplate has one field `seats` (NUMBER) and one output step
    // `total = seats * 10`; fieldValues = { seats: 5 }; quantity = 2; discountPercent = 10
    // → unitPrice = 50, totalPrice = 50 * 2 * 0.9 = 90
  });

  it('returns the manually-provided unitPrice unchanged when the product has no cost template', async () => {
    // product.costTemplate is null; unitPrice passed in as 42; quantity = 3; discountPercent = null
    // → unitPrice stays 42, totalPrice = 42 * 3 * 1 = 126
  });

  it('returns errors when the product has a cost template but calculation fails', async () => {
    // e.g. a required field missing from fieldValues → CostTemplateCalculationService
    // returns success: false; this service surfaces that as { errors: [...] }, not a throw
  });

  it('throws when the product itself cannot be found', async () => {
    // productRepository.findOne returns null — this IS an exceptional case (the caller
    // passed a productId that doesn't exist), not a formula/validation problem, so this
    // should throw rather than return a structured error — confirm this design choice
    // makes sense given how the hook (Step 6) will call this method, and adjust if not
  });
});
```

Do not write the exact numeric assertions or mock shapes as fixed truths from this brief alone — verify them by actually running the intended math and by confirming the real TypeORM relation-loading call shape against a genuine precedent elsewhere in this codebase (e.g. any existing `getRepository<T>(...).findOne({ where: ..., relations: ... })` call with nested relations, if one exists) before finalizing this test file.

- [ ] **Step 3: Run the tests to see them fail**

- [ ] **Step 4: Implement `QuoteLinePricingService`**

Create `packages/twenty-server/src/modules/quote/quote-line-pricing/services/quote-line-pricing.service.ts`. Shape (not exact code — the real repository/relation-loading call must be verified against a real precedent per Step 1, and this is genuinely new integration code, not a transcription task like Phases 1-2's simpler pieces):

```ts
@Injectable()
export class QuoteLinePricingService {
  constructor(
    private readonly workspaceOrmManager: WorkspaceOrmManager,
    private readonly costTemplateCalculationService: CostTemplateCalculationService,
  ) {}

  async computePricing({
    workspaceId,
    productId,
    fieldValues,
    quantity,
    discountPercent,
    manualUnitPrice,
  }: ComputePricingArgs): Promise<QuoteLinePricingResult> {
    const authContext = buildSystemAuthContext(workspaceId);

    const product = await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
      const productRepository = this.workspaceOrmManager.getRepository<ProductWorkspaceEntity>(
        'product', { shouldBypassPermissionChecks: true },
      );
      return productRepository.findOne({
        where: { id: productId },
        // relations: verify the real syntax per Step 1 before finalizing
      });
    }, authContext);

    if (!isDefined(product)) {
      throw new Error(`Product ${productId} not found`); // or the established CommonQueryRunnerException pattern — check whether "product not found" already has a codebase convention (e.g. NotFoundException) before inventing a new error shape
    }

    if (!isDefined(product.costTemplate)) {
      const unitPrice = manualUnitPrice ?? 0;
      return { unitPrice, totalPrice: computeTotalPrice({ unitPrice, quantity, discountPercent }) };
    }

    const calculationResult = this.costTemplateCalculationService.calculate({
      fields: product.costTemplate.fields.map(toCalculationFieldInput),
      steps: product.costTemplate.steps.map(toCalculationStepInput),
      fieldValues: fieldValues ?? {},
    });

    if (!calculationResult.success) {
      return { errors: calculationResult.errors.map((error) => error.message) };
    }

    const unitPrice = calculationResult.value;

    return { unitPrice, totalPrice: computeTotalPrice({ unitPrice, quantity, discountPercent }) };
  }
}
```

Write `computeTotalPrice` as a small pure helper (either inline or in a `utils/` sibling): `unitPrice * quantity * (1 - (discountPercent ?? 0) / 100)`, matching the spec's formula exactly. Write `toCalculationFieldInput`/`toCalculationStepInput` as small mapping functions from the workspace-entity shapes to `CostTemplateCalculationFieldInput`/`CostTemplateCalculationStepInput` (field name, type, isRequired / variableName, formula, isOutput — check the exact property names against `CostTemplateFieldWorkspaceEntity`/`CostTemplateStepWorkspaceEntity`, already-committed Phase 1 files).

- [ ] **Step 5: Run the tests to see them pass**

- [ ] **Step 6: Create the four pre-query hooks**

Create `quote-line-create-one.pre-query.hook.ts` (hook name `'quoteLine.createOne'`), `quote-line-update-one.pre-query.hook.ts` (`'quoteLine.updateOne'`), and their `-many` siblings, following this module's established two-tier pattern from Phase 1's fix wave (One + Many variants sharing logic via the service, not duplicating it — see `cost-template-field-create-one.pre-query.hook.ts`/`cost-template-field-update-one.pre-query.hook.ts` and their `-many` siblings as the structural precedent, already-committed).

Each hook:
1. For create: reads `payload.data.product`/`fieldValues`/`quantity`/`discountPercent`/`unitPrice` directly from the payload (all required fields for a create — `product` and `quantity` have spec-mandated defaults/requiredness, confirm what's actually required at the GraphQL input level vs. what has a metadata `defaultValue` before assuming every field is always present in a create payload).
2. For update: fetches the existing record and computes the "effective" post-update state for `productId`/`fieldValues`/`quantity`/`discountPercent`/`unitPrice` (payload value `?? ` existing value) — following `resolveEffectiveFieldState`/`resolveEffectiveStepState`'s exact established pattern from `cost-template-validation.service.ts` (Phase 1's fix wave specifically corrected this once already — reuse that lesson, don't reinvent a narrower "only fetch when field X is missing" conditional that Phase 1 already proved buggy).
3. Calls `QuoteLinePricingService.computePricing()` with the effective state.
4. On `{ unitPrice, totalPrice }`: sets both onto `payload.data` (`payload.data.unitPrice = unitPrice; payload.data.totalPrice = totalPrice;`) and returns the payload.
5. On `{ errors }`: throws `CommonQueryRunnerException` with `CommonQueryRunnerExceptionCode.INVALID_QUERY_INPUT`, `userFriendlyMessage: msg\`...\`` joining the error messages — following `cost-template-validation.service.ts`'s exact exception-throwing shape.

The `-many` variants loop over the payload array, computing each record's pricing independently (no intra-batch collision concern here, unlike Phase 1's `costTemplateField`/`costTemplateStep` batch hooks — `QuoteLine` pricing has no uniqueness constraint between sibling lines) and collecting per-record errors if any fail, throwing one exception naming every failing record's index if any do (fail the whole batch, matching this codebase's general batch-validation convention — confirm against `cost-template-field-create-many.pre-query.hook.ts`'s actual behavior on a partial-batch failure, already-committed Phase 1 code, rather than assuming).

- [ ] **Step 7: Write the four hook spec files**

Mirror `cost-template-field-create-one.pre-query.hook.spec.ts`'s style (mock `QuoteLinePricingService` directly — these hook tests don't need to re-verify the pricing math, that's Step 2's job; they verify the hook correctly reads the payload, calls the service, and either sets `payload.data` fields or throws).

- [ ] **Step 8: Register the module**

In `quote-query-hook.module.ts`, add `QuoteLinePricingService`, `CostTemplateCalculationService` (Phase 2's service — built but never registered into any NestJS module until now; without this, NestJS cannot resolve `QuoteLinePricingService`'s constructor dependency), and the 4 new hooks to `providers`.

- [ ] **Step 9: Typecheck and lint**

- [ ] **Step 10: Commit**

```bash
git commit -m "feat: compute QuoteLine unitPrice/totalPrice via CostTemplateCalculationService"
```

---

## Task 4: Quote.totalAmount asynchronous rollup

**Files:**
- Modify: `packages/twenty-server/src/engine/core-modules/message-queue/message-queue.constants.ts` (add `quoteQueue = 'quote-queue'`)
- Modify: `packages/twenty-server/src/engine/core-modules/message-queue/message-queue-worker-config.constant.ts` (register `quoteQueue`, mirroring `workflowQueue`'s exact `{ priority: 2, workerOptions: { concurrency: 1, lockDuration: 30_000, maxStalledCount: 1, boundedShutdownDrain: false } }` shape — check the current file for the highest-used `priority` value and pick a sensible next one, or reuse `2` if priorities aren't meant to be unique, confirm which before finalizing)
- Create: `packages/twenty-server/src/modules/quote/quote-total-amount-rollup/listeners/quote-line-total-amount-rollup.listener.ts`
- Create: `packages/twenty-server/src/modules/quote/quote-total-amount-rollup/jobs/quote-total-amount-rollup.job.ts`
- Test: `packages/twenty-server/src/modules/quote/quote-total-amount-rollup/jobs/__tests__/quote-total-amount-rollup.job.spec.ts`
- Create: `packages/twenty-server/src/modules/quote/quote-total-amount-rollup/quote-total-amount-rollup.module.ts`
- Create: `packages/twenty-server/src/modules/quote/quote.module.ts` (a new top-level feature module for the `quote` package, importing `QuoteTotalAmountRollupModule` — this module doesn't exist yet; Phase 1/2's `QuoteQueryHookModule` was registered directly into `workspace-query-hook.module.ts` without a top-level aggregator, but this task's listener/job needs registering into BOTH the main app and the worker process per `WorkflowModule`'s precedent, which needs its own top-level module — see Step 6)
- Modify: `packages/twenty-server/src/modules/modules.module.ts` (register `QuoteModule`)
- Modify: `packages/twenty-server/src/engine/core-modules/message-queue/jobs.module.ts` (register `QuoteModule`)

**Interfaces:**
- Consumes: `WorkspaceOrmManager`/`buildSystemAuthContext` (established pattern); `QuoteLineWorkspaceEntity` (Task 2); `MessageQueueService`/`@InjectMessageQueue`/`@OnDatabaseBatchEvent`/`@Processor`/`@Process` (existing engine infrastructure, verify exact import paths against `workflow-version-status.listener.ts`/`workflow-statuses-update.job.ts`, already-existing files in this codebase).
- Produces: nothing further downstream consumes this task's output — it's the terminal piece of Phase 3's data flow (QuoteLine write → listener → job → `Quote.totalAmount` persisted).

- [ ] **Step 1: Read the real precedent files in full**

Read `packages/twenty-server/src/modules/workflow/workflow-status/listeners/workflow-version-status.listener.ts`, `packages/twenty-server/src/modules/workflow/workflow-status/jobs/workflow-statuses-update.job.ts`, and `packages/twenty-server/src/modules/workflow/workflow-status/workflow-status.module.ts` in full — these are your structural templates for every file in this task. Also read `packages/twenty-server/src/modules/workflow/workflow.module.ts` to see how `WorkflowStatusModule` gets imported into a top-level feature module, and confirm the exact registration lines for `WorkflowModule` in both `packages/twenty-server/src/modules/modules.module.ts` and `packages/twenty-server/src/engine/core-modules/message-queue/jobs.module.ts` (both files already reference `WorkflowModule` — mirror those exact import/registration lines for the new `QuoteModule`).

- [ ] **Step 2: Add the `quoteQueue` message queue**

In `message-queue.constants.ts`, add `quoteQueue = 'quote-queue',` to the `MessageQueue` enum (alphabetically or wherever the file's existing convention places new entries — check).

In `message-queue-worker-config.constant.ts`, add an entry for `MessageQueue.quoteQueue` mirroring `MessageQueue.workflowQueue`'s exact worker options.

- [ ] **Step 3: Write the failing test for the rollup job**

Create `quote-total-amount-rollup.job.spec.ts`, mocking `WorkspaceOrmManager` the same way `cost-template-validation.service.spec.ts` does. Cover:

```ts
describe('QuoteTotalAmountRollupJob', () => {
  it('sums sibling quoteLine.totalPrice and updates the parent quote.totalAmount', async () => {
    // quoteLineRepository.find (or count/sum, depending on the real query shape you choose)
    // returns 2 lines with totalPrice 50 and 75 for quoteId X
    // → quoteRepository.update is called with { id: X }, { totalAmount: 125 }
  });

  it('sets totalAmount to 0 when the quote has no lines left (e.g. after the last line is deleted)', async () => {
    // empty result → totalAmount: 0, not null and not skipped
  });

  it('handles multiple quoteIds in one batch event', async () => {
    // the job receives more than one affected quoteId (e.g. a reparenting update touched
    // both the old and new quote) and recomputes each independently
  });
});
```

Verify the actual aggregation approach (fetch-all-and-sum-in-JS vs. a TypeORM query-builder `SUM()`) against whatever this codebase's repository API most naturally supports — check whether `WorkspaceRepository` (from `getRepository<T>(...)`) exposes a query-builder or aggregate method, or whether fetch-all-and-sum in application code (simplest, matches this module's existing style of doing everything through plain repository calls) is the established pattern; do not assume a SQL-level `SUM()` is available without checking.

- [ ] **Step 4: Run the test to see it fail**

- [ ] **Step 5: Implement the job**

Create `quote-total-amount-rollup.job.ts`, mirroring `workflow-statuses-update.job.ts`'s `@Processor`/`@Process` shape and its `executeInWorkspaceContext`/`buildSystemAuthContext` usage exactly. The job receives a batch event payload naming one or more affected `quoteId`s (see Step 6 for exactly what the listener sends), and for each: fetches all non-deleted sibling `QuoteLine`s for that `quoteId`, sums `totalPrice`, and `.update()`s the `quote` repository's `totalAmount`.

- [ ] **Step 6: Implement the listener**

Create `quote-line-total-amount-rollup.listener.ts`, mirroring `workflow-version-status.listener.ts`'s `@OnDatabaseBatchEvent` shape. Three handlers:

1. `@OnDatabaseBatchEvent('quoteLine', DatabaseEventAction.CREATED)` — collect `event.properties.after.quoteId` from every event in the batch, dedupe, enqueue the job with those `quoteId`s.
2. `@OnDatabaseBatchEvent('quoteLine', DatabaseEventAction.UPDATED)` — an `ObjectRecordUpdateEvent` carries `.properties.before`/`.properties.after`/`.properties.updatedFields`. Only enqueue for events where `updatedFields` actually includes `'totalPrice'` or `'quoteId'` (a reparent) — for a reparent, enqueue BOTH `before.quoteId` and `after.quoteId` (both the old and new parent need their totals recomputed). Verify the exact property names on `ObjectRecordUpdateEvent<QuoteLineWorkspaceEntity>` by reading `packages/twenty-shared/src/database-events/object-record-update.event.ts` yourself (already confirmed during planning: `{ updatedFields: string[]; diff: ...; before: T; after: T }`) rather than re-deriving it.
3. `@OnDatabaseBatchEvent('quoteLine', DatabaseEventAction.DELETED)` — collect `event.properties.before.quoteId` from every event, dedupe, enqueue.

All three enqueue via `@InjectMessageQueue(MessageQueue.quoteQueue)` + `messageQueueService.add<...>(QuoteTotalAmountRollupJob.name, { workspaceId, quoteIds })`.

- [ ] **Step 7: Run the test to see it pass**

- [ ] **Step 8: Create the module and register it**

Create `quote-total-amount-rollup.module.ts` (providers: the listener + job; imports: `WorkspaceEventEmitterModule`, mirroring `workflow-status.module.ts` — `MessageQueueModule` is `@Global()` so it does NOT need an explicit import, confirmed during planning).

Create `quote.module.ts` (imports: `QuoteTotalAmountRollupModule`; this is the first top-level module for the `quote` package — do not fold `QuoteQueryHookModule` into it, that stays registered directly into `workspace-query-hook.module.ts` as it already is, unless you find during implementation that NestJS module resolution requires otherwise, in which case treat that as a real finding to report, not silently work around).

Register `QuoteModule` in `packages/twenty-server/src/modules/modules.module.ts` and `packages/twenty-server/src/engine/core-modules/message-queue/jobs.module.ts`, mirroring `WorkflowModule`'s exact registration lines in both files.

- [ ] **Step 9: Typecheck and lint**

- [ ] **Step 10: Commit**

```bash
git commit -m "feat: roll up Quote.totalAmount from QuoteLine changes via async job"
```

---

## Task 5: Real-database verification

**Files:** none (verification only), matching Phase 1 Task 6's shape and its lesson: this environment's dev server is shared infrastructure (a systemd service serving a public tunnel) — do NOT run `npx nx start twenty-server` directly (it does `rimraf dist` and will collide with the running systemd service's `dist/front`, an incident that happened twice in Phase 1/2). Use `npx nx build twenty-server` only if you need a fresh `dist/`, and never touch the systemd service (`systemctl --user restart/stop twenty-server`) — that's the controller's responsibility, not this task's.

**Interfaces:** none.

- [ ] **Step 1: Confirm the standard-application build includes both new objects**

Run: `npx jest packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/__tests__/compute-quote-standard-metadata.spec.ts packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/__tests__/compute-quote-line-standard-metadata.spec.ts --config=packages/twenty-server/jest.config.mjs`
Expected: both PASS (re-confirms Tasks 1-2's own tests still pass together, after Task 2 modified Task 1's `quote.workspace-entity.ts`/field-metadata builder).

- [ ] **Step 2: Full quote-module test suite**

Run: `npx jest packages/twenty-server/src/modules/quote --config=packages/twenty-server/jest.config.mjs`
Expected: all PASS (Phase 1 + 2 + this plan's tests all together).

- [ ] **Step 3: Full package typecheck and lint**

Run: `cd packages/twenty-server && npx tsgo -p tsconfig.json --noEmit` — confirm zero NEW errors (grep for `quote|Quote` and manually eyeball each hit belongs to a pre-existing unrelated error, not this plan's files).
Run oxlint/oxfmt on every file this plan touched.

- [ ] **Step 4: Note the outcome**

If the real `database:reset`/GraphQL manual verification Phase 1's Task 6 attempted (and found blocked by a dev-environment routing quirk, not a code defect) is worth retrying now that more of the feature exists, that's the controller's call at execution time, not a required step here — the automated test suite is this plan's primary verification, matching Phase 2's approach (which shipped without a GraphQL smoke test and caught its real bugs — the CJS `require` crash and the `Infinity` exception — through code review instead, which worked).

---

## Known limitation surfaced during Task 3 (tracked, not a silent gap)

**`QuoteLine.updateMany` cannot express differentiated per-record pricing.** `UpdateManyResolverArgs.data` is a single object applied via one SQL `UPDATE` to every filtered record — there is no way for a pre-query hook to write a different `unitPrice`/`totalPrice` per matched line through the standard mutation mechanism. Task 3's `quote-line-update-many.pre-query.hook.ts` computes pricing for every matched record and only writes the uniform value when every matched record's computed price is IDENTICAL; otherwise it throws, telling the caller to update lines individually. This is the correct, data-safe choice given the constraint (never silently applies one line's price to a sibling line, never leaves a stale price with no signal), confirmed via independent review — but its practical consequence is that **the most common realistic CPQ bulk-edit action (a uniform discount-percent bump across QuoteLines on different products, which will almost always have different existing `unitPrice`s) will always be rejected** by `updateMany`.

**Follow-up needed, likely alongside or before Phase 6 (frontend bulk-edit UX):** either (a) a dedicated bulk-recompute mutation/mechanism that can write differentiated per-record prices (design TBD — a new resolver, a batched set of individual updates issued by the frontend instead of one `updateMany` call, or a new pre-query-hook-adjacent mechanism this codebase doesn't have yet), or (b) an explicit product decision that bulk price-affecting changes always go one-at-a-time and the frontend's bulk-edit UI is designed around that constraint from the start. Not resolved by this plan — flagging here so Phase 6 doesn't rediscover this from scratch.

**A second, worse, silent half of this same constraint:** the hook only recomputes pricing when `payload.filter?.id?.in` is a non-empty array (`quote-line-update-many.pre-query.hook.ts`, the `ids` guard near the top of `execute`) — the assumption being that this app's bulk edit UI always scopes `updateMany` with `id: { in: [...] }`. If a caller instead issues `QuoteLine.updateMany` with any other filter shape (e.g. `{ quote: { eq: someQuoteId } }`), `ids` is `undefined`, the guard returns `payload` completely unmodified, and the mutation proceeds with whatever `data` patch the caller supplied — with no pricing recompute, no error, and no signal to the caller. Unlike the identical-vs-different-prices case above (which fails loudly), this path silently lets `unitPrice`/`totalPrice` go stale (or be written directly if the caller included them in `data`) for every record matched by the filter. Same pre-existing pattern as `cost-template-field-update-many.pre-query.hook.ts` from Phase 1.

## Upgrade command for existing workspaces (deferred to a follow-up Task 6, same pattern as Phase 1's Task 7)

**Real, unlisted gap found by the final whole-branch review — not a silently-accepted deferral.** `Quote`/`QuoteLine` (and the reverse-relation fields added to `Opportunity`/`Company`/`Person`/`Product`/`Attachment`) only provision into brand-new workspaces (`synchronizeTwentyStandardApplicationOrThrow` runs exclusively at fresh workspace init). Existing workspaces get none of Phase 3 — and Phase 1's own `2-36/…-sync-quote-cpq-standard-objects.command.ts` cannot be reused for this, since it early-returns once `costTemplate` already exists (which it does, on any workspace that already ran Phase 1's backfill). A dedicated follow-up task, mirroring Phase 1's Task 7 process (dedicated implementer, dedicated task review, real-dev-DB dry-run verification) is required before this feature is usable on any pre-existing workspace. Sequenced as a follow-up task after this plan's fix wave, not bundled into it — the same reasoning Phase 1 used to keep its own upgrade command as a separate, fully-reviewed task rather than a quick fix-wave addition.

## Out of scope for this plan (deferred)

- **`Quote.proposalTemplate`** — Phase 4, once `ProposalTemplate` exists.
- **Dev seed data** for `Quote`/`QuoteLine` — same reasoning as Phase 1's deferred dry-parse validation: no UI consumer yet to make seeded example quotes meaningful; revisit in Phase 6.
- **Any GraphQL-level / frontend validation UX** for the pricing-hook error messages (e.g. field-level error highlighting in a QuoteLine form) — Phase 6, "QuoteLine field-value form."
- **`Quote.totalAmount` recomputation on `Product`/`CostTemplate` changes** (e.g. if a CostTemplate's formula changes AFTER a QuoteLine was priced with it) — the spec's recalculation trigger is explicitly scoped to "whenever `fieldValues`, `quantity`, `product`, or `discountPercent` changes" on the QuoteLine itself, not upstream template edits; out of scope here, matching the spec's own literal scope.
