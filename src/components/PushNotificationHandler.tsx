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

    // Skip push registration if Firebase is not configured (no google-services.json)
    // This prevents app crash when google-services.json is missing
    const FIREBASE_CONFIGURED = false; // Set to true after adding google-services.json

    if (FIREBASE_CONFIGURED && user && !isRegistered) {
      const timer = setTimeout(() => {
        registerPushNotifications(user.id);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, isNative, isRegistered, registerPushNotifications]);

  // This is a logic-only component, no UI
  return null;
}
