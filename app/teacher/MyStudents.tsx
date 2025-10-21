import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Toast from 'react-native-toast-message';
import PaymentCalendar from '../../app/components/PaymentCalendar';
import responsive, { rem } from '../utils/responsive';

interface Student {
  id: string;
  rollNumber: string;
  Admission_Number: string;
  studentName: string;
  dateOfBirth: string;
  gender: string;
  schoolId: string;
  classId: string;
  sectionclass: string;
  class_: string;
  fatherName: string;
  motherName: string;
  address: string;
  penNumber: string | null;
  aadharNumber: string;
  idcardNumber: string;
  phone: string;
  email: string | null;
  academicYear: string;
  subjects: string;
  LoguserID: string;
  password: string;
  religion: string;
  caste: string;
  isActive: boolean;
  photo: string | null;
  createdAt: string;
  updatedAt: string;
}

const MyStudents = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [classId, setClassId] = useState('');
  const [token, setToken] = useState('');
  const [teacherInfo, setTeacherInfo] = useState<any>(null);
  const [documentsMap, setDocumentsMap] = useState<Record<string, any>>({});
  const [docUploading, setDocUploading] = useState<Record<string, boolean>>({});
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadTargetStudent, setUploadTargetStudent] = useState<Student | null>(null);
  const [uploadFiles, setUploadFiles] = useState<Record<string, { uri: string; name: string; type: string } | null>>({});
  const [uploadingAll, setUploadingAll] = useState(false);
  const [complaintModalVisible, setComplaintModalVisible] = useState(false);
  const [complaintStudent, setComplaintStudent] = useState<Student | null>(null);
  const [complaintTitle, setComplaintTitle] = useState('');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);
  const [expandedPaymentStudentId, setExpandedPaymentStudentId] = useState<string | null>(null);

  const API_BASE_URL = 'https://api.pbmpublicschool.in/api';

  useEffect(() => {
    const getUserData = async () => {
      try {
        const userDataRaw = await AsyncStorage.getItem('teacher_user');
        const tokenRaw = await AsyncStorage.getItem('teacher_token');
        console.log('Retrieved user data from storage:', { userDataRaw, tokenRaw });

        if (userDataRaw && tokenRaw) {
          const teacherData = JSON.parse(userDataRaw);
          setTeacherInfo(teacherData);
          setTeacherId(teacherData.id || teacherData.user?.id || '');
          setSchoolId(teacherData.schoolId?.toString() || teacherData.user?.schools?.[0]?.id || '');
          setClassId(teacherData.classId || teacherData.user?.classId || '');
          setToken(tokenRaw);
        }
      } catch (error) {
        console.error('Failed to load user data from storage', error);
        Alert.alert('Error', 'Failed to load teacher information');
      }
    };
    getUserData();
  }, []);

  const fetchStudents = async () => {
    if (!schoolId || !classId || !token) {
      setLoading(false);
      return;
    }
    try {
      const response = await axios.get(
        `${API_BASE_URL}/admission/students/by-school/${schoolId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.data.success) {
        const classStudents = response.data.students.filter(
          (student: Student) => student.classId === classId
        );
        setStudents(classStudents);
        setFilteredStudents(classStudents);
        classStudents.forEach((st: Student) => {
          fetchDocumentsForStudent(st.id);
        });
      } else {
        Alert.alert('Error', 'Failed to fetch students data');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      Alert.alert('Error', 'Failed to fetch students data');
    } finally {
      setLoading(false);
    }
  }

  const fetchDocumentsForStudent = async (studentId: string) => {
    if (!studentId || !token) return;
    try {
      const res = await axios.get(
        `https://api.pbmpublicschool.in/api/StudentDocUpload/students/${studentId}/documents`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data && res.data.success) {
        setDocumentsMap((prev) => ({ ...prev, [studentId]: res.data.documents }));
      }
    } catch (err) {
      console.warn('Failed to fetch documents for student', studentId, err);
    }
  };

  const openDocumentUrl = (relUrl: string) => {
    if (!relUrl) return;
    const clean = relUrl.replace(/\\/g, '/');
    const full = `https://api.pbmpublicschool.in/${clean}`;
    Linking.openURL(full).catch((e) => console.warn('Unable to open url', e));
  };

  // Helper function to get file size from URI
  const getFileSize = async (uri: string): Promise<number> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return blob.size;
    } catch (error) {
      console.error('Error getting file size:', error);
      return 0;
    }
  };

  // Resize photo to 25-50KB range
  const resizePhotoToTarget = async (uri: string): Promise<{ uri: string; size: number }> => {
    let currentUri = uri;
    let currentSize = await getFileSize(uri);
    
    const MIN_SIZE = 25 * 1024; // 25KB
    const MAX_SIZE = 50 * 1024; // 50KB
    
    // Start with different resize dimensions based on initial size
    let width = currentSize > 500000 ? 600 : 800;
    let quality = 0.9;
    
    console.log(`Initial photo size: ${(currentSize / 1024).toFixed(2)}KB`);
    
    // Try to get within range
    let attempts = 0;
    const maxAttempts = 15;
    
    while (attempts < maxAttempts) {
      if (currentSize >= MIN_SIZE && currentSize <= MAX_SIZE) {
        console.log(`Photo resized successfully to ${(currentSize / 1024).toFixed(2)}KB in ${attempts} attempts`);
        break;
      }
      
      if (currentSize > MAX_SIZE) {
        // Too large, reduce size
        width = Math.max(200, Math.floor(width * 0.85));
        quality = Math.max(0.3, quality - 0.1);
      } else if (currentSize < MIN_SIZE) {
        // Too small, increase size
        width = Math.min(1200, Math.floor(width * 1.2));
        quality = Math.min(1.0, quality + 0.1);
      }
      
      const result = await ImageManipulator.manipulateAsync(
        currentUri,
        [{ resize: { width } }],
        { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      currentUri = result.uri;
      currentSize = await getFileSize(currentUri);
      attempts++;
      
      console.log(`Attempt ${attempts}: Size=${(currentSize / 1024).toFixed(2)}KB, Width=${width}, Quality=${quality.toFixed(2)}`);
    }
    
    return { uri: currentUri, size: currentSize };
  };

  // Resize document to 100-200KB range
  const resizeDocumentToTarget = async (uri: string, mimeType: string): Promise<{ uri: string; size: number }> => {
    const MIN_SIZE = 100 * 1024; // 100KB
    const MAX_SIZE = 200 * 1024; // 200KB
    
    // For PDFs and non-image files, return as-is since we can't compress them easily
    if (!mimeType.startsWith('image/')) {
      const size = await getFileSize(uri);
      if (size > MAX_SIZE) {
        throw new Error(`Document size (${(size / 1024).toFixed(2)}KB) exceeds maximum allowed size of 200KB. Please select a smaller file.`);
      }
      return { uri, size };
    }
    
    // For images
    let currentUri = uri;
    let currentSize = await getFileSize(uri);
    
    console.log(`Initial document size: ${(currentSize / 1024).toFixed(2)}KB`);
    
    let width = currentSize > 1000000 ? 1200 : 1600;
    let quality = 0.9;
    
    let attempts = 0;
    const maxAttempts = 15;
    
    while (attempts < maxAttempts) {
      if (currentSize >= MIN_SIZE && currentSize <= MAX_SIZE) {
        console.log(`Document resized successfully to ${(currentSize / 1024).toFixed(2)}KB in ${attempts} attempts`);
        break;
      }
      
      if (currentSize > MAX_SIZE) {
        // Too large, reduce size
        width = Math.max(400, Math.floor(width * 0.85));
        quality = Math.max(0.3, quality - 0.1);
      } else if (currentSize < MIN_SIZE) {
        // Too small, increase size
        width = Math.min(2400, Math.floor(width * 1.2));
        quality = Math.min(1.0, quality + 0.1);
      }
      
      const result = await ImageManipulator.manipulateAsync(
        currentUri,
        [{ resize: { width } }],
        { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      currentUri = result.uri;
      currentSize = await getFileSize(currentUri);
      attempts++;
      
      console.log(`Attempt ${attempts}: Size=${(currentSize / 1024).toFixed(2)}KB, Width=${width}, Quality=${quality.toFixed(2)}`);
    }
    
    return { uri: currentUri, size: currentSize };
  };

  // Photo upload handler with automatic resizing to 25-50KB
  const handlePhotoUpload = async (student: Student) => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Toast.show({ type: 'error', text1: 'Camera permission required' });
        return;
      }

      Toast.show({ type: 'info', text1: 'Taking photo...', text2: 'Please wait' });

      const pickerResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (pickerResult.canceled) return;

      Toast.show({ type: 'info', text1: 'Resizing photo...', text2: 'Please wait' });

      let uri = pickerResult.assets[0].uri;

      // Crop to square
      const file = pickerResult.assets[0];
      const cropWidth = file.width < file.height ? file.width : file.height;
      const cropHeight = cropWidth;
      const cropOriginX = (file.width - cropWidth) / 2;
      const cropOriginY = (file.height - cropHeight) / 2;

      const cropped = await ImageManipulator.manipulateAsync(
        uri,
        [{ crop: { originX: cropOriginX, originY: cropOriginY, width: cropWidth, height: cropHeight } }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Resize to target range (25-50KB)
      const resized = await resizePhotoToTarget(cropped.uri);
      
      const MIN_SIZE = 25 * 1024;
      const MAX_SIZE = 50 * 1024;

      if (resized.size < MIN_SIZE || resized.size > MAX_SIZE) {
        Toast.show({ 
          type: 'error', 
          text1: 'Size out of range', 
          text2: `Photo is ${(resized.size / 1024).toFixed(2)}KB (need 25-50KB)` 
        });
        return;
      }

      Toast.show({ type: 'info', text1: 'Uploading...', text2: `Size: ${(resized.size / 1024).toFixed(2)}KB` });

      const formData = new FormData();
      formData.append('photo', {
        uri: resized.uri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      } as any);

      const res = await axios.post(
        `${API_BASE_URL}/admission/students/id/${student.id}/photo`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (res.data.success) {
        const updateStudentPhoto = (list: Student[]) =>
          list.map(s =>
            s.Admission_Number === student.Admission_Number
              ? { ...s, photo: `${res.data.photoUrl}` }
              : s
          );

        setStudents(updateStudentPhoto);
        setFilteredStudents(updateStudentPhoto);

        Toast.show({
          type: 'success',
          text1: 'Photo uploaded successfully',
          text2: `Size: ${(resized.size / 1024).toFixed(2)}KB`
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Upload failed',
          text2: res.data.message || 'Failed to upload photo'
        });
      }
    } catch (err) {
      console.error('Photo upload error:', err);
      Toast.show({ type: 'error', text1: 'Photo upload failed', text2: err instanceof Error ? err.message : 'Unknown error' });
    }
  };

  const openUploadModal = (student: Student) => {
    const init: Record<string, null> = {
      Student_adhaarCopyUrl: null,
      Parents_adharCopyUrl: null,
      Mother_adhaarCopyUrl: null,
      priviousSchoolCertificateUrl: null,
      priviousSchoolMarksheetUrl: null,
      Student_TC_UploadUrl: null,
    };
    setUploadFiles(init);
    setUploadTargetStudent(student);
    setUploadModalVisible(true);
  };

  const pickFileForKey = async (key: string) => {
    try {
      Toast.show({ type: 'info', text1: 'Selecting file...', text2: 'Please wait' });

      const result = await DocumentPicker.getDocumentAsync({ 
        type: '*/*', 
        copyToCacheDirectory: true 
      });

      if (!result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      if (!file) {
        Alert.alert('File error', 'Failed to get file data. Please try again.');
        return;
      }

      const fileName = file.name || 'file';
      const mimeType = file.mimeType || 'application/octet-stream';

      Toast.show({ type: 'info', text1: 'Processing file...', text2: 'Please wait' });

      try {
        // Resize document to 100-200KB range
        const resized = await resizeDocumentToTarget(file.uri, mimeType);
        
        const MIN_SIZE = 100 * 1024;
        const MAX_SIZE = 200 * 1024;

        // For non-image files that can't be resized, just check size
        if (!mimeType.startsWith('image/')) {
          if (resized.size > MAX_SIZE) {
            Alert.alert(
              'File too large', 
              `File size is ${(resized.size / 1024).toFixed(2)}KB. Maximum allowed is 200KB. Please select a smaller file.`
            );
            return;
          }
          // Accept files under 200KB even if under 100KB for PDFs
          Toast.show({ 
            type: 'success', 
            text1: 'File selected', 
            text2: `Size: ${(resized.size / 1024).toFixed(2)}KB` 
          });
        } else {
          // For images, enforce the range
          if (resized.size < MIN_SIZE || resized.size > MAX_SIZE) {
            Toast.show({ 
              type: 'error', 
              text1: 'Size out of range', 
              text2: `Document is ${(resized.size / 1024).toFixed(2)}KB (need 100-200KB)` 
            });
            return;
          }
          Toast.show({ 
            type: 'success', 
            text1: 'Document resized', 
            text2: `Size: ${(resized.size / 1024).toFixed(2)}KB` 
          });
        }

        setUploadFiles((prev) => ({
          ...prev,
          [key]: {
            uri: resized.uri,
            name: fileName,
            type: mimeType
          }
        }));

      } catch (error) {
        console.error('Failed to process file:', error);
        Alert.alert('File error', error instanceof Error ? error.message : 'Failed to process file. Please try again.');
      }
    } catch (err) {
      console.warn('File pick error', err);
      Toast.show({ type: 'error', text1: 'Failed to select file' });
    }
  };

  const submitAllDocumentsForStudent = async () => {
    if (!uploadTargetStudent) return;
    const student = uploadTargetStudent;
    if (!token) {
      Alert.alert('Authentication', 'Please login to upload documents');
      return;
    }
    try {
      setUploadingAll(true);
      setDocUploading((p) => ({ ...p, [student.id]: true }));
      const formData = new FormData();
      const keys = [
        'Student_adhaarCopyUrl',
        'Parents_adharCopyUrl',
        'Mother_adhaarCopyUrl',
        'priviousSchoolCertificateUrl',
        'priviousSchoolMarksheetUrl',
        'Student_TC_UploadUrl',
      ];
      let appended = false;
      let appendedFilesCount = 0;
      let existingFilesCount = 0;
      
      for (const k of keys) {
        const f = uploadFiles[k];
        const already = documentsMap[student.id]?.[k]?.uploaded;
        if (f?.uri) {
          appended = true;
          appendedFilesCount += 1;
          formData.append(k, {
            uri: f.uri,
            type: f.type || 'image/jpeg',
            name: f.name
          } as any);
        } else if (already) {
          appended = true;
          existingFilesCount += 1;
        }
      }
      
      if (!appended) {
        setUploadingAll(false);
        setDocUploading((p) => ({ ...p, [student.id]: false }));
        Alert.alert('No files', 'Please select at least one file to upload');
        return;
      }

      if (appendedFilesCount === 0 && existingFilesCount > 0) {
        Toast.show({ type: 'success', text1: 'All documents already uploaded' });
        setUploadModalVisible(false);
        setUploadTargetStudent(null);
        setUploadFiles({});
        setUploadingAll(false);
        setDocUploading((p) => ({ ...p, [student.id]: false }));
        return;
      }

      const uploadUrl = `https://api.pbmpublicschool.in/api/StudentDocUpload/students/${student.id}/documents`;

      try {
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'multipart/form-data'
          },
          body: formData
        });

        const responseText = await response.text();
        console.log('Raw response:', responseText);

        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse response as JSON:', parseError);
          throw new Error(`Server returned invalid JSON response (Status: ${response.status})`);
        }

        if (!responseData.success) {
          throw new Error(responseData.message || 'Upload failed');
        }

        if (responseData && responseData.success) {
          Toast.show({ type: 'success', text1: responseData.message || 'Documents uploaded' });
          await fetchDocumentsForStudent(student.id);
          setUploadModalVisible(false);
          setUploadTargetStudent(null);
          setUploadFiles({});
        } else {
          Alert.alert('Upload failed', responseData?.message || 'Failed to upload documents');
        }
      } catch (error) {
        console.error('Upload error details:', error);
        throw error;
      }
    } catch (err) {
      console.error('Bulk upload error', err);
      Alert.alert('Error', 'Failed to upload documents');
    } finally {
      setUploadingAll(false);
      setDocUploading((p) => ({ ...p, [uploadTargetStudent?.id || '']: false }));
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [schoolId, classId, token]);

  useEffect(() => {
    const filtered = students.filter(student => {
      const query = searchQuery.toLowerCase();
      const name = (student.studentName || '').toLowerCase();
      const roll = (student.rollNumber || '').toLowerCase();
      const id = (student.idcardNumber || '').toLowerCase();
      const father = (student.fatherName || '').toLowerCase();

      return name.includes(query) ||
        roll.includes(query) ||
        id.includes(query) ||
        father.includes(query);
    });
    setFilteredStudents(filtered);
  }, [searchQuery, students]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getImageUrl = (photo: string | null) => {
    if (!photo || photo === 'null' || photo === 'undefined') {
      return 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
    }
    if (/^https?:\/\//.test(photo)) return photo;
    return `https://api.pbmpublicschool.in/${photo.replace(/\\/g, '/')}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading students...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="people" size={24} color="#000" />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>My Students</Text>
            <Text style={styles.headerSubtitle}>
              Class {teacherInfo?.assignedClass} - Section {teacherInfo?.assignedSection}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            placeholder="Search students by name, roll number, or ID..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      <View style={styles.countSection}>
        <Text style={styles.countText}>
          Showing {filteredStudents.length} of {students.length} students
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filteredStudents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No students found</Text>
            <Text style={styles.emptySubText}>
              {searchQuery ? 'Try adjusting your search' : 'No students assigned to this class'}
            </Text>
          </View>
        ) : (
          filteredStudents.map((student, idx) => (
            <View key={(student.id || student.Admission_Number || student.idcardNumber || idx).toString()} style={styles.studentCard}>
              <View style={styles.cardHeader}>
                <View style={styles.studentPhotoSection}>
                  <Image
                    source={{ uri: getImageUrl(student.photo) }}
                    style={styles.studentPhoto}
                    onError={() => console.log('Image load error')}
                  />
                  <TouchableOpacity
                    style={styles.uploadPhotoButton}
                    onPress={() => handlePhotoUpload(student)}
                  >
                    <Text style={styles.uploadPhotoText}>Upload Photo</Text>
                  </TouchableOpacity>
                  <View style={[
                    styles.statusBadge,
                    student.isActive ? styles.activeBadge : styles.inactiveBadge
                  ]}>
                    <Text style={styles.statusText}>
                      {student.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>

                <View style={styles.studentMainInfo}>
                  <Text style={styles.studentName}>{student.studentName}</Text>
                  <Text style={styles.rollNumber}>Roll No: {student.rollNumber}</Text>
                  <Text style={styles.admissionNumber}>
                    Admission: {student.Admission_Number}
                  </Text>
                  <Text style={styles.idNumber}>ID: {student.idcardNumber}</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={{ alignItems: 'flex-end', marginBottom: rem(8) }}>
                  <TouchableOpacity style={[styles.smallButton, { backgroundColor: '#fde68a' }]} onPress={() => openUploadModal(student)}>
                    <Text style={[styles.smallButtonText, { color: '#92400e' }]}>Upload Documents</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.smallButton, { backgroundColor: '#fee2e2', marginTop: 8 }]} onPress={() => { setComplaintStudent(student); setComplaintModalVisible(true); }}>
                    <Text style={[styles.smallButtonText, { color: '#b91c1c' }]}>Report Complaint</Text>
                  </TouchableOpacity>
                </View>

              {/* Payments toggle */}
              <View style={{ marginTop: rem(12) }}>
                <TouchableOpacity
                  style={[styles.smallButton, { backgroundColor: '#ecfdf5' }]}
                  onPress={() => setExpandedPaymentStudentId(prev => prev === student.id ? null : student.id)}
                >
                  <Text style={[styles.smallButtonText, { color: '#065f46' }]}>{expandedPaymentStudentId === student.id ? 'Hide Payments' : 'Show Payments'}</Text>
                </TouchableOpacity>
              </View>

              {expandedPaymentStudentId === student.id && (
                <View style={{ marginTop: rem(12) }}>
                  <PaymentCalendar studentId={student.id} apiBaseUrl={API_BASE_URL} />
                </View>
              )}

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
                    <View style={styles.iconRow}>
                      <Ionicons name="call" size={14} color="#6b7280" />
                      <Text style={styles.infoLabel}>Contact</Text>
                    </View>
                    <Text style={styles.infoValue}>{student.phone}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <View style={styles.iconRow}>
                      <Ionicons name="mail" size={14} color="#6b7280" />
                      <Text style={styles.infoLabel}>Email</Text>
                    </View>
                    <Text style={styles.infoValue} numberOfLines={1}>
                      {student.email || 'Not provided'}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <View style={styles.iconRow}>
                      <Ionicons name="calendar" size={14} color="#6b7280" />
                      <Text style={styles.infoLabel}>Date of Birth</Text>
                    </View>
                    <Text style={styles.infoValue}>
                      {formatDate(student.dateOfBirth)}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <View style={styles.iconRow}>
                      <Ionicons name="person" size={14} color="#6b7280" />
                      <Text style={styles.infoLabel}>Gender</Text>
                    </View>
                    <Text style={styles.infoValue}>
                      {student.gender.charAt(0).toUpperCase() + student.gender.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRowFull}>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoValue}>{student.address}</Text>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Academic Year</Text>
                    <Text style={styles.infoValue}>{student.academicYear}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Religion</Text>
                    <Text style={styles.infoValue}>{student.religion}</Text>
                  </View>
                </View>

                <View style={styles.parentInfo}>
                  <Text style={[styles.parentInfoTitle, { marginTop: 10 }]}>Student Login Details</Text>
                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Login ID </Text>
                      <Text style={styles.infoValue}>{student.LoguserID}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Password</Text>
                      <Text style={styles.infoValue}>{student.password}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <Modal
                visible={complaintModalVisible && complaintStudent?.id === student.id}
                transparent={true}
                animationType="slide"
                onRequestClose={() => {
                  if (complaintSubmitting) return;
                  setComplaintModalVisible(false);
                  setComplaintStudent(null);
                  setComplaintTitle('');
                  setComplaintDescription('');
                }}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Report Complaint for {student.studentName}</Text>
                    <TextInput
                      placeholder="Title"
                      value={complaintTitle}
                      onChangeText={setComplaintTitle}
                      style={[styles.input, complaintSubmitting ? { opacity: 0.6 } : {}]}
                      editable={!complaintSubmitting}
                    />
                    <TextInput
                      placeholder="Description"
                      value={complaintDescription}
                      onChangeText={setComplaintDescription}
                      style={[styles.input, { height: rem(120) }, complaintSubmitting ? { opacity: 0.6 } : {}]}
                      multiline
                      editable={!complaintSubmitting}
                    />
                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={[styles.modalBtn, { backgroundColor: '#e5e7eb', opacity: complaintSubmitting ? 0.6 : 1 }]}
                        onPress={() => {
                          if (complaintSubmitting) return;
                          setComplaintModalVisible(false);
                          setComplaintStudent(null);
                          setComplaintTitle('');
                          setComplaintDescription('');
                        }}
                        disabled={complaintSubmitting}
                      >
                        <Text style={{ color: '#111' }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalBtn, { backgroundColor: '#667eea', opacity: complaintSubmitting ? 0.8 : 1 }]}
                        onPress={async () => {
                          if (complaintSubmitting) return;
                          if (!complaintStudent) return;
                          if (!complaintTitle.trim() || !complaintDescription.trim()) {
                            Alert.alert('Validation', 'Please enter title and description');
                            return;
                          }
                          try {
                            setComplaintSubmitting(true);
                            const url = `${API_BASE_URL}/complaints/complaints/teacher`;
                            const body = {
                              studentId: complaintStudent.id,
                              title: complaintTitle,
                              description: complaintDescription,
                            };
                            const headers: any = {};
                            if (token) headers.Authorization = `Bearer ${token}`;
                            const res = await axios.post(url, body, { headers });
                            if (res.data && res.data.success) {
                              Toast.show({ type: 'success', text1: 'Complaint submitted' });
                              Alert.alert('Success', 'Complaint submitted successfully');
                              setComplaintModalVisible(false);
                              setComplaintStudent(null);
                              setComplaintTitle('');
                              setComplaintDescription('');
                            } else {
                              const msg = res.data?.message || 'Failed to submit complaint';
                              Toast.show({ type: 'error', text1: msg });
                              Alert.alert('Error', msg);
                            }
                          } catch (err) {
                            console.error('Complaint submit error', err);
                            Toast.show({ type: 'error', text1: 'Failed to submit complaint' });
                            Alert.alert('Error', 'Failed to submit complaint');
                          } finally {
                            setComplaintSubmitting(false);
                          }
                        }}
                        disabled={complaintSubmitting}
                      >
                        {complaintSubmitting ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={{ color: '#fff' }}>Send</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            </View>
          ))
        )}
      </ScrollView>
      <Toast />

      <Modal visible={uploadModalVisible} transparent animationType="slide" onRequestClose={() => setUploadModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Upload Documents for {uploadTargetStudent?.studentName}</Text>
            <ScrollView style={{ maxHeight: Math.min(responsive.height * 0.75, rem(380)) }}>
              {[
                { key: 'Student_adhaarCopyUrl', label: 'Student Aadhar' },
                { key: 'Parents_adharCopyUrl', label: 'Parents Aadhar' },
                { key: 'Mother_adhaarCopyUrl', label: 'Mother Aadhar' },
                { key: 'priviousSchoolCertificateUrl', label: 'Previous Certificate' },
                { key: 'priviousSchoolMarksheetUrl', label: 'Previous Marksheet' },
                { key: 'Student_TC_UploadUrl', label: 'Student TC' },
              ].map((it) => (
                <View key={it.key} style={styles.fileRow}>
                  <Text style={styles.fileLabel}>{it.label}</Text>
                  <View style={{ flex: 1 }}>
                    {documentsMap[uploadTargetStudent?.id || '']?.[it.key]?.uploaded ? (
                      <View style={styles.uploadedFileContainer}>
                        <TouchableOpacity
                          style={styles.previewButton}
                          onPress={() => openDocumentUrl(documentsMap[uploadTargetStudent?.id || '']?.[it.key]?.url || '')}
                        >
                          <Ionicons name="document-outline" size={20} color="#4CAF50" />
                          <Text style={styles.previewText}>View Uploaded Document</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.fileSelectButton} onPress={() => pickFileForKey(it.key)}>
                          <Text style={styles.fileSelectText}>Replace</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.newFileContainer}>
                        <Text style={styles.fileName}>{uploadFiles[it.key]?.name ?? 'No file selected'}</Text>
                        <TouchableOpacity style={styles.fileSelectButton} onPress={() => pickFileForKey(it.key)}>
                          <Text style={styles.fileSelectText}>Select</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: rem(12) }}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => { setUploadModalVisible(false); setUploadTargetStudent(null); }}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={submitAllDocumentsForStudent} disabled={uploadingAll}>
                <Text style={styles.buttonText}>{uploadingAll ? 'Uploading...' : 'Upload All'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  uploadedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  newFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  previewText: {
    marginLeft: 8,
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  searchSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  countSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  countText: {
    fontSize: 14,
    color: '#6b7280',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
    textAlign: 'center',
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  studentPhotoSection: {
    alignItems: 'center',
    marginRight: 16,
  },
  studentPhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  uploadPhotoButton: {
    marginTop: 8,
    backgroundColor: '#e0f2fe',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  uploadPhotoText: {
    color: '#0369a1',
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#dcfce7',
  },
  inactiveBadge: {
    backgroundColor: '#fef2f2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  studentMainInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  studentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  rollNumber: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  admissionNumber: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  idNumber: {
    fontSize: 14,
    color: '#6b7280',
  },
  cardBody: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  infoRowFull: {
    width: '100%',
  },
  infoItem: {
    flex: 1,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '400',
  },
  parentInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  parentInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  smallButton: {
    marginTop: 6,
    backgroundColor: '#eef2ff',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  smallButtonText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111827',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    marginBottom: 8,
    color: '#111827',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  modalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  fileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  fileLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  fileName: {
    color: '#6b7280',
    marginRight: 8,
    fontSize: 12,
  },
  fileSelectButton: {
    backgroundColor: '#e6f4ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  fileSelectText: {
    color: '#0369a1',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#111827',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default MyStudents;