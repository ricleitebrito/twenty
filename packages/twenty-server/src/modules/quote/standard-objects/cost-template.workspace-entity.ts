import { type ActorMetadata } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';
import { type CostTemplateFieldWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template-field.workspace-entity';
import { type CostTemplateStepWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template-step.workspace-entity';

export class CostTemplateWorkspaceEntity extends BaseWorkspaceEntity {
  name: string | null;
  description: string | null;
  fields: EntityRelation<CostTemplateFieldWorkspaceEntity[]>;
  steps: EntityRelation<CostTemplateStepWorkspaceEntity[]>;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  searchVector: string;
}
