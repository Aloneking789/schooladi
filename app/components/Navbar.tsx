import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// @ts-ignore: If type is missing, ignore for now
import { useUser } from "../UserContext";
import { getImageUrl } from "../utils/getImageUrl";

import { isSmallDevice, isVerySmallDevice, rem } from "../utils/responsive";

const Navbar: React.FC = () => {
  const navigation = useNavigation<any>();
  const { logout } = useUser();
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string>("");

  useEffect(() => {
    // Example: fetch school info from AsyncStorage or API
    const fetchSchool = async () => {
      const userRaw = await AsyncStorage.getItem("principal_user");
      const user = userRaw ? JSON.parse(userRaw) : null;
      const schoolNameFromUser =
        user?.principal_user?.schools?.[0]?.Schoolname ||
        user?.principal_user?.schools?.[0]?.schoolName ||
        user?.schools?.[0]?.Schoolname ||
        user?.schools?.[0]?.schoolName ||
        "";
      setSchoolName(schoolNameFromUser);
      // Optionally set logo
      // setSchoolLogo(...)
    };
    fetchSchool();
  }, []);

  // Handle logout with confirmation
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
    <LinearGradient
      colors={['#f8fafc', '#f1f5f9']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.navbar, isSmallDevice && styles.navbarMobile]}
    >
  <View style={[styles.left, isSmallDevice && styles.leftMobile]}>
        {schoolLogo && (
          <Image
            source={{ uri: getImageUrl(schoolLogo) }}
            style={[styles.logo, isSmallDevice && styles.logoMobile]}
            resizeMode="contain"
          />
        )}
        <Text
          style={[
            styles.title,
            isSmallDevice && styles.titleMobile,
          ]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {schoolName || "P B M Public School"}
        </Text>
      </View>
      <View style={[styles.right, isSmallDevice && styles.rightMobile]}>
        <TouchableOpacity style={[styles.iconButton, isSmallDevice && styles.iconButtonMobile]}>
          <Ionicons name="notifications" color="#000" size={isVerySmallDevice ? rem(16) : isSmallDevice ? rem(18) : rem(20)} />
          <View style={styles.badgeContainer}>
            <Text style={styles.badge}>3</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.iconButton, isSmallDevice && styles.iconButtonMobile]} onPress={() => navigation.navigate("MyProfile")}> 
          <Image
            source={{
              uri: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
            }}
            style={[styles.avatar, isSmallDevice && styles.avatarMobile]}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout} style={[styles.iconButton, styles.logoutBtn, isSmallDevice && styles.iconButtonMobile]}>
          <Ionicons name="log-out" color="#000" size={isVerySmallDevice ? rem(14) : isSmallDevice ? rem(16) : rem(18)} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  navbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: rem(8),
    paddingHorizontal: rem(12),
    backgroundColor: "#868c93ff",
    borderBottomWidth: 0,
    borderColor: "#d6dadfff",
    minHeight: rem(44),
    display: 'flex',
    flexWrap: 'nowrap',
    height: rem(64),
    width: '100%',
    alignSelf: 'center',
    borderTopLeftRadius: rem(12),
    borderTopRightRadius: rem(12),
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    margin: rem(6),
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  navbarMobile: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: rem(6),
    paddingHorizontal: rem(8),
    gap: rem(4),
    borderRadius: rem(10),
    margin: rem(4),
    marginBottom: 0,
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
    width: rem(40),
    height: rem(40),
    marginLeft: rem(10),
    borderRadius: rem(8),
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  logoMobile: {
    width: rem(30),
    height: rem(30),
    marginLeft: rem(6),
    borderRadius: rem(6),
  },
  title: {
    color: "#0f172a",
    marginLeft: rem(12),
    fontWeight: "bold",
    fontSize: rem(16),
    flex: 1,
    maxWidth: '60%',
    letterSpacing: 0.2,
  },
  titleMobile: {
    color: "#0f172a",
    fontWeight: "bold",
    fontSize: rem(14),
    marginLeft: rem(8),
    flex: 1,
    maxWidth: '55%',
    letterSpacing: 0.1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: rem(12),
    minWidth: rem(110),
  },
  rightMobile: {
    flexDirection: "row",
    alignItems: "center",
    gap: rem(8),
    minWidth: rem(90),
  },
  iconButton: {
    padding: rem(6),
    borderRadius: rem(8),
    backgroundColor: '#f1f5f9',
    marginHorizontal: rem(2),
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  iconButtonMobile: {
    padding: rem(4),
    minWidth: rem(34),
    minHeight: rem(34),
  },
  badgeContainer: {
    position: "absolute",
    top: -rem(4),
    right: -rem(4),
    backgroundColor: '#ef4444',
    borderRadius: rem(10),
    minWidth: rem(16),
    minHeight: rem(16),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rem(3),
    zIndex: 2,
    borderWidth: rem(1.5),
    borderColor: '#fff',
  },
  badge: {
    color: "#fff",
    fontSize: rem(10),
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: rem(1),
  },
  avatar: {
    width: rem(32),
    height: rem(32),
    borderRadius: rem(16),
    borderWidth: rem(1),
    borderColor: '#e5e7eb',
    marginHorizontal: rem(2),
  },
  avatarMobile: {
    width: rem(26),
    height: rem(26),
    borderRadius: rem(13),
    borderWidth: rem(1),
    borderColor: '#e5e7eb',
    marginHorizontal: rem(1),
  },
  logoutBtn: {
    marginLeft: rem(4),
    backgroundColor: '#fee2e2',
    borderRadius: rem(8),
    padding: rem(6),
  },
});

export default Navbar;
