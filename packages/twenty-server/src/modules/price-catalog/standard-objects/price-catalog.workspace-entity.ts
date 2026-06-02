import { type ActorMetadata, FieldMetadataType } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type FieldTypeAndNameMetadata } from 'src/engine/workspace-manager/utils/get-ts-vector-column-expression.util';
import { type EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';
import { type PriceCatalogEntryWorkspaceEntity } from 'src/modules/price-catalog/standard-objects/price-catalog-entry.workspace-entity';

const NAME_FIELD_NAME = 'name';

export const SEARCH_FIELDS_FOR_PRICE_CATALOG: FieldTypeAndNameMetadata[] = [
  { name: NAME_FIELD_NAME, type: FieldMetadataType.TEXT },
];

export class PriceCatalogWorkspaceEntity extends BaseWorkspaceEntity {
  name: string;
  description: string | null;
  isActive: boolean;
  isStandard: boolean;
  position: number;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  priceCatalogEntries: EntityRelation<PriceCatalogEntryWorkspaceEntity[]>;
  searchVector: string;
}
