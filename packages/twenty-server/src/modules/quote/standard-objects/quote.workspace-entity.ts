import { type ActorMetadata, type CurrencyMetadata } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';
import { type AttachmentWorkspaceEntity } from 'src/modules/attachment/standard-objects/attachment.workspace-entity';
import { type CompanyWorkspaceEntity } from 'src/modules/company/standard-objects/company.workspace-entity';
import { type OpportunityWorkspaceEntity } from 'src/modules/opportunity/standard-objects/opportunity.workspace-entity';
import { type PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';

export type QuoteStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'SENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED';

export class QuoteWorkspaceEntity extends BaseWorkspaceEntity {
  name: string | null;
  status: QuoteStatus;
  opportunity: EntityRelation<OpportunityWorkspaceEntity> | null;
  opportunityId: string | null;
  company: EntityRelation<CompanyWorkspaceEntity> | null;
  companyId: string | null;
  person: EntityRelation<PersonWorkspaceEntity> | null;
  personId: string | null;
  validUntil: string | null;
  totalAmount: CurrencyMetadata | null;
  attachments: EntityRelation<AttachmentWorkspaceEntity[]>;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  searchVector: string;
}
