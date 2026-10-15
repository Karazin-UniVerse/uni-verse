export const opportunityKeys = {
  all: ['opportunities'] as const,
  catalog: () => [...opportunityKeys.all, 'catalog'] as const,
  mine: () => [...opportunityKeys.all, 'mine'] as const,
  applications: () => [...opportunityKeys.all, 'applications'] as const,
  moderation: () => [...opportunityKeys.all, 'moderation'] as const,
  applicants: (opportunityId: string) =>
    [...opportunityKeys.all, 'applicants', opportunityId] as const,
};

export const moderateMutationKey = [...opportunityKeys.all, 'moderate'] as const;
