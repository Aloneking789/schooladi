import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from "../utils/getImageUrl";
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useUser } from "../UserContext";

const { width } = Dimensions.get("window");
const isSmallScreen = width < 400;
const isVerySmallScreen = width < 350;

const Navbar: React.FC<{ toggleSidebar: () => void }> = ({ toggleSidebar }) => {
  const navigation = useNavigation<any>();
  const { logout } = useUser();
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string>("");

  useEffect(() => {
    const getSchoolInfo = async () => {
      try {
        const userRaw = await AsyncStorage.getItem("principal_user");
        const user = userRaw ? JSON.parse(userRaw) : null;
        const schoolId = user?.principal_user?.schools?.[0]?.id || user?.schools?.[0]?.id;
        const schoolNameFromUser =
          user?.principal_user?.schools?.[0]?.Schoolname ||
          user?.principal_user?.schools?.[0]?.schoolName ||
          user?.schools?.[0]?.Schoolname ||
          user?.schools?.[0]?.schoolName ||
          "";

        if (schoolId) {
          fetch(`https://api.pbmpublicschool.in/api/newSchool/school-assets/by-school/${schoolId}`)
            .then((res) => res.json())
            .then((data) => setSchoolLogo(data.schoolLogo || null))
            .catch(() => setSchoolLogo(null));

          fetch(`https://api.pbmpublicschool.in/api/newSchool/schools/${schoolId}`)
            .then((res) => res.json())
            .then((data) => setSchoolName(data.name || schoolNameFromUser))
            .catch(() => setSchoolName(schoolNameFromUser));
        }
      } catch {
        setSchoolLogo(null);
        setSchoolName("");
      }
    };
    getSchoolInfo();
  }, []);

  const toggleFullScreen = () => { };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.navbar, isSmallScreen && styles.navbarMobile]}>
      <View style={[styles.left, isSmallScreen && styles.leftMobile]}>
        <TouchableOpacity onPress={() => {
          toggleSidebar();
        }} style={styles.menuBtn}>
          <Ionicons name="menu" color="#000" size={isSmallScreen ? 20 : 24} />
        </TouchableOpacity>
        {schoolLogo && (
          <Image
            source={{ uri: getImageUrl(schoolLogo) }}
            style={[styles.logo, isSmallScreen && styles.logoMobile]}
            resizeMode="contain"
          />
        )}
        <Text
          style={[
            styles.title,
            isSmallScreen && styles.titleMobile,
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {schoolName || "School Management"}
        </Text>
      </View>
      <View style={[styles.right, isSmallScreen && styles.rightMobile]}>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="notifications" color="#000" size={isVerySmallScreen ? 18 : isSmallScreen ? 20 : 24} />
          <View style={styles.badgeContainer}>
            <Text style={styles.badge}>3</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate("MyProfile")}>
          <Image
            source={{
              uri: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
            }}
            style={[styles.avatar, isSmallScreen && styles.avatarMobile]}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout} style={[styles.iconButton, styles.logoutBtn]}>
          <Ionicons name="log-out" color="#000" size={isVerySmallScreen ? 16 : isSmallScreen ? 18 : 22} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 6,
    backgroundColor: "#fff",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  navbarMobile: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
    gap: 4,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  leftMobile: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logo: {
    width: 32,
    height: 32,
    marginLeft: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  logoMobile: {
    width: 24,
    height: 24,
    marginLeft: 6,
  },
  title: {
    color: "#000",
    marginLeft: 12,
    fontWeight: "bold",
    fontSize: 13,
    flex: 1,
    maxWidth: '60%',
  },
  titleMobile: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 11,
    marginLeft: 6,
    flex: 1,
    maxWidth: '50%',
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 120,
  },
  rightMobile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 100,
  },
  iconButton: {
    padding: 6,
    position: 'relative',
  },
  badgeContainer: {
    position: "absolute",
    top: -2,
    right: -2,
  },
  badge: {
    backgroundColor: "#000",
    color: "#fff",
    borderRadius: 8,
    paddingHorizontal: 4,
    fontSize: 10,
    fontWeight: 'bold',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarMobile: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  menuBtn: {
    padding: 8,
  },
  logoutBtn: {
    marginLeft: 4,
  },
});

export default Navbar;
