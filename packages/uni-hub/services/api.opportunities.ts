import type {
  ApplyOpportunityRequest,
  CreateOpportunityRequest,
  GetOpportunitiesParams,
  Opportunity,
  OpportunityApplication,
  UpdateOpportunityRequest,
} from '@core/types/opportunities';
import type {
  OpportunityAppStatus,
  OpportunityLifecycle,
  OpportunityModerateAction,
} from '@core/constants/opportunities';
import { request, buildQueryString } from './api.request';

export class OpportunitiesApi {
  async getOpportunities(params?: GetOpportunitiesParams): Promise<{ data: Opportunity[] }> {
    const query = buildQueryString(params as Record<string, unknown>);

    return request<Opportunity[]>(`/opportunities${query}`);
  }

  async getOpportunity(id: string): Promise<{ data: Opportunity }> {
    return request<Opportunity>(`/opportunities/${id}`);
  }

  async createOpportunity(dto: CreateOpportunityRequest): Promise<{ data: Opportunity }> {
    return request<Opportunity>('/opportunities', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async updateOpportunity(
    id: string,
    dto: UpdateOpportunityRequest,
  ): Promise<{ data: Opportunity }> {
    return request<Opportunity>(`/opportunities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  }

  async changeStatus(id: string, status: 'READY_FOR_REVIEW'): Promise<{ data: Opportunity }> {
    return request<Opportunity>(`/opportunities/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }

  async changeLifecycle(
    id: string,
    lifecycleState: OpportunityLifecycle,
  ): Promise<{ data: Opportunity }> {
    return request<Opportunity>(`/opportunities/${id}/lifecycle`, {
      method: 'PUT',
      body: JSON.stringify({ lifecycleState }),
    });
  }

  async getMyOpportunities(): Promise<{ data: Opportunity[] }> {
    return request<Opportunity[]>('/opportunities/my');
  }

  async getOpportunityApplications(id: string): Promise<{ data: OpportunityApplication[] }> {
    return request<OpportunityApplication[]>(`/opportunities/${id}/applications`);
  }

  async updateApplicationStatus(
    appId: string,
    status: OpportunityAppStatus,
    comment?: string,
  ): Promise<{ data: OpportunityApplication }> {
    return request<OpportunityApplication>(`/opportunities/applications/${appId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, comment }),
    });
  }

  async apply(id: string, dto: ApplyOpportunityRequest): Promise<{ data: OpportunityApplication }> {
    return request<OpportunityApplication>(`/opportunities/${id}/apply`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getMyApplications(): Promise<{ data: OpportunityApplication[] }> {
    return request<OpportunityApplication[]>('/opportunities/my/applications');
  }

  async withdrawApplication(appId: string): Promise<{ data: OpportunityApplication }> {
    return request<OpportunityApplication>(`/opportunities/my/applications/${appId}/withdraw`, {
      method: 'PUT',
    });
  }

  async moderate(
    id: string,
    action: OpportunityModerateAction,
    comment?: string,
  ): Promise<{ data: Opportunity }> {
    return request<Opportunity>(`/opportunities/${id}/moderate`, {
      method: 'POST',
      body: JSON.stringify({ action, comment }),
    });
  }
}

export const opportunitiesApi = new OpportunitiesApi();
