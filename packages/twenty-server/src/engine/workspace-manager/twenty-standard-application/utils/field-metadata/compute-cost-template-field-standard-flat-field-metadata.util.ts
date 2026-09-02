import { msg } from '@lingui/core/macro';
import {
  DateDisplayFormat,
  FieldMetadataType,
  RelationOnDeleteAction,
  RelationType,
} from 'twenty-shared/types';

import { i18nLabel } from 'src/engine/workspace-manager/twenty-standard-application/utils/i18n-label.util';

import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type AllStandardObjectFieldName } from 'src/engine/workspace-manager/twenty-standard-application/types/all-standard-object-field-name.type';
import {
  type CreateStandardFieldArgs,
  createStandardFieldFlatMetadata,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/create-standard-field-flat-metadata.util';
import { createStandardRelationFieldFlatMetadata } from 'src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/create-standard-relation-field-flat-metadata.util';

export const buildCostTemplateFieldStandardFlatFieldMetadatas = ({
  now,
  objectName,
  workspaceId,
  standardObjectMetadataRelatedEntityIds,
  dependencyFlatEntityMaps,
  twentyStandardApplicationId,
}: Omit<
  CreateStandardFieldArgs<'costTemplateField', FieldMetadataType>,
  'context'
>): Record<
  AllStandardObjectFieldName<'costTemplateField'>,
  FlatFieldMetadata
> => ({
  id: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'id',
      type: FieldMetadataType.UUID,
      label: i18nLabel(msg({ message: `Id`, context: 'fieldMetadata.label' })),
      description: i18nLabel(
        msg({ message: `Id`, context: 'fieldMetadata.description' }),
      ),
      icon: 'Icon123',
      isSystem: true,
      isNullable: false,
      isUIEditable: false,
      defaultValue: 'uuid',
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  createdAt: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'createdAt',
      type: FieldMetadataType.DATE_TIME,
      label: i18nLabel(
        msg({ message: `Creation date`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({ message: `Creation date`, context: 'fieldMetadata.description' }),
      ),
      icon: 'IconCalendar',
      isSystem: true,
      isNullable: false,
      isUIEditable: false,
      defaultValue: 'now',
      settings: { displayFormat: DateDisplayFormat.RELATIVE },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  updatedAt: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'updatedAt',
      type: FieldMetadataType.DATE_TIME,
      label: i18nLabel(
        msg({ message: `Last update`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Last time the record was changed`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconCalendarClock',
      isSystem: true,
      isNullable: false,
      isUIEditable: false,
      defaultValue: 'now',
      settings: { displayFormat: DateDisplayFormat.RELATIVE },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  deletedAt: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'deletedAt',
      type: FieldMetadataType.DATE_TIME,
      label: i18nLabel(
        msg({ message: `Deleted at`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Date when the record was deleted`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconCalendarMinus',
      isSystem: true,
      isNullable: true,
      isUIEditable: false,
      settings: { displayFormat: DateDisplayFormat.RELATIVE },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  position: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'position',
      type: FieldMetadataType.POSITION,
      label: i18nLabel(
        msg({ message: `Position`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Cost template record position`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconHierarchy2',
      isSystem: true,
      isNullable: false,
      defaultValue: 0,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  createdBy: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'createdBy',
      type: FieldMetadataType.ACTOR,
      label: i18nLabel(
        msg({ message: `Created by`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The creator of the record`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconCreativeCommonsSa',
      isSystem: true,
      isUIEditable: false,
      isNullable: false,
      defaultValue: {
        source: "'MANUAL'",
        name: "'System'",
        workspaceMemberId: null,
      },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  updatedBy: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'updatedBy',
      type: FieldMetadataType.ACTOR,
      label: i18nLabel(
        msg({ message: `Updated by`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The workspace member who last updated the record`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconUserCircle',
      isSystem: true,
      isUIEditable: false,
      isNullable: false,
      defaultValue: {
        source: "'MANUAL'",
        name: "'System'",
        workspaceMemberId: null,
      },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  searchVector: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'searchVector',
      type: FieldMetadataType.TS_VECTOR,
      label: i18nLabel(
        msg({ message: `Search vector`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Field used for full-text search`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconForms',
      isSystem: true,
      isNullable: true,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  costTemplate: createStandardRelationFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      type: FieldMetadataType.RELATION,
      morphId: null,
      fieldName: 'costTemplate',
      label: i18nLabel(
        msg({ message: `Cost Template`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The cost template this field belongs to`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconCalculator',
      isNullable: false,
      isUIEditable: false,
      targetObjectName: 'costTemplate',
      targetFieldName: 'fields',
      settings: {
        relationType: RelationType.MANY_TO_ONE,
        onDelete: RelationOnDeleteAction.CASCADE,
        joinColumnName: 'costTemplateId',
      },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  name: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'name',
      type: FieldMetadataType.TEXT,
      label: i18nLabel(
        msg({ message: `Name`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The field's display name`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconTag',
      isNullable: true,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  variableName: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'variableName',
      type: FieldMetadataType.TEXT,
      label: i18nLabel(
        msg({ message: `Variable Name`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The formula variable name used to reference this field's value in cost template steps. Must be unique within the cost template.`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconVariable',
      isNullable: false,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  fieldType: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'fieldType',
      type: FieldMetadataType.SELECT,
      label: i18nLabel(
        msg({ message: `Field Type`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The input type shown to the user filling in this field`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconList',
      isNullable: false,
      defaultValue: "'NUMBER'",
      options: [
        {
          id: '413dcdce-99bb-4b21-bc39-9df3038cd837',
          value: 'NUMBER',
          label: i18nLabel(
            msg({ message: `Number`, context: 'fieldMetadata.label' }),
          ),
          position: 0,
          color: 'sky',
        },
        {
          id: 'ec67285f-3e4f-4923-b818-9bc4bc3fbd4e',
          value: 'CURRENCY',
          label: i18nLabel(
            msg({ message: `Currency`, context: 'fieldMetadata.label' }),
          ),
          position: 1,
          color: 'green',
        },
        {
          id: 'd967416f-279d-4574-aeb2-964219e42471',
          value: 'PERCENTAGE',
          label: i18nLabel(
            msg({ message: `Percentage`, context: 'fieldMetadata.label' }),
          ),
          position: 2,
          color: 'orange',
        },
        {
          id: 'e3fe565e-4e78-4a9d-a074-69349169e7ae',
          value: 'BOOLEAN',
          label: i18nLabel(
            msg({ message: `Boolean`, context: 'fieldMetadata.label' }),
          ),
          position: 3,
          color: 'purple',
        },
        {
          id: 'c6fd441d-383c-418b-9fd9-76dcad92bb43',
          value: 'PICKLIST',
          label: i18nLabel(
            msg({ message: `Picklist`, context: 'fieldMetadata.label' }),
          ),
          position: 4,
          color: 'pink',
        },
      ],
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  picklistOptions: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'picklistOptions',
      type: FieldMetadataType.RAW_JSON,
      label: i18nLabel(
        msg({ message: `Picklist Options`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The list of { label, value } options, required when Field Type is Picklist`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconListDetails',
      isNullable: true,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  defaultValue: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'defaultValue',
      type: FieldMetadataType.TEXT,
      label: i18nLabel(
        msg({ message: `Default Value`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The value pre-filled when a quote line is created`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconPencil',
      isNullable: true,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  isRequired: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'isRequired',
      type: FieldMetadataType.BOOLEAN,
      label: i18nLabel(
        msg({ message: `Is Required`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Whether a quote line must provide this field before its price can be calculated`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconAsterisk',
      isNullable: false,
      defaultValue: true,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
});
