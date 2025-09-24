import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, FlatList } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Result {
  id?: string;
  englishTheory?: number;
  hindiTheory?: number;
  mathematicsTheory?: number;
  mathPractical?: number;
  scienceTheory?: number;
  sciencePractical?: number;
  socialScience?: number;
}

interface Publication {
  examType: string;
  semester: string;
  remarks?: string;
  class?: {
    className: string;
  };
  results: Result[];
}

const StudentDashboard = () => {
  const [results, setResults] = useState<Publication[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [studentId, setStudentId] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [token, setToken] = useState("");

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
        const response = await fetch(`https://api.pbmpublicschool.in/api/admission/students/${studentId}?schoolId=${schoolId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setStudentDetails(data.student);
      } catch (err) {
        setError("Failed to fetch student data.");
      }
    };
    fetchStudentData();
  }, [studentId, schoolId, token]);

  const upcomingClasses = [
    { subject: "Mathematics", time: "09:00 AM", teacher: "Mr. Smith" },
    { subject: "Science", time: "10:30 AM", teacher: "Mrs. Johnson" },
    { subject: "English", time: "12:00 PM", teacher: "Ms. Davis" },
  ];

  const recentAnnouncements = [
    {
      title: "Annual Sports Day",
      date: "2024-03-25",
      content: "Annual sports day will be held next week.",
    },
    {
      title: "Parent-Teacher Meeting",
      date: "2024-03-28",
      content: "PTM scheduled for next Thursday.",
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Student Dashboard</Text>
      {studentDetails && (
        <View style={[styles.card, { backgroundColor: '#f3f4f6', marginBottom: 16, alignItems: 'flex-start' }]}>
          {Object.entries(studentDetails).map(([key, value]) => (
            <Text key={key} style={{ fontSize: 14, color: '#374151', marginBottom: 2 }}>
              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: {value === null || value === undefined ? '-' : typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.cardRow}>
        <View style={[styles.card, { backgroundColor: '#DBEAFE' }]}> {/* blue */}
          <Ionicons name="book" color="#1D4ED8" />
          <Text style={styles.cardLabel}>Subjects</Text>
          <Text style={styles.cardValue}>6</Text>
        </View>
        <View style={[styles.card, { backgroundColor: '#D1FAE5' }]}> {/* green */}
          <Ionicons name="calendar" color="#047857" />
          <Text style={styles.cardLabel}>Attendance</Text>
          <Text style={styles.cardValue}>92%</Text>
        </View>
        <View style={[styles.card, { backgroundColor: '#EDE9FE' }]}> {/* purple */}
          <Ionicons name="time" color="#6D28D9" />
          <Text style={styles.cardLabel}>Study Hours</Text>
          <Text style={styles.cardValue}>24h</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Classes</Text>
        {upcomingClasses.map((cls, idx) => (
          <View key={idx} style={styles.listItem}>
            <View>
              <Text style={styles.listTitle}>{cls.subject}</Text>
              <Text style={styles.listSub}>{cls.teacher}</Text>
            </View>
            <Text style={styles.time}>{cls.time}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="notifications" color="#2563EB" />
          <Text style={styles.sectionTitle}>Announcements</Text>
        </View>
        {recentAnnouncements.map((ann, idx) => (
          <View key={idx} style={styles.announcement}>
            <Text style={styles.listTitle}>{ann.title}</Text>
            <Text style={styles.listSub}>{ann.content}</Text>
            <Text style={styles.date}>{ann.date}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Published Results</Text>
        {loadingResults ? (
          <ActivityIndicator />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : results.length === 0 ? (
          <View> <Text>No results published yet.</Text> </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item, index) => `${item.examType}-${index}`}
            renderItem={({ item }) => (
              <View style={styles.resultBlock}>
                <Text style={styles.resultTitle}>{item.examType} - <Text>{item.class?.className || ""}</Text></Text>
                {item.results.map((r, idx) => (
                  <View key={idx} style={styles.resultRow}>
                    <Text>Eng: <Text>{r.englishTheory ?? '-'}</Text></Text>
                    <Text>Hindi: <Text>{r.hindiTheory ?? '-'}</Text></Text>
                    <Text>Math: <Text>{r.mathematicsTheory ?? '-'}</Text>{r.mathPractical ? <Text> +{r.mathPractical}</Text> : null}</Text>
                    <Text>Science: <Text>{r.scienceTheory ?? '-'}</Text>{r.sciencePractical ? <Text> +{r.sciencePractical}</Text> : null}</Text>
                    <Text>SST: <Text>{r.socialScience ?? '-'}</Text></Text>
                  </View>
                ))}
                <Text>Remarks: <Text>{item.remarks ?? '-'}</Text></Text>
              </View>
            )}
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1f2937',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  cardLabel: {
    fontSize: 14,
    color: '#374151',
    marginTop: 6,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1f2937',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  listItem: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listTitle: {
    fontWeight: '500',
    fontSize: 16,
    color: '#111827',
  },
  listSub: {
    fontSize: 12,
    color: '#6b7280',
  },
  time: {
    fontSize: 14,
    color: '#4b5563',
  },
  announcement: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    paddingLeft: 12,
    marginBottom: 12,
  },
  date: {
    fontSize: 10,
    color: '#9ca3af',
  },
  error: {
    color: 'red',
  },
  resultBlock: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  resultTitle: {
    fontWeight: 'bold',
    marginBottom: 6,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
});

export default StudentDashboard;
