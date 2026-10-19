import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useToast } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { moodleKeys } from '@uni-hub/queries/moodle/queryKeys';
import { notificationsApi } from '@uni-hub/services/api';
import {
  notificationKeys,
  markNotificationReadMutationKey,
  markAllNotificationsReadMutationKey,
} from './queries';
import {
  optimisticallyMarkNotificationRead,
  optimisticallyMarkAllNotificationsRead,
  rollbackNotificationOptimisticUpdate,
  type NotificationRollbackContext,
} from './notificationCache';

export interface UseNotificationActionsResult {
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  isPending: boolean;
}

export function isLastPendingNotificationMutation(queryClient: QueryClient): boolean {
  return queryClient.isMutating({ mutationKey: notificationKeys.all }) <= 1;
}

export function useNotificationActions(): UseNotificationActionsResult {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { formatMessage } = useLanguage();

  const markReadMutation = useMutation({
    mutationKey: markNotificationReadMutationKey,
    mutationFn: async (id: string): Promise<void> => {
      await notificationsApi.markAsRead(id);
    },
    onMutate: async (id: string): Promise<NotificationRollbackContext> => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: notificationKeys.all }),
        queryClient.cancelQueries({ queryKey: moodleKeys.dashboards() }),
      ]);

      return optimisticallyMarkNotificationRead(queryClient, id);
    },
    onError: (_err, _id, context): void => {
      if (isLastPendingNotificationMutation(queryClient)) {
        rollbackNotificationOptimisticUpdate(queryClient, context);
      }

      toast.error(formatMessage('notifications.error.markReadFailed'));
    },
    onSettled: async (): Promise<void> => {
      if (isLastPendingNotificationMutation(queryClient)) {
        await queryClient.invalidateQueries({ queryKey: notificationKeys.platform() });
      }
    },
  });

  const markAllReadMutation = useMutation({
    mutationKey: markAllNotificationsReadMutationKey,
    mutationFn: async (): Promise<void> => {
      await notificationsApi.markAllAsRead();
    },
    onMutate: async (): Promise<NotificationRollbackContext> => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: notificationKeys.all }),
        queryClient.cancelQueries({ queryKey: moodleKeys.dashboards() }),
      ]);

      return optimisticallyMarkAllNotificationsRead(queryClient);
    },
    onError: (_err, _vars, context): void => {
      if (isLastPendingNotificationMutation(queryClient)) {
        rollbackNotificationOptimisticUpdate(queryClient, context);
      }

      toast.error(formatMessage('notifications.error.markReadFailed'));
    },
    onSettled: async (): Promise<void> => {
      if (isLastPendingNotificationMutation(queryClient)) {
        await queryClient.invalidateQueries({ queryKey: notificationKeys.platform() });
      }
    },
  });

  return {
    markAsRead: (id: string): void => {
      markReadMutation.mutate(id);
    },
    markAllAsRead: (): void => {
      markAllReadMutation.mutate();
    },
    isPending: markReadMutation.isPending || markAllReadMutation.isPending,
  };
}
