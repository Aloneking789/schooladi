import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from "axios";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const DropBox = () => {
  const [droppedStudents, setDroppedStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  useEffect(() => {
    const getSchoolId = async () => {
      const userRaw = await AsyncStorage.getItem("user");
      const user = userRaw ? JSON.parse(userRaw) : null;
      const schools = user?.user?.schools || user?.schools || [];
      setSchoolId(schools[0]?.id || null);
    };
    getSchoolId();
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    fetchDroppedStudents();
  }, [schoolId]);

  const fetchDroppedStudents = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("principal_token");
      const res = await axios.get(
        `https://api.pbmpublicschool.in/api/admission/students/by-school/${schoolId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const dropped = (res.data.students || []).filter(
        (student: any) => student.isStudentmarkdrop === true || student.isStudentmarkdrop === "true"
      );
      setDroppedStudents(dropped);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch dropped students");
    }
    setLoading(false);
  };

  const handleRevoke = async (studentId: string) => {
    Alert.alert(
      "Revoke Drop",
      "Revoke drop for this student?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("principal_token");
              await axios.patch(
                `https://api.pbmpublicschool.in/api/sessions/students/${studentId}/revoke`,
                {},
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );
              Alert.alert("Success", "Student restored!");
              fetchDroppedStudents();
            } catch (err) {
              Alert.alert("Error", "Failed to revoke drop");
            }
          },
        },
      ]
    );
  };

  const handleDelete = async (studentId: string) => {
    Alert.alert(
      "Delete Student",
      "Delete this dropped student permanently?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("principal_token");
              await axios.delete(
                `https://api.pbmpublicschool.in/api/admission/students/${studentId}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );
              Alert.alert("Success", "Student deleted!");
              fetchDroppedStudents();
            } catch (err) {
              Alert.alert("Error", "Failed to delete student");
            }
          },
        },
      ]
    );
  };

  const renderStudent = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.row}>
      <Text style={styles.cell}>{index + 1}</Text>
      <Text style={styles.cell}>{item.studentName}</Text>
      <Text style={styles.cell}>{item.Admission_Number}</Text>
      <Text style={styles.cell}>{item.class_}</Text>
      <Text style={styles.cell}>{item.sectionclass}</Text>
      <Text style={styles.cell}>{item.fatherName}</Text>
      <Text style={styles.cell}>{item.phone}</Text>
      <View style={[styles.cell, { flexDirection: 'row', gap: 8 }]}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#16a34a' }]} onPress={() => handleRevoke(item.id || item._id)}>
          <Text style={styles.actionBtnText}>Revoke</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#dc2626' }]} onPress={() => handleDelete(item.id || item._id)}>
          <Text style={styles.actionBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Drop Box (Dropped Students)</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 32 }} />
      ) : droppedStudents.length === 0 ? (
        <Text style={styles.noData}>No dropped students found.</Text>
      ) : (
        <View style={styles.tableWrapper}>
          <View style={styles.headerRow}>
            <Text style={styles.headerCell}>#</Text>
            <Text style={styles.headerCell}>Name</Text>
            <Text style={styles.headerCell}>Admission No.</Text>
            <Text style={styles.headerCell}>Class</Text>
            <Text style={styles.headerCell}>Section</Text>
            <Text style={styles.headerCell}>Father</Text>
            <Text style={styles.headerCell}>Phone</Text>
            <Text style={styles.headerCell}>Actions</Text>
          </View>
          <FlatList
            data={droppedStudents}
            keyExtractor={(item) => (item.id || item._id).toString()}
            renderItem={renderStudent}
          />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  noData: { color: '#888', textAlign: 'center', marginTop: 32 },
  tableWrapper: { backgroundColor: '#fff', borderRadius: 12, padding: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  headerRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e5e7eb', paddingVertical: 8 },
  headerCell: { flex: 1, fontWeight: 'bold', color: '#222', textAlign: 'center' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', paddingVertical: 8 },
  cell: { flex: 1, color: '#222', textAlign: 'center', fontSize: 13 },
  actionBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, marginHorizontal: 2 },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
});

export default DropBox;