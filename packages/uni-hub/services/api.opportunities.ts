import type {
  ApplyOpportunityRequest,
  CreateOpportunityRequest,
  GetOpportunitiesParams,
  Opportunity,
  OpportunityApplication,
  OpportunityListItem,
  OpportunityFavoriteState,
  OpportunityTag,
  UpdateOpportunityRequest,
} from '@core/types/opportunities';
import type {
  OpportunityAppStatus,
  OpportunityLifecycle,
  OpportunityModerateAction,
} from '@core/constants/opportunities';
import { ApiClient, buildQueryString } from './api.request';

export class OpportunitiesApi extends ApiClient {
  async getFavorites(): Promise<{ data: OpportunityListItem[] }> {
    return this.request<OpportunityListItem[]>('/opportunities/favorites');
  }

  async setFavorite(id: string, saved: boolean): Promise<{ data: OpportunityFavoriteState }> {
    return this.request<OpportunityFavoriteState>(`/opportunities/${id}/favorite`, {
      method: saved ? 'PUT' : 'DELETE',
    });
  }

  async getOpportunities(params?: GetOpportunitiesParams): Promise<{ data: Opportunity[] }> {
    const { tags, isRecruiting, ...rest } = params ?? {};
    const searchParams = new URLSearchParams(
      buildQueryString({
        ...rest,
        ...(isRecruiting ? { isRecruiting: true } : {}),
      }),
    );

    for (const tag of tags ?? []) {
      searchParams.append('tags', tag);
    }

    const query = searchParams.size ? `?${searchParams}` : '';

    return this.request<Opportunity[]>(`/opportunities${query}`);
  }

  async getTagSuggestions(query: string): Promise<{ data: OpportunityTag[] }> {
    return this.request<OpportunityTag[]>(`/tags${buildQueryString({ query })}`);
  }

  async getOpportunity(id: string): Promise<{ data: OpportunityListItem }> {
    return this.request<OpportunityListItem>(`/opportunities/${id}`);
  }

  async createOpportunity(dto: CreateOpportunityRequest): Promise<{ data: Opportunity }> {
    return this.request<Opportunity>('/opportunities', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async updateOpportunity(
    id: string,
    dto: UpdateOpportunityRequest,
  ): Promise<{ data: Opportunity }> {
    return this.request<Opportunity>(`/opportunities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  }

  async changeStatus(id: string, status: 'READY_FOR_REVIEW'): Promise<{ data: Opportunity }> {
    return this.request<Opportunity>(`/opportunities/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }

  async changeLifecycle(
    id: string,
    lifecycleState: OpportunityLifecycle,
  ): Promise<{ data: Opportunity }> {
    return this.request<Opportunity>(`/opportunities/${id}/lifecycle`, {
      method: 'PUT',
      body: JSON.stringify({ lifecycleState }),
    });
  }

  async deleteOpportunity(id: string): Promise<{ data: Opportunity }> {
    return this.request<Opportunity>(`/opportunities/${id}`, {
      method: 'DELETE',
    });
  }

  async getMyOpportunities(): Promise<{ data: Opportunity[] }> {
    return this.request<Opportunity[]>('/opportunities/my');
  }

  async getOpportunityApplications(id: string): Promise<{ data: OpportunityApplication[] }> {
    return this.request<OpportunityApplication[]>(`/opportunities/${id}/applications`);
  }

  async updateApplicationStatus(
    appId: string,
    status: OpportunityAppStatus,
    comment?: string,
  ): Promise<{ data: OpportunityApplication }> {
    return this.request<OpportunityApplication>(`/opportunities/applications/${appId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, comment }),
    });
  }

  async apply(id: string, dto: ApplyOpportunityRequest): Promise<{ data: OpportunityApplication }> {
    return this.request<OpportunityApplication>(`/opportunities/${id}/apply`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getMyApplications(): Promise<{ data: OpportunityApplication[] }> {
    return this.request<OpportunityApplication[]>('/opportunities/my/applications');
  }

  async withdrawApplication(appId: string): Promise<{ data: OpportunityApplication }> {
    return this.request<OpportunityApplication>(
      `/opportunities/my/applications/${appId}/withdraw`,
      {
        method: 'PUT',
      },
    );
  }

  async moderate(
    id: string,
    action: OpportunityModerateAction,
    comment?: string,
  ): Promise<{ data: Opportunity }> {
    return this.request<Opportunity>(`/opportunities/${id}/moderate`, {
      method: 'POST',
      body: JSON.stringify({ action, comment }),
    });
  }
}

export const opportunitiesApi = new OpportunitiesApi();
