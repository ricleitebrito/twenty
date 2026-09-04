import { TWENTY_STANDARD_APPLICATION_UNIVERSAL_IDENTIFIER } from 'twenty-shared/application';
import { STANDARD_OBJECTS } from 'twenty-shared/metadata';

import { type WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { SyncQuoteQuoteLineStandardObjectsCommand } from 'src/database/commands/upgrade-version-command/2-36/2-36-workspace-command-1788526207023-sync-quote-quote-line-standard-objects.command';
import { type ApplicationService } from 'src/engine/core-modules/application/application.service';
import { type WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { SEARCH_FIELDS_BY_STANDARD_OBJECT_NAME } from 'src/engine/workspace-manager/twenty-standard-application/constants/search-fields-by-standard-object-name.constant';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';
import { type WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

// Deliberately NOT mocked: this test exercises the real Phase 3 standard
// definitions, so a regression in field/view/index/page-layout counts for
// Quote/QuoteLine (or the reverse-relation fields on
// Opportunity/Company/Person/Product/Attachment) would fail here too, not
// just in their own specs.
const WORKSPACE_ID = '20202020-0000-0000-0000-000000000001';
// Must be the real twenty-standard application universal identifier (not an
// arbitrary UUID): computeTwentyStandardApplicationAllFlatEntityMaps derives
// every standard entity's identifier from this fixed constant internally, and
// getSearchFieldUniversalIdentifier uses it as a uuid v5 namespace, which
// requires a well-formed UUID (an arbitrary placeholder like
// '...-0000-0000000000bb' fails uuid v5's namespace validation).
const STANDARD_APPLICATION = {
  id: '20202020-0000-0000-0000-0000000000aa',
  universalIdentifier: TWENTY_STANDARD_APPLICATION_UNIVERSAL_IDENTIFIER,
};

const EMPTY_MAP = { byUniversalIdentifier: {} };

const buildByUniversalIdentifierMap = <
  T extends { universalIdentifier: string },
>(
  flatEntities: T[],
) => ({
  byUniversalIdentifier: Object.fromEntries(
    flatEntities.map((flatEntity) => [
      flatEntity.universalIdentifier,
      flatEntity,
    ]),
  ),
});

const EMPTY_WORKSPACE_CACHE = {
  flatObjectMetadataMaps: EMPTY_MAP,
  flatFieldMetadataMaps: EMPTY_MAP,
  flatIndexMaps: EMPTY_MAP,
  flatViewMaps: EMPTY_MAP,
  flatViewFieldMaps: EMPTY_MAP,
  flatViewFieldGroupMaps: EMPTY_MAP,
  flatPageLayoutMaps: EMPTY_MAP,
  flatPageLayoutTabMaps: EMPTY_MAP,
  flatPageLayoutWidgetMaps: EMPTY_MAP,
  flatSearchFieldMetadataMaps: EMPTY_MAP,
};

const countUniversalIdentifiers = (
  ...entitiesByNameList: Record<string, { universalIdentifier: string }>[]
) =>
  entitiesByNameList.reduce(
    (total, entitiesByName) => total + Object.keys(entitiesByName).length,
    0,
  );

const EXPECTED_SEARCH_FIELD_COUNT = (['quote', 'quoteLine'] as const).reduce(
  (total, objectName) =>
    total + SEARCH_FIELDS_BY_STANDARD_OBJECT_NAME[objectName].length,
  0,
);

describe('SyncQuoteQuoteLineStandardObjectsCommand', () => {
  let command: SyncQuoteQuoteLineStandardObjectsCommand;
  let getOrRecomputeMock: jest.Mock;
  let validateBuildAndRunLegacyWorkspaceMigrationMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    getOrRecomputeMock = jest.fn();
    validateBuildAndRunLegacyWorkspaceMigrationMock = jest
      .fn()
      .mockResolvedValue({ status: 'success' });

    command = new SyncQuoteQuoteLineStandardObjectsCommand(
      {} as WorkspaceIteratorService,
      {
        findWorkspaceTwentyStandardAndCustomApplicationOrThrow: jest
          .fn()
          .mockResolvedValue({
            twentyStandardFlatApplication: STANDARD_APPLICATION,
          }),
      } as unknown as ApplicationService,
      {
        getOrRecompute: getOrRecomputeMock,
      } as unknown as WorkspaceCacheService,
      {
        validateBuildAndRunLegacyWorkspaceMigration:
          validateBuildAndRunLegacyWorkspaceMigrationMock,
      } as unknown as WorkspaceMigrationValidateBuildAndRunService,
    );
  });

  const runOnWorkspace = (dryRun = false) =>
    command.runOnWorkspace({
      workspaceId: WORKSPACE_ID,
      options: { dryRun },
      index: 0,
      total: 1,
    });

  it('creates the full Quote/QuoteLine standard metadata set when quote is missing', async () => {
    getOrRecomputeMock.mockResolvedValue(EMPTY_WORKSPACE_CACHE);

    await runOnWorkspace();

    expect(
      validateBuildAndRunLegacyWorkspaceMigrationMock,
    ).toHaveBeenCalledTimes(1);

    const [payload] =
      validateBuildAndRunLegacyWorkspaceMigrationMock.mock.calls[0];
    const { allFlatEntityOperationByMetadataName } = payload;

    expect(
      allFlatEntityOperationByMetadataName.objectMetadata.flatEntityToCreate,
    ).toHaveLength(2);
    expect(
      allFlatEntityOperationByMetadataName.objectMetadata.flatEntityToCreate.map(
        (flatObjectMetadata: { universalIdentifier: string }) =>
          flatObjectMetadata.universalIdentifier,
      ),
    ).toEqual(
      expect.arrayContaining([
        STANDARD_OBJECTS.quote.universalIdentifier,
        STANDARD_OBJECTS.quoteLine.universalIdentifier,
      ]),
    );

    expect(
      allFlatEntityOperationByMetadataName.fieldMetadata.flatEntityToCreate,
    ).toHaveLength(
      countUniversalIdentifiers(
        STANDARD_OBJECTS.quote.fields,
        STANDARD_OBJECTS.quoteLine.fields,
      ) + 5,
    );
    expect(
      allFlatEntityOperationByMetadataName.fieldMetadata.flatEntityToCreate.map(
        (flatFieldMetadata: { universalIdentifier: string }) =>
          flatFieldMetadata.universalIdentifier,
      ),
    ).toEqual(
      expect.arrayContaining([
        STANDARD_OBJECTS.opportunity.fields.quotes.universalIdentifier,
        STANDARD_OBJECTS.company.fields.quotes.universalIdentifier,
        STANDARD_OBJECTS.person.fields.quotes.universalIdentifier,
        STANDARD_OBJECTS.product.fields.quoteLines.universalIdentifier,
        STANDARD_OBJECTS.attachment.fields.targetQuote.universalIdentifier,
      ]),
    );

    expect(
      allFlatEntityOperationByMetadataName.index.flatEntityToCreate,
    ).toHaveLength(
      countUniversalIdentifiers(
        STANDARD_OBJECTS.quote.indexes,
        STANDARD_OBJECTS.quoteLine.indexes,
      ) + 1,
    );
    expect(
      allFlatEntityOperationByMetadataName.index.flatEntityToCreate.map(
        (flatIndexMetadata: { universalIdentifier: string }) =>
          flatIndexMetadata.universalIdentifier,
      ),
    ).toEqual(
      expect.arrayContaining([
        STANDARD_OBJECTS.attachment.indexes.quoteIdIndex.universalIdentifier,
      ]),
    );

    expect(
      allFlatEntityOperationByMetadataName.view.flatEntityToCreate,
    ).toHaveLength(4);

    expect(
      allFlatEntityOperationByMetadataName.viewFieldGroup.flatEntityToCreate,
    ).toHaveLength(
      countUniversalIdentifiers(
        STANDARD_OBJECTS.quote.views.quoteRecordPageFields.viewFieldGroups,
        STANDARD_OBJECTS.quoteLine.views.quoteLineRecordPageFields
          .viewFieldGroups,
      ),
    );

    expect(
      allFlatEntityOperationByMetadataName.viewField.flatEntityToCreate,
    ).toHaveLength(
      countUniversalIdentifiers(
        STANDARD_OBJECTS.quote.views.allQuotes.viewFields,
        STANDARD_OBJECTS.quote.views.quoteRecordPageFields.viewFields,
        STANDARD_OBJECTS.quoteLine.views.allQuoteLines.viewFields,
        STANDARD_OBJECTS.quoteLine.views.quoteLineRecordPageFields.viewFields,
      ) + 1,
    );
    expect(
      allFlatEntityOperationByMetadataName.viewField.flatEntityToCreate.map(
        (flatViewField: { universalIdentifier: string }) =>
          flatViewField.universalIdentifier,
      ),
    ).toEqual(
      expect.arrayContaining([
        STANDARD_OBJECTS.opportunity.views.opportunityRecordPageFields
          .viewFields.quotes.universalIdentifier,
      ]),
    );

    expect(
      allFlatEntityOperationByMetadataName.pageLayout.flatEntityToCreate,
    ).toHaveLength(2);
    expect(
      allFlatEntityOperationByMetadataName.pageLayoutTab.flatEntityToCreate,
    ).toHaveLength(2);
    expect(
      allFlatEntityOperationByMetadataName.pageLayoutWidget.flatEntityToCreate,
    ).toHaveLength(2);

    expect(
      allFlatEntityOperationByMetadataName.searchFieldMetadata
        .flatEntityToCreate,
    ).toHaveLength(EXPECTED_SEARCH_FIELD_COUNT);

    expect(payload.isSystemBuild).toBe(true);
    expect(payload.applicationUniversalIdentifier).toBe(
      STANDARD_APPLICATION.universalIdentifier,
    );
  });

  it('is idempotent when the Quote/QuoteLine standard objects already exist', async () => {
    const { allFlatEntityMaps } =
      computeTwentyStandardApplicationAllFlatEntityMaps({
        now: new Date().toISOString(),
        workspaceId: WORKSPACE_ID,
        twentyStandardApplicationId: STANDARD_APPLICATION.id,
      });

    getOrRecomputeMock.mockResolvedValue({
      flatObjectMetadataMaps: buildByUniversalIdentifierMap(
        Object.values(
          allFlatEntityMaps.flatObjectMetadataMaps.byUniversalIdentifier,
        ).filter(
          (flatObjectMetadata): flatObjectMetadata is NonNullable<
            typeof flatObjectMetadata
          > => flatObjectMetadata !== undefined,
        ),
      ),
      flatFieldMetadataMaps: allFlatEntityMaps.flatFieldMetadataMaps,
      flatIndexMaps: allFlatEntityMaps.flatIndexMaps,
      flatViewMaps: allFlatEntityMaps.flatViewMaps,
      flatViewFieldMaps: allFlatEntityMaps.flatViewFieldMaps,
      flatViewFieldGroupMaps: allFlatEntityMaps.flatViewFieldGroupMaps,
      flatPageLayoutMaps: allFlatEntityMaps.flatPageLayoutMaps,
      flatPageLayoutTabMaps: allFlatEntityMaps.flatPageLayoutTabMaps,
      flatPageLayoutWidgetMaps: allFlatEntityMaps.flatPageLayoutWidgetMaps,
      flatSearchFieldMetadataMaps: allFlatEntityMaps.flatSearchFieldMetadataMaps,
    });

    await runOnWorkspace();

    expect(
      validateBuildAndRunLegacyWorkspaceMigrationMock,
    ).not.toHaveBeenCalled();
  });

  it('does not write metadata in dry-run mode', async () => {
    getOrRecomputeMock.mockResolvedValue(EMPTY_WORKSPACE_CACHE);

    await runOnWorkspace(true);

    expect(
      validateBuildAndRunLegacyWorkspaceMigrationMock,
    ).not.toHaveBeenCalled();
  });
});
