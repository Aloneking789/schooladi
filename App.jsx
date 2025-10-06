import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

// Screens
import Login from './app/login';
import StudentDashboard from './app/student/dashboard';
import StudentResults from './app/student/Results';
import ShowNotice from './app/student/ShowNotice';

import TeacherDashboard from './app/teacher/dashboard';
// import TeacherAttendance from './app/teacher/TeacherAttendance';
import MyStudents from './app/teacher/MyStudents';
import TeacherSelfAttendance from './app/teacher/TeacherAttendance'; // <-- Add this import

import LandingPage from './app/components/LandingPage';
import MyProfile from './app/components/MyProfile';
import SplashScreen from './app/components/SplashScreen'; // <-- Add this import
// import TextEditor from './components/NotificationListing';
import PrincipalDashboard from './app/principal/Dashboard'; // <-- Add this import

import { UserProvider } from './app/UserContext';

const Stack = createNativeStackNavigator();

// Placeholder components for missing screens
// import type { RouteProp } from '@react-navigation/native';
import Layout from './app/components/Layout';
import AddNotice from './app/principal/AddNotice';
import Admissions from './app/principal/Admissions';
import ComplaintsDispossle from './app/principal/ComplaintsDispossle';
import DropBox from './app/principal/dropbox';
import EnquiryManagement from './app/principal/EnquiryManagement';
import FeeManagementSystem from './app/principal/FeeManagementSystem';
import IDCardBuilder from './app/principal/IDcard';
import Promotion from './app/principal/promotion';
import SchoolGallery from './app/principal/SchoolGallary';
import Teachers from './app/principal/ShowTeacher';
import StudentOnboarding from './app/principal/StudentOnboarding';
import TeacherDiaryPrincipal from './app/principal/TeacherDiary';
import TeacherIDCard from './app/principal/teacherIDcard';
import TeacherOnboard from './app/principal/TeacherOnboard';
import TeacherSalaryManagement from './app/principal/TeacherSalaryManagement';
import TransferCertificate from './app/principal/transferCertificate';
import Complaints from './app/student/Complaints';
import HomeWork from './app/student/HomeWork';
import Onlitest from './app/student/OnlineTest';
import Results from './app/student/Results';
import Attendance from './app/teacher/Attendance';
import MyTeacherIDCard from './app/teacher/MyTeacherIDCard';
import OnlineTestCreate from './app/teacher/OnlineTestexam';
import DiaryItem from './app/teacher/TeacherDairy';
import TeacherHomework from './app/teacher/teacherHomework';
import TeacherUploadResults from './app/teacher/TeacherUploadResults';
import { configureStatusBar } from './app/utils/statusBarConfig';
// import TeacherUploadResults from './app/teacher/TeacherUploadResults';
// import TeacherSelfAttendance from './app/teacher/TeacherAttendance';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Login');

  useEffect(() => {
    // Force status bar to be black globally
    configureStatusBar();
    checkAutoLogin();
  }, []);

  const checkAutoLogin = async () => {
    try {
      const role = await AsyncStorage.getItem('role');
      if (role) {
        const userRole = JSON.parse(role);
        const token = await AsyncStorage.getItem(`${userRole}_token`);

        if (token) {
          // Set initial route based on user role
          switch (userRole) {
            case 'student':
            case 'parents':
              setInitialRoute('StudentDashboard');
              break;
            case 'teacher':
              setInitialRoute('TeacherDashboard');
              break;
            case 'principal':
              setInitialRoute('PrincipalDashboard');
              break;
            default:
              setInitialRoute('Login');
          }
        }
      }
    } catch (error) {
      console.error('Error checking auto login:', error);
      setInitialRoute('Login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onAnimationComplete={handleSplashComplete} />;
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <UserProvider>

      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>

        <Stack.Screen name="Login" component={Login} />


        {/* Student pages */}
        <Stack.Screen
          name="StudentDashboard"
          children={props => (
            <Layout>
              <StudentDashboard {...props} />
            </Layout>
          )}
          
        />
        <Stack.Screen

        // Complaints page for students
          name="Complaints"
          children={props => (
            <Layout>
              <Complaints {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="HomeWork"
          children={props => (  
            <Layout>
                <HomeWork {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="StudentResults"
          children={props => (
            <Layout>
              <StudentResults {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="StudentNotices"
          children={props => (
            <Layout>
              <ShowNotice {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="LandingPage"
          children={props => (
            <Layout>
              <LandingPage {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="OnlineTest"
          children={props => (
            <Layout>
              <Onlitest {...props} />
            </Layout>
          )}
        />

        {/* Teacher pages */}
        <Stack.Screen
          name="TeacherLandingPage"
          children={props => (
            <Layout>
              <LandingPage {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="TeacherDashboard"
          children={props => (
            <Layout>
              <TeacherDashboard {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="DiaryItem"
          children={props => (
            <Layout>
              <DiaryItem {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="OnlineTestCreate"
          children={props => (
            <Layout>
              <OnlineTestCreate {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="TeacherAttendance"
          children={props => (
            <Layout>
              <TeacherSelfAttendance {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="MyTeacherIDCard"
          children={props => (
            <Layout>
              <MyTeacherIDCard {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="Attendance"
          children={props => (
            <Layout>
              <Attendance {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="TeacherUploadResults"
          children={props => (
            <Layout>
              <TeacherUploadResults {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="TeacherHomework"
          children={props => (
            <Layout>
              <TeacherHomework {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="TeacherSelfAttendance"
          children={props => (
            <Layout>
              <TeacherSelfAttendance {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="MyProfile"
          children={props => (
            <Layout>
              <MyProfile {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="MyStudents"
          children={props => (
            <Layout>
              <MyStudents {...props} />
            </Layout>
          )}
        />

        {/* Principal sidebar screens */}
        <Stack.Screen
          name="PrincipalLandingPage"
          children={props => (
            <Layout>
              <LandingPage {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="PrincipalDashboard"
          children={props => (
            <Layout>
              <PrincipalDashboard {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="promotion"
          children={props => (
            <Layout>
              <Promotion {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="dropbox"
          children={props => (
            <Layout>
              <DropBox {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="SchoolGallary"
          children={props => (
            <Layout>
              <SchoolGallery {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="ShowTeacher"
          children={props => (
            <Layout>
              <Teachers {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="TeacherOnboard"
          children={props => (
            <Layout>
              <TeacherOnboard {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="teacherIDcard"
          children={props => (
            <Layout>
              <TeacherIDCard {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="Admissions"
          children={props => (
            <Layout>
              <Admissions {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="StudentOnboarding"
          children={props => (
            <Layout>
              <StudentOnboarding {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="FeeManagementSystem"
          children={props => (
            <Layout>
              <FeeManagementSystem {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="TeacherSalaryManagement"
          children={props => (
            <Layout>
              <TeacherSalaryManagement {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="EnquiryManagement"
          children={props => (
            <Layout>
              <EnquiryManagement {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="AddNotice"
          children={props => (
            <Layout>
              <AddNotice {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="UploadResult"
          children={props => (
            <Layout>
              <Results {...props} />
            </Layout>
          )}
        />

        <Stack.Screen
          name="TeacherDiary"
          children={props => (
            <Layout>
              <TeacherDiaryPrincipal {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="ComplaintsDispossle"
          children={props => (
            <Layout>
              <ComplaintsDispossle {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="resultPublish"
          children={props => (
            <Layout>
              <ResultPublish {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="transferCertificate"
          children={props => (
            <Layout>
              <TransferCertificate {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="IDcard"
          children={props => (
            <Layout>
              <IDCardBuilder {...props} />
            </Layout>
          )}
        />
        <Stack.Screen
          name="TeacherUploadResults'"
          children={props => (
            <Layout>
              <TeacherUploadResults {...props} />
            </Layout>
          )}
        />





      </Stack.Navigator>
    </UserProvider>
  );
}

export function LoadingScreen() {
  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#667eea'
    }}>
      <ActivityIndicator size="large" color="#ffffff" />
      <Text style={{
        color: '#ffffff',
        marginTop: 10,
        fontSize: 16,
        fontWeight: '500'
      }}>
        Loading...
      </Text>
    </View>
  );
}