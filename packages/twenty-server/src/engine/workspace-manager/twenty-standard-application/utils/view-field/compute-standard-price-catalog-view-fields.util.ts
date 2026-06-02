import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import {
  createStandardViewFieldFlatMetadata,
  type CreateStandardViewFieldArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field/create-standard-view-field-flat-metadata.util';

export const computeStandardPriceCatalogViewFields = (
  args: Omit<CreateStandardViewFieldArgs<'priceCatalog'>, 'context'>,
): Record<string, FlatViewField> => {
  return {
    allPriceCatalogsName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'priceCatalog',
      context: {
        viewName: 'allPriceCatalogs',
        viewFieldName: 'name',
        fieldName: 'name',
        position: 0,
        isVisible: true,
        size: 200,
      },
    }),
    allPriceCatalogsIsStandard: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'priceCatalog',
      context: {
        viewName: 'allPriceCatalogs',
        viewFieldName: 'isStandard',
        fieldName: 'isStandard',
        position: 1,
        isVisible: true,
        size: 100,
      },
    }),
    allPriceCatalogsIsActive: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'priceCatalog',
      context: {
        viewName: 'allPriceCatalogs',
        viewFieldName: 'isActive',
        fieldName: 'isActive',
        position: 2,
        isVisible: true,
        size: 100,
      },
    }),
    allPriceCatalogsDescription: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'priceCatalog',
      context: {
        viewName: 'allPriceCatalogs',
        viewFieldName: 'description',
        fieldName: 'description',
        position: 3,
        isVisible: true,
        size: 200,
      },
    }),
    allPriceCatalogsCreatedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'priceCatalog',
      context: {
        viewName: 'allPriceCatalogs',
        viewFieldName: 'createdAt',
        fieldName: 'createdAt',
        position: 4,
        isVisible: true,
        size: 150,
      },
    }),
  };
};
