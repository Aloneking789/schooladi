import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const Complaints = ({ token: initialToken, studentId: initialStudentId }) => {
  const [token, setToken] = useState(initialToken || '');
  const [studentId, setStudentId] = useState(initialStudentId || '');
  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [complaintsError, setComplaintsError] = useState(null);
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [replyingComplaint, setReplyingComplaint] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  useEffect(() => {
    const loadAuth = async () => {
      if (!token) {
        const tokenRaw = await AsyncStorage.getItem('student_token');
        if (tokenRaw) setToken(tokenRaw);
      }
      if (!studentId) {
        const userRaw = await AsyncStorage.getItem('student_user');
        if (userRaw) {
          try {
            const u = JSON.parse(userRaw);
            setStudentId(u.StudentId || u.studentId || '');
          } catch (e) {
            // ignore
          }
        }
      }
    };
    loadAuth();
  }, []);

  useEffect(() => {
    const fetchComplaints = async () => {
      if (!token || !studentId) return;
      setLoadingComplaints(true);
      setComplaintsError(null);
      try {
        const url = `https://api.pbmpublicschool.in/api/complaints/complaints/my/${studentId}`;
        const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data && res.data.success) {
          const sorted = Array.isArray(res.data.complaints) ? res.data.complaints.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];
          setComplaints(sorted);
        } else {
          setComplaints([]);
          setComplaintsError(res.data?.message || 'Failed to load complaints');
        }
      } catch (err) {
        console.error('Failed to fetch complaints', err?.response || err);
        if (err?.response?.status === 404) setComplaintsError('Student not found');
        else setComplaintsError('Failed to load complaints');
      } finally {
        setLoadingComplaints(false);
      }
    };
    fetchComplaints();
  }, [token, studentId]);

  const sendReply = async () => {
    if (!replyText.trim()) return Alert.alert('Validation', 'Please enter a reply');
    if (!token) return Alert.alert('Authentication required', 'Please login as a student to send replies.');
    if (!studentId) return Alert.alert('Missing student id', 'Student ID not available. Please re-login.');

    try {
      setReplySubmitting(true);
      const id = replyingComplaint.id;
      const body = { reply: replyText };
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
      const base = 'https://api.pbmpublicschool.in/api';
      const candidates = [
        `${base}/complaints/${id}/student-reply/${studentId}`,
        `${base}/complaints/complaints/${id}/student-reply/${studentId}`,
      ];
      let res = null;
      let lastErr = null;
      for (const url of candidates) {
        try {
          res = await axios.post(url, body, { headers });
          break;
        } catch (e) {
          lastErr = e;
          if (e?.response?.status && e.response.status !== 404) break;
        }
      }
      if (!res) {
        console.error('All reply POST attempts failed', lastErr);
        const status = lastErr?.response?.status;
        const data = lastErr?.response?.data;
        return Alert.alert('Failed to send reply', data?.message || `Server responded with status ${status || 'unknown'}`);
      }
      if (res.data && res.data.success) {
        setComplaints((prev) => prev.map((c) => c.id === res.data.complaint.id ? res.data.complaint : c));
        setReplyingComplaint(res.data.complaint);
        setReplyText('');
        Alert.alert('Success', 'Reply sent');
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to send reply');
      }
    } catch (err) {
      console.error('Reply error', err);
      const message = err?.response?.data?.message || err?.message || 'Failed to send reply';
      Alert.alert('Error', message);
    } finally {
      setReplySubmitting(false);
    }
  };

  return (
    <View style={complaintStyles.section}>
      <Text style={complaintStyles.sectionTitle}>Your Complaints</Text>
      {loadingComplaints ? (
        <ActivityIndicator />
      ) : complaintsError ? (
        <Text style={complaintStyles.error}>{complaintsError}</Text>
      ) : complaints.length === 0 ? (
        <View><Text>No complaints found.</Text></View>
      ) : (
        <FlatList
          data={complaints}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={complaintStyles.complaintCard}>
              <View style={complaintStyles.complaintHeader}>
                <Text style={complaintStyles.complaintTitle}>{item.title}</Text>
                <View style={[complaintStyles.statusBadge, item.status === 'pending' ? complaintStyles.pendingBadge : complaintStyles.resolvedBadge]}>
                  <Text style={complaintStyles.statusText}>{item.status}</Text>
                </View>
              </View>
              <Text style={complaintStyles.complaintDesc}>{item.description}</Text>
              <Text style={complaintStyles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                <TouchableOpacity style={[complaintStyles.quickActionBtn, { paddingHorizontal: 12, paddingVertical: 8 }]} onPress={() => { setReplyingComplaint(item); setReplyText(''); setReplyModalVisible(true); }}>
                  <Text style={{ color: '#111827', fontWeight: '700' }}>Reply</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {replyModalVisible && replyingComplaint && (
        <View style={complaintStyles.modalOverlay}>
          <View style={complaintStyles.modalContainer}>
            <Text style={complaintStyles.modalTitle}>Reply to: {replyingComplaint.title}</Text>
            <Text style={{ marginBottom: 8, color: '#374151' }}>{replyingComplaint.description}</Text>
            {replyingComplaint.Reply && Array.isArray(replyingComplaint.Reply) && (
              <View style={{ maxHeight: 160, marginBottom: 8 }}>
                <ScrollView style={{ padding: 8, backgroundColor: '#f8fafc', borderRadius: 8 }}>
                  {replyingComplaint.Reply.map((r, idx) => (
                    <View key={idx} style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: '#6b7280' }}>{r.sender} • {new Date(r.timestamp || r.time || r.createdAt).toLocaleString()}</Text>
                      <Text style={{ color: '#111827', marginTop: 4 }}>{r.message}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
            <TextInput placeholder="Type your reply..." value={replyText} onChangeText={setReplyText} style={complaintStyles.input} multiline editable={!replySubmitting} />
            <View style={complaintStyles.modalActions}>
              <TouchableOpacity style={[complaintStyles.modalBtn, { backgroundColor: '#e5e7eb' }]} onPress={() => { setReplyModalVisible(false); setReplyingComplaint(null); setReplyText(''); }} disabled={replySubmitting}>
                <Text style={{ color: '#111827' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[complaintStyles.modalBtn, { backgroundColor: '#667eea' }]} onPress={sendReply} disabled={replySubmitting}>
                <Text style={{ color: '#fff' }}>{replySubmitting ? 'Sending...' : 'Send'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const complaintStyles = StyleSheet.create({
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#1f2937' },
  error: { color: 'red' },
  complaintCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  complaintHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  complaintTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  complaintDesc: { color: '#374151', marginBottom: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pendingBadge: { backgroundColor: '#FEF3C7' },
  resolvedBadge: { backgroundColor: '#D1FAE5' },
  statusText: { fontSize: 12, fontWeight: '700', color: '#111827' },
  modalOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContainer: { width: '100%', maxWidth: 720, backgroundColor: '#fff', borderRadius: 10, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#111827' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', marginBottom: 8, color: '#111827' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  modalBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  quickActionBtn: { alignItems: 'center', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#f8f9fb' },
});

export default Complaints;
