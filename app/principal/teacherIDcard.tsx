import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as MediaLibrary from "expo-media-library";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator, Alert,
    FlatList, Image,
    Modal, StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { captureRef } from "react-native-view-shot";
import RemoteImage from "../utils/getImageUrl";
// import AdmissionsSkeleton from "../../Loading/AdmissionsLoading"; // RN-compatible loader

const InfoRow: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

type Teacher = {
  id: string | number;
  teacherId?: string | number;
  fullName?: string;
  subjects?: string;
  email?: string;
  phone?: string;
  photo?: string;
  joiningDate?: string;
  address?: string;
};

const TeacherIDCard = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [schoolId, setSchoolId] = useState<string | number | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [principalSignature, setPrincipalSignature] = useState<string | null>(null);

  const cardRef = useRef<View>(null);

  useEffect(() => {
    (async () => {
      const userRaw = await AsyncStorage.getItem("principal_user");
      const user = userRaw ? JSON.parse(userRaw) : null;
      const schools = user?.principal_user?.schools || user?.schools || [];
      const id = schools[0]?.id;
      const name = schools[0]?.Schoolname || schools[0]?.schoolName || "";
      setSchoolId(id);
      setSchoolName(name);
    })();
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      try {
        const token = await AsyncStorage.getItem("principal_token");
        const res = await axios.get(
          `https://api.pbmpublicschool.in/api/teacher/teachers/by-school/${schoolId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setTeachers(res.data.teachers || []);
      } catch (e) {
        setTeachers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      try {
        const res = await fetch(
          `https://api.pbmpublicschool.in/api/newSchool/school-assets/by-school/${schoolId}`
        );
        const data = await res.json();
        setSchoolLogo(data.schoolLogo);
        setPrincipalSignature(data.principalSignature);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [schoolId]);

  const openModal = (teacher: React.SetStateAction<Teacher | null>) => {
    setSelectedTeacher(teacher);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedTeacher(null);
  };

  const downloadCard = async () => {
    if (!cardRef.current) return;
    try {
      const uri = await captureRef(cardRef.current, {
        format: "png",
        quality: 1,
      });

      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission required", "Permission to access photos is required!");
        return;
      }

      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("Success", "ID Card saved to your Photos!");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not save card.");
    }
  };

  const renderTeacher = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.row}>
      <Text style={styles.serial}>{index + 1}</Text>
      <RemoteImage
        path={item.photo}
        style={styles.avatar}
        resizeMode="cover"
        alt={item.fullName}
      />
      <View style={styles.infoBlock}>
        <Text style={styles.nameText}>{item.fullName || "No Name"}</Text>
        <Text style={styles.subjectText}>{item.subjects}</Text>
        <Text style={styles.emailText}>{item.email}</Text>
        <Text style={styles.phoneText}>{item.phone}</Text>
        <Text style={styles.idTextSmall}>ID: {item.teacherId || item.id}</Text>
      </View>
      <TouchableOpacity onPress={() => openModal(item)} style={styles.downloadBtn}>
        <Text style={styles.downloadText}>Download</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#1976d2" />
    </View>
  );

  return (
    <View style={styles.container}>
      {teachers.length === 0 ? (
        <Text>No teachers found</Text>
      ) : (
        <FlatList
          data={teachers}
          keyExtractor={t => t.id.toString()}
          renderItem={renderTeacher}
        />
      )}

      {!!selectedTeacher && (
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.card} ref={cardRef}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  {/* <Image source={{ uri: schoolLogo }} style={styles.schoolLogo} /> */}
                  <Image source={schoolLogo ? { uri: schoolLogo } : undefined} style={styles.schoolLogo} />
                  <View style={styles.headerText}>
                    <Text style={styles.schoolName}>{schoolName || "SCHOOL NAME"}</Text>
                    <Text style={styles.cardTitle}>TEACHER ID CARD</Text>
                  </View>
                  <View style={styles.idBox}>
                    <Text style={styles.idText}>
                      ID: {selectedTeacher.teacherId || selectedTeacher.id}
                    </Text>
                  </View>
                </View>

                {/* Body */}
                <View style={styles.cardBody}>
                  <View style={styles.infoContainer}>
                    <InfoRow label="NAME" value={selectedTeacher.fullName} />
                    <InfoRow label="SUBJECT" value={selectedTeacher.subjects} />
                    <InfoRow label="EMAIL" value={selectedTeacher.email} />
                    <InfoRow label="PHONE" value={selectedTeacher.phone} />
                    <InfoRow label="JOINED" value={
                      selectedTeacher.joiningDate
                        ? new Date(selectedTeacher.joiningDate).toLocaleDateString()
                        : "N/A"
                    } />
                    <InfoRow label="ADDRESS" value={selectedTeacher.address || "N/A"} />
                  </View>
                  <Image
                    source={{ uri: selectedTeacher.photo }}
                    style={styles.teacherPhoto}
                  />
                </View>

                {/* Footer */}
                <View style={styles.cardFooter}>
                  {principalSignature && (
                    <Image
                      source={{ uri: principalSignature }}
                      style={styles.signature}
                    />
                  )}
                  <Text style={styles.principalLabel}>Principal</Text>
                </View>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={downloadCard} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>Download ID Card</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={closeModal} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f8f8f8",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginBottom: 8,
    borderRadius: 8,
    padding: 10,
    elevation: 2,
  },
  serial: {
    width: 22,
    textAlign: "center",
    fontWeight: "bold",
    color: "#1976d2",
    fontSize: 15,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: "#e0e0e0",
  },
  infoBlock: {
    flex: 1,
    marginLeft: 8,
    justifyContent: "center",
  },
  nameText: {
    fontWeight: "bold",
    fontSize: 15,
    color: "#222",
  },
  subjectText: {
    color: "#555",
    fontSize: 13,
    marginTop: 2,
  },
  emailText: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },
  phoneText: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },
  idTextSmall: {
    color: "#aaa",
    fontSize: 11,
    marginTop: 2,
  },
  downloadBtn: {
    backgroundColor: "#1976d2",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  downloadText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    width: "90%",
    alignItems: "center",
  },
  card: {
    width: 320,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 18,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1976d2",
    padding: 10,
  },
  schoolLogo: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: "#fff",
  },
  headerText: {
    flex: 1,
    alignItems: "center",
  },
  schoolName: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 2,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 13,
    letterSpacing: 1,
  },
  idBox: {
    backgroundColor: "#fff",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  idText: {
    color: "#1976d2",
    fontWeight: "bold",
    fontSize: 13,
  },
  cardBody: {
    flexDirection: "row",
    padding: 12,
    alignItems: "center",
  },
  infoContainer: {
    flex: 2,
    marginRight: 10,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  infoLabel: {
    fontWeight: "bold",
    width: 80,
    color: "#444",
    fontSize: 13,
  },
  infoValue: {
    flex: 1,
    color: "#222",
    fontSize: 13,
  },
  teacherPhoto: {
    width: 80,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#e0e0e0",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#eee",
  },
  signature: {
    width: 60,
    height: 28,
    resizeMode: "contain",
    marginRight: 10,
  },
  principalLabel: {
    fontSize: 13,
    color: "#555",
    fontWeight: "bold",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  primaryBtn: {
    backgroundColor: "#1976d2",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 6,
    marginRight: 10,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  secondaryBtn: {
    backgroundColor: "#eee",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 6,
  },
  secondaryBtnText: {
    color: "#1976d2",
    fontWeight: "bold",
    fontSize: 15,
  },
});

export default TeacherIDCard;
