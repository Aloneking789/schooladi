import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

const MessageModal = ({ visible, message, type, onConfirm, onCancel, showConfirmCancelButtons }: any) => {
  if (!visible) return null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={[styles.modalTitle, type === 'error' ? { color: 'red' } : type === 'success' ? { color: 'green' } : {}]}>
            {type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Confirmation'}
          </Text>
          <Text style={styles.modalMessage}>{message}</Text>
          <View style={styles.modalBtnRow}>
            {showConfirmCancelButtons ? (
              <>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#dc2626' }]} onPress={onConfirm}>
                  <Text style={styles.modalBtnText}>Confirm</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#e5e7eb' }]} onPress={onCancel}>
                  <Text style={[styles.modalBtnText, { color: '#222' }]}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#222' }]} onPress={onConfirm}>
                <Text style={styles.modalBtnText}>OK</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const EnquiryManagement = () => {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [filteredEnquiries, setFilteredEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'info' | 'error' | 'success'>('info');
  const [showModalButtons, setShowModalButtons] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const deleteEnquiryIdRef = useRef<string | null>(null);

  const [search, setSearch] = useState('');

  const API_BASE_URL = "https://api.pbmpublicschool.in/api/enquiry";

  const fetchEnquiries = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem("principal_token");
      const response = await fetch(API_BASE_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      setEnquiries(data);
      setFilteredEnquiries(data);
    } catch (err: any) {
      setError("Failed to load enquiries. Please ensure the API is running and accessible.");
      setModalMessage("Failed to load enquiries. Please ensure the API is running and accessible. Error: " + err.message);
      setModalType("error");
      setShowModalButtons(false);
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  useEffect(() => {
    let filtered = enquiries;
    if (selectedClass !== 'All') {
      filtered = filtered.filter((enquiry: any) => String(enquiry.class) === String(selectedClass));
    }
    if (search.trim()) {
      filtered = filtered.filter((enquiry: any) =>
        enquiry.name?.toLowerCase().includes(search.toLowerCase()) ||
        enquiry.email?.toLowerCase().includes(search.toLowerCase()) ||
        enquiry.mobile?.toLowerCase().includes(search.toLowerCase())
      );
    }
    setFilteredEnquiries(filtered);
  }, [selectedClass, enquiries, search]);

  const uniqueClasses = useMemo(() => {
    const classes = new Set(enquiries.map((enquiry: any) => enquiry.class));
    const sortedClasses = Array.from(classes).filter((cls) => cls != null && String(cls).trim() !== "").sort((a, b) => parseInt(a) - parseInt(b));
    return ["All", ...sortedClasses];
  }, [enquiries]);

  const handleConfirmDelete = (id: string) => {
    deleteEnquiryIdRef.current = id;
    setModalMessage("Are you sure you want to delete this enquiry? This action cannot be undone.");
    setModalType("info");
    setShowModalButtons(true);
    setModalVisible(true);
  };

  const executeDelete = async () => {
    setModalMessage(null);
    setModalVisible(false);
    const idToDelete = deleteEnquiryIdRef.current;
    if (!idToDelete) return;
    try {
      const token = await AsyncStorage.getItem("principal_token");
      const response = await fetch(`${API_BASE_URL}/${idToDelete}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      fetchEnquiries();
      setModalMessage("Enquiry deleted successfully!");
      setModalType("success");
      setShowModalButtons(false);
      setModalVisible(true);
    } catch (err: any) {
      setModalMessage(`Failed to delete enquiry. Error: ${err.message}`);
      setModalType("error");
      setShowModalButtons(false);
      setModalVisible(true);
    } finally {
      deleteEnquiryIdRef.current = null;
    }
  };

  const handleCancelModal = () => {
    setModalMessage(null);
    setModalVisible(false);
    deleteEnquiryIdRef.current = null;
  };

  // Render loading state
  if (loading) {
    return (
      <View style={styles.centered}><ActivityIndicator size="large" color="#2563eb" /><Text style={{ marginTop: 16 }}>Loading enquiries...</Text></View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredEnquiries}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>Enquiry Management</Text>
            <View style={styles.filterRow}>
              <View style={styles.pickerWrapper}>
                <Text style={styles.label}>Class:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {uniqueClasses.map((cls) => (
                    <TouchableOpacity
                      key={cls}
                      style={[styles.classBtn, selectedClass === cls && styles.classBtnActive]}
                      onPress={() => setSelectedClass(cls)}
                    >
                      <Text style={selectedClass === cls ? styles.classBtnTextActive : styles.classBtnText}>
                        {cls === 'All' ? 'All Classes' : `Class ${cls}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Search by name, email, or mobile"
                value={search}
                onChangeText={setSearch}
              />
            </View>
            {error && <Text style={styles.error}>{error}</Text>}
            <View style={styles.tableWrapper}>
              <View style={styles.headerRow}>
                <Text style={styles.headerCell}>Sr.No</Text>
                <Text style={styles.headerCell}>Name</Text>
                <Text style={styles.headerCell}>Email</Text>
                <Text style={styles.headerCell}>Mobile</Text>
                <Text style={styles.headerCell}>Class</Text>
                <Text style={styles.headerCell}>Stream</Text>
                <Text style={styles.headerCell}>Created At</Text>
                <Text style={styles.headerCell}>Action</Text>
              </View>
            </View>
          </>
        }
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.cell}>{index + 1}</Text>
            <Text style={styles.cell}>{item.name}</Text>
            <Text style={styles.cell}>{item.email}</Text>
            <Text style={styles.cell}>{item.mobile}</Text>
            <Text style={styles.cell}>{item.class}</Text>
            <Text style={styles.cell}>{item.stream || 'N/A'}</Text>
            <Text style={styles.cell}>{new Date(item.createdAt).toLocaleString()}</Text>
            <TouchableOpacity onPress={() => handleConfirmDelete(item.id)} style={styles.deleteBtn}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.noData}>No enquiries found for the selected filter.</Text>}
        ListFooterComponent={
          filteredEnquiries.length > 0
            ? <Text style={styles.foundText}>{filteredEnquiries.length} found.</Text>
            : null
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />
      <MessageModal
        visible={!!modalMessage}
        message={modalMessage}
        type={modalType}
        onConfirm={showModalButtons ? executeDelete : handleCancelModal}
        onCancel={handleCancelModal}
        showConfirmCancelButtons={showModalButtons}
      />
    </View>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  pickerWrapper: { flex: 1, marginRight: 8 },
  label: { fontWeight: 'bold', marginBottom: 4 },
  classBtn: { paddingVertical: 0, paddingHorizontal: 5, borderRadius: 8, backgroundColor: '#e5e7eb', marginRight: 0, marginBottom: 8, alignItems: 'center', justifyContent: 'center' },
  classBtnActive: { backgroundColor: '#2563eb' },
  classBtnText: { color: '#222' },
  classBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, backgroundColor: 'white', minWidth: 120 },
  tableWrapper: { backgroundColor: '#fff', borderRadius: 12, padding: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  headerRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e5e7eb', paddingVertical: 8 },
  headerCell: { flex: 1, fontWeight: 'bold', color: '#222', textAlign: 'center' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', paddingVertical: 8 },
  cell: { flex: 1, color: '#222', textAlign: 'center', fontSize: 13 },
  deleteBtn: { backgroundColor: '#dc2626', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, alignItems: 'center' },
  noData: { color: '#888', textAlign: 'center', marginTop: 32 },
  foundText: { color: '#666', fontWeight: 'bold', marginTop: 8, textAlign: 'right' },
  error: { color: 'red', marginBottom: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 320, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  modalMessage: { fontSize: 15, color: '#444', marginBottom: 16, textAlign: 'center' },
  modalBtnRow: { flexDirection: 'row', gap: 12 },
  modalBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8, marginHorizontal: 4 },
  modalBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});

export default EnquiryManagement;
