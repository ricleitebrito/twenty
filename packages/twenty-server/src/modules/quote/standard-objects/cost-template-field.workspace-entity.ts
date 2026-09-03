import { type ActorMetadata } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';
import { type CostTemplateWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template.workspace-entity';

export type CostTemplateFieldType =
  | 'NUMBER'
  | 'CURRENCY'
  | 'PERCENTAGE'
  | 'BOOLEAN'
  | 'PICKLIST';

export class CostTemplateFieldWorkspaceEntity extends BaseWorkspaceEntity {
  costTemplate: EntityRelation<CostTemplateWorkspaceEntity> | null;
  costTemplateId: string | null;
  name: string | null;
  variableName: string | null;
  fieldType: CostTemplateFieldType;
  picklistOptions: Record<string, unknown> | null;
  defaultValue: string | null;
  isRequired: boolean;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  searchVector: string;
}
