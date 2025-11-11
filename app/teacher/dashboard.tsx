import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, Dimensions } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import responsive, { rem } from '../utils/responsive';

const { width } = Dimensions.get('window');

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

const API_BASE_URL = 'https://api.pbmpublicschool.in/api';

import { useNavigation } from '@react-navigation/native';

const TeacherDashboard = () => {
  const navigation = useNavigation() as any;
  const [students, setStudents] = useState<Student[]>([]);
  const [goodStudents, setGoodStudents] = useState<(Student & { present: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherId, setTeacherId] = useState<string>('');
  const [schoolId, setSchoolId] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [assignedClass, setAssignedClass] = useState<string>('');
  const [assignedSection, setAssignedSection] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [presentTotal, setPresentTotal] = useState<number | null>(null);
  const [absentTotal, setAbsentTotal] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const getUserData = async () => {
      try {
        const userDataRaw = await AsyncStorage.getItem('teacher_user');
        const tokenRaw = await AsyncStorage.getItem('teacher_token');
        if (userDataRaw && tokenRaw) {
          const teacherData = JSON.parse(userDataRaw);
          setTeacherId(teacherData.id || teacherData.user?.id || '');
          setSchoolId(teacherData.schoolId?.toString() || teacherData.user?.schools?.[0]?.id || '');
          const assignedCls = teacherData.assignedClass || teacherData.classId || teacherData.class || teacherData.user?.classId || '';
          const assignedSec = teacherData.assignedSection || teacherData.sectionclass || teacherData.section || '';
          if (assignedCls) setAssignedClass(String(assignedCls));
          if (assignedSec) setAssignedSection(String(assignedSec));
          setClassId(teacherData.classId || teacherData.user?.classId || '');
          setToken(tokenRaw);
        }
      } catch (e) {}
    };
    getUserData();
  }, []);

  useEffect(() => {
    const fetchStudentsAndAttendance = async () => {
      const classToUse = assignedClass || classId;
      if (!schoolId || !classToUse || !token) {
        setLoading(false);
        return;
      }
      try {
        const studentsRes = await axios.get(
          `${API_BASE_URL}/admission/students/by-school/${schoolId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        let classStudents: Student[] = [];
        if (studentsRes.data.success) {
          classStudents = studentsRes.data.students.filter((student: Student) => {
            const stuClass = (student as any).class_ || (student as any).classId || '';
            if (String(stuClass) !== String(classToUse)) return false;
            if (assignedSection) {
              const stuSec = (student as any).sectionclass || (student as any).section || '';
              return String(stuSec) === String(assignedSection);
            }
            return true;
          });
          setStudents(classStudents);
        } else {
          setStudents([]);
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 60);
        const endDate = new Date();
        const attendanceRes = await axios.get(`${API_BASE_URL}/attendance/by-class`, {
          params: {
            classId: classToUse,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            schoolId,
          },
          headers: { Authorization: `Bearer ${token}` },
        });
        let history: AttendanceRecord[] = [];
        if (attendanceRes.data.success) {
          history = attendanceRes.data.data;
          if (assignedSection && classStudents && classStudents.length > 0) {
            const allowedIds = new Set(classStudents.map((s) => s.id));
            history = history.filter((h: AttendanceRecord) => allowedIds.has(h.studentId));
          }
          setAttendanceHistory(history);
        } else {
          setAttendanceHistory([]);
        }

        const attendanceCount: { [studentId: string]: number } = {};
        const presentCount: { [studentId: string]: number } = {};
        history.forEach((record: AttendanceRecord) => {
          if (!attendanceCount[record.studentId]) attendanceCount[record.studentId] = 0;
          attendanceCount[record.studentId]++;
          if (String(record.status).toLowerCase() === 'present') {
            if (!presentCount[record.studentId]) presentCount[record.studentId] = 0;
            presentCount[record.studentId]++;
          }
        });
        const good: (Student & { present: number })[] = [...classStudents]
          .map((student: Student) => ({
            ...student,
            present: presentCount[student.id] || 0
          }))
          .sort((a, b) => b.present - a.present);
        setGoodStudents(good);
      } catch (err) {
        setStudents([]);
        setAttendanceHistory([]);
        setGoodStudents([]);
      }
      setLoading(false);
    };
    fetchStudentsAndAttendance();
  }, [schoolId, classId, token, assignedClass, assignedSection]);

  useEffect(() => {
    const fetchCounts = async () => {
      const classToUse = classId;
      if (!classToUse || !schoolId || !token) return;
      try {
        const res = await axios.get(`${API_BASE_URL}/attendance/by-date-class`, {
          params: {
            date: new Date(selectedDate).toISOString(),
            classId: classToUse,
            schoolId,
          },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data && res.data.success) {
          let todays: AttendanceRecord[] = res.data.data || [];
          if (assignedSection && students && students.length > 0) {
            const allowed = new Set(students.map((s) => s.id));
            todays = todays.filter((t: AttendanceRecord) => allowed.has(t.studentId));
          }
          const presentCount = todays.filter((r) => String(r.status).toLowerCase() === 'present').length;
          const totalStudents = students.length;
          setPresentTotal(presentCount);
          setAbsentTotal(Math.max(0, totalStudents - presentCount));
        } else {
          setPresentTotal(null);
          setAbsentTotal(null);
        }
      } catch (e) {
        setPresentTotal(null);
        setAbsentTotal(null);
      }
    };
    fetchCounts();
  }, [selectedDate, classId, schoolId, token, students, assignedClass, assignedSection]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Image
        source={require('../../assets/images/pmblogo.jpg')}
        style={styles.watermark}
        resizeMode="contain"
        accessible={false}
      />
      
      {/* Enhanced Gradient Header */}
      <LinearGradient
        colors={['#4c669f', '#3b5998', '#192f6a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="school" size={rem(28)} color="#fff" />
          </View>
          <Text style={styles.heading}>Teacher Dashboard</Text>
          <Text style={styles.subHeading}>
            {assignedClass && assignedSection ? `Class ${assignedClass}-${assignedSection}` : 'Your Classroom'}
          </Text>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4c669f" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Enhanced Attendance Summary Card */}
          <View style={styles.attendanceCard}>
            <View style={styles.dateSelector}>
              <TouchableOpacity
                onPress={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}
                style={styles.dateNavButton}
              >
                <Ionicons name="chevron-back" size={rem(20)} color="#4c669f" />
              </TouchableOpacity>

              <View style={styles.dateDisplay}>
                <Ionicons name="calendar-outline" size={rem(18)} color="#4c669f" />
                <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}
                style={styles.dateNavButton}
              >
                <Ionicons name="chevron-forward" size={rem(20)} color="#4c669f" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              style={styles.todayButton}
            >
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>

            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.statGradient}
                >
                  <Ionicons name="checkmark-circle" size={rem(32)} color="#fff" />
                  <Text style={styles.statLabel}>Present</Text>
                  <Text style={styles.statValue}>{presentTotal ?? '-'}</Text>
                </LinearGradient>
              </View>

              <View style={styles.statCard}>
                <LinearGradient
                  colors={['#ef4444', '#dc2626']}
                  style={styles.statGradient}
                >
                  <Ionicons name="close-circle" size={rem(32)} color="#fff" />
                  <Text style={styles.statLabel}>Absent</Text>
                  <Text style={styles.statValue}>{absentTotal ?? '-'}</Text>
                </LinearGradient>
              </View>

              <View style={styles.statCard}>
                <LinearGradient
                  colors={['#8b5cf6', '#7c3aed']}
                  style={styles.statGradient}
                >
                  <Ionicons name="people" size={rem(32)} color="#fff" />
                  <Text style={styles.statLabel}>Total</Text>
                  <Text style={styles.statValue}>{students.length}</Text>
                </LinearGradient>
              </View>
            </View>
          </View>

          {/* Quick Actions Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flash" size={rem(20)} color="#4c669f" />
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>

            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#EEF2FF' }]}
                onPress={() => navigation.navigate('Attendance')}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#818CF8' }]}>
                  <Ionicons name="checkbox-outline" size={rem(26)} color="#fff" />
                </View>
                <Text style={styles.actionText}>Attendance</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#FEF3C7' }]}
                onPress={() => navigation.navigate('MyStudents')}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#F59E0B' }]}>
                  <Ionicons name="school-outline" size={rem(26)} color="#fff" />
                </View>
                <Text style={styles.actionText}>My Students</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#D1FAE5' }]}
                onPress={() => navigation.navigate('TeacherUploadResults')}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="cloud-upload-outline" size={rem(26)} color="#fff" />
                </View>
                <Text style={styles.actionText}>Upload Results</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#E0E7FF' }]}
                onPress={() => navigation.navigate('TeacherHomework')}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#6366F1' }]}>
                  <Ionicons name="book-outline" size={rem(26)} color="#fff" />
                </View>
                <Text style={styles.actionText}>Homework</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#FCE7F3' }]}
                onPress={() => navigation.navigate('OnlineTestCreate')}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#EC4899' }]}>
                  <Ionicons name="flask-outline" size={rem(26)} color="#fff" />
                </View>
                <Text style={styles.actionText}>Online Test</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#D1FAE5' }]}
                onPress={() => navigation.navigate('DiaryItem')}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#059669' }]}>
                  <Ionicons name="journal" size={rem(26)} color="#fff" />
                </View>
                <Text style={styles.actionText}>Diary</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#DBEAFE' }]}
                onPress={() => navigation.navigate('TeacherNotices')}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#3B82F6' }]}>
                  <Ionicons name="notifications-outline" size={rem(26)} color="#fff" />
                </View>
                <Text style={styles.actionText}>Notices</Text>
              </TouchableOpacity>
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
    backgroundColor: '#F3F4F6',
  },
  watermark: {
    position: 'absolute',
    width: rem(180),
    height: rem(240),
    opacity: 0.08,
    alignSelf: 'center',
    top: '50%',
    transform: [{ translateY: -rem(120) }],
    zIndex: 0,
  },
  gradientHeader: {
    paddingTop: rem(20),
    paddingBottom: rem(30),
    paddingHorizontal: rem(20),
    borderBottomLeftRadius: rem(30),
    borderBottomRightRadius: rem(30),
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rem(4) },
    shadowOpacity: 0.3,
    shadowRadius: rem(8),
  },
  headerContent: {
    alignItems: 'center',
  },
  headerIconContainer: {
    width: rem(56),
    height: rem(56),
    borderRadius: rem(28),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rem(12),
  },
  heading: {
    fontSize: rem(24),
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subHeading: {
    fontSize: rem(14),
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: rem(4),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: rem(16),
    color: '#6B7280',
    fontSize: rem(14),
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    paddingTop: rem(20),
    paddingBottom: rem(30),
    paddingHorizontal: rem(16),
  },
  attendanceCard: {
    backgroundColor: '#fff',
    borderRadius: rem(20),
    padding: rem(20),
    marginBottom: rem(20),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rem(2) },
    shadowOpacity: 0.1,
    shadowRadius: rem(8),
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rem(12),
  },
  dateNavButton: {
    width: rem(40),
    height: rem(40),
    borderRadius: rem(20),
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: rem(16),
    paddingVertical: rem(10),
    borderRadius: rem(12),
    gap: rem(8),
  },
  dateText: {
    fontSize: rem(15),
    fontWeight: '600',
    color: '#1F2937',
  },
  todayButton: {
    alignSelf: 'center',
    backgroundColor: '#4c669f',
    paddingHorizontal: rem(20),
    paddingVertical: rem(8),
    borderRadius: rem(20),
    marginBottom: rem(16),
  },
  todayButtonText: {
    color: '#fff',
    fontSize: rem(13),
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: rem(12),
  },
  statCard: {
    flex: 1,
    borderRadius: rem(16),
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rem(2) },
    shadowOpacity: 0.15,
    shadowRadius: rem(4),
  },
  statGradient: {
    padding: rem(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: rem(12),
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: rem(8),
  },
  statValue: {
    fontSize: rem(24),
    fontWeight: '800',
    color: '#fff',
    marginTop: rem(4),
  },
  sectionContainer: {
    marginBottom: rem(24),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rem(16),
    gap: rem(8),
  },
  sectionTitle: {
    fontSize: rem(18),
    fontWeight: '700',
    color: '#1F2937',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    borderRadius: rem(16),
    padding: rem(20),
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rem(2) },
    shadowOpacity: 0.08,
    shadowRadius: rem(4),
    marginBottom: rem(12),
  },
  actionIconContainer: {
    width: rem(56),
    height: rem(56),
    borderRadius: rem(28),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rem(12),
  },
  actionText: {
    fontSize: rem(13),
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
});

export default TeacherDashboard;