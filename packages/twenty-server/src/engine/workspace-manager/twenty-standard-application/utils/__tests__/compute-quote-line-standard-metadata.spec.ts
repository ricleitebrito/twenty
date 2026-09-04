import {
  STANDARD_OBJECTS,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-shared/metadata';
import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { WidgetConfigurationType } from 'src/engine/metadata-modules/page-layout-widget/enums/widget-configuration-type.type';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';

const WORKSPACE_ID = '20202020-1111-4111-8111-111111111111';
const TWENTY_STANDARD_APPLICATION_ID = '20202020-2222-4222-8222-222222222222';
const NOW = '2024-01-01T00:00:00.000Z';

describe('QuoteLine standard metadata build', () => {
  const { allFlatEntityMaps } =
    computeTwentyStandardApplicationAllFlatEntityMaps({
      now: NOW,
      workspaceId: WORKSPACE_ID,
      twentyStandardApplicationId: TWENTY_STANDARD_APPLICATION_ID,
    });

  it('builds the quoteLine object', () => {
    const { byUniversalIdentifier } = allFlatEntityMaps.flatObjectMetadataMaps;

    expect(
      byUniversalIdentifier[STANDARD_OBJECTS.quoteLine.universalIdentifier],
    ).toBeDefined();
  });

  it('builds the quoteLine object with all 7 custom fields and 8 system fields', () => {
    const quoteLineObject =
      allFlatEntityMaps.flatObjectMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.quoteLine.universalIdentifier
      ];

    const fieldsOnQuoteLine = Object.values(
      allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier,
    )
      .filter(isDefined)
      .filter((field) => field.objectMetadataId === quoteLineObject?.id)
      .map((field) => field.name);

    expect(fieldsOnQuoteLine).toHaveLength(15);
    expect(fieldsOnQuoteLine).toEqual(
      expect.arrayContaining([
        'id',
        'createdAt',
        'updatedAt',
        'deletedAt',
        'createdBy',
        'updatedBy',
        'position',
        'searchVector',
        'quote',
        'product',
        'quantity',
        'discountPercent',
        'fieldValues',
        'unitPrice',
        'totalPrice',
      ]),
    );
  });

  it("has a quoteLine quote field as a required MANY_TO_ONE targeting quote's reverse quoteLines field", () => {
    const quoteField =
      allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.quoteLine.fields.quote.universalIdentifier
      ];

    expect(quoteField).toBeDefined();
    expect(quoteField?.type).toBe(FieldMetadataType.RELATION);
    expect(quoteField?.isNullable).toBe(false);
    expect(quoteField?.relationTargetFieldMetadataUniversalIdentifier).toBe(
      STANDARD_OBJECTS.quote.fields.quoteLines.universalIdentifier,
    );
  });

  it('has a quote quoteLines field as the reverse ONE_TO_MANY targeting quoteLine.quote', () => {
    const quoteLinesField =
      allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.quote.fields.quoteLines.universalIdentifier
      ];

    expect(quoteLinesField).toBeDefined();
    expect(quoteLinesField?.type).toBe(FieldMetadataType.RELATION);
    expect(
      quoteLinesField?.relationTargetFieldMetadataUniversalIdentifier,
    ).toBe(STANDARD_OBJECTS.quoteLine.fields.quote.universalIdentifier);
  });

  it("has a quoteLine product field as a required MANY_TO_ONE targeting product's reverse quoteLines field", () => {
    const productField =
      allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.quoteLine.fields.product.universalIdentifier
      ];

    expect(productField).toBeDefined();
    expect(productField?.type).toBe(FieldMetadataType.RELATION);
    expect(productField?.isNullable).toBe(false);
    expect(productField?.relationTargetFieldMetadataUniversalIdentifier).toBe(
      STANDARD_OBJECTS.product.fields.quoteLines.universalIdentifier,
    );
  });

  it('has a product quoteLines field as the reverse ONE_TO_MANY targeting quoteLine.product', () => {
    const quoteLinesField =
      allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.product.fields.quoteLines.universalIdentifier
      ];

    expect(quoteLinesField).toBeDefined();
    expect(quoteLinesField?.type).toBe(FieldMetadataType.RELATION);
    expect(
      quoteLinesField?.relationTargetFieldMetadataUniversalIdentifier,
    ).toBe(STANDARD_OBJECTS.quoteLine.fields.product.universalIdentifier);
  });

  it('indexes the quote foreign key', () => {
    const quoteIdIndex =
      allFlatEntityMaps.flatIndexMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.quoteLine.indexes.quoteIdIndex.universalIdentifier
      ];

    expect(quoteIdIndex).toBeDefined();
  });

  // Regression: guards against a declared-but-never-built view field (Phase 1's I3 class of bug).
  it('instantiates every declared quoteLineRecordPageFields view field', () => {
    const declaredViewFieldNames = Object.keys(
      STANDARD_OBJECTS.quoteLine.views.quoteLineRecordPageFields.viewFields,
    );

    const builtFieldMetadataUniversalIdentifiers = Object.values(
      allFlatEntityMaps.flatViewFieldMaps.byUniversalIdentifier,
    )
      .filter(isDefined)
      .filter(
        (viewField) =>
          viewField.viewUniversalIdentifier ===
          STANDARD_OBJECTS.quoteLine.views.quoteLineRecordPageFields
            .universalIdentifier,
      )
      .map((viewField) => viewField.fieldMetadataUniversalIdentifier);

    const declaredFieldMetadataUniversalIdentifiers =
      declaredViewFieldNames.map(
        (viewFieldName) =>
          STANDARD_OBJECTS.quoteLine.fields[
            viewFieldName as keyof typeof STANDARD_OBJECTS.quoteLine.fields
          ].universalIdentifier,
      );

    expect(builtFieldMetadataUniversalIdentifiers).toHaveLength(
      declaredFieldMetadataUniversalIdentifiers.length,
    );
    expect(builtFieldMetadataUniversalIdentifiers).toEqual(
      expect.arrayContaining(declaredFieldMetadataUniversalIdentifiers),
    );
  });

  it('links the quoteLine fields widget to its record-page fields view', () => {
    const fieldsWidget =
      allFlatEntityMaps.flatPageLayoutWidgetMaps.byUniversalIdentifier[
        STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.quoteLineRecordPage.tabs.home
          .widgets.fields.universalIdentifier
      ];

    expect(fieldsWidget?.universalConfiguration).toMatchObject({
      configurationType: WidgetConfigurationType.FIELDS,
      viewUniversalIdentifier:
        STANDARD_OBJECTS.quoteLine.views.quoteLineRecordPageFields
          .universalIdentifier,
    });
  });
});
