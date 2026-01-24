import { useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/hooks/useAuth';

/**
 * Component that handles push notification registration/deregistration
 * based on user auth state. Must be rendered inside AuthProvider.
 */
export function PushNotificationHandler() {
  const { user } = useAuth();
  const { registerPushNotifications, unregisterPushNotifications, isNative, isRegistered } = usePushNotifications();

  useEffect(() => {
    if (!isNative) return;

    if (user && !isRegistered) {
      // Register for push notifications when user logs in
      const timer = setTimeout(() => {
        registerPushNotifications(user.id);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, isNative, isRegistered, registerPushNotifications]);

  // This is a logic-only component, no UI
  return null;
}
