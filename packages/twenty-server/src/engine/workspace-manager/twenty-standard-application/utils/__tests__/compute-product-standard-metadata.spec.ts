import {
  STANDARD_OBJECTS,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-shared/metadata';
import {
  type FieldMetadataType,
  RelationOnDeleteAction,
} from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { WidgetConfigurationType } from 'src/engine/metadata-modules/page-layout-widget/enums/widget-configuration-type.type';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';

const WORKSPACE_ID = '20202020-1111-4111-8111-111111111111';
const TWENTY_STANDARD_APPLICATION_ID = '20202020-2222-4222-8222-222222222222';
const NOW = '2024-01-01T00:00:00.000Z';

describe('Product standard metadata build', () => {
  const { allFlatEntityMaps } =
    computeTwentyStandardApplicationAllFlatEntityMaps({
      now: NOW,
      workspaceId: WORKSPACE_ID,
      twentyStandardApplicationId: TWENTY_STANDARD_APPLICATION_ID,
    });

  it('builds the product object', () => {
    const { byUniversalIdentifier } = allFlatEntityMaps.flatObjectMetadataMaps;

    expect(
      byUniversalIdentifier[STANDARD_OBJECTS.product.universalIdentifier],
    ).toBeDefined();
  });

  it('is searchable', () => {
    const product =
      allFlatEntityMaps.flatObjectMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.product.universalIdentifier
      ];

    expect(product?.isSearchable).toBe(true);
  });

  it('links product to a costTemplate as a nullable, SET_NULL-on-delete relation', () => {
    const costTemplateField = allFlatEntityMaps.flatFieldMetadataMaps
      .byUniversalIdentifier[
      STANDARD_OBJECTS.product.fields.costTemplate.universalIdentifier
    ] as FlatFieldMetadata<FieldMetadataType.RELATION> | undefined;

    expect(costTemplateField).toBeDefined();
    expect(costTemplateField?.settings?.onDelete).toBe(
      RelationOnDeleteAction.SET_NULL,
    );
  });

  it('indexes the costTemplate foreign key', () => {
    const costTemplateIdIndex =
      allFlatEntityMaps.flatIndexMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.product.indexes.costTemplateIdIndex.universalIdentifier
      ];

    expect(costTemplateIdIndex).toBeDefined();
  });

  it('gives costTemplate a reverse products relation', () => {
    const productsField =
      allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.costTemplate.fields.products.universalIdentifier
      ];

    expect(productsField).toBeDefined();
  });

  it('keeps the product table view focused on name, sku, basePrice, isActive', () => {
    const viewFieldFieldUniversalIdentifiers = Object.values(
      allFlatEntityMaps.flatViewFieldMaps.byUniversalIdentifier,
    )
      .filter(isDefined)
      .filter(
        (viewField) =>
          viewField.viewUniversalIdentifier ===
          STANDARD_OBJECTS.product.views.allProducts.universalIdentifier,
      )
      .map((viewField) => viewField.fieldMetadataUniversalIdentifier);

    expect(viewFieldFieldUniversalIdentifiers).toHaveLength(4);
    expect(viewFieldFieldUniversalIdentifiers).toEqual(
      expect.arrayContaining([
        STANDARD_OBJECTS.product.fields.name.universalIdentifier,
        STANDARD_OBJECTS.product.fields.sku.universalIdentifier,
        STANDARD_OBJECTS.product.fields.basePrice.universalIdentifier,
        STANDARD_OBJECTS.product.fields.isActive.universalIdentifier,
      ]),
    );
  });

  it('links the product fields widget to its record-page fields view', () => {
    const fieldsWidget =
      allFlatEntityMaps.flatPageLayoutWidgetMaps.byUniversalIdentifier[
        STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.productRecordPage.tabs.home
          .widgets.fields.universalIdentifier
      ];

    expect(fieldsWidget?.universalConfiguration).toMatchObject({
      configurationType: WidgetConfigurationType.FIELDS,
      viewUniversalIdentifier:
        STANDARD_OBJECTS.product.views.productRecordPageFields
          .universalIdentifier,
    });
  });
});
