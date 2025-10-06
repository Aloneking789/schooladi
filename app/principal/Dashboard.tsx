import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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
];

const extraSections = [
  { label: "Teacher ID Card", icon: "🪪", route: "teacherIDcard" },
];

import AsyncStorage from "@react-native-async-storage/async-storage";

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
            <Text style={styles.headerTitle}>Welcome Back, Principal</Text>
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

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          {/* First Row - Students and Teachers */}
          <View style={styles.statsRow}>
            <View style={[styles.statsCard, styles.studentCard]}>
              <View style={styles.statsIconContainer}>
                <Text style={styles.statsIcon}>👨‍🎓</Text>
              </View>
              <Text style={styles.statsTitle}>{studentStats.title}</Text>
              <Text style={styles.statsValue}>{studentStats.value}</Text>
              <Text style={styles.statsChange}>
                {studentStats.change}
              </Text>
            </View>

            <View style={[styles.statsCard, styles.teacherCard]}>
              <View style={styles.statsIconContainer}>
                <Text style={styles.statsIcon}>👩‍🏫</Text>
              </View>
              <Text style={[styles.statsTitle, { color: "#fff" }]}>
                {teacherStats.title}
              </Text>
              <Text style={[styles.statsValue, { color: "#fff" }]}>
                {teacherStats.value}
              </Text>
              <Text style={[styles.statsChange, { color: "#fff" }]}>
                {teacherStats.change}
              </Text>
            </View>
          </View>

          {/* Second Row - Parents */}
          <View style={styles.statsRowSingle}>
            <View style={[styles.statsCard, styles.parentsCard]}>
              <View style={styles.statsIconContainer}>
                <Text style={styles.statsIcon}>👨‍👩‍👧‍👦</Text>
              </View>
              <Text style={styles.statsTitle}>{parentsStats.title}</Text>
              <Text style={styles.statsValue}>{parentsStats.value}</Text>
            </View>
          </View>
        </View>

        {/* Extra Sections */}
        <View style={styles.extraSectionsRow}>
          {extraSections.map((section, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.extraSectionBtn}
              onPress={() => navigation.navigate(section.route as any)}
            >
              <Text style={styles.extraSectionIcon}>{section.icon}</Text>
              <Text style={styles.extraSectionLabel}>{section.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Charts */}
        <View style={styles.chartsContainer}>
          <Text style={styles.sectionTitle}>Analytics</Text>

          {/* First Row - Attendance */}
          <View style={styles.chartRow}>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Student Attendance</Text>
              <View style={styles.chartCircleBox}>
                <View style={styles.chartCircle}>
                  <Text style={styles.chartCircleText}>92%</Text>
                </View>
              </View>
              <Text style={styles.chartSubtitle}>
                Average Attendance
              </Text>
            </View>
          </View>

          {/* Second Row - Gender Distribution */}
          <View style={styles.chartRow}>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Gender Distribution</Text>
              <View style={styles.genderContainer}>
                <View style={styles.genderItem}>
                  <View style={styles.genderIconBox}>
                    <Text style={styles.genderIcon}>👦</Text>
                  </View>
                  <Text style={styles.genderLabel}>Boys</Text>
                  <Text style={styles.genderValue}>{genderData[0].value}</Text>
                </View>
                <View style={styles.genderDivider} />
                <View style={styles.genderItem}>
                  <View style={styles.genderIconBox}>
                    <Text style={styles.genderIcon}>👧</Text>
                  </View>
                  <Text style={styles.genderLabel}>Girls</Text>
                  <Text style={styles.genderValue}>{genderData[1].value}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Messages & Admissions */}
        <View style={styles.bottomRow}>
          <View style={styles.messagesCard}>
            <Text style={styles.cardTitle}>Messages</Text>
            {messagesLoading ? (
              <ActivityIndicator size="small" color="#000" style={{ marginVertical: 16 }} />
            ) : messages.length === 0 ? (
              <Text style={{ color: '#666', textAlign: 'center', marginVertical: 12 }}>No notices yet.</Text>
            ) : (
              messages.map((item, idx) => (
                <View style={styles.messageItem} key={idx}>
                  <View style={styles.avatar}>
                    <Text style={{ color: "#fff", fontSize: 14, fontWeight: 'bold' }}>
                      {item.sender
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.messageSender}>{item.sender}</Text>
                    <Text style={styles.messageText}>{item.message}</Text>
                    <Text style={styles.messageTime}>{item.time}</Text>
                    {item.unread && <View style={styles.unreadDot} />}
                  </View>
                </View>
              ))
            )}
          </View>
          <View style={styles.enquiriesCard}>
            <Text style={styles.cardTitle}>Admissions</Text>
            <TouchableOpacity
              style={styles.admissionsBtn}
              onPress={() => navigation.navigate('Admissions')}
            >
              {admissionsLoading ? (
                <ActivityIndicator size="small" color="#fff" style={{ marginVertical: 8 }} />
              ) : (
                <>
                  <Text style={styles.admissionsBtnText}>
                    Total Admissions: {admissionsCount}
                  </Text>
                  <Text style={styles.admissionsBtnSubText}>View All Admissions</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 16,
    paddingTop: 0,
  },

  // Header Styles
  headerBox: {

    marginVertical: 16,
    marginTop: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerGradient: {
    backgroundColor: '#000',
    padding: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e5e5e5',
    textAlign: 'center',
  },

  // Section Title
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
    color: '#000',
  },

  // Quick Actions
  quickActionsCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  quickActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  quickActionBtn: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  quickActionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionIcon: {
    fontSize: 24,
  },
  quickActionLabel: {
    fontSize: 13,
    textAlign: "center",
    fontWeight: '600',
    color: '#333',
    lineHeight: 18,
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
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 20,
    marginHorizontal: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  extraSectionIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  extraSectionLabel: {
    fontSize: 14,
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
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 6,
    alignItems: "center",
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    minHeight: 160,
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
    width: 180,

  },
  statsIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statsIcon: {
    fontSize: 24,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: '#666',
  },
  statsValue: {
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 4,
    color: '#000',
  },
  statsChange: {
    fontSize: 14,
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
    borderRadius: 20,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  chartCircleText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 28,
  },

  // Gender Distribution
  genderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  genderItem: {
    flex: 1,
    alignItems: 'center',
  },
  genderIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e5e5',
  },
  genderIcon: {
    fontSize: 28,
  },
  genderDivider: {
    width: 2,
    height: 60,
    backgroundColor: '#e5e5e5',
    marginHorizontal: 20,
  },
  genderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
    width: '100%',
  },
  genderBox: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 20,
    marginHorizontal: 8,
    elevation: 1,
  },
  genderLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  genderValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },

  // Bottom Row
  bottomRow: {
    flexDirection: "row",
    marginBottom: 24,
  },
  messagesCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginRight: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  enquiriesCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginLeft: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: '#000',
  },

  // Messages
  messageItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  messageSender: {
    fontWeight: "bold",
    fontSize: 14,
    color: '#000',
    marginBottom: 4,
  },
  messageText: {
    color: "#666",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  messageTime: {
    color: "#999",
    fontSize: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#000",
    position: 'absolute',
    top: 8,
    right: 8,
  },

  // Admissions
  admissionsBtn: {
    backgroundColor: '#000',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  admissionsBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 4,
  },
  admissionsBtnSubText: {
    color: '#e5e5e5',
    fontSize: 14,
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
