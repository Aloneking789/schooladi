import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Define AttendanceRecord type
type AttendanceRecord = {
  id: string;
  studentId: string;
  status: string;
  date: string;
  student?: {
    studentName: string;
    idcardNumber: string;
    classId: string;
  };
  markedBy?: {
    fullName: string;
  };
};

// Define Student type
type Student = {
  id: string;
  studentName: string;
  idcardNumber: string;
  classId: string;
};

const Attendance = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]); // Store all students for filtering
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<{ [studentId: string]: string }>({});
  const [startDate, setStartDate] = useState(date);
  const [endDate, setEndDate] = useState(date);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [viewMode, setViewMode] = useState('daily');

  const [teacherId, setTeacherId] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [classId, setClassId] = useState('');
  const [token, setToken] = useState('');

  const API_BASE_URL = 'https://api.pbmpublicschool.in/api';

  // Dynamic class list from API
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);

  // Build class options from classes fetched from API
  const classOptions = React.useMemo(() => {
    return classes.map((cls) => ({ label: cls.name, value: cls.id }));
  }, [classes]);

  // Fetch classes from API
  useEffect(() => {
    const fetchClasses = async () => {
      if (!schoolId || !token) return;
      try {
        const res = await axios.get(
          `https://api.pbmpublicschool.in/api/classes/${schoolId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setClasses(res.data.classes || []);
      } catch (error) {
        Alert.alert("Error", "Failed to load classes");
      }
    };
    fetchClasses();
  }, [schoolId, token]);

  // Fetch user, school, class, and token from AsyncStorage
  useEffect(() => {
    const getUserData = async () => {
      try {
        const userDataRaw = await AsyncStorage.getItem('teacher_user');
        const tokenRaw = await AsyncStorage.getItem('teacher_token');
        if (userDataRaw && tokenRaw) {
          const teacherData = JSON.parse(userDataRaw);
          setTeacherId(teacherData.id || teacherData.user?.id || '');
          setSchoolId(teacherData.schoolId?.toString() || teacherData.user?.schools?.[0]?.id || '');
          setClassId(teacherData.classId || teacherData.user?.classId || '');
          setToken(tokenRaw);
          // Auto-select class in dropdown
          setSelectedClass(teacherData.classId || teacherData.user?.classId || '');
        }
      } catch (e) {
        console.error("Failed to load user data from storage", e);
      }
    };
    getUserData();
  }, []);

  // Fetch attendance and students
  useEffect(() => {
    const fetchAttendance = async () => {
      if (!schoolId || !token) {
        setLoading(false);
        return;
      }
      try {
        // Attendance fetch uses selectedClass (from dropdown) if set, else classId from storage
        const classToUse = selectedClass || classId;
        if (!classToUse) {
          setLoading(false);
          return;
        }
        const { data: attendanceData } = await axios.get(
          `${API_BASE_URL}/attendance/by-date-class`,
          {
            params: {
              date: new Date(date).toISOString(),
              classId: classToUse,
              schoolId,
            },
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (attendanceData.success) {
          const attendanceMap: { [studentId: string]: string } = {};
          (attendanceData.data as AttendanceRecord[]).forEach((record: AttendanceRecord) => {
            attendanceMap[record.studentId] = record.status;
          });
          setAttendance(attendanceMap);
        }
        const { data: studentsData } = await axios.get(
          `${API_BASE_URL}/admission/students/by-school/${schoolId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (studentsData.success) {
          setAllStudents(studentsData.students);
          // If no class is selected, auto-select the first available classId
          if (!selectedClass && studentsData.students.length > 0) {
            setSelectedClass(studentsData.students[0].classId);
            setStudents(studentsData.students.filter((student: Student) => student.classId === studentsData.students[0].classId));
          } else {
            // Filter students by selected classId
            const filtered: Student[] = studentsData.students.filter(
              (student: Student) => student.classId === (selectedClass || classToUse)
            );
            setStudents(filtered);
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching attendance data:', error);
        Alert.alert("Error", "Failed to fetch attendance data.");
        setLoading(false);
      }
    };
    if (viewMode === 'daily') fetchAttendance();
  }, [date, classId, schoolId, token, viewMode, selectedClass]);

  // Fetch attendance history
  const fetchAttendanceHistory = async () => {
    if (!classId || !schoolId || !token) {
      Alert.alert("Error", "Missing required parameters");
      return;
    }
    try {
      const { data } = await axios.get(`${API_BASE_URL}/attendance/by-class`, {
        params: {
          classId,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          schoolId,
        },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setAttendanceHistory(data.data);
      } else {
        Alert.alert("Error", data.message || "Failed to fetch history");
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      Alert.alert('Error', 'Failed to fetch attendance history');
    }
  };

  useEffect(() => {
    if (viewMode === 'history') {
      fetchAttendanceHistory();
    }
  }, [viewMode]);

  interface HandleAttendanceChange {
    (studentId: string, status: string): void;
  }

  const handleAttendanceChange: HandleAttendanceChange = (studentId, status) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        date: new Date(date).toISOString(),
        classId,
        teacherId,
        attendance: Object.entries(attendance).map(([studentId, status]) => ({ studentId, status })),
      };
      const { data } = await axios.post(`${API_BASE_URL}/attendance/mark`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        Alert.alert('Success', 'Attendance submitted successfully!');
      } else {
        Alert.alert('Failed', data.message || 'Could not mark attendance');
      }
    } catch (error) {
      console.error('Submit error:', error);
      let errorMessage = 'Submit failed';
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const err = error as { response?: { data?: { message?: string } } };
        errorMessage = err.response?.data?.message || errorMessage;
      }
      Alert.alert('Error', errorMessage);
    }
  };

  if (!schoolId || !classId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Missing school or class information</Text>
          <Text style={styles.errorSubText}>Please contact administrator</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading attendance data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredStudents = students.filter(student =>
    student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.idcardNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Attendance Management</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* View Mode Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            onPress={() => setViewMode('daily')}
            style={[
              styles.toggleButton,
              styles.toggleButtonLeft,
              viewMode === 'daily' && styles.toggleButtonActive
            ]}
          >
            <Text style={[
              styles.toggleButtonText,
              viewMode === 'daily' && styles.toggleButtonTextActive
            ]}>Daily</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('history')}
            style={[
              styles.toggleButton,
              styles.toggleButtonRight,
              viewMode === 'history' && styles.toggleButtonActive
            ]}
          >
            <Text style={[
              styles.toggleButtonText,
              viewMode === 'history' && styles.toggleButtonTextActive
            ]}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Daily View */}
        {viewMode === 'daily' && (
          <View style={styles.section}>
            {/* Class Dropdown */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 6 }}>Select Class:</Text>
              <View style={{ backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db' }}>
                <Picker
                  selectedValue={selectedClass}
                  onValueChange={(itemValue) => setSelectedClass(itemValue)}
                  style={{ height: 44, color: '#000' }}
                >
                  <Picker.Item label="Select Class" value="" />
                  {classOptions.map((option) => (
                    <Picker.Item key={option.value} label={option.label} value={option.value} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.searchContainer}>
              <TextInput
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChangeText={setSearchTerm}
                style={styles.searchInput}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.studentsContainer}>
              {filteredStudents.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No students found</Text>
                </View>
              ) : (
                filteredStudents.map((student) => {
                  const status = attendance[student.id] || 'absent';
                  return (
                    <View key={student.id} style={styles.studentCard}>
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>{student.studentName}</Text>
                        <Text style={styles.studentId}>ID: {student.idcardNumber}</Text>
                      </View>
                      <View style={styles.attendanceButtons}>
                        <TouchableOpacity
                          onPress={() => handleAttendanceChange(student.id, 'present')}
                          style={[
                            styles.attendanceButton,
                            styles.presentButton,
                            status === 'present' && styles.presentButtonActive
                          ]}
                        >
                          <Text style={[
                            styles.attendanceButtonText,
                            status === 'present' && styles.attendanceButtonTextActive
                          ]}>Present</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleAttendanceChange(student.id, 'absent')}
                          style={[
                            styles.attendanceButton,
                            styles.absentButton,
                            status === 'absent' && styles.absentButtonActive
                          ]}
                        >
                          <Text style={[
                            styles.attendanceButtonText,
                            status === 'absent' && styles.attendanceButtonTextActive
                          ]}>Absent</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              style={styles.submitButton}
            >
              <Text style={styles.submitButtonText}>Submit Attendance</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* History View */}
        {viewMode === 'history' && (
          <View style={styles.section}>
            <View style={styles.historyControls}>
              <View style={styles.dateInputContainer}>
                <Text style={styles.inputLabel}>Start Date:</Text>
                <TextInput
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  style={styles.dateInput}
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.dateInputContainer}>
                <Text style={styles.inputLabel}>End Date:</Text>
                <TextInput
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  style={styles.dateInput}
                  placeholderTextColor="#999"
                />
              </View>
              <TouchableOpacity
                onPress={fetchAttendanceHistory}
                style={styles.fetchButton}
              >
                <Text style={styles.fetchButtonText}>Fetch History</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.historyContainer}>
              {attendanceHistory.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No attendance records found</Text>
                </View>
              ) : (
                attendanceHistory.map((record) => (
                  <View key={record.id} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyStudentName}>{record.student?.studentName || 'Unknown Student'}</Text>
                      <Text style={[
                        styles.historyStatus,
                        record.status === 'present' ? styles.historyStatusPresent : styles.historyStatusAbsent
                      ]}>
                        {record.status.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.historyDate}>
                      {new Date(record.date).toLocaleDateString()}
                    </Text>
                    <Text style={styles.historyMarkedBy}>
                      Marked by: {record.markedBy?.fullName || 'Unknown'}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  // Header Styles
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },

  // Content
  content: {
    flex: 1,
    padding: 16,
  },

  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#dc2626',
    textAlign: 'center',
  },
  errorSubText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },

  // Toggle Buttons
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    padding: 2,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonLeft: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  toggleButtonRight: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#000',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },

  // Section
  section: {
    flex: 1,
  },

  // Search
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },

  // Students
  studentsContainer: {
    marginBottom: 20,
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  studentInfo: {
    marginBottom: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  studentId: {
    fontSize: 12,
    color: '#6b7280',
  },
  attendanceButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  attendanceButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
  },
  presentButton: {
    backgroundColor: '#f9fafb',
    borderColor: '#d1d5db',
  },
  presentButtonActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  absentButton: {
    backgroundColor: '#f9fafb',
    borderColor: '#d1d5db',
  },
  absentButtonActive: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  attendanceButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  attendanceButtonTextActive: {
    color: '#fff',
  },

  // Submit Button
  submitButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16, // Ensure margin is consistent
    height: 48, // Ensure button height is consistent 

  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    height: 20,



    color: '#fff',
  },

  // History Controls
  historyControls: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dateInputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  dateInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
  },
  fetchButton: {
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  fetchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // History
  historyContainer: {
    flex: 1,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyStudentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  historyStatusPresent: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  historyStatusAbsent: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
  },
  historyDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  historyMarkedBy: {
    fontSize: 12,
    color: '#9ca3af',
  },

  // Empty State
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default Attendance;
