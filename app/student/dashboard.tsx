import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
          setSchoolId(studentData.schoolId?.toString() || studentData.user?.schools?.[0]?.id || "");
          setToken(tokenRaw);
        }
      } catch (e) {
        setError("Failed to load user data from storage");
      }
    };
    getUserData();
  }, []);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!studentId || !schoolId || !token) return;
      try {
        const response = await fetch(`https://api.pbmpublicschool.in/api/admission/students/${studentId}?schoolId=${schoolId}`, {
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
        const url = `https://api.pbmpublicschool.in/api/complaints/complaints/my/${studentId}`;
        const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data && res.data.success) {
          const sorted = Array.isArray(res.data.complaints) ? res.data.complaints.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];
          setComplaints(sorted);
        } else {
          setComplaints([]);
          setComplaintsError(res.data?.message || 'Failed to load complaints');
        }
      } catch (err: any) {
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {studentDetails?.studentName?.charAt(0).toUpperCase() || '👤'}
            </Text>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.welcomeText}>Welcome Back! 👋</Text>
            <Text style={styles.studentName}>
              {studentDetails?.studentName || 'Student'}
            </Text>
          </View>
        </View>
      </View>

      {/* Student Details Card */}
      {studentDetails && (
        <View style={styles.detailsCard}>
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsTitle}>📋 Student Information</Text>
          </View>
          <View style={styles.detailsGrid}>
            {Object.entries(studentDetails)
              .filter(([key]) => !['id', 'createdAt', 'updatedAt'].includes(key))
              .slice(0, 8)
              .map(([key, value]) => (
                <View key={key} style={styles.detailItem}>
                  <Text style={styles.detailLabel}>
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                  <Text style={styles.detailValue}>
                    {value === null || value === undefined ? '-' : typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </Text>
                </View>
              ))}
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {[
            { route: 'StudentNotices', icon: 'notifications-outline', label: 'Notices', color: '#8B5CF6', bg: '#F5F3FF' },
            { route: 'StudentResults', icon: 'document-text-outline', label: 'Results', color: '#F59E0B', bg: '#FEF3C7' },
            { route: 'OnlineTest', icon: 'laptop-outline', label: 'Tests', color: '#10B981', bg: '#D1FAE5' },
            { route: 'HomeWork', icon: 'book', label: 'Homework', color: '#3B82F6', bg: '#DBEAFE' },
            { route: 'StudentAttendanceCalendar', icon: 'calendar-outline', label: 'Attendance', color: '#EF4444', bg: '#FEE2E2' },
          ].map((item) => (
            <Pressable
              key={item.route}
              onPress={() => navigation.navigate(item.route as never)}
              style={({ pressed }) => [
                styles.quickActionCard,
                { backgroundColor: item.bg },
                pressed && styles.quickActionPressed,
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon as any} size={rem(24)} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Complaints Section */}
      <View style={styles.section}>
        <Complaints token={token} studentId={studentId} />
      </View>

      {/* Payment Section */}
      <View style={styles.section}>
        <View style={styles.paymentHeader}>
          <Text style={styles.sectionTitle}>💳 Payment Calendar</Text>
          <TouchableOpacity
            style={[styles.toggleButton, showPayments && styles.toggleButtonActive]}
            onPress={() => setShowPayments(s => !s)}
          >
            <Ionicons 
              name={showPayments ? 'eye-off-outline' : 'eye-outline'} 
              size={rem(18)} 
              color={showPayments ? '#FFFFFF' : '#6B7280'} 
            />
            <Text style={[styles.toggleButtonText, showPayments && styles.toggleButtonTextActive]}>
              {showPayments ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        </View>

        {showPayments && studentId && (
          <View style={styles.paymentContainer}>
            <PaymentCalendar 
              studentId={studentId} 
              apiBaseUrl={'https://api.pbmpublicschool.in/api'} 
              tokenKey={'student_token'} 
            />
          </View>
        )}
      </View>

      {/* Bottom Spacing for Navigation */}
      <View style={{ height: rem(100) }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  // Header Styles
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: rem(20),
    paddingVertical: rem(24),
    borderBottomLeftRadius: rem(24),
    borderBottomRightRadius: rem(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: rem(20),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: rem(60),
    height: rem(60),
    borderRadius: rem(30),
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rem(16),
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    fontSize: rem(28),
    fontWeight: '700',
    color: '#4F46E5',
  },
  headerTextContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: rem(14),
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: rem(4),
  },
  studentName: {
    fontSize: rem(22),
    fontWeight: '700',
    color: '#1F2937',
  },

  // Details Card
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: rem(16),
    marginHorizontal: rem(16),
    marginBottom: rem(20),
    padding: rem(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  detailsHeader: {
    marginBottom: rem(16),
    paddingBottom: rem(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailsTitle: {
    fontSize: rem(16),
    fontWeight: '700',
    color: '#1F2937',
  },
  detailsGrid: {
    gap: rem(12),
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: rem(8),
  },
  detailLabel: {
    fontSize: rem(13),
    color: '#6B7280',
    fontWeight: '600',
    flex: 1,
  },
  detailValue: {
    fontSize: rem(13),
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },

  // Section
  section: {
    marginBottom: rem(24),
    paddingHorizontal: rem(0),
  },
  sectionTitle: {
    fontSize: rem(18),
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: rem(16),
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rem(10),
  },
  quickActionCard: {
    width: (responsive.width - rem(52)) / 3,
    aspectRatio: 1,
    borderRadius: rem(16),
    padding: rem(12),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  quickActionPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  iconCircle: {
    width: rem(48),
    height: rem(48),
    borderRadius: rem(24),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rem(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionLabel: {
    fontSize: rem(11),
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },

  // Payment Section
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rem(16),
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(6),
    paddingHorizontal: rem(16),
    paddingVertical: rem(10),
    borderRadius: rem(12),
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleButtonActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  toggleButtonText: {
    fontSize: rem(14),
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
  paymentContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: rem(16),
    padding: rem(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // Legacy styles (kept for compatibility)
  title: {
    fontSize: rem(24),
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