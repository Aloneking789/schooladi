import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from "@react-navigation/native";
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useUser } from '../UserContext';
import { rem } from '../utils/responsive';

interface MenuItem {
  name: string;
  path?: string;
  iconName: string;
}

interface BottomBarProps {
  userType: "principal" | "teacher" | "student" | "parents";
}

const BottomBar: React.FC<BottomBarProps> = ({ userType }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const { logout } = useUser();

  // Only top-level menu items for bottom bar
  const menuItems = (): MenuItem[] => {
    switch (userType) {
      case "principal":
        return [
          { name: "", path: "AddNotice", iconName: "notifications" },
          { name: "", path: "PrincipalDashboard", iconName: "home" },
          { name: "", path: "Admissions", iconName: "people" },
          { name: "", path: "AttendanceAll", iconName: "book" },
        ];
      case "teacher":
        return [
          { name: "", path: "Attendance", iconName: "book" },
          { name: "", path: "MyStudents", iconName: "people" },
          { name: "", path: "TeacherDashboard", iconName: "home" },
          { name: "", path: "OnlineTestCreate", iconName: "laptop" },
          { name: "", path: "TeacherAttendance", iconName: "book" },
        ];
      case "student":
        return [
          { name: "", path: "StudentNotices", iconName: "notifications" },
          { name: "", path: "StudentResults", iconName: "document-text" },
          { name: "", path: "StudentDashboard", iconName: "home" },
          { name: "", path: "OnlineTest", iconName: "laptop" },
          { name: "", path: "Complaints", iconName: "chatbubbles" },
        ];
      default:
        return [
          { name: "Home", path: "Home", iconName: "home" }
        ];
    }
  };

  const items = menuItems();

  const handleTabPress = async (item: MenuItem) => {
    if (item.name === 'Logout') {
      await logout();
      navigation.navigate('Login' as never);
    } else if (item.path) {
      navigation.navigate(item.path as never);
    }
  };

  // Get current route name for highlighting
  const currentRoute = (route as any)?.name;

  return (
    <View style={styles.bottomBarWrapper} pointerEvents="box-none">
      <View style={styles.shadowContainer}>
        <LinearGradient
          colors={["#FFFFFF", "#F8FAFC", "#FFFFFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientBg}
        >
          <BlurView intensity={80} tint="light" style={styles.blurBg}>
            <View style={styles.topIndicator} />
            <View style={styles.bottomBarContainer}>
              {items.map((item) => {
                const isActive = currentRoute === item.path;
                return (
                  <Pressable
                    key={item.name || item.path}
                    onPress={() => handleTabPress(item)}
                    style={({ pressed }) => [
                      styles.tabItem,
                      pressed && styles.tabItemPressed,
                    ]}
                  >
                    <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
                      <Ionicons 
                        name={item.iconName as any} 
                        size={rem(24)} 
                        color={isActive ? '#FFFFFF' : '#64748B'} 
                      />
                      {isActive && <View style={styles.activeDot} />}
                    </View>
                    {item.name && (
                      <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                        {item.name.replace('OnlineTest', 'Test')}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </BlurView>
        </LinearGradient>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    pointerEvents: 'box-none',
  },
  shadowContainer: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  gradientBg: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  blurBg: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: 'hidden',
  },
  topIndicator: {
    width: 48,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  bottomBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 0,
    paddingHorizontal: 12,
    paddingBottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.5)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 16,
    position: 'relative',
  },
  tabItemPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  iconContainerActive: {
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    transform: [{ scale: 1.05 }],
  },
  activeDot: {
    position: 'absolute',
    bottom: -4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  tabLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 6,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: '#1E293B',
    fontWeight: '700',
  },
});

export default BottomBar;