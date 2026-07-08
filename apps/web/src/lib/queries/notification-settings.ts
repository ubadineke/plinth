import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface NotificationSettings {
  sms_enabled: boolean;
  email_enabled: boolean;
  brand_override: string | null;
  disabled_events: string[];
}

const notificationSettingsKeys = { all: ['notification-settings'] as const };

export function useNotificationSettings(enabled: boolean) {
  return useQuery({
    queryKey: notificationSettingsKeys.all,
    queryFn: () => api.notificationSettings.get() as Promise<NotificationSettings>,
    enabled,
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NotificationSettings) => api.notificationSettings.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationSettingsKeys.all });
    },
  });
}

export interface TestNotificationResult {
  ok?: boolean;
  error?: string;
}

export function useSendTestNotification() {
  return useMutation({
    mutationFn: ({ channel, to }: { channel: 'sms' | 'email'; to: string }) =>
      api.notificationSettings.test(channel, to) as Promise<TestNotificationResult>,
  });
}
