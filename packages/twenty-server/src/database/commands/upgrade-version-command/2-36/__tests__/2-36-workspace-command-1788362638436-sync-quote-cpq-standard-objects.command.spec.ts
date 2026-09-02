import { STANDARD_OBJECTS } from 'twenty-shared/metadata';

import { type WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { SyncQuoteCpqStandardObjectsCommand } from 'src/database/commands/upgrade-version-command/2-36/2-36-workspace-command-1788362638436-sync-quote-cpq-standard-objects.command';
import { type ApplicationService } from 'src/engine/core-modules/application/application.service';
import { type WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';
import { type WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

// Deliberately NOT mocked: this test exercises the real Task 1-4 standard
// definitions, so a regression in field/view/index/page-layout counts for
// the 4 Quote/CPQ objects would fail here too, not just in their own specs.
const WORKSPACE_ID = '20202020-0000-0000-0000-000000000001';
const STANDARD_APPLICATION = {
  id: '20202020-0000-0000-0000-0000000000aa',
  universalIdentifier: '20202020-0000-0000-0000-0000000000bb',
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
};

const countUniversalIdentifiers = (
  ...entitiesByNameList: Record<string, { universalIdentifier: string }>[]
) =>
  entitiesByNameList.reduce(
    (total, entitiesByName) => total + Object.keys(entitiesByName).length,
    0,
  );

describe('SyncQuoteCpqStandardObjectsCommand', () => {
  let command: SyncQuoteCpqStandardObjectsCommand;
  let getOrRecomputeMock: jest.Mock;
  let validateBuildAndRunLegacyWorkspaceMigrationMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    getOrRecomputeMock = jest.fn();
    validateBuildAndRunLegacyWorkspaceMigrationMock = jest
      .fn()
      .mockResolvedValue({ status: 'success' });

    command = new SyncQuoteCpqStandardObjectsCommand(
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

  it('creates the full Quote/CPQ standard metadata set when costTemplate is missing', async () => {
    getOrRecomputeMock.mockResolvedValue(EMPTY_WORKSPACE_CACHE);

    await runOnWorkspace();

    expect(computeTwentyStandardApplicationAllFlatEntityMaps).toBeDefined();
    expect(
      validateBuildAndRunLegacyWorkspaceMigrationMock,
    ).toHaveBeenCalledTimes(1);

    const [payload] =
      validateBuildAndRunLegacyWorkspaceMigrationMock.mock.calls[0];
    const { allFlatEntityOperationByMetadataName } = payload;

    expect(
      allFlatEntityOperationByMetadataName.objectMetadata.flatEntityToCreate,
    ).toHaveLength(4);
    expect(
      allFlatEntityOperationByMetadataName.objectMetadata.flatEntityToCreate.map(
        (flatObjectMetadata: { universalIdentifier: string }) =>
          flatObjectMetadata.universalIdentifier,
      ),
    ).toEqual(
      expect.arrayContaining([
        STANDARD_OBJECTS.costTemplate.universalIdentifier,
        STANDARD_OBJECTS.costTemplateField.universalIdentifier,
        STANDARD_OBJECTS.costTemplateStep.universalIdentifier,
        STANDARD_OBJECTS.product.universalIdentifier,
      ]),
    );

    expect(
      allFlatEntityOperationByMetadataName.fieldMetadata.flatEntityToCreate,
    ).toHaveLength(
      countUniversalIdentifiers(
        STANDARD_OBJECTS.costTemplate.fields,
        STANDARD_OBJECTS.costTemplateField.fields,
        STANDARD_OBJECTS.costTemplateStep.fields,
        STANDARD_OBJECTS.product.fields,
      ),
    );

    expect(
      allFlatEntityOperationByMetadataName.index.flatEntityToCreate,
    ).toHaveLength(
      countUniversalIdentifiers(
        STANDARD_OBJECTS.costTemplate.indexes,
        STANDARD_OBJECTS.costTemplateField.indexes,
        STANDARD_OBJECTS.costTemplateStep.indexes,
        STANDARD_OBJECTS.product.indexes,
      ),
    );

    expect(
      allFlatEntityOperationByMetadataName.view.flatEntityToCreate,
    ).toHaveLength(8);

    expect(
      allFlatEntityOperationByMetadataName.viewFieldGroup.flatEntityToCreate,
    ).toHaveLength(8);

    expect(
      allFlatEntityOperationByMetadataName.pageLayout.flatEntityToCreate,
    ).toHaveLength(4);
    expect(
      allFlatEntityOperationByMetadataName.pageLayoutTab.flatEntityToCreate,
    ).toHaveLength(4);
    expect(
      allFlatEntityOperationByMetadataName.pageLayoutWidget.flatEntityToCreate,
    ).toHaveLength(4);

    expect(payload.isSystemBuild).toBe(true);
    expect(payload.applicationUniversalIdentifier).toBe(
      STANDARD_APPLICATION.universalIdentifier,
    );
  });

  it('is idempotent when the Quote/CPQ standard objects already exist', async () => {
    const { allFlatEntityMaps } = computeTwentyStandardApplicationAllFlatEntityMaps(
      {
        now: new Date().toISOString(),
        workspaceId: WORKSPACE_ID,
        twentyStandardApplicationId: STANDARD_APPLICATION.id,
      },
    );

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
