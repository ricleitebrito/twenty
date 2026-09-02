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

  // Regression: fields/steps/products were declared in the record-page
  // fields view's viewFieldNames but never actually instantiated, leaving
  // no UI path to attach a CostTemplateField/CostTemplateStep to a template.
  it('instantiates every declared costTemplateRecordPageFields view field, including the fields/steps/products relations', () => {
    const declaredViewFieldNames = Object.keys(
      STANDARD_OBJECTS.costTemplate.views.costTemplateRecordPageFields
        .viewFields,
    );

    const builtFieldMetadataUniversalIdentifiers = Object.values(
      allFlatEntityMaps.flatViewFieldMaps.byUniversalIdentifier,
    )
      .filter(isDefined)
      .filter(
        (viewField) =>
          viewField.viewUniversalIdentifier ===
          STANDARD_OBJECTS.costTemplate.views.costTemplateRecordPageFields
            .universalIdentifier,
      )
      .map((viewField) => viewField.fieldMetadataUniversalIdentifier);

    const declaredFieldMetadataUniversalIdentifiers =
      declaredViewFieldNames.map(
        (viewFieldName) =>
          STANDARD_OBJECTS.costTemplate.fields[
            viewFieldName as keyof typeof STANDARD_OBJECTS.costTemplate.fields
          ].universalIdentifier,
      );

    expect(builtFieldMetadataUniversalIdentifiers).toHaveLength(
      declaredFieldMetadataUniversalIdentifiers.length,
    );
    expect(builtFieldMetadataUniversalIdentifiers).toEqual(
      expect.arrayContaining(declaredFieldMetadataUniversalIdentifiers),
    );

    expect(declaredViewFieldNames).toEqual(
      expect.arrayContaining(['fields', 'steps', 'products']),
    );
    expect(declaredViewFieldNames).not.toContain('name');
  });
});
