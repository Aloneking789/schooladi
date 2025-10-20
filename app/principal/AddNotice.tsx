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
};

const AddNotice = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  type PdfFile = {
    uri: string;
    name: string;
    size?: number;
    mimeType?: string;
  };

  const [pdfFile, setPdfFile] = useState<PdfFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ title: string; text: string; tag: string; class: string }>();

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('principal_token');
      const res = await fetch('https://1rzlgxk8-5001.inc1.devtunnels.ms/api/notices/notices', {
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

  const onSubmit = async (data: { title: string | Blob; text: string | Blob; tag: string | Blob; class: string | Blob; }) => {
    if (!pdfFile) {
      toast('Please upload a PDF file.');
      return;
    }

    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('text', data.text);
    formData.append('tag', data.tag);
    formData.append('forClass', data.class);
    formData.append('pdf', {
      uri: pdfFile.uri,
      type: 'application/pdf',
      name: pdfFile.name,
    } as any);

    try {
      const token = await AsyncStorage.getItem('principal_token');
      const res = await fetch('https://1rzlgxk8-5001.inc1.devtunnels.ms/api/notices/notices/1', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to add notice');

      toast('Notice uploaded successfully!');
      reset();
      setPdfFile(null);
      setModalVisible(false);
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
        },
      });

      if (!res.ok) throw new Error('Failed to delete notice');

      toast('Notice deleted successfully!');
      fetchNotices();
    } catch (err: any) {
      toast(err.message);
    }
    setDeleting(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Notices & Circulars</Text>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
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
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>{item.title}</Text>
              <Text>{item.content}</Text>
              <Text style={styles.noticeClass}>Class: <Text>{item.forClass || 'All'}</Text></Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={() => {
                    if (item.pdfUrl) {
                      // You can use WebBrowser.openBrowserAsync or FileSystem.downloadAsync
                    }
                  }}
                >
                  <Feather name="download" size={18} color="green" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(item)}>
                  <Feather name="trash-2" size={18} color="red" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal Form */}
      <Modal visible={modalVisible} animationType="slide">
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
            name="class"
            rules={{ required: 'Class is required' }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                placeholder="Class (e.g., V, VI, All)"
                value={value}
                onChangeText={onChange}
                style={styles.input}
              />
            )}
          />
          {typeof errors.class?.message === 'string' && <Text style={styles.error}>{errors.class.message}</Text>}

          <TouchableOpacity style={styles.uploadButton} onPress={handlePickDocument}>
            <Text style={{ color: 'white' }}>{pdfFile ? pdfFile.name : 'Upload PDF'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit(onSubmit)}>
            <Text style={{ color: 'white' }}>Submit Notice</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setModalVisible(false)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
  header: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
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
  uploadButton: {
    backgroundColor: '#4B5563',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
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
});

export default AddNotice;