// Example: How to add notifications to Student Dashboard

import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  NotificationBell,
  NotificationStatus,
  NotificationTestButton
} from '../components/NotificationComponents';
import { useNotification } from '../context/NotificationContext';

export default function StudentDashboard() {
  const { expoPushToken, badgeCount } = useNotification();

  useEffect(() => {
    // Log the push token for testing
    if (expoPushToken) {
      console.log('Student Push Token:', expoPushToken);
    }
  }, [expoPushToken]);

  return (
    <ScrollView style={styles.container}>
      {/* Header with Notification Bell */}
      <View style={styles.header}>
        <Text style={styles.title}>Student Dashboard</Text>
        <NotificationBell onPress={() => {
          // Navigate to notifications screen
          console.log('Open notifications');
        }} />
      </View>

      {/* Notification Status Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notification Status</Text>
        <NotificationStatus />
      </View>

      {/* Test Notification Button (Remove in production) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Test Notifications</Text>
        <NotificationTestButton title="Send Test Notification" />
      </View>

      {/* Push Token Display (For development/testing) */}
      {expoPushToken && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Push Token</Text>
          <Text style={styles.tokenText} selectable>
            {expoPushToken}
          </Text>
          <Text style={styles.helperText}>
            Copy this token to test notifications from backend
          </Text>
        </View>
      )}

      {/* Rest of your dashboard content */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>My Classes</Text>
        {/* Your existing content */}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Attendance</Text>
        {/* Your existing content */}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#667eea',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  tokenText: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
