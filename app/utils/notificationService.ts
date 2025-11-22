import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications should be displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Register for push notifications and get the Expo push token
 */
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token: string | undefined;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    // Create additional channels for different notification types
    await Notifications.setNotificationChannelAsync('fee-notifications', {
      name: 'Fee Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF50',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('attendance-notifications', {
      name: 'Attendance Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2196F3',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('general-notifications', {
      name: 'General Notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FFC107',
      sound: 'default',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    try {
      // Get the Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '199aa28c-a3fb-4d22-9676-a95caed3b6f0', // From your app.json
      });
      token = tokenData.data;
      
      // Save token to AsyncStorage
      await AsyncStorage.setItem('expoPushToken', token);
      console.log('Expo Push Token:', token);
    } catch (error) {
      console.error('Error getting push token:', error);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

/**
 * Send a local notification (for testing purposes)
 */
export async function sendLocalNotification(notification: NotificationData) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: null, // Send immediately
  });
}

/**
 * Schedule a notification for a specific time
 */
export async function scheduleNotification(
  notification: NotificationData,
  trigger: Notifications.NotificationTriggerInput
) {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger,
  });
  return id;
}

/**
 * Cancel a scheduled notification
 */
export async function cancelScheduledNotification(notificationId: string) {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllScheduledNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get all scheduled notifications
 */
export async function getAllScheduledNotifications() {
  return await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Send push token to your backend server
 */
export async function sendPushTokenToServer(token: string, userRole: string, userId: string) {
  try {
    const response = await fetch('https://api.pbmpublicschool.in/api/notifications/register-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        userRole,
        userId,
        platform: Platform.OS,
        deviceInfo: {
          brand: Device.brand,
          modelName: Device.modelName,
          osName: Device.osName,
          osVersion: Device.osVersion,
        },
      }),
    });

    const data = await response.json();
    console.log('Token registered with server:', data);
    return data;
  } catch (error) {
    console.error('Error sending token to server:', error);
    throw error;
  }
}

/**
 * Set up notification listeners
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
) {
  // Listener for when a notification is received while app is in foreground
  const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received:', notification);
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // Listener for when user taps on a notification
  const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('Notification response:', response);
    if (onNotificationResponse) {
      onNotificationResponse(response);
    }
  });

  // Return cleanup function
  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number) {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear all notifications
 */
export async function dismissAllNotifications() {
  await Notifications.dismissAllNotificationsAsync();
}

/**
 * Get the stored Expo push token
 */
export async function getStoredPushToken(): Promise<string | null> {
  return await AsyncStorage.getItem('expoPushToken');
}
