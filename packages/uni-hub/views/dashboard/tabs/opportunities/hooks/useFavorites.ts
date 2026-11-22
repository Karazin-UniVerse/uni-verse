import { useMemo } from 'react';
import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useToast } from '@una';
import type { OpportunityListItem } from '@core/types/opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { applyFavoriteChange, invalidateFavorites, isLastPendingFavorite } from '../cache';
import { favoritesQueryOptions } from '../queries';
import { favoriteMutationKey } from '../queryKeys';

type FavoriteMutation = { id: string; isFavorite: boolean };

interface UseFavoritesResult {
  query: UseQueryResult<OpportunityListItem[]>;
  savedIds: Set<string>;
  pendingIds: string[];
  toggle: (id: string, isFavorite: boolean) => void;
}

/** Loads saved IDs and tracks pending favorites by opportunity. */
export function useFavorites(enabled: boolean): UseFavoritesResult {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { formatMessage } = useLanguage();
  const query = useQuery({ ...favoritesQueryOptions, enabled });
  const pendingMutations = useMutationState({
    filters: { mutationKey: favoriteMutationKey, exact: true, status: 'pending' },
    select: ({ state }) => state.variables as FavoriteMutation,
  });
  const savedIds = useMemo(() => {
    const ids = new Set(query.data?.map(({ id }) => id));

    for (const pending of pendingMutations) {
      if (pending.isFavorite) {
        ids.delete(pending.id);
      } else {
        ids.add(pending.id);
      }
    }

    return ids;
  }, [query.data, pendingMutations]);
  const mutation = useMutation({
    mutationKey: favoriteMutationKey,
    mutationFn: ({ id, isFavorite }: FavoriteMutation) =>
      opportunitiesApi.setFavorite(id, !isFavorite),
    onSuccess: (_response, { id, isFavorite }) => {
      applyFavoriteChange(queryClient, id, isFavorite);
    },
    onError: () => toast.error(formatMessage('opportunities.toast.genericError')),
    onSettled: () => {
      if (isLastPendingFavorite(queryClient)) {
        return invalidateFavorites(queryClient);
      }
    },
  });
  const pendingIds = useMemo(() => pendingMutations.map(({ id }) => id), [pendingMutations]);

  return {
    query,
    savedIds,
    pendingIds,
    toggle: (id: string, isFavorite: boolean): void => mutation.mutate({ id, isFavorite }),
  };
}
