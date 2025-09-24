import React, { useEffect, useState } from "react";
// Type definitions
type Student = {
  id: string;
  studentName: string;
  idcardNumber: string;
  classId: string;
};

type AttendanceRecord = {
  id: string;
  studentId: string;
  status: string;
  date: string;
};
import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE_URL = 'https://api.pbmpublicschool.in/api';

const TeacherDashboard = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [goodStudents, setGoodStudents] = useState<(Student & { present: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherId, setTeacherId] = useState<string>('');
  const [schoolId, setSchoolId] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);

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
        }
      } catch (e) {
        console.error("Failed to load user data from storage", e);
      }
    };
    getUserData();
  }, []);

  useEffect(() => {
    const fetchStudentsAndAttendance = async () => {
      if (!schoolId || !classId || !token) {
        setLoading(false);
        return;
      }
      try {
        // Fetch students
        const studentsRes = await axios.get(
          `${API_BASE_URL}/admission/students/by-school/${schoolId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        let classStudents: Student[] = [];
        if (studentsRes.data.success) {
          classStudents = studentsRes.data.students.filter(
            (student: Student) => student.classId === classId
          );
          setStudents(classStudents);
        }

        // Fetch attendance history for this class (last 60 days)
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 60);
        const endDate = new Date();
        const attendanceRes = await axios.get(`${API_BASE_URL}/attendance/by-class`, {
          params: {
            classId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            schoolId,
          },
          headers: { Authorization: `Bearer ${token}` },
        });
        let history: AttendanceRecord[] = [];
        if (attendanceRes.data.success) {
          history = attendanceRes.data.data;
          setAttendanceHistory(history);
        }

        // Calculate attendance percentage for each student
        const attendanceCount: { [studentId: string]: number } = {};
        const presentCount: { [studentId: string]: number } = {};
        history.forEach((record: AttendanceRecord) => {
          if (!attendanceCount[record.studentId]) attendanceCount[record.studentId] = 0;
          attendanceCount[record.studentId]++;
          if (record.status === 'Present') {
            if (!presentCount[record.studentId]) presentCount[record.studentId] = 0;
            presentCount[record.studentId]++;
          }
        });
        // Good students: sorted by present count (descending)
        const good: (Student & { present: number })[] = [...classStudents]
          .map((student: Student) => ({
            ...student,
            present: presentCount[student.id] || 0
          }))
          .sort((a, b) => b.present - a.present);
        setGoodStudents(good);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
      setLoading(false);
    };
    fetchStudentsAndAttendance();
  }, [schoolId, classId, token]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Teacher Dashboard</Text>
      </View>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={{ marginTop: 12, color: '#6b7280' }}>Loading dashboard...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Summary Cards */}
          <View style={styles.statsSection}>
            <View style={styles.cardsRow}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="people" color="#fff" size={20} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>Total Students</Text>
                    <Text style={styles.cardValue}>{students.length}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="star" color="#fff" size={20} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>Good Students</Text>
                    <Text style={styles.cardValue}>{goodStudents.length}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
          {/* Good Students List */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="medal" color="#6b7280" size={20} />
              <Text style={styles.sectionTitle}>Good Students (&gt;90% Attendance)</Text>
            </View>
            <View style={styles.sectionContent}>
              {goodStudents.length === 0 ? (
                <Text style={{ color: '#888' }}>No good students found for this period.</Text>
              ) : (
                goodStudents.map((student: Student & { present: number }) => (
                  <View key={student.id} style={styles.listItem}>
                    <View style={styles.listItemLeft}>
                      <Text style={styles.listItemTitle}>{student.studentName}</Text>
                      <Text style={styles.listItemSub}>Present Days: {student.present}</Text>
                      <Text style={styles.listItemSub}>ID: {student.idcardNumber}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  // Header
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
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Stats Section
  statsSection: {
    padding: 16,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },

  // Sections
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  sectionContent: {
    padding: 12,
  },

  // List Items
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  listItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  listItemRight: {
    alignItems: 'flex-end',
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  listItemSub: {
    fontSize: 12,
    color: '#6b7280',
  },
  listItemTime: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },

  // Status Badges
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusGraded: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  statusSubmitted: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  statusDate: {
    fontSize: 10,
    color: '#9ca3af',
  },
});

export default TeacherDashboard;
