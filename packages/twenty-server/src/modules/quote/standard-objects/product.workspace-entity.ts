import { type ActorMetadata, type CurrencyMetadata } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';
import { type CostTemplateWorkspaceEntity } from 'src/modules/quote/standard-objects/cost-template.workspace-entity';

export class ProductWorkspaceEntity extends BaseWorkspaceEntity {
  name: string | null;
  sku: string | null;
  description: string | null;
  basePrice: CurrencyMetadata | null;
  isActive: boolean;
  costTemplate: EntityRelation<CostTemplateWorkspaceEntity> | null;
  costTemplateId: string | null;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  searchVector: string;
}
