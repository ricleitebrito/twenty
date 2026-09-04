import { type ActorMetadata, type CurrencyMetadata } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';
import { type ProductWorkspaceEntity } from 'src/modules/quote/standard-objects/product.workspace-entity';
import { type QuoteWorkspaceEntity } from 'src/modules/quote/standard-objects/quote.workspace-entity';

export class QuoteLineWorkspaceEntity extends BaseWorkspaceEntity {
  quote: EntityRelation<QuoteWorkspaceEntity> | null;
  quoteId: string | null;
  product: EntityRelation<ProductWorkspaceEntity> | null;
  productId: string | null;
  quantity: number;
  discountPercent: number | null;
  fieldValues: Record<string, unknown> | null;
  unitPrice: CurrencyMetadata | null;
  totalPrice: CurrencyMetadata | null;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  searchVector: string;
}
