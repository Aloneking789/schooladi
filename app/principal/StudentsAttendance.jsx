import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

const AttendanceAll = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]); 
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState({});
  const [startDate, setStartDate] = useState(date);
  const [endDate, setEndDate] = useState(date);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [viewMode, setViewMode] = useState('daily');
  const [schoolId, setSchoolId] = useState('1');
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedSection, setSelectedSection] = useState('A');
  const [principalId, setPrincipalId] = useState('');
  const sections = ['A', 'B', 'C', 'D'];

  // Use the public API base by default — tunnels can expire and return 404s
  const API_BASE_URL = 'https://api.pbmpublicschool.in/api';

  // Get user data from storage
  useEffect(() => {
    const getUserData = async () => {
      try {
        const [userDataRaw, tokenRaw] = await Promise.all([
          AsyncStorage.getItem('principal_user'),
          AsyncStorage.getItem('principal_token')
        ]);

        if (userDataRaw && tokenRaw) {
          const userData = JSON.parse(userDataRaw);
          
          const schoolId = userData.schoolId || 
            (userData.schools && userData.schools[0]?.id) || 
            (userData.schoolIds && userData.schoolIds[0]) || 
            '1';
          
          setSchoolId(schoolId.toString());
          setPrincipalId(userData.id);
          setToken(tokenRaw);
        } else {
          const defaultUser = {
            id: "47fbc141-047c-41f3-9ae6-b965d9901e30",
            LoguserID: "PRIN5141395",
            fullName: "Mr. Ripusudan Mishra",
            email: "PBMPUBLICSCHOOL@GMAIL.COM",
            schoolId: "1",
            schools: [{
              id: 1,
              Schoolname: "P B M PUBLIC SCHOOL",
              subjects: {}
            }],
            role: "principal"
          };

          const defaultToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

          await Promise.all([
            AsyncStorage.setItem('principal_user', JSON.stringify(defaultUser)),
            AsyncStorage.setItem('principal_token', defaultToken)
          ]);

          setSchoolId("1");
          setPrincipalId(defaultUser.id);
          setToken(defaultToken);
        }
      } catch (e) {
        console.error("Failed to load/store user data:", e);
        Alert.alert("Error", "Failed to load user data. Please try logging in again.");
      }
    };
    getUserData();
  }, []);

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      if (!schoolId || !token) {
        console.log('Skipping fetchClasses: missing schoolId or token', { schoolId, token });
        return;
      }
      const url = `${API_BASE_URL}/classes/${schoolId}`;
      try {
        console.log('Fetching classes from', url);
        const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        setClasses(res.data.classes || []);
      } catch (error) {
        console.error('Failed to fetch classes', {
          url,
          status: error.response?.status,
          body: error.response?.data,
        });
        if (error.response?.status === 404) {
          Alert.alert('Error', 'Classes not found (404). Please check the school configuration or API URL.');
        } else {
          Alert.alert('Error', 'Failed to load classes');
        }
      }
    };
    fetchClasses();
  }, [schoolId, token]);

  // Sort students by roll number
  const sortByRoll = (arr) => {
    return arr.slice().sort((a, b) => {
      const ra = Number(a.rollNumber) || Number.POSITIVE_INFINITY;
      const rb = Number(b.rollNumber) || Number.POSITIVE_INFINITY;
      return ra - rb;
    });
  };

  // Fetch attendance and students
  useEffect(() => {
    const fetchAttendance = async () => {
      if (!schoolId || !token || !selectedClass || !selectedSection) {
        setLoading(false);
        return;
      }
      try {
        const url = `${API_BASE_URL}/attendance/by-date-class`;
        console.log('Fetching attendance from', url, { date: new Date(date).toISOString(), classId: selectedClass, sectionclass: selectedSection, schoolId });
        const { data: attendanceData } = await axios.get(url, {
          params: {
            date: new Date(date).toISOString(),
            classId: selectedClass,
            sectionclass: selectedSection,
            schoolId,
          },
          headers: { Authorization: `Bearer ${token}` },
        });

        let attendanceMap = {};
        if (attendanceData.success) {
          attendanceData.data.forEach((record) => {
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
          const filtered = studentsData.students.filter(
            (student) => student.classId === selectedClass && student.sectionclass === selectedSection
          );
          setStudents(sortByRoll(filtered));
        }
        setAttendance(attendanceMap);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching attendance data', {
          message: error.message,
          status: error.response?.status,
          body: error.response?.data,
        });
        if (error.response?.status === 404) {
          Alert.alert('Error', 'Attendance endpoint not found (404). Please verify API URL.');
        } else {
          Alert.alert('Error', 'Failed to fetch attendance data');
        }
        setLoading(false);
      }
    };
    if (viewMode === 'daily') fetchAttendance();
  }, [date, selectedClass, selectedSection, schoolId, token, viewMode]);

  // Fetch attendance history
  const fetchAttendanceHistory = async () => {
    if (!selectedClass || !schoolId || !token) {
      Alert.alert("Error", "Please select a class first");
      return;
    }
    try {
      const url = `${API_BASE_URL}/attendance/by-class`;
      console.log('Fetching attendance history from', url, { classId: selectedClass, startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString(), schoolId });
      const { data } = await axios.get(url, {
        params: {
          classId: selectedClass,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          schoolId,
        },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setAttendanceHistory(data.data);
      }
    } catch (error) {
      console.error('Error fetching attendance history', { status: error.response?.status, body: error.response?.data, message: error.message });
      if (error.response?.status === 404) {
        Alert.alert('Error', 'Attendance history not found (404).');
      } else {
        Alert.alert('Error', 'Failed to fetch attendance history');
      }
    }
  };

  useEffect(() => {
    if (viewMode === 'history') {
      fetchAttendanceHistory();
    }
  }, [viewMode, selectedClass]);

  const handleAttendanceChange = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSubmit = async () => {
    if (!selectedClass || !selectedSection) {
      Alert.alert("Error", "Please select both class and section");
      return;
    }

    try {
      setSubmitting(true);
      const studentsForClass = sortByRoll(students);
      
      if (!studentsForClass || studentsForClass.length === 0) {
        Alert.alert("Error", "No students found for selected class and section");
        return;
      }

      const attendanceRecords = studentsForClass.map(s => ({
        studentId: s.id,
        status: (attendance[s.id] || 'present').toLowerCase()
      }));

      const payload = {
        date: new Date(date).toISOString(),
        classId: selectedClass,
        teacherId: principalId,
        attendance: attendanceRecords
      };

      const { data } = await axios.post(
        `${API_BASE_URL}/attendance/mark`,
        payload,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (data.success) {
        Alert.alert('Success', 'Attendance marked successfully!');
      } else {
        const errorMessage = data.message || 'Could not mark attendance';
        Alert.alert('Failed', errorMessage);
      }
    } catch (error) {
      console.error('Submit error:', error);
      let errorMessage = 'Failed to submit attendance';
      if (error.response?.data?.message) {
        errorMessage += `: ${error.response.data.message}`;
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = students
    .filter(student =>
      student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.idcardNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNumber?.toString().includes(searchTerm)
    )
    .sort((a, b) => {
      const rollA = parseInt(a.rollNumber) || Number.MAX_SAFE_INTEGER;
      const rollB = parseInt(b.rollNumber) || Number.MAX_SAFE_INTEGER;
      return rollA - rollB;
    });

  if (!schoolId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#dc2626" />
          <Text style={styles.errorText}>Missing school information</Text>
          <Text style={styles.errorSubText}>Please contact administrator</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading attendance data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="calendar" size={24} color="#3b82f6" />
          <Text style={styles.headerTitle}>Student Attendance</Text>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Class Selection */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Select Class</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContainer}
          >
            {classes.length === 0 ? (
              <Text style={styles.emptyText}>No classes available</Text>
            ) : (
              classes.map((cls) => (
                <TouchableOpacity
                  key={cls.id}
                  onPress={() => setSelectedClass(cls.id)}
                  style={[
                    styles.chip,
                    selectedClass === cls.id && styles.chipActive
                  ]}
                >
                  <Text style={[
                    styles.chipText,
                    selectedClass === cls.id && styles.chipTextActive
                  ]}>
                    {cls.name}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        {/* Section Selection */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Select Section</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContainer}
          >
            {sections.map((section) => (
              <TouchableOpacity
                key={section}
                onPress={() => setSelectedSection(section)}
                style={[
                  styles.chip,
                  selectedSection === section && styles.chipActive
                ]}
              >
                <Text style={[
                  styles.chipText,
                  selectedSection === section && styles.chipTextActive
                ]}>
                  Section {section}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* View Mode Toggle */}
        <View style={styles.card}>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              onPress={() => setViewMode('daily')}
              style={[
                styles.toggleButton,
                viewMode === 'daily' && styles.toggleButtonActive
              ]}
            >
              <Ionicons 
                name="checkmark-circle" 
                size={20} 
                color={viewMode === 'daily' ? '#fff' : '#9ca3af'} 
              />
              <Text style={[
                styles.toggleButtonText,
                viewMode === 'daily' && styles.toggleButtonTextActive
              ]}>Mark Attendance</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode('history')}
              style={[
                styles.toggleButton,
                viewMode === 'history' && styles.toggleButtonActive
              ]}
            >
              <Ionicons 
                name="time" 
                size={20} 
                color={viewMode === 'history' ? '#fff' : '#9ca3af'} 
              />
              <Text style={[
                styles.toggleButtonText,
                viewMode === 'history' && styles.toggleButtonTextActive
              ]}>View History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {viewMode === 'daily' ? (
          selectedClass ? (
            <>
              {/* Date Selection */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Select Date</Text>
                <View style={styles.dateInputWrapper}>
                  <Ionicons name="calendar-outline" size={20} color="#9ca3af" />
                  <TextInput
                    value={date}
                    onChangeText={setDate}
                    placeholder="YYYY-MM-DD"
                    style={styles.dateInput}
                  />
                </View>
              </View>

              {/* Student Count */}
              <View style={styles.statsCard}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{filteredStudents.length}</Text>
                  <Text style={styles.statLabel}>Total Students</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, styles.statValuePresent]}>
                    {Object.values(attendance).filter(s => s === 'present').length}
                  </Text>
                  <Text style={styles.statLabel}>Present</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, styles.statValueAbsent]}>
                    {Object.values(attendance).filter(s => s === 'absent').length}
                  </Text>
                  <Text style={styles.statLabel}>Absent</Text>
                </View>
              </View>

              {/* Students List */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Students</Text>
                {filteredStudents.length === 0 ? (
                  <View style={styles.emptyStateContainer}>
                    <Ionicons name="people-outline" size={48} color="#d1d5db" />
                    <Text style={styles.emptyStateText}>No students found</Text>
                  </View>
                ) : (
                  filteredStudents.map((student) => {
                    const status = attendance[student.id] || 'present';
                    return (
                      <View key={student.id} style={styles.studentCard}>
                        <View style={styles.studentHeader}>
                          <View style={styles.rollBadge}>
                            <Text style={styles.rollText}>{student.rollNumber || 'N/A'}</Text>
                          </View>
                          <View style={styles.studentDetails}>
                            <Text style={styles.studentName}>{student.studentName}</Text>
                            <Text style={styles.studentMeta}>
                              ID: {student.idcardNumber} • {student.class_} {student.sectionclass}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.attendanceButtons}>
                          <TouchableOpacity
                            style={[
                              styles.attendanceButton,
                              status === 'present' && styles.presentButtonActive,
                            ]}
                            onPress={() => handleAttendanceChange(student.id, 'present')}
                          >
                            <Ionicons 
                              name={status === 'present' ? 'checkmark-circle' : 'checkmark-circle-outline'} 
                              size={20} 
                              color={status === 'present' ? '#fff' : '#059669'} 
                            />
                            <Text style={[
                              styles.attendanceButtonText,
                              status === 'present' && styles.attendanceButtonTextActive,
                            ]}>Present</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.attendanceButton,
                              status === 'absent' && styles.absentButtonActive,
                            ]}
                            onPress={() => handleAttendanceChange(student.id, 'absent')}
                          >
                            <Ionicons 
                              name={status === 'absent' ? 'close-circle' : 'close-circle-outline'} 
                              size={20} 
                              color={status === 'absent' ? '#fff' : '#dc2626'} 
                            />
                            <Text style={[
                              styles.attendanceButtonText,
                              status === 'absent' && styles.attendanceButtonTextActive,
                            ]}>Absent</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </>
          ) : (
            <View style={styles.emptyStateCard}>
              <Ionicons name="school-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>Select a Class</Text>
              <Text style={styles.emptyStateSubtitle}>
                Please select a class and section to mark attendance
              </Text>
            </View>
          )
        ) : (
          <>
            {/* History Controls */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Date Range</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.inputLabel}>Start Date</Text>
                  <View style={styles.dateInputWrapper}>
                    <Ionicons name="calendar-outline" size={18} color="#9ca3af" />
                    <TextInput
                      value={startDate}
                      onChangeText={setStartDate}
                      placeholder="YYYY-MM-DD"
                      style={styles.dateInputSmall}
                    />
                  </View>
                </View>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.inputLabel}>End Date</Text>
                  <View style={styles.dateInputWrapper}>
                    <Ionicons name="calendar-outline" size={18} color="#9ca3af" />
                    <TextInput
                      value={endDate}
                      onChangeText={setEndDate}
                      placeholder="YYYY-MM-DD"
                      style={styles.dateInputSmall}
                    />
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.fetchButton}
                onPress={fetchAttendanceHistory}
              >
                <Ionicons name="search" size={20} color="#fff" />
                <Text style={styles.fetchButtonText}>Fetch History</Text>
              </TouchableOpacity>
            </View>

            {/* History Results */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Attendance Records</Text>
              {attendanceHistory.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
                  <Text style={styles.emptyStateText}>No records found</Text>
                </View>
              ) : (
                [...attendanceHistory]
                  .sort((a, b) => {
                    const rollA = parseInt(a.student?.rollNumber) || Number.MAX_SAFE_INTEGER;
                    const rollB = parseInt(b.student?.rollNumber) || Number.MAX_SAFE_INTEGER;
                    return rollA - rollB;
                  })
                  .map((record) => (
                    <View key={record.id} style={styles.historyCard}>
                      <View style={styles.historyHeader}>
                        <View style={styles.rollBadge}>
                          <Text style={styles.rollText}>{record.student?.rollNumber || 'N/A'}</Text>
                        </View>
                        <View style={styles.historyDetails}>
                          <Text style={styles.historyName}>{record.student?.studentName}</Text>
                          <Text style={styles.historyMeta}>
                            ID: {record.student?.idcardNumber}
                          </Text>
                          <Text style={styles.historyDate}>
                            {new Date(record.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </Text>
                        </View>
                        <View style={[
                          styles.statusBadge,
                          record.status === 'present' ? styles.statusBadgePresent : styles.statusBadgeAbsent
                        ]}>
                          <Ionicons 
                            name={record.status === 'present' ? 'checkmark-circle' : 'close-circle'} 
                            size={16} 
                            color={record.status === 'present' ? '#059669' : '#dc2626'} 
                          />
                          <Text style={[
                            styles.statusText,
                            record.status === 'present' ? styles.statusTextPresent : styles.statusTextAbsent
                          ]}>
                            {record.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
              )}
            </View>
          </>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Fixed Submit Button */}
      {viewMode === 'daily' && selectedClass && filteredStudents.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="checkmark-done" size={24} color="#fff" />
            )}
            <Text style={styles.submitButtonText}>
              {submitting ? 'Submitting...' : 'Submit Attendance'}
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
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 5,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  chipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  chipText: {
    color: '#6b7280',
    fontWeight: '600',
    fontSize: 14,
  },
  chipTextActive: {
    color: '#fff',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#3b82f6',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  dateInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1f2937',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: 4,
  },
  statValuePresent: {
    color: '#059669',
  },
  statValueAbsent: {
    color: '#dc2626',
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 12,
  },
  studentCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  rollBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 45,
    alignItems: 'center',
  },
  rollText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  studentMeta: {
    fontSize: 13,
    color: '#6b7280',
  },
  attendanceButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  attendanceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    gap: 6,
  },
  presentButtonActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  absentButtonActive: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  attendanceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  attendanceButtonTextActive: {
    color: '#fff',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  dateInputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 6,
  },
  dateInputSmall: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1f2937',
  },
  fetchButton: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fetchButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  historyCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  historyDetails: {
    flex: 1,
  },
  historyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  historyMeta: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusBadgePresent: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeAbsent: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusTextPresent: {
    color: '#059669',
  },
  statusTextAbsent: {
    color: '#dc2626',
  },
  emptyStateCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: '#9ca3af',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  bottomSpacer: {
    height: 20,
  },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    bottom: 80,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 2,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    bottom: 2,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#dc2626',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default AttendanceAll;