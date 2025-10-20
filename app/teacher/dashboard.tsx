import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import responsive, { rem } from '../utils/responsive';
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

const API_BASE_URL = 'https://1rzlgxk8-5001.inc1.devtunnels.ms/api';

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
          <Text style={styles.heading}>Teacher Dashboard</Text>
      </View>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#9daae4ff" />
          <Text style={{ marginTop: rem(12), color: '#cedcf7ff' }}>Loading dashboard...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >    
        {/* Date selector + Present / Absent Totals */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: rem(12), marginLeft: rem(4), flexWrap: 'wrap' }}>
              <TouchableOpacity onPress={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toISOString().split('T')[0]);
              }} style={{ padding: rem(8), marginRight: rem(8), backgroundColor: '#eef2ff', borderRadius: rem(8) }}>
                <Text style={{ color: '#4f46e5' }}>Prev</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelectedDate(new Date().toISOString().split('T')[0])} style={{ padding: rem(8), marginRight: rem(8), backgroundColor: '#fff', borderRadius: rem(8), borderWidth: 1, borderColor: '#e5e7eb' }}>
                <Text style={{ color: '#374151' }}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 1);
                setSelectedDate(d.toISOString().split('T')[0]);
              }} style={{ padding: rem(8), marginRight: rem(8), backgroundColor: '#eef2ff', borderRadius: rem(8) }}>
                <Text style={{ color: '#4f46e5' }}>Next</Text>
              </TouchableOpacity>
              <Text style={{ marginLeft: rem(8), color: '#6b7280' }}>{selectedDate}</Text>
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
          

          {/* Quick Actions Section */}
          <View style={styles.quickActionsSection}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('Attendance')}>
                <Ionicons name="checkbox-outline" size={rem(28)} color="#667eea" />
                <Text style={styles.quickActionText}>Take Attendance</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('MyStudents')}>
                <Ionicons name="school-outline" size={rem(28)} color="#f78316" />
                <Text style={styles.quickActionText}>My Students</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('TeacherUploadResults')}>
                <Ionicons name="cloud-upload-outline" size={rem(28)} color="#059669" />
                <Text style={styles.quickActionText}>Upload Results</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('TeacherHomework')}>
                <Ionicons name="book-outline" size={rem(28)} color="#9506d2" />
                <Text style={styles.quickActionText}>Homework</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('OnlineTestCreate')}>
                <Ionicons name="flask-outline" size={rem(28)} color="#f1d00f" />
                <Text style={styles.quickActionText}>Online Test</Text>
              </TouchableOpacity>
                            <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('DiaryItem')}>
                <Ionicons name="book" size={rem(28)} color="#71d293ff" />
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
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    overflow: 'hidden',
    marginBottom: 15,
    elevation: 4,
  },
  gradientHeader: {
    paddingHorizontal: rem(16),
    paddingTop: rem(28),
    paddingBottom: rem(20),
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: rem(15),
    fontWeight: '800',
    color: '#416b3aff',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: '#667eea99',
    textShadowOffset: { width: 0, height: rem(2) },
    textShadowRadius: rem(8),
  },
  // Content
  content: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    paddingBottom: rem(20),
  },
  // Stats Section
  statsSection: {
    padding: rem(16),
  },
  cardsRow: {
    flexDirection: 'row',
    gap: rem(12),
    flexWrap: 'wrap',
  },
  card: {
    flex: 1,
    borderRadius: rem(12),
    padding: rem(14),
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: rem(2),
  },
  cardShadow: {
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: rem(4) },
    shadowOpacity: 0.10,
    shadowRadius: rem(8),
    elevation: 4,
  },
  iconContainer: {
    width: rem(36),
    height: rem(36),
    borderRadius: rem(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rem(10),
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: rem(13),
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: rem(2),
  },
  cardValue: {
    fontSize: rem(20),
    fontWeight: '800',
    color: '#222',
  },
  // Quick Actions
  quickActionsSection: {
    marginHorizontal: rem(1),
    marginBottom: rem(15),
    backgroundColor: '#fff',
    borderRadius: rem(16),
    padding: rem(16),
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: rem(4) },
    shadowOpacity: 0.08,
    shadowRadius: rem(8),
    bottom: rem(-15),
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e9ecf3',
  },
  quickActionsTitle: {
    fontSize: rem(18),
    fontWeight: '700',
    color: '#403ae2',
    marginBottom: rem(10),
    textAlign: 'center',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: rem(10),
    flexWrap: 'wrap',
  },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f8f9fb',
    borderRadius: rem(12),
    paddingVertical: rem(14),
    marginHorizontal: rem(4),
    borderWidth: 1,
    borderColor: '#e9ecf3',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: rem(2) },
    shadowOpacity: 0.06,
    shadowRadius: rem(4),
    elevation: 2,
  },
  quickActionText: {
    fontSize: rem(13),
    color: '#222',
    fontWeight: '600',
    marginTop: rem(6),
    textAlign: 'center',
  },
  // Large Card
  largeCardContainer: {
    marginHorizontal: rem(16),
    marginBottom: rem(16),
    alignItems: 'center',
    zIndex: 1,
    marginTop: rem(40),
    height: rem(220),
  },
  largeCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: rem(18),
    padding: rem(20),
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: rem(8) },
    shadowOpacity: 0.12,
    shadowRadius: rem(16),
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e9ecf3',
  },
  largeCardIconWrap: {
    backgroundColor: '#e9ecf3',
    borderRadius: rem(32),
    padding: rem(16),
    marginBottom: rem(16),
  },
  largeCardTitle: {
    fontSize: rem(20),
    fontWeight: '700',
    color: '#403ae2',
    marginBottom: rem(10),
    textAlign: 'center',
  },
  watermark: {
    position: 'absolute',
    width: rem(150),
    bottom: rem(-1),
    height: rem(200),
    opacity: 0.5,
    alignSelf: 'center',
    top: Math.min(responsive.height * 0.6, rem(420)),
    transform: [{ rotate: '-0deg' }],
    zIndex: 0,
  },
  largeCardDesc: {
    fontSize: rem(15),
    color: '#374151',
    textAlign: 'center',
    lineHeight: rem(22),
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: rem(12),
    marginTop: rem(12),
    marginLeft: rem(4),
  },
  presentBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: rem(10),
    paddingVertical: rem(8),
    borderRadius: rem(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  absentBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: rem(10),
    paddingVertical: rem(8),
    borderRadius: rem(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalsLabel: {
    fontSize: rem(12),
    color: '#4b5563',
  },
  totalsValue: {
    fontSize: rem(16),
    fontWeight: '700',
    color: '#111827',
  },
});

export default TeacherDashboard;
