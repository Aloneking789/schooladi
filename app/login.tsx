import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useUser } from "./UserContext";
import responsive, { rem } from './utils/responsive';

interface LoginProps {
  setUser: (user: any) => void;
}

const Login = () => {
  const { setUser } = useUser();
  const navigation = useNavigation<any>();
  const [role, setUserType] = useState<"student" | "teacher" | "principal">();
  const [formData, setFormData] = useState({
    LoguserID: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Only allow valid role values
  const handleUserTypeChange = (text: string) => {
    const allowed = ["student", "teacher", "principal"];
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
      password: formData.password,
    };

    const apiEndpoints = {
      student: "https://api.pbmpublicschool.in/api/auth/student/login",
      teacher: "https://api.pbmpublicschool.in/api/auth/teacher/login",
      principal: "https://api.pbmpublicschool.in/api/auth/principal/login",
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

        if (role === "student") {
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
                  <Image source={require('../assets/images/pmblogo.jpg')} style={styles.logoImage} resizeMode="cover" />
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
                  {['student', 'teacher', 'principal'].map((type) => (
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

              {/* Password Input (all roles) */}
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
    paddingTop: rem(40),
    paddingHorizontal: rem(12),
    alignItems: 'center',
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: rem(40),
    paddingBottom: rem(30),
  },
  logoContainer: {
    marginBottom: rem(20),
  },
  logoBackground: {
    width: rem(80),
    height: rem(80),
    borderRadius: rem(40),
    backgroundColor: 'rgba(102, 126, 234, 0.09)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: rem(4) },
    shadowOpacity: 0.18,
    shadowRadius: rem(8),
    elevation: 8,
  },
  logoImage: {
    width: rem(60),
    height: rem(60),
    borderRadius: rem(30),
  },
  welcomeText: {
    fontSize: rem(16),
    color: '#666',
    marginBottom: rem(5),
    fontWeight: '300',
  },
  appTitle: {
    fontSize: rem(28),
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: rem(5),
  },
  subtitle: {
    fontSize: rem(14),
    color: '#666',
    fontWeight: '300',
  },
  loginCard: {
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: Math.min(responsive.width - rem(24), 600),
    borderRadius: rem(20),
    padding: rem(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rem(10) },
    shadowOpacity: 0.22,
    shadowRadius: rem(20),
    elevation: 12,
  },
  loginTitle: {
    fontSize: rem(22),
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: rem(18),
  },
  sectionContainer: {
    marginBottom: rem(20),
  },
  sectionLabel: {
    fontSize: rem(16),
    fontWeight: '600',
    color: '#333',
    marginBottom: rem(12),
  },
  userTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: rem(8),
  },
  userTypeButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: rem(12),
    borderWidth: 2,
    borderColor: '#e9ecef',
    paddingVertical: rem(12),
    paddingHorizontal: rem(8),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: rem(70),
  },
  userTypeButtonSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: rem(4) },
    shadowOpacity: 0.28,
    shadowRadius: rem(8),
    elevation: 10,
  },
  userTypeContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userTypeButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: rem(12),
    marginTop: rem(4),
    textAlign: 'center',
  },
  userTypeButtonTextSelected: {
    color: '#fff',
  },
  inputContainer: {
    marginBottom: rem(16),
  },
  inputLabel: {
    fontSize: rem(14),
    fontWeight: '600',
    color: '#333',
    marginBottom: rem(8),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: rem(12),
    borderWidth: 1,
    borderColor: '#e9ecef',
    paddingHorizontal: rem(16),
    paddingVertical: rem(12),
    minHeight: rem(48),
  },
  inputIcon: {
    marginRight: rem(12),
  },
  textInput: {
    flex: 1,
    fontSize: rem(16),
    color: '#333',
    fontWeight: '400',
  },
  loginButton: {
    marginTop: rem(12),
    borderRadius: rem(12),
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: rem(4) },
    shadowOpacity: 0.28,
    shadowRadius: rem(8),
    elevation: 10,
  },
  loginButtonGradient: {
    paddingVertical: rem(14),
    paddingHorizontal: rem(20),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: rem(50),
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rem(8),
  },
  buttonText: {
    color: '#fff',
    fontSize: rem(16),
    fontWeight: '600',
  },
  forgotPassword: {
    color: '#667eea',
    textAlign: 'center',
    marginTop: rem(20),
    fontSize: rem(14),
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: rem(30),
    paddingBottom: rem(50),
  },
  footerText: {
    color: '#999',
    fontSize: rem(12),
    fontWeight: '300',
  },
});
