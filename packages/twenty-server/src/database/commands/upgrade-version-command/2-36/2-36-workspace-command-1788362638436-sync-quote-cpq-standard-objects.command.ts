import { Command } from 'nest-commander';

import { getSearchFieldUniversalIdentifier } from 'twenty-shared/application';
import {
  STANDARD_OBJECTS,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-shared/metadata';
import { isDefined } from 'twenty-shared/utils';

import { ProvisionedWorkspaceCommandRunner } from 'src/database/commands/command-runners/provisioned-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { getStandardFlatEntitiesToCreateOrThrow } from 'src/database/commands/upgrade-version-command/2-10/utils/get-standard-flat-entities-to-create-or-throw.util';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { RegisteredWorkspaceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-workspace-command.decorator';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatIndexMetadata } from 'src/engine/metadata-modules/flat-index-metadata/types/flat-index-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { type FlatPageLayoutTab } from 'src/engine/metadata-modules/flat-page-layout-tab/types/flat-page-layout-tab.type';
import { type FlatPageLayoutWidget } from 'src/engine/metadata-modules/flat-page-layout-widget/types/flat-page-layout-widget.type';
import { type FlatPageLayout } from 'src/engine/metadata-modules/flat-page-layout/types/flat-page-layout.type';
import { type FlatSearchFieldMetadata } from 'src/engine/metadata-modules/flat-search-field-metadata/types/flat-search-field-metadata.type';
import { type FlatViewFieldGroup } from 'src/engine/metadata-modules/flat-view-field-group/types/flat-view-field-group.type';
import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import { type FlatView } from 'src/engine/metadata-modules/flat-view/types/flat-view.type';
import { SEARCH_FIELDS_BY_STANDARD_OBJECT_NAME } from 'src/engine/workspace-manager/twenty-standard-application/constants/search-fields-by-standard-object-name.constant';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

const QUOTE_CPQ_STANDARD_OBJECT_NAMES = [
  'costTemplate',
  'costTemplateField',
  'costTemplateStep',
  'product',
] as const;

const getUniversalIdentifiers = (
  entitiesByName: Record<string, { universalIdentifier: string }>,
): string[] =>
  Object.values(entitiesByName).map((entity) => entity.universalIdentifier);

const QUOTE_CPQ_OBJECT_METADATA_UNIVERSAL_IDENTIFIERS = [
  STANDARD_OBJECTS.costTemplate.universalIdentifier,
  STANDARD_OBJECTS.costTemplateField.universalIdentifier,
  STANDARD_OBJECTS.costTemplateStep.universalIdentifier,
  STANDARD_OBJECTS.product.universalIdentifier,
];

const QUOTE_CPQ_FIELD_METADATA_UNIVERSAL_IDENTIFIERS = [
  ...getUniversalIdentifiers(STANDARD_OBJECTS.costTemplate.fields),
  ...getUniversalIdentifiers(STANDARD_OBJECTS.costTemplateField.fields),
  ...getUniversalIdentifiers(STANDARD_OBJECTS.costTemplateStep.fields),
  ...getUniversalIdentifiers(STANDARD_OBJECTS.product.fields),
];

const QUOTE_CPQ_INDEX_UNIVERSAL_IDENTIFIERS = [
  ...getUniversalIdentifiers(STANDARD_OBJECTS.costTemplate.indexes),
  ...getUniversalIdentifiers(STANDARD_OBJECTS.costTemplateField.indexes),
  ...getUniversalIdentifiers(STANDARD_OBJECTS.costTemplateStep.indexes),
  ...getUniversalIdentifiers(STANDARD_OBJECTS.product.indexes),
];

const QUOTE_CPQ_VIEW_UNIVERSAL_IDENTIFIERS = [
  STANDARD_OBJECTS.costTemplate.views.allCostTemplates.universalIdentifier,
  STANDARD_OBJECTS.costTemplate.views.costTemplateRecordPageFields
    .universalIdentifier,
  STANDARD_OBJECTS.costTemplateField.views.allCostTemplateFields
    .universalIdentifier,
  STANDARD_OBJECTS.costTemplateField.views.costTemplateFieldRecordPageFields
    .universalIdentifier,
  STANDARD_OBJECTS.costTemplateStep.views.allCostTemplateSteps
    .universalIdentifier,
  STANDARD_OBJECTS.costTemplateStep.views.costTemplateStepRecordPageFields
    .universalIdentifier,
  STANDARD_OBJECTS.product.views.allProducts.universalIdentifier,
  STANDARD_OBJECTS.product.views.productRecordPageFields.universalIdentifier,
];

