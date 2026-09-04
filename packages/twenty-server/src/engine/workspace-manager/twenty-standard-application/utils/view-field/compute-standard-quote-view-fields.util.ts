import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import {
  createStandardViewFieldFlatMetadata,
  type CreateStandardViewFieldArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field/create-standard-view-field-flat-metadata.util';

export const computeStandardQuoteViewFields = (
  args: Omit<CreateStandardViewFieldArgs<'quote'>, 'context'>,
): Record<string, FlatViewField> => {
  return {
    allQuotesName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quote',
      context: {
        viewName: 'allQuotes',
        viewFieldName: 'name',
        fieldName: 'name',
        position: 0,
        isVisible: true,
        size: 210,
      },
    }),
    allQuotesStatus: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quote',
      context: {
        viewName: 'allQuotes',
        viewFieldName: 'status',
        fieldName: 'status',
        position: 1,
        isVisible: true,
        size: 150,
      },
    }),
    allQuotesOpportunity: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quote',
      context: {
        viewName: 'allQuotes',
        viewFieldName: 'opportunity',
        fieldName: 'opportunity',
        position: 2,
        isVisible: true,
        size: 150,
      },
    }),
    allQuotesTotalAmount: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quote',
      context: {
        viewName: 'allQuotes',
        viewFieldName: 'totalAmount',
        fieldName: 'totalAmount',
        position: 3,
        isVisible: true,
        size: 150,
      },
    }),

    // quoteRecordPageFields view fields
    // General group
    quoteRecordPageFieldsStatus: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quote',
      context: {
        viewName: 'quoteRecordPageFields',
        viewFieldName: 'status',
        fieldName: 'status',
        position: 0,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    quoteRecordPageFieldsOpportunity: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quote',
      context: {
        viewName: 'quoteRecordPageFields',
        viewFieldName: 'opportunity',
        fieldName: 'opportunity',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    quoteRecordPageFieldsCompany: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quote',
      context: {
        viewName: 'quoteRecordPageFields',
        viewFieldName: 'company',
        fieldName: 'company',
        position: 2,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    quoteRecordPageFieldsPerson: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quote',
      context: {
        viewName: 'quoteRecordPageFields',
        viewFieldName: 'person',
        fieldName: 'person',
        position: 3,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    quoteRecordPageFieldsValidUntil: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quote',
      context: {
        viewName: 'quoteRecordPageFields',
        viewFieldName: 'validUntil',
        fieldName: 'validUntil',
        position: 4,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    quoteRecordPageFieldsTotalAmount: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quote',
      context: {
        viewName: 'quoteRecordPageFields',
        viewFieldName: 'totalAmount',
        fieldName: 'totalAmount',
        position: 5,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    quoteRecordPageFieldsAttachments: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quote',
      context: {
        viewName: 'quoteRecordPageFields',
        viewFieldName: 'attachments',
        fieldName: 'attachments',
        position: 6,
        isVisible: false,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    // System group
    quoteRecordPageFieldsCreatedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quote',
      context: {
        viewName: 'quoteRecordPageFields',
        viewFieldName: 'createdAt',
        fieldName: 'createdAt',
        position: 0,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'system',
      },
    }),
    quoteRecordPageFieldsCreatedBy: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quote',
      context: {
        viewName: 'quoteRecordPageFields',
        viewFieldName: 'createdBy',
        fieldName: 'createdBy',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'system',
      },
    }),
    quoteRecordPageFieldsUpdatedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quote',
      context: {
        viewName: 'quoteRecordPageFields',
        viewFieldName: 'updatedAt',
        fieldName: 'updatedAt',
        position: 2,
        isVisible: false,
        size: 150,
        viewFieldGroupName: 'system',
      },
    }),
    quoteRecordPageFieldsUpdatedBy: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'quote',
      context: {
        viewName: 'quoteRecordPageFields',
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
