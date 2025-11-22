import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  registerForPushNotificationsAsync,
  setupNotificationListeners,
  sendPushTokenToServer,
  NotificationData,
  sendLocalNotification,
  getBadgeCount,
  setBadgeCount,
  dismissAllNotifications,
} from '../utils/notificationService';

interface NotificationContextType {
  expoPushToken: string | undefined;
  notification: Notifications.Notification | undefined;
  badgeCount: number;
  sendNotification: (data: NotificationData) => Promise<void>;
  clearBadge: () => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  isNotificationPermissionGranted: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [expoPushToken, setExpoPushToken] = useState<string>();
  const [notification, setNotification] = useState<Notifications.Notification>();
  const [badgeCount, setBadgeCountState] = useState(0);
  const [isNotificationPermissionGranted, setIsNotificationPermissionGranted] = useState(false);

  useEffect(() => {
    // Register for push notifications
    registerForPushNotificationsAsync().then(async (token) => {
      if (token) {
        setExpoPushToken(token);
        setIsNotificationPermissionGranted(true);

        // Try to send token to server if user is logged in
        try {
          const role = await AsyncStorage.getItem('role');
          const userId = await AsyncStorage.getItem('LoguserID');

          if (role && userId) {
            await sendPushTokenToServer(token, role, userId);
          }
        } catch (error) {
          console.error('Error sending token to server:', error);
        }
      } else {
        setIsNotificationPermissionGranted(false);
      }
    });

    // Set up notification listeners
    const cleanup = setupNotificationListeners(
      (notification) => {
        setNotification(notification);
        // Update badge count when notification is received
        updateBadgeCount();
      },
      (response) => {
        console.log('User tapped on notification:', response);
        // Handle navigation based on notification data
        const data = response.notification.request.content.data;
        // You can add navigation logic here based on notification type
        if (data?.screen) {
          // Navigate to specific screen
          console.log('Navigate to:', data.screen);
        }
        // Clear badge when user interacts with notification
        updateBadgeCount();
      }
    );

    // Initial badge count
    updateBadgeCount();

    return cleanup;
  }, []);

  const updateBadgeCount = async () => {
    const count = await getBadgeCount();
    setBadgeCountState(count);
  };

  const sendNotification = async (data: NotificationData) => {
    await sendLocalNotification(data);
    await updateBadgeCount();
  };

  const clearBadge = async () => {
    await setBadgeCount(0);
    setBadgeCountState(0);
  };

  const clearAllNotifications = async () => {
    await dismissAllNotifications();
    await clearBadge();
  };

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        badgeCount,
        sendNotification,
        clearBadge,
        clearAllNotifications,
        isNotificationPermissionGranted,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
