import React, { JSX, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../UserContext';

interface MenuItem {
  name: string;
  path?: string;
  icon: JSX.Element;
  subItems?: MenuItem[];
}

interface SidebarProps {
  isExpanded: boolean;
  toggleSidebar: () => void;
  userType: "principal" | "teacher" | "student" | "parents";
}

const Sidebar: React.FC<SidebarProps> = ({ isExpanded, toggleSidebar, userType }) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navigation = useNavigation();
  const { logout } = useUser();

  const toggleDropdown = (menu: string) => {
    setOpenDropdown(openDropdown === menu ? null : menu);
  };

  const handleLogout = async () => {
    await logout();
    navigation.navigate('Login' as never);
  };

  const menuItems = (): MenuItem[] => {
    switch (userType) {
      case "principal":
        return [
          { name: "Dashboard", path: "PrincipalDashboard", icon: <Ionicons name="home" size={24} /> },
          { name: "Promote", path: "promotion", icon: <Ionicons name="school" size={24} /> },
          { name: "DropBox", path: "dropbox", icon: <Ionicons name="trash" size={24} /> },
          { name: "Gallery", path: "SchoolGallary", icon: <Ionicons name="images" size={24} /> },
          {
            name: "Teachers", icon: <Ionicons name="people" size={24} />, subItems: [
              { name: "All Teachers", path: "ShowTeacher", icon: <Ionicons name="people" size={20} /> },
              { name: "Register Teacher", path: "TeacherOnboard", icon: <Ionicons name="person-add" size={20} /> },
              { name: "Teacher ID Card", path: "teacherIDcard", icon: <Ionicons name="document-text" size={20} /> },
            ]
          },
          {
            name: "Admissions", icon: <Ionicons name="school" size={24} />, subItems: [
              { name: "All Admissions", path: "Admissions", icon: <Ionicons name="people" size={20} /> },
              { name: "Register Student", path: "StudentOnboarding", icon: <Ionicons name="person-add" size={20} /> },
            ]
          },
          { name: "Fees Management", path: "FeeManagementSystem", icon: <Ionicons name="document-text" size={24} /> },
          { name: "Salary Management", path: "TeacherSalaryManagement", icon: <Ionicons name="card" size={24} /> },
          { name: "Enquiries", path: "EnquiryManagement", icon: <Ionicons name="notifications" size={24} /> },
          { name: "Notice Board", path: "AddNotice", icon: <Ionicons name="notifications" size={24} /> },
          {
            name: "Certificates", icon: <Ionicons name="document-text" size={24} />, subItems: [


              { name: "Transfer Certificate", path: "transferCertificate", icon: <Ionicons name="document" size={20} /> },
              { name: "Generate Id Card", path: "IDcard", icon: <Ionicons name="card" size={20} /> },
            ]
          },
        ];
      case "teacher":
        return [
          { name: "Dashboard", path: "TeacherDashboard", icon: <Ionicons name="home" size={24} /> },
          { name: "StudentAttendance", path: "Attendance", icon: <Ionicons name="list" size={24} /> },
          { name: "Teacher-Attendance", path: "TeacherAttendance", icon: <Ionicons name="person" size={24} /> },
          { name: "My Students", path: "MyStudents", icon: <Ionicons name="people" size={24} /> },
          { name: "My ID Card", path: "MyTeacherIDCard", icon: <Ionicons name="card" size={24} /> },
          { name: "Upload Marks", path: "TeacherUploadResults'", icon: <Ionicons name="cloud-upload" size={24} /> },
          { name: "Homework", path: "TeacherHomework", icon: <Ionicons name="book" size={24} /> },
        ];
      case "student":
        return [
          { name: "Dashboard", path: "StudentDashboard", icon: <Ionicons name="home" size={24} /> },
          { name: "Notices", path: "StudentNotices", icon: <Ionicons name="notifications" size={24} /> },
          { name: "Results", path: "StudentResults", icon: <Ionicons name="document-text" size={24} /> },
        ];
      default:
        return [
          { name: "No menu for userType: " + String(userType), icon: <Ionicons name="home" size={24} /> }
        ];
    }
  };

  const items = menuItems();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="apps" size={28} color="#000" />
        </View>
        {isExpanded && (
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>EduManage</Text>
            <Text style={styles.headerSubtitle}>School Panel</Text>
          </View>
        )}
      </View>

      {/* User Info */}
      {isExpanded && (
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {userType.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{userType.charAt(0).toUpperCase() + userType.slice(1)}</Text>
            <Text style={styles.userRole}>Administrator</Text>
          </View>
        </View>
      )}

      {/* Menu Items */}
      <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
        {items.map((item) => (
          <View key={item.name}>
            {item.subItems ? (
              <>
                <TouchableOpacity
                  onPress={() => toggleDropdown(item.name)}
                  style={[
                    styles.menuItem,
                    openDropdown === item.name && styles.menuItemActive
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIcon}>
                    {React.cloneElement(item.icon, {
                      size: 20,
                      color: openDropdown === item.name ? '#000' : '#666'
                    })}
                  </View>
                  {isExpanded && (
                    <>
                      <Text style={[
                        styles.menuText,
                        openDropdown === item.name && styles.menuTextActive
                      ]}>
                        {item.name}
                      </Text>
                      <View style={styles.chevron}>
                        <Ionicons
                          name="chevron-down"
                          size={16}
                          color={openDropdown === item.name ? '#000' : '#999'}
                          style={{
                            transform: [{
                              rotate: openDropdown === item.name ? '180deg' : '0deg'
                            }]
                          }}
                        />
                      </View>
                    </>
                  )}
                </TouchableOpacity>
                {openDropdown === item.name && isExpanded && (
                  <View style={styles.subMenuContainer}>
                    {item.subItems.map((subItem) => (
                      <TouchableOpacity
                        key={subItem.name}
                        onPress={() => {
                          if (subItem.path) navigation.navigate(subItem.path as never);
                          toggleSidebar();
                        }}
                        style={styles.subMenuItem}
                        activeOpacity={0.7}
                      >
                        <View style={styles.subMenuIcon}>
                          {React.cloneElement(subItem.icon, {
                            size: 16,
                            color: '#666'
                          })}
                        </View>
                        <Text style={styles.subMenuText}>{subItem.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  if (item.path) navigation.navigate(item.path as never);
                  toggleSidebar();
                }}
                style={styles.menuItem}
                activeOpacity={0.7}
              >
                <View style={styles.menuIcon}>
                  {React.cloneElement(item.icon, {
                    size: 20,
                    color: '#666'
                  })}
                </View>
                {isExpanded && (
                  <Text style={styles.menuText}>{item.name}</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Logout Button */}
      <TouchableOpacity
        onPress={handleLogout}
        style={styles.logoutButton}
        activeOpacity={0.7}
      >
        <View style={styles.menuIcon}>
          <Ionicons name="log-out" size={20} color="#ef4444" />
        </View>
        {isExpanded && (
          <Text style={styles.logoutText}>Logout</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    height: "100%",
    paddingVertical: 20,
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },

  // Header Styles
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },

  // User Info
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    color: '#666',
  },

  // Menu Styles
  menuContainer: {
    flex: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  menuItemActive: {
    backgroundColor: '#f5f5f5',
  },
  menuIcon: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginLeft: 8,
  },
  menuTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 'auto',
  },

  // Sub Menu Styles
  subMenuContainer: {
    marginLeft: 48,
    marginBottom: 8,
  },
  subMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 2,
    backgroundColor: '#f9f9f9',
  },
  subMenuIcon: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subMenuText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },

  // Logout Button
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingTop: 20,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ef4444',
    marginLeft: 8,
  },
});

export default Sidebar;
