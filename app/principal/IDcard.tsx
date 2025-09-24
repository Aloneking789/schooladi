import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
// import AdmissionsSkeleton from "../../Loading/AdmissionsLoading";
import { getImageUrl } from "../utils/getImageUrl";

// Helper to format date
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${date.getDate().toString().padStart(2, "0")}/${months[date.getMonth()]}/${date.getFullYear()}`;
};

// InfoRow component for consistency and styling of each information field
const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) => (
  <View style={styles.infoRow}>
    <MaterialCommunityIcons
      name={icon}
      size={18}
      color="#059669"
      style={{ marginRight: 8, marginTop: 2 }}
    />
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

interface Student {
  _id?: string;
  id?: string;
  studentName: string;
  idcardNumber: string;
  class_: string;
  sectionclass: string;
  fatherName: string;
  motherName: string;
  email: string;
  phone: string;
  penNumber: string;
  photo?: string;
  dateOfBirth?: string;
  address?: string;
  bloodGroup?: string;
}

const IDCardBuilder: React.FC = () => {
  const [admissions, setAdmissions] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [principalSignature, setPrincipalSignature] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState("");

  useEffect(() => {
    const getUser = async () => {
      try {
        const userRaw = await AsyncStorage.getItem("principal_user");
        const user = userRaw ? JSON.parse(userRaw) : null;
        const schools = user?.principal_user?.schools || user?.schools || [];
        const schoolId = schools[0]?.id || null;
        const schoolNameFromUser = schools[0]?.Schoolname || schools[0]?.schoolName || "";
        setSchoolId(schoolId);
        setSchoolName(schoolNameFromUser);
      } catch {
        setSchoolId(null);
        setSchoolName("");
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    const fetchAdmissions = async () => {
      try {
        const token = await AsyncStorage.getItem("principal_token");
        const response = await fetch(
          `https://api.pbmpublicschool.in/api/admission/students/by-school/${schoolId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await response.json();
        setAdmissions(data.students || []);
      } catch (err: any) {
        setError(err.message || "Failed to fetch students");
        setAdmissions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAdmissions();
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId) return;
    const fetchAssets = async () => {
      try {
        const res = await fetch(
          `https://api.pbmpublicschool.in/api/newSchool/school-assets/by-school/${schoolId}`
        );
        const data = await res.json();
        setSchoolLogo(data.schoolLogo || null);
        setPrincipalSignature(data.principalSignature || null);
      } catch {
        setSchoolLogo(null);
        setPrincipalSignature(null);
      }
    };
    fetchAssets();
  }, [schoolId]);

  const openIdCardForm = (student: Student) => {
    setSelectedStudent(student);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedStudent(null);
  };

  const downloadIdCard = () => {
    Alert.alert(
      "Download Not Supported",
      "ID Card download is not supported in the Expo app. Please use the web version or contact the developer for export functionality.",
      [{ text: "OK" }]
    );
  };

  // Get unique class options
  const classOptions = Array.from(
    new Set(admissions.map((s) => s.class_).filter(Boolean))
  );

  // Filter admissions by selected class
  const filteredAdmissions = classFilter
    ? admissions.filter((s) => s.class_ === classFilter)
    : admissions;

  if (loading) return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#059669" />
      <Text style={{ marginTop: 12, color: "#059669" }}>Loading students...</Text>
    </View>
  );
  if (error) return <Text style={{ color: "red", margin: 16 }}>Error: {error}</Text>;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff", padding: 12 }}>
      {/* Filter by Class */}
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Filter by Class:</Text>

        <TouchableOpacity
          style={[
            styles.classButton,
            classFilter === "" && styles.classButtonActive,
          ]}
          onPress={() => setClassFilter("")}
        >
          <Text style={styles.classButtonText}>All</Text>
        </TouchableOpacity>
        {classOptions.map((cls) => (
          <TouchableOpacity
            key={cls}
            style={[
              styles.classButton,
              classFilter === cls && styles.classButtonActive,
            ]}
            onPress={() => setClassFilter(cls)}
          >
            <Text style={styles.classButtonText}>{cls}</Text>
          </TouchableOpacity>
        ))}

      </View>

      {/* Student List */}
      <FlatList
        data={filteredAdmissions}
        keyExtractor={(item) => item._id || item.id || Math.random().toString()}
        ListEmptyComponent={<Text style={{ textAlign: "center", margin: 24 }}>No students found</Text>}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item, index }) => (
          <View style={styles.studentRow}>
            <Text style={styles.studentCell}>{index + 1}</Text>
            <Text style={styles.studentCell}>{item.studentName}</Text>
            <Text style={styles.studentCell}>{item.idcardNumber}</Text>
            <Text style={styles.studentCell}>{item.class_}</Text>
            <Text style={styles.studentCell}>{item.sectionclass}</Text>
            <Text style={styles.studentCell}>{item.fatherName}</Text>
            <Text style={styles.studentCell}>{item.motherName}</Text>
            <Text style={styles.studentCell}>{item.email}</Text>
            <Text style={styles.studentCell}>{item.phone}</Text>
            <Text style={styles.studentCell}>{item.penNumber}</Text>
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() => openIdCardForm(item)}
            >
              <MaterialCommunityIcons name="download" size={22} color="#059669" />
            </TouchableOpacity>
          </View>
        )}
        horizontal={false}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal for ID Card */}
      <Modal
        visible={showModal && !!selectedStudent}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedStudent && (
              <ScrollView contentContainerStyle={{ alignItems: "center" }}>
                {/* ID Card Design */}
                <View style={styles.idCardContainer}>
                  {/* Header */}
                  <View style={styles.idCardHeader}>
                    <View style={styles.logoContainer}>
                      {schoolLogo ? (
                        <Image
                          source={{ uri: getImageUrl(schoolLogo) }}
                          style={styles.schoolLogo}
                          resizeMode="contain"
                        />
                      ) : (
                        <MaterialCommunityIcons name="school" size={40} color="#059669" />
                      )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.schoolName}>{schoolName || "JALPAI PUBLIC SCHOOL"}</Text>
                      <Text style={styles.idCardTitle}>STUDENT IDENTITY CARD</Text>
                      <Text style={styles.idCardNumber}>ID: {selectedStudent.idcardNumber}</Text>
                    </View>
                  </View>
                  {/* Main Content */}
                  <View style={styles.idCardMain}>
                    {/* Student Photo */}
                    <View style={styles.photoContainer}>
                      {selectedStudent.photo ? (
                        <Image
                          source={{ uri: getImageUrl(selectedStudent.photo) }}
                          style={styles.studentPhoto}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.photoFallback}>
                          <MaterialCommunityIcons name="account" size={32} color="#bdbdbd" />
                        </View>
                      )}
                    </View>
                    {/* Info */}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <InfoRow icon="account" label="Student Name" value={selectedStudent.studentName} />
                      <InfoRow icon="school" label="Class & Section" value={`${selectedStudent.class_} - ${selectedStudent.sectionclass}`} />
                      <InfoRow icon="account" label="Father's Name" value={selectedStudent.fatherName} />
                      <InfoRow icon="calendar" label="Date of Birth" value={formatDate(selectedStudent.dateOfBirth)} />
                      <InfoRow icon="map-marker" label="Address" value={selectedStudent.address || "N/A"} />
                      <InfoRow icon="phone" label="Contact" value={selectedStudent.phone} />
                    </View>
                  </View>
                  {/* Session & Blood Group */}
                  <View style={styles.sessionRow}>
                    <View style={styles.sessionItem}>
                      <View style={styles.sessionDot} />
                      <Text style={styles.sessionText}>Session: 2024-25</Text>
                    </View>
                    <View style={styles.sessionItem}>
                      <View style={[styles.sessionDot, { backgroundColor: "#ef4444" }]} />
                      <Text style={styles.sessionText}>Blood: {selectedStudent.bloodGroup || "N/A"}</Text>
                    </View>
                  </View>
                  {/* Footer */}
                  <View style={styles.idCardFooter}>
                    <View>
                      <Text style={styles.footerSchoolName}>{schoolName || "JALPAI PUBLIC SCHOOL"}</Text>
                      <Text style={styles.footerSession}>Academic Session 2024-25</Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      {principalSignature ? (
                        <Image
                          source={{ uri: getImageUrl(principalSignature) }}
                          style={styles.signature}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text style={styles.noSignature}>No Signature</Text>
                      )}
                      <Text style={styles.principalLabel}>PRINCIPAL</Text>
                    </View>
                  </View>
                  <View style={styles.securityStripe} />
                </View>
                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.downloadIdButton} onPress={downloadIdCard}>
                    <MaterialCommunityIcons name="download" size={18} color="#fff" />
                    <Text style={styles.downloadIdButtonText}>Download ID Card</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  filterLabel: {
    fontWeight: "bold",
    marginRight: 8,
    fontSize: 16,
  },
  classButton: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  classButtonActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  classButtonText: {
    color: "#111827",
    fontWeight: "bold",
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: 8,
    paddingHorizontal: 2,
    flexWrap: "wrap",
  },
  studentCell: {
    flex: 1,
    fontSize: 12,
    color: "#374151",
    marginHorizontal: 2,
    minWidth: 60,
  },
  downloadButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    width: "92%",
    maxWidth: 400,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  idCardContainer: {
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    width: 320,
    alignSelf: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  idCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    padding: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  logoContainer: {
    backgroundColor: "#fff",
    borderRadius: 32,
    padding: 4,
    borderWidth: 2,
    borderColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
  },
  schoolLogo: {
    width: 40,
    height: 40,
  },
  schoolName: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  idCardTitle: {
    color: "#d1fae5",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 2,
  },
  idCardNumber: {
    color: "#059669",
    backgroundColor: "#fff",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: "bold",
    fontSize: 12,
    marginTop: 4,
  },
  idCardMain: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#fff",
  },
  photoContainer: {
    width: 72,
    height: 90,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  studentPhoto: {
    width: 68,
    height: 86,
    borderRadius: 6,
  },
  photoFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
    width: 68,
    height: 86,
    borderRadius: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  infoLabel: {
    fontSize: 10,
    color: "#6b7280",
    textTransform: "uppercase",
    fontWeight: "bold",
  },
  infoValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "600",
  },
  sessionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    padding: 8,
    borderRadius: 8,
    marginHorizontal: 8,
    marginBottom: 8,
  },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  sessionDot: {
    width: 8,
    height: 8,
    backgroundColor: "#059669",
    borderRadius: 4,
    marginRight: 4,
  },
  sessionText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "bold",
  },
  idCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    padding: 12,
    borderTopWidth: 1,
    borderColor: "#e5e7eb",
  },
  footerSchoolName: {
    color: "#059669",
    fontWeight: "bold",
    fontSize: 13,
    marginBottom: 2,
  },
  footerSession: {
    color: "#374151",
    fontSize: 11,
  },
  signature: {
    width: 60,
    height: 24,
    marginBottom: 2,
  },
  noSignature: {
    color: "#bdbdbd",
    fontSize: 10,
    marginBottom: 2,
  },
  principalLabel: {
    color: "#059669",
    fontWeight: "bold",
    fontSize: 11,
    borderTopWidth: 1,
    borderColor: "#d1fae5",
    paddingTop: 2,
    textAlign: "center",
  },
  securityStripe: {
    height: 4,
    backgroundColor: "linear-gradient(90deg, #059669, #3b82f6, #059669)",
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    gap: 16,
  },
  downloadIdButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 8,
    shadowColor: "#059669",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  downloadIdButtonText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 15,
  },
  closeButton: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  closeButtonText: {
    color: "#374151",
    fontWeight: "bold",
    fontSize: 15,
  },
});

export default IDCardBuilder;
