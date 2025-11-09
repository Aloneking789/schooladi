import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { rem } from '../utils/responsive';

const API_BASE_DIARY = 'https://api.pbmpublicschool.in/api/teacherdairy/teacher-diary';
const API_POST = API_BASE_DIARY;
const API_GET = `${API_BASE_DIARY}/my`;

const DiaryItem = ({ item }) => {
  const prettyDate = new Date(item.date).toLocaleString();
  // If API returns an array of replies, show only the latest one here (single reply view)
  const latestReply =
    item.reply ||
    (Array.isArray(item.replies) && item.replies.length > 0 && (item.replies[0].text || item.replies[0].reply)) ||
    null;
  const latestReplyAt =
    item.repliedAt ||
    (Array.isArray(item.replies) && item.replies.length > 0 && (item.replies[0].createdAt || item.replies[0].repliedAt)) ||
    null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{(item.type || '').replace('_', ' ').toUpperCase()}</Text>
        <Text style={styles.cardDate}>{prettyDate}</Text>
      </View>
      <Text style={styles.cardBody}>{item.report || item.leaveReason || item.permissionReason || item.eventName || '—'}</Text>
      {latestReply ? (
        <Text style={styles.reply}>Reply: {latestReply} {latestReplyAt ? `• ${new Date(latestReplyAt).toLocaleString()}` : ''}</Text>
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
  const [teacherUuid, setTeacherUuid] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [type, setType] = useState('daily');
  const [report, setReport] = useState('');
  const [classId, setClassId] = useState('');
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [leaveType, setLeaveType] = useState('sick');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const t = await AsyncStorage.getItem('teacher_token');
        if (t) setToken(t);
        // also try to read teacher profile stored in AsyncStorage
        try {
          const userRaw = await AsyncStorage.getItem('teacher_user');
          console.log('teacher_user from storage:', userRaw ? 'Found' : 'Not found');
          console.log("teacher_user value:", userRaw);
          if (userRaw) {
            const user = JSON.parse(userRaw);
            // user sample contains id (uuid), teacherId (code), classId
            setTeacherUuid(user.id || user._id || '');
            setTeacherCode(user.teacherId || user.LoguserID || '');
            // prefer explicit classId, fall back to assignedClass or classId fields
            const cls = user.classId || user.class || user.assignedClass || user.classId;
            if (cls) setClassId(cls.toString());
            // call fetchDiaries with the explicit teacher id we just read so we avoid race with state update
            const initialTeacherId = user.id || user._id || '';
            await fetchDiaries(initialTeacherId);
            return;
          }
        } catch (e) {
          console.warn('failed to load teacher_user from storage', e);
        }
      } catch (e) {
        console.warn('failed to load token', e);
      }
      // If we didn't find a stored user earlier, call fetchDiaries without teacherId (it will fall back to /my)
      await fetchDiaries();
    };
    load();
  }, []);

  const fetchDiaries = async (teacherIdParam) => {
    setLoading(true);
    try {
      const t = token || await AsyncStorage.getItem('teacher_token');
      if (!t) {
        setDiaries([]);
        setLoading(false);
        return;
      }
      // prefer explicit param -> component state -> storage
      let teacherIdToUse = teacherIdParam || teacherUuid;
      if (!teacherIdToUse) {
        try {
          const userRaw = await AsyncStorage.getItem('teacher_user');
          if (userRaw) {
            const user = JSON.parse(userRaw);
            teacherIdToUse = user.id || user._id || '';
          }
        } catch (er) {
          // ignore
        }
      }

      const url = teacherIdToUse ? `${API_BASE_DIARY}/teacher/${teacherIdToUse}` : API_GET;
      console.log('Fetching diaries from', url);
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${t}` } });
      if (res.data && res.data.success) {
        // API returns `diaries` array per your sample
        setDiaries(res.data.diaries || res.data.data || []);
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
      console.log('Using token for createDiary:', t ? 'Yes' : 'No');
      console.log("Token value:", t);

      if (!t) {
        Alert.alert('Unauthorized', 'No token found. Please login again.');
        setSubmitting(false);
        return;
      }
  // Attach teacher identifier to payload (prefer UUID, fall back to teacher code)
  const payload = { type, teacherId: teacherUuid || teacherCode };
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
    <View style={{ padding: rem(24), alignItems: 'center' }}>
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
      {/* teacher info */}
      {(teacherCode || classId) && (
        <View style={{ paddingHorizontal: rem(12), paddingVertical: rem(6) }}>
          <Text style={{ color: '#374151' }}>Teacher: {teacherCode || teacherUuid}</Text>
          {classId ? <Text style={{ color: '#6b7280' }}>Class: {classId}</Text> : null}
        </View>
      )}

      {loading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color="#4f46e5" /><Text style={{ marginTop: rem(8) }}>Loading diaries...</Text></View>
      ) : (
        <FlatList
          data={diaries}
          keyExtractor={(i) => i.id}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={{ padding: rem(16) }}
          renderItem={({ item }) => <DiaryItem item={item} />}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Diary Entry</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: rem(16) }}>
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
                <TouchableOpacity onPress={() => { setPickerDate(leaveFrom ? new Date(leaveFrom) : new Date()); setShowFromPicker(true); }} style={styles.input}>
                  <Text style={{ color: leaveFrom ? '#111827' : '#9ca3af' }}>{leaveFrom || 'Select start date'}</Text>
                </TouchableOpacity>
                <Text style={styles.label}>To (YYYY-MM-DD)</Text>
                <TouchableOpacity onPress={() => { setPickerDate(leaveTo ? new Date(leaveTo) : new Date()); setShowToPicker(true); }} style={styles.input}>
                  <Text style={{ color: leaveTo ? '#111827' : '#9ca3af' }}>{leaveTo || 'Select end date'}</Text>
                </TouchableOpacity>

                {/* Date pickers */}
                {showFromPicker && (
                  <DateTimePicker
                    value={pickerDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                    onChange={(e, d) => {
                      setShowFromPicker(Platform.OS === 'ios');
                      if (d) {
                        const yyyy = d.getFullYear();
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const dd = String(d.getDate()).padStart(2, '0');
                        setLeaveFrom(`${yyyy}-${mm}-${dd}`);
                      }
                    }}
                  />
                )}
                {showToPicker && (
                  <DateTimePicker
                    value={pickerDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                    onChange={(e, d) => {
                      setShowToPicker(Platform.OS === 'ios');
                      if (d) {
                        const yyyy = d.getFullYear();
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const dd = String(d.getDate()).padStart(2, '0');
                        setLeaveTo(`${yyyy}-${mm}-${dd}`);
                      }
                    }}
                  />
                )}
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

            <View style={{ height: rem(12) }} />
            <TouchableOpacity style={[styles.btn, submitting && { opacity: 0.7 }]} onPress={createDiary} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit</Text>}
            </TouchableOpacity>
            <View style={{ height: rem(20) }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f6f8ff', marginBottom:52 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: rem(8), backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eef2ff' },
  title: { fontSize: rem(20), fontWeight: '800', color: '#111827' },
  addBtn: { backgroundColor: '#4f46e5', width: rem(36), height: rem(36), borderRadius: rem(10), justifyContent: 'center', alignItems: 'center' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#efeeeeff', borderRadius: rem(12), padding: rem(16), marginBottom: rem(15), borderWidth: 1, borderColor: '#e9ecf3', height: rem(150) },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: rem(8) },
  cardTitle: { fontWeight: '800', color: '#0b2b5a' },
  cardDate: { color: '#6b7280', fontSize: rem(12) },
  cardBody: { color: '#111827', marginBottom: rem(8) },
  reply: { marginTop: rem(8), color: '#059669', fontWeight: '700' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { color: '#6b7280', fontSize: rem(12) },
  metaRight: { color: '#6b7280', fontSize: rem(12) },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: rem(16), borderBottomWidth: 1, borderBottomColor: '#eef2ff' },
  modalTitle: { fontSize: rem(18), fontWeight: '800' },
  label: { marginTop: rem(12), marginBottom: rem(6), color: '#374151', fontWeight: '600' },
  input: { backgroundColor: '#fff', padding: rem(10), borderRadius: rem(8), borderWidth: 1, borderColor: '#e5e7eb' },
  textarea: { backgroundColor: '#fff', padding: rem(10), borderRadius: rem(8), borderWidth: 1, borderColor: '#e5e7eb', minHeight: rem(100), textAlignVertical: 'top' },
  rowOptions: { flexDirection: 'row', flexWrap: 'wrap' },
  optionPill: { paddingVertical: rem(8), paddingHorizontal: rem(12), backgroundColor: '#fff', borderRadius: rem(20), borderWidth: 1, borderColor: '#e5e7eb', marginRight: rem(8), marginBottom: rem(8) },
  optionPillActive: { backgroundColor: '#4f46e5' },
  optionText: { color: '#374151' },
  optionTextActive: { color: '#fff' },
  btn: { backgroundColor: '#4f46e5', padding: rem(14), borderRadius: rem(10), alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
});
