import type {
  OpportunityAppStatus,
  OpportunityLifecycle,
  OpportunityModerateAction,
  OpportunityPaymentType,
  OpportunityStatus,
  OpportunityAvailability,
} from '../constants/opportunities.ts';

export interface OpportunityOwner {
  id: string;
  email: string;
  name?: string | null;
}

export interface UnavailableOpportunity {
  id: string;
  title: string;
  availability: OpportunityAvailability;
  paymentType?: OpportunityPaymentType;
}

export type OpportunityListItem = Opportunity | UnavailableOpportunity;

export interface OpportunityFavoriteState {
  saved: boolean;
}

export interface OpportunityTag {
  id: string;
  name: string;
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
  acceptsApplications?: boolean;
  paymentDetails?: string | null;
  moderationComment?: string | null;
  tags?: OpportunityTag[];
  proposedTags?: string[];
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
  opportunity?: OpportunityListItem;
  applicant?: Pick<OpportunityOwner, 'name' | 'email'>;
}

export interface CreateOpportunityRequest {
  title: string;
  description: string;
  paymentType: OpportunityPaymentType;
  ownerContactInfo?: string;
  paymentDetails?: string | null;
  acceptsApplications?: boolean;
  tags?: string[];
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
  tags?: string[];
  isRecruiting?: boolean;
}

export interface OpportunityContentFields {
  title?: string;
  description?: string;
  ownerContactInfo?: string;
  paymentType?: OpportunityPaymentType;
  paymentDetails?: string | null;
}
