import { type ActorMetadata, FieldMetadataType } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type FieldTypeAndNameMetadata } from 'src/engine/workspace-manager/utils/get-ts-vector-column-expression.util';
import { type EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';
import { type PriceCatalogEntryWorkspaceEntity } from 'src/modules/price-catalog/standard-objects/price-catalog-entry.workspace-entity';

const NAME_FIELD_NAME = 'name';
const PRODUCT_CODE_FIELD_NAME = 'productCode';

export const SEARCH_FIELDS_FOR_PRODUCT: FieldTypeAndNameMetadata[] = [
  { name: NAME_FIELD_NAME, type: FieldMetadataType.TEXT },
  { name: PRODUCT_CODE_FIELD_NAME, type: FieldMetadataType.TEXT },
];

export class ProductWorkspaceEntity extends BaseWorkspaceEntity {
  name: string;
  productCode: string | null;
  description: string | null;
  family: string | null;
  isActive: boolean;
  unitOfMeasure: string | null;
  position: number;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  priceCatalogEntries: EntityRelation<PriceCatalogEntryWorkspaceEntity[]>;
  searchVector: string;
}
