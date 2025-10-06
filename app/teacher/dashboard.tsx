import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
        // Fetch students for this school and filter by classId
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
        } else {
          setStudents([]);
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
        } else {
          setAttendanceHistory([]);
        }

        // present/absent totals are fetched separately based on selectedDate

        // Calculate attendance percentage for each student
        const attendanceCount: { [studentId: string]: number } = {};
        const presentCount: { [studentId: string]: number } = {};
        history.forEach((record: AttendanceRecord) => {
          if (!attendanceCount[record.studentId]) attendanceCount[record.studentId] = 0;
          attendanceCount[record.studentId]++;
          if (record.status === 'absent') {
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
        setStudents([]);
        setAttendanceHistory([]);
        setGoodStudents([]);
      }
      setLoading(false);
    };
    fetchStudentsAndAttendance();
  }, [schoolId, classId, token]);

  // Fetch present/absent totals for selected date
  useEffect(() => {
    const fetchCounts = async () => {
      if (!classId || !schoolId || !token) return;
      try {
        const res = await axios.get(`${API_BASE_URL}/attendance/by-date-class`, {
          params: {
            date: new Date(selectedDate).toISOString(),
            classId,
            schoolId,
          },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data && res.data.success) {
          const todays: AttendanceRecord[] = res.data.data || [];
          const presentCount = todays.filter((r) => String(r.status).toLowerCase() === 'present').length;
          const totalStudents = students.length;
          setPresentTotal(presentCount);
          setAbsentTotal(Math.max(0, totalStudents - presentCount));
        } else {
          setPresentTotal(null);
          setAbsentTotal(null);
        }
      } catch (e) {
        console.warn('Failed to fetch counts for selected date', e);
        setPresentTotal(null);
        setAbsentTotal(null);
      }
    };
    fetchCounts();
  }, [selectedDate, classId, schoolId, token, students]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Watermark background */}
      {/* Gradient Header */}
      <View style={styles.gradientHeaderWrap}>
        <LinearGradient
          colors={["#ab7aefcc", "#5b88e3cc", "#e9ecf3cc", "#7f90dd99", "#a758f799"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientHeader}
        >
          <Text style={styles.heading}>Teacher Dashboard</Text>
        </LinearGradient>
      </View>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#9daae4ff" />
          <Text style={{ marginTop: 12, color: '#cedcf7ff' }}>Loading dashboard...</Text>
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
              <View style={[styles.card, styles.cardShadow, { backgroundColor: '#e9ecf3' }]}> 
                <View style={[styles.iconContainer, { backgroundColor: '#667eea' }]}> 
                  <Ionicons name="people" size={20} color="#fff" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>Total Students</Text>
                  <Text style={styles.cardValue}>{Array.isArray(students) ? students.length : 0}</Text>
                </View>
              </View>
              <View style={[styles.card, styles.cardShadow, { backgroundColor: '#f1d00f22' }]}> 
                <View style={[styles.iconContainer, { backgroundColor: '#f1d00f' }]}> 
                  <Ionicons name="checkmark-done" size={20} color="#fff" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>Good Students</Text>
                  <Text style={styles.cardValue}>{Array.isArray(goodStudents) ? goodStudents.length : 0}</Text>
                </View>
              </View>
              <View style={[styles.card, styles.cardShadow, { backgroundColor: '#c3f0ca' }]}> 
                <View style={[styles.iconContainer, { backgroundColor: '#059669' }]}> 
                  <Ionicons name="calendar" size={20} color="#fff" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>Attendance Records</Text>
                  <Text style={styles.cardValue}>{Array.isArray(attendanceHistory) ? attendanceHistory.length : 0}</Text>
                </View>
              </View>
            </View>
            {/* Date selector + Present / Absent Totals */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginLeft: 4 }}>
              <TouchableOpacity onPress={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toISOString().split('T')[0]);
              }} style={{ padding: 8, marginRight: 8, backgroundColor: '#eef2ff', borderRadius: 8 }}>
                <Text style={{ color: '#4f46e5' }}>Prev</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelectedDate(new Date().toISOString().split('T')[0])} style={{ padding: 8, marginRight: 8, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' }}>
                <Text style={{ color: '#374151' }}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 1);
                setSelectedDate(d.toISOString().split('T')[0]);
              }} style={{ padding: 8, marginRight: 8, backgroundColor: '#eef2ff', borderRadius: 8 }}>
                <Text style={{ color: '#4f46e5' }}>Next</Text>
              </TouchableOpacity>
              <Text style={{ marginLeft: 8, color: '#6b7280' }}>{selectedDate}</Text>
            </View>

            <View style={styles.totalsRow}>
              <View style={styles.presentBadge}>
                <Text style={styles.totalsLabel}>Present</Text>
                <Text style={styles.totalsValue}>{presentTotal === null ? '-' : presentTotal}</Text>
              </View>
              <View style={styles.absentBadge}>
                <Text style={styles.totalsLabel}>Absent</Text>
                <Text style={styles.totalsValue}>{absentTotal === null ? '-' : absentTotal}</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions Section */}
          <View style={styles.quickActionsSection}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('Attendance')}>
                <Ionicons name="checkbox-outline" size={28} color="#667eea" />
                <Text style={styles.quickActionText}>Take Attendance</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('MyStudents')}>
                <Ionicons name="school-outline" size={28} color="#f78316" />
                <Text style={styles.quickActionText}>My Students</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('TeacherUploadResults')}>
                <Ionicons name="cloud-upload-outline" size={28} color="#059669" />
                <Text style={styles.quickActionText}>Upload Results</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('TeacherHomework')}>
                <Ionicons name="book-outline" size={28} color="#9506d2" />
                <Text style={styles.quickActionText}>Homework</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('OnlineTestCreate')}>
                <Ionicons name="flask-outline" size={28} color="#f1d00f" />
                <Text style={styles.quickActionText}>Online Test</Text>
              </TouchableOpacity>
                            <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('DiaryItem')}>
                <Ionicons name="book" size={28} color="#71d293ff" />
                <Text style={styles.quickActionText}>Teacher Diary</Text>
              </TouchableOpacity>
              <View style={[styles.quickActionBtn, { opacity: 0 }]}/>
            </View>
          </View>

          {/* Large modern card for info */}
          {/* <View style={styles.largeCardContainer}> */}
            {/* <View style={styles.largeCard}> */}
                <Image
        source={require('../../assets/images/pmblogo.jpg')}
        style={styles.watermark}
        resizeMode="contain"
        accessible={false}
      />
              {/* <Text style={styles.largeCardIconWrap}>
                <Ionicons name="book" size={15} color="#2941a9ff" />
              </Text>
              <Text style={styles.largeCardTitle}>Welcome!</Text>
              <Text style={styles.largeCardDesc}>
                Access your most important features quickly: take attendance, view students, upload marks, and more. Use the bottom navigation for fast access.
              </Text> */}
            {/* </View>
          </View> */}
          {/* End content */}
          {/* ...existing code... */}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    position: 'relative',
  },
  // Gradient Header
  gradientHeaderWrap: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    marginBottom: 8,
    elevation: 4,
  },
  gradientHeader: {
    paddingHorizontal: 16,
    paddingTop: 36,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: '#667eea99',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  // Content
  content: {
    flex: 1,
    zIndex: 1,
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
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  cardShadow: {
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#222',
  },
  // Quick Actions
  quickActionsSection: {
    marginHorizontal: 16,
    marginBottom: 18,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e9ecf3',
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#403ae2',
    marginBottom: 10,
    textAlign: 'center',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f8f9fb',
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e9ecf3',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 13,
    color: '#222',
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  // Large Card
  largeCardContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
    zIndex: 1,
    marginTop: 50,
    height: 220,
  },
  largeCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e9ecf3',
  },
  largeCardIconWrap: {
    backgroundColor: '#e9ecf3',
    borderRadius: 32,
    padding: 18,
    marginBottom: 16,
  },
  largeCardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#403ae2',
    marginBottom: 10,
    textAlign: 'center',
  },
  watermark: {
    position: 'absolute',
    width: 150,
    height: 200,
    opacity: 0.5,
    alignSelf: 'center',
    top: 488,
    transform: [{ rotate: '-0deg' }],
    zIndex: 0,
  },
  largeCardDesc: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 12,
    marginTop: 12,
    marginLeft: 4,
  },
  presentBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  absentBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalsLabel: {
    fontSize: 12,
    color: '#4b5563',
  },
  totalsValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
});

export default TeacherDashboard;
