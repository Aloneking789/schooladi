import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const API_LIST = 'https://1rzlgxk8-5001.inc1.devtunnels.ms/api/complaints/complaints';
const API_REPLY = (id) => `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/complaints/complaints/${id}/reply`;

export default function ComplaintsDispossle({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState([]);
  const [token, setToken] = useState('');
  const [selected, setSelected] = useState(null);
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
      fetchList(t);
    };
    load();
  }, []);

  const fetchList = async (tkn) => {
    setLoading(true);
    try {
      const res = await axios.get(API_LIST, { headers: { Authorization: `Bearer ${tkn}` } });
      if (res.data && res.data.success) setComplaints(res.data.complaints || []);
      else setComplaints([]);
    } catch (e) {
      console.warn('fetch complaints failed', e);
      setComplaints([]);
    }
    setLoading(false);
  };

  const openComplaint = (c) => {
    setSelected(c);
    setReplyText('');
  };

  const submitReply = async () => {
    if (!selected) return;
    try {
      const res = await axios.post(API_REPLY(selected.id), { reply: replyText }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data && res.data.success) {
        Alert.alert('Success', 'Reply posted');
        setSelected(null);
        fetchList(token);
      } else {
        Alert.alert('Failed', res.data?.message || 'Reply failed');
      }
    } catch (e) {
      console.warn('reply error', e);
      Alert.alert('Error', 'Reply request failed');
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => openComplaint(item)}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.status}>{item.status}</Text>
      </View>
      <Text style={styles.desc}>{item.description}</Text>
      <View style={{ marginTop: 8 }}>
        <Text style={styles.meta}>{item.student?.studentName || ''} • {item.student?.class_ || ''}{item.student?.sectionclass ? ` - ${item.student.sectionclass}` : ''}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.header}><Text style={styles.headerTitle}>Complaints</Text></View>
      {loading ? <ActivityIndicator style={{ marginTop: 20 }} /> : (
        <FlatList data={complaints} keyExtractor={(i) => i.id} renderItem={renderItem} contentContainerStyle={{ padding: 12 }} ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No complaints found</Text>} />
      )}

      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Complaint</Text>
            <TouchableOpacity onPress={() => setSelected(null)}><Ionicons name="close" size={20} /></TouchableOpacity>
          </View>
          <View style={{ padding: 16 }}>
            <Text style={{ fontWeight: '700', marginBottom: 8 }}>{selected?.title}</Text>
            <Text style={{ marginBottom: 12 }}>{selected?.description}</Text>
            <Text style={{ marginBottom: 8 }}>Conversation:</Text>
            {selected?.Reply && selected.Reply.length > 0 ? selected.Reply.map((r, idx) => (
              <View key={idx} style={{ marginBottom: 8 }}>
                <Text style={{ fontWeight: r.sender === 'principal' ? '700' : '600', color: r.sender === 'principal' ? '#059669' : '#111' }}>{r.sender}: {r.message}</Text>
                <Text style={{ color: '#6b7280', fontSize: 12 }}>{new Date(r.timestamp).toLocaleString()}</Text>
              </View>
            )) : <Text style={{ color: '#6b7280' }}>No conversation yet.</Text>}

            <Text style={{ marginTop: 12 }}>Reply</Text>
            <TextInput value={replyText} onChangeText={setReplyText} placeholder="Write reply..." style={styles.input} multiline />
            <TouchableOpacity style={styles.submitBtn} onPress={submitReply}><Text style={{ color: '#fff' }}>Send Reply</Text></TouchableOpacity>
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
  title: { fontWeight: '700' },
  desc: { color: '#111827', marginTop: 6 },
  status: { backgroundColor: '#fde68a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  meta: { color: '#6b7280', fontSize: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eef2ff' },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  input: { minHeight: 120, borderWidth: 1, borderColor: '#e5e7eb', padding: 8, borderRadius: 8, backgroundColor: '#fff', marginTop: 8 },
  submitBtn: { backgroundColor: '#059669', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 12 }
});
