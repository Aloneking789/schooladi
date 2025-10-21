import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

const quickActions = [
  { label: "Add Student", icon: "👤", route: "StudentOnboarding" },
  { label: "Add Teacher", icon: "🎓", route: "TeacherOnboard" },
  { label: "Admissions", icon: "📝", route: "Admissions" },
  { label: "Fees Management", icon: "💰", route: "FeeManagementSystem" },
  { label: "Salary Management", icon: "₹", route: "TeacherSalaryManagement" },
  { label: "Generate TC", icon: "🆔", route: "transferCertificate" },
  { label: "Send Notice", icon: "✉️", route: "AddNotice" },
  { label: "Teacher Diary", icon: "📔", route: "TeacherDiary" },
  { label: "Complaints", icon: "🛠️", route: "ComplaintsDispossle" },
  { label: 'Online Tests', icon: '📝', route: 'OnlineTestManage' },
];

const extraSections = [
  { label: "Teacher ID Card", icon: "🪪", route: "teacherIDcard" },
];

import AsyncStorage from "@react-native-async-storage/async-storage";
import { rem } from '../utils/responsive';

// Messages will be fetched from notices API

// Remove dummy admissionEnquiries, fetch real admissions count for dashboard

import { StackNavigationProp } from '@react-navigation/stack';
// import { Sidebar } from "lucide-react-native";
import { hideStatusBar } from "../utils/statusBarConfig";

type RootStackParamList = {
  StudentOnboarding: undefined;
  TeacherOnboard: undefined;
  Admissions: undefined;
  FeeManagementSystem: undefined;
  TeacherSalaryManagement: undefined;
  transferCertificate: undefined;
  AddNotice: undefined;
  UploadResult: undefined;
  teacherIDcard: undefined;
  // Add other routes here as needed
};


