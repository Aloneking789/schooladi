import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import PaymentCalendar from '../components/PaymentCalendar';
import responsive, { rem } from "../utils/responsive";
import Complaints from './Complaints';

interface Result {
  id?: string;
  englishTheory?: number;
  hindiTheory?: number;
  mathematicsTheory?: number;
  mathPractical?: number;
  scienceTheory?: number;
  sciencePractical?: number;
  socialScience?: number;
}

interface Publication {
  examType: string;
  semester: string;
  remarks?: string;
  class?: {
    className: string;
  };
  results: Result[];
}

const StudentDashboard = () => {
  const [results, setResults] = useState<Publication[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [studentId, setStudentId] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [token, setToken] = useState("");
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [complaintsError, setComplaintsError] = useState<string | null>(null);
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [replyingComplaint, setReplyingComplaint] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [showPayments, setShowPayments] = useState(true);
  const navigation = useNavigation() as any;

  useEffect(() => {
    const getUserData = async () => {
      try {
        const userDataRaw = await AsyncStorage.getItem('student_user');
        const tokenRaw = await AsyncStorage.getItem('student_token');
        if (userDataRaw && tokenRaw) {
          const studentData = JSON.parse(userDataRaw);
          setStudentId(studentData.StudentId);
          console.log("Loaded student data:", studentData);
          setSchoolId(studentData.schoolId?.toString() || studentData.user?.schools?.[0]?.id || "");
          setToken(tokenRaw);
          console.log("Loaded token:", tokenRaw);
        }
      } catch (e) {
        setError("Failed to load user data from storage");
        console.error("Failed to load user data from storage", e);
      }
    };
    getUserData();
  }, []);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!studentId || !schoolId || !token) return;
      try {
        const response = await fetch(`https://1rzlgxk8-5001.inc1.devtunnels.ms/api/admission/students/${studentId}?schoolId=${schoolId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setStudentDetails(data.student);
      } catch (err) {
        setError("Failed to fetch student data.");
      }
    };

    const fetchComplaints = async () => {
      if (!token || !studentId) return;
      setLoadingComplaints(true);
      setComplaintsError(null);
      try {
        const url = `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/complaints/complaints/my/${studentId}`;
        const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data && res.data.success) {
          // most recent first
          const sorted = Array.isArray(res.data.complaints) ? res.data.complaints.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];
          setComplaints(sorted);
        } else {
          setComplaints([]);
          setComplaintsError(res.data?.message || 'Failed to load complaints');
        }
      } catch (err: any) {
        console.error('Failed to fetch complaints', err?.response || err);
        if (err?.response?.status === 404) setComplaintsError('Student not found');
        else setComplaintsError('Failed to load complaints');
      } finally {
        setLoadingComplaints(false);
      }
    };

    fetchStudentData();
    fetchComplaints();
  }, [studentId, schoolId, token]);

  const upcomingClasses = [
    { subject: "Mathematics", time: "09:00 AM", teacher: "Mr. Smith" },
    { subject: "Science", time: "10:30 AM", teacher: "Mrs. Johnson" },
    { subject: "English", time: "12:00 PM", teacher: "Ms. Davis" },
  ];


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Student Dashboard</Text>
      {studentDetails && (
        <View style={[styles.card, { backgroundColor: '#f3f4f6', marginBottom: rem(14), alignItems: 'flex-start' }]}>
          {Object.entries(studentDetails).map(([key, value]) => (
              <Text key={key} style={{ fontSize: rem(12), color: '#374151', marginBottom: rem(2) }}>
              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: {value === null || value === undefined ? '-' : typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </Text>
          ))}
        </View>
      )}
      {/* Quick Actions */}
      <View style={[styles.section, styles.quickActionsSectionContainer]}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('StudentNotices' as never)}>
            <Ionicons name="notifications-outline" size={rem(30)} color="#667eea" />
            <Text style={styles.quickActionText}></Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('StudentResults' as never)}>
              <Ionicons name="document-text-outline" size={rem(30)} color="#f78316" />
            <Text style={styles.quickActionText}></Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('OnlineTest' as never)}>
              <Ionicons name="laptop-outline" size={rem(30)} color="#059669" />
            <Text style={styles.quickActionText}></Text>
          </TouchableOpacity>
           <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('HomeWork' as never)}>
              <Ionicons name="book" size={rem(30)} color="#059669" />
            <Text style={styles.quickActionText}></Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('StudentAttendanceCalendar' as never)}>
              <Ionicons name="calendar-outline" size={rem(30)} color="#10b981" />
            <Text style={styles.quickActionText}></Text>
          </TouchableOpacity>
        </View>
      </View>

    


      <Complaints token={token} studentId={studentId} />

      {/* Payments toggle for student */}
      <View style={{ marginTop: rem(-30) }}>
        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: '#ecfdf5' }]}
          onPress={() => {
            setShowPayments(s => !s);
            console.log('Toggled payments, now showPayments =', !showPayments);
          }}
        >
          <Text style={[styles.quickActionText, { color: '#065f46' }]}>{showPayments ? 'Hide Payments' : 'Show Payments'}</Text>
        </TouchableOpacity>
      </View>

      {showPayments && studentId ? (
        <View style={{ marginTop: rem(12) }}>
          <PaymentCalendar studentId={studentId} apiBaseUrl={'https://1rzlgxk8-5001.inc1.devtunnels.ms/api'} tokenKey={'student_token'} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: rem(1),
    backgroundColor: '#fff',
  },
  title: {
    fontSize: rem(1),
    fontWeight: 'bold',
    marginBottom: rem(12),
    color: '#1f2937',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    padding: rem(12),
    borderRadius: 12,
    marginHorizontal: rem(4),
  },
  cardLabel: {
    fontSize: rem(14),
    color: '#374151',
    marginTop: rem(6),
  },
  cardValue: {
    fontSize: rem(22),
    fontWeight: 'bold',
    color: '#1f2937',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: rem(16),
    fontWeight: '600',
    marginBottom: rem(10),
    color: '#1f2937',
  },
  quickActionsSectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: rem(10),
    marginBottom: rem(12),
    borderWidth: 1,
    height: responsive.height * 0.18,
    borderColor: '#e9ecf3',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f8f9fb',
    borderRadius: 12,
    paddingVertical: rem(10),
    marginHorizontal: rem(6),
    borderWidth: 1,
    borderColor: '#e9ecf3',
  },
  quickActionText: {
    fontSize: rem(12),
    color: '#222',
    fontWeight: '600',
    marginTop: rem(6),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  listItem: {
    backgroundColor: '#f9fafb',
    padding: rem(10),
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listTitle: {
    fontWeight: '500',
    fontSize: rem(15),
    color: '#111827',
  },
  listSub: {
    fontSize: rem(12),
    color: '#6b7280',
  },
  time: {
    fontSize: rem(13),
    color: '#4b5563',
  },
  announcement: {
    borderLeftWidth: rem(4),
    borderLeftColor: '#3B82F6',
    paddingLeft: rem(10),
    marginBottom: rem(12),
  },
  date: {
    fontSize: rem(10),
    color: '#9ca3af',
  },
  error: {
    color: 'red',
  },
  resultBlock: {
    marginBottom: 16,
    padding: rem(12),
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  resultTitle: {
    fontWeight: 'bold',
    marginBottom: 6,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  complaintCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    height: responsive.height * 0.18,
    borderColor: '#e5e7eb',
    borderWidth: 1,
    padding: rem(10),
    marginBottom: rem(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  complaintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rem(8),
  },
  complaintTitle: {
    fontSize: rem(15),
    fontWeight: '700',
    color: '#111827',
  },
  complaintDesc: {
    color: '#374151',
    marginBottom: rem(8),
  },
  statusBadge: {
    paddingHorizontal: rem(8),
    paddingVertical: rem(4),
    borderRadius: 8,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
  },
  resolvedBadge: {
    backgroundColor: '#D1FAE5',
  },
  statusText: {
    fontSize: rem(12),
    fontWeight: '700',
    color: '#111827',
  },
  modalOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: rem(12),
  },
  modalContainer: {
    width: '100%',
    maxWidth: Math.min(responsive.width - rem(32), 720),
    backgroundColor: '#fff',
    borderRadius: rem(10),
    padding: rem(12),
  },
  modalTitle: {
    fontSize: rem(16),
    fontWeight: '700',
    marginBottom: rem(10),
    color: '#111827',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: rem(10),
    paddingVertical: rem(8),
    backgroundColor: '#fff',
    marginBottom: rem(8),
    color: '#111827',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: rem(8),
  },
  modalBtn: {
    paddingHorizontal: rem(12),
    paddingVertical: rem(8),
    borderRadius: rem(8),
    alignItems: 'center',
  },
});

export default StudentDashboard;
