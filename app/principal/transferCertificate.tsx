import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

const TransferCertificate = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState("");
  const [editableFields, setEditableFields] = useState<any>({});
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [principalSignature, setPrincipalSignature] = useState<string | null>(null);
  const [schoolNameFromUser, setSchoolNameFromUser] = useState("");
  const [tcNo, setTcNo] = useState("");
  const [tcConduct, setTcConduct] = useState("");
  const [tcRemarks, setTcRemarks] = useState("");
  const [schoolDetails, setSchoolDetails] = useState<any>({});
  const [modalVisible, setModalVisible] = useState(false);

  const characterOptions = ["GOOD", "VERY GOOD", "EXCELLENT", "SATISFACTORY"];
  const nationalityOptions = ["INDIAN", "OTHER"];
  const religionOptions = ["HINDU", "MUSLIM", "CHRISTIAN", "SIKH", "OTHER"];

  useEffect(() => {
    const getSchoolInfo = async () => {
      try {
        const userRaw = await AsyncStorage.getItem("principal_user");
        const user = userRaw ? JSON.parse(userRaw) : null;
        const schools = user?.principal_user?.schools || user?.schools || [];
        const schoolId = schools[0]?.id || null;
        setSchoolId(schoolId);
        setSchoolNameFromUser(schools[0]?.Schoolname || schools[0]?.schoolName || "");
        // Fetch logo and principal signature (skipped for brevity)
      } catch (err) {
        setError("Failed to load school info");
      }
    };
    getSchoolInfo();
  }, []);

  useEffect(() => {
    // Fetch school details (skipped for brevity)
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId) return;
    const fetchAdmissions = async () => {
      try {
        const principal_token = await AsyncStorage.getItem("principal_token");
        const response = await fetch(
          `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/admission/students/by-school/${schoolId}`,
          {
            headers: { Authorization: `Bearer ${principal_token}` },
          }
        );
        const data = await response.json();
        setAdmissions(data.students || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchAdmissions();
  }, [schoolId]);

  // Unique class options for filter
  const classOptions = Array.from(new Set(admissions.map((s) => s.class_).filter(Boolean)));

  // Filtered admissions by search and class
  const filteredAdmissions = admissions.filter(
    (student) =>
      student.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (classFilter ? student.class_ === classFilter : true)
  );

  const handleFieldChange = (studentId: string, field: string, value: string) => {
    setEditableFields((prev: any) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }));
  };

  const handleGenerateTC = async (student: any) => {
    try {
      // Replace prompt with Alert.prompt or a modal in production
      Alert.alert("Reason for leaving? (not implemented)");
      Alert.alert("Any remarks? (not implemented)");
      // ...existing logic...
      setSelectedStudent(student);
    } catch (err) {
      Alert.alert("Error issuing Transfer Certificate");
    }
  };

  const handleRollbackTC = async (student: any) => {
    try {
      // ...existing logic...
      Alert.alert("TC status rolled back!");
      setAdmissions((prev) =>
        prev.map((s) =>
          s.id === student.id ? { ...s, isTransferCertIssued: false, isActive: true } : s
        )
      );
    } catch (err) {
      Alert.alert("Error rolling back TC status");
    }
  };

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;
  if (error) return <Text style={{ color: "red", margin: 20 }}>{error}</Text>;

  return (
    <ScrollView style={styles.container}>
      {!selectedStudent ? (
        <>
          <Text style={styles.title}>Transfer Certificate</Text>
          <TextInput
            placeholder="Search students..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.input}
          />
          <Text style={styles.label}>Filter by Class:</Text>
          <ScrollView horizontal style={{ marginBottom: 10 }}>
            {classOptions.map((cls) => (
              <TouchableOpacity key={cls} style={styles.chip} onPress={() => setClassFilter(cls)}>
                <Text>{cls}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {filteredAdmissions.length === 0 ? (
            <Text style={styles.noData}>No students found.</Text>
          ) : (
            filteredAdmissions.map((student, idx) => (
              <View key={student.id} style={styles.studentCard}>
                <Text style={styles.studentName}>{student.studentName}</Text>
                <Text>Father: {student.fatherName}</Text>
                <Text>Mother: {student.motherName}</Text>
                <Text>Class: {student.class_}</Text>
                <Text>Roll Number: {student.rollNumber}</Text>
                <Text>Date of Birth: {new Date(student.dateOfBirth).toLocaleDateString()}</Text>
                <Text>Status: {student.isTransferCertIssued ? "Issued" : "Not Issued"}</Text>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleGenerateTC(student)}>
                  <Text style={{ color: 'white' }}>Generate TC</Text>
                </TouchableOpacity>
                {student.isTransferCertIssued && (
                  <TouchableOpacity style={styles.actionButton} onPress={() => setSelectedStudent(student)}>
                    <Text style={{ color: 'white' }}>View TC</Text>
                  </TouchableOpacity>
                )}
                {student.isTransferCertIssued && (
                  <TouchableOpacity style={styles.rollbackButton} onPress={() => handleRollbackTC(student)}>
                    <Text style={{ color: 'white' }}>Rollback TC</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </>
      ) : (
        <Modal visible={true} animationType="slide">
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>Transfer Certificate</Text>
            <Text style={styles.modalLabel}>Name: {selectedStudent.studentName}</Text>
            <Text style={styles.modalLabel}>Father: {selectedStudent.fatherName}</Text>
            <Text style={styles.modalLabel}>Mother: {selectedStudent.motherName}</Text>
            <Text style={styles.modalLabel}>Class: {selectedStudent.class_}</Text>
            <Text style={styles.modalLabel}>Roll Number: {selectedStudent.rollNumber}</Text>
            <Text style={styles.modalLabel}>Date of Birth: {new Date(selectedStudent.dateOfBirth).toLocaleDateString()}</Text>
            <Text style={styles.modalLabel}>Status: {selectedStudent.isTransferCertIssued ? "Issued" : "Not Issued"}</Text>
            <TouchableOpacity style={styles.actionButton} onPress={() => setSelectedStudent(null)}>
              <Text style={{ color: 'white' }}>Back</Text>
            </TouchableOpacity>
          </ScrollView>
        </Modal>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  input: { backgroundColor: '#f5f5f5', padding: 12, borderRadius: 6, marginBottom: 14, borderWidth: 1, borderColor: '#ccc' },
  label: { fontSize: 14, marginBottom: 4, color: '#555' },
  chip: { backgroundColor: '#e5e7eb', padding: 8, borderRadius: 16, marginRight: 8, marginBottom: 8 },
  noData: { textAlign: 'center', margin: 20, color: '#888' },
  studentCard: { backgroundColor: '#f3f4f6', padding: 16, borderRadius: 12, marginBottom: 12 },
  studentName: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  actionButton: { backgroundColor: '#2563eb', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  rollbackButton: { backgroundColor: '#dc2626', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  modalContent: { flex: 1, backgroundColor: '#fff', padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  modalLabel: { fontSize: 16, marginBottom: 6 },
});

export default TransferCertificate;

