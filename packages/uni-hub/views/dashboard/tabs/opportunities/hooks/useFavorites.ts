import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { favoritesQueryOptions } from '../queries';
import { invalidateOpportunities } from '../cache';

export function useFavorites(enabled: boolean) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { formatMessage } = useLanguage();
  const query = useQuery({ ...favoritesQueryOptions, enabled });
  const mutation = useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      opportunitiesApi.setFavorite(id, !isFavorite),
    onSuccess: () => invalidateOpportunities(queryClient),
    onError: () => toast.error(formatMessage('opportunities.toast.genericError')),
  });

  return {
    query,
    savedIds: new Set(query.data?.map(({ id }) => id)),
    pending: mutation.isPending,
    toggle: (id: string, isFavorite: boolean) => mutation.mutate({ id, isFavorite }),
  };
}
