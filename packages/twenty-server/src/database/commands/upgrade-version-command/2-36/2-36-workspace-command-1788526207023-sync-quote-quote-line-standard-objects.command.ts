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

// (a) The two brand-new standard objects this command fully backfills.
const QUOTE_QUOTE_LINE_STANDARD_OBJECT_NAMES = ['quote', 'quoteLine'] as const;

const getUniversalIdentifiers = (
  entitiesByName: Record<string, { universalIdentifier: string }>,
): string[] =>
  Object.values(entitiesByName).map((entity) => entity.universalIdentifier);

const QUOTE_QUOTE_LINE_OBJECT_METADATA_UNIVERSAL_IDENTIFIERS = [
  STANDARD_OBJECTS.quote.universalIdentifier,
  STANDARD_OBJECTS.quoteLine.universalIdentifier,
];

// (b) New fields bolted onto 5 pre-existing standard objects by Phase 3's
// Task 1/Task 2 rulings and the final-review fix wave. These objects
// themselves already exist in every pre-Phase-3 workspace -- only these
// specific new rows are missing.
const QUOTE_QUOTE_LINE_FIELD_METADATA_UNIVERSAL_IDENTIFIERS = [
  ...getUniversalIdentifiers(STANDARD_OBJECTS.quote.fields),
  ...getUniversalIdentifiers(STANDARD_OBJECTS.quoteLine.fields),
  STANDARD_OBJECTS.opportunity.fields.quotes.universalIdentifier,
  STANDARD_OBJECTS.company.fields.quotes.universalIdentifier,
  STANDARD_OBJECTS.person.fields.quotes.universalIdentifier,
  STANDARD_OBJECTS.product.fields.quoteLines.universalIdentifier,
  STANDARD_OBJECTS.attachment.fields.targetQuote.universalIdentifier,
];

// Opportunity/Company/Person/Product's new quotes/quoteLines fields are
// reverse ONE_TO_MANY fields with no FK column on that side, so they do not
// get their own index entries -- only Attachment.targetQuote's FK index is
// added here.
const QUOTE_QUOTE_LINE_INDEX_UNIVERSAL_IDENTIFIERS = [
  ...getUniversalIdentifiers(STANDARD_OBJECTS.quote.indexes),
  ...getUniversalIdentifiers(STANDARD_OBJECTS.quoteLine.indexes),
  STANDARD_OBJECTS.attachment.indexes.quoteIdIndex.universalIdentifier,
];

const QUOTE_QUOTE_LINE_VIEW_UNIVERSAL_IDENTIFIERS = [
  STANDARD_OBJECTS.quote.views.allQuotes.universalIdentifier,
  STANDARD_OBJECTS.quote.views.quoteRecordPageFields.universalIdentifier,
  STANDARD_OBJECTS.quoteLine.views.allQuoteLines.universalIdentifier,
  STANDARD_OBJECTS.quoteLine.views.quoteLineRecordPageFields
    .universalIdentifier,
];

const QUOTE_QUOTE_LINE_VIEW_FIELD_GROUP_UNIVERSAL_IDENTIFIERS = [
  ...getUniversalIdentifiers(
    STANDARD_OBJECTS.quote.views.quoteRecordPageFields.viewFieldGroups,
  ),
  ...getUniversalIdentifiers(
    STANDARD_OBJECTS.quoteLine.views.quoteLineRecordPageFields
      .viewFieldGroups,
  ),
];

// Company/Person/Product deliberately have NO view field for their new
// reverse relation -- a considered UI-clutter ruling made during Phase 3 and
// upheld again during the final-review fix wave. Only Opportunity.quotes
// gets one.
const QUOTE_QUOTE_LINE_VIEW_FIELD_UNIVERSAL_IDENTIFIERS = [
  ...getUniversalIdentifiers(STANDARD_OBJECTS.quote.views.allQuotes.viewFields),
  ...getUniversalIdentifiers(
    STANDARD_OBJECTS.quote.views.quoteRecordPageFields.viewFields,
  ),
  ...getUniversalIdentifiers(
    STANDARD_OBJECTS.quoteLine.views.allQuoteLines.viewFields,
  ),
  ...getUniversalIdentifiers(
    STANDARD_OBJECTS.quoteLine.views.quoteLineRecordPageFields.viewFields,
  ),
  STANDARD_OBJECTS.opportunity.views.opportunityRecordPageFields.viewFields
    .quotes.universalIdentifier,
];

const QUOTE_QUOTE_LINE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS = [
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.quoteRecordPage
    .universalIdentifier,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.quoteLineRecordPage
    .universalIdentifier,
];

const QUOTE_QUOTE_LINE_PAGE_LAYOUT_TAB_UNIVERSAL_IDENTIFIERS = [
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.quoteRecordPage.tabs.home
    .universalIdentifier,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.quoteLineRecordPage.tabs.home
    .universalIdentifier,
];

