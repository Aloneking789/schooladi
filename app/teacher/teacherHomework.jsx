import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const API_URL = 'https://api.pbmpublicschool.in/api/homeworks/homeworks';

const TeacherHomework = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [classId, setClassId] = useState('');
  const [studentVisible, setStudentVisible] = useState(true);
  const [parentVisible, setParentVisible] = useState(true);
  const [token, setToken] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [homeworks, setHomeworks] = useState([]);
  const [fetchingHomeworks, setFetchingHomeworks] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null); // 'pdf' or 'image'
  // Fetch homeworks for selected class or all
  useEffect(() => {
    if (!token) {
      setHomeworks([]);
      return;
    }
    const fetchHomeworks = async () => {
      setFetchingHomeworks(true);
      try {
        let url = showAll
          ? 'https://api.pbmpublicschool.in/api/homeworks/homeworks'
          : `https://api.pbmpublicschool.in/api/homeworks/homeworks/by-class/${classId}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data && data.success && Array.isArray(data.homeworks)) setHomeworks(data.homeworks);
        else if (Array.isArray(data)) setHomeworks(data); // fallback for old API
        else setHomeworks([]);
      } catch (err) {
        setHomeworks([]);
      } finally {
        setFetchingHomeworks(false);
      }
    };
    if (showAll || classId) fetchHomeworks();
  }, [classId, token, submitting, showAll]);
  // Delete homework by id
  const handleDeleteHomework = async (id) => {
    if (!token) return;
    Alert.alert('Delete Homework', 'Are you sure you want to delete this homework?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const res = await fetch(`https://api.pbmpublicschool.in/api/homeworks/homeworks/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to delete');
            setHomeworks((prev) => prev.filter((h) => h.id !== id));
            Alert.alert('Deleted', 'Homework deleted');
          } catch (err) {
            Alert.alert('Error', err.message || 'Failed to delete homework');
          }
        }
      }
    ]);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const userRaw = await AsyncStorage.getItem('teacher_user');
        const tokenRaw = await AsyncStorage.getItem('teacher_token');
        if (userRaw) {
          const user = JSON.parse(userRaw);
          setSchoolId(user.schoolId?.toString() || user.user?.schools?.[0]?.id || '');
          // If user has assigned class, preselect it
          const assigned = user.classId || user.user?.classId;
          if (assigned) setClassId(assigned);
        }
        if (tokenRaw) setToken(tokenRaw);
      } catch (err) {
        console.warn('Failed to load teacher data', err);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!schoolId || !token) return;
    const fetchClasses = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://api.pbmpublicschool.in/api/classes/${schoolId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setClasses(data.classes || []);
        // if classId not set and classes available, pick first
        if (!classId && Array.isArray(data.classes) && data.classes.length > 0) {
          setClassId(data.classes[0].id);
        }
      } catch (err) {
        console.warn('Failed to fetch classes', err);
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, [schoolId, token]);

  const validate = () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Please enter a title');
      return false;
    }
    if (!content.trim()) {
      Alert.alert('Validation', 'Please enter homework content');
      return false;
    }
    if (!dueDate.trim()) {
      Alert.alert('Validation', 'Please enter a due date (ISO)');
      return false;
    }
    if (!classId) {
      Alert.alert('Validation', 'Please select a class');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!token) {
      Alert.alert('Authentication', 'Please login first');
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        title: title.trim(),
        content: content.trim(),
        dueDate: new Date(dueDate).toISOString(),
        classId,
        studentVisible,
        parentVisible,
  // attachmentUrl removed
      };

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create homework');
      }

      Alert.alert('Success', data.message || 'Homework created');
  // reset form
  setTitle('');
  setContent('');
  setDueDate('');
  setStudentVisible(true);
  setParentVisible(true);
  // attachmentUrl removed
  // attachmentName removed
    } catch (err) {
      console.error('Create homework error', err);
      Alert.alert('Error', err.message || 'Failed to save homework');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Create Homework</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#000" />
      ) : (
        <View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.label}>Show All Homeworks</Text>
            <Switch value={showAll} onValueChange={setShowAll} />
          </View>
          {!showAll && (
            <>
              <Text style={styles.label}>Class</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={classId}
                  onValueChange={(val) => setClassId(val)}
                >
                  <Picker.Item label="Select class" value="" />
                  {classes.map((c) => (
                    <Picker.Item key={c.id} label={c.name} value={c.id} />
                  ))}
                </Picker>
              </View>
            </>
          )}

          {/* Homework List */}
          <Text style={[styles.label, { marginTop: 8, fontWeight: 'bold' }]}>Homeworks</Text>
          {fetchingHomeworks ? (
            <ActivityIndicator size="small" color="#000" />
          ) : homeworks.length === 0 ? (
            <Text style={{ color: '#888', marginBottom: 8 }}>
              {showAll ? 'No homework found.' : 'No homework found for this class.'}
            </Text>
          ) : (
            homeworks.map((hw) => (
              <View key={hw.id} style={{ backgroundColor: '#f9f9f9', borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 2 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 2 }}>{hw.title}</Text>
                <Text style={{ color: '#555', marginBottom: 4 }}>{hw.content}</Text>
                {/* Attachment removed */}
      {/* Attachment Preview Modal removed */}
                <Text style={{ color: '#666', fontSize: 12, marginBottom: 2 }}>Due: {hw.dueDate ? new Date(hw.dueDate).toLocaleString() : 'N/A'}</Text>
                <Text style={{ color: '#888', fontSize: 12, marginBottom: 2 }}>Class: {hw.class?.name || ''}</Text>
                <Text style={{ color: '#888', fontSize: 12, marginBottom: 2 }}>Visible to Students: {hw.studentVisible ? 'Yes' : 'No'} | Visible to Parents: {hw.parentVisible ? 'Yes' : 'No'}</Text>
                <Text style={{ color: '#aaa', fontSize: 11 }}>Created: {hw.createdAt ? new Date(hw.createdAt).toLocaleString() : ''}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
                  <TouchableOpacity onPress={() => handleDeleteHomework(hw.id)} style={{ padding: 4, backgroundColor: '#dc2626', borderRadius: 4 }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          {/* Attachment Picker removed */}

          <Text style={styles.label}>Title</Text>
          <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Homework title" />

          <Text style={styles.label}>Content</Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            style={[styles.input, { height: 120 }]}
            placeholder="Homework details"
            multiline
          />


          <Text style={styles.label}>Due Date</Text>
          <TouchableOpacity
            style={[styles.input, { justifyContent: 'center', height: 44 }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={{ color: dueDate ? '#000' : '#888' }}>
              {dueDate ? new Date(dueDate).toLocaleDateString() : 'Select due date'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dueDate ? new Date(dueDate) : new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  // Set as ISO string for backend compatibility
                  setDueDate(selectedDate.toISOString());
                }
              }}
            />
          )}

          <View style={styles.switchRow}>
            <Text style={styles.label}>Visible to Students</Text>
            <Switch value={studentVisible} onValueChange={setStudentVisible} />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Visible to Parents</Text>
            <Switch value={parentVisible} onValueChange={setParentVisible} />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
            <Text style={styles.buttonText}>{submitting ? 'Saving...' : 'Create Homework'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  label: { fontSize: 14, marginBottom: 6, color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#0066cc',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 12, overflow: 'hidden' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
});

export default TeacherHomework;
