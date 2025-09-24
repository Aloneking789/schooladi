import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Result {
  subject: string;
  marks: number;
  grade: string;
  remarks: string;
  examType: string;
  class: string;
  student: string;
}

interface StudentDetails {
  studentName: string;
  dateOfBirth: string;
  fatherName: string;
  motherName: string;
  class_: string;
  sectionclass: string;
  Admission_Number: string;
}

const Results: React.FC = () => {
  const [results, setResults] = useState<Result[]>([]);
  const [filteredResults, setFilteredResults] = useState<Result[]>([]);
  const [studentDetails, setStudentDetails] = useState<StudentDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isResultPublished, setIsResultPublished] = useState<boolean>(false);
  const [studentId, setStudentId] = useState<string>("");
  const [schoolId, setSchoolId] = useState<string>("");
  const [token, setToken] = useState<string>("");

  const BASE_URL = "https://api.pbmpublicschool.in";
  const schoolName = "Sample School";

  useEffect(() => {
    const getUserData = async () => {
      try {
        const userDataRaw = await AsyncStorage.getItem('student_user');
        const tokenRaw = await AsyncStorage.getItem('student_token');
        if (userDataRaw && tokenRaw) {
          const studentData = JSON.parse(userDataRaw);
          setStudentId(studentData.id || studentData.user?.id || "");
          setSchoolId(studentData.schoolId?.toString() || studentData.user?.schools?.[0]?.id || "");
          setToken(tokenRaw);
        }
      } catch (e) {
        setError("Failed to load user data from storage");
        console.error("Failed to load user data from storage", e);
      }
    };
    getUserData();
  }, []);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!studentId || !schoolId || !token) return;
      try {
        const response = await axios.get(`${BASE_URL}/api/admission/students/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { schoolId },
        });
        setIsResultPublished(response.data.student.isResultPublished);
        setStudentDetails(response.data.student);
      } catch (err: any) {
        setError("Failed to fetch student data.");
      }
    };
    fetchStudentData();
  }, [studentId, schoolId, token]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!studentId || !schoolId || !token) return;
      try {
        const response = await axios.get(`${BASE_URL}/api/result/results/student/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { schoolId },
        });
        const data: Result[] = response.data.map((item: any) => ({
          subject: item.subject,
          marks: item.marks,
          grade: item.grade,
          remarks: item.remarks || "N/A",
          examType: item.examType,
          class: item.class,
          student: item.student,
        }));
        setResults(data);
        setFilteredResults(data);
      } catch (err: any) {
        setError("Failed to fetch results.");
      } finally {
        setLoading(false);
      }
    };
    if (isResultPublished) {
      fetchResults();
    }
  }, [isResultPublished, studentId, schoolId, token]);

  const calculateTotal = () => filteredResults.reduce((acc, curr) => acc + curr.marks, 0);
  const calculatePercentage = () => ((calculateTotal() / (filteredResults.length * 100)) * 100).toFixed(2);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>{schoolName}</Text>

      {studentDetails && (
        <View style={styles.infoContainer}>
          <Text style={styles.info}>Name: {studentDetails.studentName}</Text>
          <Text style={styles.info}>DOB: {new Date(studentDetails.dateOfBirth).toLocaleDateString()}</Text>
          <Text style={styles.info}>Father: {studentDetails.fatherName}</Text>
          <Text style={styles.info}>Mother: {studentDetails.motherName}</Text>
          <Text style={styles.info}>Class: {studentDetails.class_}</Text>
          <Text style={styles.info}>Section: {studentDetails.sectionclass}</Text>
          <Text style={styles.info}>Admission No: {studentDetails.Admission_Number}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Results</Text>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <View>
          {filteredResults.map((result, index) => (
            <View key={index} style={styles.resultRow}>
              <Text style={styles.resultText}>{result.subject}</Text>
              <Text style={styles.resultText}>Marks: <Text>{result.marks}</Text></Text>
              <Text style={styles.resultText}>Grade: <Text>{result.grade}</Text></Text>
              <Text style={styles.resultText}>Remarks: <Text>{result.remarks}</Text></Text>
            </View>
          ))}

          <View style={styles.summaryBox}>
            <Text>Total Marks: <Text>{calculateTotal()}</Text></Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="trending-up" color="#16a34a" />
              <Text style={{ marginLeft: 6 }}>Percentage: <Text>{calculatePercentage()}%</Text></Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  infoContainer: {
    marginBottom: 20,
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 8,
  },
  info: {
    fontSize: 14,
    marginBottom: 4,
    color: "#374151",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  resultRow: {
    backgroundColor: "#f9fafb",
    padding: 10,
    marginBottom: 8,
    borderRadius: 6,
  },
  resultText: {
    fontSize: 14,
    color: "#1f2937",
  },
  summaryBox: {
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  error: {
    color: "red",
    marginVertical: 10,
  },
});

export default Results;
