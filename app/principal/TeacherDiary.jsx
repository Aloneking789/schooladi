import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const API_GET = 'https://api.pbmpublicschool.in/api/teacherdairy/teacher-diary';
const API_REPLY = (id) => `https://api.pbmpublicschool.in/api/teacherdairy/teacher-diary/${id}/reply`;

export default function TeacherDiary({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [token, setToken] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    const load = async () => {
      const t = await AsyncStorage.getItem('principal_token');
      if (!t) {
        Alert.alert('Missing token', 'principal_token not found in storage.');
        setLoading(false);
        return;
      }
      setToken(t);
      fetchEntries(t);
    };
    load();
  }, []);

  const fetchEntries = async (tkn) => {
    setLoading(true);
    try {
      const res = await axios.get(API_GET, { headers: { Authorization: `Bearer ${tkn}` } });
      if (res.data && res.data.success) setEntries(res.data.diaries,res.teacher || []);
      else setEntries([]);
    } catch (e) {
      console.warn('fetch failed', e);
      setEntries([]);
    }
    setLoading(false);
  };

  const openReply = (item) => {
    setReplyingTo(item);
    setReplyText(item.reply || '');
  };

  const submitReply = async () => {
    if (!replyingTo) return;
    try {
      const res = await axios.post(API_REPLY(replyingTo.id), { reply: replyText }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data && res.data.success) {
        Alert.alert('Success', 'Reply saved');
        setReplyingTo(null);
        fetchEntries(token);
      } else {
        Alert.alert('Failed', res.data?.message || 'Failed to save reply');
      }
    } catch (e) {
      console.warn('reply failed', e);
      Alert.alert('Error', 'Reply request failed');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.title}>{(item.type || '').replace('_', ' ').toUpperCase()}</Text>
        <Text style={styles.date}>{new Date(item.date).toLocaleString()}</Text>
      </View>
      <Text style={styles.body}>{item.report || item.leaveReason || item.permissionReason || item.eventName || '—'}</Text>
      <Text style={styles.meta}>ID: {item.id?.slice(0, 8)}</Text>
      <Text style={styles.meta}>Teacher: {item.teacher.fullName || '—'}</Text>
      {item.reply ? <Text style={styles.reply}>Reply: {item.reply}</Text> : null}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
        <TouchableOpacity style={styles.replyBtn} onPress={() => openReply(item)}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
          <Text style={styles.replyBtnText}>Reply</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Teacher Diary - Admin</Text>
      </View>
      {loading ? <ActivityIndicator style={{ marginTop: 20 }} /> : (
        <FlatList data={entries} keyExtractor={(i) => i.id} renderItem={renderItem} contentContainerStyle={{ padding: 12 }} ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No entries found</Text>} />
      )}

      <Modal visible={!!replyingTo} animationType="slide" onRequestClose={() => setReplyingTo(null)}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Reply to Diary</Text>
            <TouchableOpacity onPress={() => setReplyingTo(null)}><Ionicons name="close" size={20} /></TouchableOpacity>
          </View>
          <View style={{ padding: 16 }}>
            <Text style={{ marginBottom: 8 }}>Original:</Text>
            <Text style={{ marginBottom: 12 }}>{replyingTo?.report || replyingTo?.eventName || replyingTo?.leaveReason}</Text>
            <Text style={{ marginBottom: 8 }}>Reply</Text>
            <TextInput value={replyText} onChangeText={setReplyText} placeholder="Write reply..." style={styles.input} multiline />
            <View style={{ height: 12 }} />
            <TouchableOpacity style={styles.submitBtn} onPress={submitReply}><Text style={{ color: '#fff' }}>Submit Reply</Text></TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eef2ff', backgroundColor: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e9ecf3' },
  title: { fontWeight: '800' },
  date: { color: '#6b7280', fontSize: 12 },
  body: { marginTop: 8, color: '#111827' },
  reply: { marginTop: 8, color: '#059669', fontWeight: '700' },
  replyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4f46e5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  replyBtnText: { color: '#fff', marginLeft: 6 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eef2ff' },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  input: { minHeight: 120, borderWidth: 1, borderColor: '#e5e7eb', padding: 8, borderRadius: 8, backgroundColor: '#fff' },
  submitBtn: { backgroundColor: '#059669', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 12 },
});
