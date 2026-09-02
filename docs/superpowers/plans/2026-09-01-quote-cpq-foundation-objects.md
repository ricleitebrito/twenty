# Quote/CPQ Foundation Objects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four new standard objects to twenty-server — `CostTemplate`, `CostTemplateField`, `CostTemplateStep`, `Product` — that form the foundation of the Quote/CPQ feature (Phase 1 of the spec), plus write-time validation for a CostTemplate's Fields/Steps.

**Architecture:** Standard objects in Twenty are declared across two packages: `twenty-shared` holds deterministic/hardcoded universal identifiers (one const map per object/field/index), and `twenty-server`'s `twenty-standard-application` folder holds the actual "flat metadata" builder functions (field metadata, object metadata, views, view fields, view field groups, page layout, index metadata) that get assembled into every workspace at provisioning time. There is no code generator for this — every file below is hand-written, following the exact pattern of the most recently added standard object (`callRecording`) and the simplest existing one (`note`). Verification is a pure-function unit test (`computeTwentyStandardApplicationAllFlatEntityMaps`) that builds all standard metadata in memory, the same technique the codebase already uses for `compute-call-recording-standard-metadata.spec.ts`.

**Tech Stack:** NestJS, TypeScript, Twenty's "flat object/field metadata" workspace system, Jest.

