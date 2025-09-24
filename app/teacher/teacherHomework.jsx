import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';

const API_URL = 'https://api.pbmpublicschool.in/api/homeworks/homeworks';

const TeacherHomework = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [classId, setClassId] = useState('');
  const [studentVisible, setStudentVisible] = useState(true);
  const [parentVisible, setParentVisible] = useState(true);
  const [token, setToken] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

          <Text style={styles.label}>Due Date (YYYY-MM-DD or ISO)</Text>
          <TextInput value={dueDate} onChangeText={setDueDate} style={styles.input} placeholder="2025-09-30 or 2025-09-30T23:59:59Z" />

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
