import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const BASE = 'https://1rzlgxk8-5001.inc1.devtunnels.ms/api';

export default function HomeWork() {
  const [token, setToken] = useState(null);
  const [classId, setClassId] = useState(null);
  const [studentSection, setStudentSection] = useState('');
  const [homeworks, setHomeworks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedHomework, setSelectedHomework] = useState(null);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const tokenRaw = await AsyncStorage.getItem('student_token');
        if (tokenRaw) setToken(tokenRaw);

        const userRaw = await AsyncStorage.getItem('student_user');
        if (userRaw) {
          try {
            const u = JSON.parse(userRaw);
            // user may store class as classI, classId or classId
            const c = u.classI || u.classId || u.class || (u.class && u.class.id);
            setClassId(c);
            // resolve student section from common keys
            const sec = u.sectionclass || u.section || u.assignedSection || (u.user && (u.user.sectionclass || u.user.section)) || '';
            setStudentSection(String(sec || '').trim());
          } catch (e) {
            // ignore parse errors
          }
        }
      } catch (e) {
        console.warn('Failed to load auth from storage', e);
      }
    };
    loadAuth();
  }, []);

  // refetch when token, classId or studentSection change
  useEffect(() => {
    if (token && classId) {
      fetchHomeworks();
    }
  }, [token, classId, studentSection]);

  const fetchHomeworks = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${BASE}/homeworks/homeworks/by-class/${classId}`;
      const res = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res?.data?.success) {
        let hws = res.data.homeworks || [];
        // If we have a student section, filter homeworks to those assigned to that section
        if (studentSection) {
          hws = hws.filter(hw => {
            const asg = hw.assignedSections || hw.assignedSection || hw.section || hw.sections;
            if (!asg) return true; // if homework has no section info, include it
            if (Array.isArray(asg)) return asg.map(String).map(s => s.trim()).includes(studentSection);
            if (typeof asg === 'string') return asg.split(',').map(s => s.trim()).includes(studentSection);
            return String(asg) === studentSection;
          });
        }
        setHomeworks(hws);
      } else {
        setError(res?.data?.message || 'Failed to load homeworks');
      }
    } catch (err) {
      console.error('fetchHomeworks error', err?.response || err.message || err);
      setError(err?.response?.data?.message || 'Failed to load homeworks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchHomeworks();
  };

  const openAttachment = async (url) => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot open attachment', 'The attachment URL is not valid.');
      }
    } catch (e) {
      console.warn('openAttachment error', e);
      Alert.alert('Error', 'Failed to open attachment');
    }
  };

  const renderItem = ({ item }) => {
    const due = item.dueDate ? new Date(item.dueDate) : null;
    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => setSelectedHomework(item)}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{item.title}</Text>
          {due && (
            <View style={styles.dueChip}>
              <Text style={styles.dueText}>{due.toLocaleDateString()}</Text>
            </View>
          )}
        </View>
        <Text style={styles.content} numberOfLines={4}>{item.content}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.classText}>{item.class?.name || item.classId || ''}</Text>
          <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
        {item.attachmentUrl ? (
          <TouchableOpacity style={styles.attachmentBtn} onPress={() => openAttachment(item.attachmentUrl)}>
            <Text style={styles.attachmentText}>Open attachment</Text>
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
    );
  };

  if (!token || !classId) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>Loading student info...</Text>
        <TouchableOpacity style={styles.retry} onPress={() => {
          // try to reload from storage
          (async () => {
            const tokenRaw = await AsyncStorage.getItem('student_token');
            if (tokenRaw) setToken(tokenRaw);
            const userRaw = await AsyncStorage.getItem('student_user');
            if (userRaw) {
              try {
                const u = JSON.parse(userRaw);
                const c = u.classI || u.classId || u.class || (u.class && u.class.id);
                setClassId(c);
              } catch (e) {}
            }
          })();
        }}>
          <Text style={styles.retryText}>Reload</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Homeworks</Text>
        <Text style={styles.headerSubtitle}>
          {homeworks.length > 0
            ? `${homeworks.length} Assignment${homeworks.length > 1 ? 's' : ''} for your class${studentSection ? ` (Section ${studentSection})` : ''}`
            : `Assigned to your class${studentSection ? ` (Section ${studentSection})` : ''}`}
        </Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#667eea" /></View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.error}>{error}</Text></View>
      ) : homeworks.length === 0 ? (
        <View style={styles.center}><Text style={styles.hint}>No homeworks found for your class.</Text></View>
      ) : (
        <FlatList
          data={homeworks}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={!!selectedHomework}
        onRequestClose={() => setSelectedHomework(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView style={styles.modalScroll}>
              {selectedHomework && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{selectedHomework.title}</Text>
                    {selectedHomework.dueDate && (
                      <View style={styles.dueChip}>
                        <Text style={styles.dueText}>
                          {new Date(selectedHomework.dueDate).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.modalText}>{selectedHomework.content}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.classText}>
                      {selectedHomework.class?.name || selectedHomework.classId || ''}
                    </Text>
                    <Text style={styles.dateText}>
                      {new Date(selectedHomework.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  {selectedHomework.attachmentUrl && (
                    <TouchableOpacity
                      style={[styles.attachmentBtn, styles.modalAttachBtn]}
                      onPress={() => openAttachment(selectedHomework.attachmentUrl)}
                    >
                      <Text style={styles.attachmentText}>Open attachment</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedHomework(null)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f9fafb' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalScroll: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    marginRight: 12,
  },
  modalText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 16,
  },
  modalAttachBtn: {
    marginTop: 20,
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  header: { marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  headerSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  list: { paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  dueChip: { backgroundColor: '#eef2ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  dueText: { color: '#4f46e5', fontSize: 12, fontWeight: '600' },
  content: { color: '#374151', fontSize: 14, lineHeight: 20, marginBottom: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  classText: { fontSize: 12, color: '#6b7280' },
  dateText: { fontSize: 12, color: '#9ca3af' },
  attachmentBtn: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: '#e6eef8', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  attachmentText: { color: '#065f46', fontWeight: '600' },
  center: { padding: 24, alignItems: 'center' },
  hint: { color: '#6b7280' },
  error: { color: '#dc2626' },
  retry: { marginTop: 10, backgroundColor: '#eef2ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  retryText: { color: '#4f46e5', fontWeight: '600' },
});