const Dashboard = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [studentStats, setStudentStats] = useState({
    title: "Students",
    value: "0",
    change: "+0",
    trend: "up",
  });
  const [teacherStats, setTeacherStats] = useState({
    title: "Teachers",
    value: "0",
    change: "-0",
    trend: "down",
  });
  // Removed presentTeacherStats state
  const [parentsStats, setParentsStats] = useState({
    title: "Parents",
    value: "0",
  });
  const [genderData, setGenderData] = useState([
    { name: "Boys", value: 0 },
    { name: "Girls", value: 0 },
  ]);
  const [admissionsCount, setAdmissionsCount] = useState(0);
  const [admissionsLoading, setAdmissionsLoading] = useState(true);
  // (Student Attendance chart removed per request)

  // Notices/messages state
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);

  // Force status bar to be hidden on component mount
  useEffect(() => {
    hideStatusBar();
  }, []);

  // Also hide status bar when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      hideStatusBar();
    }, [])
  );

  // Fetch stats from API if needed
  useEffect(() => {
    // Hide status bar
    hideStatusBar();

    // Fetch student, teacher, parents stats, and admissions count from API
    const fetchStats = async () => {
      try {
        const principal_token = await AsyncStorage.getItem("principal_token");
        const userRaw = await AsyncStorage.getItem("user");
        const user = userRaw ? JSON.parse(userRaw) : null;
        const schools = user?.user?.schools || user?.schools || [];
        const schoolId = schools[0]?.id || null;
        if (schoolId) {
          setAdmissionsLoading(true);
          // Fetch all dashboard stats in one call
          const dashboardRes = await fetch(
            `https://api.pbmpublicschool.in/api/dashboard/${schoolId}`,
            { headers: { Authorization: `Bearer ${principal_token}` } }
          );
          const dashboardData = await dashboardRes.json();
          // Set student, teacher, parent stats if available
          if (dashboardData?.stats) {
            const [studentData, teacherData, parentData] = dashboardData.stats;
            if (studentData?.count !== undefined) {
              setStudentStats((prev) => ({
                ...prev,
                value: studentData.count.toString(),
              }));
            }
            if (teacherData?.count !== undefined) {
              setTeacherStats((prev) => ({
                ...prev,
                value: teacherData.count.toString(),
              }));
            }
            if (parentData?.count !== undefined) {
              setParentsStats((prev) => ({
                ...prev,
                value: parentData.count.toString(),
              }));
            }
          }
          // Set gender data if available
          if (dashboardData?.genderData) {
            setGenderData(dashboardData.genderData);
          }
          // Set admissions count if available
          if (dashboardData?.admissionsCount !== undefined) {
            setAdmissionsCount(dashboardData.admissionsCount);
          }
        }
      } catch (error) {
        // Optionally handle error
      } finally {
        setAdmissionsLoading(false);
      }
    };
    fetchStats();

    // Fetch enquiry data for messages
    const fetchEnquiries = async () => {
      setMessagesLoading(true);
      try {
        const principal_token = await AsyncStorage.getItem("principal_token");
        const res = await fetch("https://api.pbmpublicschool.in/api/enquiry", {
          headers: {
            Authorization: `Bearer ${principal_token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await res.json();
        // Map enquiry data to messages format
        const mapped = (Array.isArray(data) ? data : []).slice(0, 5).map((enq: any) => ({
          sender: enq.name || "Unknown",
          message: `Class: ${enq.class || "N/A"}, Mobile: ${enq.mobile || "N/A"}`,
          time: new Date(enq.createdAt).toLocaleDateString(),
          unread: true,
        }));
        setMessages(mapped);
      } catch (err) {
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    };
    fetchEnquiries();
  }, []);



  // Sidebar state for expand/collapse
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const toggleSidebar = () => setSidebarVisible((prev) => !prev);

  return (
    <>
      <StatusBar
        hidden={true}
        translucent={false}
        showHideTransition="fade"
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerBox}>
          <View style={styles.headerGradient}>
            <Text style={styles.headerTitle}>Principal</Text>
            <Text style={styles.headerSubtitle}>Here's your school overview at a glance</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            {quickActions.map((action, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.quickActionBtn}
                onPress={() => navigation.navigate(action.route as any)}
                activeOpacity={0.8}
              >
                <View style={styles.quickActionIconContainer}>
                  <Text style={styles.quickActionIcon}>{action.icon}</Text>
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.chartsContainer}>
         
        </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingHorizontal: rem(16),
    paddingTop: 0,
  },

  // Header Styles
  headerBox: {
    marginVertical: rem(16),
    marginTop: rem(20),
    borderRadius: rem(20),
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#5cc766ff',
    shadowOffset: { width: 0, height: rem(2) },
    shadowOpacity: 0.1,
    shadowRadius: rem(8),
  },
  headerGradient: {
    backgroundColor: '#4fa834ff',
    padding: rem(24),
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: rem(26),
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: rem(8),
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: rem(16),
    color: '#e5e5e5',
    textAlign: 'center',
  },

  // Section Title
  sectionTitle: {
    fontSize: rem(22),
    fontWeight: "bold",
    marginBottom: rem(16),
    color: '#1e9031ff',
  },

  // Quick Actions
  quickActionsCard: {
    backgroundColor: '#fff',
    borderRadius: rem(20),
    padding: rem(20),
    marginBottom: rem(24),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rem(2) },
    shadowOpacity: 0.08,
    shadowRadius: rem(8),
  },
  quickActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  quickActionBtn: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: rem(16),
    alignItems: "center",
    paddingVertical: rem(16),
    paddingHorizontal: rem(8),
    marginBottom: rem(16),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rem(1) },
    shadowOpacity: 0.1,
    shadowRadius: rem(4),
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  quickActionIconContainer: {
    width: rem(56),
    height: rem(56),
    borderRadius: rem(28),
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rem(12),
  },
  quickActionIcon: {
    fontSize: rem(26),
  },
  quickActionLabel: {
    fontSize: rem(14),
    textAlign: "center",
    fontWeight: '600',
    color: '#333',
    lineHeight: rem(18),
  },

  // Extra Sections
  extraSectionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  extraSectionBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: rem(16),
    alignItems: 'center',
    paddingVertical: rem(16),
    marginHorizontal: rem(8),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rem(1) },
    shadowOpacity: 0.1,
    shadowRadius: rem(4),
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  extraSectionIcon: {
    fontSize: rem(32),
    marginBottom: rem(12),
  },
  extraSectionLabel: {
    fontSize: rem(14),
    textAlign: 'center',
    fontWeight: '600',
    color: '#333',
  },

  // Stats Cards
  statsContainer: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statsRowSingle: {
    alignItems: 'center',
  },
  statsCard: {
    flex: 1,
    borderRadius: rem(20),
    padding: rem(20),
    marginHorizontal: rem(6),
    alignItems: "center",
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rem(2) },
    shadowOpacity: 0.1,
    shadowRadius: rem(8),
    minHeight: rem(160),
  },
  studentCard: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#000',
  },
  teacherCard: {
    backgroundColor: '#000',
  },
  parentsCard: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#000',
    maxWidth: '60%',
    width: rem(180),
  },
  statsIconContainer: {
    width: rem(64),
    height: rem(64),
    borderRadius: rem(32),
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rem(12),
  },
  statsIcon: {
    fontSize: rem(28),
  },
  statsTitle: {
    fontSize: rem(16),
    fontWeight: "600",
    marginBottom: rem(8),
    color: '#666',
  },
  statsValue: {
    fontSize: rem(36),
    fontWeight: "bold",
    marginBottom: rem(4),
    color: '#000',
  },
  statsChange: {
    fontSize: rem(14),
    fontWeight: "600",
    color: '#000',
  },

  // Charts
  chartsContainer: {
    marginBottom: 24,
  },
  chartRow: {
    marginBottom: 16,
  },
  chartsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: rem(20),
    padding: rem(20),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rem(2) },
    shadowOpacity: 0.1,
    shadowRadius: rem(8),
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: rem(18),
    fontWeight: "bold",
    marginBottom: rem(16),
    color: '#000',
    textAlign: 'center',
  },
  chartSubtitle: {
    textAlign: "center",
    color: "#666",
    marginTop: 8,
    fontSize: 14,
  },
  chartCircleBox: {
    alignItems: 'center',
    marginVertical: 20,
  },
  chartCircle: {
    width: rem(100),
    height: rem(100),
    borderRadius: rem(50),
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rem(4) },
    shadowOpacity: 0.3,
    shadowRadius: rem(8),
  },
  chartCircleText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: rem(28),
  },

  // Gender Distribution
  genderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: rem(20),
    paddingHorizontal: rem(20),
  },
  genderItem: {
    flex: 1,
    alignItems: 'center',
  },
  genderIconBox: {
    width: rem(60),
    height: rem(60),
    borderRadius: rem(30),
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rem(12),
    borderWidth: 2,
    borderColor: '#e5e5e5',
  },
  genderIcon: {
    fontSize: rem(28),
  },
  genderDivider: {
    width: rem(2),
    height: rem(60),
    backgroundColor: '#e5e5e5',
    marginHorizontal: rem(20),
  },
  genderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: rem(20),
    width: '100%',
  },
  genderBox: {
    flex: 1,
    borderRadius: rem(16),
    alignItems: 'center',
    paddingVertical: rem(20),
    marginHorizontal: rem(8),
    elevation: 1,
  },
  genderLabel: {
    fontSize: rem(16),
    color: '#666',
    marginBottom: rem(8),
    fontWeight: '600',
  },
  genderValue: {
    fontSize: rem(28),
    fontWeight: 'bold',
    color: '#000',
  },

  // Bottom Row
  bottomRow: {
    flexDirection: "row",
    marginBottom: rem(24),
  },
  messagesCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: rem(20),
    padding: rem(20),
    marginRight: rem(12),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rem(2) },
    shadowOpacity: 0.1,
    shadowRadius: rem(8),
  },
  enquiriesCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: rem(20),
    padding: rem(20),
    marginLeft: rem(12),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rem(2) },
    shadowOpacity: 0.1,
    shadowRadius: rem(8),
  },
  cardTitle: {
    fontSize: rem(18),
    fontWeight: "bold",
    marginBottom: rem(16),
    color: '#000',
  },

  // Messages
  messageItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: rem(16),
    padding: rem(12),
    backgroundColor: '#f8f9fa',
    borderRadius: rem(12),
  },
  avatar: {
    width: rem(40),
    height: rem(40),
    borderRadius: rem(20),
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    marginRight: rem(12),
  },
  messageSender: {
    fontWeight: "bold",
    fontSize: rem(14),
    color: '#000',
    marginBottom: rem(4),
  },
  messageText: {
    color: "#666",
    fontSize: rem(13),
    lineHeight: rem(18),
    marginBottom: rem(4),
  },
  messageTime: {
    color: "#999",
    fontSize: rem(12),
  },
  unreadDot: {
    width: rem(8),
    height: rem(8),
    borderRadius: rem(4),
    backgroundColor: "#000",
    position: 'absolute',
    top: rem(8),
    right: rem(8),
  },

  // Admissions
  admissionsBtn: {
    backgroundColor: '#479f4dff',
    borderRadius: rem(16),
    paddingVertical: rem(16),
    paddingHorizontal: rem(16),
    alignItems: 'center',
    marginTop: rem(12),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rem(4) },
    shadowOpacity: 0.3,
    shadowRadius: rem(8),
  },
  admissionsBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: rem(18),
    marginBottom: rem(4),
  },
  admissionsBtnSubText: {
    color: '#e5e5e5',
    fontSize: rem(14),
  },

  // Unused styles kept for compatibility
  enquiryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  enquiryIndex: {
    fontWeight: "bold",
    fontSize: 15,
    marginRight: 8,
  },
  enquiryName: {
    fontWeight: "bold",
    fontSize: 14,
  },
  enquiryDetail: {
    color: "#444",
    fontSize: 13,
  },
});

export default Dashboard;
