import { useMemo } from 'react';
import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useToast } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { favoritesQueryOptions } from '../queries';
import { opportunityKeys } from '../queryKeys';

const favoriteMutationKey = opportunityKeys.favorites();
const favoriteRefreshes = new WeakMap<QueryClient, Promise<void>>();

type FavoriteMutation = { id: string; isFavorite: boolean };

export function useFavorites(enabled: boolean) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { formatMessage } = useLanguage();
  const query = useQuery({ ...favoritesQueryOptions, enabled });
  const savedIds = useMemo(() => new Set(query.data?.map(({ id }) => id)), [query.data]);
  const mutation = useMutation({
    mutationKey: favoriteMutationKey,
    mutationFn: ({ id, isFavorite }: FavoriteMutation) =>
      opportunitiesApi.setFavorite(id, !isFavorite),
    onSuccess: () => {
      // Keep overlapping writes from canceling one another's cache refresh.
      const refresh = (favoriteRefreshes.get(queryClient) ?? Promise.resolve()).then(() =>
        queryClient.invalidateQueries({ queryKey: favoriteMutationKey, exact: true }),
      );

      favoriteRefreshes.set(queryClient, refresh);

      return refresh;
    },
    onError: () => toast.error(formatMessage('opportunities.toast.genericError')),
  });
  const pendingIds = useMutationState({
    filters: { mutationKey: favoriteMutationKey, exact: true, status: 'pending' },
    select: ({ state }) => (state.variables as FavoriteMutation).id,
  });

  return {
    query,
    savedIds,
    pendingIds,
    toggle: (id: string, isFavorite: boolean) => mutation.mutate({ id, isFavorite }),
  };
}
