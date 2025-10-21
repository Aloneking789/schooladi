import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from "axios";
import { encode as btoa } from 'base-64';
import { format } from 'date-fns';
import * as FileSystem from 'expo-file-system';
import * as Location from "expo-location";
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Button, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";


interface Punch {
  type: "IN" | "OUT";
  time: string;
}

interface PunchStatus {
  lastPunch: string | null;
  nextAvailableTime: string | null;
  remainingPunches: number;
  todayPunches: Punch[];
}

const TeacherSelfAttendance: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [punchStatus, setPunchStatus] = useState<PunchStatus | null>(null);
  const [teacherId, setTeacherId] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [token, setToken] = useState("");
  const [classId, setClassId] = useState<string>(""); // Moved inside the component
  const [history, setHistory] = useState<any[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]); // Add this for formatted history
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [isSharing, setIsSharing] = useState(false); // Add isSharing state

  const API_BASE_URL = "https://api.pbmpublicschool.in/api";

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDataRaw = await AsyncStorage.getItem('teacher_user');
        const tokenRaw = await AsyncStorage.getItem('teacher_token');
        console.log("User Data:", userDataRaw);
        console.log("Token:", tokenRaw);
        if (userDataRaw && tokenRaw) {
          const teacherData = JSON.parse(userDataRaw);
          // Handle both nested and direct data structures
          setTeacherId(teacherData.id || teacherData.user?.id || '');
          setSchoolId(teacherData.schoolId?.toString() || teacherData.user?.schools?.[0]?.id || '');
          setClassId(teacherData.classId || teacherData.user?.classId || '');
          setToken(tokenRaw);
          console.log("Parsed IDs:", {
            teacherId: teacherData.id || teacherData.user?.id,
            schoolId: teacherData.schoolId?.toString() || teacherData.user?.schools?.[0]?.id,
            classId: teacherData.classId || teacherData.user?.classId
          });
        }
      } catch (e) {
        console.error("Failed to load user data from storage", e);
      }
    };
    fetchUserData();
  }, []);
  const getLocation = async () => {
    // Request location permission every time
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Toast.show({
        type: "error",
        text1: "Location permission required",
        text2: "Please allow location access to mark attendance"
      });
      throw new Error("Location permission not granted");
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      console.log("Parsed IDs:", { location: location.coords.latitude, longitude: location.coords.longitude, accuracy: location.coords.accuracy });
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,  // Use timestamp from location
        coords: location.coords // Include coords for consistency
        // You can add more properties if needed  
      };


    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Failed to get location",
        text2: "Please ensure GPS is enabled and try again"
      });
      throw error;
    }
  };

  const fetchPunchStatus = async () => {
    if (!teacherId || !token) {
      console.warn("fetchPunchStatus: Missing teacherId or token", { teacherId, token });
      Toast.show({ type: "error", text1: "Missing teacherId or token. Please re-login." });
      return;
    }
    try {
      console.log("Fetching punch status with:", { teacherId, token });
      const response = await axios.get(`${API_BASE_URL}/teacher-attendance/punch-status/${teacherId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setPunchStatus(response.data.data);
      } else {
        Toast.show({ type: "error", text1: response.data.message || "Failed to fetch punch status" });
      }
    } catch (error: any) {
      console.error("fetchPunchStatus error:", error?.response?.data || error);
      Toast.show({ type: "error", text1: error?.response?.data?.message || "Failed to fetch punch status" });
    }
  };

  const markAttendance = async (type: "IN" | "OUT") => {
    if (!teacherId || !schoolId || !token) {
      console.warn("markAttendance: Missing teacherId, schoolId, or token", { teacherId, schoolId, token });
      Toast.show({
        type: "error",
        text1: "User, school info, or token missing. Please re-login or contact admin.",
      });
      return;
    }
    // Log all values before making the API call
    console.log("Marking attendance with:", { teacherId, schoolId, token, type });

    setLoading(true);

    try {
      // Show location request message
      Toast.show({
        type: "info",
        text1: "Requesting location access...",
        text2: "Please allow location permission to mark attendance"
      });

      // Always get location and show a visible confirmation
      Toast.show({
        type: "info",
        text1: "Getting your current location...",
        text2: "Please wait while we fetch your GPS coordinates."
      });
      const location = await getLocation();
      Toast.show({
        type: "success",
        text1: "Location fetched!",
        text2: `Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}`
      });

      // Show location obtained message
      Toast.show({
        type: "info",
        text1: "Location obtained",
        text2: "Marking attendance..."
      });

      const response = await axios.post(
        `${API_BASE_URL}/teacher-attendance/mark`,
        {
          teacherId,
          schoolId,
          latitude: location.latitude,
          longitude: location.longitude,
          type,
          accuracy: location.accuracy,
          timestamp: new Date().toISOString()
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        Toast.show({
          type: "success",
          text1: `${type} marked successfully!`,
          text2: `Location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
        });
        fetchPunchStatus();
      }
    } catch (error: any) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: error?.response?.data?.message || "Failed to mark attendance",
        text2: error?.message || "Please try again"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    if (isSharing) return; // Prevent duplicate share dialogs
    setIsSharing(true);
    const today = new Date().toISOString().slice(0, 10);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/teacher-attendance`,
        {
          params: {
            teacherId,
            startDate: today,
            endDate: today,
          },
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'arraybuffer',
        }
      );

      const fileUri = FileSystem.cacheDirectory + `attendance_${today}.pdf`;
      const base64Data = btoa(String.fromCharCode(...new Uint8Array(response.data)));
      await FileSystem.writeAsStringAsync(
        fileUri,
        base64Data,
        { encoding: FileSystem.EncodingType.Base64 }
      );

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('PDF saved', `PDF saved to: ${fileUri}`);
      }
    } catch (error: any) {
      let message = 'Failed to export PDF';
      if (error?.response?.status === 404) {
        message = 'Export PDF endpoint not found. Please contact your administrator or check the API URL.';
      }
      Alert.alert(message);
      console.error('Error:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const fetchAttendanceHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/teacher-attendance`, {
        params: {
          teacherId,
          startDate: format(new Date(startDate), 'yyyy-MM-dd'),
          endDate: format(new Date(endDate), 'yyyy-MM-dd'),
          schoolId
        },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const transformedData = response.data.data.map((record: any) => ({
          ...record,
          status: record.type === 'start' ? 'IN' : 'OUT',
          timestamp: new Date(record.date).toISOString(),
          formattedDate: format(new Date(record.date), 'dd/MM/yyyy'),
          formattedTime: format(new Date(record.date), 'HH:mm:ss'),
          markedBy: record.markedBy || { fullName: 'Unknown' }
        }));
        setAttendanceHistory(transformedData);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to fetch attendance history');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to fetch attendance history');
      console.error('Error:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (teacherId && token) fetchPunchStatus();
  }, [teacherId, token]);

  return (
    <View style={{ padding: 20 }}>
      {loading && <ActivityIndicator size="large" />}
      <Text style={{ fontSize: 18, marginBottom: 10 }}>Teacher Attendance</Text>

      <Button title="Mark IN" onPress={() => markAttendance("IN")}
        color="#000"
      />
      <View style={{ height: 10 }} />
      <Button title="Mark OUT" onPress={() => markAttendance("OUT")}
        color="#000"
      />
      <View style={{ height: 10 }} />
      <TouchableOpacity onPress={isSharing ? undefined : exportToPDF} style={{ backgroundColor: isSharing ? '#aaa' : '#000', padding: 10, borderRadius: 5 }} disabled={isSharing}>
        <Text style={{ color: '#fff', textAlign: 'center' }}>{isSharing ? 'Sharing...' : 'Export Attendance PDF'}</Text>
      </TouchableOpacity>

      <View style={{ marginTop: 20 }}>
        <Text>Last Punch: {typeof punchStatus?.lastPunch === 'string' ? punchStatus.lastPunch : 'N/A'}</Text>
        <Text>Remaining Punches: {punchStatus?.remainingPunches ?? 'N/A'}</Text>
        {/* Show today's punches if available */}
        {Array.isArray(punchStatus?.todayPunches) && punchStatus.todayPunches.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ fontWeight: 'bold' }}>Today's Punches:</Text>
            {punchStatus.todayPunches.map((punch, idx) => (
              <Text key={idx}>
                {punch.type} at {punch.time}
              </Text>
            ))}
          </View>
        )}
      </View>

      <View style={{ marginTop: 30 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Attendance History</Text>
        <View style={{ flexDirection: 'row', marginVertical: 10, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => setShowStartPicker(true)}
            style={{ flex: 1, borderWidth: 1, borderColor: '#000', borderRadius: 5, marginRight: 5, padding: 8, backgroundColor: '#000' }}
          >
            <Text style={{ color: '#fff' }}>{startDate}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowEndPicker(true)}
            style={{ flex: 1, borderWidth: 1, borderColor: '#000', borderRadius: 5, marginLeft: 5, padding: 8, backgroundColor: '#000' }}
          >
            <Text style={{ color: '#fff' }}>{endDate}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={fetchAttendanceHistory} style={{ marginLeft: 10, backgroundColor: '#000', borderRadius: 5, padding: 10 }}>
            <Text style={{ color: '#fff' }}>Fetch</Text>
          </TouchableOpacity>
        </View>
        {showStartPicker && (
          <DateTimePicker
            value={new Date(startDate)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, selectedDate) => {
              setShowStartPicker(false);
              if (selectedDate) setStartDate(selectedDate.toISOString().slice(0, 10));
            }}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={new Date(endDate)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, selectedDate) => {
              setShowEndPicker(false);
              if (selectedDate) setEndDate(selectedDate.toISOString().slice(0, 10));
            }}
          />
        )}
        {historyLoading ? (
          <ActivityIndicator size="small" />
        ) : attendanceHistory.length === 0 ? (
          <Text style={{ color: '#888', marginTop: 10 }}>No attendance records found</Text>
        ) : (
          <ScrollView style={{ maxHeight: 250 }}>
            {attendanceHistory.map((record, idx) => (
              <View key={idx} style={{ backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#000', flex: 1 }}>{record.formattedDate}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: record.status === 'IN' ? '#dcfce7' : '#fef2f2', color: record.status === 'IN' ? '#166534' : '#dc2626' }}>{record.status}</Text>
                </View>
                <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Time: {record.formattedTime}</Text>
                <Text style={{ fontSize: 12, color: '#9ca3af' }}>Marked by: {record.markedBy?.fullName || 'Unknown'}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <Toast />
    </View>
  );
};

export default TeacherSelfAttendance;

