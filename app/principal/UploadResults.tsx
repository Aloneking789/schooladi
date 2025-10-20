import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const API_BASE_URL = 'https://1rzlgxk8-5001.inc1.devtunnels.ms/api';

const UploadResults = () => {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedExamType, setSelectedExamType] = useState("");
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headerError, setHeaderError] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subjectConfigs, setSubjectConfigs] = useState<any>({});
  const [studentResults, setStudentResults] = useState<any>({});
  const [schoolId, setSchoolId] = useState<string | null>(null);

  const classes = ["LKG", "UKG", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const sections = ["A", "B", "C", "D"];
  const examTypes = ["Quarterly", "Halfyearly", "Annual"];

  useEffect(() => {
    // TODO: Replace with AsyncStorage for production
    const userRaw = null; // await AsyncStorage.getItem("user");
    const user = userRaw ? JSON.parse(userRaw) : null;
    const schools = user?.user?.schools || user?.schools || [];
    const schoolIdFromStorage = schools[0]?.id;
    setSchoolId(schoolIdFromStorage);
  }, []);

  // ...fetch students, subject configs, and results as needed (skipped for brevity)...

  // CSV upload and parsing is not natively supported in React Native. You would need to use a package like 'react-native-document-picker' for file selection and a CSV parser for React Native.
  // For now, we will show a placeholder UI and logic.

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Upload Results</Text>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Class</Text>
        <ScrollView horizontal>
          {classes.map((cls) => (
            <TouchableOpacity key={cls} style={[styles.chip, selectedClass === cls && styles.selectedChip]} onPress={() => setSelectedClass(cls)}>
              <Text>{cls}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Section</Text>
        <ScrollView horizontal>
          {sections.map((sec) => (
            <TouchableOpacity key={sec} style={[styles.chip, selectedSection === sec && styles.selectedChip]} onPress={() => setSelectedSection(sec)}>
              <Text>{sec}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Examination Type</Text>
        <ScrollView horizontal>
          {examTypes.map((type) => (
            <TouchableOpacity key={type} style={[styles.chip, selectedExamType === type && styles.selectedChip]} onPress={() => setSelectedExamType(type)}>
              <Text>{type}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {/* File upload and CSV preview not implemented in this mobile version */}
      <View style={styles.infoBox}>
        <Text style={{ color: '#888' }}>CSV upload and preview is not available in this mobile version. Please use the web portal for bulk uploads.</Text>
      </View>
      {headerError ? <Text style={styles.error}>{headerError}</Text> : null}
      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity
        style={[styles.uploadButton, (!selectedClass || !selectedSection || !selectedExamType) && { backgroundColor: '#ccc' }]}
        disabled={!selectedClass || !selectedSection || !selectedExamType || uploadLoading}
        onPress={() => Alert.alert('Not implemented', 'CSV upload is not available in this mobile version.')}
      >
        <Text style={{ color: 'white' }}>{uploadLoading ? 'Uploading...' : 'Upload Results'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  chip: { backgroundColor: '#e5e7eb', padding: 10, borderRadius: 16, marginRight: 8, marginBottom: 8 },
  selectedChip: { backgroundColor: '#2563eb' },
  infoBox: { backgroundColor: '#f3f4f6', padding: 16, borderRadius: 8, marginBottom: 16 },
  error: { color: 'red', marginBottom: 10 },
  uploadButton: { backgroundColor: '#2563eb', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 16 },
});

export default UploadResults;