const QUOTE_CPQ_VIEW_FIELD_GROUP_UNIVERSAL_IDENTIFIERS = [
  ...getUniversalIdentifiers(
    STANDARD_OBJECTS.costTemplate.views.costTemplateRecordPageFields
      .viewFieldGroups,
  ),
  ...getUniversalIdentifiers(
    STANDARD_OBJECTS.costTemplateField.views.costTemplateFieldRecordPageFields
      .viewFieldGroups,
  ),
  ...getUniversalIdentifiers(
    STANDARD_OBJECTS.costTemplateStep.views.costTemplateStepRecordPageFields
      .viewFieldGroups,
  ),
  ...getUniversalIdentifiers(
    STANDARD_OBJECTS.product.views.productRecordPageFields.viewFieldGroups,
  ),
];

const QUOTE_CPQ_VIEW_FIELD_UNIVERSAL_IDENTIFIERS = [
  ...getUniversalIdentifiers(
    STANDARD_OBJECTS.costTemplate.views.allCostTemplates.viewFields,
  ),
  ...getUniversalIdentifiers(
    STANDARD_OBJECTS.costTemplate.views.costTemplateRecordPageFields
      .viewFields,
  ),
  ...getUniversalIdentifiers(
    STANDARD_OBJECTS.costTemplateField.views.allCostTemplateFields.viewFields,
  ),
  ...getUniversalIdentifiers(
    STANDARD_OBJECTS.costTemplateField.views.costTemplateFieldRecordPageFields
      .viewFields,
  ),
  ...getUniversalIdentifiers(
    STANDARD_OBJECTS.costTemplateStep.views.allCostTemplateSteps.viewFields,
  ),
  ...getUniversalIdentifiers(
    STANDARD_OBJECTS.costTemplateStep.views.costTemplateStepRecordPageFields
      .viewFields,
  ),
  ...getUniversalIdentifiers(
    STANDARD_OBJECTS.product.views.allProducts.viewFields,
  ),
  ...getUniversalIdentifiers(
    STANDARD_OBJECTS.product.views.productRecordPageFields.viewFields,
  ),
];

const QUOTE_CPQ_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS = [
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.costTemplateRecordPage
    .universalIdentifier,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.costTemplateFieldRecordPage
    .universalIdentifier,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.costTemplateStepRecordPage
    .universalIdentifier,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.productRecordPage
    .universalIdentifier,
];

const QUOTE_CPQ_PAGE_LAYOUT_TAB_UNIVERSAL_IDENTIFIERS = [
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.costTemplateRecordPage.tabs.home
    .universalIdentifier,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.costTemplateFieldRecordPage.tabs
    .home.universalIdentifier,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.costTemplateStepRecordPage.tabs
    .home.universalIdentifier,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.productRecordPage.tabs.home
    .universalIdentifier,
];

const QUOTE_CPQ_PAGE_LAYOUT_WIDGET_UNIVERSAL_IDENTIFIERS = [
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.costTemplateRecordPage.tabs.home
    .widgets.fields.universalIdentifier,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.costTemplateFieldRecordPage.tabs
    .home.widgets.fields.universalIdentifier,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.costTemplateStepRecordPage.tabs
    .home.widgets.fields.universalIdentifier,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.productRecordPage.tabs.home
    .widgets.fields.universalIdentifier,
];

