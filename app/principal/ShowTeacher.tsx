import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

type Teacher = {
  id: string;
  fullName: string;
  teacherId?: string;
  email?: string;
  phone?: string;
  subjects?: string;
  specialization?: string;
  assignedClass?: string;
  assignedSection?: string;
  joiningDate?: string;
  setSelectedMonthIndex?: string;
};

const Teachers = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState("");
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);

  // Replace with your async storage or secure store logic
  const schoolId = "YOUR_SCHOOL_ID";
  const principal_token = "YOUR_TOKEN";

  useEffect(() => {
    if (!schoolId) {
      setTeachers([]);
      setLoading(false);
      return;
    }
    fetch(
      `https://api.pbmpublicschool.in/api/teacher/teachers/by-school/${schoolId}`,
      {
        headers: {
          Authorization: `Bearer ${principal_token}`,
        },
      }
    )
      .then((res) => res.json())
      .then((data) => {
        setTeachers(data.teachers || []);
        setLoading(false);
      })
      .catch((err) => {
        setTeachers([]);
        setLoading(false);
        Alert.alert("Error", "Failed to fetch teachers");
      });
  }, [schoolId, principal_token]);

  const handleDelete = (id: string) => {
    fetch(`https://api.pbmpublicschool.in/api/teacher/teacher/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${principal_token}`,
      },
    })
      .then((res) => {
        if (res.ok) {
          Alert.alert("Success", "Teacher deleted successfully");
          setTeachers((prev) => prev.filter((teacher) => teacher.id !== id));
        } else {
          Alert.alert("Error", "Failed to delete teacher");
        }
      })
      .catch(() => Alert.alert("Error", "Error deleting teacher"));
  };

  const filteredTeachers = (teachers || []).filter((teacher) =>
    teacher.fullName.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name="people" size={28} color="#007bff" />
        <Text style={styles.headerText}>Teachers</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => Alert.alert("Navigate", "Go to Add Teacher screen")}
        >
          <Ionicons name="person-add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Teacher</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Search teachers..."
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filteredTeachers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.teacherCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.teacherName}>{item.fullName}</Text>
              <Text style={styles.teacherInfo}>Subject: {item.subjects}</Text>
              <Text style={styles.teacherInfo}>Email: {item.email}</Text>
              <Text style={styles.teacherInfo}>Phone: {item.phone}</Text>
              <Text style={styles.teacherInfo}>
                Joined: {item.joiningDate ? new Date(item.joiningDate).toLocaleDateString() : "N/A"}
              </Text>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  setSelectedTeacher(item);
                  setIsViewModalOpen(true);
                }}
              >
                <Ionicons name="eye" size={22} color="#22c55e" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => handleDelete(item.id)}
              >
                <Ionicons name="trash" size={22} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 20 }}>No teachers found.</Text>
        }
      />

      {/* View Teacher Details Modal */}
      <Modal
        visible={isViewModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsViewModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              {selectedTeacher && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Teacher Details</Text>
                    <TouchableOpacity onPress={() => setIsViewModalOpen(false)}>
                      <Ionicons name="close" size={28} color="#888" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Full Name:</Text>
                    <Text style={styles.detailValue}>{selectedTeacher.fullName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Teacher ID:</Text>
                    <Text style={styles.detailValue}>{selectedTeacher.teacherId}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email:</Text>
                    <Text style={styles.detailValue}>{selectedTeacher.email}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phone:</Text>
                    <Text style={styles.detailValue}>{selectedTeacher.phone}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Subjects:</Text>
                    <Text style={styles.detailValue}>{selectedTeacher.subjects}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Specialization:</Text>
                    <Text style={styles.detailValue}>{selectedTeacher.specialization}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Class/Section:</Text>
                    <Text style={styles.detailValue}>
                      {selectedTeacher.assignedClass || "N/A"} - {selectedTeacher.assignedSection || "N/A"}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Joining Date:</Text>
                    <Text style={styles.detailValue}>
                      {selectedTeacher.joiningDate
                        ? new Date(selectedTeacher.joiningDate).toLocaleDateString()
                        : "N/A"}
                    </Text>
                  </View>
                  {selectedTeacher.setSelectedMonthIndex && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={styles.detailLabel}>Salary Paid Months:</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 4 }}>
                        {selectedTeacher.setSelectedMonthIndex
                          .split(",")
                          .map((month) => (
                            <View
                              key={month}
                              style={styles.monthBadge}
                            >
                              <Text style={styles.monthBadgeText}>{month}</Text>
                            </View>
                          ))}
                      </View>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  headerText: { fontSize: 22, fontWeight: "bold", color: "#222", flex: 1, marginLeft: 8 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007bff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: { color: "#fff", fontWeight: "bold", marginLeft: 6 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  teacherCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
    elevation: 2,
  },
  teacherName: { fontSize: 16, fontWeight: "bold", color: "#222" },
  teacherInfo: { fontSize: 14, color: "#555" },
  actionRow: { flexDirection: "row", alignItems: "center", marginLeft: 8 },
  iconButton: { marginHorizontal: 4, padding: 4 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
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
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#222" },
  detailRow: { flexDirection: "row", marginBottom: 8 },
  detailLabel: { fontWeight: "bold", color: "#555", width: 120 },
  detailValue: { color: "#222", flex: 1 },
  monthBadge: {
    backgroundColor: "#bbf7d0",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  monthBadgeText: { color: "#166534", fontSize: 12 },
});

export default Teachers;