import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  isPending: boolean;
}

export function useNotificationActions(): UseNotificationActionsResult {
  const queryClient = useQueryClient();

  const markReadMutation = useMutation({
    mutationKey: markNotificationReadMutationKey,
    mutationFn: async (id: string): Promise<void> => {
      await notificationsApi.markAsRead(id);
    },
    onMutate: async (id: string): Promise<NotificationRollbackContext> => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      return optimisticallyMarkNotificationRead(queryClient, id);
    },
    onError: (_err, _id, context): void => {
      rollbackNotificationOptimisticUpdate(queryClient, context);
    },
    onSettled: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.platform() });
    },
  });

  const markAllReadMutation = useMutation({
    mutationKey: markAllNotificationsReadMutationKey,
    mutationFn: async (): Promise<void> => {
      await notificationsApi.markAllAsRead();
    },
    onMutate: async (): Promise<NotificationRollbackContext> => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      return optimisticallyMarkAllNotificationsRead(queryClient);
    },
    onError: (_err, _vars, context): void => {
      rollbackNotificationOptimisticUpdate(queryClient, context);
    },
    onSettled: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.platform() });
    },
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
