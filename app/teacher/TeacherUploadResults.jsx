import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Picker } from '@react-native-picker/picker';

const API_BASE_URL = "https://api.pbmpublicschool.in/api";

const TeacherUploadResults = () => {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedExamType, setSelectedExamType] = useState("");
  const [sessionId, setSessionId] = useState("a267d756-f4e9-40f5-97ef-33b4c9f967f0");
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [headerError, setHeaderError] = useState("");
  const [students, setStudents] = useState([]);
  const [showStudents, setShowStudents] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [schoolId, setSchoolId] = useState(null);
  const [teacherId, setTeacherId] = useState("");
  const [teacherInfo, setTeacherInfo] = useState(null);
  const [classId, setClassId] = useState("");
  const [token, setToken] = useState("");
  const [subjectConfigs, setSubjectConfigs] = useState({});
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [studentResults, setStudentResults] = useState({});
  const [examResults, setExamResults] = useState([]);
  const [editingResult, setEditingResult] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    marksArray: [],
    subject: "",
    semester: "",
  });

  const examTypes = [
    "Periodic I",
    "Note Book",
    "Half Yearly Exam",
    "Periodic II",
    "Note Book II",
    "Annual Exam",
  ];

  const showAlert = (title, message, type = 'info') => {
    Alert.alert(title, message);
  };

  const handleClassChange = (classId) => {
    setSelectedClassId(classId);
    const selectedClass = classes.find((cls) => cls.id === classId);
    setSelectedClass(selectedClass?.name || "");
    setSelectedSection("");
    setFile(null);
    setCsvData([]);
    setHeaderError("");
  };

  const selectedClassObj = classes.find(
    (cls) => String(cls.id) === String(selectedClassId)
  );
  const sections = selectedClassObj?.sections || [];

  useEffect(() => {
    const getUserData = async () => {
      try {
        const userDataRaw = await AsyncStorage.getItem('teacher_user');
        const tokenRaw = await AsyncStorage.getItem('teacher_token');

        if (userDataRaw && tokenRaw) {
          const teacherData = JSON.parse(userDataRaw);
          setTeacherInfo(teacherData);
          setTeacherId(teacherData.id || teacherData.user?.id || '');
          setSchoolId(teacherData.schoolId?.toString() || teacherData.user?.schools?.[0]?.id || '');
          setClassId(teacherData.classId || teacherData.user?.classId || '');
          // also preselect the class id in the selector state
          setSelectedClassId(teacherData.classId || teacherData.user?.classId || '');
          setToken(tokenRaw);
        }
      } catch (error) {
        console.error('Failed to load user data from storage', error);
        Alert.alert('Error', 'Failed to load teacher information');
      }
    };
    getUserData();
  }, []);

  useEffect(() => {
    if (!schoolId || !token) return;

    const fetchClasses = async () => {
      try {
        // If teacher has an assigned classId, try to fetch only that class to limit the selector
        const assignedClassId = classId || (teacherInfo && (teacherInfo.classId || teacherInfo.user?.classId));

        if (assignedClassId) {
          // Try to fetch the specific class by id if API supports it
          try {
            const resp = await fetch(`${API_BASE_URL}/classes/${schoolId}/${assignedClassId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (resp.ok) {
              const cls = await resp.json();
              // normalize: API may return { class: {...} } or the class object directly
              const classItem = cls.class || cls.data || cls || null;
              if (classItem) {
                setClasses(Array.isArray(classItem) ? classItem : [classItem]);
                // preselect in case it's missing
                setSelectedClassId(assignedClassId);
                setSelectedClass(classItem.name || '');
                return;
              }
            }
          } catch (e) {
            // fallback to fetching all classes
            console.warn('Failed to fetch single class, falling back to classes list', e);
          }
        }

        // Fallback: fetch all classes for the school
        const response = await fetch(`${API_BASE_URL}/classes/${schoolId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        setClasses(data.classes || []);
      } catch (error) {
        showAlert("Error", "Failed to load classes");
      }
    };
    fetchClasses();
  }, [schoolId, token]);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedClass || !schoolId || !token) return;

      setLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/admission/students/by-school/${schoolId}?class=${selectedClass}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch students");
        }

        const data = await response.json();
        const studentsData = data.students || [];
        setStudents(studentsData);

        try {
          const subjects = await fetchSubjectsForClass();
          setSubjectConfigs({ [selectedClass]: subjects });
        } catch (error) {
          console.error("Error fetching subjects:", error);
          setSubjectConfigs({});
        }
      } catch (err) {
        console.error("Error fetching data:", err.message);
        showAlert("Error", err.message);
      } finally {
        setLoading(false);
      }
    };

    if (selectedClass && schoolId && token) {
      fetchData();
    }
  }, [selectedClass, schoolId, token]);

  const fetchSubjectsForClass = async () => {
    try {
      if (!selectedClassId || !schoolId || !token) {
        throw new Error("Missing required data");
      }

      const response = await fetch(
        `${API_BASE_URL}/classes/${selectedClassId}/subjects?schoolId=${schoolId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch subjects");
      }

      const data = await response.json();

      if (!data.success || !data.subjects || data.subjects.length === 0) {
        throw new Error("No subjects found");
      }

      return data.subjects;
    } catch (error) {
      console.error("Error fetching subjects:", error);
      showAlert("Error", error.message || "Failed to fetch subjects");
      return [];
    }
  };

  const fetchStudentsAndResults = async () => {
    if (!selectedClass || !selectedSection || !schoolId || !token) return;

    setLoading(true);

    try {
      let allResults = [];
      try {
        const resultsResponse = await fetch(
          `${API_BASE_URL}/result/results/school/${schoolId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (resultsResponse.ok) {
          const data = await resultsResponse.json();
          if (Array.isArray(data)) {
            allResults = data;
          } else if (Array.isArray(data.results)) {
            allResults = data.results;
          } else if (Array.isArray(data.data)) {
            allResults = data.data;
          }
        }
      } catch (err) {
        console.warn("Error fetching school results", err);
        allResults = [];
      }

      const studentsResponse = await fetch(
        `${API_BASE_URL}/admission/students/by-school/${schoolId}?class=${selectedClass}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!studentsResponse.ok) {
        throw new Error("Failed to fetch students");
      }

      const data = await studentsResponse.json();
      const studentsArray = data.students && Array.isArray(data.students) ? data.students : [];

      const filteredStudents = studentsArray.filter(
        (student) =>
          student.class_ === selectedClass &&
          student.sectionclass === selectedSection
      );

      const resultsMap = {};
      filteredStudents.forEach((student) => {
        resultsMap[student.id] = allResults.filter(
          (result) => result.studentId === student.id
        );
      });

      setStudentResults(resultsMap);
      setStudents(filteredStudents);
    } catch (err) {
      showAlert("Error", "Failed to fetch students and results");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentsAndResults();
  }, [selectedClass, selectedSection]);

  const fetchExamResultsForSchool = async () => {
    if (!schoolId || !token) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/result/exam-results/school/1`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      const rows = Array.isArray(data) ? data : data.data || data.results || [];

      if (!res.ok) {
        console.error("Failed to fetch exam results, status:", res.status);
        setExamResults([]);
        return;
      }

      setExamResults(rows || []);
    } catch (err) {
      console.error("Error fetching exam results:", err);
      setExamResults([]);
    }
  };

  useEffect(() => {
    if (schoolId && token) fetchExamResultsForSchool();
  }, [schoolId, token]);

  const generateSampleCSV = async () => {
    if (!students || !Array.isArray(students) || students.length === 0) {
      showAlert("Error", "No students found for selected class and section");
      return;
    }

    if (!selectedExamType) {
      showAlert("Error", "Please select an examination type");
      return;
    }

    let subjects = subjectConfigs[selectedClass];

    if (!subjects || subjects.length === 0) {
      subjects = await fetchSubjectsForClass();
      setSubjectConfigs({ ...subjectConfigs, [selectedClass]: subjects });
    }

    if (!subjects || subjects.length === 0) {
      showAlert("Error", "No subjects found for selected class");
      return;
    }

    const headers = [
      "Student_Sr_Number",
      "rollNumber",
      "studentName",
      "studentId",
      "schoolId",
      "classId",
      "class_",
      "sectionclass",
      "examinationType",
      ...subjects.flatMap((subject) => [
        `${subject.name} obtainted marks`,
        `${subject.name} MaxMark`,
      ]),
    ];

    let csvContent = headers.join(",") + "\n";

    students.forEach((student, idx) => {
      const defaultMax = 100;
      const subjectMarks = subjects.flatMap(() => ["0", String(defaultMax)]);

      const row = [
        student.Student_Sr_Number || "",
        student.rollNumber || "",
        student.studentName || "",
        student.id || "",
        schoolId || "",
        student.classId || selectedClassId || "",
        student.class_ || selectedClass || "",
        student.sectionclass || selectedSection || "",
        selectedExamType || "",
        ...subjectMarks,
      ];

      const escaped = row.map((field) => {
        if (field === null || field === undefined) return "";
        const str = String(field);
        if (str.includes(",") || str.includes('"')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      });

      csvContent += escaped.join(",") + "\n";
    });

    try {
      const fileName = `class_${selectedClass || selectedClassId}${selectedSection ? "_" + selectedSection : ""
        }_${selectedExamType || "exam"}_results_template.csv`;

      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, csvContent);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        showAlert("Success", "CSV file generated successfully");
      }
    } catch (error) {
      console.error('Error saving CSV:', error);
      showAlert("Error", "Failed to generate CSV file");
    }
  };

  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      setFile(file);
      setCsvData([]);
      setHeaderError("");

      // Immediately upload the selected file
      handleUpload(file);
    } catch (error) {
      console.error('Error selecting file:', error);
      showAlert("Error", "Failed to select file");
    }
  };

  const handleUpload = async (uploadFile) => {
    const fileToUpload = uploadFile || file;
    if (!fileToUpload) {
      showAlert("Error", "Please select a file to upload");
      return;
    }

    if (!schoolId) {
      showAlert("Error", "School ID is not available");
      return;
    }

    if (!token) {
      showAlert("Error", "Please login to continue");
      return;
    }

    setUploadLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: fileToUpload.uri,
        type: 'text/csv',
        name: fileToUpload.name || 'results.csv',
      });
      formData.append('examType', selectedExamType);
      formData.append('sessionId', sessionId);

      const response = await fetch(`${API_BASE_URL}/result/import-csv`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload results");
      }

      const result = await response.json();
      showAlert(
        "Success",
        `Successfully processed results: ${result.created} created, ${result.updated} updated`
      );

      // Reset form
      setFile(null);
      setCsvData([]);
      setHeaderError("");
      setSelectedClass("");
      setSelectedSection("");
      setSelectedExamType("");
      setStudents([]);
      setStudentResults({});

      // Refresh the results
      await fetchStudentsAndResults();
    } catch (error) {
      console.error("Upload error:", error);
      showAlert("Error", error.message || "Error uploading results");
    } finally {
      setUploadLoading(false);
    }
  };

  const saveEditedResult = async () => {
    if (!editingResult || !token) return;

    const payload = {};
    if (Array.isArray(editForm.marksArray) && editForm.marksArray.length > 0) {
      payload.marks = editForm.marksArray.map((m) => ({
        subject: m.subject,
        component: m.component,
        obtained: typeof m.obtained === "number" && !Number.isNaN(m.obtained) ? Number(m.obtained) : null,
      }));
    }
    if (editForm.subject !== "") payload.subject = editForm.subject;
    if (editForm.semester !== "") payload.semester = editForm.semester;

    try {
      const res = await fetch(`${API_BASE_URL}/result/results/${editingResult.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update result");
      }

      const updated = await res.json();

      setExamResults((prev) =>
        prev.map((er) => {
          if (er.id !== updated.id) return er;
          const merged = { ...er, ...updated };
          if (Array.isArray(updated.marks)) {
            merged.marks = updated.marks;
          }
          return merged;
        })
      );

      setEditingResult(null);
      setEditModalVisible(false);
      showAlert("Success", "Result updated successfully");
    } catch (err) {
      console.error("Failed to update result:", err);
      showAlert("Error", err.message || "Failed to update result");
    }
  };

  const renderStudentsTable = () => {
    if (!showStudents || students.length === 0) return null;

    return (
      <View style={styles.tableContainer}>
        <ScrollView horizontal>
          <View>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { width: 60 }]}>Sr. No.</Text>
              <Text style={[styles.tableHeaderText, { width: 150 }]}>Student Name</Text>
              <Text style={[styles.tableHeaderText, { width: 100 }]}>Roll Number</Text>
              <Text style={[styles.tableHeaderText, { width: 80 }]}>Class</Text>
              {Array.isArray(subjectConfigs[selectedClass]) &&
                subjectConfigs[selectedClass].map((subject, index) => (
                  <Text
                    key={`${subject.id}-${index}`}
                    style={[styles.tableHeaderText, { width: 100 }]}
                  >
                    {subject.name}
                  </Text>
                ))}
              <Text style={[styles.tableHeaderText, { width: 100 }]}>Total Marks</Text>
            </View>
            {students.map((student, index) => {
              const studentResult = studentResults[student.id] || [];
              const totalMarks = studentResult.reduce(
                (sum, result) => sum + (result.marks || 0),
                0
              );

              return (
                <View key={student.id || index} style={styles.tableRow}>
                  <Text style={[styles.tableCellText, { width: 60 }]}>
                    {student.Student_Sr_Number}
                  </Text>
                  <Text style={[styles.tableCellText, { width: 150 }]}>
                    {student.studentName}
                  </Text>
                  <Text style={[styles.tableCellText, { width: 100 }]}>
                    {student.rollNumber}
                  </Text>
                  <Text style={[styles.tableCellText, { width: 80 }]}>
                    {student.class_}
                  </Text>
                  {Array.isArray(subjectConfigs[selectedClass]) &&
                    subjectConfigs[selectedClass].map((subject, subIndex) => (
                      <Text
                        key={`${subject.id || subject}-${subIndex}`}
                        style={[styles.tableCellText, { width: 100 }]}
                      >
                        -
                      </Text>
                    ))}
                  <Text style={[styles.tableCellText, { width: 100 }]}>
                    {totalMarks}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderExamResults = () => {
    if (!examResults || examResults.length === 0) return null;

    const filtered = examResults.filter(
      (r) => r.class?.name === selectedClass || r.classId === selectedClassId
    );
    const byExamType = selectedExamType
      ? filtered.filter((r) => r.examType === selectedExamType)
      : filtered;

    const columns = new Set();
    byExamType.forEach((r) => {
      (r.marks || []).forEach((m) => columns.add(`${m.subject} ${m.component}`));
    });
    const cols = Array.from(columns);

    return (
      <View style={styles.tableContainer}>
        <Text style={styles.sectionTitle}>Exam Results</Text>
        <ScrollView horizontal>
          <View>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { width: 60 }]}>Sr. No.</Text>
              <Text style={[styles.tableHeaderText, { width: 150 }]}>Student Name</Text>
              <Text style={[styles.tableHeaderText, { width: 100 }]}>Roll Number</Text>
              <Text style={[styles.tableHeaderText, { width: 80 }]}>Class</Text>
              {cols.map((c) => (
                <Text key={c} style={[styles.tableHeaderText, { width: 100 }]}>
                  {c}
                </Text>
              ))}
              <Text style={[styles.tableHeaderText, { width: 100 }]}>Actions</Text>
              <Text style={[styles.tableHeaderText, { width: 100 }]}>Total Marks</Text>
            </View>
            {byExamType.map((r, idx) => {
              const marksMap = {};
              (r.marks || []).forEach((m) => {
                marksMap[`${m.subject} ${m.component}`] = m.obtained;
              });

              return (
                <View key={r.id} style={styles.tableRow}>
                  <Text style={[styles.tableCellText, { width: 60 }]}>
                    {idx + 1}
                  </Text>
                  <Text style={[styles.tableCellText, { width: 150 }]}>
                    {r.student?.studentName || "-"}
                  </Text>
                  <Text style={[styles.tableCellText, { width: 100 }]}>
                    {r.rollNumber || "-"}
                  </Text>
                  <Text style={[styles.tableCellText, { width: 80 }]}>
                    {r.class?.name || r.classId || "-"}
                  </Text>
                  {cols.map((c) => (
                    <Text key={c} style={[styles.tableCellText, { width: 100 }]}>
                      {marksMap[c] ?? "-"}
                    </Text>
                  ))}
                  <View style={[styles.actionButtons, { width: 100 }]}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => {
                        setEditingResult(r);
                        setEditForm({
                          marksArray: (r.marks || []).map((m) => ({
                            subject: m.subject,
                            component: m.component,
                            obtained: typeof m.obtained !== "undefined" ? m.obtained : "",
                          })),
                          subject: r.subject || "",
                          semester: r.semester || "",
                        });
                        setEditModalVisible(true);
                      }}
                    >
                      <Text style={styles.buttonText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.tableCellText, { width: 100 }]}>
                    {r.obtainedMarks ?? "-"}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Upload Results</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Class</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedClassId}
              onValueChange={handleClassChange}
              style={styles.picker}
            >
              <Picker.Item label="Select Class" value="" />
              {classes.map((cls) => (
                <Picker.Item key={cls.id} label={cls.name} value={cls.id} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Section</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedSection}
              onValueChange={(value) => {
                setSelectedSection(value);
                setFile(null);
                setCsvData([]);
                setHeaderError("");
              }}
              style={styles.picker}
            >
              <Picker.Item label="Select Section" value="" />
              {sections.map((section) => (
                <Picker.Item
                  key={section.id}
                  label={section.sectionName}
                  value={section.sectionName}
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Examination Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedExamType}
              onValueChange={(value) => {
                setSelectedExamType(value);
                setFile(null);
                setCsvData([]);
                setHeaderError("");
              }}
              style={styles.picker}
            >
              <Picker.Item label="Select Examination Type" value="" />
              {examTypes.map((type) => (
                <Picker.Item key={type} label={type} value={type} />
              ))}
            </Picker>
          </View>
        </View>

        {/* <View style={styles.formGroup}>
          <Text style={styles.label}>Session ID</Text>
          <TextInput
            value={sessionId}
            onChangeText={setSessionId}
            placeholder="Session ID"
            style={styles.textInput}
          />
        </View> */}

        {/* <TouchableOpacity
          style={[
            styles.button,
            (!selectedClass || !selectedSection || !selectedExamType) && styles.buttonDisabled,
          ]}
          onPress={generateSampleCSV}
          disabled={!selectedClass || !selectedSection || !selectedExamType}
        >
          <Text style={styles.buttonText}>Download Sample CSV</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleFileSelect}>
          <Text style={styles.buttonText}>Select CSV File</Text>
        </TouchableOpacity> */}

        {file && (
          <Text style={styles.fileInfo}>Selected: {file.name}</Text>
        )}

        {headerError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{headerError}</Text>
          </View>
        ) : null}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Loading students...</Text>
          </View>
        )}

        {students.length > 0 && !loading && !file && (
          <View style={styles.studentsContainer}>
            <View style={styles.studentsHeader}>
              <Text style={styles.sectionTitle}>Students List</Text>
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setShowStudents(!showStudents)}
              >
                <Text style={styles.toggleButtonText}>
                  {showStudents ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>
            {renderStudentsTable()}
          </View>
        )}

        {renderExamResults()}

        {uploadLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Uploading...</Text>
          </View>
        )}
      </View>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Result</Text>

            <View style={styles.modalContent}>
              {/* Per-subject marks editor */}
              <Text style={[styles.label, { marginBottom: 6 }]}>Subject Marks</Text>
              <View style={styles.marksList}>
                {Array.isArray(editForm.marksArray) && editForm.marksArray.length > 0 ? (
                  editForm.marksArray.map((m, i) => (
                    <View key={`${m.subject}-${m.component}-${i}`} style={styles.markRow}>
                      <Text style={styles.markLabel}>
                        {m.subject} {m.component ? `(${m.component})` : ''}
                      </Text>
                      <TextInput
                        style={styles.markInput}
                        keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
                        value={m.obtained === '' || m.obtained === null ? '' : String(m.obtained)}
                        onChangeText={(val) => {
                          setEditForm((prev) => {
                            const nextMarks = Array.isArray(prev.marksArray) ? [...prev.marksArray] : [];
                            nextMarks[i] = { ...nextMarks[i], obtained: val === '' ? '' : Number(val) };
                            return { ...prev, marksArray: nextMarks };
                          });
                        }}
                        placeholder="Obtained"
                      />
                    </View>
                  ))
                ) : (
                  <Text style={{ color: '#666', fontSize: 13 }}>No subject marks available for this result.</Text>
                )}
              </View>

              <Text style={styles.label}>Subject</Text>
              <TextInput
                value={editForm.subject}
                onChangeText={(value) =>
                  setEditForm(prev => ({ ...prev, subject: value }))
                }
                style={styles.textInput}
                placeholder="Subject"
              />

              <Text style={styles.label}>Semester</Text>
              <TextInput
                value={editForm.semester}
                onChangeText={(value) =>
                  setEditForm(prev => ({ ...prev, semester: value }))
                }
                style={styles.textInput}
                placeholder="Semester"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.button}
                onPress={saveEditedResult}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  formContainer: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  fileInfo: {
    fontSize: 14,
    color: '#555',
    marginTop: 8,
  },
  errorContainer: {
    backgroundColor: '#fff5f5',
    padding: 10,
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#ffd6d6',
  },
  errorText: {
    color: '#b00020',
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 8,
    color: '#333',
  },
  studentsContainer: {
    marginTop: 12,
  },
  studentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  marksList: {
    maxHeight: 220,
    marginBottom: 8,
  },
  markRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  markLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginRight: 8,
  },
  markInput: {
    width: 90,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  toggleButton: {
    backgroundColor: '#eee',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  toggleButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  tableContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#fafafa',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  tableHeaderText: {
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
    alignItems: 'center',
  },
  tableCellText: {
    color: '#444',
    paddingHorizontal: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#007bff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: '#222',
  },
  modalContent: {
    marginVertical: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  cancelButton: {
    backgroundColor: '#888',
    marginRight: 8,
  },
});

export default TeacherUploadResults;