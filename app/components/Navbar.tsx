import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// @ts-ignore: If type is missing, ignore for now
import { useUser } from "../UserContext";
import { getImageUrl } from "../utils/getImageUrl";

const { width } = Dimensions.get("window");
const isSmallScreen = width < 400;
const isVerySmallScreen = width < 350;

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
      style={[styles.navbar, isSmallScreen && styles.navbarMobile]}
    >
      <View style={[styles.left, isSmallScreen && styles.leftMobile]}>
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
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {schoolName || "P B M Public School"}
        </Text>
      </View>
      <View style={[styles.right, isSmallScreen && styles.rightMobile]}>
        <TouchableOpacity style={[styles.iconButton, isSmallScreen && styles.iconButtonMobile]}>
          <Ionicons name="notifications" color="#000" size={isVerySmallScreen ? 20 : isSmallScreen ? 22 : 26} />
          <View style={styles.badgeContainer}>
            <Text style={styles.badge}>3</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.iconButton, isSmallScreen && styles.iconButtonMobile]} onPress={() => navigation.navigate("MyProfile")}> 
          <Image
            source={{
              uri: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
            }}
            style={[styles.avatar, isSmallScreen && styles.avatarMobile]}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout} style={[styles.iconButton, styles.logoutBtn, isSmallScreen && styles.iconButtonMobile]}>
          <Ionicons name="log-out" color="#000" size={isVerySmallScreen ? 18 : isSmallScreen ? 20 : 24} />
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
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: "#868c93ff",
    borderBottomWidth: 0,
    borderColor: "#d6dadfff",
    minHeight: 50,
    display: 'flex',
    flexWrap: 'nowrap',
    height: 80,
    width: '100%',
    alignSelf: 'center',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    margin: 8,
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
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 4,
    borderRadius: 14,
    margin: 4,
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
    width: 40,
    height: 40,
    marginLeft: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  logoMobile: {
    width: 28,
    height: 28,
    marginLeft: 8,
    borderRadius: 6,
  },
  title: {
    color: "#0f172a",
    marginLeft: 16,
    fontWeight: "bold",
    fontSize: 16,
    flex: 1,
    maxWidth: '60%',
    letterSpacing: 0.2,
  },
  titleMobile: {
    color: "#0f172a",
    fontWeight: "bold",
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    maxWidth: '50%',
    letterSpacing: 0.1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    minWidth: 120,
  },
  rightMobile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 100,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 2,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  iconButtonMobile: {
    padding: 6,
    minWidth: 36,
    minHeight: 36,
  },
  badgeContainer: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    minHeight: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    zIndex: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badge: {
    color: "#fff",
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginHorizontal: 2,
  },
  avatarMobile: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginHorizontal: 1,
  },
  logoutBtn: {
    marginLeft: 4,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 8,
  },
});

export default Navbar;