// This command runs the legacy (skipSideEffectExpandEngine: true) path
// deliberately, not the >=2.19 default, because this create-set already IS
// the full desired state and must not flow through expandWithSideEffects --
// see WorkspaceMigrationValidateBuildAndRunService.validateBuildAndRunLegacyWorkspaceMigration's
// own JSDoc. Two concrete reasons, not a stylistic preference:
// 1. Fresh-workspace provisioning never runs the side-effect engine at all:
//    TwentyStandardApplicationService.synchronizeTwentyStandardApplicationOrThrow
//    calls validateBuildAndRunWorkspaceMigrationFromTo, which has no
//    expandWithSideEffects step (see
//    workspace-migration-validate-build-and-run-service.ts). So a fresh
//    workspace's costTemplate/costTemplateField/costTemplateStep/product
//    state never contains any engine-owned companion (system relations to
//    timelineActivity/attachment/noteTarget/taskTarget, the engine's own
//    default INDEX view, etc) -- routing this backfill through the engine
//    would give upgraded workspaces extra rows fresh ones never get.
// 2. That same standard sync runs with inferDeletionFromMissingEntities:
//    true (twenty-standard-application.service.ts). Extra engine-injected
//    rows this command's create-set doesn't declare would not be part of
//    the standard application's expected state on the NEXT sync, and would
//    become deletion candidates -- silent, delayed data loss, worse than a
//    loud failure at command-run time.
// Several precedents in this same >=2.19 codebase area confirm legacy is
// the right call for this "backfill already-curated standard state" shape,
// not a pre-2.19 leftover: upgrade:2-10:sync-call-recording-standard-objects,
// upgrade:2-25:add-message-campaign-name-field, and the more recent
// upgrade:2-26:demote-and-backfill-application-index-view and
// upgrade:2-31:backfill-record-page, which backfill a twenty-standard
// object's curated view/page-layout stack through the same legacy path for
// the identical reason.
@RegisteredWorkspaceCommand('2.36.0', 1788362638436)
@Command({
  name: 'upgrade:2-36:sync-quote-cpq-standard-objects',
  description:
    'Create the CostTemplate, CostTemplateField, CostTemplateStep and Product standard metadata in existing workspaces',
})
export class SyncQuoteCpqStandardObjectsCommand extends ProvisionedWorkspaceCommandRunner {
  constructor(
    protected readonly workspaceIteratorService: WorkspaceIteratorService,
    private readonly applicationService: ApplicationService,
    private readonly workspaceCacheService: WorkspaceCacheService,
    private readonly workspaceMigrationValidateBuildAndRunService: WorkspaceMigrationValidateBuildAndRunService,
  ) {
    super(workspaceIteratorService);
  }

