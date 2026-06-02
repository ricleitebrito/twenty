import { type ActorMetadata, type CurrencyMetadata } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';
import { type PriceCatalogWorkspaceEntity } from 'src/modules/price-catalog/standard-objects/price-catalog.workspace-entity';
import { type ProductWorkspaceEntity } from 'src/modules/product/standard-objects/product.workspace-entity';

// Junction object realizing the many-to-many between Product and PriceCatalog.
// Inspired by Salesforce PricebookEntry: holds the unit price for a product in a given catalog.
export class PriceCatalogEntryWorkspaceEntity extends BaseWorkspaceEntity {
  unitPrice: CurrencyMetadata | null;
  isActive: boolean;
  position: number;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  product: EntityRelation<ProductWorkspaceEntity> | null;
  productId: string | null;
  priceCatalog: EntityRelation<PriceCatalogWorkspaceEntity> | null;
  priceCatalogId: string | null;
}