const QUOTE_QUOTE_LINE_PAGE_LAYOUT_WIDGET_UNIVERSAL_IDENTIFIERS = [
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.quoteRecordPage.tabs.home.widgets
    .fields.universalIdentifier,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.quoteLineRecordPage.tabs.home
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
//    workspace's quote/quoteLine state (and the reverse-relation fields on
//    Opportunity/Company/Person/Product/Attachment) never contains any
//    engine-owned companion (system relations to timelineActivity/
//    attachment/noteTarget/taskTarget, the engine's own default INDEX view,
//    etc) -- routing this backfill through the engine would give upgraded
//    workspaces extra rows fresh ones never get.
// 2. That same standard sync runs with inferDeletionFromMissingEntities:
//    true (twenty-standard-application.service.ts). Extra engine-injected
//    rows this command's create-set doesn't declare would not be part of
//    the standard application's expected state on the NEXT sync, and would
//    become deletion candidates -- silent, delayed data loss, worse than a
//    loud failure at command-run time.
// Several precedents in this same >=2.19 codebase area confirm legacy is
// the right call for this "backfill already-curated standard state" shape,
// not a pre-2.19 leftover: upgrade:2-10:sync-call-recording-standard-objects,
// upgrade:2-25:add-message-campaign-name-field,
// upgrade:2-26:demote-and-backfill-application-index-view,
// upgrade:2-31:backfill-record-page, and this same phase's own
// upgrade:2-36:sync-quote-cpq-standard-objects, which back a twenty-standard
// object's curated view/page-layout stack through the same legacy path for
// the identical reason.
@RegisteredWorkspaceCommand('2.36.0', 1788526207023)
@Command({
  name: 'upgrade:2-36:sync-quote-quote-line-standard-objects',
  description:
    'Create the Quote and QuoteLine standard metadata, and the reverse-relation fields on Opportunity, Company, Person, Product and Attachment, in existing workspaces',
})
export class SyncQuoteQuoteLineStandardObjectsCommand extends ProvisionedWorkspaceCommandRunner {
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
          STANDARD_OBJECTS.quote.universalIdentifier
        ],
      )
    ) {
      this.logger.log(
        `Quote standard object already exists for workspace ${workspaceId}, skipping`,
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
    // hardcoded per object: quoteLine currently declares no search fields,
    // but this picks up any that are added later without needing an edit
    // here.
    const quoteQuoteLineSearchFieldUniversalIdentifiers =
      QUOTE_QUOTE_LINE_STANDARD_OBJECT_NAMES.flatMap((objectName) => {
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
              QUOTE_QUOTE_LINE_OBJECT_METADATA_UNIVERSAL_IDENTIFIERS,
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
              QUOTE_QUOTE_LINE_FIELD_METADATA_UNIVERSAL_IDENTIFIERS,
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      index: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatIndexMetadata>({
            standardFlatEntityMaps: standardAllFlatEntityMaps.flatIndexMaps,
            existingFlatEntityMaps: flatIndexMaps,
            universalIdentifiers: QUOTE_QUOTE_LINE_INDEX_UNIVERSAL_IDENTIFIERS,
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      view: {
        flatEntityToCreate: getStandardFlatEntitiesToCreateOrThrow<FlatView>({
          standardFlatEntityMaps: standardAllFlatEntityMaps.flatViewMaps,
          existingFlatEntityMaps: flatViewMaps,
          universalIdentifiers: QUOTE_QUOTE_LINE_VIEW_UNIVERSAL_IDENTIFIERS,
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
              QUOTE_QUOTE_LINE_VIEW_FIELD_GROUP_UNIVERSAL_IDENTIFIERS,
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
      viewField: {
        flatEntityToCreate:
          getStandardFlatEntitiesToCreateOrThrow<FlatViewField>({
            standardFlatEntityMaps: standardAllFlatEntityMaps.flatViewFieldMaps,
            existingFlatEntityMaps: flatViewFieldMaps,
            universalIdentifiers:
              QUOTE_QUOTE_LINE_VIEW_FIELD_UNIVERSAL_IDENTIFIERS,
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
            universalIdentifiers:
              QUOTE_QUOTE_LINE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
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
              QUOTE_QUOTE_LINE_PAGE_LAYOUT_TAB_UNIVERSAL_IDENTIFIERS,
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
              QUOTE_QUOTE_LINE_PAGE_LAYOUT_WIDGET_UNIVERSAL_IDENTIFIERS,
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
            universalIdentifiers:
              quoteQuoteLineSearchFieldUniversalIdentifiers,
          }),
        flatEntityToDelete: [],
        flatEntityToUpdate: [],
      },
    };

    const totalOperationCount = Object.values(
      allFlatEntityOperationByMetadataName,
    ).reduce(
      (total, operations) => total + operations.flatEntityToCreate.length,
      0,
    );

    if (totalOperationCount === 0) {
      this.logger.log(
        `Quote/QuoteLine standard metadata already exists for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    if (isDryRun) {
      this.logger.log(
        `[DRY RUN] Would apply ${totalOperationCount} Quote/QuoteLine standard metadata operations for workspace ${workspaceId}`,
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
        `Failed to create Quote/QuoteLine standard objects for workspace ${workspaceId}: ${JSON.stringify(
          validateAndBuildResult,
          null,
          2,
        )}`,
      );
    }

    this.logger.log(
      `Applied ${totalOperationCount} Quote/QuoteLine standard metadata operations for workspace ${workspaceId}`,
    );
  }
}
