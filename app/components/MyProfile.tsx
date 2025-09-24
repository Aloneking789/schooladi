import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from "../utils/getImageUrl";
import { useUser } from "../context/UserContext";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface UserProfile {
  fullName?: string;
  photo?: string;
  phone?: string;
  class?: string;
  section?: string;
  rollNumber?: string;
  address?: string;
  dateOfBirth?: string;
  joiningDate?: string;
}

const MyProfile: React.FC = () => {

  const { user: profile } = useUser();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [userDataFromStorage, setUserDataFromStorage] = useState<any>(null);

  useEffect(() => {
    if (profile) {
      setLoading(false);
      return;
    }
    // Only load from storage if context is empty
    const loadUser = async () => {
      try {
        const raw = await AsyncStorage.getItem("user");
        if (raw) setUserDataFromStorage(JSON.parse(raw));
      } catch (error) {
        Alert.alert("Error", "Failed to load user data.");
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [profile]);

  const userType: string | undefined = profile?.role || userDataFromStorage?.role;

  const userData: UserProfile = useMemo(() => {
    return (profile as UserProfile) ?? (userDataFromStorage as UserProfile) ?? {};
  }, [profile, userDataFromStorage]);
  const profileImage = userData.photo
    ? getImageUrl(userData.photo)
    : "https://cdn-icons-png.flaticon.com/512/7162/7162728.png";

  const handleLogout = async () => {
    try {
      const raw = await AsyncStorage.getItem("principal_user");
      const user = raw ? JSON.parse(raw) : {};
      const userType = user?.userType;

      switch (userType) {
        case "principal":
          await AsyncStorage.removeItem("principal_token");
          break;
        case "teacher":
          await AsyncStorage.removeItem("teacher_token");
          break;
        case "student":
          await AsyncStorage.removeItem("student_token");
          break;
        case "parents":
          await AsyncStorage.removeItem("parents_token");
          break;
      }

      await AsyncStorage.removeItem("user");
      navigation.navigate("Login");
    } catch (error) {
      Alert.alert("Logout Failed", "Something went wrong during logout.");
    }
  };

  const renderCommonField = (label: string, value: any) =>
    value ? (
      <Text style={styles.field}>
        <Text style={styles.label}>{label}: </Text>
        <Text>{value}</Text>
      </Text>
    ) : null;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Image source={{ uri: profileImage }} style={styles.image} />
        <Text style={styles.name}>{userData.fullName || "User"}</Text>
        <Text style={styles.subText}>{userType || "User"}</Text>
        {userData.phone && <Text style={styles.subText}>Phone: {userData.phone}</Text>}
      </View>

      <View style={styles.details}>
        {renderCommonField("Class", userData.class)}
        {renderCommonField("Section", userData.section)}
        {renderCommonField("Roll Number", userData.rollNumber)}
        {renderCommonField("Address", userData.address)}
        {renderCommonField(
          "Date of Birth",
          userData.dateOfBirth ? new Date(userData.dateOfBirth).toLocaleDateString() : undefined
        )}
        {renderCommonField(
          "Joined",
          userData.joiningDate ? new Date(userData.joiningDate).toLocaleDateString() : undefined
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out" color="#000" size={20} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f9f9f9",
    flexGrow: 1,
  },
  card: {
    alignItems: "center",
    marginBottom: 24,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 4,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  name: {
    fontWeight: "bold",
    fontSize: 18,
    color: "#000",
  },
  subText: {
    fontSize: 14,
    color: "#444",
    marginTop: 4,
  },
  details: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  field: {
    fontSize: 14,
    color: "#444",
    marginBottom: 8,
  },
  label: {
    fontWeight: "bold",
    color: "#000",
  },
  logoutButton: {
    marginTop: 30,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 8,
    backgroundColor: "#e5e5e5",
    padding: 10,
    borderRadius: 8,
  },
  logoutText: {
    fontWeight: "bold",
    color: "#000",
  },
});

export default MyProfile;
