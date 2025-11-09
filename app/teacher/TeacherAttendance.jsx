import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const TeacherSelfAttendance = () => {
  const [teacherId, setTeacherId] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [token, setToken] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [punchStatus, setPunchStatus] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('mark');
  const [locationVerification, setLocationVerification] = useState(null);
  const [error, setError] = useState('');

  const API_BASE = 'https://api.pbmpublicschool.in/api/teacher-attendance';

  useEffect(() => {
    loadUserData();
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (teacherId) {
      fetchPunchStatus();
      fetchAttendanceHistory();
    }
  }, [teacherId]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        getCurrentLocation();
      } else {
        setError('Location permission denied');
      }
    } catch (err) {
      console.warn(err);
      setError('Failed to request location permission');
    }
  };

  const getCurrentLocation = async () => {
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      setError('Unable to get location. Please enable location services.');
    }
  };

  const loadUserData = async () => {
    try {
      const userDataRaw = await AsyncStorage.getItem('teacher_user');
      const tokenRaw = await AsyncStorage.getItem('teacher_token');

      if (userDataRaw && tokenRaw) {
        const teacherData = JSON.parse(userDataRaw);
        setTeacherId(teacherData.id || teacherData.user?.id || '');
        setSchoolId(teacherData.schoolId?.toString() || teacherData.user?.schools?.[0]?.id || '');
        setTeacherName(teacherData.fullName || teacherData.user?.fullName || 'Teacher');
        setToken(tokenRaw);
      } else {
        setError('Please login to continue');
      }
    } catch (e) {
      console.error('Failed to load user data', e);
      setError('Failed to load user data');
    }
  };

  const verifyLocation = async () => {
    if (!location.latitude || !location.longitude) {
      Alert.alert('Error', 'Location not available. Please enable location services.');
      return false;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/verify-location`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          schoolId: parseInt(schoolId),
        }),
      });
      const data = await response.json();
      setLocationVerification(data.data);
      return data.data.isInRange;
    } catch (error) {
      console.error('Location verification error:', error);
      Alert.alert('Error', 'Failed to verify location');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const fetchPunchStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/punch-status/${teacherId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setPunchStatus(data.data);
      }
    } catch (error) {
      console.error('Error fetching punch status:', error);
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      const response = await fetch(`${API_BASE}/teacher/${teacherId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setAttendanceHistory(data.data);
      }
    } catch (error) {
      console.error('Error fetching attendance history:', error);
    }
  };

  const markAttendance = async (type) => {
    const isInRange = await verifyLocation();

    if (!isInRange) {
      Alert.alert('Error', 'You are outside the school premises. Attendance cannot be marked.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/mark`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          teacherId,
          latitude: location.latitude,
          longitude: location.longitude,
          type,
          schoolId: parseInt(schoolId),
          currentTime: new Date().toISOString(),
          accuracy: 50,
        }),
      });
      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', data.message);
        fetchPunchStatus();
        fetchAttendanceHistory();
        setLocationVerification(null);
      } else {
        Alert.alert('Error', data.message || 'Failed to mark attendance');
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      Alert.alert('Error', 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  const generateAndSharePDF = async () => {
    try {
      // Create HTML content for the PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #4F46E5; color: white; }
              .header { text-align: center; margin-bottom: 20px; }
              .school-info { margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Attendance Report</h1>
            </div>
            <div class="school-info">
              <p><strong>Teacher Name:</strong> ${teacherName}</p>
              <p><strong>School ID:</strong> ${schoolId}</p>
              <p><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Time</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                ${attendanceHistory.map((record) => `
                  <tr>
                    <td>${new Date(record.date).toLocaleDateString()}</td>
                    <td>${record.type === 'start' ? 'Check In' : 'Check Out'}</td>
                    <td>${new Date(record.createdAt).toLocaleTimeString()}</td>
                    <td>${record.latitude.toFixed(4)}, ${record.longitude.toFixed(4)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      // Generate PDF file
      const file = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      // Share the PDF file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Attendance Report'
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate report');
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!teacherId) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.setupContainer}>
          <Text style={styles.setupTitle}>Setup Required</Text>
          <Text style={styles.setupText}>{error || 'Loading...'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.userIcon}>
            <Text style={styles.userIconText}>
              {teacherName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{teacherName}</Text>
            <Text style={styles.headerSubtitle}>School ID: {schoolId}</Text>
          </View>
        </View>
        {attendanceHistory.length > 0 && (
          <TouchableOpacity style={styles.exportButton} onPress={generateAndSharePDF}>
            <Text style={styles.exportButtonText}>📥 Export</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'mark' && styles.activeTab]}
            onPress={() => setActiveTab('mark')}
          >
            <Text style={[styles.tabText, activeTab === 'mark' && styles.activeTabText]}>
              Mark Attendance
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              History
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'mark' ? (
          <View>
            {/* Location Verification */}
            {locationVerification && (
              <View
                style={[
                  styles.verificationCard,
                  locationVerification.isInRange
                    ? styles.verificationSuccess
                    : styles.verificationError,
                ]}
              >
                <Text style={styles.verificationTitle}>
                  {locationVerification.isInRange ? '✓' : '✗'}{' '}
                  {locationVerification.message}
                </Text>
                <Text style={styles.verificationSubtitle}>
                  Distance: {locationVerification.distance.toFixed(0)}m (Allowed:{' '}
                  {locationVerification.allowedRadius}m)
                </Text>
              </View>
            )}

            {/* Punch Status */}
            {punchStatus && (
              <View style={styles.statusCard}>
                <Text style={styles.cardTitle}>📍 Current Status</Text>

                <View style={styles.statusGrid}>
                  <View style={[styles.statusBox, styles.statusBoxBlue]}>
                    <Text style={styles.statusLabel}>Last Punch</Text>
                    <Text style={styles.statusValue}>
                      {punchStatus.lastPunch?.type || 'None'}
                    </Text>
                    {punchStatus.lastPunch && (
                      <Text style={styles.statusTime}>
                        {formatTime(punchStatus.lastPunch.time)}
                      </Text>
                    )}
                  </View>

                  <View style={[styles.statusBox, styles.statusBoxPurple]}>
                    <Text style={styles.statusLabel}>Next Punch</Text>
                    <Text style={styles.statusValue}>
                      {punchStatus.punchDetails?.nextPunch || 'OUT'}
                    </Text>
                    {punchStatus.nextAvailableTime && (
                      <Text style={styles.statusTime}>
                        {formatTime(punchStatus.nextAvailableTime)}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Today's Punches */}
                {punchStatus.punchDetails && (
                  <View style={styles.punchList}>
                    {punchStatus.punchDetails.in && (
                      <View style={[styles.punchItem, styles.punchItemGreen]}>
                        <View style={styles.punchIconGreen}>
                          <Text style={styles.punchIconText}>→</Text>
                        </View>
                        <View style={styles.punchDetails}>
                          <Text style={styles.punchTitle}>Check In</Text>
                          <Text style={styles.punchTime}>
                            {formatTime(punchStatus.punchDetails.in.time)}
                          </Text>
                        </View>
                        <Text style={styles.punchCheck}>✓</Text>
                      </View>
                    )}

                    {punchStatus.punchDetails.out ? (
                      <View style={[styles.punchItem, styles.punchItemRed]}>
                        <View style={styles.punchIconRed}>
                          <Text style={styles.punchIconText}>←</Text>
                        </View>
                        <View style={styles.punchDetails}>
                          <Text style={styles.punchTitle}>Check Out</Text>
                          <Text style={styles.punchTime}>
                            {formatTime(punchStatus.punchDetails.out.time)}
                          </Text>
                        </View>
                        <Text style={styles.punchCheck}>✓</Text>
                      </View>
                    ) : (
                      <View style={[styles.punchItem, styles.punchItemGray]}>
                        <View style={styles.punchIconGray}>
                          <Text style={styles.punchIconText}>←</Text>
                        </View>
                        <View style={styles.punchDetails}>
                          <Text style={styles.punchTitleGray}>Check Out</Text>
                          <Text style={styles.punchTimeGray}>Pending</Text>
                        </View>
                        <Text style={styles.punchCheckGray}>○</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.actionButtonIn,
                  (loading || punchStatus?.lastPunch?.type === 'IN') &&
                    styles.actionButtonDisabled,
                ]}
                onPress={() => markAttendance('IN')}
                disabled={loading || punchStatus?.lastPunch?.type === 'IN'}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.actionButtonIcon}>→</Text>
                    <Text style={styles.actionButtonText}>Check IN</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.actionButtonOut,
                  (loading ||
                    punchStatus?.lastPunch?.type === 'OUT' ||
                    !punchStatus?.lastPunch) &&
                    styles.actionButtonDisabled,
                ]}
                onPress={() => markAttendance('OUT')}
                disabled={
                  loading ||
                  punchStatus?.lastPunch?.type === 'OUT' ||
                  !punchStatus?.lastPunch
                }
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.actionButtonIcon}>←</Text>
                    <Text style={styles.actionButtonText}>Check OUT</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Location Info */}
            {location.latitude && (
              <View style={styles.locationCard}>
                <Text style={styles.locationTitle}>📍 Current Location</Text>
                <Text style={styles.locationText}>
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.historyContainer}>
            <Text style={styles.cardTitle}>📅 Attendance History</Text>

            {attendanceHistory.length > 0 ? (
              attendanceHistory.map((record) => (
                <View key={record.id} style={styles.historyItem}>
                  <View
                    style={[
                      styles.historyIcon,
                      record.type === 'start'
                        ? styles.historyIconGreen
                        : styles.historyIconRed,
                    ]}
                  >
                    <Text style={styles.historyIconText}>
                      {record.type === 'start' ? '→' : '←'}
                    </Text>
                  </View>
                  <View style={styles.historyDetails}>
                    <Text style={styles.historyTitle}>
                      {record.type === 'start' ? 'Check In' : 'Check Out'}
                    </Text>
                    <Text style={styles.historyDate}>{formatDate(record.date)}</Text>
                  </View>
                  <View style={styles.historyTimeContainer}>
                    <Text style={styles.historyTime}>{formatTime(record.createdAt)}</Text>
                    <Text style={styles.historyLocation}>
                      {record.latitude.toFixed(4)}, {record.longitude.toFixed(4)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>📅</Text>
                <Text style={styles.emptySubtext}>No attendance records found</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  setupText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#4F46E5',
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userIconText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#C7D2FE',
    marginTop: 2,
  },
  exportButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  errorContainer: {
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#FCD34D',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    color: '#92400E',
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#4F46E5',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#fff',
  },
  verificationCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
  },
  verificationSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  verificationError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  verificationSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statusBox: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
  },
  statusBoxBlue: {
    backgroundColor: '#EFF6FF',
  },
  statusBoxPurple: {
    backgroundColor: '#F5F3FF',
  },
  statusLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statusTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  punchList: {
    gap: 12,
  },
  punchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  punchItemGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  punchItemRed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  punchItemGray: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  punchIconGreen: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  punchIconRed: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  punchIconGray: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  punchIconText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  punchDetails: {
    flex: 1,
  },
  punchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  punchTitleGray: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  punchTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  punchTimeGray: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  punchCheck: {
    fontSize: 20,
    color: '#10B981',
  },
  punchCheckGray: {
    fontSize: 20,
    color: '#D1D5DB',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonIn: {
    backgroundColor: '#10B981',
  },
  actionButtonOut: {
    backgroundColor: '#EF4444',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonIcon: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
  },
  historyContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyIconGreen: {
    backgroundColor: '#10B981',
  },
  historyIconRed: {
    backgroundColor: '#EF4444',
  },
  historyIconText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  historyDetails: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  historyDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  historyTimeContainer: {
    alignItems: 'flex-end',
  },
  historyTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  historyLocation: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});

export default TeacherSelfAttendance;