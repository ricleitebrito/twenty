import { type ActorMetadata } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';
import { type CostTemplateWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template.workspace-entity';

export class CostTemplateStepWorkspaceEntity extends BaseWorkspaceEntity {
  costTemplate: EntityRelation<CostTemplateWorkspaceEntity> | null;
  costTemplateId: string | null;
  name: string | null;
  variableName: string | null;
  formula: string;
  isOutput: boolean;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  searchVector: string;
}
