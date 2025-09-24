import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Add Teacher interface for type safety
interface Teacher {
  id: string;
  teacherId: string;
  fullName: string;
  assignedClass: string;
  assignedSection: string;
  specialization: string;
  setSelectedMonthIndex?: string;
  teacherName?: string;
  employeeId?: string;
  department?: string;
}

const TeacherSalaryManagement = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(-1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;
  const [filters, setFilters] = useState<{ assignedClass: string; assignedSection: string }>({
    assignedClass: "",
    assignedSection: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Get schoolId from localStorage (replace with AsyncStorage in real app)
  useEffect(() => {
    // TODO: Replace with AsyncStorage for production
    const fetchSchoolId = async () => {
      const userRaw = await AsyncStorage.getItem("principal_user");
      const user = userRaw ? JSON.parse(userRaw) : null;
      const schools = user?.principal_user?.schools || user?.schools || [];
      const schoolId = schools[0]?.id || null;
      setSchoolId(schoolId);
    };
    fetchSchoolId();
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    const fetchTeachers = async () => {
      try {
        const principal_token = await AsyncStorage.getItem("principal_token");
        const response = await fetch(
          `https://api.pbmpublicschool.in/api/teacher/teachers/by-school/${schoolId}`,
          {
            headers: { Authorization: `Bearer ${principal_token}` },
          }
        );
        const data = await response.json();
        setTeachers(data.teachers || []);
        setLoading(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setLoading(false);
      }
    };
    fetchTeachers();
  }, [schoolId]);

  // Filter teachers based on class and section
  const filteredTeachers = teachers.filter((teacher) => {
    return (
      (filters.assignedClass === "" ||
        teacher.assignedClass === filters.assignedClass) &&
      (filters.assignedSection === "" ||
        teacher.assignedSection === filters.assignedSection)
    );
  });

  // Extract unique classes and sections
  const classes = [
    ...new Set(teachers.map((teacher) => teacher.assignedClass)),
  ]
    .filter(Boolean)
    .sort();
  const sections = [
    ...new Set(teachers.map((teacher) => teacher.assignedSection)),
  ]
    .filter(Boolean)
    .sort();

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTeachers = filteredTeachers.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);

  // Handle Salary Update
  const handleSalaryUpdate = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setModalVisible(true);
    const paidMonths = teacher.setSelectedMonthIndex
      ? teacher.setSelectedMonthIndex.split(",")
      : [];
    const lastPaidIndex = months.findIndex(
      (month) => month === paidMonths[paidMonths.length - 1]
    );
    setSelectedMonthIndex(lastPaidIndex);
  };

  const handleSubmit = async () => {
    if (!selectedTeacher || selectedMonthIndex === -1) return;
    try {
      const paidMonths = months.slice(0, selectedMonthIndex + 1);
      // TODO: Replace with AsyncStorage for production
      const principal_token = null; // await AsyncStorage.getItem("principal_token");
      await fetch(
        `https://api.pbmpublicschool.in/api/teacher/teacher/${selectedTeacher.id}/salaryPaid`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${principal_token}`,
          },
          body: JSON.stringify({ salaryPaid: paidMonths }),
        }
      );
      // Refresh the teacher list after successful update
      setModalVisible(false);
      setSelectedTeacher(null);
      setSelectedMonthIndex(-1);
      Alert.alert("Success", "Salary data updated successfully.");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "An unexpected error occurred.");
      Alert.alert("Error", message || "An unexpected error occurred.");
    }
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      assignedClass: "",
      assignedSection: "",
    });
    setCurrentPage(1);
  };

  if (loading)
    return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;
  if (error) return <Text style={{ color: "red", margin: 20 }}>{error}</Text>;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Teacher Salary Management</Text>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowFilters(!showFilters)}
      >
        <Text style={styles.filterButtonText}>
          {showFilters ? "Hide Filters" : "Show Filters"}
        </Text>
      </TouchableOpacity>
      {showFilters && (
        <View style={styles.filterPanel}>
          <Text>Class:</Text>
          <ScrollView horizontal>
            {classes.map((cls) => (
              <TouchableOpacity
                key={cls}
                style={styles.chip}
                onPress={() => handleFilterChange("assignedClass", cls)}
              >
                <Text>{cls}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text>Section:</Text>
          <ScrollView horizontal>
            {sections.map((sec) => (
              <TouchableOpacity
                key={sec}
                style={styles.chip}
                onPress={() => handleFilterChange("assignedSection", sec)}
              >
                <Text>{sec}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
            <Text>Reset Filters</Text>
          </TouchableOpacity>
        </View>
      )}
      <ScrollView horizontal>
        <View style={{ minWidth: 800 }}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, columnStyles.serial]}>#</Text>
            <Text style={[styles.headerCell, columnStyles.teacherId]}>Teacher ID</Text>
            <Text style={[styles.headerCell, columnStyles.name]}>Name</Text>
            <Text style={[styles.headerCell, columnStyles.classSection]}>Class/Section</Text>
            <Text style={[styles.headerCell, columnStyles.specialization]}>Specialization</Text>
            <Text style={[styles.headerCell, columnStyles.paidMonths]}>Paid Months</Text>
            <Text style={[styles.headerCell, columnStyles.actions]}>Actions</Text>
          </View>
          {currentTeachers.length > 0 ? (
            currentTeachers.map((teacher, idx) => {
              const paidMonths = teacher.setSelectedMonthIndex
                ? teacher.setSelectedMonthIndex.split(",")
                : [];
              const lastPaidIndex = months.findIndex(
                (month) => month === paidMonths[paidMonths.length - 1]
              );
              return (
                <View key={teacher.id} style={styles.row}>
                  <Text style={[styles.cell, columnStyles.serial]}>{indexOfFirstItem + idx + 1}</Text>
                  <Text style={[styles.cell, columnStyles.teacherId]}>{teacher.teacherId}</Text>
                  <Text style={[styles.cell, columnStyles.name]}>{teacher.fullName}</Text>
                  <Text style={[styles.cell, columnStyles.classSection]}>
                    {teacher.assignedClass} - {teacher.assignedSection}
                  </Text>
                  <Text style={[styles.cell, columnStyles.specialization]}>{teacher.specialization}</Text>
                  <View style={[styles.cell, columnStyles.paidMonths, { flexDirection: "row", flexWrap: "wrap" }]}>
                    {months.map((month, index) => {
                      const isPaid = index <= lastPaidIndex;
                      return (
                        <Text
                          key={month}
                          style={[
                            styles.monthChip,
                            isPaid ? styles.paid : styles.unpaid,
                          ]}
                        >
                          {month.substring(0, 3)}
                        </Text>
                      );
                    })}
                  </View>
                  <View style={[styles.cell, columnStyles.actions]}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleSalaryUpdate(teacher)}
                    >
                      <Text style={{ color: "white" }}>Update Salary</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={{ textAlign: "center", margin: 20 }}>
              No teachers found matching your filters
            </Text>
          )}
        </View>
      </ScrollView>
      {/* Pagination */}
      {filteredTeachers.length > itemsPerPage && (
        <View style={styles.pagination}>
          <TouchableOpacity
            onPress={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            style={styles.pageButton}
          >
            <Text>{"<"}</Text>
          </TouchableOpacity>
          <Text style={{ marginHorizontal: 10 }}>
            {currentPage} / {totalPages}
          </Text>
          <TouchableOpacity
            onPress={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={styles.pageButton}
          >
            <Text>{">"}</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Modal for salary update */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Teacher Salary</Text>
            {selectedTeacher && (
              <>
                <Text style={{ fontWeight: "bold" }}>
                  {selectedTeacher.teacherName}
                </Text>
                <Text>
                  Employee ID: {selectedTeacher.employeeId} | Department:{" "}
                  {selectedTeacher.department}
                </Text>
                <Text style={{ marginTop: 10 }}>
                  Select up to which month salary is paid:
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    marginVertical: 10,
                  }}
                >
                  {months.map((month, index) => (
                    <TouchableOpacity
                      key={month}
                      onPress={() => setSelectedMonthIndex(index)}
                      style={[
                        styles.monthButton,
                        selectedMonthIndex >= 0 && index <= selectedMonthIndex
                          ? styles.selectedMonth
                          : null,
                      ]}
                    >
                      <Text>{month}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    marginTop: 20,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      setModalVisible(false);
                      setSelectedTeacher(null);
                      setSelectedMonthIndex(-1);
                    }}
                    style={styles.cancelButton}
                  >
                    <Text>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={selectedMonthIndex === -1}
                    style={[
                      styles.confirmButton,
                      selectedMonthIndex === -1 && { backgroundColor: "#ccc" },
                    ]}
                  >
                    <Text style={{ color: "white" }}>Confirm Salary Update</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const columnStyles = {
  serial: { width: 40 },
  teacherId: { width: 100 },
  name: { width: 120 },
  classSection: { width: 90 },
  specialization: { width: 110 },
  paidMonths: { width: 220 },
  actions: { width: 110 },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  filterButton: {
    backgroundColor: "#e0e7ff",
    padding: 10,
    borderRadius: 8,
    alignSelf: "flex-end",
    marginBottom: 10,
  },
  filterButtonText: { color: "#3730a3", fontWeight: "bold" },
  filterPanel: {
    backgroundColor: "#f3f4f6",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  chip: {
    backgroundColor: "#e5e7eb",
    padding: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  resetButton: {
    backgroundColor: "#fca5a5",
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: "flex-start",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  headerCell: { fontWeight: "bold", color: "#374151", paddingHorizontal: 4 },
  row: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
    alignItems: "center",
    elevation: 1,
  },
  cell: { color: "#374151", paddingHorizontal: 4 },
  monthChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 2,
    marginBottom: 2,
    fontSize: 12,
  },
  paid: { backgroundColor: "#bbf7d0", color: "#166534" },
  unpaid: { backgroundColor: "#e5e7eb", color: "#6b7280" },
  actionButton: {
    backgroundColor: "#2563eb",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    marginLeft: 4,
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  pageButton: {
    backgroundColor: "#e5e7eb",
    padding: 8,
    borderRadius: 8,
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
    padding: 20,
    width: "90%",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  monthButton: {
    backgroundColor: "#e5e7eb",
    padding: 8,
    borderRadius: 8,
    margin: 4,
  },
  selectedMonth: { backgroundColor: "#2563eb" },
  cancelButton: {
    backgroundColor: "#f3f4f6",
    padding: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  confirmButton: { backgroundColor: "#2563eb", padding: 10, borderRadius: 8 },
});

export default TeacherSalaryManagement;
