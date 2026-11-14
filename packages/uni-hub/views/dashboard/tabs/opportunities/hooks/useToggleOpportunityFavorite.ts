import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@una';
import { getErrorMessage } from '@uni-hub/services/api';
import { opportunitiesApi } from '@uni-hub/services/api.opportunities';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { invalidateOpportunities } from '../cache';

interface UseToggleOpportunityFavoriteResult {
  handleToggleFavorite: () => Promise<void>;
  isFavoritePending: boolean;
}

export function useToggleOpportunityFavorite(
  id: string,
  isFavorite: boolean,
): UseToggleOpportunityFavoriteResult {
  const toast = useToast();
  const { formatMessage } = useLanguage();
  const queryClient = useQueryClient();

  const favoriteMutation = useMutation({
    mutationFn: (saved: boolean) => opportunitiesApi.setFavorite(id, saved),
    onSuccess: () => invalidateOpportunities(queryClient),
  });

  const handleToggleFavorite = async (): Promise<void> => {
    try {
      await favoriteMutation.mutateAsync(!isFavorite);
      toast.success(
        formatMessage(
          isFavorite ? 'opportunities.toast.favoriteRemoved' : 'opportunities.toast.favoriteAdded',
        ),
      );
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, formatMessage('opportunities.toast.genericError')));
    }
  };

  return {
    handleToggleFavorite,
    isFavoritePending: favoriteMutation.isPending,
  };
}
