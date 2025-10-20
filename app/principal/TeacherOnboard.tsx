import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

type TeacherOnboardFormData = {
  fullName: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  password: string;
  qualification: string;
  specialization: string;
  experience: string;
  joiningDate: string;
  address: string;
  assignedClass: string;
  assignedSection: string;
  subjects: string;
  salaryPaid?: string[];
};


const months = [
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March"
];

const TeacherOnboard = () => {
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredTeacher, setRegisteredTeacher] = useState<any | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(-1);

  const { control, handleSubmit, setValue, formState: { errors }, reset, watch } = useForm<TeacherOnboardFormData>();

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

  // Fetch classes and sections
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
        setClasses([]);
        Alert.alert("Error", "Failed to load classes");
      }
    };
    fetchClasses();
  }, [schoolId]);

  // Salary Paid months logic
  const handleMonthSelect = (index: number) => {
    setSelectedMonthIndex(index);
    if (index === -1) {
      setValue("salaryPaid", []);
    } else {
      setValue("salaryPaid", months.slice(0, index + 1));
    }
  };

  const onSubmit = async (data: TeacherOnboardFormData) => {
    try {
      setLoading(true);
      if (!schoolId) {
        Alert.alert("Error", "School ID not found. Please login again.");
        return;
      }
      const principal_token = await AsyncStorage.getItem("principal_token");
      // Find selected class and section objects
      const selectedClassObj = classes.find((cls) => String(cls.name) === String(data.assignedClass));
      const selectedSectionObj = selectedClassObj?.sections?.find(
        (sec: any) => String(sec.sectionName) === String(data.assignedSection)
      );
      const payload = {
        ...data,
        schoolId,
        assignedClass: {
          className: data.assignedClass,
          schoolId,
        },
        assignedSection: {
          sectionName: data.assignedSection,
          schoolId,
        },
        salaryPaid: data.salaryPaid || [],
      };
      const response = await axios.post(
        "https://1rzlgxk8-5001.inc1.devtunnels.ms/api/teacher/register",
        payload,
        {
          headers: {
            Authorization: `Bearer ${principal_token}`,
          },
        }
      );
      if (response.status === 201 || response.status === 200) {
        setRegisteredTeacher(response.data);
        setShowSuccessModal(true);
        reset();
        setSelectedClass("");
        setSelectedSection("");
        setSelectedMonthIndex(-1);
      } else {
        Alert.alert("Error", "Failed to register teacher");
      }
    } catch (error: any) {
      let errorMessage = "Failed to register teacher";
      if (error && typeof error === "object" && "response" in error) {
        const err = error as { response?: { data?: { message?: string } } };
        if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        }
      }
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewTeacher = () => {
    setShowSuccessModal(false);
    setRegisteredTeacher(null);
  };
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        <Ionicons name="person-add" size={24} color="#222" /> Teacher Registration
      </Text>
      <View style={styles.form}>
        {/* Full Name */}
        <Text style={styles.label}>Full Name</Text>
        <Controller
          control={control}
          name="fullName"
          rules={{ required: "Full Name is required" }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="e.g., John Doe"
              style={styles.input}
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        {errors.fullName && <Text style={styles.error}>{errors.fullName.message}</Text>}

        {/* Email */}
        <Text style={styles.label}>Email</Text>
        <Controller
          control={control}
          name="email"
          rules={{ required: "Email is required" }}
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
        {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

        {/* Password */}
        <Text style={styles.label}>Password</Text>
        <Controller
          control={control}
          name="password"
          rules={{ required: "Password is required" }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="********"
              style={styles.input}
              value={value}
              onChangeText={onChange}
              secureTextEntry
            />
          )}
        />
        {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}

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
        {errors.phone && <Text style={styles.error}>{errors.phone.message}</Text>}

        {/* Date of Birth */}
        <Text style={styles.label}>Date of Birth</Text>
        <Controller
          control={control}
          name="dateOfBirth"
          rules={{ required: "Date of Birth is required" }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="YYYY-MM-DD"
              style={styles.input}
              value={value}
              onChangeText={onChange}
              keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
            />
          )}
        />
        {errors.dateOfBirth && <Text style={styles.error}>{errors.dateOfBirth.message}</Text>}

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
                  style={[styles.genderButton, value === g && styles.genderButtonSelected]}
                  onPress={() => onChange(g)}
                >
                  <Text style={[styles.genderButtonText, value === g && styles.genderButtonTextSelected]}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
        {errors.gender && <Text style={styles.error}>{errors.gender.message}</Text>}

        {/* Qualification */}
        <Text style={styles.label}>Qualification</Text>
        <Controller
          control={control}
          name="qualification"
          rules={{ required: "Qualification is required" }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="M.Ed / B.Ed"
              style={styles.input}
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        {errors.qualification && <Text style={styles.error}>{errors.qualification.message}</Text>}

        {/* Specialization */}
        <Text style={styles.label}>Specialization</Text>
        <Controller
          control={control}
          name="specialization"
          rules={{ required: "Specialization is required" }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="Mathematics / Science"
              style={styles.input}
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        {errors.specialization && <Text style={styles.error}>{errors.specialization.message}</Text>}

        {/* Experience */}
        <Text style={styles.label}>Experience (Years)</Text>
        <Controller
          control={control}
          name="experience"
          rules={{ required: "Experience is required" }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="e.g., 5"
              style={styles.input}
              value={value}
              onChangeText={onChange}
              keyboardType="numeric"
            />
          )}
        />
        {errors.experience && <Text style={styles.error}>{errors.experience.message}</Text>}

        {/* Joining Date */}
        <Text style={styles.label}>Joining Date</Text>
        <Controller
          control={control}
          name="joiningDate"
          rules={{ required: "Joining Date is required" }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="YYYY-MM-DD"
              style={styles.input}
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        {errors.joiningDate && <Text style={styles.error}>{errors.joiningDate.message}</Text>}

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
        {errors.address && <Text style={styles.error}>{errors.address.message}</Text>}

        {/* Assigned Class */}
        <Text style={styles.label}>Assigned Class</Text>
        <Controller
          control={control}
          name="assignedClass"
          rules={{ required: "Class is required" }}
          render={({ field: { onChange, value } }) => (
            <ScrollView horizontal>
              {classes.map((cls) => (
                <TouchableOpacity
                  key={cls.name}
                  style={[styles.classButton, value === cls.name && styles.classButtonSelected]}
                  onPress={() => {
                    setSelectedClass(cls.name);
                    setSelectedSection("");
                    onChange(cls.name);
                  }}
                >
                  <Text style={[styles.classButtonText, value === cls.name && styles.classButtonTextSelected]}>
                    {cls.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        />
        {errors.assignedClass && <Text style={styles.error}>{errors.assignedClass.message}</Text>}

        {/* Assigned Section */}
        <Text style={styles.label}>Assigned Section</Text>
        <Controller
          control={control}
          name="assignedSection"
          rules={{ required: "Section is required" }}
          render={({ field: { onChange, value } }) => (
            <ScrollView horizontal>
              {(classes.find((cls) => cls.name === selectedClass)?.sections || []).map((section: any) => (
                <TouchableOpacity
                  key={section.sectionName}
                  style={[styles.classButton, value === section.sectionName && styles.classButtonSelected]}
                  onPress={() => {
                    setSelectedSection(section.sectionName);
                    onChange(section.sectionName);
                  }}
                >
                  <Text style={[styles.classButtonText, value === section.sectionName && styles.classButtonTextSelected]}>
                    {section.sectionName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        />
        {errors.assignedSection && <Text style={styles.error}>{errors.assignedSection.message}</Text>}

        {/* Subjects */}
        <Text style={styles.label}>Subjects</Text>
        <Controller
          control={control}
          name="subjects"
          rules={{ required: "Subjects are required" }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="e.g., Math, Physics"
              style={styles.input}
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        {errors.subjects && <Text style={styles.error}>{errors.subjects.message}</Text>}

        {/* Salary Paid (Months) */}
        <Text style={styles.label}>Salary Paid (Select Month)</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => handleMonthSelect(-1)}
            style={[
              styles.classButton,
              selectedMonthIndex === -1 && styles.classButtonSelected,
            ]}
          >
            <Text style={[
              styles.classButtonText,
              selectedMonthIndex === -1 && styles.classButtonTextSelected,
            ]}>None</Text>
          </TouchableOpacity>
          {months.map((month, idx) => (
            <TouchableOpacity
              key={month}
              onPress={() => handleMonthSelect(idx)}
              style={[
                styles.classButton,
                selectedMonthIndex >= 0 && idx <= selectedMonthIndex && styles.classButtonSelected,
              ]}
            >
              <Text style={[
                styles.classButtonText,
                selectedMonthIndex >= 0 && idx <= selectedMonthIndex && styles.classButtonTextSelected,
              ]}>{month}</Text>
            </TouchableOpacity>
          ))}
        </View>

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
              <Text style={styles.submitButtonText}>Register Teacher</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal && !!registeredTeacher}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.successTitle}>
              Teacher Registered Successfully! 🎉
            </Text>
            <View style={{ marginBottom: 16 }}>
              <Text>
                <Text style={{ fontWeight: "bold" }}>Name:</Text> {registeredTeacher?.fullName}
              </Text>
              <Text>
                <Text style={{ fontWeight: "bold" }}>Subjects:</Text> {registeredTeacher?.subjects}
              </Text>
              <Text>
                <Text style={{ fontWeight: "bold" }}>Phone:</Text> {registeredTeacher?.phone}
              </Text>
              <Text>
                <Text style={{ fontWeight: "bold" }}>Email:</Text> {registeredTeacher?.email}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "#2563eb" }]}
              onPress={handleAddNewTeacher}
            >
              <Text style={styles.modalButtonText}>Add New Teacher</Text>
            </TouchableOpacity>
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

export default TeacherOnboard;
