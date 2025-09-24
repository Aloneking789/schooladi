import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Linking } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import Toast from 'react-native-toast-message';

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
  parentLoguserID: string;
  parentPassword: string;
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

  // Move fetchStudents outside useEffect for reload
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
        // Filter students by teacher's classId
        const classStudents = response.data.students.filter(
          (student: Student) => student.classId === classId
        );
        setStudents(classStudents);
        setFilteredStudents(classStudents);
        // fetch documents for each student
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

  const handleDocumentUpload = async (student: Student, keyName: string) => {
    try {
      if (!token) {
        Alert.alert('Authentication', 'Please login to upload documents');
        return;
      }
      setDocUploading((p) => ({ ...p, [student.id]: true }));

      const picker = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if ((picker as any).type === 'cancel') {
        setDocUploading((p) => ({ ...p, [student.id]: false }));
        return;
      }

      // Some platforms/versions may provide different properties; guard defensively
      const fileUri = (picker as any).uri || (picker as any).fileUri || (picker as any).output || (picker as any).outputUri;
      const fileName = (picker as any).name || (fileUri ? String(fileUri).split('/').pop() : undefined) || 'upload.file';
      if (!fileUri) {
        throw new Error('Selected file has no URI');
      }
      // infer mime type by extension
      const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';
      let mime = 'application/octet-stream';
      if (ext === 'pdf') mime = 'application/pdf';
      else if (['jpg', 'jpeg'].includes(ext)) mime = 'image/jpeg';
      else if (ext === 'png') mime = 'image/png';

      // fetch file content and convert to blob so we append real file body to FormData
      const fileResp = await fetch(fileUri);
      const fileBlob = await fileResp.blob();

      const formData = new FormData();
      // Append the blob with a filename so server receives a file field
      formData.append(keyName, fileBlob as any, fileName);

      const uploadUrl = `https://api.pbmpublicschool.in/api/StudentDocUpload/students/${student.id}/documents`;
      const res = await axios.post(uploadUrl, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data && res.data.success) {
        Toast.show({ type: 'success', text1: 'Document uploaded' });
        Alert.alert('Success', 'Document uploaded successfully');
        // refresh documents for this student
        await fetchDocumentsForStudent(student.id);
      } else {
        Toast.show({ type: 'error', text1: res.data.message || 'Upload failed' });
      }
    } catch (err) {
      console.error('Document upload error', err);
      Toast.show({ type: 'error', text1: 'Upload failed' });
    } finally {
      setDocUploading((p) => ({ ...p, [student.id]: false }));
    }
  };

  // Open modal to select multiple files and upload together
  const openUploadModal = (student: Student) => {
    // initialize uploadFiles with nulls
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

  const reduceFileSize = async (uri: string, mimeType: string): Promise<{ uri: string; size: number }> => {
    if (mimeType.startsWith('image/')) {
      let currentUri = uri;
      let currentSize = (await fetch(uri).then(r => r.blob())).size;
      let quality = 1;

      // Target size is 1MB (1048576 bytes)
      while (currentSize > 1048576 && quality > 0.1) {
        const result = await ImageManipulator.manipulateAsync(
          currentUri,
          [{ resize: { width: 1024, height: 1024 } }],
          { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
        );
        currentUri = result.uri;
        currentSize = (await fetch(currentUri).then(r => r.blob())).size;
        quality -= 0.1;
      }

      return { uri: currentUri, size: currentSize };
    }

    // For non-image files, just return the original URI and size
    const size = (await fetch(uri).then(r => r.blob())).size;
    return { uri, size };
  };

  const pickFileForKey = async (key: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      if (!file) {
        Alert.alert('File error', 'Failed to get file data. Please try again.');
        return;
      }
      const fileName = file.name || 'file';
      // Get file data directly
      try {
        // If it's an image, allow cropping and editing
        if (file.mimeType?.startsWith('image/')) {
          // First allow user to crop/edit the image
          const editResult = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
          });

          if (editResult.canceled) {
            // Process original file if editing is canceled
            const reduced = await reduceFileSize(file.uri, file.mimeType);
            if (reduced.size > 1048576) { // 1MB
              Alert.alert('File too large', 'Please select a smaller file (max 1MB)');
              return;
            }

            setUploadFiles((prev) => ({
              ...prev,
              [key]: {
                uri: reduced.uri,
                name: fileName,
                type: file.mimeType || 'image/jpeg'
              }
            }));
            return;
          }

          // Get edited image and reduce its size
          const editedImage = editResult.assets[0];
          const reduced = await reduceFileSize(editedImage.uri, 'image/jpeg');

          if (reduced.size > 1048576) { // 1MB
            Alert.alert('File too large', 'Please select a smaller file (max 1MB)');
            return;
          }

          setUploadFiles((prev) => ({
            ...prev,
            [key]: {
              uri: reduced.uri,
              name: fileName,
              type: 'image/jpeg'
            }
          }));
        } else {
          // Check size for non-image files
          const reduced = await reduceFileSize(file.uri, file.mimeType || 'application/octet-stream');
          if (reduced.size > 1048576) { // 1MB
            Alert.alert('File too large', 'Please select a smaller file (max 1MB)');
            return;
          }

          setUploadFiles((prev) => ({
            ...prev,
            [key]: {
              uri: reduced.uri,
              name: fileName,
              type: file.mimeType || 'application/octet-stream'
            }
          }));
        }
      } catch (error) {
        console.error('Failed to read file data:', error);
        Alert.alert('File error', 'Failed to read file data. Please try again.');
      }
    } catch (err) {
      console.warn('File pick error', err);
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
      // append every key if a file was selected
      const keys = [
        'Student_adhaarCopyUrl',
        'Parents_adharCopyUrl',
        'Mother_adhaarCopyUrl',
        'priviousSchoolCertificateUrl',
        'priviousSchoolMarksheetUrl',
        'Student_TC_UploadUrl',
      ];
      let appended = false; // whether any file (new or existing) makes this a valid upload
      let appendedFilesCount = 0; // number of files actually appended to FormData
      let existingFilesCount = 0; // number of files already present on server
      for (const k of keys) {
        const f = uploadFiles[k];
        const already = documentsMap[student.id]?.[k]?.uploaded;
        if (f?.uri) {
          appended = true;
          appendedFilesCount += 1;
          // Append each file directly with its URI
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
        // Reset uploading states before returning so UI doesn't stay disabled
        setUploadingAll(false);
        setDocUploading((p) => ({ ...p, [student.id]: false }));
        Alert.alert('No files', 'Please select at least one file to upload');
        return;
      }

      // If there are no newly selected files but some files already exist on server,
      // there's nothing to POST — treat as success and close the modal.
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

      // Log the FormData contents for debugging
      for (let pair of (formData as any).entries()) {
        console.log('FormData entry:', pair[0], pair[1]);
      }

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

        // Log response details for debugging
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        // Get response text first to check content
        const responseText = await response.text();
        console.log('Raw response:', responseText);

        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse response as JSON:', parseError);
          console.error('Response was:', responseText);
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
        // Log error details with safe type handling
        const formDataKeys = [];
        for (const pair of (formData as any).entries()) {
          formDataKeys.push(pair[0]);
        }
        console.error('Upload error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          uploadUrl,
          formDataKeys
        });
        throw error;
      }
      // Response is handled in the try block above
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
      // Use a public placeholder image
      return 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
    }
    // If already a full URL, return as is
    if (/^https?:\/\//.test(photo)) return photo;
    return `https://api.pbmpublicschool.in/${photo.replace(/\\/g, '/')}`;
  };

  // Photo upload handler with automatic resizing to meet 25-50KB requirement
  const handlePhotoUpload = async (student: Student) => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Toast.show({ type: 'error', text1: 'Camera permission required' });
        return;
      }
      const pickerResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (pickerResult.canceled) return;
      let file = pickerResult.assets[0];
      let uri = file.uri;

      // Crop the image to a square (center crop)
      const cropWidth = file.width < file.height ? file.width : file.height;
      const cropHeight = cropWidth;
      const cropOriginX = (file.width - cropWidth) / 2;
      const cropOriginY = (file.height - cropHeight) / 2;
      const cropped = await ImageManipulator.manipulateAsync(
        uri,
        [{ crop: { originX: cropOriginX, originY: cropOriginY, width: cropWidth, height: cropHeight } }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );
      uri = cropped.uri;

      // Compress and resize as before
      let fileSize = file.fileSize ?? 0;
      let compress = 1;
      while ((fileSize < 25600 || fileSize > 51200) && compress > 0) {
        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 400, height: 400 } }],
          { compress: compress, format: ImageManipulator.SaveFormat.JPEG }
        );
        uri = manipResult.uri;
        const response = await fetch(uri);
        const blob = await response.blob();
        fileSize = blob.size;
        compress -= 0.1;
        if (compress < 0.1) break;
      }
      if (fileSize < 25600 || fileSize > 51200) {
        Toast.show({ type: 'error', text1: 'Photo must be between 25KB and 50KB' });
        return;
      }
      // Create form data with the processed image
      const formData = new FormData();
      formData.append('photo', {
        uri: uri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      } as any);

      // Upload the photo
      const res = await axios.post(
        `${API_BASE_URL}/admission/students/${student.Admission_Number}/photo`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (res.data.success) {
        // Update both students lists with the new photo URL
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
          text2: 'Student photo has been updated'
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Upload failed',
          text2: res.data.message || 'Failed to upload photo'
        });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Photo upload failed' });
    }
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
      {/* Header */}
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

      {/* Search Bar */}
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

      {/* Students Count */}
      <View style={styles.countSection}>
        <Text style={styles.countText}>
          Showing {filteredStudents.length} of {students.length} students
        </Text>
      </View>

      {/* Students List */}
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
          filteredStudents.map((student) => (
            <View key={student.id} style={styles.studentCard}>
              {/* Student Header */}
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

              {/* Student Details */}
              <View style={styles.cardBody}>
                <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
                  <TouchableOpacity style={[styles.smallButton, { backgroundColor: '#fde68a' }]} onPress={() => openUploadModal(student)}>
                    <Text style={[styles.smallButtonText, { color: '#92400e' }]}>Upload Documents</Text>
                  </TouchableOpacity>
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

                {/* {student.subjects && (
                  <View style={styles.infoRowFull}>
                    <Text style={styles.infoLabel}>Subjects</Text>
                    <Text style={styles.infoValue}>{student.subjects}</Text>
                  </View>
                )} */}

                <View style={styles.parentInfo}>
                  <Text style={styles.parentInfoTitle}>Parent Login Details</Text>
                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>User ID</Text>
                      <Text style={styles.infoValue}>{student.parentLoguserID}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Password</Text>
                      <Text style={styles.infoValue}>{student.parentPassword}</Text>
                    </View>
                  </View>
                  {/* Student Login Details */}
                  <Text style={[styles.parentInfoTitle, { marginTop: 10 }]}>Student Login Details</Text>
                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Loguser (Roll No)</Text>
                      <Text style={styles.infoValue}>{student.rollNumber}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Password (DOB)</Text>
                      <Text style={styles.infoValue}>{formatDate(student.dateOfBirth)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
      <Toast />

      {/* Upload Modal */}
      <Modal visible={uploadModalVisible} transparent animationType="slide" onRequestClose={() => setUploadModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Upload Documents for {uploadTargetStudent?.studentName}</Text>
            <ScrollView style={{ maxHeight: 380 }}>
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
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
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

  // Loading
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

  // Header
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

  // Search
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

  // Count Section
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

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },

  // Empty State
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

  // Student Card
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

  // Card Header
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

  // Card Body
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

  // Parent Info
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
