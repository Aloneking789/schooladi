import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import axios from "axios";
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import Toast from "react-native-toast-message";

type PrincipalStackParamList = {
  Admissions: undefined;
  StudentOnboarding: undefined;
  // add other screens here if needed
};

interface Student {
  _id?: string;
  id?: string;
  studentName: string;
  dateOfBirth: string;
  gender: string;
  class_: string;
  sectionclass: string;
  fatherName: string;
  motherName: string;
  phone: string;
  email: string;
  address: string;
  Admission_Number: string;
  idcardNumber: string;
  penNumber: string;
  aadharNumber: string;
  photo: string | null;
  isActive: boolean;
  status?: string;
}

const Admissions = () => {
  const [filter, setFilter] = useState<string>("all");
  const [admissions, setAdmissions] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const navigation = useNavigation<NativeStackNavigationProp<PrincipalStackParamList>>();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [classFilter, setClassFilter] = useState<string>("");
  const [sectionFilter, setSectionFilter] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editData, setEditData] = useState<Partial<Student>>({});
  const [schoolId, setSchoolId] = useState<string | null>(null);

  useEffect(() => {
    const getSchoolId = async () => {
      try {
        const userRaw = await AsyncStorage.getItem("principal_user");
        const user = userRaw ? JSON.parse(userRaw) : null;
        const schools = user?.principal_user?.schools || user?.schools || [];
        const schoolId = schools[0]?.id || null;
        setSchoolId(schoolId);
      } catch (error) {
        console.error("Error parsing user data:", error);
        setSchoolId(null);
      }
    };
    getSchoolId();
  }, []);

  useEffect(() => {
    const fetchAdmissions = async () => {
      if (!schoolId) return;
      try {
        const token = await AsyncStorage.getItem("principal_token");
        const response = await axios.get(
          `https://api.pbmpublicschool.in/api/admission/students/by-school/${schoolId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const studentsData = response.data?.students || [];
        setAdmissions(studentsData);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(
          err && typeof err === "object" && "message" in err
            ? String((err as any).message)
            : "An error occurred"
        );
        setLoading(false);
        setAdmissions([]);
      }
    };

    fetchAdmissions();
  }, [schoolId]);

  const classOptions = useMemo(
    () => Array.from(new Set(admissions.map((s) => s.class_).filter(Boolean))),
    [admissions]
  );

  const sectionOptions = useMemo(
    () => Array.from(new Set(admissions.map((s) => s.sectionclass).filter(Boolean))),
    [admissions]
  );

  const handleViewDetails = (student: Student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedStudent(null);
    setIsModalOpen(false);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setEditData(selectedStudent || {});
    setIsEditing(true);
  };

  const handleEditChange = (name: keyof Student, value: string) => {
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const token = AsyncStorage.getItem("principal_token");
      const res = await axios.put(
        `https://api.pbmpublicschool.in/api/admission/students/${selectedStudent?.id}`,
        editData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setAdmissions(prev =>
          prev.map(s => s.id === selectedStudent?.id ? res.data.student : s)
        );
        setSelectedStudent(res.data.student);
        setIsEditing(false);
        Toast.show({
          type: 'success',
          text1: 'Student updated successfully!'
        });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to update student'
      });
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this student?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              const token = AsyncStorage.getItem("principal_token");
              const res = await axios.delete(
                `https://api.pbmpublicschool.in/api/admission/students/${selectedStudent?.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              if (res.data.success) {
                setAdmissions(prev =>
                  prev.filter(s => s.id !== selectedStudent?.id)
                );
                setIsModalOpen(false);
                Toast.show({
                  type: 'success',
                  text1: 'Student deleted successfully!'
                });
              }
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: 'Failed to delete student'
              });
            }
          }
        }
      ]
    );
  };

  const filteredAdmissions = useMemo(() => {
    if (!Array.isArray(admissions)) return [];

    let filtered = admissions;

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        student =>
          student.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.fatherName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.penNumber?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filter !== "all") {
      filtered = filtered.filter(
        student => student.status?.toLowerCase() === filter
      );
    }

    if (classFilter) {
      filtered = filtered.filter(student => student.class_ === classFilter);
    }

    if (sectionFilter) {
      filtered = filtered.filter(student => student.sectionclass === sectionFilter);
    }

    return filtered.sort((a, b) => {
      const numA = Number(a.Admission_Number);
      const numB = Number(b.Admission_Number);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return (a.Admission_Number || "").localeCompare(b.Admission_Number || "");
    });
  }, [admissions, filter, searchQuery, classFilter, sectionFilter]);

  const handlePhotoUpload = async (student: Student) => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Toast.show({
        type: 'error',
        text1: 'Permission to access photos is required'
      });
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (pickerResult.canceled) return;

    const file = pickerResult.assets[0];

    if (file.fileSize && file.fileSize > 51200) {
      Toast.show({
        type: 'error',
        text1: 'Photo must not exceed 50KB'
      });
      return;
    }

    const formData = new FormData();
    formData.append('photo', {
      uri: file.uri,
      name: file.fileName || 'photo.jpg',
      type: file.type || 'image/jpeg'
    } as any);

    try {
      const token = await AsyncStorage.getItem("principal_token");
      const res = await axios.post(
        `https://api.pbmpublicschool.in/api/admission/students/${student.Admission_Number}/photo`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("principal_token")}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      if (res.data.success) {
        setAdmissions(prev =>
          prev.map(s =>
            s.Admission_Number === student.Admission_Number
              ? { ...s, photo: res.data.photoUrl }
              : s
          )
        );
        Toast.show({
          type: 'success',
          text1: 'Photo uploaded!'
        });
      } else {
        Toast.show({
          type: 'error',
          text1: res.data.message || 'Photo upload failed'
        });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Photo upload failed'
      });
    }
  };

  const handleDeletePhoto = async (student: Student) => {
    Alert.alert(
      "Confirm Delete",
      "Delete this student's photo?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("principal_token");
              const res = await axios.delete(
                `https://api.pbmpublicschool.in/api/admission/students/${student.Admission_Number}/photo`,
                {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem("principal_token")}`,
                  },
                }
              );
              if (res.data.success) {
                setAdmissions(prev =>
                  prev.map(s =>
                    s.Admission_Number === student.Admission_Number
                      ? { ...s, photo: null }
                      : s
                  )
                );
                Toast.show({
                  type: 'success',
                  text1: 'Photo deleted!'
                });
              } else {
                Toast.show({
                  type: 'error',
                  text1: res.data.message || 'Photo delete failed'
                });
              }
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: 'Photo delete failed'
              });
            }
          }
        }
      ]
    );
  };

  const renderStudentCard = ({ item: student }: { item: Student }) => (
    <View style={styles.studentCard}>
      <View style={styles.cardHeader}>
        <View style={styles.studentPhotoSection}>
          <Image
            source={{
              uri: student.photo
                ? `https://api.pbmpublicschool.in/${student.photo.replace(/\\/g, "/")}`
                : 'https://api.pbmpublicschool.in/no-photo.png'
            }}
            style={styles.cardStudentPhoto}
            onError={() => console.log("Image load error")}
            resizeMode="cover"
          />
          <View style={styles.photoActions}>
            <TouchableOpacity onPress={() => handlePhotoUpload(student)} style={styles.photoActionButton}>
              <Text style={styles.photoActionText}>Update</Text>
            </TouchableOpacity>
            {student.photo && (
              <TouchableOpacity onPress={() => handleDeletePhoto(student)} style={[styles.photoActionButton, styles.deletePhotoButton]}>
                <Text style={[styles.photoActionText, { color: '#dc2626' }]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.studentMainInfo}>
          <Text style={styles.studentName}>{student.studentName}</Text>
          <Text style={styles.admissionNumber}>Admission: {student.Admission_Number}</Text>
          <View style={styles.statusBadge}>
            <Text style={student.isActive ? styles.activeStatus : styles.inactiveStatus}>
              {student.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => handleViewDetails(student)}
          disabled={!student.isActive}
          style={[styles.viewButton, !student.isActive && styles.disabledViewButton]}
        >
          <Text style={styles.viewButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Class</Text>
            <Text style={styles.infoValue}>{student.class_}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Section</Text>
            <Text style={styles.infoValue}>{student.sectionclass}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>ID Card No.</Text>
            <Text style={styles.infoValue}>{student.idcardNumber}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Father's Name</Text>
            <Text style={styles.infoValue}>{student.fatherName}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Mother's Name</Text>
            <Text style={styles.infoValue}>{student.motherName}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Contact</Text>
            <Text style={styles.infoValue}>{student.phone}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{student.email}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>PEN Number</Text>
            <Text style={styles.infoValue}>{student.penNumber}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="person-add" size={20} color="#000" />
          <Text style={styles.title}>Admissions</Text>
        </View>
        <TouchableOpacity
          style={styles.newAdmissionButton}
          onPress={() => navigation.navigate('StudentOnboarding')}
        >
          <Ionicons name="person-add" size={16} color="white" />
          <Text style={styles.buttonText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filter Section */}
      <View style={styles.controlsSection}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              placeholder="Search by name, email, or PEN..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Status:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filter}
                  onValueChange={setFilter}
                  style={styles.picker}
                >
                  <Picker.Item label="All" value="all" />
                  <Picker.Item label="Pending" value="pending" />
                  <Picker.Item label="Approved" value="approved" />
                  <Picker.Item label="Rejected" value="rejected" />
                </Picker>
              </View>
            </View>

            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Class:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={classFilter}
                  onValueChange={setClassFilter}
                  style={styles.picker}
                >
                  <Picker.Item label="All" value="" />
                  {classOptions.map(cls => (
                    <Picker.Item key={cls} label={cls} value={cls} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Section:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={sectionFilter}
                  onValueChange={setSectionFilter}
                  style={styles.picker}
                >
                  <Picker.Item label="All" value="" />
                  {sectionOptions.map(sec => (
                    <Picker.Item key={sec} label={sec} value={sec} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Students List */}
      <View style={styles.studentsSection}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Loading students...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {error}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredAdmissions}
            keyExtractor={(item) => item._id || item.id || item.Admission_Number}
            renderItem={renderStudentCard}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="person-add" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No students found</Text>
                <Text style={styles.emptySubText}>Try adjusting your search or filters</Text>
              </View>
            }
            contentContainerStyle={filteredAdmissions.length === 0 ? styles.emptyList : styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Showing {filteredAdmissions.length} of {admissions.length} students
        </Text>
      </View>

      {/* Student Details Modal */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Student Details</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={styles.modalBody}>
                <View style={styles.modalSection}>
                  <Text style={styles.detailLabel}>Name:</Text>
                  {isEditing ? (
                    <TextInput
                      value={editData.studentName || ""}
                      onChangeText={(text) => handleEditChange('studentName', text)}
                      style={styles.input}
                    />
                  ) : (
                    <Text style={styles.detailText}>{selectedStudent?.studentName}</Text>
                  )}

                  <Text style={styles.detailLabel}>Date of Birth:</Text>
                  {isEditing ? (
                    <TextInput
                      value={editData.dateOfBirth?.slice(0, 10) || ""}
                      onChangeText={(text) => handleEditChange('dateOfBirth', text)}
                      style={styles.input}
                      placeholder="YYYY-MM-DD"
                    />
                  ) : (
                    <Text style={styles.detailText}>
                      {selectedStudent?.dateOfBirth ?
                        new Date(selectedStudent.dateOfBirth).toLocaleDateString() : ''}
                    </Text>
                  )}

                  <Text style={styles.detailLabel}>Gender:</Text>
                  {isEditing ? (
                    <TextInput
                      value={editData.gender || ""}
                      onChangeText={(text) => handleEditChange('gender', text)}
                      style={styles.input}
                    />
                  ) : (
                    <Text style={styles.detailText}>{selectedStudent?.gender}</Text>
                  )}

                  <Text style={styles.detailLabel}>Aadhar Number:</Text>
                  {isEditing ? (
                    <TextInput
                      value={editData.aadharNumber || ""}
                      onChangeText={(text) => handleEditChange('aadharNumber', text)}
                      style={styles.input}
                    />
                  ) : (
                    <Text style={styles.detailText}>{selectedStudent?.aadharNumber}</Text>
                  )}

                  <Text style={styles.detailLabel}>PEN Number:</Text>
                  {isEditing ? (
                    <TextInput
                      value={editData.penNumber || ""}
                      onChangeText={(text) => handleEditChange('penNumber', text)}
                      style={styles.input}
                    />
                  ) : (
                    <Text style={styles.detailText}>{selectedStudent?.penNumber}</Text>
                  )}
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.detailLabel}>Class:</Text>
                  {isEditing ? (
                    <TextInput
                      value={editData.class_ || ""}
                      onChangeText={(text) => handleEditChange('class_', text)}
                      style={styles.input}
                    />
                  ) : (
                    <Text style={styles.detailText}>
                      {selectedStudent?.class_ || ""}
                    </Text>
                  )}

                  <Text style={styles.detailLabel}>Section:</Text>
                  {isEditing ? (
                    <TextInput
                      value={editData.sectionclass || ""}
                      onChangeText={(text) => handleEditChange('sectionclass', text)}
                      style={styles.input}
                    />
                  ) : (
                    <Text style={styles.detailText}>
                      {selectedStudent?.sectionclass || ""}
                    </Text>
                  )}

                  <Text style={styles.detailLabel}>Father's Name:</Text>
                  {isEditing ? (
                    <TextInput
                      value={editData.fatherName || ""}
                      onChangeText={(text) => handleEditChange('fatherName', text)}
                      style={styles.input}
                    />
                  ) : (
                    <Text style={styles.detailText}>{selectedStudent?.fatherName}</Text>
                  )}

                  <Text style={styles.detailLabel}>Mother's Name:</Text>
                  {isEditing ? (
                    <TextInput
                      value={editData.motherName || ""}
                      onChangeText={(text) => handleEditChange('motherName', text)}
                      style={styles.input}
                    />
                  ) : (
                    <Text style={styles.detailText}>{selectedStudent?.motherName}</Text>
                  )}

                  <Text style={styles.detailLabel}>Phone:</Text>
                  {isEditing ? (
                    <TextInput
                      value={editData.phone || ""}
                      onChangeText={(text) => handleEditChange('phone', text)}
                      style={styles.input}
                      keyboardType="phone-pad"
                    />
                  ) : (
                    <Text style={styles.detailText}>{selectedStudent?.phone}</Text>
                  )}

                  <Text style={styles.detailLabel}>Email:</Text>
                  {isEditing ? (
                    <TextInput
                      value={editData.email || ""}
                      onChangeText={(text) => handleEditChange('email', text)}
                      style={styles.input}
                      keyboardType="email-address"
                    />
                  ) : (
                    <Text style={styles.detailText}>{selectedStudent?.email}</Text>
                  )}

                  <Text style={styles.detailLabel}>Address:</Text>
                  {isEditing ? (
                    <TextInput
                      value={editData.address || ""}
                      onChangeText={(text) => handleEditChange('address', text)}
                      style={[styles.input, { height: 80 }]}
                      multiline
                    />
                  ) : (
                    <Text style={styles.detailText}>{selectedStudent?.address}</Text>
                  )}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              {isEditing ? (
                <>
                  <Pressable
                    onPress={handleSave}
                    style={[styles.modalButton, styles.saveButton]}
                  >
                    <Text style={styles.modalButtonText}>Save</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setIsEditing(false)}
                    style={[styles.modalButton, styles.cancelButton]}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    onPress={handleEdit}
                    style={[styles.modalButton, styles.editButton]}
                  >
                    <Text style={styles.modalButtonText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleDelete}
                    style={[styles.modalButton, styles.deleteButton]}
                  >
                    <Text style={styles.modalButtonText}>Delete</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleCloseModal}
                    style={[styles.modalButton, styles.closeButton]}
                  >
                    <Text style={styles.modalButtonText}>Close</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
      <Toast />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    flexShrink: 1,
  },
  newAdmissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    flexShrink: 0,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },

  // Controls Section
  controlsSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    marginHorizontal: 12,
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  // Search Styles
  searchContainer: {
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },

  // Filter Styles
  filtersContainer: {
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  filterItem: {
    flex: 1,
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  pickerContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    height: 32,
    justifyContent: 'center',
    width: '100%',
  },
  picker: {
    height: 50,
    color: '#000',
  },

  // Students Section
  studentsSection: {
    flex: 1,
    marginTop: 8,
    marginHorizontal: 12,
  },

  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 18,
    color: '#dc2626',
    textAlign: 'center',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },

  // List Content
  listContent: {
    paddingBottom: 20,
  },

  // Student Card Styles
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  studentPhotoSection: {
    alignItems: 'center',
    marginRight: 12,
  },
  cardStudentPhoto: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  photoActionButton: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: '#f0f9ff',
    borderRadius: 3,
  },
  deletePhotoButton: {
    backgroundColor: '#fef2f2',
  },
  photoActionText: {
    fontSize: 10,
    color: '#3b82f6',
    fontWeight: '500',
  },

  studentMainInfo: {
    flex: 1,
    marginRight: 8,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 3,
  },
  admissionNumber: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
  },
  activeStatus: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  inactiveStatus: {
    fontSize: 10,
    fontWeight: '600',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },

  viewButton: {
    backgroundColor: '#000',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  disabledViewButton: {
    backgroundColor: '#e5e7eb',
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },

  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 12,
    color: '#000',
    fontWeight: '400',
  },

  // Footer
  footer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  footerText: {
    color: '#6b7280',
    fontSize: 12,
  },

  // Legacy table styles (kept for compatibility but not used)
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  head: {
    height: 40,
    backgroundColor: '#f1f5f9'
  },
  headText: {
    margin: 6,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  rowText: {
    margin: 6,
    textAlign: 'center',
  },
  photoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  studentPhoto: {
    width: 32,
    height: 32,
    borderRadius: 4,
  },
  boldText: {
    fontWeight: '600',
  },
  activeText: {
    color: '#16a34a',
    fontWeight: '600',
  },
  inactiveText: {
    color: '#dc2626',
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#e0f2fe',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  actionButtonText: {
    color: '#0369a1',
    fontSize: 12,
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#f1f5f9',
  },
  noResults: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    color: '#64748b',
    fontSize: 16,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  modalBody: {
    padding: 20,
    flexDirection: 'row',
    gap: 20,
  },
  modalSection: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 16,
    color: '#000',
    marginBottom: 8,
    fontWeight: '400',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#000',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
  },
  closeButton: {
    backgroundColor: '#6b7280',
  },
  saveButton: {
    backgroundColor: '#059669',
  },
  cancelButton: {
    backgroundColor: '#6b7280',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default Admissions
