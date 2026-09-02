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

  // DB-level backstop for CostTemplateValidationService.validateUniqueVariableNames
  // — the hook-level check alone is a read-then-write race, not a guarantee.
  it('enforces variableName uniqueness per cost template with a soft-delete-aware unique index', () => {
    const variableNameUniqueIndex =
      allFlatEntityMaps.flatIndexMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.costTemplateField.indexes.variableNameUniqueIndex
          .universalIdentifier
      ];

    expect(variableNameUniqueIndex?.isUnique).toBe(true);
    expect(variableNameUniqueIndex?.indexWhereClause).toBe(
      '"deletedAt" IS NULL',
    );
    expect(
      variableNameUniqueIndex?.flatIndexFieldMetadatas.map(
        (indexField) => indexField.fieldMetadataId,
      ),
    ).toEqual([
      allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.costTemplateField.fields.costTemplate
          .universalIdentifier
      ]?.id,
      allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.costTemplateField.fields.variableName
          .universalIdentifier
      ]?.id,
    ]);
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
        STANDARD_OBJECTS.costTemplateField.fields.fieldType.universalIdentifier,
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
        STANDARD_OBJECTS.costTemplateField.views
          .costTemplateFieldRecordPageFields.universalIdentifier,
    });
  });
});
