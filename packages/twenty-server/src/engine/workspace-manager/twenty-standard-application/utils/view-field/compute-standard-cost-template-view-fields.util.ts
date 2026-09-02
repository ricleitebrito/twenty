import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import {
  createStandardViewFieldFlatMetadata,
  type CreateStandardViewFieldArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field/create-standard-view-field-flat-metadata.util';

export const computeStandardCostTemplateViewFields = (
  args: Omit<CreateStandardViewFieldArgs<'costTemplate'>, 'context'>,
): Record<string, FlatViewField> => {
  return {
    allCostTemplatesName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplate',
      context: {
        viewName: 'allCostTemplates',
        viewFieldName: 'name',
        fieldName: 'name',
        position: 0,
        isVisible: true,
        size: 210,
      },
    }),
    allCostTemplatesDescription: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplate',
      context: {
        viewName: 'allCostTemplates',
        viewFieldName: 'description',
        fieldName: 'description',
        position: 1,
        isVisible: true,
        size: 210,
      },
    }),
    allCostTemplatesCreatedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplate',
      context: {
        viewName: 'allCostTemplates',
        viewFieldName: 'createdAt',
        fieldName: 'createdAt',
        position: 2,
        isVisible: true,
        size: 150,
      },
    }),

    // costTemplateRecordPageFields view fields
    // General group
    costTemplateRecordPageFieldsDescription:
      createStandardViewFieldFlatMetadata({
        ...args,
        objectName: 'costTemplate',
        context: {
          viewName: 'costTemplateRecordPageFields',
          viewFieldName: 'description',
          fieldName: 'description',
          position: 0,
          isVisible: true,
          size: 150,
          viewFieldGroupName: 'general',
        },
      }),
    costTemplateRecordPageFieldsFields: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplate',
      context: {
        viewName: 'costTemplateRecordPageFields',
        viewFieldName: 'fields',
        fieldName: 'fields',
        position: 1,
        isVisible: false,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    costTemplateRecordPageFieldsSteps: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplate',
      context: {
        viewName: 'costTemplateRecordPageFields',
        viewFieldName: 'steps',
        fieldName: 'steps',
        position: 2,
        isVisible: false,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    costTemplateRecordPageFieldsProducts: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplate',
      context: {
        viewName: 'costTemplateRecordPageFields',
        viewFieldName: 'products',
        fieldName: 'products',
        position: 3,
        isVisible: false,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    // System group
    costTemplateRecordPageFieldsCreatedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplate',
      context: {
        viewName: 'costTemplateRecordPageFields',
        viewFieldName: 'createdAt',
        fieldName: 'createdAt',
        position: 0,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'system',
      },
    }),
    costTemplateRecordPageFieldsCreatedBy: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplate',
      context: {
        viewName: 'costTemplateRecordPageFields',
        viewFieldName: 'createdBy',
        fieldName: 'createdBy',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'system',
      },
    }),
    costTemplateRecordPageFieldsUpdatedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplate',
      context: {
        viewName: 'costTemplateRecordPageFields',
        viewFieldName: 'updatedAt',
        fieldName: 'updatedAt',
        position: 2,
        isVisible: false,
        size: 150,
        viewFieldGroupName: 'system',
      },
    }),
    costTemplateRecordPageFieldsUpdatedBy: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplate',
      context: {
        viewName: 'costTemplateRecordPageFields',
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
