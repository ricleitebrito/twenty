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

  // DB-level backstop for CostTemplateValidationService.validateUniqueVariableNames
  // — the hook-level check alone is a read-then-write race, not a guarantee.
  it('enforces variableName uniqueness per cost template with a soft-delete-aware unique index', () => {
    const variableNameUniqueIndex =
      allFlatEntityMaps.flatIndexMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.costTemplateStep.indexes.variableNameUniqueIndex
          .universalIdentifier
      ];

    expect(variableNameUniqueIndex?.isUnique).toBe(true);
    expect(variableNameUniqueIndex?.indexWhereClause).toBe(
      '"deletedAt" IS NULL',
    );
  });

  // DB-level backstop for CostTemplateValidationService.validateSingleOutputStep
  // ("at most one output step per template").
  it('enforces at most one output step per cost template with a partial unique index', () => {
    const singleOutputStepUniqueIndex =
      allFlatEntityMaps.flatIndexMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.costTemplateStep.indexes.singleOutputStepUniqueIndex
          .universalIdentifier
      ];

    expect(singleOutputStepUniqueIndex?.isUnique).toBe(true);
    expect(singleOutputStepUniqueIndex?.indexWhereClause).toBe(
      '"isOutput" AND "deletedAt" IS NULL',
    );
    expect(singleOutputStepUniqueIndex?.flatIndexFieldMetadatas).toHaveLength(
      1,
    );
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
