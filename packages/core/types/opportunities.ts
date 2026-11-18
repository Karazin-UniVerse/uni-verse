import type {
  OpportunityAppStatus,
  OpportunityLifecycle,
  OpportunityModerateAction,
  OpportunityPaymentType,
  OpportunityStatus,
} from '../constants/opportunities.ts';
import type { OpportunityTag } from '../constants/tags.ts';

export interface OpportunityOwner {
  id: string;
  email: string;
  name?: string | null;
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  ownerContactInfo: string;
  status: OpportunityStatus;
  lifecycleState: OpportunityLifecycle;
  paymentType: OpportunityPaymentType;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  acceptsApplications?: boolean;
  paymentDetails?: string | null;
  moderationComment?: string | null;
  tags?: OpportunityTag[];
  canResubmit?: boolean;
  owner?: OpportunityOwner;
  applications?: OpportunityApplication[];
}

export interface OpportunityApplication {
  id: string;
  applicantName: string;
  contactInfo: string;
  status: OpportunityAppStatus;
  opportunityId: string;
  applicantId: string;
  createdAt: string;
  updatedAt: string;
  motivation?: string | null;
  briefDescription?: string | null;
  answers?: string | null;
  ownerComment?: string | null;
  withdrawalCount?: number;
  opportunity?: Opportunity;
  applicant?: Pick<OpportunityOwner, 'name' | 'email'>;
}

export interface CreateOpportunityRequest {
  title: string;
  description: string;
  paymentType: OpportunityPaymentType;
  ownerContactInfo?: string;
  paymentDetails?: string | null;
  acceptsApplications?: boolean;
  tags?: OpportunityTag[];
  lifecycleState?: OpportunityLifecycle;
}

export type UpdateOpportunityRequest = Partial<CreateOpportunityRequest>;

export interface ApplyOpportunityRequest {
  applicantName: string;
  contactInfo?: string;
  motivation?: string;
  briefDescription?: string;
  answers?: string;
}

export interface ModerateOpportunityRequest {
  action: OpportunityModerateAction;
  comment?: string;
}

export interface ChangeLifecycleStateRequest {
  lifecycleState: OpportunityLifecycle;
}

export interface ChangeOpportunityStatusRequest {
  status: OpportunityStatus;
}

export interface UpdateApplicationStatusRequest {
  status: OpportunityAppStatus;
  comment?: string;
}

export interface GetOpportunitiesParams {
  status?: OpportunityStatus;
  paymentType?: OpportunityPaymentType | '';
  ownerId?: string;
  search?: string;
  tags?: OpportunityTag[];
  isRecruiting?: boolean;
}

export interface OpportunityContentFields {
  title?: string;
  description?: string;
  ownerContactInfo?: string;
  paymentType?: OpportunityPaymentType;
  paymentDetails?: string | null;
}
