import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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
    fatherName?: string;
    rollNumber?: string;
  };
  markedBy?: {
    fullName: string;
    id: string;
    rollNumber: string;
  };
};

// Define Student type
type Student = {
  id: string;
  studentName: string;
  idcardNumber: string;
  classId: string;
  fatherName?: string;
  rollNumber: string;
  sectionclass: string;
  class_: string;
};

const Attendance = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
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
  const [assignedClass, setAssignedClass] = useState('');
  const [assignedSection, setAssignedSection] = useState('');
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const API_BASE_URL = 'https://api.pbmpublicschool.in/api';

  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);

  const classOptions = React.useMemo(() => {
    return classes.map((cls) => ({ label: cls.name, value: cls.id }));
  }, [classes]);

  const sortByRoll = (arr: Student[]) => {
    return arr.slice().sort((a, b) => {
      const ra = Number(a.rollNumber) || Number.POSITIVE_INFINITY;
      const rb = Number(b.rollNumber) || Number.POSITIVE_INFINITY;
      return ra - rb;
    });
  };

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
          const aClass = (teacherData.assignedClass || teacherData.classId || teacherData.class || '')?.toString() || '';
          const aSection = teacherData.assignedSection || teacherData.sectionclass || teacherData.section || '';
          setAssignedClass(aClass);
          setAssignedSection(aSection);
          setToken(tokenRaw);
          setSelectedClass((prev) => prev || aClass || (teacherData.classId || teacherData.user?.classId || ''));
        }
      } catch (e) {
        console.error("Failed to load user data from storage", e);
      }
    };
    getUserData();
  }, []);

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!schoolId || !token) {
        setLoading(false);
        return;
      }
      try {
        const classToUse = selectedClass || assignedClass || classId;
        if (!classToUse) {
          setLoading(false);
          return;
        }
        const { data: attendanceData } = await axios.get(
          `${API_BASE_URL}/attendance/by-date-class`,
          {
            params: {
              date: new Date(date).toISOString(),
              classId: classId,
              schoolId: schoolId,
            },
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        let attendanceMap: { [studentId: string]: string } = {};
        if (attendanceData.success) {
          (attendanceData.data as AttendanceRecord[]).forEach((record: AttendanceRecord) => {
            attendanceMap[record.studentId] = record.status;
          });
        }
        const { data: studentsData } = await axios.get(
          `${API_BASE_URL}/admission/students/by-school/${schoolId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (studentsData.success) {
          setAllStudents(studentsData.students);
          const filterClass = selectedClass || classToUse;

          if (!selectedClass && assignedClass) {
            setSelectedClass(assignedClass);
          }

          const filtered: Student[] = studentsData.students.filter((student: Student) => {
            const studentClassMatch = (student.classId === filterClass) || (student.class_ === filterClass);
            if (!studentClassMatch) return false;
            if (assignedSection) {
              const sc = (student.sectionclass || '').toString();
              return sc === assignedSection.toString();
            }
            return true;
          });

          setStudents(sortByRoll(filtered));
          attendanceMap = {};
        }
        setAttendance(attendanceMap);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching attendance data:', error);
        Alert.alert("Error", "Failed to fetch attendance data.");
        setLoading(false);
      }
    };
    if (viewMode === 'daily') fetchAttendance();
  }, [date, classId, schoolId, token, viewMode, selectedClass]);

  const fetchAttendanceHistory = async () => {
    const classToUse = selectedClass || assignedClass || classId;
    // If a teacher has an assignedClass but no selectedClass, prefer assignedClass and keep UI in sync
    if (!selectedClass && assignedClass) {
      setSelectedClass(assignedClass);
    }

    if (!classToUse || !schoolId || !token) {
      Alert.alert("Error", "Missing required parameters");
      return;
    }
    try {
      // Prefer the explicit `classId` state (likely the numeric DB id). Fall back to classToUse
      const requestClassId = classId || classToUse;

      const { data } = await axios.get(`${API_BASE_URL}/attendance/by-class`, {
        params: {
          // send both keys to support backends that expect either 'classId' or 'classID'
          classId: requestClassId,
          classID: requestClassId,
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
  console.log('history response', data);
  console.log('reqClassId,start,end ->', requestClassId, startDate, endDate);
    } catch (error) {
      console.error('Error fetching history:', error);
      Alert.alert('Error', 'Failed to fetch attendance history');
    }
  };

  useEffect(() => {
    // Run history fetch when entering history view or when key params become available/changed
    if (viewMode === 'history') {
      fetchAttendanceHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedClass, assignedClass, classId, schoolId, token, startDate, endDate]);

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
    const classToUse = selectedClass || classId;
    try {
      setSubmitting(true);
      const studentsForClass = sortByRoll(students);
      const attendanceList = studentsForClass.map((s) => ({
        studentId: s.id,
        status: attendance[s.id] || 'present',
      }));

      const payload = {
        date: new Date(date).toISOString(),
        classId: classId,
        teacherId,
        attendance: attendanceList,
      };

      const { data } = await axios.post(`${API_BASE_URL}/attendance/mark`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setStudents(sortByRoll(studentsForClass));
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
    } finally {
      setSubmitting(false);
    }
  };

  if (!schoolId || !classId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>Missing School Information</Text>
          <Text style={styles.errorSubText}>Please contact your administrator to set up your account properly</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading attendance data...</Text>
          <Text style={styles.loadingSubText}>Please wait</Text>
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
        <View style={styles.headerContent}>
          <Text style={styles.headerEmoji}>📋</Text>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Attendance Management</Text>
            <Text style={styles.headerSubtitle}>Track and manage student attendance</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
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
            <Text style={styles.toggleEmoji}>📅</Text>
            <Text style={[
              styles.toggleButtonText,
              viewMode === 'daily' && styles.toggleButtonTextActive
            ]}>Daily View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('history')}
            style={[
              styles.toggleButton,
              styles.toggleButtonRight,
              viewMode === 'history' && styles.toggleButtonActive
            ]}
          >
            <Text style={styles.toggleEmoji}>📊</Text>
            <Text style={[
              styles.toggleButtonText,
              viewMode === 'history' && styles.toggleButtonTextActive
            ]}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Daily View */}
        {viewMode === 'daily' && (
          <View style={styles.section}>
            <FlatList
              data={filteredStudents}
              keyExtractor={(item) => item.id}
              renderItem={({ item: student }) => {
                const status = attendance[student.id] || 'present';
                return (
                  <View key={student.id} style={styles.studentCard}>
                    <View style={styles.studentHeader}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>
                          {student.studentName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>{student.studentName}</Text>
                        <View style={styles.studentDetails}>
                          <Text style={styles.studentDetailText}>🎓 Roll: {student.rollNumber}</Text>
                          <Text style={styles.studentDetailText}>📚 {student.class_}-{student.sectionclass}</Text>
                        </View>
                        <Text style={styles.studentId}>👤 Father: {student.fatherName || 'N/A'}</Text>
                      </View>
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
                        <Text style={styles.buttonIcon}>✓</Text>
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
                        <Text style={styles.buttonIcon}>✕</Text>
                        <Text style={[
                          styles.attendanceButtonText,
                          status === 'absent' && styles.attendanceButtonTextActive
                        ]}>Absent</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
              ListHeaderComponent={
                <View>
                  <View style={styles.searchContainer}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                      placeholder="Search by name or ID..."
                      value={searchTerm}
                      onChangeText={setSearchTerm}
                      style={styles.searchInput}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  {/* Attendance Summary */}
                  <View style={styles.summaryContainer}>
                    {(() => {
                      let present = 0, absent = 0;
                      filteredStudents.forEach(student => {
                        const status = attendance[student.id] || 'present';
                        if (status === 'present') present++;
                        else absent++;
                      });
                      return (
                        <>
                          <View style={styles.summaryCard}>
                            <Text style={styles.summaryIcon}>✓</Text>
                            <View>
                              <Text style={styles.summaryLabel}>Present</Text>
                              <Text style={styles.summaryValue}>{present}</Text>
                            </View>
                          </View>
                          <View style={[styles.summaryCard, styles.summaryCardAbsent]}>
                            <Text style={styles.summaryIcon}>✕</Text>
                            <View>
                              <Text style={styles.summaryLabel}>Absent</Text>
                              <Text style={styles.summaryValue}>{absent}</Text>
                            </View>
                          </View>
                        </>
                      );
                    })()}
                  </View>
                </View>
              }
              ListFooterComponent={<View style={{ height: 140 }} />}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>
        )}

        {/* History View */}
        {viewMode === 'history' && (
          <ScrollView style={styles.section}>
            <View style={styles.historyControls}>
              <Text style={styles.historyControlsTitle}>📅 Select Date Range</Text>
              <View style={styles.dateInputContainer}>
                <Text style={styles.inputLabel}>Start Date</Text>
                <TextInput
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  style={styles.dateInput}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={styles.dateInputContainer}>
                <Text style={styles.inputLabel}>End Date</Text>
                <TextInput
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  style={styles.dateInput}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <TouchableOpacity
                onPress={fetchAttendanceHistory}
                style={styles.fetchButton}
              >
                <Text style={styles.fetchButtonText}>🔍 Fetch History</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.historyContainer}>
              {attendanceHistory.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>📭</Text>
                  <Text style={styles.emptyText}>No Records Found</Text>
                  <Text style={styles.emptySubText}>Try selecting a different date range</Text>
                </View>
              ) : (
                attendanceHistory.map((record) => (
                  <View key={record.id} style={styles.historyCard}>
                    <View style={styles.historyCardHeader}>
                      <View style={styles.historyAvatarCircle}>
                        <Text style={styles.historyAvatarText}>
                          {record.student?.studentName?.charAt(0).toUpperCase() || '?'}
                        </Text>
                      </View>
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyStudentName}>{record.student?.studentName || 'Unknown Student'}</Text>
                        <Text style={styles.historyStudentId}>Roll: {record.student?.rollNumber || 'N/A'}</Text>
                      </View>
                      <View style={[
                        styles.historyStatusBadge,
                        record.status === 'present' ? styles.historyStatusPresent : styles.historyStatusAbsent
                      ]}>
                        <Text style={styles.historyStatusText}>
                          {record.status === 'present' ? '✓' : '✕'} {record.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.historyFooter}>
                      <Text style={styles.historyDate}>
                        📅 {new Date(record.date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </Text>
                      <Text style={styles.historyMarkedBy}>
                        👤 {record.markedBy?.fullName || 'Unknown'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Fixed footer submit button */}
      {viewMode === 'daily' && (
        <View style={styles.footer} pointerEvents="box-none">
          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? '⏳ Submitting...' : '✓ Submit Attendance'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  // Header Styles
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerEmoji: {
    fontSize: 36,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
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
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  loadingSubText: {
    marginTop: 4,
    fontSize: 14,
    color: '#9CA3AF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Toggle Buttons
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderRadius: 8,
  },
  toggleButtonLeft: {},
  toggleButtonRight: {},
  toggleButtonActive: {
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  toggleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },

  // Section
  section: {
    flex: 1,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1F2937',
  },

  // Summary Cards
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryCardAbsent: {
    backgroundColor: '#FEF2F2',
    shadowColor: '#EF4444',
  },
  summaryIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },

  // Student Cards
  studentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  studentHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4F46E5',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  studentDetails: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  studentDetailText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  studentId: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  attendanceButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  attendanceButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 2,
  },
  buttonIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  presentButton: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  presentButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  absentButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  absentButtonActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  attendanceButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  attendanceButtonTextActive: {
    color: '#FFFFFF',
  },

  // Submit Button
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: 'transparent',
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    bottom: 70,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ede0e0ff',
  },

  // History Controls
  historyControls: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  historyControlsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  dateInputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  dateInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  fetchButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  fetchButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // History Cards
  historyContainer: {
    flex: 1,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4F46E5',
  },
  historyInfo: {
    flex: 1,
  },
  historyStudentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  historyStudentId: {
    fontSize: 12,
    color: '#6B7280',
  },
  historyStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  historyStatusPresent: {
    backgroundColor: '#ECFDF5',
  },
  historyStatusAbsent: {
    backgroundColor: '#FEF2F2',
  },
  historyStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  historyDate: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  historyMarkedBy: {
    fontSize: 13,
    color: '#9CA3AF',
  },

  // Empty State
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 72,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default Attendance;