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
        size: 210,
      },
    }),
    allProductsSku: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'allProducts',
        viewFieldName: 'sku',
        fieldName: 'sku',
        position: 1,
        isVisible: true,
        size: 150,
      },
    }),
    allProductsBasePrice: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'allProducts',
        viewFieldName: 'basePrice',
        fieldName: 'basePrice',
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

    // productRecordPageFields view fields
    // General group
    productRecordPageFieldsName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'productRecordPageFields',
        viewFieldName: 'name',
        fieldName: 'name',
        position: 0,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    productRecordPageFieldsSku: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'productRecordPageFields',
        viewFieldName: 'sku',
        fieldName: 'sku',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    productRecordPageFieldsDescription: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'productRecordPageFields',
        viewFieldName: 'description',
        fieldName: 'description',
        position: 2,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    productRecordPageFieldsBasePrice: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'productRecordPageFields',
        viewFieldName: 'basePrice',
        fieldName: 'basePrice',
        position: 3,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    productRecordPageFieldsIsActive: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'productRecordPageFields',
        viewFieldName: 'isActive',
        fieldName: 'isActive',
        position: 4,
        isVisible: true,
        size: 100,
        viewFieldGroupName: 'general',
      },
    }),
    productRecordPageFieldsCostTemplate: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'productRecordPageFields',
        viewFieldName: 'costTemplate',
        fieldName: 'costTemplate',
        position: 5,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    // System group
    productRecordPageFieldsCreatedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'productRecordPageFields',
        viewFieldName: 'createdAt',
        fieldName: 'createdAt',
        position: 0,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'system',
      },
    }),
    productRecordPageFieldsCreatedBy: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'productRecordPageFields',
        viewFieldName: 'createdBy',
        fieldName: 'createdBy',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'system',
      },
    }),
    productRecordPageFieldsUpdatedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'productRecordPageFields',
        viewFieldName: 'updatedAt',
        fieldName: 'updatedAt',
        position: 2,
        isVisible: false,
        size: 150,
        viewFieldGroupName: 'system',
      },
    }),
    productRecordPageFieldsUpdatedBy: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'product',
      context: {
        viewName: 'productRecordPageFields',
        viewFieldName: 'updatedBy',
        fieldName: 'updatedBy',
        position: 3,
        isVisible: false,
        size: 150,
        viewFieldGroupName: 'system',
      },
    }),
  };
};
