import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from '@expo/vector-icons';
import { useUser } from "./UserContext";
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';

interface LoginProps {
  setUser: (user: any) => void;
}

const Login = () => {
  const { setUser } = useUser();
  const navigation = useNavigation<any>();
  const [role, setUserType] = useState<"student" | "teacher" | "principal" | "parents">();
  const [formData, setFormData] = useState({
    LoguserID: "",
    password: "",
    date_of_birth: "",
  });
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Only allow valid role values
  const handleUserTypeChange = (text: string) => {
    const allowed = ["student", "teacher", "principal", "parents"];
    if (allowed.includes(text)) {
      setUserType(text as typeof role);
    }
  };

  const handleLogin = async () => {
    if (!formData.LoguserID || !formData.password) {
      Alert.alert("Error", "Please enter ID and password");
      return;
    }
    setLoading(true);

    const requestBody = {
      LoguserID: formData.LoguserID,
      password: formData.password, // Always use password field
      ...(role === "student" && { date_of_birth: formData.date_of_birth }), // Optionally send DOB if needed
    };

    const apiEndpoints = {
      student: "https://api.pbmpublicschool.in/api/auth/student/login",
      teacher: "https://api.pbmpublicschool.in/api/auth/teacher/login",
      principal: "https://api.pbmpublicschool.in/api/auth/principal/login",
      parents: "https://api.pbmpublicschool.in/api/auth/parents/login",
    };

    try {
      if (!role) {
        Alert.alert("Error", "Please select a user type.");
        setLoading(false);
        return;
      }
      const response = await fetch(apiEndpoints[role], {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        // Store token and user in AsyncStorage for all user types
        await AsyncStorage.setItem(`${role}_token`, data.token || "");
        await AsyncStorage.setItem(`${role}_user`, JSON.stringify(data.user));
        await AsyncStorage.setItem("user", JSON.stringify(data.user)); // Ensure context can reload user
        await AsyncStorage.setItem("role", JSON.stringify(role));
        await AsyncStorage.setItem("LoguserID", formData.LoguserID);

        if (role === "student" || role === "parents") {
          navigation.reset({
            index: 0,
            routes: [{ name: 'StudentDashboard' }],
          });
        } else if (role === "teacher") {
          navigation.reset({
            index: 0,
            routes: [{ name: 'TeacherDashboard' }],
          });
        } else if (role === "principal") {
          navigation.reset({
            index: 0,
            routes: [{ name: 'PrincipalDashboard' }],
          });
        }
        Alert.alert("Login Successful", "Welcome to EduManage!");
      } else {
        Alert.alert("Login Failed", data.error || "Invalid credentials");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Network Error", "Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#ffffff', '#f8f9fb', '#e9ecf3', '#dde1e7']}
        style={styles.gradientContainer}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Header Section */}
            <View style={styles.headerSection}>
              <View style={styles.logoContainer}>
                <View style={styles.logoBackground}>
                  {/* <Ionicons name="school" color="#667eea" size={40} /> */}
                  <Ionicons name="school-outline" color="#246a0dff" size={50} />
                </View>
              </View>
              <Text style={styles.welcomeText}>Welcome to</Text>
              <Text style={styles.appTitle}>P B M PUBLIC SCHOOL</Text>
              <Text style={styles.subtitle}>Khanimpur Khajani Road Gorakhpur</Text>
            </View>

            {/* Login Card */}
            <View style={styles.loginCard}>
              <Text style={styles.loginTitle}>Login</Text>

              {/* User Type Selection */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionLabel}>Select User Type</Text>
                <View style={styles.userTypeContainer}>
                  {['student', 'parents', 'teacher', 'principal'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.userTypeButton,
                        role === type && styles.userTypeButtonSelected,
                      ]}
                      onPress={() => setUserType(type as typeof role)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.userTypeContent}>
                        <Ionicons
                          name={
                            type === 'student' ? 'person' :
                              type === 'parents' ? 'people' :
                                type === 'teacher' ? 'school' :
                                  'business'
                          }
                          size={16}
                          color={role === type ? "#ecceceff" : "#666"}
                        />
                        <Text style={[
                          styles.userTypeButtonText,
                          role === type && styles.userTypeButtonTextSelected,
                        ]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Login ID Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Login ID</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Enter your ID"
                    placeholderTextColor="#999"
                    value={formData.LoguserID}
                    onChangeText={(text) => setFormData({ ...formData, LoguserID: text })}
                    style={styles.textInput}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Password/DOB Input */}
              {role === "student" ? (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Date of Birth</Text>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    style={styles.inputWrapper}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={20} color="#666" style={styles.inputIcon} />
                    <Text style={[
                      styles.textInput,
                      { color: formData.date_of_birth ? "#000" : "#999" }
                    ]}>
                      {formData.date_of_birth ? formData.date_of_birth : "Select Date of Birth"}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#666" />
                  </TouchableOpacity>
                  {(showDatePicker || Platform.OS === "web") && (
                    <DateTimePicker
                      value={
                        formData.date_of_birth
                          ? (() => {
                            const [dd, mm, yyyy] = formData.date_of_birth.split("-");
                            return new Date(`${yyyy}-${mm}-${dd}`);
                          })()
                          : new Date()
                      }
                      mode="date"
                      display="default"
                      maximumDate={new Date()}
                      onChange={(_, selectedDate) => {
                        if (Platform.OS !== "web") setShowDatePicker(false);
                        let dateObj = selectedDate;
                        if (Platform.OS === "web" && _) {
                          // @ts-ignore
                          dateObj = new Date(_.target.value);
                        }
                        if (dateObj) {
                          const yyyy = dateObj.getFullYear();
                          const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
                          const dd = String(dateObj.getDate()).padStart(2, "0");
                          const dobDDMMYYYY = `${dd}-${mm}-${yyyy}`;
                          setFormData({ ...formData, date_of_birth: dobDDMMYYYY, password: dobDDMMYYYY });
                        }
                      }}
                      style={Platform.OS === "web" ? { marginTop: 10 } : undefined}
                    />
                  )}
                </View>
              ) : (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      placeholder="Enter your password"
                      placeholderTextColor="#999"
                      value={formData.password}
                      secureTextEntry
                      onChangeText={(text) => setFormData({ ...formData, password: text })}
                      style={styles.textInput}
                    />
                  </View>
                </View>
              )}

              {/* Login Button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                style={[styles.loginButton, loading && { opacity: 0.7 }]}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.loginButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <View style={styles.buttonContent}>
                      <Ionicons name="log-in-outline" color="#fff" size={20} />
                      <Text style={styles.buttonText}>Sign In</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Forgot Password Link */}
              {role === "teacher" && (
                // <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
                //   <Text style={styles.forgotPassword}>Forgot Password?</Text>
                // </TouchableOpacity>
                <></>
              )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Secure • Reliable • Professional
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
};

export default Login;

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientContainer: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingTop: 40,
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
    fontWeight: '300',
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '300',
  },
  loginCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 30,
  },
  sectionContainer: {
    marginBottom: 25,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  userTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  userTypeButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70,
  },
  userTypeButtonSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  userTypeContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userTypeButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  userTypeButtonTextSelected: {
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '400',
  },
  loginButton: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPassword: {
    color: '#667eea',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingBottom: 50,
  },
  footerText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '300',
  },
});
