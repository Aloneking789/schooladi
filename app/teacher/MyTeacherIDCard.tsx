
import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { captureRef } from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import RemoteImage from "../utils/getImageUrl";

// Define the Teacher type for proper type checking
type Teacher = {
  teacherId?: string;
  id?: string;
  fullName?: string;
  subjects?: string;
  email?: string;
  phone?: string;
  joiningDate?: string;
  address?: string;
  photo?: string;
  schools?: any[];
};

type InfoRowProps = { label: string; value: string | undefined };
const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const MyTeacherIDCard = () => {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState("");
  const [schoolLogo, setSchoolLogo] = useState(null);
  const [principalSignature, setPrincipalSignature] = useState(null);
  const cardRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const userRaw = await AsyncStorage.getItem("teacher_user");
        const user = userRaw ? JSON.parse(userRaw) : null;
        const teacherData = user?.teacher_user || user;
        setTeacher(teacherData);
        const schools = teacherData?.schools || [];
        // Set schoolId using the provided logic
        const schoolId = teacherData.schoolId?.toString() || teacherData.user?.schools?.[0]?.id || '';
        // Get school name and logo from AsyncStorage user object first
        const schoolObj = schools[0] || {};
        setSchoolName(schoolObj.Schoolname || schoolObj.schoolName || "");
        setSchoolLogo(schoolObj.schoolLogo || null);
        // Optionally update school logo and principal signature from API if schoolId exists
        if (schoolId) {
          try {
            const res = await fetch(`https://api.pbmpublicschool.in/api/newSchool/school-assets/by-school/${schoolId}`);
            const data = await res.json();
            if (data.schoolLogo) setSchoolLogo(data.schoolLogo);
            if (data.principalSignature) setPrincipalSignature(data.principalSignature);
          } catch { }
        }
      } catch (e) {
        setTeacher(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const downloadCard = async () => {
    if (!cardRef.current) return;
    try {
      const uri = await captureRef(cardRef.current, { format: "png", quality: 1 });
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission required", "Permission to access photos is required!");
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("Success", "ID Card saved to your Photos!");
    } catch (e) {
      Alert.alert("Error", "Could not save card.");
    }
  };

  if (loading) return <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><ActivityIndicator size="large" color="#1976d2" /></View>;
  if (!teacher) return <Text style={{ textAlign: "center", margin: 24 }}>No teacher data found</Text>;

  return (
    <View style={styles.container}>
      <View style={styles.card} ref={cardRef}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <RemoteImage
            path={schoolLogo || undefined}
            style={styles.schoolLogo}
            alt="School Logo"
          />
          <View style={styles.headerText}>
            <Text style={styles.schoolName}>{schoolName?.trim() ? schoolName : "J S I C"}</Text>
            <Text style={styles.cardTitle}>TEACHER ID CARD</Text>
          </View>
          <View style={styles.idBox}>
            <Text style={styles.idText}>ID: {teacher.teacherId || teacher.id}</Text>
          </View>
        </View>
        {/* Body */}
        <View style={styles.cardBody}>
          <View style={styles.infoContainer}>
            <InfoRow label="NAME" value={teacher.fullName} />
            <InfoRow label="SUBJECT" value={teacher.subjects} />
            <InfoRow label="EMAIL" value={teacher.email} />
            <InfoRow label="PHONE" value={teacher.phone} />
            <InfoRow label="JOINED" value={teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString() : "N/A"} />
            <InfoRow label="ADDRESS" value={teacher.address || "N/A"} />
          </View>
          <RemoteImage path={teacher.photo} style={styles.teacherPhoto} alt={teacher.fullName || "Teacher Photo"} />
        </View>
        {/* Footer */}
        <View style={styles.cardFooter}>
          <RemoteImage
            path={principalSignature || undefined}
            style={styles.signature}
            alt="Principal Signature"
          />
          <Text style={styles.principalLabel}>Principal</Text>
        </View>
      </View>
      <TouchableOpacity onPress={downloadCard} style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>Download My ID Card</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
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
    backgroundColor: "#f78316ff",
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
    color: "#f0cc15ff",
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
  primaryBtn: {
    backgroundColor: "#f1d00fff",
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
});

export default MyTeacherIDCard;
