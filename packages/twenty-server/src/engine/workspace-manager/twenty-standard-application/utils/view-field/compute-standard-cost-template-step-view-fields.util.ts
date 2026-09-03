import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import {
  createStandardViewFieldFlatMetadata,
  type CreateStandardViewFieldArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field/create-standard-view-field-flat-metadata.util';

export const computeStandardCostTemplateStepViewFields = (
  args: Omit<CreateStandardViewFieldArgs<'costTemplateStep'>, 'context'>,
): Record<string, FlatViewField> => {
  return {
    allCostTemplateStepsName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplateStep',
      context: {
        viewName: 'allCostTemplateSteps',
        viewFieldName: 'name',
        fieldName: 'name',
        position: 0,
        isVisible: true,
        size: 210,
      },
    }),
    allCostTemplateStepsVariableName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplateStep',
      context: {
        viewName: 'allCostTemplateSteps',
        viewFieldName: 'variableName',
        fieldName: 'variableName',
        position: 1,
        isVisible: true,
        size: 150,
      },
    }),
    allCostTemplateStepsFormula: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplateStep',
      context: {
        viewName: 'allCostTemplateSteps',
        viewFieldName: 'formula',
        fieldName: 'formula',
        position: 2,
        isVisible: true,
        size: 250,
      },
    }),
    allCostTemplateStepsIsOutput: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplateStep',
      context: {
        viewName: 'allCostTemplateSteps',
        viewFieldName: 'isOutput',
        fieldName: 'isOutput',
        position: 3,
        isVisible: true,
        size: 100,
      },
    }),

    // costTemplateStepRecordPageFields view fields
    // General group
    costTemplateStepRecordPageFieldsCostTemplate:
      createStandardViewFieldFlatMetadata({
        ...args,
        objectName: 'costTemplateStep',
        context: {
          viewName: 'costTemplateStepRecordPageFields',
          viewFieldName: 'costTemplate',
          fieldName: 'costTemplate',
          position: 0,
          isVisible: true,
          size: 150,
          viewFieldGroupName: 'general',
        },
      }),
    costTemplateStepRecordPageFieldsName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'costTemplateStep',
      context: {
        viewName: 'costTemplateStepRecordPageFields',
        viewFieldName: 'name',
        fieldName: 'name',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'general',
      },
    }),
    costTemplateStepRecordPageFieldsVariableName:
      createStandardViewFieldFlatMetadata({
        ...args,
        objectName: 'costTemplateStep',
        context: {
          viewName: 'costTemplateStepRecordPageFields',
          viewFieldName: 'variableName',
          fieldName: 'variableName',
          position: 2,
          isVisible: true,
          size: 150,
          viewFieldGroupName: 'general',
        },
      }),
    costTemplateStepRecordPageFieldsFormula:
      createStandardViewFieldFlatMetadata({
        ...args,
        objectName: 'costTemplateStep',
        context: {
          viewName: 'costTemplateStepRecordPageFields',
          viewFieldName: 'formula',
          fieldName: 'formula',
          position: 3,
          isVisible: true,
          size: 250,
          viewFieldGroupName: 'general',
        },
      }),
    costTemplateStepRecordPageFieldsIsOutput:
      createStandardViewFieldFlatMetadata({
        ...args,
        objectName: 'costTemplateStep',
        context: {
          viewName: 'costTemplateStepRecordPageFields',
          viewFieldName: 'isOutput',
          fieldName: 'isOutput',
          position: 4,
          isVisible: true,
          size: 100,
          viewFieldGroupName: 'general',
        },
      }),
    // System group
    costTemplateStepRecordPageFieldsCreatedAt:
      createStandardViewFieldFlatMetadata({
        ...args,
        objectName: 'costTemplateStep',
        context: {
          viewName: 'costTemplateStepRecordPageFields',
          viewFieldName: 'createdAt',
          fieldName: 'createdAt',
          position: 0,
          isVisible: true,
          size: 150,
          viewFieldGroupName: 'system',
        },
      }),
    costTemplateStepRecordPageFieldsCreatedBy:
      createStandardViewFieldFlatMetadata({
        ...args,
        objectName: 'costTemplateStep',
        context: {
          viewName: 'costTemplateStepRecordPageFields',
          viewFieldName: 'createdBy',
          fieldName: 'createdBy',
          position: 1,
          isVisible: true,
          size: 150,
          viewFieldGroupName: 'system',
        },
      }),
    costTemplateStepRecordPageFieldsUpdatedAt:
      createStandardViewFieldFlatMetadata({
        ...args,
        objectName: 'costTemplateStep',
        context: {
          viewName: 'costTemplateStepRecordPageFields',
          viewFieldName: 'updatedAt',
          fieldName: 'updatedAt',
          position: 2,
          isVisible: false,
          size: 150,
          viewFieldGroupName: 'system',
        },
      }),
    costTemplateStepRecordPageFieldsUpdatedBy:
      createStandardViewFieldFlatMetadata({
        ...args,
        objectName: 'costTemplateStep',
        context: {
          viewName: 'costTemplateStepRecordPageFields',
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
