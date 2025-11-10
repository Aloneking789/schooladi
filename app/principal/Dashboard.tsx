import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Dimensions
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const quickActions = [
  { label: "Admissions", icon: "person-add", route: "Admissions", color: "#818CF8", bgColor: "#EEF2FF" },
  { label: "Send Notice", icon: "mail", route: "AddNotice", color: "#3B82F6", bgColor: "#DBEAFE" },
  { label: "Teacher Diary", icon: "journal", route: "TeacherDiary", color: "#8B5CF6", bgColor: "#E0E7FF" },
  { label: "Complaints", icon: "construct", route: "ComplaintsDispossle", color: "#EF4444", bgColor: "#FEE2E2" },
  { label: 'Online Tests', icon: 'clipboard', route: 'OnlineTestManage', color: "#EC4899", bgColor: "#FCE7F3" },
];

import AsyncStorage from "@react-native-async-storage/async-storage";
import { rem } from '../utils/responsive';
import { StackNavigationProp } from '@react-navigation/stack';
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
  TeacherDiary: undefined;
  ComplaintsDispossle: undefined;
  OnlineTestManage: undefined;
};

const Dashboard = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
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
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);

  useEffect(() => {
    hideStatusBar();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      hideStatusBar();
    }, [])
  );

  useEffect(() => {
    hideStatusBar();

    const fetchStats = async () => {
      try {
        const principal_token = await AsyncStorage.getItem("principal_token");
        const userRaw = await AsyncStorage.getItem("user");
        const user = userRaw ? JSON.parse(userRaw) : null;
        const schools = user?.user?.schools || user?.schools || [];
        const schoolId = schools[0]?.id || null;
        if (schoolId) {
          setAdmissionsLoading(true);
          const dashboardRes = await fetch(
            `https://api.pbmpublicschool.in/api/dashboard/${schoolId}`,
            { headers: { Authorization: `Bearer ${principal_token}` } }
          );
          const dashboardData = await dashboardRes.json();
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
          if (dashboardData?.genderData) {
            setGenderData(dashboardData.genderData);
          }
          if (dashboardData?.admissionsCount !== undefined) {
            setAdmissionsCount(dashboardData.admissionsCount);
          }
        }
      } catch (error) {
      } finally {
        setAdmissionsLoading(false);
        setLoading(false);
      }
    };
    fetchStats();

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

  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const toggleSidebar = () => setSidebarVisible((prev) => !prev);

  return (
    <>
      <StatusBar
        hidden={true}
        translucent={false}
        showHideTransition="fade"
      />
      <View style={styles.container}>
        {/* Enhanced Gradient Header */}
        <LinearGradient
          colors={['#4c669f', '#3b5998', '#192f6a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientHeader}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerIconContainer}>
              <Ionicons name="school" size={rem(32)} color="#fff" />
            </View>
            <Text style={styles.headerTitle}>Principal Dashboard</Text>
            <Text style={styles.headerSubtitle}>Manage your school at a glance</Text>
          </View>
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4c669f" />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Stats Overview */}
            <View style={styles.statsSection}>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <LinearGradient
                    colors={['#818CF8', '#6366F1']}
                    style={styles.statGradient}
                  >
                    <Ionicons name="people" size={rem(36)} color="#fff" />
                    <Text style={styles.statLabel}>Students</Text>
                    <Text style={styles.statValue}>{studentStats.value}</Text>
                  </LinearGradient>
                </View>

                <View style={styles.statCard}>
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.statGradient}
                  >
                    <Ionicons name="person" size={rem(36)} color="#fff" />
                    <Text style={styles.statLabel}>Teachers</Text>
                    <Text style={styles.statValue}>{teacherStats.value}</Text>
                  </LinearGradient>
                </View>
              </View>

              <View style={styles.statsRowSingle}>
                <View style={[styles.statCard, styles.statCardFull]}>
                  <LinearGradient
                    colors={['#8B5CF6', '#7C3AED']}
                    style={styles.statGradient}
                  >
                    <Ionicons name="home" size={rem(36)} color="#fff" />
                    <Text style={styles.statLabel}>Parents</Text>
                    <Text style={styles.statValue}>{parentsStats.value}</Text>
                  </LinearGradient>
                </View>
              </View>
            </View>

            {/* Gender Distribution */}
            <View style={styles.genderCard}>
              <View style={styles.genderHeader}>
                <Ionicons name="stats-chart" size={rem(20)} color="#4c669f" />
                <Text style={styles.genderTitle}>Gender Distribution</Text>
              </View>
              <View style={styles.genderStatsRow}>
                <View style={styles.genderStat}>
                  <View style={[styles.genderIconBox, { backgroundColor: '#DBEAFE' }]}>
                    <Ionicons name="male" size={rem(32)} color="#3B82F6" />
                  </View>
                  <Text style={styles.genderLabel}>Boys</Text>
                  <Text style={styles.genderValue}>{genderData[0]?.value || 0}</Text>
                </View>

                <View style={styles.genderDivider} />

                <View style={styles.genderStat}>
                  <View style={[styles.genderIconBox, { backgroundColor: '#FCE7F3' }]}>
                    <Ionicons name="female" size={rem(32)} color="#EC4899" />
                  </View>
                  <Text style={styles.genderLabel}>Girls</Text>
                  <Text style={styles.genderValue}>{genderData[1]?.value || 0}</Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="flash" size={rem(20)} color="#4c669f" />
                <Text style={styles.sectionTitle}>Quick Actions</Text>
              </View>

              <View style={styles.quickActionsGrid}>
                {quickActions.map((action, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.actionCard, { backgroundColor: action.bgColor }]}
                    onPress={() => navigation.navigate(action.route as any)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: action.color }]}>
                      <Ionicons name={action.icon as any} size={rem(26)} color="#fff" />
                    </View>
                    <Text style={styles.actionText}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Recent Enquiries */}
            {messages.length > 0 && (
              <View style={styles.enquiriesSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="chatbubbles" size={rem(20)} color="#4c669f" />
                  <Text style={styles.sectionTitle}>Recent Enquiries</Text>
                </View>

                {messagesLoading ? (
                  <ActivityIndicator size="small" color="#4c669f" />
                ) : (
                  messages.map((msg, idx) => (
                    <View key={idx} style={styles.enquiryCard}>
                      <View style={styles.enquiryIconBox}>
                        <Ionicons name="person-circle" size={rem(40)} color="#4c669f" />
                      </View>
                      <View style={styles.enquiryContent}>
                        <Text style={styles.enquirySender}>{msg.sender}</Text>
                        <Text style={styles.enquiryMessage} numberOfLines={2}>
                          {msg.message}
                        </Text>
                        <Text style={styles.enquiryTime}>{msg.time}</Text>
                      </View>
                      {msg.unread && <View style={styles.unreadBadge} />}
                    </View>
                  ))
                )}
              </View>
            )}

            {/* Admissions Count */}
            {admissionsCount > 0 && (
              <TouchableOpacity
                style={styles.admissionsCard}
                onPress={() => navigation.navigate('Admissions')}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.admissionsGradient}
                >
                  <Ionicons name="school" size={rem(40)} color="#fff" />
                  <Text style={styles.admissionsValue}>{admissionsCount}</Text>
                  <Text style={styles.admissionsLabel}>New Admissions</Text>
                  <View style={styles.admissionsArrow}>
                    <Ionicons name="arrow-forward" size={rem(20)} color="#fff" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
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
    width: rem(64),
    height: rem(64),
    borderRadius: rem(32),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rem(12),
  },
  headerTitle: {
    fontSize: rem(26),
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: rem(20),
    paddingBottom: rem(30),
    paddingHorizontal: rem(16),
  },
  statsSection: {
    marginBottom: rem(20),
  },
  statsRow: {
    flexDirection: 'row',
    gap: rem(12),
    marginBottom: rem(12),
  },
  statsRowSingle: {
    alignItems: 'center',
  },
  statCard: {
    flex: 1,
    borderRadius: rem(16),
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rem(2) },
    shadowOpacity: 0.15,
    shadowRadius: rem(6),
  },
  statCardFull: {
    width: '65%',
  },
  statGradient: {
    padding: rem(20),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: rem(140),
  },
  statLabel: {
    fontSize: rem(13),
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: rem(10),
  },
  statValue: {
    fontSize: rem(32),
    fontWeight: '800',
    color: '#fff',
    marginTop: rem(6),
  },
  genderCard: {
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
  genderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rem(20),
    gap: rem(8),
  },
  genderTitle: {
    fontSize: rem(18),
    fontWeight: '700',
    color: '#1F2937',
  },
  genderStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  genderStat: {
    alignItems: 'center',
    flex: 1,
  },
  genderIconBox: {
    width: rem(70),
    height: rem(70),
    borderRadius: rem(35),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rem(12),
  },
  genderDivider: {
    width: rem(2),
    height: rem(70),
    backgroundColor: '#E5E7EB',
    marginHorizontal: rem(20),
  },
  genderLabel: {
    fontSize: rem(14),
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: rem(6),
  },
  genderValue: {
    fontSize: rem(28),
    fontWeight: '800',
    color: '#1F2937',
  },
  quickActionsSection: {
    marginBottom: rem(20),
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
  enquiriesSection: {
    marginBottom: rem(20),
  },
  enquiryCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: rem(16),
    padding: rem(16),
    marginBottom: rem(12),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rem(1) },
    shadowOpacity: 0.08,
    shadowRadius: rem(4),
    alignItems: 'center',
    position: 'relative',
  },
  enquiryIconBox: {
    marginRight: rem(12),
  },
  enquiryContent: {
    flex: 1,
  },
  enquirySender: {
    fontSize: rem(15),
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: rem(4),
  },
  enquiryMessage: {
    fontSize: rem(13),
    color: '#6B7280',
    marginBottom: rem(4),
    lineHeight: rem(18),
  },
  enquiryTime: {
    fontSize: rem(11),
    color: '#9CA3AF',
  },
  unreadBadge: {
    width: rem(10),
    height: rem(10),
    borderRadius: rem(5),
    backgroundColor: '#EF4444',
    position: 'absolute',
    top: rem(16),
    right: rem(16),
  },
  admissionsCard: {
    borderRadius: rem(20),
    overflow: 'hidden',
    marginBottom: rem(20),
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rem(4) },
    shadowOpacity: 0.2,
    shadowRadius: rem(10),
  },
  admissionsGradient: {
    padding: rem(30),
    alignItems: 'center',
    position: 'relative',
  },
  admissionsValue: {
    fontSize: rem(48),
    fontWeight: '800',
    color: '#fff',
    marginTop: rem(12),
  },
  admissionsLabel: {
    fontSize: rem(16),
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: rem(8),
  },
  admissionsArrow: {
    position: 'absolute',
    right: rem(20),
    top: '50%',
    transform: [{ translateY: -rem(10) }],
  },
});

export default Dashboard;