**Spec:** `docs/superpowers/specs/2026-09-01-quote-cpq-design.md` (Data model section, objects: CostTemplate, CostTemplateField, CostTemplateStep, Product; this plan implements spec's "Implementation phases" step 1).

## Global Constraints

- New module path: `packages/twenty-server/src/modules/quote/standard-objects/`.
- Every label/description string uses `i18nLabel(msg({ message: ..., context: ... }))` — never a bare string — or it silently breaks lingui extraction (see spec's reference codebase convention; confirmed via `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/i18n-label.util.ts`).
- Never reuse or mutate a universal identifier once committed. All UUIDs used in this plan were freshly generated with `uuidgen` and checked against the codebase for collisions — use them exactly as given, do not invent new ones.
- Every new custom field name must not collide with the 8 system field names every standard object already has: `id`, `createdAt`, `updatedAt`, `deletedAt`, `createdBy`, `updatedBy`, `position`, `searchVector`. In particular: display/sort ordering uses the existing system `position` field — do not add a second custom "position"/"order" field.
- After editing any file under `packages/twenty-shared/src`, run `npx nx build twenty-shared --skip-nx-cache` before trusting any typecheck/test run in `twenty-server` (stale `dist` is a known gotcha in this repo).
- Run `npx tsgo -p tsconfig.json --noEmit` inside `packages/twenty-server` to typecheck (faster/more reliable than `nx typecheck` here per repo convention), and `npx nx lint:diff-with-main twenty-server --configuration=fix` before each commit.
- Relation field settings always need a matching pair: the `MANY_TO_ONE` side's `targetFieldName` must equal the reverse `ONE_TO_MANY` side's own field name, and vice versa (`targetObjectName`/`targetFieldName` cross-reference).

---

## Task 1: CostTemplate standard object

**Files:**
- Create: `packages/twenty-server/src/modules/quote/standard-objects/cost-template.workspace-entity.ts`
- Modify: `packages/twenty-shared/src/metadata/constants/standard-object-universal-identifiers.constant.ts`
- Modify: `packages/twenty-shared/src/metadata/constants/standard-object-fields.constant.ts`
- Modify: `packages/twenty-shared/src/metadata/constants/standard-object.constant.ts`
- Modify: `packages/twenty-shared/src/metadata/constants/standard-page-layout-universal-identifiers.constant.ts`
- Create: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/compute-cost-template-standard-flat-field-metadata.util.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/build-standard-flat-field-metadata-maps.util.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/object-metadata/create-standard-flat-object-metadata.util.ts`
- Create: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view/compute-standard-cost-template-views.util.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view/build-standard-flat-view-metadata-maps.util.ts`
- Create: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field/compute-standard-cost-template-view-fields.util.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field/build-standard-flat-view-field-metadata-maps.util.ts`
- Create: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/compute-standard-cost-template-view-field-groups.util.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/build-standard-flat-view-field-group-metadata-maps.util.ts`
- Create: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/page-layout-config/standard-cost-template-page-layout.config.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/page-layout-config/index.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/constants/standard-page-layout.constant.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/workspace-migration/constant/standard-object-icons.ts`
- Test: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/__tests__/compute-cost-template-standard-metadata.spec.ts`

**Interfaces:**
- Produces: object name `'costTemplate'` registered in `STANDARD_OBJECTS`, usable as a `targetObjectName` by later tasks; fields `name`, `description` (+ 8 system fields). Later tasks (2, 3, 4) will each add one more field to this object (`fields`, `steps`, `products` respectively) by editing the same files created here.

- [ ] **Step 1: Generate the object's universal identifier and add it**

Identifier already generated: `4b97224d-b4eb-4edf-9254-dc8530c453eb`.

In `packages/twenty-shared/src/metadata/constants/standard-object-universal-identifiers.constant.ts`, add a new line inside the `STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS` object (anywhere before the closing `} as const;`, e.g. right after the `messageThread:` line):

```ts
  costTemplate: '4b97224d-b4eb-4edf-9254-dc8530c453eb',
```

- [ ] **Step 2: Add the object's field identifiers**

In `packages/twenty-shared/src/metadata/constants/standard-object-fields.constant.ts`, add a new top-level entry (anywhere before the closing `} satisfies Record<string, Record<string, { universalIdentifier: string }>>;`):

```ts
  costTemplate: {
    ...buildStandardObjectSystemFields(
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.costTemplate,
    ),
    name: { universalIdentifier: '19a623a2-3bc7-4764-a047-ec7bb7bcc35c' },
    description: {
      universalIdentifier: '9839aa49-6688-47be-820b-2fa6d7c1aaf6',
    },
  },
```

- [ ] **Step 3: Declare the object's views in the shared constant**

In `packages/twenty-shared/src/metadata/constants/standard-object.constant.ts`, add a new top-level entry to `STANDARD_OBJECTS` (right before the closing `} as const satisfies Record<` line, i.e. immediately after the `workspaceMember: { ... },` entry):

```ts
  costTemplate: {
    universalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.costTemplate,
    fields: STANDARD_OBJECT_FIELDS.costTemplate,
    indexes: {},
    views: {
      allCostTemplates: buildStandardObjectIndexView({
        objectUniversalIdentifier:
          STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.costTemplate,
        fields: STANDARD_OBJECT_FIELDS.costTemplate,
        viewFieldNames: ['name', 'description', 'createdAt'],
      }),
      costTemplateRecordPageFields: buildStandardObjectRecordPageFieldsView({
        objectUniversalIdentifier:
          STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.costTemplate,
        fields: STANDARD_OBJECT_FIELDS.costTemplate,
        viewFieldNames: [
          'name',
          'description',
          'createdAt',
          'createdBy',
          'updatedAt',
          'updatedBy',
        ],
        viewFieldGroupNames: {
          general: 'General',
          system: 'System',
        },
      }),
    },
  },
```

- [ ] **Step 4: Declare the object's record-page layout identifiers**

In `packages/twenty-shared/src/metadata/constants/standard-page-layout-universal-identifiers.constant.ts`, add a new entry to `STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS` (anywhere in the object, e.g. right after `noteRecordPage: buildStandardObjectRecordPageLayout({...}),`):

```ts
  costTemplateRecordPage: buildStandardObjectRecordPageLayout({
    objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.costTemplate,
    tabs: {
      home: {
        title: 'Home',
        widgets: {
          fields: 'Fields',
        },
      },
    },
  }),
```

These sub-identifiers (tab, widget) are deterministically derived from the object identifier and the titles above — no manual UUID needed.

- [ ] **Step 5: Build twenty-shared**

Run: `npx nx build twenty-shared --skip-nx-cache`
Expected: build succeeds. If TypeScript complains about `STANDARD_OBJECT_FIELDS.costTemplate` shape, double check Steps 1-2 were inserted correctly (the object literal must satisfy `Record<string, Record<string, { universalIdentifier: string }>>`).

- [ ] **Step 6: Create the workspace-entity file**

Create `packages/twenty-server/src/modules/quote/standard-objects/cost-template.workspace-entity.ts`:

```ts
import { type ActorMetadata } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';

export class CostTemplateWorkspaceEntity extends BaseWorkspaceEntity {
  name: string | null;
  description: string | null;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  searchVector: string;
}
```

- [ ] **Step 7: Create the field-metadata builder**

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/compute-cost-template-standard-flat-field-metadata.util.ts`:

```ts
import { msg } from '@lingui/core/macro';
import { DateDisplayFormat, FieldMetadataType } from 'twenty-shared/types';

import { i18nLabel } from 'src/engine/workspace-manager/twenty-standard-application/utils/i18n-label.util';

import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type AllStandardObjectFieldName } from 'src/engine/workspace-manager/twenty-standard-application/types/all-standard-object-field-name.type';
import {
  type CreateStandardFieldArgs,
  createStandardFieldFlatMetadata,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/create-standard-field-flat-metadata.util';

export const buildCostTemplateStandardFlatFieldMetadatas = ({
  now,
  objectName,
  workspaceId,
  standardObjectMetadataRelatedEntityIds,
  dependencyFlatEntityMaps,
  twentyStandardApplicationId,
}: Omit<
  CreateStandardFieldArgs<'costTemplate', FieldMetadataType>,
  'context'
>): Record<AllStandardObjectFieldName<'costTemplate'>, FlatFieldMetadata> => ({
  id: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'id',
      type: FieldMetadataType.UUID,
      label: i18nLabel(msg({ message: `Id`, context: 'fieldMetadata.label' })),
      description: i18nLabel(
        msg({ message: `Id`, context: 'fieldMetadata.description' }),
      ),
      icon: 'Icon123',
      isSystem: true,
      isNullable: false,
      isUIEditable: false,
      defaultValue: 'uuid',
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  createdAt: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'createdAt',
      type: FieldMetadataType.DATE_TIME,
      label: i18nLabel(
        msg({ message: `Creation date`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({ message: `Creation date`, context: 'fieldMetadata.description' }),
      ),
      icon: 'IconCalendar',
      isSystem: true,
      isNullable: false,
      isUIEditable: false,
      defaultValue: 'now',
      settings: { displayFormat: DateDisplayFormat.RELATIVE },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  updatedAt: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'updatedAt',
      type: FieldMetadataType.DATE_TIME,
      label: i18nLabel(
        msg({ message: `Last update`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Last time the record was changed`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconCalendarClock',
      isSystem: true,
      isNullable: false,
      isUIEditable: false,
      defaultValue: 'now',
      settings: { displayFormat: DateDisplayFormat.RELATIVE },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  deletedAt: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'deletedAt',
      type: FieldMetadataType.DATE_TIME,
      label: i18nLabel(
        msg({ message: `Deleted at`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Date when the record was deleted`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconCalendarMinus',
      isSystem: true,
      isNullable: true,
      isUIEditable: false,
      settings: { displayFormat: DateDisplayFormat.RELATIVE },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  position: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'position',
      type: FieldMetadataType.POSITION,
      label: i18nLabel(
        msg({ message: `Position`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Cost template record position`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconHierarchy2',
      isSystem: true,
      isNullable: false,
      defaultValue: 0,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  createdBy: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'createdBy',
      type: FieldMetadataType.ACTOR,
      label: i18nLabel(
        msg({ message: `Created by`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The creator of the record`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconCreativeCommonsSa',
      isSystem: true,
      isUIEditable: false,
      isNullable: false,
      defaultValue: {
        source: "'MANUAL'",
        name: "'System'",
        workspaceMemberId: null,
      },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  updatedBy: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'updatedBy',
      type: FieldMetadataType.ACTOR,
      label: i18nLabel(
        msg({ message: `Updated by`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The workspace member who last updated the record`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconUserCircle',
      isSystem: true,
      isUIEditable: false,
      isNullable: false,
      defaultValue: {
        source: "'MANUAL'",
        name: "'System'",
        workspaceMemberId: null,
      },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  searchVector: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'searchVector',
      type: FieldMetadataType.TS_VECTOR,
      label: i18nLabel(
        msg({ message: `Search vector`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Field used for full-text search`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconCalculator',
      isSystem: true,
      isNullable: true,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  name: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'name',
      type: FieldMetadataType.TEXT,
      label: i18nLabel(msg({ message: `Name`, context: 'fieldMetadata.label' })),
      description: i18nLabel(
        msg({
          message: `The cost template name`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconTag',
      isNullable: true,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  description: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'description',
      type: FieldMetadataType.TEXT,
      label: i18nLabel(
        msg({ message: `Description`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The cost template description`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconFileDescription',
      isNullable: true,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
});
```

- [ ] **Step 8: Register the field-metadata builder**

In `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/build-standard-flat-field-metadata-maps.util.ts`:

Add the import (alphabetically near the other `build...StandardFlatFieldMetadatas` imports):
```ts
import { buildCostTemplateStandardFlatFieldMetadatas } from 'src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/compute-cost-template-standard-flat-field-metadata.util';
```

Add the map entry inside `STANDARD_FLAT_FIELD_METADATA_BUILDERS_BY_OBJECT_NAME`:
```ts
  costTemplate: buildCostTemplateStandardFlatFieldMetadatas,
```

- [ ] **Step 9: Register the object-metadata builder**

In `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/object-metadata/create-standard-flat-object-metadata.util.ts`, add a new entry to `STANDARD_FLAT_OBJECT_METADATA_BUILDERS_BY_OBJECT_NAME` (anywhere in the object, e.g. right after the `note: (...) => ...,` entry):

```ts
  costTemplate: ({
    now,
    workspaceId,
    standardObjectMetadataRelatedEntityIds,
    twentyStandardApplicationId,
    dependencyFlatEntityMaps,
  }: Omit<
    CreateStandardObjectArgs<'costTemplate'>,
    'context' | 'objectName'
  >) =>
    createStandardObjectFlatMetadata({
      objectName: 'costTemplate',
      dependencyFlatEntityMaps,
      context: {
        universalIdentifier: STANDARD_OBJECTS.costTemplate.universalIdentifier,
        nameSingular: 'costTemplate',
        namePlural: 'costTemplates',
        labelSingular: i18nLabel(
          msg({
            message: `Cost Template`,
            context: 'objectMetadata.labelSingular',
          }),
        ),
        labelPlural: i18nLabel(
          msg({
            message: `Cost Templates`,
            context: 'objectMetadata.labelPlural',
          }),
        ),
        description: i18nLabel(
          msg({
            message: `A reusable pricing formula template made of input fields and calculation steps`,
            context: 'objectMetadata.description',
          }),
        ),
        icon: 'IconCalculator',
        isSearchable: true,
        labelIdentifierFieldMetadataName: 'name',
      },
      workspaceId,
      standardObjectMetadataRelatedEntityIds,
      twentyStandardApplicationId,
      now,
    }),
```

- [ ] **Step 10: Create the views builder**

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view/compute-standard-cost-template-views.util.ts`:

```ts
import { ViewKey, ViewType } from 'twenty-shared/types';

import { INDEX_VIEW_NAME } from 'src/engine/metadata-modules/view/constants/index-view-name.constant';
import { type FlatView } from 'src/engine/metadata-modules/flat-view/types/flat-view.type';
import {
  createStandardViewFlatMetadata,
  type CreateStandardViewArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view/create-standard-view-flat-metadata.util';

export const computeStandardCostTemplateViews = (
  args: Omit<CreateStandardViewArgs<'costTemplate'>, 'context'>,
): Record<string, FlatView> => {
  return {
    allCostTemplates: createStandardViewFlatMetadata({
      ...args,
      objectName: 'costTemplate',
      context: {
        viewName: 'allCostTemplates',
        name: INDEX_VIEW_NAME,
        type: ViewType.TABLE,
        key: ViewKey.INDEX,
        position: 0,
        icon: 'IconCalculator',
      },
    }),
    costTemplateRecordPageFields: createStandardViewFlatMetadata({
      ...args,
      objectName: 'costTemplate',
      context: {
        viewName: 'costTemplateRecordPageFields',
        name: 'Cost Template Record Page Fields',
        type: ViewType.FIELDS_WIDGET,
        key: null,
        position: 0,
        icon: 'IconList',
      },
    }),
  };
};
```

- [ ] **Step 11: Register the views builder**

In `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view/build-standard-flat-view-metadata-maps.util.ts`, add the import and the map entry, following the exact pattern of the `note` entry in that file:
```ts
import { computeStandardCostTemplateViews } from 'src/engine/workspace-manager/twenty-standard-application/utils/view/compute-standard-cost-template-views.util';
```
```ts
  costTemplate: computeStandardCostTemplateViews,
```

- [ ] **Step 12: Create the view-fields builder**

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field/compute-standard-cost-template-view-fields.util.ts`:

```ts
import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import {
  createStandardViewFieldFlatMetadata,
  type CreateStandardViewFieldArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field/create-standard-view-field-flat-metadata.util';

export const computeStandardCostTemplateViewFields = (
  args: Omit<CreateStandardViewFieldArgs<'costTemplate'>, 'context'>,
): Record<string, FlatViewField> => {
  return {
    allCostTemplatesName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplate',
      context: {
        viewName: 'allCostTemplates',
        viewFieldName: 'name',
        fieldName: 'name',
        position: 0,
        isVisible: true,
        size: 210,
      },
    }),
    allCostTemplatesDescription: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplate',
      context: {
        viewName: 'allCostTemplates',
        viewFieldName: 'description',
        fieldName: 'description',
        position: 1,
        isVisible: true,
        size: 210,
      },
    }),
    allCostTemplatesCreatedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplate',
      context: {
        viewName: 'allCostTemplates',
        viewFieldName: 'createdAt',
        fieldName: 'createdAt',
        position: 2,
        isVisible: true,
        size: 150,
      },
    }),

    // costTemplateRecordPageFields view fields
    // General group
    costTemplateRecordPageFieldsDescription: createStandardViewFieldFlatMetadata(
      {
        ...args,
        objectName: 'costTemplate',
        context: {
          viewName: 'costTemplateRecordPageFields',
          viewFieldName: 'description',
          fieldName: 'description',
          position: 0,
          isVisible: true,
          size: 150,
          viewFieldGroupName: 'general',
        },
      },
    ),
    // System group
    costTemplateRecordPageFieldsCreatedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplate',
      context: {
        viewName: 'costTemplateRecordPageFields',
        viewFieldName: 'createdAt',
        fieldName: 'createdAt',
        position: 0,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'system',
      },
    }),
    costTemplateRecordPageFieldsCreatedBy: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplate',
      context: {
        viewName: 'costTemplateRecordPageFields',
        viewFieldName: 'createdBy',
        fieldName: 'createdBy',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'system',
      },
    }),
    costTemplateRecordPageFieldsUpdatedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplate',
      context: {
        viewName: 'costTemplateRecordPageFields',
        viewFieldName: 'updatedAt',
        fieldName: 'updatedAt',
        position: 2,
        isVisible: false,
        size: 150,
        viewFieldGroupName: 'system',
      },
    }),
    costTemplateRecordPageFieldsUpdatedBy: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplate',
      context: {
        viewName: 'costTemplateRecordPageFields',
        viewFieldName: 'updatedBy',
        fieldName: 'updatedBy',
        position: 3,
        isVisible: false,
        size: 150,
        viewFieldGroupName: 'system',
      },
    }),
  };
};
```

- [ ] **Step 13: Register the view-fields builder**

In `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field/build-standard-flat-view-field-metadata-maps.util.ts`, add the import and map entry (same pattern as Step 11):
```ts
import { computeStandardCostTemplateViewFields } from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field/compute-standard-cost-template-view-fields.util';
```
```ts
  costTemplate: computeStandardCostTemplateViewFields,
```

- [ ] **Step 14: Create the view-field-groups builder**

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/compute-standard-cost-template-view-field-groups.util.ts`:

```ts
import { msg } from '@lingui/core/macro';

import { i18nLabel } from 'src/engine/workspace-manager/twenty-standard-application/utils/i18n-label.util';
import { type FlatViewFieldGroup } from 'src/engine/metadata-modules/flat-view-field-group/types/flat-view-field-group.type';
import {
  createStandardViewFieldGroupFlatMetadata,
  type CreateStandardViewFieldGroupArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/create-standard-view-field-group-flat-metadata.util';

export const computeStandardCostTemplateViewFieldGroups = (
  args: Omit<CreateStandardViewFieldGroupArgs<'costTemplate'>, 'context'>,
): Record<string, FlatViewFieldGroup> => {
  return {
    costTemplateRecordPageFieldsGeneral: createStandardViewFieldGroupFlatMetadata(
      {
        ...args,
        objectName: 'costTemplate',
        context: {
          viewName: 'costTemplateRecordPageFields',
          viewFieldGroupName: 'general',
          name: i18nLabel(
            msg({ message: `General`, context: 'viewFieldGroup.name' }),
          ),
          position: 0,
          isVisible: true,
        },
      },
    ),
    costTemplateRecordPageFieldsSystem: createStandardViewFieldGroupFlatMetadata(
      {
        ...args,
        objectName: 'costTemplate',
        context: {
          viewName: 'costTemplateRecordPageFields',
          viewFieldGroupName: 'system',
          name: i18nLabel(
            msg({ message: `System`, context: 'viewFieldGroup.name' }),
          ),
          position: 1,
          isVisible: true,
        },
      },
    ),
  };
};
```

- [ ] **Step 15: Register the view-field-groups builder**

In `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/build-standard-flat-view-field-group-metadata-maps.util.ts`, add the import and map entry:
```ts
import { computeStandardCostTemplateViewFieldGroups } from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/compute-standard-cost-template-view-field-groups.util';
```
```ts
  costTemplate: computeStandardCostTemplateViewFieldGroups,
```

- [ ] **Step 16: Create the page-layout config**

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/page-layout-config/standard-cost-template-page-layout.config.ts`:

```ts
import {
  STANDARD_OBJECTS,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-shared/metadata';
import { PageLayoutType } from 'twenty-shared/types';

import {
  TAB_PROPS,
  WIDGET_PROPS,
} from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-page-layout-tabs.template';
import {
  type StandardPageLayoutConfig,
  type StandardPageLayoutTabConfig,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/page-layout-config/standard-page-layout-config.type';

const COST_TEMPLATE_PAGE_TABS = {
  home: {
    universalIdentifier:
      STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.costTemplateRecordPage.tabs
        .home.universalIdentifier,
    ...TAB_PROPS.home,
    widgets: {
      fields: {
        universalIdentifier:
          STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.costTemplateRecordPage
            .tabs.home.widgets.fields.universalIdentifier,
        ...WIDGET_PROPS.fields,
      },
    },
  },
} as const satisfies Record<string, StandardPageLayoutTabConfig>;

export const STANDARD_COST_TEMPLATE_PAGE_LAYOUT_CONFIG = {
  name: 'Default Cost Template Layout',
  type: PageLayoutType.RECORD_PAGE,
  objectUniversalIdentifier: STANDARD_OBJECTS.costTemplate.universalIdentifier,
  universalIdentifier:
    STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.costTemplateRecordPage
      .universalIdentifier,
  defaultTabUniversalIdentifier: null,
  tabs: COST_TEMPLATE_PAGE_TABS,
} as const satisfies StandardPageLayoutConfig;
```

- [ ] **Step 17: Export and register the page-layout config**

In `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/page-layout-config/index.ts`, add:
```ts
export { STANDARD_COST_TEMPLATE_PAGE_LAYOUT_CONFIG } from './standard-cost-template-page-layout.config';
```

In `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/constants/standard-page-layout.constant.ts`, add `STANDARD_COST_TEMPLATE_PAGE_LAYOUT_CONFIG` to the import block (alphabetically) and add to `STANDARD_PAGE_LAYOUTS`:
```ts
  costTemplateRecordPage: STANDARD_COST_TEMPLATE_PAGE_LAYOUT_CONFIG,
```

- [ ] **Step 18: Register the object's icon**

In `packages/twenty-server/src/engine/workspace-manager/workspace-migration/constant/standard-object-icons.ts`, add to `STANDARD_OBJECT_ICONS`:
```ts
  costTemplate: 'IconCalculator',
```

- [ ] **Step 19: Write the metadata-build test**

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/__tests__/compute-cost-template-standard-metadata.spec.ts`:

```ts
import {
  STANDARD_OBJECTS,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-shared/metadata';
import { isDefined } from 'twenty-shared/utils';

import { WidgetConfigurationType } from 'src/engine/metadata-modules/page-layout-widget/enums/widget-configuration-type.type';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';

const WORKSPACE_ID = '20202020-1111-4111-8111-111111111111';
const TWENTY_STANDARD_APPLICATION_ID = '20202020-2222-4222-8222-222222222222';
const NOW = '2024-01-01T00:00:00.000Z';

describe('CostTemplate standard metadata build', () => {
  const { allFlatEntityMaps } =
    computeTwentyStandardApplicationAllFlatEntityMaps({
      now: NOW,
      workspaceId: WORKSPACE_ID,
      twentyStandardApplicationId: TWENTY_STANDARD_APPLICATION_ID,
    });

  it('builds the costTemplate object', () => {
    const { byUniversalIdentifier } = allFlatEntityMaps.flatObjectMetadataMaps;

    expect(
      byUniversalIdentifier[STANDARD_OBJECTS.costTemplate.universalIdentifier],
    ).toBeDefined();
  });

  it('is not marked as a system object (it is user-managed)', () => {
    const costTemplate =
      allFlatEntityMaps.flatObjectMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.costTemplate.universalIdentifier
      ];

    expect(costTemplate?.isSystem).toBe(false);
  });

  it('has a name and description field', () => {
    const nameField =
      allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.costTemplate.fields.name.universalIdentifier
      ];
    const descriptionField =
      allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.costTemplate.fields.description.universalIdentifier
      ];

    expect(nameField).toBeDefined();
    expect(descriptionField).toBeDefined();
  });

  it('keeps the costTemplate table view focused on name, description, createdAt', () => {
    const viewFieldFieldUniversalIdentifiers = Object.values(
      allFlatEntityMaps.flatViewFieldMaps.byUniversalIdentifier,
    )
      .filter(isDefined)
      .filter(
        (viewField) =>
          viewField.viewUniversalIdentifier ===
          STANDARD_OBJECTS.costTemplate.views.allCostTemplates
            .universalIdentifier,
      )
      .map((viewField) => viewField.fieldMetadataUniversalIdentifier);

    expect(viewFieldFieldUniversalIdentifiers).toHaveLength(3);
    expect(viewFieldFieldUniversalIdentifiers).toEqual(
      expect.arrayContaining([
        STANDARD_OBJECTS.costTemplate.fields.name.universalIdentifier,
        STANDARD_OBJECTS.costTemplate.fields.description.universalIdentifier,
        STANDARD_OBJECTS.costTemplate.fields.createdAt.universalIdentifier,
      ]),
    );
  });

  it('links the costTemplate fields widget to its record-page fields view', () => {
    const fieldsWidget =
      allFlatEntityMaps.flatPageLayoutWidgetMaps.byUniversalIdentifier[
        STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.costTemplateRecordPage.tabs
          .home.widgets.fields.universalIdentifier
      ];

    expect(fieldsWidget?.universalConfiguration).toMatchObject({
      configurationType: WidgetConfigurationType.FIELDS,
      viewUniversalIdentifier:
        STANDARD_OBJECTS.costTemplate.views.costTemplateRecordPageFields
          .universalIdentifier,
    });
  });
});
```

- [ ] **Step 20: Run the test**

Run: `npx jest packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/__tests__/compute-cost-template-standard-metadata.spec.ts --config=packages/twenty-server/jest.config.mjs`
Expected: all 5 tests PASS. If any fail with a `Cannot read properties of undefined` on `STANDARD_OBJECTS.costTemplate...`, re-check Steps 1-4 (twenty-shared) were built (Step 5) before running.

- [ ] **Step 21: Typecheck and lint**

Run: `npx tsgo -p packages/twenty-server/tsconfig.json --noEmit`
Run: `npx nx lint:diff-with-main twenty-server --configuration=fix`
Expected: both clean.

- [ ] **Step 22: Commit**

```bash
git add packages/twenty-shared/src/metadata/constants/standard-object-universal-identifiers.constant.ts \
        packages/twenty-shared/src/metadata/constants/standard-object-fields.constant.ts \
        packages/twenty-shared/src/metadata/constants/standard-object.constant.ts \
        packages/twenty-shared/src/metadata/constants/standard-page-layout-universal-identifiers.constant.ts \
        packages/twenty-server/src/modules/quote/standard-objects/cost-template.workspace-entity.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/compute-cost-template-standard-flat-field-metadata.util.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/build-standard-flat-field-metadata-maps.util.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/object-metadata/create-standard-flat-object-metadata.util.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view/compute-standard-cost-template-views.util.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view/build-standard-flat-view-metadata-maps.util.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field/compute-standard-cost-template-view-fields.util.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field/build-standard-flat-view-field-metadata-maps.util.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/compute-standard-cost-template-view-field-groups.util.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/build-standard-flat-view-field-group-metadata-maps.util.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/page-layout-config/standard-cost-template-page-layout.config.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/page-layout-config/index.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/constants/standard-page-layout.constant.ts \
        packages/twenty-server/src/engine/workspace-manager/workspace-migration/constant/standard-object-icons.ts \
        packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/__tests__/compute-cost-template-standard-metadata.spec.ts
git commit -m "feat: add CostTemplate standard object"
```

---

## Task 2: CostTemplateField standard object

**Files:**
- Create: `packages/twenty-server/src/modules/quote/standard-objects/cost-template-field.workspace-entity.ts`
- Modify: `packages/twenty-server/src/modules/quote/standard-objects/cost-template.workspace-entity.ts` (add `fields` reverse relation)
- Modify: `packages/twenty-shared/src/metadata/constants/standard-object-universal-identifiers.constant.ts`
- Modify: `packages/twenty-shared/src/metadata/constants/standard-object-fields.constant.ts` (add `costTemplateField` entry AND add `fields` to the existing `costTemplate` entry)
- Modify: `packages/twenty-shared/src/metadata/constants/standard-object.constant.ts` (add `costTemplateField` entry)
- Modify: `packages/twenty-shared/src/metadata/constants/standard-page-layout-universal-identifiers.constant.ts`
- Create: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/compute-cost-template-field-standard-flat-field-metadata.util.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/compute-cost-template-standard-flat-field-metadata.util.ts` (add `fields` relation field)
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/build-standard-flat-field-metadata-maps.util.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/object-metadata/create-standard-flat-object-metadata.util.ts`
- Create: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view/compute-standard-cost-template-field-views.util.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view/build-standard-flat-view-metadata-maps.util.ts`
- Create: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field/compute-standard-cost-template-field-view-fields.util.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field/build-standard-flat-view-field-metadata-maps.util.ts`
- Create: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/compute-standard-cost-template-field-view-field-groups.util.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/build-standard-flat-view-field-group-metadata-maps.util.ts`
- Create: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/index/compute-cost-template-field-standard-flat-index-metadata.util.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/index/build-standard-flat-index-metadata-maps.util.ts`
- Create: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/page-layout-config/standard-cost-template-field-page-layout.config.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/page-layout-config/index.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/constants/standard-page-layout.constant.ts`
- Modify: `packages/twenty-server/src/engine/workspace-manager/workspace-migration/constant/standard-object-icons.ts`
- Test: `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/__tests__/compute-cost-template-field-standard-metadata.spec.ts`

**Interfaces:**
- Consumes: object `'costTemplate'` (Task 1) as the relation target.
- Produces: object name `'costTemplateField'`; fields `costTemplate` (relation), `name`, `variableName`, `fieldType`, `picklistOptions`, `defaultValue`, `isRequired`. `CostTemplate` gains a `fields` reverse-relation field.

- [ ] **Step 1: Add universal identifiers**

In `standard-object-universal-identifiers.constant.ts`, add:
```ts
  costTemplateField: '505f9acd-2de3-4b81-b23e-a8b5cfaeb8d3',
```

- [ ] **Step 2: Add field identifiers, including the reverse relation on CostTemplate**

In `standard-object-fields.constant.ts`, add a new `costTemplateField` entry:
```ts
  costTemplateField: {
    ...buildStandardObjectSystemFields(
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.costTemplateField,
    ),
    costTemplate: {
      universalIdentifier: 'b6c62b3e-1ee7-4b9e-abd1-c6fac3f882f3',
    },
    name: { universalIdentifier: 'b22a5140-de53-4770-a46f-8d319e4d81dd' },
    variableName: {
      universalIdentifier: '278497f1-e8e7-48d2-bc85-7d2d2885813e',
    },
    fieldType: {
      universalIdentifier: 'a1e02c9b-1dfe-45da-acb6-6e760f7a1a86',
    },
    picklistOptions: {
      universalIdentifier: '79c5454d-1d20-4b41-bfa8-9c4d67df48c1',
    },
    defaultValue: {
      universalIdentifier: '2854d882-4e9c-4dd4-9c76-328692ddefdb',
    },
    isRequired: {
      universalIdentifier: 'a7430f0a-7b02-4f86-9e3f-c2df7862adbc',
    },
  },
```

Then edit the existing `costTemplate` entry (added in Task 1) to add the reverse relation field, right after `description`:
```ts
    fields: {
      universalIdentifier: '902e17c9-facb-4454-a4e2-33a019affe6e',
    },
```

- [ ] **Step 3: Add views + index declaration for costTemplateField, and extend costTemplate's record-page view**

In `standard-object.constant.ts`, add a new `costTemplateField` entry to `STANDARD_OBJECTS`:
```ts
  costTemplateField: {
    universalIdentifier:
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.costTemplateField,
    fields: STANDARD_OBJECT_FIELDS.costTemplateField,
    indexes: {
      costTemplateIdIndex: {
        universalIdentifier: 'f5624466-eccd-489c-9734-36df3adddf2b',
      },
    },
    views: {
      allCostTemplateFields: buildStandardObjectIndexView({
        objectUniversalIdentifier:
          STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.costTemplateField,
        fields: STANDARD_OBJECT_FIELDS.costTemplateField,
        viewFieldNames: ['name', 'variableName', 'fieldType', 'isRequired'],
      }),
      costTemplateFieldRecordPageFields: buildStandardObjectRecordPageFieldsView(
        {
          objectUniversalIdentifier:
            STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.costTemplateField,
          fields: STANDARD_OBJECT_FIELDS.costTemplateField,
          viewFieldNames: [
            'costTemplate',
            'name',
            'variableName',
            'fieldType',
            'picklistOptions',
            'defaultValue',
            'isRequired',
            'createdAt',
            'createdBy',
            'updatedAt',
            'updatedBy',
          ],
          viewFieldGroupNames: {
            general: 'General',
            system: 'System',
          },
        },
      ),
    },
  },
```

Then edit the existing `costTemplate` entry's `costTemplateRecordPageFields` view: add `'fields'` to the end of its `viewFieldNames` array (in the `general` group range, i.e. right after `'description'`):
```ts
        viewFieldNames: [
          'name',
          'description',
          'fields',
          'createdAt',
          'createdBy',
          'updatedAt',
          'updatedBy',
        ],
```

- [ ] **Step 4: Add page-layout identifiers for costTemplateField**

In `standard-page-layout-universal-identifiers.constant.ts`, add:
```ts
  costTemplateFieldRecordPage: buildStandardObjectRecordPageLayout({
    objectUniversalIdentifier:
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.costTemplateField,
    tabs: {
      home: {
        title: 'Home',
        widgets: {
          fields: 'Fields',
        },
      },
    },
  }),
```

- [ ] **Step 5: Build twenty-shared**

Run: `npx nx build twenty-shared --skip-nx-cache`
Expected: success.

- [ ] **Step 6: Create the workspace-entity file**

Create `packages/twenty-server/src/modules/quote/standard-objects/cost-template-field.workspace-entity.ts`:

```ts
import { type ActorMetadata } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';
import { type CostTemplateWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template.workspace-entity';

export type CostTemplateFieldType =
  | 'NUMBER'
  | 'CURRENCY'
  | 'PERCENTAGE'
  | 'BOOLEAN'
  | 'PICKLIST';

export class CostTemplateFieldWorkspaceEntity extends BaseWorkspaceEntity {
  costTemplate: EntityRelation<CostTemplateWorkspaceEntity> | null;
  costTemplateId: string | null;
  name: string | null;
  variableName: string | null;
  fieldType: CostTemplateFieldType;
  picklistOptions: Record<string, unknown> | null;
  defaultValue: string | null;
  isRequired: boolean;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  searchVector: string;
}
```

- [ ] **Step 7: Edit CostTemplate's workspace-entity to add the reverse relation**

In `packages/twenty-server/src/modules/quote/standard-objects/cost-template.workspace-entity.ts`, add the import and field:
```ts
import { type CostTemplateFieldWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template-field.workspace-entity';
```
```ts
  fields: EntityRelation<CostTemplateFieldWorkspaceEntity[]>;
```
(add `type EntityRelation` to the existing import from `src/engine/workspace-manager/workspace-migration/types/entity-relation.interface` — that import doesn't exist yet in this file, add it).

- [ ] **Step 8: Create the field-metadata builder for CostTemplateField**

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/compute-cost-template-field-standard-flat-field-metadata.util.ts`. Use the exact same 8-block system-fields structure as Task 1 Step 7 (fields `id`, `createdAt`, `updatedAt`, `deletedAt`, `position`, `createdBy`, `updatedBy`, `searchVector` — copy those 8 blocks verbatim, only changing the file's `objectName`/`AllStandardObjectFieldName<'costTemplateField'>` generic and the `searchVector` field's `icon` to `'IconForms'`), then add these custom fields:

```ts
  costTemplate: createStandardRelationFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      type: FieldMetadataType.RELATION,
      morphId: null,
      fieldName: 'costTemplate',
      label: i18nLabel(
        msg({ message: `Cost Template`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The cost template this field belongs to`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconCalculator',
      isNullable: false,
      isUIEditable: false,
      targetObjectName: 'costTemplate',
      targetFieldName: 'fields',
      settings: {
        relationType: RelationType.MANY_TO_ONE,
        onDelete: RelationOnDeleteAction.CASCADE,
        joinColumnName: 'costTemplateId',
      },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  name: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'name',
      type: FieldMetadataType.TEXT,
      label: i18nLabel(msg({ message: `Name`, context: 'fieldMetadata.label' })),
      description: i18nLabel(
        msg({
          message: `The field's display name`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconTag',
      isNullable: true,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  variableName: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'variableName',
      type: FieldMetadataType.TEXT,
      label: i18nLabel(
        msg({ message: `Variable Name`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The formula variable name used to reference this field's value in cost template steps. Must be unique within the cost template.`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconVariable',
      isNullable: false,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  fieldType: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'fieldType',
      type: FieldMetadataType.SELECT,
      label: i18nLabel(
        msg({ message: `Field Type`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The input type shown to the user filling in this field`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconList',
      isNullable: false,
      defaultValue: "'NUMBER'",
      options: [
        {
          id: '413dcdce-99bb-4b21-bc39-9df3038cd837',
          value: 'NUMBER',
          label: i18nLabel(
            msg({ message: `Number`, context: 'fieldMetadata.label' }),
          ),
          position: 0,
          color: 'sky',
        },
        {
          id: 'ec67285f-3e4f-4923-b818-9bc4bc3fbd4e',
          value: 'CURRENCY',
          label: i18nLabel(
            msg({ message: `Currency`, context: 'fieldMetadata.label' }),
          ),
          position: 1,
          color: 'green',
        },
        {
          id: 'd967416f-279d-4574-aeb2-964219e42471',
          value: 'PERCENTAGE',
          label: i18nLabel(
            msg({ message: `Percentage`, context: 'fieldMetadata.label' }),
          ),
          position: 2,
          color: 'orange',
        },
        {
          id: 'e3fe565e-4e78-4a9d-a074-69349169e7ae',
          value: 'BOOLEAN',
          label: i18nLabel(
            msg({ message: `Boolean`, context: 'fieldMetadata.label' }),
          ),
          position: 3,
          color: 'purple',
        },
        {
          id: 'c6fd441d-383c-418b-9fd9-76dcad92bb43',
          value: 'PICKLIST',
          label: i18nLabel(
            msg({ message: `Picklist`, context: 'fieldMetadata.label' }),
          ),
          position: 4,
          color: 'pink',
        },
      ],
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  picklistOptions: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'picklistOptions',
      type: FieldMetadataType.RAW_JSON,
      label: i18nLabel(
        msg({ message: `Picklist Options`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The list of { label, value } options, required when Field Type is Picklist`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconListDetails',
      isNullable: true,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  defaultValue: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'defaultValue',
      type: FieldMetadataType.TEXT,
      label: i18nLabel(
        msg({ message: `Default Value`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The value pre-filled when a quote line is created`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconPencil',
      isNullable: true,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  isRequired: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'isRequired',
      type: FieldMetadataType.BOOLEAN,
      label: i18nLabel(
        msg({ message: `Is Required`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Whether a quote line must provide this field before its price can be calculated`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconAsterisk',
      isNullable: false,
      defaultValue: true,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
```

The file's imports must include, in addition to the Task-1-style imports:
```ts
import { RelationOnDeleteAction, RelationType } from 'twenty-shared/types';

import { createStandardRelationFieldFlatMetadata } from 'src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/create-standard-relation-field-flat-metadata.util';
```

The function is named `buildCostTemplateFieldStandardFlatFieldMetadatas`, typed `Omit<CreateStandardFieldArgs<'costTemplateField', FieldMetadataType>, 'context'> => Record<AllStandardObjectFieldName<'costTemplateField'>, FlatFieldMetadata>`, mirroring Task 1 Step 7 exactly.

- [ ] **Step 9: Add the reverse `fields` relation to CostTemplate's field-metadata builder**

In `compute-cost-template-standard-flat-field-metadata.util.ts` (from Task 1), add the import:
```ts
import { RelationType } from 'twenty-shared/types';

import { createStandardRelationFieldFlatMetadata } from 'src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/create-standard-relation-field-flat-metadata.util';
```
And add a new field entry (after `description`):
```ts
  fields: createStandardRelationFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      type: FieldMetadataType.RELATION,
      morphId: null,
      fieldName: 'fields',
      isSystemSideEffect: true,
      label: i18nLabel(
        msg({ message: `Fields`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The input fields defined on this cost template`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconForms',
      isNullable: true,
      isUIEditable: false,
      targetObjectName: 'costTemplateField',
      targetFieldName: 'costTemplate',
      settings: { relationType: RelationType.ONE_TO_MANY },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
```
Also change the function's return type annotation from `Record<AllStandardObjectFieldName<'costTemplate'>, FlatFieldMetadata>` — no change needed there, `AllStandardObjectFieldName<'costTemplate'>` picks up the new `fields` key automatically once Step 2 of this task adds it to `STANDARD_OBJECT_FIELDS.costTemplate` in twenty-shared.

- [ ] **Step 10: Register the field-metadata builder**

In `build-standard-flat-field-metadata-maps.util.ts`, add:
```ts
import { buildCostTemplateFieldStandardFlatFieldMetadatas } from 'src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/compute-cost-template-field-standard-flat-field-metadata.util';
```
```ts
  costTemplateField: buildCostTemplateFieldStandardFlatFieldMetadatas,
```

- [ ] **Step 11: Register the object-metadata builder**

In `create-standard-flat-object-metadata.util.ts`, add (mirroring Task 1 Step 9's shape exactly, `objectName: 'costTemplateField'`, `nameSingular: 'costTemplateField'`, `namePlural: 'costTemplateFields'`, `labelSingular: 'Cost Template Field'`, `labelPlural: 'Cost Template Fields'`, `description: 'An input field on a cost template, filled in on each quote line'`, `icon: 'IconForms'`, no `isSearchable`, `labelIdentifierFieldMetadataName: 'name'`):

```ts
  costTemplateField: ({
    now,
    workspaceId,
    standardObjectMetadataRelatedEntityIds,
    twentyStandardApplicationId,
    dependencyFlatEntityMaps,
  }: Omit<
    CreateStandardObjectArgs<'costTemplateField'>,
    'context' | 'objectName'
  >) =>
    createStandardObjectFlatMetadata({
      objectName: 'costTemplateField',
      dependencyFlatEntityMaps,
      context: {
        universalIdentifier:
          STANDARD_OBJECTS.costTemplateField.universalIdentifier,
        nameSingular: 'costTemplateField',
        namePlural: 'costTemplateFields',
        labelSingular: i18nLabel(
          msg({
            message: `Cost Template Field`,
            context: 'objectMetadata.labelSingular',
          }),
        ),
        labelPlural: i18nLabel(
          msg({
            message: `Cost Template Fields`,
            context: 'objectMetadata.labelPlural',
          }),
        ),
        description: i18nLabel(
          msg({
            message: `An input field on a cost template, filled in on each quote line`,
            context: 'objectMetadata.description',
          }),
        ),
        icon: 'IconForms',
        labelIdentifierFieldMetadataName: 'name',
      },
      workspaceId,
      standardObjectMetadataRelatedEntityIds,
      twentyStandardApplicationId,
      now,
    }),
```

- [ ] **Step 12: Create views/view-fields/view-field-groups builders**

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view/compute-standard-cost-template-field-views.util.ts`:
```ts
import { ViewKey, ViewType } from 'twenty-shared/types';

import { INDEX_VIEW_NAME } from 'src/engine/metadata-modules/view/constants/index-view-name.constant';
import { type FlatView } from 'src/engine/metadata-modules/flat-view/types/flat-view.type';
import {
  createStandardViewFlatMetadata,
  type CreateStandardViewArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view/create-standard-view-flat-metadata.util';

export const computeStandardCostTemplateFieldViews = (
  args: Omit<CreateStandardViewArgs<'costTemplateField'>, 'context'>,
): Record<string, FlatView> => {
  return {
    allCostTemplateFields: createStandardViewFlatMetadata({
      ...args,
      objectName: 'costTemplateField',
      context: {
        viewName: 'allCostTemplateFields',
        name: INDEX_VIEW_NAME,
        type: ViewType.TABLE,
        key: ViewKey.INDEX,
        position: 0,
        icon: 'IconForms',
      },
    }),
    costTemplateFieldRecordPageFields: createStandardViewFlatMetadata({
      ...args,
      objectName: 'costTemplateField',
      context: {
        viewName: 'costTemplateFieldRecordPageFields',
        name: 'Cost Template Field Record Page Fields',
        type: ViewType.FIELDS_WIDGET,
        key: null,
        position: 0,
        icon: 'IconList',
      },
    }),
  };
};
```

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field/compute-standard-cost-template-field-view-fields.util.ts`:
```ts
import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import {
  createStandardViewFieldFlatMetadata,
  type CreateStandardViewFieldArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field/create-standard-view-field-flat-metadata.util';

export const computeStandardCostTemplateFieldViewFields = (
  args: Omit<CreateStandardViewFieldArgs<'costTemplateField'>, 'context'>,
): Record<string, FlatViewField> => {
  return {
    allCostTemplateFieldsName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplateField',
      context: {
        viewName: 'allCostTemplateFields',
        viewFieldName: 'name',
        fieldName: 'name',
        position: 0,
        isVisible: true,
        size: 210,
      },
    }),
    allCostTemplateFieldsVariableName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplateField',
      context: {
        viewName: 'allCostTemplateFields',
        viewFieldName: 'variableName',
        fieldName: 'variableName',
        position: 1,
        isVisible: true,
        size: 150,
      },
    }),
    allCostTemplateFieldsFieldType: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplateField',
      context: {
        viewName: 'allCostTemplateFields',
        viewFieldName: 'fieldType',
        fieldName: 'fieldType',
        position: 2,
        isVisible: true,
        size: 150,
      },
    }),
    allCostTemplateFieldsIsRequired: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplateField',
      context: {
        viewName: 'allCostTemplateFields',
        viewFieldName: 'isRequired',
        fieldName: 'isRequired',
        position: 3,
        isVisible: true,
        size: 100,
      },
    }),

    // costTemplateFieldRecordPageFields view fields
    // General group
    costTemplateFieldRecordPageFieldsCostTemplate: createStandardViewFieldFlatMetadata(
      {
        ...args,
        objectName: 'costTemplateField',
        context: {
          viewName: 'costTemplateFieldRecordPageFields',
          viewFieldName: 'costTemplate',
          fieldName: 'costTemplate',
          position: 0,
          isVisible: true,
          size: 150,
          viewFieldGroupName: 'general',
        },
      },
    ),
    costTemplateFieldRecordPageFieldsName: createStandardViewFieldFlatMetadata(
      {
        ...args,
        objectName: 'costTemplateField',
        context: {
          viewName: 'costTemplateFieldRecordPageFields',
          viewFieldName: 'name',
          fieldName: 'name',
          position: 1,
          isVisible: true,
          size: 150,
          viewFieldGroupName: 'general',
        },
      },
    ),
    costTemplateFieldRecordPageFieldsVariableName: createStandardViewFieldFlatMetadata(
      {
        ...args,
        objectName: 'costTemplateField',
        context: {
          viewName: 'costTemplateFieldRecordPageFields',
          viewFieldName: 'variableName',
          fieldName: 'variableName',
          position: 2,
          isVisible: true,
          size: 150,
          viewFieldGroupName: 'general',
        },
      },
    ),
    costTemplateFieldRecordPageFieldsFieldType: createStandardViewFieldFlatMetadata(
      {
        ...args,
        objectName: 'costTemplateField',
        context: {
          viewName: 'costTemplateFieldRecordPageFields',
          viewFieldName: 'fieldType',
          fieldName: 'fieldType',
          position: 3,
          isVisible: true,
          size: 150,
          viewFieldGroupName: 'general',
        },
      },
    ),
    costTemplateFieldRecordPageFieldsPicklistOptions: createStandardViewFieldFlatMetadata(
      {
        ...args,
        objectName: 'costTemplateField',
        context: {
          viewName: 'costTemplateFieldRecordPageFields',
          viewFieldName: 'picklistOptions',
          fieldName: 'picklistOptions',
          position: 4,
          isVisible: true,
          size: 200,
          viewFieldGroupName: 'general',
        },
      },
    ),
    costTemplateFieldRecordPageFieldsDefaultValue: createStandardViewFieldFlatMetadata(
      {
        ...args,
        objectName: 'costTemplateField',
        context: {
          viewName: 'costTemplateFieldRecordPageFields',
          viewFieldName: 'defaultValue',
          fieldName: 'defaultValue',
          position: 5,
          isVisible: true,
          size: 150,
          viewFieldGroupName: 'general',
        },
      },
    ),
    costTemplateFieldRecordPageFieldsIsRequired: createStandardViewFieldFlatMetadata(
      {
        ...args,
        objectName: 'costTemplateField',
        context: {
          viewName: 'costTemplateFieldRecordPageFields',
          viewFieldName: 'isRequired',
          fieldName: 'isRequired',
          position: 6,
          isVisible: true,
          size: 100,
          viewFieldGroupName: 'general',
        },
      },
    ),
    // System group
    costTemplateFieldRecordPageFieldsCreatedAt: createStandardViewFieldFlatMetadata(
      {
        ...args,
        objectName: 'costTemplateField',
        context: {
          viewName: 'costTemplateFieldRecordPageFields',
          viewFieldName: 'createdAt',
          fieldName: 'createdAt',
          position: 0,
          isVisible: true,
          size: 150,
          viewFieldGroupName: 'system',
        },
      },
    ),
    costTemplateFieldRecordPageFieldsCreatedBy: createStandardViewFieldFlatMetadata(
      {
        ...args,
        objectName: 'costTemplateField',
        context: {
          viewName: 'costTemplateFieldRecordPageFields',
          viewFieldName: 'createdBy',
          fieldName: 'createdBy',
          position: 1,
          isVisible: true,
          size: 150,
          viewFieldGroupName: 'system',
        },
      },
    ),
    costTemplateFieldRecordPageFieldsUpdatedAt: createStandardViewFieldFlatMetadata(
      {
        ...args,
        objectName: 'costTemplateField',
        context: {
          viewName: 'costTemplateFieldRecordPageFields',
          viewFieldName: 'updatedAt',
          fieldName: 'updatedAt',
          position: 2,
          isVisible: false,
          size: 150,
          viewFieldGroupName: 'system',
        },
      },
    ),
    costTemplateFieldRecordPageFieldsUpdatedBy: createStandardViewFieldFlatMetadata(
      {
        ...args,
        objectName: 'costTemplateField',
        context: {
          viewName: 'costTemplateFieldRecordPageFields',
          viewFieldName: 'updatedBy',
          fieldName: 'updatedBy',
          position: 3,
          isVisible: false,
          size: 150,
          viewFieldGroupName: 'system',
        },
      },
    ),
  };
};
```

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/compute-standard-cost-template-field-view-field-groups.util.ts`:
```ts
import { msg } from '@lingui/core/macro';

import { i18nLabel } from 'src/engine/workspace-manager/twenty-standard-application/utils/i18n-label.util';
import { type FlatViewFieldGroup } from 'src/engine/metadata-modules/flat-view-field-group/types/flat-view-field-group.type';
import {
  createStandardViewFieldGroupFlatMetadata,
  type CreateStandardViewFieldGroupArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/create-standard-view-field-group-flat-metadata.util';

export const computeStandardCostTemplateFieldViewFieldGroups = (
  args: Omit<CreateStandardViewFieldGroupArgs<'costTemplateField'>, 'context'>,
): Record<string, FlatViewFieldGroup> => {
  return {
    costTemplateFieldRecordPageFieldsGeneral: createStandardViewFieldGroupFlatMetadata(
      {
        ...args,
        objectName: 'costTemplateField',
        context: {
          viewName: 'costTemplateFieldRecordPageFields',
          viewFieldGroupName: 'general',
          name: i18nLabel(
            msg({ message: `General`, context: 'viewFieldGroup.name' }),
          ),
          position: 0,
          isVisible: true,
        },
      },
    ),
    costTemplateFieldRecordPageFieldsSystem: createStandardViewFieldGroupFlatMetadata(
      {
        ...args,
        objectName: 'costTemplateField',
        context: {
          viewName: 'costTemplateFieldRecordPageFields',
          viewFieldGroupName: 'system',
          name: i18nLabel(
            msg({ message: `System`, context: 'viewFieldGroup.name' }),
          ),
          position: 1,
          isVisible: true,
        },
      },
    ),
  };
};
```

- [ ] **Step 13: Register views/view-fields/view-field-groups builders**

In `build-standard-flat-view-metadata-maps.util.ts`:
```ts
import { computeStandardCostTemplateFieldViews } from 'src/engine/workspace-manager/twenty-standard-application/utils/view/compute-standard-cost-template-field-views.util';
```
```ts
  costTemplateField: computeStandardCostTemplateFieldViews,
```

In `build-standard-flat-view-field-metadata-maps.util.ts`:
```ts
import { computeStandardCostTemplateFieldViewFields } from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field/compute-standard-cost-template-field-view-fields.util';
```
```ts
  costTemplateField: computeStandardCostTemplateFieldViewFields,
```

In `build-standard-flat-view-field-group-metadata-maps.util.ts`:
```ts
import { computeStandardCostTemplateFieldViewFieldGroups } from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/compute-standard-cost-template-field-view-field-groups.util';
```
```ts
  costTemplateField: computeStandardCostTemplateFieldViewFieldGroups,
```

- [ ] **Step 14: Create and register the index-metadata builder**

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/index/compute-cost-template-field-standard-flat-index-metadata.util.ts`:
```ts
import { type FlatIndexMetadata } from 'src/engine/metadata-modules/flat-index-metadata/types/flat-index-metadata.type';
import { type AllStandardObjectIndexName } from 'src/engine/workspace-manager/twenty-standard-application/types/all-standard-object-index-name.type';
import {
  type CreateStandardIndexArgs,
  createStandardIndexFlatMetadata,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/index/create-standard-index-flat-metadata.util';

export const buildCostTemplateFieldStandardFlatIndexMetadatas = ({
  now,
  objectName,
  workspaceId,
  standardObjectMetadataRelatedEntityIds,
  dependencyFlatEntityMaps,
  twentyStandardApplicationId,
}: Omit<CreateStandardIndexArgs<'costTemplateField'>, 'context'>): Record<
  AllStandardObjectIndexName<'costTemplateField'>,
  FlatIndexMetadata
> => ({
  costTemplateIdIndex: createStandardIndexFlatMetadata({
    objectName,
    workspaceId,
    context: {
      indexName: 'costTemplateIdIndex',
      relatedFieldNames: ['costTemplate'],
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
});
```

Register in `build-standard-flat-index-metadata-maps.util.ts`:
```ts
import { buildCostTemplateFieldStandardFlatIndexMetadatas } from 'src/engine/workspace-manager/twenty-standard-application/utils/index/compute-cost-template-field-standard-flat-index-metadata.util';
```
```ts
  costTemplateField: buildCostTemplateFieldStandardFlatIndexMetadatas,
```

- [ ] **Step 15: Create and register the page-layout config**

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/page-layout-config/standard-cost-template-field-page-layout.config.ts`:
```ts
import {
  STANDARD_OBJECTS,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-shared/metadata';
import { PageLayoutType } from 'twenty-shared/types';

import {
  TAB_PROPS,
  WIDGET_PROPS,
} from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-page-layout-tabs.template';
import {
  type StandardPageLayoutConfig,
  type StandardPageLayoutTabConfig,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/page-layout-config/standard-page-layout-config.type';

const COST_TEMPLATE_FIELD_PAGE_TABS = {
  home: {
    universalIdentifier:
      STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.costTemplateFieldRecordPage
        .tabs.home.universalIdentifier,
    ...TAB_PROPS.home,
    widgets: {
      fields: {
        universalIdentifier:
          STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.costTemplateFieldRecordPage
            .tabs.home.widgets.fields.universalIdentifier,
        ...WIDGET_PROPS.fields,
      },
    },
  },
} as const satisfies Record<string, StandardPageLayoutTabConfig>;

export const STANDARD_COST_TEMPLATE_FIELD_PAGE_LAYOUT_CONFIG = {
  name: 'Default Cost Template Field Layout',
  type: PageLayoutType.RECORD_PAGE,
  objectUniversalIdentifier:
    STANDARD_OBJECTS.costTemplateField.universalIdentifier,
  universalIdentifier:
    STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.costTemplateFieldRecordPage
      .universalIdentifier,
  defaultTabUniversalIdentifier: null,
  tabs: COST_TEMPLATE_FIELD_PAGE_TABS,
} as const satisfies StandardPageLayoutConfig;
```

In `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/page-layout-config/index.ts`, add:
```ts
export { STANDARD_COST_TEMPLATE_FIELD_PAGE_LAYOUT_CONFIG } from './standard-cost-template-field-page-layout.config';
```

In `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/constants/standard-page-layout.constant.ts`, add `STANDARD_COST_TEMPLATE_FIELD_PAGE_LAYOUT_CONFIG` to the import block and add to `STANDARD_PAGE_LAYOUTS`:
```ts
  costTemplateFieldRecordPage: STANDARD_COST_TEMPLATE_FIELD_PAGE_LAYOUT_CONFIG,
```

- [ ] **Step 16: Register the icon**

In `standard-object-icons.ts`, add:
```ts
  costTemplateField: 'IconForms',
```

- [ ] **Step 17: Write the metadata-build test**

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/__tests__/compute-cost-template-field-standard-metadata.spec.ts`:

```ts
import {
  STANDARD_OBJECTS,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-shared/metadata';
import { type FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { WidgetConfigurationType } from 'src/engine/metadata-modules/page-layout-widget/enums/widget-configuration-type.type';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';

const WORKSPACE_ID = '20202020-1111-4111-8111-111111111111';
const TWENTY_STANDARD_APPLICATION_ID = '20202020-2222-4222-8222-222222222222';
const NOW = '2024-01-01T00:00:00.000Z';

describe('CostTemplateField standard metadata build', () => {
  const { allFlatEntityMaps } =
    computeTwentyStandardApplicationAllFlatEntityMaps({
      now: NOW,
      workspaceId: WORKSPACE_ID,
      twentyStandardApplicationId: TWENTY_STANDARD_APPLICATION_ID,
    });

  it('builds the costTemplateField object', () => {
    const { byUniversalIdentifier } = allFlatEntityMaps.flatObjectMetadataMaps;

    expect(
      byUniversalIdentifier[
        STANDARD_OBJECTS.costTemplateField.universalIdentifier
      ],
    ).toBeDefined();
  });

  it('offers the five field types as fieldType options', () => {
    const fieldTypeField = allFlatEntityMaps.flatFieldMetadataMaps
      .byUniversalIdentifier[
      STANDARD_OBJECTS.costTemplateField.fields.fieldType.universalIdentifier
    ] as FlatFieldMetadata<FieldMetadataType.SELECT> | undefined;

    expect(fieldTypeField?.options?.map((option) => option.value)).toEqual([
      'NUMBER',
      'CURRENCY',
      'PERCENTAGE',
      'BOOLEAN',
      'PICKLIST',
    ]);
  });

  it('links costTemplateField to a costTemplate through a direct relation', () => {
    const costTemplateField =
      allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.costTemplateField.fields.costTemplate
          .universalIdentifier
      ];

    expect(costTemplateField).toBeDefined();
  });

  it('indexes the costTemplate foreign key', () => {
    const costTemplateIdIndex =
      allFlatEntityMaps.flatIndexMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.costTemplateField.indexes.costTemplateIdIndex
          .universalIdentifier
      ];

    expect(costTemplateIdIndex).toBeDefined();
  });

  it('gives costTemplate a reverse fields relation', () => {
    const fieldsField =
      allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.costTemplate.fields.fields.universalIdentifier
      ];

    expect(fieldsField).toBeDefined();
  });

  it('keeps the costTemplateField table view focused on name, variableName, fieldType, isRequired', () => {
    const viewFieldFieldUniversalIdentifiers = Object.values(
      allFlatEntityMaps.flatViewFieldMaps.byUniversalIdentifier,
    )
      .filter(isDefined)
      .filter(
        (viewField) =>
          viewField.viewUniversalIdentifier ===
          STANDARD_OBJECTS.costTemplateField.views.allCostTemplateFields
            .universalIdentifier,
      )
      .map((viewField) => viewField.fieldMetadataUniversalIdentifier);

    expect(viewFieldFieldUniversalIdentifiers).toHaveLength(4);
    expect(viewFieldFieldUniversalIdentifiers).toEqual(
      expect.arrayContaining([
        STANDARD_OBJECTS.costTemplateField.fields.name.universalIdentifier,
        STANDARD_OBJECTS.costTemplateField.fields.variableName
          .universalIdentifier,
        STANDARD_OBJECTS.costTemplateField.fields.fieldType
          .universalIdentifier,
        STANDARD_OBJECTS.costTemplateField.fields.isRequired
          .universalIdentifier,
      ]),
    );
  });

  it('links the costTemplateField fields widget to its record-page fields view', () => {
    const fieldsWidget =
      allFlatEntityMaps.flatPageLayoutWidgetMaps.byUniversalIdentifier[
        STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.costTemplateFieldRecordPage
          .tabs.home.widgets.fields.universalIdentifier
      ];

    expect(fieldsWidget?.universalConfiguration).toMatchObject({
      configurationType: WidgetConfigurationType.FIELDS,
      viewUniversalIdentifier:
        STANDARD_OBJECTS.costTemplateField.views.costTemplateFieldRecordPageFields
          .universalIdentifier,
    });
  });
});
```

- [ ] **Step 18: Run tests**

Run: `npx jest packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/__tests__/compute-cost-template-field-standard-metadata.spec.ts packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/__tests__/compute-cost-template-standard-metadata.spec.ts --config=packages/twenty-server/jest.config.mjs`
Expected: all PASS (re-running Task 1's test guards against the reverse-relation edit breaking CostTemplate).

- [ ] **Step 19: Typecheck and lint**

Run: `npx tsgo -p packages/twenty-server/tsconfig.json --noEmit`
Run: `npx nx lint:diff-with-main twenty-server --configuration=fix`

- [ ] **Step 20: Commit**

```bash
git add packages/twenty-shared packages/twenty-server/src/modules/quote/standard-objects packages/twenty-server/src/engine/workspace-manager/twenty-standard-application packages/twenty-server/src/engine/workspace-manager/workspace-migration/constant/standard-object-icons.ts
git commit -m "feat: add CostTemplateField standard object"
```

---

## Task 3: CostTemplateStep standard object

Same structure as Task 2, targeting a new `costTemplateStep` object with a `costTemplate` MANY_TO_ONE relation (`targetFieldName: 'steps'`) and CostTemplate gaining a `steps` reverse relation. Fields: `costTemplate` (relation), `name`, `variableName`, `formula`, `isOutput`.

**Files:** same set as Task 2, substituting `cost-template-field`/`CostTemplateField`/`costTemplateField` → `cost-template-step`/`CostTemplateStep`/`costTemplateStep` throughout, plus modifying `cost-template.workspace-entity.ts` and `compute-cost-template-standard-flat-field-metadata.util.ts` again (this time adding `steps` instead of `fields`).

**Interfaces:**
- Consumes: object `'costTemplate'` (Task 1/2).
- Produces: object `'costTemplateStep'`; fields `costTemplate`, `name`, `variableName`, `formula`, `isOutput`. `CostTemplate` gains a `steps` reverse-relation field.

- [ ] **Step 1: Add universal identifiers**

```ts
  costTemplateStep: '69c4f626-ec37-4dcf-84e1-59c173a75acf',
```

- [ ] **Step 2: Add field identifiers, including the reverse relation on CostTemplate**

New `costTemplateStep` entry in `standard-object-fields.constant.ts`:
```ts
  costTemplateStep: {
    ...buildStandardObjectSystemFields(
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.costTemplateStep,
    ),
    costTemplate: {
      universalIdentifier: 'a0bd1be9-2e8f-4a6b-bd22-e562a503b458',
    },
    name: { universalIdentifier: 'e912594a-a8a5-4829-a130-b1a903050dc3' },
    variableName: {
      universalIdentifier: '4845d073-67a4-4c03-92a6-635e3179ec28',
    },
    formula: { universalIdentifier: 'f9fccb36-35f0-4b99-8e2b-7b368b5211cc' },
    isOutput: {
      universalIdentifier: '9866f38a-fa49-45f1-9866-b95cfef9f60f',
    },
  },
```

Edit the `costTemplate` entry again, adding right after `fields`:
```ts
    steps: {
      universalIdentifier: 'd94074c9-4d5c-4350-9107-976575c5114b',
    },
```

- [ ] **Step 3: Add views + index declaration for costTemplateStep, and extend costTemplate's record-page view**

New `costTemplateStep` entry in `standard-object.constant.ts`:
```ts
  costTemplateStep: {
    universalIdentifier:
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.costTemplateStep,
    fields: STANDARD_OBJECT_FIELDS.costTemplateStep,
    indexes: {
      costTemplateIdIndex: {
        universalIdentifier: 'b991d0e5-7fda-43c7-809f-b70a1ecd0929',
      },
    },
    views: {
      allCostTemplateSteps: buildStandardObjectIndexView({
        objectUniversalIdentifier:
          STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.costTemplateStep,
        fields: STANDARD_OBJECT_FIELDS.costTemplateStep,
        viewFieldNames: ['name', 'variableName', 'formula', 'isOutput'],
      }),
      costTemplateStepRecordPageFields: buildStandardObjectRecordPageFieldsView(
        {
          objectUniversalIdentifier:
            STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.costTemplateStep,
          fields: STANDARD_OBJECT_FIELDS.costTemplateStep,
          viewFieldNames: [
            'costTemplate',
            'name',
            'variableName',
            'formula',
            'isOutput',
            'createdAt',
            'createdBy',
            'updatedAt',
            'updatedBy',
          ],
          viewFieldGroupNames: {
            general: 'General',
            system: 'System',
          },
        },
      ),
    },
  },
```

Edit `costTemplate`'s `costTemplateRecordPageFields` view, adding `'steps'` right after `'fields'`:
```ts
        viewFieldNames: [
          'name',
          'description',
          'fields',
          'steps',
          'createdAt',
          'createdBy',
          'updatedAt',
          'updatedBy',
        ],
```

- [ ] **Step 4: Add page-layout identifiers for costTemplateStep**

```ts
  costTemplateStepRecordPage: buildStandardObjectRecordPageLayout({
    objectUniversalIdentifier:
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.costTemplateStep,
    tabs: {
      home: {
        title: 'Home',
        widgets: {
          fields: 'Fields',
        },
      },
    },
  }),
```

- [ ] **Step 5: Build twenty-shared**

Run: `npx nx build twenty-shared --skip-nx-cache`

- [ ] **Step 6: Create the workspace-entity file**

Create `packages/twenty-server/src/modules/quote/standard-objects/cost-template-step.workspace-entity.ts`:
```ts
import { type ActorMetadata } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';
import { type CostTemplateWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template.workspace-entity';

export class CostTemplateStepWorkspaceEntity extends BaseWorkspaceEntity {
  costTemplate: EntityRelation<CostTemplateWorkspaceEntity> | null;
  costTemplateId: string | null;
  name: string | null;
  variableName: string | null;
  formula: string;
  isOutput: boolean;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  searchVector: string;
}
```

- [ ] **Step 7: Edit CostTemplate's workspace-entity to add the reverse relation**

Add import and field:
```ts
import { type CostTemplateStepWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template-step.workspace-entity';
```
```ts
  steps: EntityRelation<CostTemplateStepWorkspaceEntity[]>;
```

- [ ] **Step 8: Create the field-metadata builder for CostTemplateStep**

Create `compute-cost-template-step-standard-flat-field-metadata.util.ts` with the 8 system-field blocks (icon on `searchVector`: `'IconMathFunction'`) plus:

```ts
  costTemplate: createStandardRelationFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      type: FieldMetadataType.RELATION,
      morphId: null,
      fieldName: 'costTemplate',
      label: i18nLabel(
        msg({ message: `Cost Template`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The cost template this step belongs to`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconCalculator',
      isNullable: false,
      isUIEditable: false,
      targetObjectName: 'costTemplate',
      targetFieldName: 'steps',
      settings: {
        relationType: RelationType.MANY_TO_ONE,
        onDelete: RelationOnDeleteAction.CASCADE,
        joinColumnName: 'costTemplateId',
      },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  name: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'name',
      type: FieldMetadataType.TEXT,
      label: i18nLabel(msg({ message: `Name`, context: 'fieldMetadata.label' })),
      description: i18nLabel(
        msg({
          message: `The step's display name`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconTag',
      isNullable: true,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  variableName: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'variableName',
      type: FieldMetadataType.TEXT,
      label: i18nLabel(
        msg({ message: `Variable Name`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The name this step's result is exposed as, referenceable by other steps' formulas. Must be unique within the cost template.`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconVariable',
      isNullable: false,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  formula: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'formula',
      type: FieldMetadataType.TEXT,
      label: i18nLabel(
        msg({ message: `Formula`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `A dentaku expression; may reference this cost template's field and step variable names`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconMathFunction',
      isNullable: false,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  isOutput: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'isOutput',
      type: FieldMetadataType.BOOLEAN,
      label: i18nLabel(
        msg({ message: `Is Output`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Whether this step's result becomes the quote line's unit price. Exactly one step per cost template must be the output.`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconFlag',
      isNullable: false,
      defaultValue: false,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
```

Function name: `buildCostTemplateStepStandardFlatFieldMetadatas`.

- [ ] **Step 9: Add the reverse `steps` relation to CostTemplate's field-metadata builder**

Add to `compute-cost-template-standard-flat-field-metadata.util.ts`:
```ts
  steps: createStandardRelationFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      type: FieldMetadataType.RELATION,
      morphId: null,
      fieldName: 'steps',
      isSystemSideEffect: true,
      label: i18nLabel(msg({ message: `Steps`, context: 'fieldMetadata.label' })),
      description: i18nLabel(
        msg({
          message: `The calculation steps defined on this cost template`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconMathFunction',
      isNullable: true,
      isUIEditable: false,
      targetObjectName: 'costTemplateStep',
      targetFieldName: 'costTemplate',
      settings: { relationType: RelationType.ONE_TO_MANY },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
```

- [ ] **Step 10: Register the field-metadata builder**

```ts
import { buildCostTemplateStepStandardFlatFieldMetadatas } from 'src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/compute-cost-template-step-standard-flat-field-metadata.util';
```
```ts
  costTemplateStep: buildCostTemplateStepStandardFlatFieldMetadatas,
```

- [ ] **Step 11: Register the object-metadata builder**

```ts
  costTemplateStep: ({
    now,
    workspaceId,
    standardObjectMetadataRelatedEntityIds,
    twentyStandardApplicationId,
    dependencyFlatEntityMaps,
  }: Omit<
    CreateStandardObjectArgs<'costTemplateStep'>,
    'context' | 'objectName'
  >) =>
    createStandardObjectFlatMetadata({
      objectName: 'costTemplateStep',
      dependencyFlatEntityMaps,
      context: {
        universalIdentifier:
          STANDARD_OBJECTS.costTemplateStep.universalIdentifier,
        nameSingular: 'costTemplateStep',
        namePlural: 'costTemplateSteps',
        labelSingular: i18nLabel(
          msg({
            message: `Cost Template Step`,
            context: 'objectMetadata.labelSingular',
          }),
        ),
        labelPlural: i18nLabel(
          msg({
            message: `Cost Template Steps`,
            context: 'objectMetadata.labelPlural',
          }),
        ),
        description: i18nLabel(
          msg({
            message: `A calculation formula on a cost template`,
            context: 'objectMetadata.description',
          }),
        ),
        icon: 'IconMathFunction',
        labelIdentifierFieldMetadataName: 'name',
      },
      workspaceId,
      standardObjectMetadataRelatedEntityIds,
      twentyStandardApplicationId,
      now,
    }),
```

- [ ] **Step 12: Create views/view-fields/view-field-groups builders**

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view/compute-standard-cost-template-step-views.util.ts`:
```ts
import { ViewKey, ViewType } from 'twenty-shared/types';

import { INDEX_VIEW_NAME } from 'src/engine/metadata-modules/view/constants/index-view-name.constant';
import { type FlatView } from 'src/engine/metadata-modules/flat-view/types/flat-view.type';
import {
  createStandardViewFlatMetadata,
  type CreateStandardViewArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view/create-standard-view-flat-metadata.util';

export const computeStandardCostTemplateStepViews = (
  args: Omit<CreateStandardViewArgs<'costTemplateStep'>, 'context'>,
): Record<string, FlatView> => {
  return {
    allCostTemplateSteps: createStandardViewFlatMetadata({
      ...args,
      objectName: 'costTemplateStep',
      context: {
        viewName: 'allCostTemplateSteps',
        name: INDEX_VIEW_NAME,
        type: ViewType.TABLE,
        key: ViewKey.INDEX,
        position: 0,
        icon: 'IconMathFunction',
      },
    }),
    costTemplateStepRecordPageFields: createStandardViewFlatMetadata({
      ...args,
      objectName: 'costTemplateStep',
      context: {
        viewName: 'costTemplateStepRecordPageFields',
        name: 'Cost Template Step Record Page Fields',
        type: ViewType.FIELDS_WIDGET,
        key: null,
        position: 0,
        icon: 'IconList',
      },
    }),
  };
};
```

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field/compute-standard-cost-template-step-view-fields.util.ts`:
```ts
import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import {
  createStandardViewFieldFlatMetadata,
  type CreateStandardViewFieldArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field/create-standard-view-field-flat-metadata.util';

export const computeStandardCostTemplateStepViewFields = (
  args: Omit<CreateStandardViewFieldArgs<'costTemplateStep'>, 'context'>,
): Record<string, FlatViewField> => {
  return {
    allCostTemplateStepsName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplateStep',
      context: {
        viewName: 'allCostTemplateSteps',
        viewFieldName: 'name',
        fieldName: 'name',
        position: 0,
        isVisible: true,
        size: 210,
      },
    }),
    allCostTemplateStepsVariableName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplateStep',
      context: {
        viewName: 'allCostTemplateSteps',
        viewFieldName: 'variableName',
        fieldName: 'variableName',
        position: 1,
        isVisible: true,
        size: 150,
      },
    }),
    allCostTemplateStepsFormula: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplateStep',
      context: {
        viewName: 'allCostTemplateSteps',
        viewFieldName: 'formula',
        fieldName: 'formula',
        position: 2,
        isVisible: true,
        size: 250,
      },
    }),
    allCostTemplateStepsIsOutput: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplateStep',
      context: {
        viewName: 'allCostTemplateSteps',
        viewFieldName: 'isOutput',
        fieldName: 'isOutput',
        position: 3,
        isVisible: true,
        size: 100,
      },
    }),

    // costTemplateStepRecordPageFields view fields
    // General group
    costTemplateStepRecordPageFieldsCostTemplate: createStandardViewFieldFlatMetadata(
      {
        ...args,
        objectName: 'costTemplateStep',
        context: {
          viewName: 'costTemplateStepRecordPageFields',
          viewFieldName: 'costTemplate',
          fieldName: 'costTemplate',
          position: 0,
          isVisible: true,
          size: 150,
          viewFieldGroupName: 'general',
        },
      },
    ),
    costTemplateStepRecordPageFieldsName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplateStep',
      context: {
        viewName: 'costTemplateStepRecordPageFields',
        viewFieldName: 'name',
        fieldName: 'name',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    costTemplateStepRecordPageFieldsVariableName: createStandardViewFieldFlatMetadata(
      {
        ...args,
        objectName: 'costTemplateStep',
        context: {
          viewName: 'costTemplateStepRecordPageFields',
          viewFieldName: 'variableName',
          fieldName: 'variableName',
          position: 2,
          isVisible: true,
          size: 150,
          viewFieldGroupName: 'general',
        },
      },
    ),
    costTemplateStepRecordPageFieldsFormula: createStandardViewFieldFlatMetadata(
      {
        ...args,
        objectName: 'costTemplateStep',
        context: {
          viewName: 'costTemplateStepRecordPageFields',
          viewFieldName: 'formula',
          fieldName: 'formula',
          position: 3,
          isVisible: true,
          size: 250,
          viewFieldGroupName: 'general',
        },
      },
    ),
    costTemplateStepRecordPageFieldsIsOutput: createStandardViewFieldFlatMetadata(
      {
        ...args,
        objectName: 'costTemplateStep',
        context: {
          viewName: 'costTemplateStepRecordPageFields',
          viewFieldName: 'isOutput',
          fieldName: 'isOutput',
          position: 4,
          isVisible: true,
          size: 100,
          viewFieldGroupName: 'general',
        },
      },
    ),
    // System group
    costTemplateStepRecordPageFieldsCreatedAt: createStandardViewFieldFlatMetadata(
      {
        ...args,
        objectName: 'costTemplateStep',
        context: {
          viewName: 'costTemplateStepRecordPageFields',
          viewFieldName: 'createdAt',
          fieldName: 'createdAt',
          position: 0,
          isVisible: true,
          size: 150,
          viewFieldGroupName: 'system',
        },
      },
    ),
    costTemplateStepRecordPageFieldsCreatedBy: createStandardViewFieldFlatMetadata(
      {
        ...args,
        objectName: 'costTemplateStep',
        context: {
          viewName: 'costTemplateStepRecordPageFields',
          viewFieldName: 'createdBy',
          fieldName: 'createdBy',
          position: 1,
          isVisible: true,
          size: 150,
          viewFieldGroupName: 'system',
        },
      },
    ),
    costTemplateStepRecordPageFieldsUpdatedAt: createStandardViewFieldFlatMetadata(
      {
        ...args,
        objectName: 'costTemplateStep',
        context: {
          viewName: 'costTemplateStepRecordPageFields',
          viewFieldName: 'updatedAt',
          fieldName: 'updatedAt',
          position: 2,
          isVisible: false,
          size: 150,
          viewFieldGroupName: 'system',
        },
      },
    ),
    costTemplateStepRecordPageFieldsUpdatedBy: createStandardViewFieldFlatMetadata(
      {
        ...args,
        objectName: 'costTemplateStep',
        context: {
          viewName: 'costTemplateStepRecordPageFields',
          viewFieldName: 'updatedBy',
          fieldName: 'updatedBy',
          position: 3,
          isVisible: false,
          size: 150,
          viewFieldGroupName: 'system',
        },
      },
    ),
  };
};
```

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/compute-standard-cost-template-step-view-field-groups.util.ts`:
```ts
import { msg } from '@lingui/core/macro';

import { i18nLabel } from 'src/engine/workspace-manager/twenty-standard-application/utils/i18n-label.util';
import { type FlatViewFieldGroup } from 'src/engine/metadata-modules/flat-view-field-group/types/flat-view-field-group.type';
import {
  createStandardViewFieldGroupFlatMetadata,
  type CreateStandardViewFieldGroupArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/create-standard-view-field-group-flat-metadata.util';

export const computeStandardCostTemplateStepViewFieldGroups = (
  args: Omit<CreateStandardViewFieldGroupArgs<'costTemplateStep'>, 'context'>,
): Record<string, FlatViewFieldGroup> => {
  return {
    costTemplateStepRecordPageFieldsGeneral: createStandardViewFieldGroupFlatMetadata(
      {
        ...args,
        objectName: 'costTemplateStep',
        context: {
          viewName: 'costTemplateStepRecordPageFields',
          viewFieldGroupName: 'general',
          name: i18nLabel(
            msg({ message: `General`, context: 'viewFieldGroup.name' }),
          ),
          position: 0,
          isVisible: true,
        },
      },
    ),
    costTemplateStepRecordPageFieldsSystem: createStandardViewFieldGroupFlatMetadata(
      {
        ...args,
        objectName: 'costTemplateStep',
        context: {
          viewName: 'costTemplateStepRecordPageFields',
          viewFieldGroupName: 'system',
          name: i18nLabel(
            msg({ message: `System`, context: 'viewFieldGroup.name' }),
          ),
          position: 1,
          isVisible: true,
        },
      },
    ),
  };
};
```

- [ ] **Step 13: Register views/view-fields/view-field-groups builders**

In `build-standard-flat-view-metadata-maps.util.ts`:
```ts
import { computeStandardCostTemplateStepViews } from 'src/engine/workspace-manager/twenty-standard-application/utils/view/compute-standard-cost-template-step-views.util';
```
```ts
  costTemplateStep: computeStandardCostTemplateStepViews,
```

In `build-standard-flat-view-field-metadata-maps.util.ts`:
```ts
import { computeStandardCostTemplateStepViewFields } from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field/compute-standard-cost-template-step-view-fields.util';
```
```ts
  costTemplateStep: computeStandardCostTemplateStepViewFields,
```

In `build-standard-flat-view-field-group-metadata-maps.util.ts`:
```ts
import { computeStandardCostTemplateStepViewFieldGroups } from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/compute-standard-cost-template-step-view-field-groups.util';
```
```ts
  costTemplateStep: computeStandardCostTemplateStepViewFieldGroups,
```

- [ ] **Step 14: Create and register the index-metadata builder**

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/index/compute-cost-template-step-standard-flat-index-metadata.util.ts`:
```ts
import { type FlatIndexMetadata } from 'src/engine/metadata-modules/flat-index-metadata/types/flat-index-metadata.type';
import { type AllStandardObjectIndexName } from 'src/engine/workspace-manager/twenty-standard-application/types/all-standard-object-index-name.type';
import {
  type CreateStandardIndexArgs,
  createStandardIndexFlatMetadata,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/index/create-standard-index-flat-metadata.util';

export const buildCostTemplateStepStandardFlatIndexMetadatas = ({
  now,
  objectName,
  workspaceId,
  standardObjectMetadataRelatedEntityIds,
  dependencyFlatEntityMaps,
  twentyStandardApplicationId,
}: Omit<CreateStandardIndexArgs<'costTemplateStep'>, 'context'>): Record<
  AllStandardObjectIndexName<'costTemplateStep'>,
  FlatIndexMetadata
> => ({
  costTemplateIdIndex: createStandardIndexFlatMetadata({
    objectName,
    workspaceId,
    context: {
      indexName: 'costTemplateIdIndex',
      relatedFieldNames: ['costTemplate'],
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
});
```

Register in `build-standard-flat-index-metadata-maps.util.ts`:
```ts
import { buildCostTemplateStepStandardFlatIndexMetadatas } from 'src/engine/workspace-manager/twenty-standard-application/utils/index/compute-cost-template-step-standard-flat-index-metadata.util';
```
```ts
  costTemplateStep: buildCostTemplateStepStandardFlatIndexMetadatas,
```

- [ ] **Step 15: Create and register the page-layout config**

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/page-layout-config/standard-cost-template-step-page-layout.config.ts`:
```ts
import {
  STANDARD_OBJECTS,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-shared/metadata';
import { PageLayoutType } from 'twenty-shared/types';

import {
  TAB_PROPS,
  WIDGET_PROPS,
} from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-page-layout-tabs.template';
import {
  type StandardPageLayoutConfig,
  type StandardPageLayoutTabConfig,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/page-layout-config/standard-page-layout-config.type';

const COST_TEMPLATE_STEP_PAGE_TABS = {
  home: {
    universalIdentifier:
      STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.costTemplateStepRecordPage
        .tabs.home.universalIdentifier,
    ...TAB_PROPS.home,
    widgets: {
      fields: {
        universalIdentifier:
          STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.costTemplateStepRecordPage
            .tabs.home.widgets.fields.universalIdentifier,
        ...WIDGET_PROPS.fields,
      },
    },
  },
} as const satisfies Record<string, StandardPageLayoutTabConfig>;

export const STANDARD_COST_TEMPLATE_STEP_PAGE_LAYOUT_CONFIG = {
  name: 'Default Cost Template Step Layout',
  type: PageLayoutType.RECORD_PAGE,
  objectUniversalIdentifier:
    STANDARD_OBJECTS.costTemplateStep.universalIdentifier,
  universalIdentifier:
    STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.costTemplateStepRecordPage
      .universalIdentifier,
  defaultTabUniversalIdentifier: null,
  tabs: COST_TEMPLATE_STEP_PAGE_TABS,
} as const satisfies StandardPageLayoutConfig;
```

In `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/page-layout-config/index.ts`, add:
```ts
export { STANDARD_COST_TEMPLATE_STEP_PAGE_LAYOUT_CONFIG } from './standard-cost-template-step-page-layout.config';
```

In `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/constants/standard-page-layout.constant.ts`, add `STANDARD_COST_TEMPLATE_STEP_PAGE_LAYOUT_CONFIG` to the import block and add to `STANDARD_PAGE_LAYOUTS`:
```ts
  costTemplateStepRecordPage: STANDARD_COST_TEMPLATE_STEP_PAGE_LAYOUT_CONFIG,
```

- [ ] **Step 16: Register the icon**

```ts
  costTemplateStep: 'IconMathFunction',
```

- [ ] **Step 17: Write the metadata-build test**

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/__tests__/compute-cost-template-step-standard-metadata.spec.ts`:

```ts
import {
  STANDARD_OBJECTS,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-shared/metadata';
import { isDefined } from 'twenty-shared/utils';

import { WidgetConfigurationType } from 'src/engine/metadata-modules/page-layout-widget/enums/widget-configuration-type.type';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';

const WORKSPACE_ID = '20202020-1111-4111-8111-111111111111';
const TWENTY_STANDARD_APPLICATION_ID = '20202020-2222-4222-8222-222222222222';
const NOW = '2024-01-01T00:00:00.000Z';

describe('CostTemplateStep standard metadata build', () => {
  const { allFlatEntityMaps } =
    computeTwentyStandardApplicationAllFlatEntityMaps({
      now: NOW,
      workspaceId: WORKSPACE_ID,
      twentyStandardApplicationId: TWENTY_STANDARD_APPLICATION_ID,
    });

  it('builds the costTemplateStep object', () => {
    const { byUniversalIdentifier } = allFlatEntityMaps.flatObjectMetadataMaps;

    expect(
      byUniversalIdentifier[
        STANDARD_OBJECTS.costTemplateStep.universalIdentifier
      ],
    ).toBeDefined();
  });

  it('has a formula and isOutput field', () => {
    const formulaField =
      allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.costTemplateStep.fields.formula.universalIdentifier
      ];
    const isOutputField =
      allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.costTemplateStep.fields.isOutput.universalIdentifier
      ];

    expect(formulaField).toBeDefined();
    expect(isOutputField).toBeDefined();
  });

  it('links costTemplateStep to a costTemplate through a direct relation', () => {
    const costTemplateField =
      allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.costTemplateStep.fields.costTemplate
          .universalIdentifier
      ];

    expect(costTemplateField).toBeDefined();
  });

  it('indexes the costTemplate foreign key', () => {
    const costTemplateIdIndex =
      allFlatEntityMaps.flatIndexMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.costTemplateStep.indexes.costTemplateIdIndex
          .universalIdentifier
      ];

    expect(costTemplateIdIndex).toBeDefined();
  });

  it('gives costTemplate a reverse steps relation', () => {
    const stepsField =
      allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.costTemplate.fields.steps.universalIdentifier
      ];

    expect(stepsField).toBeDefined();
  });

  it('keeps the costTemplateStep table view focused on name, variableName, formula, isOutput', () => {
    const viewFieldFieldUniversalIdentifiers = Object.values(
      allFlatEntityMaps.flatViewFieldMaps.byUniversalIdentifier,
    )
      .filter(isDefined)
      .filter(
        (viewField) =>
          viewField.viewUniversalIdentifier ===
          STANDARD_OBJECTS.costTemplateStep.views.allCostTemplateSteps
            .universalIdentifier,
      )
      .map((viewField) => viewField.fieldMetadataUniversalIdentifier);

    expect(viewFieldFieldUniversalIdentifiers).toHaveLength(4);
    expect(viewFieldFieldUniversalIdentifiers).toEqual(
      expect.arrayContaining([
        STANDARD_OBJECTS.costTemplateStep.fields.name.universalIdentifier,
        STANDARD_OBJECTS.costTemplateStep.fields.variableName
          .universalIdentifier,
        STANDARD_OBJECTS.costTemplateStep.fields.formula.universalIdentifier,
        STANDARD_OBJECTS.costTemplateStep.fields.isOutput.universalIdentifier,
      ]),
    );
  });

  it('links the costTemplateStep fields widget to its record-page fields view', () => {
    const fieldsWidget =
      allFlatEntityMaps.flatPageLayoutWidgetMaps.byUniversalIdentifier[
        STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.costTemplateStepRecordPage
          .tabs.home.widgets.fields.universalIdentifier
      ];

    expect(fieldsWidget?.universalConfiguration).toMatchObject({
      configurationType: WidgetConfigurationType.FIELDS,
      viewUniversalIdentifier:
        STANDARD_OBJECTS.costTemplateStep.views.costTemplateStepRecordPageFields
          .universalIdentifier,
    });
  });
});
```

- [ ] **Step 18: Run tests**

Run: `npx jest packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/__tests__/compute-cost-template-step-standard-metadata.spec.ts packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/__tests__/compute-cost-template-standard-metadata.spec.ts packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/__tests__/compute-cost-template-field-standard-metadata.spec.ts --config=packages/twenty-server/jest.config.mjs`
Expected: all PASS.

- [ ] **Step 19: Typecheck and lint**

Same commands as Task 1/2.

- [ ] **Step 20: Commit**

```bash
git add packages/twenty-shared packages/twenty-server/src/modules/quote/standard-objects packages/twenty-server/src/engine/workspace-manager/twenty-standard-application packages/twenty-server/src/engine/workspace-manager/workspace-migration/constant/standard-object-icons.ts
git commit -m "feat: add CostTemplateStep standard object"
```

---

## Task 4: Product standard object

**Files:** same category of files as Task 2/3, for a new `product` object with fields `name`, `sku`, `description`, `basePrice`, `isActive`, `costTemplate` (MANY_TO_ONE, **nullable**, `targetFieldName: 'products'`, `onDelete: SET_NULL`). CostTemplate gains a `products` reverse relation.

**Interfaces:**
- Consumes: object `'costTemplate'` (Tasks 1-3).
- Produces: object `'product'`; fields `name`, `sku`, `description`, `basePrice`, `isActive`, `costTemplate`. `CostTemplate` gains a `products` reverse-relation field. This is the last field Task 5's validation service can assume exists on `costTemplate`.

- [ ] **Step 1: Add universal identifiers**

```ts
  product: '5f191ed3-6336-43b0-b10c-f5c9f2800c89',
```

- [ ] **Step 2: Add field identifiers, including the reverse relation on CostTemplate**

```ts
  product: {
    ...buildStandardObjectSystemFields(
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.product,
    ),
    name: { universalIdentifier: '8b8b51ba-4383-4f80-87ae-62453471886e' },
    sku: { universalIdentifier: 'b2c51aee-9efa-44f4-aead-ed3798c4474b' },
    description: {
      universalIdentifier: '23b6cee9-fd65-434d-9db0-e3b4fc6cc54f',
    },
    basePrice: {
      universalIdentifier: '0ecd51c8-907a-44bf-bd20-e83d3668f4b8',
    },
    isActive: {
      universalIdentifier: '01ff2b15-0eb1-408b-9584-d1e5126cd8cd',
    },
    costTemplate: {
      universalIdentifier: '795d115f-824e-4f30-af84-9dd41021a7cc',
    },
  },
```

Edit the `costTemplate` entry again, adding right after `steps`:
```ts
    products: {
      universalIdentifier: '927d5b5a-9399-4460-a210-f586689bd70d',
    },
```

- [ ] **Step 3: Add views + index declaration for product, and extend costTemplate's record-page view**

```ts
  product: {
    universalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.product,
    fields: STANDARD_OBJECT_FIELDS.product,
    indexes: {
      costTemplateIdIndex: {
        universalIdentifier: 'c73156e2-c65e-46df-8848-99151a2ae07e',
      },
    },
    views: {
      allProducts: buildStandardObjectIndexView({
        objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.product,
        fields: STANDARD_OBJECT_FIELDS.product,
        viewFieldNames: ['name', 'sku', 'basePrice', 'isActive'],
      }),
      productRecordPageFields: buildStandardObjectRecordPageFieldsView({
        objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.product,
        fields: STANDARD_OBJECT_FIELDS.product,
        viewFieldNames: [
          'name',
          'sku',
          'description',
          'basePrice',
          'isActive',
          'costTemplate',
          'createdAt',
          'createdBy',
          'updatedAt',
          'updatedBy',
        ],
        viewFieldGroupNames: {
          general: 'General',
          system: 'System',
        },
      }),
    },
  },
```

Edit `costTemplate`'s `costTemplateRecordPageFields` view, adding `'products'` right after `'steps'`:
```ts
        viewFieldNames: [
          'name',
          'description',
          'fields',
          'steps',
          'products',
          'createdAt',
          'createdBy',
          'updatedAt',
          'updatedBy',
        ],
```

- [ ] **Step 4: Add page-layout identifiers for product**

```ts
  productRecordPage: buildStandardObjectRecordPageLayout({
    objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.product,
    tabs: {
      home: {
        title: 'Home',
        widgets: {
          fields: 'Fields',
        },
      },
    },
  }),
```

- [ ] **Step 5: Build twenty-shared**

Run: `npx nx build twenty-shared --skip-nx-cache`

- [ ] **Step 6: Create the workspace-entity file**

Create `packages/twenty-server/src/modules/quote/standard-objects/product.workspace-entity.ts`:
```ts
import { type ActorMetadata, type CurrencyMetadata } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';
import { type CostTemplateWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template.workspace-entity';

export class ProductWorkspaceEntity extends BaseWorkspaceEntity {
  name: string | null;
  sku: string | null;
  description: string | null;
  basePrice: CurrencyMetadata | null;
  isActive: boolean;
  costTemplate: EntityRelation<CostTemplateWorkspaceEntity> | null;
  costTemplateId: string | null;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  searchVector: string;
}
```

- [ ] **Step 7: Edit CostTemplate's workspace-entity to add the reverse relation**

```ts
import { type ProductWorkspaceEntity } from 'src/modules/quote/standard-objects/product.workspace-entity';
```
```ts
  products: EntityRelation<ProductWorkspaceEntity[]>;
```

- [ ] **Step 8: Create the field-metadata builder for Product**

Create `compute-product-standard-flat-field-metadata.util.ts` with the 8 system-field blocks (icon on `searchVector`: `'IconPackage'`) plus:

```ts
  name: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'name',
      type: FieldMetadataType.TEXT,
      label: i18nLabel(msg({ message: `Name`, context: 'fieldMetadata.label' })),
      description: i18nLabel(
        msg({
          message: `The product name`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconTag',
      isNullable: true,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  sku: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'sku',
      type: FieldMetadataType.TEXT,
      label: i18nLabel(msg({ message: `SKU`, context: 'fieldMetadata.label' })),
      description: i18nLabel(
        msg({
          message: `The product's stock keeping unit`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconBarcode',
      isNullable: true,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  description: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'description',
      type: FieldMetadataType.TEXT,
      label: i18nLabel(
        msg({ message: `Description`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The product description`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconFileDescription',
      isNullable: true,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  basePrice: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'basePrice',
      type: FieldMetadataType.CURRENCY,
      label: i18nLabel(
        msg({ message: `Base Price`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The product's list price`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconCurrencyDollar',
      isNullable: true,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  isActive: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'isActive',
      type: FieldMetadataType.BOOLEAN,
      label: i18nLabel(
        msg({ message: `Is Active`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Whether this product can be added to new quote lines`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconCircleCheck',
      isNullable: false,
      defaultValue: true,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  costTemplate: createStandardRelationFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      type: FieldMetadataType.RELATION,
      morphId: null,
      fieldName: 'costTemplate',
      label: i18nLabel(
        msg({ message: `Cost Template`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The cost template used to price quote lines for this product. Leave empty to price this product manually.`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconCalculator',
      isNullable: true,
      targetObjectName: 'costTemplate',
      targetFieldName: 'products',
      settings: {
        relationType: RelationType.MANY_TO_ONE,
        onDelete: RelationOnDeleteAction.SET_NULL,
        joinColumnName: 'costTemplateId',
      },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
```

Function name: `buildProductStandardFlatFieldMetadatas`.

- [ ] **Step 9: Add the reverse `products` relation to CostTemplate's field-metadata builder**

```ts
  products: createStandardRelationFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      type: FieldMetadataType.RELATION,
      morphId: null,
      fieldName: 'products',
      isSystemSideEffect: true,
      label: i18nLabel(
        msg({ message: `Products`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The products priced with this cost template`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconPackage',
      isNullable: true,
      isUIEditable: false,
      targetObjectName: 'product',
      targetFieldName: 'costTemplate',
      settings: { relationType: RelationType.ONE_TO_MANY },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
```

- [ ] **Step 10: Register the field-metadata builder**

```ts
import { buildProductStandardFlatFieldMetadatas } from 'src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/compute-product-standard-flat-field-metadata.util';
```
```ts
  product: buildProductStandardFlatFieldMetadatas,
```

- [ ] **Step 11: Register the object-metadata builder**

```ts
  product: ({
    now,
    workspaceId,
    standardObjectMetadataRelatedEntityIds,
    twentyStandardApplicationId,
    dependencyFlatEntityMaps,
  }: Omit<CreateStandardObjectArgs<'product'>, 'context' | 'objectName'>) =>
    createStandardObjectFlatMetadata({
      objectName: 'product',
      dependencyFlatEntityMaps,
      context: {
        universalIdentifier: STANDARD_OBJECTS.product.universalIdentifier,
        nameSingular: 'product',
        namePlural: 'products',
        labelSingular: i18nLabel(
          msg({ message: `Product`, context: 'objectMetadata.labelSingular' }),
        ),
        labelPlural: i18nLabel(
          msg({ message: `Products`, context: 'objectMetadata.labelPlural' }),
        ),
        description: i18nLabel(
          msg({
            message: `A sellable product or service in the catalog`,
            context: 'objectMetadata.description',
          }),
        ),
        icon: 'IconPackage',
        isSearchable: true,
        labelIdentifierFieldMetadataName: 'name',
      },
      workspaceId,
      standardObjectMetadataRelatedEntityIds,
      twentyStandardApplicationId,
      now,
    }),
```

- [ ] **Step 12: Create views/view-fields/view-field-groups builders**

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view/compute-standard-product-views.util.ts`:
```ts
import { ViewKey, ViewType } from 'twenty-shared/types';

import { INDEX_VIEW_NAME } from 'src/engine/metadata-modules/view/constants/index-view-name.constant';
import { type FlatView } from 'src/engine/metadata-modules/flat-view/types/flat-view.type';
import {
  createStandardViewFlatMetadata,
  type CreateStandardViewArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view/create-standard-view-flat-metadata.util';

export const computeStandardProductViews = (
  args: Omit<CreateStandardViewArgs<'product'>, 'context'>,
): Record<string, FlatView> => {
  return {
    allProducts: createStandardViewFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'allProducts',
        name: INDEX_VIEW_NAME,
        type: ViewType.TABLE,
        key: ViewKey.INDEX,
        position: 0,
        icon: 'IconPackage',
      },
    }),
    productRecordPageFields: createStandardViewFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'productRecordPageFields',
        name: 'Product Record Page Fields',
        type: ViewType.FIELDS_WIDGET,
        key: null,
        position: 0,
        icon: 'IconList',
      },
    }),
  };
};
```

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field/compute-standard-product-view-fields.util.ts`:
```ts
import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import {
  createStandardViewFieldFlatMetadata,
  type CreateStandardViewFieldArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field/create-standard-view-field-flat-metadata.util';

export const computeStandardProductViewFields = (
  args: Omit<CreateStandardViewFieldArgs<'product'>, 'context'>,
): Record<string, FlatViewField> => {
  return {
    allProductsName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'allProducts',
        viewFieldName: 'name',
        fieldName: 'name',
        position: 0,
        isVisible: true,
        size: 210,
      },
    }),
    allProductsSku: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'allProducts',
        viewFieldName: 'sku',
        fieldName: 'sku',
        position: 1,
        isVisible: true,
        size: 150,
      },
    }),
    allProductsBasePrice: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'allProducts',
        viewFieldName: 'basePrice',
        fieldName: 'basePrice',
        position: 2,
        isVisible: true,
        size: 150,
      },
    }),
    allProductsIsActive: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'allProducts',
        viewFieldName: 'isActive',
        fieldName: 'isActive',
        position: 3,
        isVisible: true,
        size: 100,
      },
    }),

    // productRecordPageFields view fields
    // General group
    productRecordPageFieldsName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'productRecordPageFields',
        viewFieldName: 'name',
        fieldName: 'name',
        position: 0,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    productRecordPageFieldsSku: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'productRecordPageFields',
        viewFieldName: 'sku',
        fieldName: 'sku',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    productRecordPageFieldsDescription: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'productRecordPageFields',
        viewFieldName: 'description',
        fieldName: 'description',
        position: 2,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    productRecordPageFieldsBasePrice: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'productRecordPageFields',
        viewFieldName: 'basePrice',
        fieldName: 'basePrice',
        position: 3,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    productRecordPageFieldsIsActive: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'productRecordPageFields',
        viewFieldName: 'isActive',
        fieldName: 'isActive',
        position: 4,
        isVisible: true,
        size: 100,
        viewFieldGroupName: 'general',
      },
    }),
    productRecordPageFieldsCostTemplate: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'productRecordPageFields',
        viewFieldName: 'costTemplate',
        fieldName: 'costTemplate',
        position: 5,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    // System group
    productRecordPageFieldsCreatedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'productRecordPageFields',
        viewFieldName: 'createdAt',
        fieldName: 'createdAt',
        position: 0,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'system',
      },
    }),
    productRecordPageFieldsCreatedBy: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'productRecordPageFields',
        viewFieldName: 'createdBy',
        fieldName: 'createdBy',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'system',
      },
    }),
    productRecordPageFieldsUpdatedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'productRecordPageFields',
        viewFieldName: 'updatedAt',
        fieldName: 'updatedAt',
        position: 2,
        isVisible: false,
        size: 150,
        viewFieldGroupName: 'system',
      },
    }),
    productRecordPageFieldsUpdatedBy: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'productRecordPageFields',
        viewFieldName: 'updatedBy',
        fieldName: 'updatedBy',
        position: 3,
        isVisible: false,
        size: 150,
        viewFieldGroupName: 'system',
      },
    }),
  };
};
```

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/compute-standard-product-view-field-groups.util.ts`:
```ts
import { msg } from '@lingui/core/macro';

import { i18nLabel } from 'src/engine/workspace-manager/twenty-standard-application/utils/i18n-label.util';
import { type FlatViewFieldGroup } from 'src/engine/metadata-modules/flat-view-field-group/types/flat-view-field-group.type';
import {
  createStandardViewFieldGroupFlatMetadata,
  type CreateStandardViewFieldGroupArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/create-standard-view-field-group-flat-metadata.util';

export const computeStandardProductViewFieldGroups = (
  args: Omit<CreateStandardViewFieldGroupArgs<'product'>, 'context'>,
): Record<string, FlatViewFieldGroup> => {
  return {
    productRecordPageFieldsGeneral: createStandardViewFieldGroupFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'productRecordPageFields',
        viewFieldGroupName: 'general',
        name: i18nLabel(
          msg({ message: `General`, context: 'viewFieldGroup.name' }),
        ),
        position: 0,
        isVisible: true,
      },
    }),
    productRecordPageFieldsSystem: createStandardViewFieldGroupFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'productRecordPageFields',
        viewFieldGroupName: 'system',
        name: i18nLabel(
          msg({ message: `System`, context: 'viewFieldGroup.name' }),
        ),
        position: 1,
        isVisible: true,
      },
    }),
  };
};
```

- [ ] **Step 13: Register views/view-fields/view-field-groups builders**

In `build-standard-flat-view-metadata-maps.util.ts`:
```ts
import { computeStandardProductViews } from 'src/engine/workspace-manager/twenty-standard-application/utils/view/compute-standard-product-views.util';
```
```ts
  product: computeStandardProductViews,
```

In `build-standard-flat-view-field-metadata-maps.util.ts`:
```ts
import { computeStandardProductViewFields } from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field/compute-standard-product-view-fields.util';
```
```ts
  product: computeStandardProductViewFields,
```

In `build-standard-flat-view-field-group-metadata-maps.util.ts`:
```ts
import { computeStandardProductViewFieldGroups } from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/compute-standard-product-view-field-groups.util';
```
```ts
  product: computeStandardProductViewFieldGroups,
```

- [ ] **Step 14: Create and register the index-metadata builder**

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/index/compute-product-standard-flat-index-metadata.util.ts`:
```ts
import { type FlatIndexMetadata } from 'src/engine/metadata-modules/flat-index-metadata/types/flat-index-metadata.type';
import { type AllStandardObjectIndexName } from 'src/engine/workspace-manager/twenty-standard-application/types/all-standard-object-index-name.type';
import {
  type CreateStandardIndexArgs,
  createStandardIndexFlatMetadata,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/index/create-standard-index-flat-metadata.util';

export const buildProductStandardFlatIndexMetadatas = ({
  now,
  objectName,
  workspaceId,
  standardObjectMetadataRelatedEntityIds,
  dependencyFlatEntityMaps,
  twentyStandardApplicationId,
}: Omit<CreateStandardIndexArgs<'product'>, 'context'>): Record<
  AllStandardObjectIndexName<'product'>,
  FlatIndexMetadata
> => ({
  costTemplateIdIndex: createStandardIndexFlatMetadata({
    objectName,
    workspaceId,
    context: {
      indexName: 'costTemplateIdIndex',
      relatedFieldNames: ['costTemplate'],
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
});
```

Register in `build-standard-flat-index-metadata-maps.util.ts`:
```ts
import { buildProductStandardFlatIndexMetadatas } from 'src/engine/workspace-manager/twenty-standard-application/utils/index/compute-product-standard-flat-index-metadata.util';
```
```ts
  product: buildProductStandardFlatIndexMetadatas,
```

- [ ] **Step 15: Create and register the page-layout config**

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/page-layout-config/standard-product-page-layout.config.ts`:
```ts
import {
  STANDARD_OBJECTS,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-shared/metadata';
import { PageLayoutType } from 'twenty-shared/types';

import {
  TAB_PROPS,
  WIDGET_PROPS,
} from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-page-layout-tabs.template';
import {
  type StandardPageLayoutConfig,
  type StandardPageLayoutTabConfig,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/page-layout-config/standard-page-layout-config.type';

const PRODUCT_PAGE_TABS = {
  home: {
    universalIdentifier:
      STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.productRecordPage.tabs.home
        .universalIdentifier,
    ...TAB_PROPS.home,
    widgets: {
      fields: {
        universalIdentifier:
          STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.productRecordPage.tabs
            .home.widgets.fields.universalIdentifier,
        ...WIDGET_PROPS.fields,
      },
    },
  },
} as const satisfies Record<string, StandardPageLayoutTabConfig>;

export const STANDARD_PRODUCT_PAGE_LAYOUT_CONFIG = {
  name: 'Default Product Layout',
  type: PageLayoutType.RECORD_PAGE,
  objectUniversalIdentifier: STANDARD_OBJECTS.product.universalIdentifier,
  universalIdentifier:
    STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.productRecordPage
      .universalIdentifier,
  defaultTabUniversalIdentifier: null,
  tabs: PRODUCT_PAGE_TABS,
} as const satisfies StandardPageLayoutConfig;
```

In `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/page-layout-config/index.ts`, add:
```ts
export { STANDARD_PRODUCT_PAGE_LAYOUT_CONFIG } from './standard-product-page-layout.config';
```

In `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/constants/standard-page-layout.constant.ts`, add `STANDARD_PRODUCT_PAGE_LAYOUT_CONFIG` to the import block and add to `STANDARD_PAGE_LAYOUTS`:
```ts
  productRecordPage: STANDARD_PRODUCT_PAGE_LAYOUT_CONFIG,
```

- [ ] **Step 16: Register the icon**

```ts
  product: 'IconPackage',
```

- [ ] **Step 17: Write the metadata-build test**

Create `packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/__tests__/compute-product-standard-metadata.spec.ts`:

```ts
import {
  STANDARD_OBJECTS,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-shared/metadata';
import { type FieldMetadataType, RelationOnDeleteAction } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { WidgetConfigurationType } from 'src/engine/metadata-modules/page-layout-widget/enums/widget-configuration-type.type';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';

const WORKSPACE_ID = '20202020-1111-4111-8111-111111111111';
const TWENTY_STANDARD_APPLICATION_ID = '20202020-2222-4222-8222-222222222222';
const NOW = '2024-01-01T00:00:00.000Z';

describe('Product standard metadata build', () => {
  const { allFlatEntityMaps } =
    computeTwentyStandardApplicationAllFlatEntityMaps({
      now: NOW,
      workspaceId: WORKSPACE_ID,
      twentyStandardApplicationId: TWENTY_STANDARD_APPLICATION_ID,
    });

  it('builds the product object', () => {
    const { byUniversalIdentifier } = allFlatEntityMaps.flatObjectMetadataMaps;

    expect(
      byUniversalIdentifier[STANDARD_OBJECTS.product.universalIdentifier],
    ).toBeDefined();
  });

  it('is searchable', () => {
    const product =
      allFlatEntityMaps.flatObjectMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.product.universalIdentifier
      ];

    expect(product?.isSearchable).toBe(true);
  });

  it('links product to a costTemplate as a nullable, SET_NULL-on-delete relation', () => {
    const costTemplateField = allFlatEntityMaps.flatFieldMetadataMaps
      .byUniversalIdentifier[
      STANDARD_OBJECTS.product.fields.costTemplate.universalIdentifier
    ] as FlatFieldMetadata<FieldMetadataType.RELATION> | undefined;

    expect(costTemplateField).toBeDefined();
    expect(costTemplateField?.settings?.onDelete).toBe(
      RelationOnDeleteAction.SET_NULL,
    );
  });

  it('indexes the costTemplate foreign key', () => {
    const costTemplateIdIndex =
      allFlatEntityMaps.flatIndexMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.product.indexes.costTemplateIdIndex.universalIdentifier
      ];

    expect(costTemplateIdIndex).toBeDefined();
  });

  it('gives costTemplate a reverse products relation', () => {
    const productsField =
      allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.costTemplate.fields.products.universalIdentifier
      ];

    expect(productsField).toBeDefined();
  });

  it('keeps the product table view focused on name, sku, basePrice, isActive', () => {
    const viewFieldFieldUniversalIdentifiers = Object.values(
      allFlatEntityMaps.flatViewFieldMaps.byUniversalIdentifier,
    )
      .filter(isDefined)
      .filter(
        (viewField) =>
          viewField.viewUniversalIdentifier ===
          STANDARD_OBJECTS.product.views.allProducts.universalIdentifier,
      )
      .map((viewField) => viewField.fieldMetadataUniversalIdentifier);

    expect(viewFieldFieldUniversalIdentifiers).toHaveLength(4);
    expect(viewFieldFieldUniversalIdentifiers).toEqual(
      expect.arrayContaining([
        STANDARD_OBJECTS.product.fields.name.universalIdentifier,
        STANDARD_OBJECTS.product.fields.sku.universalIdentifier,
        STANDARD_OBJECTS.product.fields.basePrice.universalIdentifier,
        STANDARD_OBJECTS.product.fields.isActive.universalIdentifier,
      ]),
    );
  });

  it('links the product fields widget to its record-page fields view', () => {
    const fieldsWidget =
      allFlatEntityMaps.flatPageLayoutWidgetMaps.byUniversalIdentifier[
        STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.productRecordPage.tabs.home
          .widgets.fields.universalIdentifier
      ];

    expect(fieldsWidget?.universalConfiguration).toMatchObject({
      configurationType: WidgetConfigurationType.FIELDS,
      viewUniversalIdentifier:
        STANDARD_OBJECTS.product.views.productRecordPageFields
          .universalIdentifier,
    });
  });
});
```

- [ ] **Step 18: Run tests**

Run: `npx jest packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/__tests__/compute-product-standard-metadata.spec.ts packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/__tests__/compute-cost-template-standard-metadata.spec.ts packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/__tests__/compute-cost-template-field-standard-metadata.spec.ts packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/__tests__/compute-cost-template-step-standard-metadata.spec.ts --config=packages/twenty-server/jest.config.mjs`
Expected: all PASS.

- [ ] **Step 19: Typecheck and lint**

Same commands as before.

- [ ] **Step 20: Commit**

```bash
git add packages/twenty-shared packages/twenty-server/src/modules/quote/standard-objects packages/twenty-server/src/engine/workspace-manager/twenty-standard-application packages/twenty-server/src/engine/workspace-manager/workspace-migration/constant/standard-object-icons.ts
git commit -m "feat: add Product standard object"
```

---

## Task 5: CostTemplate write-time validation (unique variable names, single output step)

**Files:**
- Create: `packages/twenty-server/src/modules/quote/cost-template-validation/services/cost-template-validation.service.ts`
- Test: `packages/twenty-server/src/modules/quote/cost-template-validation/services/__tests__/cost-template-validation.service.spec.ts`
- Create: `packages/twenty-server/src/modules/quote/query-hooks/cost-template-field-create-one.pre-query.hook.ts`
- Create: `packages/twenty-server/src/modules/quote/query-hooks/cost-template-field-update-one.pre-query.hook.ts`
- Create: `packages/twenty-server/src/modules/quote/query-hooks/cost-template-step-create-one.pre-query.hook.ts`
- Create: `packages/twenty-server/src/modules/quote/query-hooks/cost-template-step-update-one.pre-query.hook.ts`
- Create: `packages/twenty-server/src/modules/quote/query-hooks/quote-query-hook.module.ts`
- Modify: `packages/twenty-server/src/engine/api/graphql/workspace-query-runner/workspace-query-hook/workspace-query-hook.module.ts`

**Interfaces:**
- Consumes: workspace ORM access to `costTemplateField`/`costTemplateStep` repositories (via `WorkspaceQueryHookInstance`'s injected services, following the Blocklist pre-query-hook pattern); `CostTemplateFieldType` from Task 2's workspace-entity; `costTemplateId`, `variableName`, `isOutput` fields from Tasks 2-3.
- Produces: `CostTemplateValidationService.validateUniqueVariableNames(costTemplateId, candidateVariableName, excludeRecordId, authContext)` and `CostTemplateValidationService.validateSingleOutputStep(costTemplateId, isCreatingOrSettingOutput, excludeRecordId, authContext)`, both throwing `CommonQueryRunnerException` with `CommonQueryRunnerExceptionCode.INVALID_QUERY_INPUT` (or the closest matching existing code — check `CommonQueryRunnerExceptionCode`'s members in `src/engine/api/common/common-query-runners/errors/common-query-runner.exception.ts` and use the validation/bad-input one) on violation, used by 4 pre-query hooks.

- [ ] **Step 1: Check the exact validation exception code available**

Run: `grep -n "enum CommonQueryRunnerExceptionCode" -A 15 packages/twenty-server/src/engine/api/common/common-query-runners/errors/common-query-runner.exception.ts`

Use whichever code is semantically closest to "bad user input on a mutation" (e.g. `INVALID_QUERY_INPUT` or similar — pick from the actual enum, do not invent a value not present there).

- [ ] **Step 2: Write the failing service test**

Create `packages/twenty-server/src/modules/quote/cost-template-validation/services/__tests__/cost-template-validation.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';

import { CommonQueryRunnerException } from 'src/engine/api/common/common-query-runners/errors/common-query-runner.exception';
import { TwentyORMManager } from 'src/engine/twenty-orm/twenty-orm.manager';
import { CostTemplateValidationService } from 'src/modules/quote/cost-template-validation/services/cost-template-validation.service';

describe('CostTemplateValidationService', () => {
  let service: CostTemplateValidationService;
  let costTemplateFieldRepository: {
    findOne: jest.Mock;
    count: jest.Mock;
  };
  let costTemplateStepRepository: {
    findOne: jest.Mock;
    count: jest.Mock;
  };

  beforeEach(async () => {
    costTemplateFieldRepository = { findOne: jest.fn(), count: jest.fn() };
    costTemplateStepRepository = { findOne: jest.fn(), count: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CostTemplateValidationService,
        {
          provide: TwentyORMManager,
          useValue: {
            getRepository: jest.fn((objectName: string) =>
              objectName === 'costTemplateField'
                ? costTemplateFieldRepository
                : costTemplateStepRepository,
            ),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(CostTemplateValidationService);
  });

  describe('validateUniqueVariableNames', () => {
    it('throws when another field on the same cost template already uses the variable name', async () => {
      costTemplateFieldRepository.count.mockResolvedValue(0);
      costTemplateStepRepository.count.mockResolvedValue(1);

      await expect(
        service.validateUniqueVariableNames({
          costTemplateId: 'cost-template-1',
          variableName: 'quantity',
          excludeRecordId: null,
        }),
      ).rejects.toThrow(CommonQueryRunnerException);
    });

    it('passes when the variable name is unused in the cost template', async () => {
      costTemplateFieldRepository.count.mockResolvedValue(0);
      costTemplateStepRepository.count.mockResolvedValue(0);

      await expect(
        service.validateUniqueVariableNames({
          costTemplateId: 'cost-template-1',
          variableName: 'quantity',
          excludeRecordId: null,
        }),
      ).resolves.not.toThrow();
    });

    it('excludes the record being updated from the collision check', async () => {
      costTemplateFieldRepository.count.mockResolvedValue(0);
      costTemplateStepRepository.count.mockResolvedValue(0);

      await service.validateUniqueVariableNames({
        costTemplateId: 'cost-template-1',
        variableName: 'quantity',
        excludeRecordId: 'field-being-updated',
      });

      expect(costTemplateFieldRepository.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            costTemplateId: 'cost-template-1',
            variableName: 'quantity',
          }),
        }),
      );
    });
  });

  describe('validateSingleOutputStep', () => {
    it('throws when another step on the same cost template is already the output', async () => {
      costTemplateStepRepository.count.mockResolvedValue(1);

      await expect(
        service.validateSingleOutputStep({
          costTemplateId: 'cost-template-1',
          excludeRecordId: null,
        }),
      ).rejects.toThrow(CommonQueryRunnerException);
    });

    it('passes when no other step on the cost template is the output', async () => {
      costTemplateStepRepository.count.mockResolvedValue(0);

      await expect(
        service.validateSingleOutputStep({
          costTemplateId: 'cost-template-1',
          excludeRecordId: null,
        }),
      ).resolves.not.toThrow();
    });
  });
});
```

- [ ] **Step 3: Run the test to see it fail**

Run: `npx jest packages/twenty-server/src/modules/quote/cost-template-validation/services/__tests__/cost-template-validation.service.spec.ts --config=packages/twenty-server/jest.config.mjs`
Expected: FAIL — `Cannot find module 'src/modules/quote/cost-template-validation/services/cost-template-validation.service'`.

- [ ] **Step 4: Implement the validation service**

Create `packages/twenty-server/src/modules/quote/cost-template-validation/services/cost-template-validation.service.ts`:

```ts
import { Injectable } from '@nestjs/common';

import { msg } from '@lingui/core/macro';

import {
  CommonQueryRunnerException,
  CommonQueryRunnerExceptionCode,
} from 'src/engine/api/common/common-query-runners/errors/common-query-runner.exception';
import { TwentyORMManager } from 'src/engine/twenty-orm/twenty-orm.manager';

type ValidateUniqueVariableNamesArgs = {
  costTemplateId: string;
  variableName: string;
  excludeRecordId: string | null;
};

type ValidateSingleOutputStepArgs = {
  costTemplateId: string;
  excludeRecordId: string | null;
};

@Injectable()
export class CostTemplateValidationService {
  constructor(private readonly twentyORMManager: TwentyORMManager) {}

  async validateUniqueVariableNames({
    costTemplateId,
    variableName,
    excludeRecordId,
  }: ValidateUniqueVariableNamesArgs): Promise<void> {
    const costTemplateFieldRepository =
      this.twentyORMManager.getRepository('costTemplateField');
    const costTemplateStepRepository =
      this.twentyORMManager.getRepository('costTemplateStep');

    const [fieldCollisionCount, stepCollisionCount] = await Promise.all([
      costTemplateFieldRepository.count({
        where: {
          costTemplateId,
          variableName,
          ...(excludeRecordId ? { id: { not: excludeRecordId } } : {}),
        },
      }),
      costTemplateStepRepository.count({
        where: {
          costTemplateId,
          variableName,
          ...(excludeRecordId ? { id: { not: excludeRecordId } } : {}),
        },
      }),
    ]);

    if (fieldCollisionCount + stepCollisionCount > 0) {
      throw new CommonQueryRunnerException(
        `Variable name "${variableName}" is already used by another field or step on this cost template`,
        CommonQueryRunnerExceptionCode.INVALID_QUERY_INPUT,
        {
          userFriendlyMessage: msg`This variable name is already used by another field or step on this cost template.`,
        },
      );
    }
  }

  async validateSingleOutputStep({
    costTemplateId,
    excludeRecordId,
  }: ValidateSingleOutputStepArgs): Promise<void> {
    const costTemplateStepRepository =
      this.twentyORMManager.getRepository('costTemplateStep');

    const existingOutputStepCount = await costTemplateStepRepository.count({
      where: {
        costTemplateId,
        isOutput: true,
        ...(excludeRecordId ? { id: { not: excludeRecordId } } : {}),
      },
    });

    if (existingOutputStepCount > 0) {
      throw new CommonQueryRunnerException(
        `Cost template ${costTemplateId} already has an output step`,
        CommonQueryRunnerExceptionCode.INVALID_QUERY_INPUT,
        {
          userFriendlyMessage: msg`This cost template already has an output step. Unmark the existing one before setting a new one.`,
        },
      );
    }
  }
}
```

Use the exact `CommonQueryRunnerExceptionCode` member found in Step 1 if it differs from `INVALID_QUERY_INPUT`.

- [ ] **Step 5: Run the test to see it pass**

Run: `npx jest packages/twenty-server/src/modules/quote/cost-template-validation/services/__tests__/cost-template-validation.service.spec.ts --config=packages/twenty-server/jest.config.mjs`
Expected: all PASS. If `getRepository`'s call signature or `count`'s `where`/`not` shape don't match the real `TwentyORMManager`/repository API, check `src/engine/twenty-orm/twenty-orm.manager.ts` and an existing repository usage (e.g. `blocklist-validation.service.ts`) and adjust both the service and this test's mocks to match the real signatures — the test above encodes the intended behavior, not a verified-correct method signature.

- [ ] **Step 6: Create the four pre-query hooks**

Create `packages/twenty-server/src/modules/quote/query-hooks/cost-template-field-create-one.pre-query.hook.ts`:
```ts
import { type WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { type CreateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { CostTemplateValidationService } from 'src/modules/quote/cost-template-validation/services/cost-template-validation.service';

type CostTemplateFieldPayload = {
  costTemplateId: string;
  variableName: string;
};

@WorkspaceQueryHook('costTemplateField.createOne')
export class CostTemplateFieldCreateOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  constructor(
    private readonly costTemplateValidationService: CostTemplateValidationService,
  ) {}

  async execute(
    _authContext: WorkspaceAuthContext,
    _objectName: string,
    payload: CreateOneResolverArgs<CostTemplateFieldPayload>,
  ): Promise<CreateOneResolverArgs<CostTemplateFieldPayload>> {
    await this.costTemplateValidationService.validateUniqueVariableNames({
      costTemplateId: payload.data.costTemplateId,
      variableName: payload.data.variableName,
      excludeRecordId: null,
    });

    return payload;
  }
}
```

Create `cost-template-field-update-one.pre-query.hook.ts` following the same shape, hook name `'costTemplateField.updateOne'`, implementing `WorkspacePreQueryHookInstance` for the update resolver args shape (check `src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface.ts` for the exact `UpdateOneResolverArgs` type — it carries `id` and `data`), calling `validateUniqueVariableNames` with `excludeRecordId: payload.id` and `variableName`/`costTemplateId` read from `payload.data` (only when those fields are present in the partial update payload — skip validation if `variableName` is `undefined` in this update, since it isn't changing).

Create `cost-template-step-create-one.pre-query.hook.ts` and `cost-template-step-update-one.pre-query.hook.ts` following the same two shapes, hook names `'costTemplateStep.createOne'` / `'costTemplateStep.updateOne'`, each calling **both** `validateUniqueVariableNames` (same as the field hooks) **and**, only when the payload's `isOutput` is `true`, `validateSingleOutputStep`.

- [ ] **Step 7: Create the module and register it**

Create `packages/twenty-server/src/modules/quote/query-hooks/quote-query-hook.module.ts`:
```ts
import { Module } from '@nestjs/common';

import { CostTemplateValidationService } from 'src/modules/quote/cost-template-validation/services/cost-template-validation.service';
import { CostTemplateFieldCreateOnePreQueryHook } from 'src/modules/quote/query-hooks/cost-template-field-create-one.pre-query.hook';
import { CostTemplateFieldUpdateOnePreQueryHook } from 'src/modules/quote/query-hooks/cost-template-field-update-one.pre-query.hook';
import { CostTemplateStepCreateOnePreQueryHook } from 'src/modules/quote/query-hooks/cost-template-step-create-one.pre-query.hook';
import { CostTemplateStepUpdateOnePreQueryHook } from 'src/modules/quote/query-hooks/cost-template-step-update-one.pre-query.hook';

@Module({
  providers: [
    CostTemplateValidationService,
    CostTemplateFieldCreateOnePreQueryHook,
    CostTemplateFieldUpdateOnePreQueryHook,
    CostTemplateStepCreateOnePreQueryHook,
    CostTemplateStepUpdateOnePreQueryHook,
  ],
})
export class QuoteQueryHookModule {}
```

Register it in `packages/twenty-server/src/engine/api/graphql/workspace-query-runner/workspace-query-hook/workspace-query-hook.module.ts`: add the import and add `QuoteQueryHookModule` to the `imports` array (same pattern as `BlocklistQueryHookModule`).

- [ ] **Step 8: Typecheck and lint**

Run: `npx tsgo -p packages/twenty-server/tsconfig.json --noEmit`
Run: `npx nx lint:diff-with-main twenty-server --configuration=fix`
Expected: both clean. Pay special attention to `TwentyORMManager.getRepository`'s real generic signature (Task 2's research noted it's called as `getRepository<SomeWorkspaceEntity>('objectNameString')` elsewhere in the codebase) — adjust Step 4/6's code if the typechecker disagrees with the shape assumed above.

- [ ] **Step 9: Commit**

```bash
git add packages/twenty-server/src/modules/quote/cost-template-validation packages/twenty-server/src/modules/quote/query-hooks packages/twenty-server/src/engine/api/graphql/workspace-query-runner/workspace-query-hook/workspace-query-hook.module.ts
git commit -m "feat: validate unique variable names and single output step on cost templates"
```

---

## Task 6: Manual end-to-end verification

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Reset the dev database**

Run: `npx nx database:reset twenty-server`
Expected: succeeds — a fresh workspace is provisioned, which runs the full standard-application build from Tasks 1-4 against a real database (this exercises the TypeORM/workspace-migration path that the unit tests in Tasks 1-4 don't touch).

- [ ] **Step 2: Start the server**

Run: `npx nx start twenty-server` (leave running; use a second terminal/background process for the next steps).

- [ ] **Step 3: Create a CostTemplate, a CostTemplateField, a CostTemplateStep, and a Product via GraphQL**

Using the GraphQL playground (or `curl` against the local GraphQL endpoint with a valid auth token from a logged-in session), run in order:
1. `createCostTemplate(data: { name: "Per-seat SaaS", description: "Simple per-seat pricing" })`
2. `createCostTemplateField(data: { costTemplateId: "<id from 1>", name: "Seats", variableName: "seats", fieldType: NUMBER, isRequired: true })`
3. `createCostTemplateStep(data: { costTemplateId: "<id from 1>", name: "Total", variableName: "total", formula: "seats * 10", isOutput: true })`
4. `createProduct(data: { name: "Pro Plan", sku: "PRO-1", basePrice: { amountMicros: 0, currencyCode: "USD" }, costTemplateId: "<id from 1>" })`

Expected: all four mutations succeed and return the created records with the relations populated (querying `costTemplate { fields { edges { node { name } } } steps { edges { node { name } } } products { edges { node { name } } } }` on the CostTemplate shows all three linked records).

- [ ] **Step 4: Verify the validation hooks from Task 5**

Attempt `createCostTemplateField(data: { costTemplateId: "<same id>", name: "Seats Again", variableName: "seats", fieldType: NUMBER })` (same `variableName` as Step 3.2).
Expected: the mutation fails with the "already used" validation error from Task 5.

Attempt `createCostTemplateStep(data: { costTemplateId: "<same id>", name: "Total 2", variableName: "total2", formula: "seats * 20", isOutput: true })` (a second output step).
Expected: the mutation fails with the "already has an output step" validation error from Task 5.

- [ ] **Step 5: Note the outcome**

If Steps 3-4 reveal a mismatch between this plan's assumed GraphQL mutation shapes (field names, nested input shapes like `CurrencyMetadata`) and the real generated schema, that's expected — the schema is generated from the metadata built in Tasks 1-4, so adjust the mutation calls to match whatever `npx nx run twenty-front:graphql:generate` / the GraphQL playground's schema browser shows, not this plan's guesses. No code change is implied unless the *hook* behavior itself (Task 5) is wrong.

---

## Out of scope for this plan (deferred)

- **Backfilling already-provisioned workspaces**: these 4 objects are automatically included in every *newly created* workspace (via the standard-application build exercised in Task 6). An already-existing workspace (e.g. one created before this code merged) will not retroactively get them without a hand-authored `RegisteredWorkspaceCommand` (see `packages/twenty-server/docs/UPGRADE_COMMANDS.md`) that syncs the new standard objects into it — following the pattern of similar commands under `packages/twenty-server/src/database/commands/upgrade-version-command/`. Add this before shipping to any environment with pre-existing workspaces (e.g. before merging to a branch that gets deployed). Local dev is unaffected since `database:reset` provisions from scratch.
- **Nx navigation / command-menu-item wiring** so these objects appear in the left nav or Cmd-K — deliberately skipped for v1 per the spec's YAGNI framing; add via the `flat-command-menu-item` builder pattern if/when needed.
- **Timeline/Notes/Tasks/Attachments target relations** on these 4 objects — skipped to keep this plan bounded; add later the same way Task 2/3/4 added the `costTemplate` reverse relations, if the product decides these objects need activity tracking.
- Everything in spec phases 2-6 (calculation engine, Quote/QuoteLine, proposal templates, PDF export, frontend) — separate plans, written after this one lands.
