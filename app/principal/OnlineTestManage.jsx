import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { rem } from '../utils/responsive';

// A responsive, mobile-first screen for principal to view online tests and submissions
const OnlineTestManage = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [tests, setTests] = useState([]);
  const [testsLoading, setTestsLoading] = useState(false);
  const [subModalVisible, setSubModalVisible] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [subLoading, setSubLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [classesModalVisible, setClassesModalVisible] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const getAuthAndSchool = async () => {
    const principal_token = await AsyncStorage.getItem('principal_token');
    const userRaw = await AsyncStorage.getItem('user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const schools = user?.user?.schools || user?.schools || [];
    const schoolId = schools[0]?.id || 1;
    return { principal_token, schoolId };
  };

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const { principal_token, schoolId } = await getAuthAndSchool();
      const res = await fetch(`https://1rzlgxk8-5001.inc1.devtunnels.ms/api/classes/${schoolId}`, {
        headers: { Authorization: `Bearer ${principal_token}` },
      });
      const body = await res.json();
      if (body?.success && Array.isArray(body.classes)) {
        setClasses(body.classes);
        // auto-select first class
        if (body.classes.length) setSelectedClass(body.classes[0].id);
      } else setClasses([]);
    } catch (e) {
      console.warn('fetchClasses error', e);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTests = async (classId) => {
    if (!classId) return;
    setTestsLoading(true);
    try {
      const { principal_token } = await getAuthAndSchool();
      const url = `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/onlineTest/online-test?classId=${encodeURIComponent(classId)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${principal_token}` } });
      const body = await res.json();
      if (body?.success && Array.isArray(body.tests)) {
        // sort recent first
        const sorted = body.tests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setTests(sorted);
      } else setTests([]);
    } catch (e) {
      console.warn('fetchTests error', e);
      setTests([]);
    } finally {
      setTestsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClasses();
    if (selectedClass) await fetchTests(selectedClass);
    setRefreshing(false);
  };

  useEffect(() => {
    if (selectedClass) fetchTests(selectedClass);
  }, [selectedClass]);

  const fetchSubmissions = async (testId) => {
    setSubLoading(true);
    try {
      const { principal_token } = await getAuthAndSchool();
      const url = `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/onlineTest/online-test/${testId}/submissions`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${principal_token}` } });
      const body = await res.json();
      if (body?.success && Array.isArray(body.submissions)) setSubmissions(body.submissions);
      else setSubmissions([]);
      setSubModalVisible(true);
    } catch (e) {
      console.warn('fetchSubmissions error', e);
      setSubmissions([]);
    } finally {
      setSubLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Online Tests</Text>

      {/* Class selector */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classBar} contentContainerStyle={{ paddingHorizontal: rem(8), paddingRight: rem(8) }}>
          {loading ? (
            <ActivityIndicator />
          ) : (
            classes.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.classPill, selectedClass === c.id && styles.classPillActive]}
                onPress={() => setSelectedClass(c.id)}
              >
                <Text style={[styles.classText, selectedClass === c.id && styles.classTextActive]}>{c.name}</Text>
                <Text style={styles.classSubtitle}>{(c.sections || c.section || []).length} sections</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Open full classes selector */}
        <TouchableOpacity style={styles.selectorButton} onPress={() => setClassesModalVisible(true)}>
          <Text style={styles.selectorButtonText}>All</Text>
        </TouchableOpacity>
      </View>

      {/* Tests list */}
      <View style={styles.testsList}>
        {testsLoading ? (
          <ActivityIndicator />
        ) : tests.length === 0 ? (
          <Text style={styles.empty}>No tests for this class. Pull down to refresh or select another class.</Text>
        ) : (
          <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            {tests.map((t) => {
              const qCount = (() => {
                try {
                  const parsed = JSON.parse(t.questions || '[]');
                  return Array.isArray(parsed) ? parsed.length : 0;
                } catch (e) {
                  return 0;
                }
              })();

              return (
                <View key={t.id} style={styles.testCard}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.infoRow}>
                      <Text style={styles.testSubject}>{t.subject}</Text>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{t.questionType || 'objective'}</Text>
                      </View>
                    </View>
                    <Text style={styles.testMeta}>{t.chapterPrompt}</Text>
                    <Text style={styles.testDate}>{new Date(t.createdAt).toLocaleString()}</Text>
                    <Text style={styles.questionCount}>{qCount} questions</Text>
                  </View>
                  <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                    <TouchableOpacity style={styles.subButton} onPress={() => fetchSubmissions(t.id)}>
                      <Text style={styles.subButtonText}>📝 Submissions</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Submissions Modal */}
      <Modal visible={subModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Submissions</Text>
            {subLoading ? (
              <ActivityIndicator />
            ) : submissions.length === 0 ? (
              <Text style={styles.empty}>No submissions yet.</Text>
            ) : (
              <ScrollView>
                {submissions.map((s) => (
                  <View key={s.id} style={styles.subCard}>
                    <Text style={styles.subName}>{s.student?.studentName || 'Student'}</Text>
                    <Text style={styles.subDetail}>Score: {s.score}</Text>
                    <Text style={styles.subDetail}>Submitted: {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '-'}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => setSubModalVisible(false)}>
              <Text style={{ color: '#ef4444', fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Classes selector modal */}
      <Modal visible={classesModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: rem(600) }]}>
            <Text style={styles.modalTitle}>Select Class</Text>
            <ScrollView>
              {classes.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.classRow}
                  onPress={() => {
                    setSelectedClass(c.id);
                    setClassesModalVisible(false);
                  }}
                >
                  <View>
                    <Text style={{ fontWeight: '700' }}>{c.name}</Text>
                    <Text style={{ color: '#666', marginTop: rem(4) }}>{(c.sections || c.section || []).map(s => s.sectionName || s).join(', ')}</Text>
                  </View>
                  <Text style={{ color: '#666' }}>{(c.sections || c.section || []).length}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setClassesModalVisible(false)}>
              <Text style={{ color: '#ef4444' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: rem(16),
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: rem(22),
    fontWeight: '700',
    marginBottom: rem(12),
    color: '#111',
  },
  classBar: {
    marginBottom: rem(12),
  },
  classPill: {
    paddingVertical: rem(8),
    paddingHorizontal: rem(12),
    backgroundColor: '#fff',
    borderRadius: rem(20),
    marginRight: rem(8),
    borderWidth: 1,
    borderColor: '#eee',
  },
  classPillActive: {
    backgroundColor: '#000',
  },
  classText: {
    color: '#333',
    fontWeight: '600',
  },
  classTextActive: {
    color: '#fff',
  },
  classSubtitle: {
    fontSize: rem(11),
    color: '#777',
    marginTop: rem(4),
  },
  selectorButton: {
    backgroundColor: '#fff',
    borderRadius: rem(10),
    paddingHorizontal: rem(12),
    paddingVertical: rem(8),
    marginLeft: rem(8),
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectorButtonText: {
    fontWeight: '700',
  },
  testsList: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: rem(8),
    paddingVertical: rem(4),
    borderRadius: rem(12),
  },
  badgeText: {
    color: '#3730a3',
    fontSize: rem(11),
    fontWeight: '700',
  },
  empty: {
    textAlign: 'center',
    color: '#666',
    marginTop: rem(24),
  },
  testCard: {
    backgroundColor: '#fff',
    borderRadius: rem(12),
    padding: rem(14),
    marginBottom: rem(12),
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  testSubject: {
    fontSize: rem(16),
    fontWeight: '700',
    marginBottom: rem(6),
  },
  testMeta: {
    color: '#666',
    marginBottom: rem(6),
  },
  testDate: {
    color: '#999',
  },
  questionCount: {
    marginTop: rem(8),
    color: '#444',
    fontSize: rem(13),
  },
  subButton: {
    backgroundColor: '#000',
    paddingVertical: rem(8),
    paddingHorizontal: rem(10),
    borderRadius: rem(8),
  },
  subButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: rem(16),
  },
  modalContent: {
    width: '94%',
    maxHeight: rem(520),
    backgroundColor: '#fff',
    borderRadius: rem(12),
    padding: rem(14),
  },
  modalTitle: {
    fontSize: rem(18),
    fontWeight: '700',
    marginBottom: rem(12),
  },
  modalClose: {
    marginTop: rem(12),
    alignSelf: 'center',
  },
  classRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: rem(12),
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  subCard: {
    backgroundColor: '#f8f9fa',
    padding: rem(12),
    borderRadius: rem(10),
    marginBottom: rem(10),
  },
  subName: {
    fontWeight: '700',
  },
  subDetail: {
    color: '#666',
  },
});

export default OnlineTestManage;