  override async runOnWorkspace({
    workspaceId,
    options,
  }: RunOnWorkspaceArgs): Promise<void> {
    const isDryRun = options.dryRun ?? false;

    const {
      flatObjectMetadataMaps,
      flatFieldMetadataMaps,
      flatIndexMaps,
      flatViewMaps,
      flatViewFieldMaps,
      flatViewFieldGroupMaps,
      flatPageLayoutMaps,
      flatPageLayoutTabMaps,
      flatPageLayoutWidgetMaps,
      flatSearchFieldMetadataMaps,
    } = await this.workspaceCacheService.getOrRecompute(workspaceId, [
      'flatObjectMetadataMaps',
      'flatFieldMetadataMaps',
      'flatIndexMaps',
      'flatViewMaps',
      'flatViewFieldMaps',
      'flatViewFieldGroupMaps',
      'flatPageLayoutMaps',
      'flatPageLayoutTabMaps',
      'flatPageLayoutWidgetMaps',
      'flatSearchFieldMetadataMaps',
    ]);

    if (
      isDefined(
        flatObjectMetadataMaps.byUniversalIdentifier[
          STANDARD_OBJECTS.costTemplate.universalIdentifier
        ],
      )
    ) {
      this.logger.log(
        `CostTemplate standard object already exists for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    const { twentyStandardFlatApplication } =
      await this.applicationService.findWorkspaceTwentyStandardAndCustomApplicationOrThrow(
        { workspaceId },
      );

    const now = new Date().toISOString();

    const { allFlatEntityMaps: standardAllFlatEntityMaps } =
      computeTwentyStandardApplicationAllFlatEntityMaps({
        now,
        workspaceId,
        twentyStandardApplicationId: twentyStandardFlatApplication.id,
      });

    // Derived from SEARCH_FIELDS_BY_STANDARD_OBJECT_NAME rather than
    // hardcoded per object: costTemplateField/costTemplateStep currently
    // declare no search fields, but this picks up any that are added later
    // without needing an edit here.
    const quoteCpqSearchFieldUniversalIdentifiers =
      QUOTE_CPQ_STANDARD_OBJECT_NAMES.flatMap((objectName) => {
        const objectFields = STANDARD_OBJECTS[objectName].fields as Record<
          string,
          { universalIdentifier: string }
        >;

        return SEARCH_FIELDS_BY_STANDARD_OBJECT_NAME[objectName].map(
          ({ name }) =>
            getSearchFieldUniversalIdentifier({
              applicationUniversalIdentifier:
                twentyStandardFlatApplication.universalIdentifier,
              fieldMetadataUniversalIdentifier:
                objectFields[name].universalIdentifier,
            }),
        );
      });

    const allFlatEntityOperationByMetadataName = {
      objectMetadata: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatObjectMetadata>({
            standardFlatEntityMaps:
              standardAllFlatEntityMaps.flatObjectMetadataMaps,
            existingFlatEntityMaps: flatObjectMetadataMaps,
            universalIdentifiers:
              QUOTE_CPQ_OBJECT_METADATA_UNIVERSAL_IDENTIFIERS,
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      fieldMetadata: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatFieldMetadata>({
            standardFlatEntityMaps:
              standardAllFlatEntityMaps.flatFieldMetadataMaps,
            existingFlatEntityMaps: flatFieldMetadataMaps,
            universalIdentifiers:
              QUOTE_CPQ_FIELD_METADATA_UNIVERSAL_IDENTIFIERS,
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      index: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatIndexMetadata>({
            standardFlatEntityMaps: standardAllFlatEntityMaps.flatIndexMaps,
            existingFlatEntityMaps: flatIndexMaps,
            universalIdentifiers: QUOTE_CPQ_INDEX_UNIVERSAL_IDENTIFIERS,
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      view: {
        flatEntityToCreate: getStandardFlatEntitiesToCreateOrThrow<FlatView>({
          standardFlatEntityMaps: standardAllFlatEntityMaps.flatViewMaps,
          existingFlatEntityMaps: flatViewMaps,
          universalIdentifiers: QUOTE_CPQ_VIEW_UNIVERSAL_IDENTIFIERS,
        }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      viewFieldGroup: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatViewFieldGroup>({
            standardFlatEntityMaps:
              standardAllFlatEntityMaps.flatViewFieldGroupMaps,
            existingFlatEntityMaps: flatViewFieldGroupMaps,
            universalIdentifiers:
              QUOTE_CPQ_VIEW_FIELD_GROUP_UNIVERSAL_IDENTIFIERS,
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      viewField: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatViewField>({
            standardFlatEntityMaps: standardAllFlatEntityMaps.flatViewFieldMaps,
            existingFlatEntityMaps: flatViewFieldMaps,
            universalIdentifiers: QUOTE_CPQ_VIEW_FIELD_UNIVERSAL_IDENTIFIERS,
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      pageLayout: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatPageLayout>({
            standardFlatEntityMaps:
              standardAllFlatEntityMaps.flatPageLayoutMaps,
            existingFlatEntityMaps: flatPageLayoutMaps,
            universalIdentifiers: QUOTE_CPQ_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      pageLayoutTab: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatPageLayoutTab>({
            standardFlatEntityMaps:
              standardAllFlatEntityMaps.flatPageLayoutTabMaps,
            existingFlatEntityMaps: flatPageLayoutTabMaps,
            universalIdentifiers:
              QUOTE_CPQ_PAGE_LAYOUT_TAB_UNIVERSAL_IDENTIFIERS,
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      pageLayoutWidget: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatPageLayoutWidget>({
            standardFlatEntityMaps:
              standardAllFlatEntityMaps.flatPageLayoutWidgetMaps,
            existingFlatEntityMaps: flatPageLayoutWidgetMaps,
            universalIdentifiers:
              QUOTE_CPQ_PAGE_LAYOUT_WIDGET_UNIVERSAL_IDENTIFIERS,
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      searchFieldMetadata: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatSearchFieldMetadata>({
            standardFlatEntityMaps:
              standardAllFlatEntityMaps.flatSearchFieldMetadataMaps,
            existingFlatEntityMaps: flatSearchFieldMetadataMaps,
            universalIdentifiers: quoteCpqSearchFieldUniversalIdentifiers,
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
    };

    const totalOperationCount = Object.values(
      allFlatEntityOperationByMetadataName,
    ).reduce((total, operations) => total + operations.flatEntityToCreate.length, 0);

    if (totalOperationCount === 0) {
      this.logger.log(
        `Quote/CPQ standard metadata already exists for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    if (isDryRun) {
      this.logger.log(
        `[DRY RUN] Would apply ${totalOperationCount} Quote/CPQ standard metadata operations for workspace ${workspaceId}`,
      );

      return;
    }

    const validateAndBuildResult =
      await this.workspaceMigrationValidateBuildAndRunService.validateBuildAndRunLegacyWorkspaceMigration(
        {
          isSystemBuild: true,
          applicationUniversalIdentifier:
            twentyStandardFlatApplication.universalIdentifier,
          workspaceId,
          allFlatEntityOperationByMetadataName,
        },
      );

    if (validateAndBuildResult.status === 'fail') {
      throw new Error(
        `Failed to create Quote/CPQ standard objects for workspace ${workspaceId}: ${JSON.stringify(
          validateAndBuildResult,
          null,
          2,
        )}`,
      );
    }

    this.logger.log(
      `Applied ${totalOperationCount} Quote/CPQ standard metadata operations for workspace ${workspaceId}`,
    );
  }
}
