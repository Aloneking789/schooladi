import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotification } from '../context/NotificationContext';

interface NotificationBellProps {
  onPress?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onPress }) => {
  const { badgeCount, clearBadge } = useNotification();

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
    // Clear badge when user opens notifications
    clearBadge();
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Ionicons name="notifications-outline" size={24} color="#333" />
      {badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {badgeCount > 99 ? '99+' : badgeCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

interface NotificationTestButtonProps {
  title?: string;
}

export const NotificationTestButton: React.FC<NotificationTestButtonProps> = ({ 
  title = 'Test Notification' 
}) => {
  const { sendNotification, expoPushToken, isNotificationPermissionGranted } = useNotification();
  const [isLoading, setIsLoading] = useState(false);

  const handleTestNotification = async () => {
    if (!isNotificationPermissionGranted) {
      Alert.alert(
        'Permission Required',
        'Please enable notifications in your device settings to receive notifications.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);
    try {
      await sendNotification({
        title: 'Test Notification',
        body: 'This is a test notification from PBM Public School',
        data: { screen: 'home', type: 'test' },
      });
      Alert.alert('Success', 'Test notification sent!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send notification');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.testContainer}>
      <TouchableOpacity
        style={[styles.testButton, isLoading && styles.testButtonDisabled]}
        onPress={handleTestNotification}
        disabled={isLoading}
      >
        <Ionicons name="notifications" size={20} color="#fff" style={styles.testIcon} />
        <Text style={styles.testButtonText}>
          {isLoading ? 'Sending...' : title}
        </Text>
      </TouchableOpacity>
      
      {expoPushToken && (
        <View style={styles.tokenContainer}>
          <Text style={styles.tokenLabel}>Push Token:</Text>
          <Text style={styles.tokenText} numberOfLines={1} ellipsizeMode="middle">
            {expoPushToken}
          </Text>
        </View>
      )}
      
      {!isNotificationPermissionGranted && (
        <View style={styles.warningContainer}>
          <Ionicons name="warning" size={16} color="#ff9800" />
          <Text style={styles.warningText}>
            Notification permission not granted
          </Text>
        </View>
      )}
    </View>
  );
};

export const NotificationStatus: React.FC = () => {
  const { expoPushToken, isNotificationPermissionGranted } = useNotification();

  return (
    <View style={styles.statusContainer}>
      <View style={styles.statusRow}>
        <Ionicons 
          name={isNotificationPermissionGranted ? "checkmark-circle" : "close-circle"} 
          size={20} 
          color={isNotificationPermissionGranted ? "#4CAF50" : "#f44336"} 
        />
        <Text style={styles.statusText}>
          Notifications: {isNotificationPermissionGranted ? 'Enabled' : 'Disabled'}
        </Text>
      </View>
      
      {expoPushToken && (
        <View style={styles.statusRow}>
          <Ionicons name="key" size={20} color="#2196F3" />
          <Text style={styles.statusText}>Token: Registered</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  testContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginVertical: 8,
  },
  testButton: {
    backgroundColor: '#667eea',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonDisabled: {
    backgroundColor: '#999',
  },
  testIcon: {
    marginRight: 8,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tokenContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 4,
  },
  tokenLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 4,
  },
  tokenText: {
    fontSize: 10,
    color: '#424242',
    fontFamily: 'monospace',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fff3e0',
    borderRadius: 4,
  },
  warningText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#f57c00',
  },
  statusContainer: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
});
