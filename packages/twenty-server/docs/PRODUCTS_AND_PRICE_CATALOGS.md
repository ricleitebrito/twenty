# Products & Price Catalogs (Salesforce-inspired)

This document describes the standard objects added to model **Products**, **Price Catalogs** and the
many-to-many relationship between them, inspired by the Salesforce data model.

## Data model

```
Product ──< PriceCatalogEntry >── PriceCatalog
                (unitPrice, isActive)
```

| Twenty object       | Salesforce equivalent | Role                                                        |
| ------------------- | --------------------- | ----------------------------------------------------------- |
| `product`           | `Product2`            | A sellable product / service.                               |
| `priceCatalog`      | `Pricebook2`          | A named catalog grouping prices (e.g. "Retail", "Partner"). |
| `priceCatalogEntry` | `PricebookEntry`      | Junction: one product priced inside one catalog.            |

Twenty has **no native many-to-many** relation type — n-n is always realized with a junction object
(see `taskTarget`, `messageChannelMessageAssociation`). `priceCatalogEntry` plays that role here, and,
like the Salesforce `PricebookEntry`, it carries the **unit price**, so the same product can have
different prices in different catalogs.

### Fields

- **product**: `name` (label identifier), `productCode`, `description`, `family` (SELECT:
  HARDWARE / SOFTWARE / SERVICE / SUBSCRIPTION / OTHER), `isActive` (BOOLEAN), `unitOfMeasure`,
  plus base/audit fields, `searchVector`, and `priceCatalogEntries` (ONE_TO_MANY).
- **priceCatalog**: `name` (label identifier), `description`, `isActive` (BOOLEAN),
  `isStandard` (BOOLEAN — the default catalog, like the Salesforce Standard Pricebook),
  plus base/audit fields, `searchVector`, and `priceCatalogEntries` (ONE_TO_MANY).
- **priceCatalogEntry**: `unitPrice` (CURRENCY), `isActive` (BOOLEAN),
  `product` (MANY_TO_ONE → product), `priceCatalog` (MANY_TO_ONE → priceCatalog), plus base/audit
  fields. Label identifier is `id` (junction object convention).

## Architecture: how standard objects are declared

The source of truth for every standard object is `STANDARD_OBJECTS` in
`packages/twenty-shared/src/metadata/constants/standard-object.constant.ts`. Each object lists fixed
`universalIdentifier` UUIDs for the object, every field, every index, and every view/viewField. All the
backend types (`AllStandardObjectName`, `AllStandardObjectFieldName`, …) are derived from it, so adding
a key there drives compiler-enforced requirements across the metadata builders in
`packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/`.

> ⚠️ Never mutate or reuse an existing `universalIdentifier`. Always generate fresh UUIDs.

Builders touched when adding these objects:

| Concern         | File / map                                                                                | Required?                   |
| --------------- | ----------------------------------------------------------------------------------------- | --------------------------- |
| Object metadata | `utils/object-metadata/create-standard-flat-object-metadata.util.ts`                      | Yes (`satisfies`, no `?`)   |
| Field metadata  | `utils/field-metadata/compute-*-field-metadata.util.ts` + `build-…-maps.util.ts`          | Yes (`satisfies`, no `?`)   |
| Indexes         | `utils/index/compute-*-index-metadata.util.ts` + `build-…-maps.util.ts`                   | Optional (FKs / search GIN) |
| Views           | `utils/view/compute-standard-*-views.util.ts` + `build-…-maps.util.ts`                    | Needed for the UI table     |
| View fields     | `utils/view-field/compute-standard-*-view-fields.util.ts` + `build-…-maps.util.ts`        | Needed for the UI table     |
| Navigation      | `constants/standard-navigation-menu-item.constant.ts` + `navigation-menu-item/build-…`    | Needed to show in sidebar   |

The backend `*.workspace-entity.ts` classes (under `src/modules/product` and `src/modules/price-catalog`)
are TypeScript typing helpers for ORM access — they are no longer registered in a central array.

## Applying to an existing database (no data loss)

`TwentyStandardApplicationService.synchronizeTwentyStandardApplicationOrThrow` computes the target
standard-application metadata and **diffs** it against the cached current state, then runs an incremental
workspace migration. New objects/tables/columns are created; existing tables and data are untouched.

- On **new workspace creation** this runs automatically (`workspace-manager.service.ts`).
- For **existing workspaces** an upgrade workspace command
  (`@RegisteredWorkspaceCommand`) re-runs the sync per workspace:
  `upgrade:<version>:sync-products-price-catalogs`. See `UPGRADE_COMMANDS.md`.

## Verification checklist

1. `npx nx build twenty-shared`
2. `npx nx typecheck twenty-server` (the `satisfies AllStandardObjectName` clauses fail the build if a
   builder is missing)
3. `npx nx lint:diff-with-main twenty-server` / `twenty-shared`
4. Run the upgrade command (or dev sync) and confirm via the Postgres MCP that `product`, `priceCatalog`
   and `priceCatalogEntry` tables exist in the workspace schema with the FK indexes — and that existing
   tables/data are intact.
5. `npx nx run twenty-front:graphql:generate`
6. In the UI: create a Product, a Price Catalog, then a Price Catalog Entry linking both with a unit
   price; confirm the same product appears in multiple catalogs at different prices.
