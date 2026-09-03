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
  // DB-level backstop for the hook-level uniqueness check in
  // CostTemplateValidationService.validateUniqueVariableNames — the hooks
  // read-then-write outside the write transaction, so two concurrent
  // createOne calls can both pass validation and both insert. This only
  // needs to hold within this table; the cross-table (field vs. step)
  // collision is already covered by the hook-level check.
  variableNameUniqueIndex: createStandardIndexFlatMetadata({
    objectName,
    workspaceId,
    context: {
      indexName: 'variableNameUniqueIndex',
      relatedFieldNames: ['costTemplate', 'variableName'],
      isUnique: true,
      indexWhereClause: '"deletedAt" IS NULL',
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  // No DB-level unique index for "at most one output step per template":
  // Twenty's upsert-matching (get-conflicting-fields.util.ts) derives
  // upsert keys from every isUnique index while ignoring indexWhereClause,
  // so a single-column unique index on costTemplate alone (needed to
  // express this partial-uniqueness rule) would make costTemplateId a
  // de-facto global upsert key and corrupt CSV import (upsert: true).
  // Enforcement stays at the hook level only
  // (CostTemplateValidationService.validateSingleOutputStep).
});
