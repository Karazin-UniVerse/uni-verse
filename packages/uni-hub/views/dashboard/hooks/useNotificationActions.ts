import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@uni-hub/services/api';
import { notificationKeys, markAllNotificationsReadMutationKey } from './queries';
import {
  optimisticallyMarkNotificationRead,
  optimisticallyMarkAllNotificationsRead,
  rollbackNotificationOptimisticUpdate,
  type NotificationRollbackContext,
} from './notificationCache';

export interface UseNotificationActionsResult {
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  isPending: boolean;
}

function createOptimisticHandlers(
  queryClient: QueryClient,
  performOptimisticUpdate: () => NotificationRollbackContext,
) {
  return {
    onMutate: async (): Promise<NotificationRollbackContext> => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      return performOptimisticUpdate();
    },
    onError: (
      _err: unknown,
      _vars: unknown,
      context: NotificationRollbackContext | undefined,
    ): void => {
      rollbackNotificationOptimisticUpdate(queryClient, context);
    },
    onSettled: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.platform() });
    },
  };
}

export function useNotificationActions(): UseNotificationActionsResult {
  const queryClient = useQueryClient();

  const markReadMutation = useMutation({
    mutationKey: ['notifications', 'read'],
    mutationFn: async (id: string) => {
      await notificationsApi.markAsRead(id);
    },
    ...createOptimisticHandlers(queryClient, () => {
      throw new Error('Not used directly');
    }),
    onMutate: async (id: string): Promise<NotificationRollbackContext> => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      return optimisticallyMarkNotificationRead(queryClient, id);
    },
  });

  const markAllReadMutation = useMutation({
    mutationKey: markAllNotificationsReadMutationKey,
    mutationFn: async () => {
      await notificationsApi.markAllAsRead();
    },
    ...createOptimisticHandlers(queryClient, () =>
      optimisticallyMarkAllNotificationsRead(queryClient),
    ),
  });

  return {
    markAsRead: async (id: string): Promise<void> => {
      await markReadMutation.mutateAsync(id);
    },
    markAllAsRead: async (): Promise<void> => {
      await markAllReadMutation.mutateAsync();
    },
    isPending: markReadMutation.isPending || markAllReadMutation.isPending,
  };
}
