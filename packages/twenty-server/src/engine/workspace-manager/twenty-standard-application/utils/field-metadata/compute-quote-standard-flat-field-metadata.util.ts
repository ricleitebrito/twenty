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

export const buildQuoteStandardFlatFieldMetadatas = ({
  now,
  objectName,
  workspaceId,
  standardObjectMetadataRelatedEntityIds,
  dependencyFlatEntityMaps,
  twentyStandardApplicationId,
}: Omit<
  CreateStandardFieldArgs<'quote', FieldMetadataType>,
  'context'
>): Record<AllStandardObjectFieldName<'quote'>, FlatFieldMetadata> => ({
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
          message: `Quote record position`,
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
      icon: 'IconFileText',
      isSystem: true,
      isNullable: true,
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
        msg({ message: `Quote name`, context: 'fieldMetadata.description' }),
      ),
      icon: 'IconFileText',
      isNullable: false,
      defaultValue: "''",
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  status: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'status',
      type: FieldMetadataType.SELECT,
      label: i18nLabel(
        msg({ message: `Status`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({ message: `Quote status`, context: 'fieldMetadata.description' }),
      ),
      icon: 'IconProgressCheck',
      isNullable: false,
      defaultValue: "'DRAFT'",
      options: [
        {
          id: 'fd47e557-cf5b-4ce4-819d-62397c108118',
          value: 'DRAFT',
          label: i18nLabel(
            msg({ message: `Draft`, context: 'fieldMetadata.label' }),
          ),
          position: 0,
          color: 'gray',
        },
        {
          id: 'e0591387-d400-4b4b-83f0-dde80b233f4a',
          value: 'IN_REVIEW',
          label: i18nLabel(
            msg({ message: `In Review`, context: 'fieldMetadata.label' }),
          ),
          position: 1,
          color: 'yellow',
        },
        {
          id: '00d7fec4-ca51-4de4-859c-d8b2df7d8a18',
          value: 'APPROVED',
          label: i18nLabel(
            msg({ message: `Approved`, context: 'fieldMetadata.label' }),
          ),
          position: 2,
          color: 'sky',
        },
        {
          id: '9c8e5863-2982-4a07-8967-66292dd2acea',
          value: 'SENT',
          label: i18nLabel(
            msg({ message: `Sent`, context: 'fieldMetadata.label' }),
          ),
          position: 3,
          color: 'blue',
        },
        {
          id: '5528c9b8-6312-4e1b-93e2-bfb5ecc57b58',
          value: 'ACCEPTED',
          label: i18nLabel(
            msg({ message: `Accepted`, context: 'fieldMetadata.label' }),
          ),
          position: 4,
          color: 'green',
        },
        {
          id: '8338c650-b4b0-45cd-95a4-91cd621f7edd',
          value: 'REJECTED',
          label: i18nLabel(
            msg({ message: `Rejected`, context: 'fieldMetadata.label' }),
          ),
          position: 5,
          color: 'red',
        },
        {
          id: '7f472930-8ffa-4e1b-982a-c15007f6e09f',
          value: 'EXPIRED',
          label: i18nLabel(
            msg({ message: `Expired`, context: 'fieldMetadata.label' }),
          ),
          position: 6,
          color: 'orange',
        },
      ],
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  opportunity: createStandardRelationFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      type: FieldMetadataType.RELATION,
      morphId: null,
      fieldName: 'opportunity',
      label: i18nLabel(
        msg({ message: `Opportunity`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Quote opportunity`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconTargetArrow',
      isNullable: false,
      isUIEditable: true,
      targetObjectName: 'opportunity',
      targetFieldName: 'quotes',
      settings: {
        relationType: RelationType.MANY_TO_ONE,
        onDelete: RelationOnDeleteAction.CASCADE,
        joinColumnName: 'opportunityId',
      },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  company: createStandardRelationFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      type: FieldMetadataType.RELATION,
      morphId: null,
      fieldName: 'company',
      label: i18nLabel(
        msg({ message: `Company`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({ message: `Quote company`, context: 'fieldMetadata.description' }),
      ),
      icon: 'IconBuildingSkyscraper',
      isNullable: true,
      isUIEditable: true,
      targetObjectName: 'company',
      targetFieldName: 'quotes',
      settings: {
        relationType: RelationType.MANY_TO_ONE,
        onDelete: RelationOnDeleteAction.SET_NULL,
        joinColumnName: 'companyId',
      },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  person: createStandardRelationFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      type: FieldMetadataType.RELATION,
      morphId: null,
      fieldName: 'person',
      label: i18nLabel(
        msg({ message: `Person`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({ message: `Quote person`, context: 'fieldMetadata.description' }),
      ),
      icon: 'IconUser',
      isNullable: true,
      isUIEditable: true,
      targetObjectName: 'person',
      targetFieldName: 'quotes',
      settings: {
        relationType: RelationType.MANY_TO_ONE,
        onDelete: RelationOnDeleteAction.SET_NULL,
        joinColumnName: 'personId',
      },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  validUntil: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'validUntil',
      type: FieldMetadataType.DATE,
      label: i18nLabel(
        msg({ message: `Valid Until`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Date this quote's pricing is valid until`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconCalendarClock',
      isNullable: true,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  totalAmount: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'totalAmount',
      type: FieldMetadataType.CURRENCY,
      label: i18nLabel(
        msg({ message: `Total Amount`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Sum of this quote's line totals`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconCurrencyDollar',
      isNullable: true,
      isUIEditable: false,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  attachments: createStandardRelationFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      type: FieldMetadataType.RELATION,
      morphId: null,
      fieldName: 'attachments',
      label: i18nLabel(
        msg({ message: `Attachments`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Quote attachments`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconFileImport',
      isNullable: false,
      isUIEditable: false,
      isSystemSideEffect: true,
      targetObjectName: 'attachment',
      targetFieldName: 'targetQuote',
      settings: {
        relationType: RelationType.ONE_TO_MANY,
      },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
});
