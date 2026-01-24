import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';

interface PushNotificationState {
  token: string | null;
  isRegistered: boolean;
  error: string | null;
  loading: boolean;
  permissionDenied: boolean;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    token: null,
    isRegistered: false,
    error: null,
    loading: false,
    permissionDenied: false,
  });

  const isNative = Capacitor.isNativePlatform();

  const registerPushNotifications = useCallback(async () => {
    if (!isNative) {
      console.log('Push notifications are only available on native platforms');
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Check current permission status
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        // Request permission
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        setState(prev => ({
          ...prev,
          loading: false,
          permissionDenied: true,
          error: 'Uprawnienia do powiadomień zostały odrzucone',
        }));
        return;
      }

      // Register with Apple / Google to receive push via APNS/FCM
      await PushNotifications.register();

    } catch (error) {
      console.error('Error registering push notifications:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Nie udało się zarejestrować powiadomień push',
      }));
    }
  }, [isNative]);

  useEffect(() => {
    if (!isNative) return;

    // On success, we should be able to receive notifications
    const registrationListener = PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push registration success, token: ' + token.value);
      setState(prev => ({
        ...prev,
        token: token.value,
        isRegistered: true,
        loading: false,
        error: null,
      }));
    });

    // On registration error
    const registrationErrorListener = PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on registration: ', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Błąd rejestracji powiadomień push',
      }));
    });

    // Show notification when app is in foreground
    const notificationReceivedListener = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Push notification received: ', notification);
        // You can handle foreground notifications here
        // For example, show a toast or update UI
      }
    );

    // Handle notification action (when user taps on notification)
    const notificationActionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('Push notification action performed: ', action);
        // Handle navigation based on notification data
        const data = action.notification.data;
        if (data?.meetingId) {
          // Navigate to meeting details
          window.location.href = `/meetings/${data.meetingId}`;
        } else if (data?.type === 'message') {
          // Navigate to messages
          window.location.href = '/messages';
        }
      }
    );

    return () => {
      registrationListener.then(l => l.remove());
      registrationErrorListener.then(l => l.remove());
      notificationReceivedListener.then(l => l.remove());
      notificationActionListener.then(l => l.remove());
    };
  }, [isNative]);

  const unregisterPushNotifications = useCallback(async () => {
    if (!isNative) return;

    try {
      await PushNotifications.unregister();
      setState({
        token: null,
        isRegistered: false,
        error: null,
        loading: false,
        permissionDenied: false,
      });
    } catch (error) {
      console.error('Error unregistering push notifications:', error);
    }
  }, [isNative]);

  return {
    ...state,
    isNative,
    registerPushNotifications,
    unregisterPushNotifications,
  };
}
