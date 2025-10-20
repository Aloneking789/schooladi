import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from "axios";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

const months = [
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March"
];

interface RegisteredStudent {
  Admission_Number?: string;
  class_?: string;
  assignedSection?: string;
  feesPaid?: string[];
  student?: {
    studentName?: string;
  };
  // Add other properties as needed
}

type StudentOnboardingFormData = {
  Admission_Number?: string;
  studentName: string;
  dateOfBirth: string | number | Date;
  gender: string;
  class_: string | number;
  assignedSection: string | number;
  religion: string;
  caste: string;
  fatherName: string;
  motherName: string;
  aadharNumber?: string;
  penNumber?: string;
  address: string;
  phone: string;
  email?: string;
  subjects?: any[];
};

const StudentOnboarding = () => {
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(-1);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectAll, setSelectAll] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  interface SchoolClass {
    id: string | number;
    name: string;
    sections?: { id: string | number; sectionName: string }[];
    // Add other properties as needed
  }
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [schoolId, setSchoolId] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredStudent, setRegisteredStudent] = useState<RegisteredStudent | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<StudentOnboardingFormData>();

  // Watch the subjects field for subject selection
  const watchedSubjects = watch("subjects", []);

  // Get schoolId from AsyncStorage
  useEffect(() => {
    const getSchoolId = async () => {
      const userRaw = await AsyncStorage.getItem("principal_user");
      const user = userRaw ? JSON.parse(userRaw) : null;
      const schools = user?.principal_user?.schools || user?.schools || [];
      const schoolId = schools[0]?.id || null;
      setSchoolId(schoolId);
    };
    getSchoolId();
  }, []);

  // Fetch classes for the current schoolId
  useEffect(() => {
    if (!schoolId) return;
    const fetchClasses = async () => {
      try {
        const principal_token = await AsyncStorage.getItem("principal_token");
        const res = await axios.get(
          `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/classes/${schoolId}`,
          {
            headers: {
              Authorization: `Bearer ${principal_token}`,
            },
          }
        );
        setClasses(res.data.classes || []);
      } catch (error) {
        Alert.alert("Error", "Failed to load classes");
      }
    };
    fetchClasses();
  }, [schoolId]);

  // Fetch subjects for the selected class
  useEffect(() => {
    if (!selectedClassId || !schoolId) {
      setSubjects([]);
      return;
    }
    const fetchSubjects = async () => {
      try {
        const res = await axios.get(
          `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/newSchool/schools/${schoolId}`,
          {
            params: {
              schoolId: schoolId,
              classId: selectedClassId,
            },
          }
        );
        setSubjects(res.data.subjects || []);
      } catch (error) {
        setSubjects([]);
        Alert.alert("Error", "Failed to load subjects");
      }
    };
    fetchSubjects();
  }, [selectedClassId, schoolId]);

  const onSubmit = async (data: StudentOnboardingFormData) => {
    try {
      setLoading(true);
      // Find selected section object
      const selectedClassObj = classes.find((cls) => String(cls.id) === String(selectedClassId));
      const selectedSectionObj = selectedClassObj?.sections?.find(
        (sec) => String(sec.id) === String(data.assignedSection)
      );

      const formattedData = {
        ...data,
        class_: selectedClassObj?.name || "",
        assignedSection: selectedSectionObj?.sectionName || "",
        classId: selectedClassId,
        schoolId: schoolId,
        dateOfBirth: new Date(data.dateOfBirth).toISOString(),
      };

      const principal_token = await AsyncStorage.getItem("principal_token");

      const response = await axios.post(
        "https://1rzlgxk8-5001.inc1.devtunnels.ms/api/admission/admission",
        formattedData,
        {
          headers: {
            Authorization: `Bearer ${principal_token}`,
          },
        }
      );

      if (response.status === 201 || response.status === 200) {
        Alert.alert("Success", "Student Registration Successful!");
        setRegisteredStudent(response.data);
        setShowSuccessModal(true);
        reset();
        setSelectedClassId("");
      } else {
        Alert.alert("Error", "Failed to register student");
      }
    } catch (error) {
      let errorMessage = "Failed to register student";
      if (error && typeof error === "object" && "response" in error) {
        const err = error as { response?: { data?: { message?: string } } };
        if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        }
      }
      Alert.alert(
        "Error",
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddFees = () => {
    Alert.alert("Info", "Student data is ready for fees collection. Please proceed manually.");
  };

  const handleAddNewStudent = () => {
    setShowSuccessModal(false);
    setRegisteredStudent(null);
  };

  function handleSelectAll(arg0: boolean): void {
    throw new Error("Function not implemented.");
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        <Ionicons name="person-add" size={24} color="#222" /> Student Registration
      </Text>
      <View style={styles.form}>
        {/* Admission Number */}
        <Text style={styles.label}>Admission Number</Text>
        <Controller
          control={control}
          name="Admission_Number"
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="If you want admission not to be auto generated"
              style={styles.input}
              value={value ? String(value) : ""}
              onChangeText={onChange}
            />
          )}
        />
        {errors.Admission_Number && (
          <Text style={styles.error}>{errors.Admission_Number?.message as string}</Text>
        )}

        {/* Student Name */}
        <Text style={styles.label}>Student Name</Text>
        <Controller
          control={control}
          name="studentName"
          rules={{ required: "Student name is required" }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="e.g., John Doe"
              style={styles.input}
              value={value !== undefined && value !== null ? String(value) : ""}
              onChangeText={onChange}
            />
          )}
        />
        {errors.studentName && (
          <Text style={styles.error}>{errors.studentName?.message as string}</Text>
        )}

        {/* Date of Birth */}
        <Text style={styles.label}>Date of Birth</Text>
        <Controller
          control={control}
          name="dateOfBirth"
          rules={{ required: "Date of Birth is required" }}
          render={({ field: { onChange, value } }) => (
            <>
              <TouchableOpacity
                style={[styles.input, { justifyContent: 'center' }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: value ? '#000' : '#888' }}>
                  {value ? (typeof value === 'string' ? new Date(value).toLocaleDateString() : new Date(value).toLocaleDateString()) : 'YYYY-MM-DD'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={value ? new Date(value) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) onChange(selectedDate.toISOString().slice(0, 10));
                  }}
                  maximumDate={new Date()}
                />
              )}
            </>
          )}
        />
        {errors.dateOfBirth && (
          <Text style={styles.error}>{typeof errors.dateOfBirth?.message === "string" ? errors.dateOfBirth.message : ""}</Text>
        )}

        {/* Gender */}
        <Text style={styles.label}>Gender</Text>
        <Controller
          control={control}
          name="gender"
          rules={{ required: "Gender is required" }}
          render={({ field: { onChange, value } }) => (
            <View style={styles.pickerRow}>
              {["male", "female", "other"].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderButton,
                    value === g && styles.genderButtonSelected,
                  ]}
                  onPress={() => onChange(g)}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      value === g && styles.genderButtonTextSelected,
                    ]}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
        {errors.gender && (
          <Text style={styles.error}>{typeof errors.gender?.message === "string" ? errors.gender.message : ""}</Text>
        )}

        {/* Class */}
        <Text style={styles.label}>Class</Text>
        <Controller
          control={control}
          name="class_"
          rules={{ required: "Class is required" }}
          render={({ field: { onChange, value } }) => (
            <View style={styles.pickerRow}>
              <ScrollView horizontal>
                {classes.map((cls) => (
                  <TouchableOpacity
                    key={cls.id}
                    style={[
                      styles.classButton,
                      value === cls.id && styles.classButtonSelected,
                    ]}
                    onPress={() => {
                      setSelectedClassId(String(cls.id));
                      setSelectAll(false);
                      setValue("subjects", []);
                      onChange(cls.id);
                    }}
                  >
                    <Text
                      style={[
                        styles.classButtonText,
                        value === cls.id && styles.classButtonTextSelected,
                      ]}
                    >
                      {cls.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        />
        {errors.class_ && (
          <Text style={styles.error}>
            {typeof errors.class_.message === "string" ? errors.class_.message : ""}
          </Text>
        )}

        {/* Section */}
        <Text style={styles.label}>Section</Text>
        <Controller
          control={control}
          name="assignedSection"
          rules={{ required: "Section is required" }}
          render={({ field: { onChange, value } }) => (
            <View style={styles.pickerRow}>
              <ScrollView horizontal>
                {(classes.find((cls) => String(cls.id) === String(selectedClassId))?.sections || []).map(
                  (section: { id: string | number; sectionName: string }) => (
                    <TouchableOpacity
                      key={section.id}
                      style={[
                        styles.classButton,
                        value === section.id && styles.classButtonSelected,
                      ]}
                      onPress={() => onChange(section.id)}
                    >
                      <Text
                        style={[
                          styles.classButtonText,
                          value === section.id && styles.classButtonTextSelected,
                        ]}
                      >
                        {section.sectionName}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </ScrollView>
            </View>
          )}
        />
        {errors.assignedSection && (
          <Text style={styles.error}>{typeof errors.assignedSection?.message === "string" ? errors.assignedSection.message : ""}</Text>
        )}

        {/* Religion */}
        <Text style={styles.label}>Religion</Text>
        <Controller
          control={control}
          name="religion"
          rules={{ required: "Religion is required" }}
          render={({ field: { onChange, value } }) => (
            <View style={styles.pickerRow}>
              {["Hindu", "Muslim", "Christian", "Sikh", "Other"].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.classButton,
                    value === r && styles.classButtonSelected,
                  ]}
                  onPress={() => onChange(r)}
                >
                  <Text
                    style={[
                      styles.classButtonText,
                      value === r && styles.classButtonTextSelected,
                    ]}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
        {errors.religion && (
          <Text style={styles.error}>
            {typeof errors.religion.message === "string" ? errors.religion.message : ""}
          </Text>
        )}

        {/* Caste */}
        <Text style={styles.label}>Caste</Text>
        <Controller
          control={control}
          name="caste"
          rules={{ required: "Caste is required" }}
          render={({ field: { onChange, value } }) => (
            <View style={styles.pickerRow}>
              {["General", "OBC", "SC", "ST", "Other"].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.classButton,
                    value === c && styles.classButtonSelected,
                  ]}
                  onPress={() => onChange(c)}
                >
                  <Text
                    style={[
                      styles.classButtonText,
                      value === c && styles.classButtonTextSelected,
                    ]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
        {errors.caste && (
          <Text style={styles.error}>
            {typeof errors.caste.message === "string" ? errors.caste.message : ""}
          </Text>
        )}

        {/* Father's Name */}
        <Text style={styles.label}>Father's Name</Text>
        <Controller
          control={control}
          name="fatherName"
          rules={{ required: "Father's name is required" }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="e.g., Mr. Doe"
              style={styles.input}
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        {errors.fatherName && (
          <Text style={styles.error}>
            {typeof errors.fatherName.message === "string" ? errors.fatherName.message : ""}
          </Text>
        )}

        {/* Mother's Name */}
        <Text style={styles.label}>Mother's Name</Text>
        <Controller
          control={control}
          name="motherName"
          rules={{ required: "Mother's name is required" }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="e.g., Mrs. Doe"
              style={styles.input}
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        {errors.motherName && (
          <Text style={styles.error}>
            {typeof errors.motherName.message === "string" ? errors.motherName.message : ""}
          </Text>
        )}

        {/* Aadhar Number */}
        <Text style={styles.label}>Aadhar Number</Text>
        <Controller
          control={control}
          name="aadharNumber"
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="e.g., 1234 5678 9012"
              style={styles.input}
              value={value}
              onChangeText={onChange}
              keyboardType="numeric"
            />
          )}
        />

        {/* PEN Number */}
        <Text style={styles.label}>PEN Number</Text>
        <Controller
          control={control}
          name="penNumber"
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="e.g., PEN123456789"
              style={styles.input}
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        {/* Address */}
        <Text style={styles.label}>Address</Text>
        <Controller
          control={control}
          name="address"
          rules={{ required: "Address is required" }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="e.g., 123 Main Street, City, ZIP"
              style={[styles.input, { height: 60 }]}
              value={value}
              onChangeText={onChange}
              multiline
            />
          )}
        />
        {errors.address && typeof errors.address.message === "string" && (
          <Text style={styles.error}>{errors.address.message}</Text>
        )}

        {/* Phone */}
        <Text style={styles.label}>Phone</Text>
        <Controller
          control={control}
          name="phone"
          rules={{ required: "Phone is required" }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="e.g., 9876543210"
              style={styles.input}
              value={value}
              onChangeText={onChange}
              keyboardType="phone-pad"
            />
          )}
        />
        {errors.phone && typeof errors.phone.message === "string" && (
          <Text style={styles.error}>{errors.phone.message}</Text>
        )}

        {/* Email */}
        <Text style={styles.label}>Email</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="e.g., john@example.com"
              style={styles.input}
              value={value}
              onChangeText={onChange}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          )}
        />
        {errors.email && typeof errors.email.message === "string" && (
          <Text style={styles.error}>{errors.email.message}</Text>
        )}

        {/* Subjects */}
        {selectedClassId ? (
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.label}>Select Subjects</Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <TouchableOpacity
                onPress={() => handleSelectAll(!selectAll)}
                style={{
                  width: 20,
                  height: 20,
                  borderWidth: 1,
                  borderColor: "#888",
                  backgroundColor: selectAll ? "#007bff" : "#fff",
                  marginRight: 8,
                  borderRadius: 4,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {selectAll && <Ionicons name="checkmark" size={16} color="#fff" />}
              </TouchableOpacity>
              <Text>Select All</Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {subjects.map((subject) => (
                <TouchableOpacity
                  key={subject}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginRight: 12,
                    marginBottom: 8,
                  }}
                  onPress={() => {
                    let newSubjects;
                    if ((watchedSubjects ?? []).includes(subject)) {
                      newSubjects = (watchedSubjects ?? []).filter((sub: any) => sub !== subject);
                    } else {
                      newSubjects = [...(watchedSubjects ?? []), subject];
                    }
                    setValue("subjects", newSubjects);
                    if (newSubjects.length !== subjects.length) {
                      setSelectAll(false);
                    } else {
                      setSelectAll(true);
                    }
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderWidth: 1,
                      borderColor: "#888",
                      backgroundColor: (watchedSubjects ?? []).includes(subject) ? "#007bff" : "#fff",
                      marginRight: 6,
                      borderRadius: 4,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {(watchedSubjects ?? []).includes(subject) && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                  <Text>{subject}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.subjects && typeof errors.subjects.message === "string" && (
              <Text style={styles.error}>{errors.subjects.message}</Text>
            )}
          </View>
        ) : null}

        {/* Submit */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="people" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal && !!registeredStudent}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.successTitle}>
              Student Registered Successfully! 🎉
            </Text>
            <View style={{ marginBottom: 16 }}>
              <Text>
                <Text style={{ fontWeight: "bold" }}>Name:</Text>{" "}
                {registeredStudent?.student?.studentName}
              </Text>
              <Text>
                <Text style={{ fontWeight: "bold" }}>Admission Number:</Text>{" "}
                {registeredStudent?.Admission_Number || "Auto Generated"}
              </Text>
              <Text>
                <Text style={{ fontWeight: "bold" }}>Class:</Text>{" "}
                {registeredStudent?.class_}
              </Text>
              <Text>
                <Text style={{ fontWeight: "bold" }}>Section:</Text>{" "}
                {registeredStudent?.assignedSection}
              </Text>
              {registeredStudent?.feesPaid &&
                registeredStudent.feesPaid.length > 0 && (
                  <Text>
                    <Text style={{ fontWeight: "bold" }}>Fees Paid:</Text>{" "}
                    {registeredStudent.feesPaid.join(", ")}
                  </Text>
                )}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#2563eb" }]}
                onPress={handleAddNewStudent}
              >
                <Text style={styles.modalButtonText}>Add New Student</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#16a34a" }]}
                onPress={handleAddFees}
              >
                <Text style={styles.modalButtonText}>Add Fees</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#fff", flexGrow: 1 },
  title: { fontSize: 22, fontWeight: "bold", color: "#222", textAlign: "center", marginBottom: 16 },
  form: { backgroundColor: "#f8fafc", borderRadius: 12, padding: 16, marginBottom: 24 },
  label: { fontWeight: "bold", color: "#222", marginTop: 12, marginBottom: 4 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  error: { color: "red", fontSize: 13, marginBottom: 4 },
  pickerRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
  genderButton: {
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  genderButtonSelected: { backgroundColor: "#007bff" },
  genderButtonText: { color: "#222" },
  genderButtonTextSelected: { color: "#fff" },
  classButton: {
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  classButtonSelected: { backgroundColor: "#007bff" },
  classButtonText: { color: "#222" },
  classButtonTextSelected: { color: "#fff" },
  submitButton: {
    backgroundColor: "#222",
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  submitButtonText: { color: "#fff", fontWeight: "bold", marginLeft: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "90%",
    maxWidth: 400,
    alignItems: "center",
  },
  successTitle: { fontSize: 20, fontWeight: "bold", color: "#16a34a", marginBottom: 12, textAlign: "center" },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: "center",
  },
  modalButtonText: { color: "#fff", fontWeight: "bold" },
});

export default StudentOnboarding;