import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const API_POST = 'https://api.pbmpublicschool.in/api/teacherdairy/teacher-diary';
const API_GET = 'https://api.pbmpublicschool.in/api/teacherdairy/teacher-diary/my';

const DiaryItem = ({ item }) => {
  const prettyDate = new Date(item.date).toLocaleString();
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{(item.type || '').replace('_', ' ').toUpperCase()}</Text>
        <Text style={styles.cardDate}>{prettyDate}</Text>
      </View>
      <Text style={styles.cardBody}>{item.report || item.leaveReason || item.permissionReason || item.eventName || '—'}</Text>
      {item.reply ? (
        <Text style={styles.reply}>Reply: {item.reply} {item.repliedAt ? `• ${new Date(item.repliedAt).toLocaleString()}` : ''}</Text>
      ) : null}
      <View style={styles.cardFooter}>
        <Text style={styles.meta}>ID: {item.id?.slice(0, 8)}</Text>
        <Text style={styles.metaRight}>{item.eventPermissionStatus ? `Status: ${item.eventPermissionStatus}` : ''}</Text>
      </View>
    </View>
  );
};

export default function TeacherDairy({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [diaries, setDiaries] = useState([]);
  const [token, setToken] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [type, setType] = useState('daily');
  const [report, setReport] = useState('');
  const [classId, setClassId] = useState('');
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');
  const [leaveType, setLeaveType] = useState('sick');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const t = await AsyncStorage.getItem('teacher_token');
        if (t) setToken(t);
      } catch (e) {
        console.warn('failed to load token', e);
      }
      fetchDiaries();
    };
    load();
  }, []);

  const fetchDiaries = async () => {
    setLoading(true);
    try {
      const t = token || await AsyncStorage.getItem('teacher_token');
      if (!t) {
        setDiaries([]);
        setLoading(false);
        return;
      }
      const res = await axios.get(API_GET, { headers: { Authorization: `Bearer ${t}` } });
      if (res.data && res.data.success) {
        setDiaries(res.data.diaries || []);
      } else {
        setDiaries([]);
      }
    } catch (e) {
      console.warn('fetch diaries failed', e);
      setDiaries([]);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setType('daily');
    setReport('');
    setClassId('');
    setLeaveFrom('');
    setLeaveTo('');
    setLeaveType('sick');
    setEventName('');
    setEventDate('');
  };

  const createDiary = async () => {
    setSubmitting(true);
    try {
      const t = token || await AsyncStorage.getItem('teacher_token');
      if (!t) {
        Alert.alert('Unauthorized', 'No token found. Please login again.');
        setSubmitting(false);
        return;
      }
  const payload = { type };
      if (type === 'daily') payload.report = report;
      if (type === 'class_report') { payload.report = report; payload.classId = classId; }
      if (type === 'leave') { payload.leaveType = leaveType; payload.leaveFrom = leaveFrom; payload.leaveTo = leaveTo; payload.leaveReason = report; }
      if (type === 'event_permission') { payload.eventName = eventName; payload.eventDate = eventDate; payload.eventPermissionStatus = 'pending'; payload.permissionReason = report; }

      const res = await axios.post(API_POST, payload, { headers: { Authorization: `Bearer ${t}` } });
      if (res.data && res.data.success) {
        Alert.alert('Success', 'Diary entry created');
        setModalVisible(false);
        resetForm();
        fetchDiaries();
      } else {
        console.warn('create failed', res.data);
        Alert.alert('Failed', res.data?.message || 'Unable to create diary');
      }
    } catch (e) {
      console.warn('create diary error', e?.response || e);
      Alert.alert('Error', (e && e.response && e.response.data && e.response.data.message) || 'Failed to create diary');
    }
    setSubmitting(false);
  };

  const renderEmpty = () => (
    <View style={{ padding: 24, alignItems: 'center' }}>
      <Text style={{ color: '#6b7280' }}>No diary entries yet. Tap + to add one.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Teacher Diary</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color="#4f46e5" /><Text style={{ marginTop: 8 }}>Loading diaries...</Text></View>
      ) : (
        <FlatList
          data={diaries}
          keyExtractor={(i) => i.id}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => <DiaryItem item={item} />}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Diary Entry</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.rowOptions}>
              {['daily','class_report','leave','event_permission'].map((t) => (
                <TouchableOpacity key={t} onPress={() => setType(t)} style={[styles.optionPill, type===t && styles.optionPillActive]}>
                  <Text style={[styles.optionText, type===t && styles.optionTextActive]}>{t.replace('_',' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {(type === 'daily' || type === 'class_report') && (
              <>
                <Text style={styles.label}>Report</Text>
                <TextInput value={report} onChangeText={setReport} placeholder="Write the report..." multiline style={styles.textarea} />
              </>
            )}

            {type === 'class_report' && (
              <>
                <Text style={styles.label}>Class ID</Text>
                <TextInput value={classId} onChangeText={setClassId} placeholder="e.g. class-123" style={styles.input} />
              </>
            )}

            {type === 'leave' && (
              <>
                <Text style={styles.label}>Leave Type</Text>
                <View style={styles.rowOptions}>
                  {['sick','casual','personal'].map((lt) => (
                    <TouchableOpacity key={lt} onPress={() => setLeaveType(lt)} style={[styles.optionPill, leaveType===lt && styles.optionPillActive]}>
                      <Text style={[styles.optionText, leaveType===lt && styles.optionTextActive]}>{lt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.label}>From (YYYY-MM-DD)</Text>
                <TextInput value={leaveFrom} onChangeText={setLeaveFrom} placeholder="2025-10-07" style={styles.input} />
                <Text style={styles.label}>To (YYYY-MM-DD)</Text>
                <TextInput value={leaveTo} onChangeText={setLeaveTo} placeholder="2025-10-09" style={styles.input} />
                <Text style={styles.label}>Reason</Text>
                <TextInput value={report} onChangeText={setReport} placeholder="Reason for leave" multiline style={styles.textarea} />
              </>
            )}

            {type === 'event_permission' && (
              <>
                <Text style={styles.label}>Event Name</Text>
                <TextInput value={eventName} onChangeText={setEventName} placeholder="Annual Sports Day" style={styles.input} />
                <Text style={styles.label}>Event Date (YYYY-MM-DD)</Text>
                <TextInput value={eventDate} onChangeText={setEventDate} placeholder="2025-10-15" style={styles.input} />
                <Text style={styles.label}>Permission Reason</Text>
                <TextInput value={report} onChangeText={setReport} placeholder="Why the event needs permission" multiline style={styles.textarea} />
              </>
            )}

            <View style={{ height: 12 }} />
            <TouchableOpacity style={[styles.btn, submitting && { opacity: 0.7 }]} onPress={createDiary} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit</Text>}
            </TouchableOpacity>
            <View style={{ height: 20 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f6f8ff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eef2ff' },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  addBtn: { backgroundColor: '#4f46e5', width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e9ecf3' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontWeight: '800', color: '#0b2b5a' },
  cardDate: { color: '#6b7280', fontSize: 12 },
  cardBody: { color: '#111827', marginBottom: 8 },
  reply: { marginTop: 8, color: '#059669', fontWeight: '700' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { color: '#6b7280', fontSize: 12 },
  metaRight: { color: '#6b7280', fontSize: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eef2ff' },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  label: { marginTop: 12, marginBottom: 6, color: '#374151', fontWeight: '600' },
  input: { backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  textarea: { backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', minHeight: 100, textAlignVertical: 'top' },
  rowOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionPill: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', marginRight: 8, marginBottom: 8 },
  optionPillActive: { backgroundColor: '#4f46e5' },
  optionText: { color: '#374151' },
  optionTextActive: { color: '#fff' },
  btn: { backgroundColor: '#4f46e5', padding: 14, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
});
