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
          {name : "", path: "Complaints", iconName: "chatbubbles"},
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
      <LinearGradient
        colors={["#ab7aefcc", "#5b88e3cc", "#e9ecf3cc", "#7f90dd99", "#a758f799"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBg}
      >
        <BlurView intensity={40} tint="light" style={styles.blurBg}>
          <View style={styles.bottomBarContainer}>
            {items.map((item) => {
              const isActive = currentRoute === item.path;
              return (
                <Pressable
                  key={item.name}
                  onPress={() => handleTabPress(item)}
                  style={({ pressed }) => [
                    styles.tabItem,
                    isActive && styles.tabItemActive,
                    pressed ? { transform: [{ scale: 0.94 }], opacity: 0.9 } : {},
                  ]}
                >
                  <Ionicons name={item.iconName as any} size={rem(20)} color={isActive ? '#403ae2ff' : '#64748b'} />
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{item.name.replace('OnlineTest', 'Test')}</Text>
                </Pressable>
              );
            })}
          </View>
        </BlurView>
      </LinearGradient>
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
    elevation: 12,
    pointerEvents: 'box-none',
  },
  gradientBg: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
    paddingBottom: 0,
  },
  blurBg: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  bottomBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 1,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffffcc',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: '#f1f5f9',
  },
  tabLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#02050cff',
    fontWeight: '800',
  },
});

export default BottomBar;
