import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import {
  createStandardViewFieldFlatMetadata,
  type CreateStandardViewFieldArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field/create-standard-view-field-flat-metadata.util';

export const computeStandardProductViewFields = (
  args: Omit<CreateStandardViewFieldArgs<'product'>, 'context'>,
): Record<string, FlatViewField> => {
  return {
    allProductsName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'allProducts',
        viewFieldName: 'name',
        fieldName: 'name',
        position: 0,
        isVisible: true,
        size: 180,
      },
    }),
    allProductsProductCode: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'allProducts',
        viewFieldName: 'productCode',
        fieldName: 'productCode',
        position: 1,
        isVisible: true,
        size: 150,
      },
    }),
    allProductsFamily: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'allProducts',
        viewFieldName: 'family',
        fieldName: 'family',
        position: 2,
        isVisible: true,
        size: 150,
      },
    }),
    allProductsIsActive: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'allProducts',
        viewFieldName: 'isActive',
        fieldName: 'isActive',
        position: 3,
        isVisible: true,
        size: 100,
      },
    }),
    allProductsUnitOfMeasure: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'allProducts',
        viewFieldName: 'unitOfMeasure',
        fieldName: 'unitOfMeasure',
        position: 4,
        isVisible: true,
        size: 120,
      },
    }),
    allProductsCreatedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'allProducts',
        viewFieldName: 'createdAt',
        fieldName: 'createdAt',
        position: 5,
        isVisible: true,
        size: 150,
      },
    }),
  };
};
