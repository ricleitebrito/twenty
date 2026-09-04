import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import {
  createStandardViewFieldFlatMetadata,
  type CreateStandardViewFieldArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field/create-standard-view-field-flat-metadata.util';

export const computeStandardQuoteLineViewFields = (
  args: Omit<CreateStandardViewFieldArgs<'quoteLine'>, 'context'>,
): Record<string, FlatViewField> => {
  return {
    allQuoteLinesQuote: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quoteLine',
      context: {
        viewName: 'allQuoteLines',
        viewFieldName: 'quote',
        fieldName: 'quote',
        position: 0,
        isVisible: true,
        size: 150,
      },
    }),
    allQuoteLinesProduct: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quoteLine',
      context: {
        viewName: 'allQuoteLines',
        viewFieldName: 'product',
        fieldName: 'product',
        position: 1,
        isVisible: true,
        size: 150,
      },
    }),
    allQuoteLinesQuantity: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quoteLine',
      context: {
        viewName: 'allQuoteLines',
        viewFieldName: 'quantity',
        fieldName: 'quantity',
        position: 2,
        isVisible: true,
        size: 100,
      },
    }),
    allQuoteLinesUnitPrice: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quoteLine',
      context: {
        viewName: 'allQuoteLines',
        viewFieldName: 'unitPrice',
        fieldName: 'unitPrice',
        position: 3,
        isVisible: true,
        size: 150,
      },
    }),
    allQuoteLinesTotalPrice: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quoteLine',
      context: {
        viewName: 'allQuoteLines',
        viewFieldName: 'totalPrice',
        fieldName: 'totalPrice',
        position: 4,
        isVisible: true,
        size: 150,
      },
    }),

    // quoteLineRecordPageFields view fields
    // General group
    quoteLineRecordPageFieldsQuote: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quoteLine',
      context: {
        viewName: 'quoteLineRecordPageFields',
        viewFieldName: 'quote',
        fieldName: 'quote',
        position: 0,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    quoteLineRecordPageFieldsProduct: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quoteLine',
      context: {
        viewName: 'quoteLineRecordPageFields',
        viewFieldName: 'product',
        fieldName: 'product',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    quoteLineRecordPageFieldsQuantity: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quoteLine',
      context: {
        viewName: 'quoteLineRecordPageFields',
        viewFieldName: 'quantity',
        fieldName: 'quantity',
        position: 2,
        isVisible: true,
        size: 100,
        viewFieldGroupName: 'general',
      },
    }),
    quoteLineRecordPageFieldsDiscountPercent:
      createStandardViewFieldFlatMetadata({
        ...args,
        objectName: 'quoteLine',
        context: {
          viewName: 'quoteLineRecordPageFields',
          viewFieldName: 'discountPercent',
          fieldName: 'discountPercent',
          position: 3,
          isVisible: true,
          size: 150,
          viewFieldGroupName: 'general',
        },
      }),
    quoteLineRecordPageFieldsFieldValues: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quoteLine',
      context: {
        viewName: 'quoteLineRecordPageFields',
        viewFieldName: 'fieldValues',
        fieldName: 'fieldValues',
        position: 4,
        isVisible: true,
        size: 200,
        viewFieldGroupName: 'general',
      },
    }),
    quoteLineRecordPageFieldsUnitPrice: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quoteLine',
      context: {
        viewName: 'quoteLineRecordPageFields',
        viewFieldName: 'unitPrice',
        fieldName: 'unitPrice',
        position: 5,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    quoteLineRecordPageFieldsTotalPrice: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quoteLine',
      context: {
        viewName: 'quoteLineRecordPageFields',
        viewFieldName: 'totalPrice',
        fieldName: 'totalPrice',
        position: 6,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    // System group
    quoteLineRecordPageFieldsCreatedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quoteLine',
      context: {
        viewName: 'quoteLineRecordPageFields',
        viewFieldName: 'createdAt',
        fieldName: 'createdAt',
        position: 0,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'system',
      },
    }),
    quoteLineRecordPageFieldsCreatedBy: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quoteLine',
      context: {
        viewName: 'quoteLineRecordPageFields',
        viewFieldName: 'createdBy',
        fieldName: 'createdBy',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'system',
      },
    }),
    quoteLineRecordPageFieldsUpdatedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quoteLine',
      context: {
        viewName: 'quoteLineRecordPageFields',
        viewFieldName: 'updatedAt',
        fieldName: 'updatedAt',
        position: 2,
        isVisible: false,
        size: 150,
        viewFieldGroupName: 'system',
      },
    }),
    quoteLineRecordPageFieldsUpdatedBy: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quoteLine',
      context: {
        viewName: 'quoteLineRecordPageFields',
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
