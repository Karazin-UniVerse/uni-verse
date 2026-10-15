import type {
  OpportunityAppStatus,
  OpportunityLifecycle,
  OpportunityPaymentType,
  OpportunityStatus,
} from '../constants/opportunities.ts';

export interface OpportunityOwner {
  id: string;
  name?: string | null;
  email: string;
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  ownerContactInfo: string;
  status: OpportunityStatus;
  lifecycleState: OpportunityLifecycle;
  acceptsApplications?: boolean;
  paymentType: OpportunityPaymentType;
  paymentDetails?: string | null;
  moderationComment?: string | null;
  ownerId: string;
  owner?: OpportunityOwner;
  createdAt: string;
  updatedAt: string;
  applications?: OpportunityApplication[];
}

export interface OpportunityApplication {
  id: string;
  applicantName: string;
  contactInfo: string;
  motivation?: string | null;
  briefDescription?: string | null;
  answers?: string | null;
  status: OpportunityAppStatus;
  ownerComment?: string | null;
  opportunityId: string;
  opportunity?: Opportunity;
  applicantId: string;
  applicant?: OpportunityOwner;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOpportunityRequest {
  title: string;
  description: string;
  ownerContactInfo: string;
  paymentType: OpportunityPaymentType;
  paymentDetails?: string | null;
  acceptsApplications?: boolean;
}

export type UpdateOpportunityRequest = Partial<CreateOpportunityRequest>;

export interface ApplyOpportunityRequest {
  applicantName: string;
  contactInfo: string;
  motivation?: string;
  briefDescription?: string;
  answers?: string;
}

export interface GetOpportunitiesParams {
  status?: OpportunityStatus;
  paymentType?: OpportunityPaymentType | '';
  ownerId?: string;
  search?: string;
}
