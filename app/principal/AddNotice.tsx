import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// Simple toast replacement using Alert
const toast = (message: string) => Alert.alert('Notice', message);

type Notice = {
  id: string;
  title: string;
  content: string;
  forClass?: string;
  pdfUrl?: string;
  recipient: 'ALL' | 'STUDENT' | 'STAFF';
  tag?: string;
  createdAt: string;
  publishedBy?: {
    fullName: string;
    role: string;
  };
};

const AddNotice = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(false);
  type PdfFile = {
    uri: string;
    name: string;
    size?: number;
    mimeType?: string;
  };

  const [pdfFile, setPdfFile] = useState<PdfFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [schoolId, setSchoolId] = useState<string>('1');

  useEffect(() => {
    // Get schoolId from principal user data when component mounts
    const getSchoolId = async () => {
      try {
        const userDataRaw = await AsyncStorage.getItem('principal_user');
        if (userDataRaw) {
          const userData = JSON.parse(userDataRaw);
          setSchoolId(userData.schoolId?.toString() || '1');
        }
      } catch (error) {
        console.error('Error getting school ID:', error);
      }
    };
    getSchoolId();
  }, []);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ 
    title: string; 
    text: string; 
    tag: string; 
    recipient: 'ALL' | 'STUDENT' | 'STAFF';
  }>();

  const recipientOptions = [
    { label: 'All', value: 'ALL' },
    { label: 'Students Only', value: 'STUDENT' },
    { label: 'Staff Only', value: 'STAFF' },
  ];

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('principal_token');
      const res = await fetch(`https://1rzlgxk8-5001.inc1.devtunnels.ms/api/notices/notices?schoolId=${schoolId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setNotices(data.notices || []);
    } catch (error) {
      toast('Error fetching notices');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (result.assets && result.assets.length > 0) {
      setPdfFile(result.assets[0]);
    }
  };

  const onSubmit = async (data: { 
    title: string; 
    text: string; 
    tag: string; 
    recipient: 'ALL' | 'STUDENT' | 'STAFF';
  }) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('text', data.text);
    formData.append('tag', data.tag);
    formData.append('recipient', data.recipient);
    formData.append('schoolId', schoolId);

    // Only append PDF if one was selected
    if (pdfFile) {
      formData.append('pdf', {
        uri: pdfFile.uri,
        type: 'application/pdf',
        name: pdfFile.name,
      } as any);
    }

    try {
      const token = await AsyncStorage.getItem('principal_token');
      const res = await fetch('https://1rzlgxk8-5001.inc1.devtunnels.ms/api/notices/notices', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const responseData = await res.json();

      if (!res.ok) {
        // Check for specific error types
        if (res.status === 404) {
          throw new Error('API endpoint not found. Please contact support.');
        }
        if (res.status === 401) {
          throw new Error('Session expired. Please login again.');
        }
        // If there's a PDF-related error but notice data is valid
        if (pdfFile && responseData.error && responseData.error.includes('PDF')) {
          toast('Notice created but PDF upload failed. You can add the PDF later.');
          reset({ title: '', text: '', tag: '', recipient: 'ALL' });
          setPdfFile(null);
          setAddModalVisible(false);
          fetchNotices();
          return;
        }
        throw new Error(responseData.message || `Failed to add notice: ${res.status} ${res.statusText}`);
      }

      toast('Notice uploaded successfully!');
      reset({ title: '', text: '', tag: '', recipient: 'ALL' });
      setPdfFile(null);
      setAddModalVisible(false);
      fetchNotices();
    } catch (err: any) {
      toast(err.message);
    }
  };

  const confirmDelete = (notice: Notice) => {
    Alert.alert(
      'Delete Notice',
      `Are you sure you want to delete the notice "${notice.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(notice.id) },
      ]
    );
  };

  const handleDelete = async (id: string) => {
    try {
      setDeleting(true);
      const token = await AsyncStorage.getItem('principal_token');
      const res = await fetch(`https://1rzlgxk8-5001.inc1.devtunnels.ms/api/notices/notices/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete notice');
      }

      toast('Notice deleted successfully!');
      await fetchNotices();
    } catch (err: any) {
      toast(typeof err.message === 'string' ? err.message : 'Failed to delete notice');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Notices & Circulars</Text>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setAddModalVisible(true)}
      >
        <Feather name="plus-circle" size={20} color="white" />
        <Text style={styles.addButtonText}>Add Notice</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="black" />
      ) : (
        <FlatList
          data={notices}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          renderItem={({ item }: { item: Notice }) => (
            <TouchableOpacity 
              style={styles.noticeCard}
              onPress={() => {
                setSelectedNotice(item);
                setViewModalVisible(true);
              }}
            >
              <View style={styles.noticeHeader}>
                <Text style={styles.noticeTitle}>{item.title}</Text>
                <Text style={styles.noticeDate}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text numberOfLines={2} style={styles.noticeContent}>
                {item.content}
              </Text>
              <View style={styles.noticeInfo}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>For:</Text>
                  <View style={[styles.recipientBadge, 
                    item.recipient === 'STAFF' ? styles.staffBadge : 
                    item.recipient === 'STUDENT' ? styles.studentBadge : 
                    styles.allBadge
                  ]}>
                    <Text style={styles.badgeText}>{item.recipient || 'ALL'}</Text>
                  </View>
                </View>
                {item.tag && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Tag:</Text>
                    <View style={styles.tagBadge}>
                      <Text style={styles.tagText}>{item.tag}</Text>
                    </View>
                  </View>
                )}
              </View>
              <View style={styles.actions}>
                {item.pdfUrl && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      if (item.pdfUrl) {
                        // You can use WebBrowser.openBrowserAsync or FileSystem.downloadAsync
                      }
                    }}
                  >
                    <Feather name="download" size={18} color="#2563eb" />
                    <Text style={styles.actionText}>Download PDF</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={(e) => {
                    e.stopPropagation();
                    confirmDelete(item);
                  }}
                  disabled={deleting}
                >
                  <Feather name="trash-2" size={18} color="#dc2626" />
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Add Notice Modal */}
      <Modal visible={addModalVisible} animationType="slide">
        <ScrollView style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add New Notice</Text>

          <Controller
            control={control}
            name="title"
            rules={{ required: 'Title is required' }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                placeholder="Title"
                value={value}
                onChangeText={onChange}
                style={styles.input}
              />
            )}
          />
          {typeof errors.title?.message === 'string' && <Text style={styles.error}>{errors.title.message}</Text>}

          <Controller
            control={control}
            name="text"
            render={({ field: { onChange, value } }) => (
              <TextInput
                placeholder="Text"
                value={value}
                onChangeText={onChange}
                style={styles.textarea}
                multiline
              />
            )}
          />

          <Controller
            control={control}
            name="tag"
            rules={{ required: 'Tag is required' }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                placeholder="Tag (e.g., Events, Exams)"
                value={value}
                onChangeText={onChange}
                style={styles.input}
              />
            )}
          />
          {typeof errors.tag?.message === 'string' && <Text style={styles.error}>{errors.tag.message}</Text>}



          <Controller
            control={control}
            name="recipient"
            rules={{ required: 'Recipient is required' }}
            defaultValue="ALL"
            render={({ field: { onChange, value } }) => (
              <View style={styles.recipientContainer}>
                <Text style={styles.recipientLabel}>Select Recipient:</Text>
                <View style={styles.recipientOptions}>
                  {recipientOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.recipientOption,
                        value === option.value && styles.recipientOptionSelected,
                      ]}
                      onPress={() => onChange(option.value)}
                    >
                      <View style={[
                        styles.checkbox,
                        value === option.value && styles.checkboxSelected,
                      ]}>
                        {value === option.value && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text style={[
                        styles.recipientText,
                        value === option.value && styles.recipientTextSelected,
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          />
          {typeof errors.recipient?.message === 'string' && <Text style={styles.error}>{errors.recipient.message}</Text>}

          <View style={styles.uploadContainer}>
            <TouchableOpacity style={styles.uploadButton} onPress={handlePickDocument}>
              <Text style={{ color: 'white' }}>{pdfFile ? pdfFile.name : 'Upload PDF (Optional)'}</Text>
            </TouchableOpacity>
            {pdfFile && (
              <TouchableOpacity 
                style={styles.clearButton} 
                onPress={() => setPdfFile(null)}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit(onSubmit)}>
            <Text style={{ color: 'white' }}>Submit Notice</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setAddModalVisible(false)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {/* View Notice Modal */}
      <Modal visible={viewModalVisible} animationType="slide" transparent>
        <View style={styles.viewModalOverlay}>
          <View style={styles.viewModalContainer}>
            <View style={styles.viewModalHeader}>
              <View style={styles.viewModalTitleContainer}>
                <Text style={styles.viewModalTitle}>{selectedNotice?.title}</Text>
                {selectedNotice?.publishedBy && (
                  <Text style={styles.viewModalAuthor}>
                    by {selectedNotice.publishedBy.fullName}
                  </Text>
                )}
              </View>
              <TouchableOpacity 
                onPress={() => setViewModalVisible(false)}
                style={styles.closeButton}
              >
                <Feather name="x" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.viewModalBody}>
              <View style={styles.viewModalContent}>
                <Text style={styles.viewModalText}>{selectedNotice?.content}</Text>
                
                <View style={styles.viewModalSection}>
                  <Text style={styles.viewModalSectionTitle}>Details</Text>
                  <View style={styles.viewModalDetailRow}>
                    <Text style={styles.viewModalLabel}>Recipient:</Text>
                    <View style={[styles.recipientBadge, 
                      selectedNotice?.recipient === 'STAFF' ? styles.staffBadge : 
                      selectedNotice?.recipient === 'STUDENT' ? styles.studentBadge : 
                      styles.allBadge
                    ]}>
                      <Text style={styles.badgeText}>{selectedNotice?.recipient || 'ALL'}</Text>
                    </View>
                  </View>
                  {selectedNotice?.tag && (
                    <View style={styles.viewModalDetailRow}>
                      <Text style={styles.viewModalLabel}>Tag:</Text>
                      <View style={styles.tagBadge}>
                        <Text style={styles.tagText}>{selectedNotice.tag}</Text>
                      </View>
                    </View>
                  )}
                  <View style={styles.viewModalDetailRow}>
                    <Text style={styles.viewModalLabel}>Date:</Text>
                    <Text style={styles.viewModalDate}>
                      {selectedNotice?.createdAt ? new Date(selectedNotice.createdAt).toLocaleDateString() : ''}
                    </Text>
                  </View>
                </View>

                {selectedNotice?.pdfUrl && (
                  <View style={styles.viewModalSection}>
                    <TouchableOpacity
                      style={styles.viewModalPdfButton}
                      onPress={() => {
                        // Handle PDF download/view
                      }}
                    >
                      <Feather name="file-text" size={20} color="#fff" />
                      <Text style={styles.viewModalPdfButtonText}>View PDF</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, backgroundColor: '#fff' },
  header: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  noticeHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 8 
  },
  noticeDate: { 
    fontSize: 12, 
    color: '#6B7280' 
  },
  noticeContent: { 
    fontSize: 14, 
    color: '#374151',
    marginBottom: 12 
  },
  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 4 
  },
  infoLabel: { 
    fontSize: 12, 
    color: '#6B7280',
    marginRight: 8,
    width: 40 
  },
  recipientBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  staffBadge: {
    backgroundColor: '#DBEAFE',
  },
  studentBadge: {
    backgroundColor: '#FEF3C7',
  },
  allBadge: {
    backgroundColor: '#D1FAE5',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tagBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#374151',
  },
  authorText: {
    fontSize: 12,
    color: '#374151',
    fontStyle: 'italic',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  actionText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#2563EB',
  },
  deleteText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#DC2626',
  },
  recipientContainer: {
    marginBottom: 15,
  },
  recipientLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  recipientOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  recipientOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    minWidth: 120,
  },
  recipientOptionSelected: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0ea5e9',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  checkmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  recipientText: {
    fontSize: 14,
    color: '#4b5563',
  },
  recipientTextSelected: {
    color: '#0ea5e9',
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: 'black',
    padding: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  addButtonText: { color: 'white', marginLeft: 8 },
  noticeCard: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  noticeTitle: { fontWeight: 'bold', fontSize: 16 },
  noticeClass: { fontSize: 12, color: 'gray' },
  noticeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  noticeRecipient: {
    fontSize: 12,
    color: 'gray',
  },
  actions: { flexDirection: 'row', gap: 20, marginTop: 8 },
  modalContent: { padding: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  textarea: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    height: 100,
    marginBottom: 10,
  },
  uploadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadButton: {
    backgroundColor: '#6B7280',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    flex: 1,
  },
  clearButton: {
    backgroundColor: '#EF4444',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  cancelText: { color: 'red', textAlign: 'center', marginTop: 10 },
  error: { color: 'red', marginBottom: 10 },
  // View Modal Styles
  viewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  viewModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  viewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  viewModalTitleContainer: {
    flex: 1,
    marginRight: 16,
  },
  viewModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  viewModalAuthor: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  closeButton: {
    padding: 4,
  },
  viewModalBody: {
    flexGrow: 1,
  },
  viewModalContent: {
    padding: 16,
  },
  viewModalText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
    marginBottom: 24,
  },
  viewModalSection: {
    marginBottom: 24,
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
  },
  viewModalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewModalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  viewModalLabel: {
    width: 80,
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  viewModalDate: {
    fontSize: 14,
    color: '#374151',
  },
  viewModalPdfButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  viewModalPdfButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default AddNotice;