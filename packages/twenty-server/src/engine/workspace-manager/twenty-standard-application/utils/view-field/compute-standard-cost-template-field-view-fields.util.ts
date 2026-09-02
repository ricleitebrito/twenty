import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import {
  createStandardViewFieldFlatMetadata,
  type CreateStandardViewFieldArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field/create-standard-view-field-flat-metadata.util';

export const computeStandardCostTemplateFieldViewFields = (
  args: Omit<CreateStandardViewFieldArgs<'costTemplateField'>, 'context'>,
): Record<string, FlatViewField> => {
  return {
    allCostTemplateFieldsName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplateField',
      context: {
        viewName: 'allCostTemplateFields',
        viewFieldName: 'name',
        fieldName: 'name',
        position: 0,
        isVisible: true,
        size: 210,
      },
    }),
    allCostTemplateFieldsVariableName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplateField',
      context: {
        viewName: 'allCostTemplateFields',
        viewFieldName: 'variableName',
        fieldName: 'variableName',
        position: 1,
        isVisible: true,
        size: 150,
      },
    }),
    allCostTemplateFieldsFieldType: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplateField',
      context: {
        viewName: 'allCostTemplateFields',
        viewFieldName: 'fieldType',
        fieldName: 'fieldType',
        position: 2,
        isVisible: true,
        size: 150,
      },
    }),
    allCostTemplateFieldsIsRequired: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplateField',
      context: {
        viewName: 'allCostTemplateFields',
        viewFieldName: 'isRequired',
        fieldName: 'isRequired',
        position: 3,
        isVisible: true,
        size: 100,
      },
    }),

    // costTemplateFieldRecordPageFields view fields
    // General group
    costTemplateFieldRecordPageFieldsCostTemplate:
      createStandardViewFieldFlatMetadata({
        ...args,
        objectName: 'costTemplateField',
        context: {
          viewName: 'costTemplateFieldRecordPageFields',
          viewFieldName: 'costTemplate',
          fieldName: 'costTemplate',
          position: 0,
          isVisible: true,
          size: 150,
          viewFieldGroupName: 'general',
        },
      }),
    costTemplateFieldRecordPageFieldsName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplateField',
      context: {
        viewName: 'costTemplateFieldRecordPageFields',
        viewFieldName: 'name',
        fieldName: 'name',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    costTemplateFieldRecordPageFieldsVariableName:
      createStandardViewFieldFlatMetadata({
        ...args,
        objectName: 'costTemplateField',
        context: {
          viewName: 'costTemplateFieldRecordPageFields',
          viewFieldName: 'variableName',
          fieldName: 'variableName',
          position: 2,
          isVisible: true,
          size: 150,
          viewFieldGroupName: 'general',
        },
      }),
    costTemplateFieldRecordPageFieldsFieldType:
      createStandardViewFieldFlatMetadata({
        ...args,
        objectName: 'costTemplateField',
        context: {
          viewName: 'costTemplateFieldRecordPageFields',
          viewFieldName: 'fieldType',
          fieldName: 'fieldType',
          position: 3,
          isVisible: true,
          size: 150,
          viewFieldGroupName: 'general',
        },
      }),
    costTemplateFieldRecordPageFieldsPicklistOptions:
      createStandardViewFieldFlatMetadata({
        ...args,
        objectName: 'costTemplateField',
        context: {
          viewName: 'costTemplateFieldRecordPageFields',
          viewFieldName: 'picklistOptions',
          fieldName: 'picklistOptions',
          position: 4,
          isVisible: true,
          size: 200,
          viewFieldGroupName: 'general',
        },
      }),
    costTemplateFieldRecordPageFieldsDefaultValue:
      createStandardViewFieldFlatMetadata({
        ...args,
        objectName: 'costTemplateField',
        context: {
          viewName: 'costTemplateFieldRecordPageFields',
          viewFieldName: 'defaultValue',
          fieldName: 'defaultValue',
          position: 5,
          isVisible: true,
          size: 150,
          viewFieldGroupName: 'general',
        },
      }),
    costTemplateFieldRecordPageFieldsIsRequired:
      createStandardViewFieldFlatMetadata({
        ...args,
        objectName: 'costTemplateField',
        context: {
          viewName: 'costTemplateFieldRecordPageFields',
          viewFieldName: 'isRequired',
          fieldName: 'isRequired',
          position: 6,
          isVisible: true,
          size: 100,
          viewFieldGroupName: 'general',
        },
      }),
    // System group
    costTemplateFieldRecordPageFieldsCreatedAt:
      createStandardViewFieldFlatMetadata({
        ...args,
        objectName: 'costTemplateField',
        context: {
          viewName: 'costTemplateFieldRecordPageFields',
          viewFieldName: 'createdAt',
          fieldName: 'createdAt',
          position: 0,
          isVisible: true,
          size: 150,
          viewFieldGroupName: 'system',
        },
      }),
    costTemplateFieldRecordPageFieldsCreatedBy:
      createStandardViewFieldFlatMetadata({
        ...args,
        objectName: 'costTemplateField',
        context: {
          viewName: 'costTemplateFieldRecordPageFields',
          viewFieldName: 'createdBy',
          fieldName: 'createdBy',
          position: 1,
          isVisible: true,
          size: 150,
          viewFieldGroupName: 'system',
        },
      }),
    costTemplateFieldRecordPageFieldsUpdatedAt:
      createStandardViewFieldFlatMetadata({
        ...args,
        objectName: 'costTemplateField',
        context: {
          viewName: 'costTemplateFieldRecordPageFields',
          viewFieldName: 'updatedAt',
          fieldName: 'updatedAt',
          position: 2,
          isVisible: false,
          size: 150,
          viewFieldGroupName: 'system',
        },
      }),
    costTemplateFieldRecordPageFieldsUpdatedBy:
      createStandardViewFieldFlatMetadata({
        ...args,
        objectName: 'costTemplateField',
        context: {
          viewName: 'costTemplateFieldRecordPageFields',
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
