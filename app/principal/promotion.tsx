import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";

interface Student {
  id: string;
  Admission_Number?: string;
  studentName: string;
  rollNumber?: string;
  class_: string;
  sectionclass?: string;
  fatherName?: string;
  phone?: string;
  isTransferCertIssued?: boolean;
  promotionStatus?: string;
  isActive?: boolean;
}

interface Session {
  id: string;
  year: string;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

interface ClassObj {
  id: string;
  name: string;
}

const Promotion: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [nextSession, setNextSession] = useState<Session | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [promotionStatus, setPromotionStatus] = useState<{ [key: string]: string }>({});
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [classList, setClassList] = useState<ClassObj[]>([]);
  const [promotionHistory, setPromotionHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [search, setSearch] = useState("");
  const [newSession, setNewSession] = useState({ year: '', startDate: '', endDate: '' });

  // Get unique class options from classList (for filter dropdown)
  const classOptions = classList.map((cls) => cls.name);

  // Filter students by selected class
  const filteredStudents = classFilter
    ? students.filter((s) => s.class_ === classFilter && s.isActive)
    : students.filter((s) => s.isActive);

  useEffect(() => {
    const getUser = async () => {
      try {
        const userRaw = await AsyncStorage.getItem("principal_user");
        const user = userRaw ? JSON.parse(userRaw) : null;
        const schools = user?.principal_user?.schools || user?.schools || [];
        const schoolId = schools[0]?.id || null;
        setSchoolId(schoolId);
      } catch {
        setSchoolId(null);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    fetchSessions();
    fetchClasses();
  }, [schoolId]);

  const fetchSessions = async () => {
    try {
      const token = await AsyncStorage.getItem("principal_token");
      const res = await fetch(
        `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/sessions/schools/${schoolId}/sessions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setSessions(data.sessions || []);
      if (data.sessions && data.sessions.length > 0) {
        // Fetch active session info
        const activeRes = await fetch(
          `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/sessions/sessions/active?schoolId=${schoolId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const active = (await activeRes.json()).session;
        if (active) {
          setActiveSession(active);
          setSessionFilter(active.id);
          fetchStudents(active.id);
          fetchActiveSession(data.sessions);
        } else {
          setSessionFilter(data.sessions[0].id);
          fetchStudents(data.sessions[0].id);
          fetchActiveSession(data.sessions);
        }
      }
    } catch {
      Alert.alert("Error", "Failed to fetch sessions");
    }
  };

  const fetchStudents = async (sessionId: string) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("principal_token");
      const res = await fetch(
        `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/admission/students/by-school/${schoolId}?sessionId=${sessionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setStudents(data.students || []);
    } catch {
      Alert.alert("Error", "Failed to fetch students");
    }
    setLoading(false);
  };

  const fetchActiveSession = async (allSessionsParam: Session[]) => {
    if (!schoolId) return;
    try {
      const token = await AsyncStorage.getItem("principal_token");
      const res = await fetch(
        `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/sessions/sessions/active?schoolId=${schoolId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setActiveSession(data.session || null);
      let allSessions = allSessionsParam || sessions;
      allSessions = allSessions.sort((a, b) => new Date(a.startDate || a.year).getTime() - new Date(b.startDate || b.year).getTime());
      if (data.session) {
        const idx = allSessions.findIndex((s) => s.id === data.session.id);
        setNextSession(allSessions[idx + 1] || null);
      }
    } catch {
      Alert.alert("Error", "Failed to fetch active session");
    }
  };

  const fetchClasses = async () => {
    if (!schoolId) return;
    try {
      const token = await AsyncStorage.getItem("principal_token");
      const res = await fetch(
        `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/classes/${schoolId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setClassList(data.classes || []);
    } catch {
      Alert.alert("Error", "Failed to fetch class list");
    }
  };

  const fetchPromotionHistory = async () => {
    if (!schoolId) return;
    try {
      const token = await AsyncStorage.getItem("principal_token");
      const res = await fetch(
        `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/sessions/studentsessions/by-school/${schoolId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setPromotionHistory(data.studentSessions || []);
    } catch {
      Alert.alert("Error", "Failed to fetch promotion history");
    }
  };

  // Handle session filter change
  const handleSessionFilter = (sessionId: string) => {
    setSessionFilter(sessionId);
    fetchStudents(sessionId);
  };

  // Handle checkbox selection
  const handleSelect = (studentId: string) => {
    setSelected((prev) => {
      if (prev.includes(studentId)) {
        setPromotionStatus((status) => {
          const newStatus = { ...status };
          delete newStatus[studentId];
          return newStatus;
        });
        return prev.filter((id) => id !== studentId);
      } else {
        setPromotionStatus((status) => ({
          ...status,
          [studentId]: status[studentId] || "Promoted",
        }));
        return [...prev, studentId];
      }
    });
  };

  // Handle status change for a student
  const handleStatusChange = (studentId: string, status: string) => {
    setPromotionStatus((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  // Handle promotion
  const handlePromote = async () => {
    if (selected.length === 0) {
      Alert.alert("Error", "Select at least one student");
      return;
    }
    if (!activeSession || !nextSession) {
      Alert.alert("Error", "Session information not loaded. Please try again later.");
      return;
    }
    const promotions = students
      .filter((s) => selected.includes(s.id))
      .map((student) => {
        const currentClassIndex = classList.findIndex((cls) => cls.name === student.class_);
        const nextClassObj =
          promotionStatus[student.id] === "Promoted"
            ? classList[currentClassIndex + 1] || classList[currentClassIndex]
            : classList[currentClassIndex];
        return {
          studentId: student.id,
          fromClassId: classList[currentClassIndex]?.id,
          toClassId:
            promotionStatus[student.id] === "Drop Out"
              ? classList[currentClassIndex]?.id
              : nextClassObj?.id,
          section: student.sectionclass || "A",
          status: promotionStatus[student.id] || "Promoted",
        };
      });
    const promoted = promotions.filter((p) => p.status === "Promoted");
    const dropped = promotions.filter((p) => p.status === "Drop Out");
    try {
      const token = await AsyncStorage.getItem("principal_token");
      if (promoted.length > 0) {
        await fetch(
          "https://1rzlgxk8-5001.inc1.devtunnels.ms/api/sessions/students/promote",
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              fromSessionId: activeSession.id,
              toSessionId: nextSession.id,
              promotions: promoted,
            }),
          }
        );
      }
      if (dropped.length > 0) {
        await fetch(
          "https://1rzlgxk8-5001.inc1.devtunnels.ms/api/sessions/students/drop",
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              fromSessionId: activeSession.id,
              toSessionId: nextSession.id,
              drops: dropped,
            }),
          }
        );
      }
      Alert.alert("Success", "Promotion/Drop successful!");
      setSelected([]);
      setPromotionStatus((prev) => {
        const newStatus = { ...prev };
        selected.forEach((id) => delete newStatus[id]);
        return newStatus;
      });
      setReloading(true);
      setTimeout(() => {
        setReloading(false);
        fetchStudents(sessionFilter);
      }, 1200);
    } catch (err) {
      Alert.alert("Error", "Promotion or Drop failed");
    }
  };

  // Create new session
  const onCreateSession = async () => {
    try {
      const token = await AsyncStorage.getItem("principal_token");
      await fetch(
        `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/sessions/schools/${schoolId}/sessions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newSession),
        }
      );
      Alert.alert("Success", "Session created!");
      setShowSessionModal(false);
      setNewSession({ year: '', startDate: '', endDate: '' });
      fetchSessions();
    } catch {
      Alert.alert("Error", "Failed to create session");
    }
  };

  // Activate a session
  const handleActivateSession = async (sessionId: string) => {
    try {
      const token = await AsyncStorage.getItem("principal_token");
      await fetch(
        `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/sessions/sessions/${sessionId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isActive: true }),
        }
      );
      Alert.alert("Success", "Session activated!");
      fetchSessions();
    } catch {
      Alert.alert("Error", "Failed to activate session");
    }
  };

  // Filtered promotion history
  const filteredHistory = search
    ? promotionHistory.filter(row =>
      (row.student?.studentName || '').toLowerCase().includes(search.toLowerCase())
    )
    : promotionHistory;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', padding: 12 }}>
      <Text style={styles.title}>Student Promotion</Text>
      {/* Create Session Button */}
      <TouchableOpacity style={styles.createSessionBtn} onPress={() => setShowSessionModal(true)}>
        <Text style={styles.createSessionBtnText}>Create New Session</Text>
      </TouchableOpacity>
      {/* Session Modal */}
      <Modal visible={showSessionModal} animationType="slide" transparent onRequestClose={() => setShowSessionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Session</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-27"
              value={newSession.year}
              onChangeText={text => setNewSession(s => ({ ...s, year: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Start Date (YYYY-MM-DD)"
              value={newSession.startDate}
              onChangeText={text => setNewSession(s => ({ ...s, startDate: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="End Date (YYYY-MM-DD)"
              value={newSession.endDate}
              onChangeText={text => setNewSession(s => ({ ...s, endDate: text }))}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <TouchableOpacity style={styles.modalBtn} onPress={onCreateSession}>
                <Text style={styles.modalBtnText}>Create</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#e5e7eb' }]} onPress={() => setShowSessionModal(false)}>
                <Text style={[styles.modalBtnText, { color: '#374151' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Session Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {sessions.map((session) => (
          <TouchableOpacity
            key={session.id}
            style={[styles.sessionBtn, sessionFilter === session.id && styles.sessionBtnActive]}
            onPress={() => handleSessionFilter(session.id)}
          >
            <Text style={styles.sessionBtnText}>{session.year}</Text>
          </TouchableOpacity>
        ))}
        {/* Activate session button for each session */}
        {sessions.map((session) => (
          <TouchableOpacity
            key={session.id + '-active'}
            style={[styles.activateBtn, session.isActive && styles.activateBtnActive]}
            disabled={session.isActive}
            onPress={() => handleActivateSession(session.id)}
          >
            <Text style={styles.activateBtnText}>{session.isActive ? "Active" : "Set Active"}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {/* Class Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <TouchableOpacity
          style={[styles.classBtn, classFilter === '' && styles.classBtnActive]}
          onPress={() => setClassFilter('')}
        >
          <Text style={styles.classBtnText}>All</Text>
        </TouchableOpacity>
        {classOptions.map((cls) => (
          <TouchableOpacity
            key={cls}
            style={[styles.classBtn, classFilter === cls && styles.classBtnActive]}
            onPress={() => setClassFilter(cls)}
          >
            <Text style={styles.classBtnText}>{cls}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginVertical: 32 }} />
      ) : (
        <>
          <Text style={styles.sectionTitle}>All Students</Text>
          <FlatList
            data={filteredStudents}
            keyExtractor={item => item.id}
            ListEmptyComponent={<Text style={{ textAlign: 'center', margin: 24 }}>No students found.</Text>}
            renderItem={({ item, index }) => (
              <View style={styles.studentRow}>
                <Switch
                  value={selected.includes(item.id)}
                  onValueChange={() => handleSelect(item.id)}
                />
                <Text style={styles.studentCell}>{index + 1}</Text>
                <Text style={styles.studentCell}>{item.Admission_Number}</Text>
                <Text style={styles.studentCell}>{item.studentName}</Text>
                <Text style={styles.studentCell}>{item.rollNumber}</Text>
                <Text style={styles.studentCell}>{item.class_}</Text>
                <Text style={styles.studentCell}>{item.sectionclass}</Text>
                <Text style={styles.studentCell}>{item.fatherName}</Text>
                <Text style={styles.studentCell}>{item.phone}</Text>
                <Text style={styles.studentCell}>{item.isTransferCertIssued ? 'Issued' : 'Not Issued'}</Text>
                <Text style={styles.studentCell}>{item.promotionStatus}</Text>
                <Text style={styles.studentCell}>{item.isActive ? 'Active' : 'Inactive'}</Text>
                {selected.includes(item.id) && (
                  <View style={styles.statusDropdownRow}>
                    <TouchableOpacity
                      style={[styles.statusBtn, promotionStatus[item.id] === 'Promoted' && styles.statusBtnActive]}
                      onPress={() => handleStatusChange(item.id, 'Promoted')}
                    >
                      <Text style={styles.statusBtnText}>Promoted</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.statusBtn, promotionStatus[item.id] === 'Drop Out' && styles.statusBtnActive]}
                      onPress={() => handleStatusChange(item.id, 'Drop Out')}
                    >
                      <Text style={styles.statusBtnText}>Drop Out</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          />
          {(!activeSession || !nextSession) && (
            <Text style={{ color: 'red', marginVertical: 8 }}>
              {!activeSession
                ? "Active session not found. Please contact admin."
                : "Next session not found. Please create the next session in the system before promoting students."}
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <TouchableOpacity
              style={[styles.promoteBtn, (selected.length === 0 || !activeSession || !nextSession) && { backgroundColor: '#d1d5db' }]}
              onPress={handlePromote}
              disabled={selected.length === 0 || !activeSession || !nextSession}
            >
              <Text style={styles.promoteBtnText}>Promote Selected Students</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.historyBtn}
              onPress={() => {
                if (!showHistory) fetchPromotionHistory();
                setShowHistory((prev) => !prev);
              }}
            >
              <Text style={styles.historyBtnText}>{showHistory ? "Hide Promotion History" : "Show Promotion History"}</Text>
            </TouchableOpacity>
          </View>
          {/* Promotion History */}
          {showHistory && promotionHistory.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>Promotion History</Text>
              <TextInput
                style={styles.input}
                placeholder="Search..."
                value={search}
                onChangeText={setSearch}
              />
              <FlatList
                data={filteredHistory}
                keyExtractor={(_, idx) => idx.toString()}
                ListEmptyComponent={<Text style={{ textAlign: 'center', margin: 24 }}>No records found.</Text>}
                renderItem={({ item, index }) => (
                  <View style={styles.historyRow}>
                    <Text style={styles.historyCell}>{index + 1}</Text>
                    <Text style={styles.historyCell}>{item.student?.studentName || '-'}</Text>
                    <Text style={styles.historyCell}>{item.student?.Admission_Number || '-'}</Text>
                    <Text style={styles.historyCell}>{item.student?.fatherName || '-'}</Text>
                    <Text style={styles.historyCell}>{item.status}</Text>
                    <Text style={styles.historyCell}>{item.status === 'Drop Out' ? '-' : (item.session?.startDate ? new Date(item.session.startDate).toLocaleDateString() : '-')}</Text>
                    <Text style={styles.historyCell}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}</Text>
                    <Text style={styles.historyCell}>{item.remarks || '-'}</Text>
                  </View>
                )}
              />
            </View>
          )}
        </>
      )}
      {reloading && (
        <View style={styles.reloadingOverlay}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={{ marginTop: 12, color: '#2563eb', fontWeight: 'bold' }}>Reloading...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  createSessionBtn: { backgroundColor: '#059669', padding: 12, borderRadius: 8, marginBottom: 12, alignSelf: 'flex-start' },
  createSessionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '90%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 15 },
  modalBtn: { backgroundColor: '#2563eb', padding: 10, borderRadius: 8, flex: 1, alignItems: 'center', marginHorizontal: 4 },
  modalBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  sessionBtn: { backgroundColor: '#f3f4f6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  sessionBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  sessionBtnText: { color: '#111827', fontWeight: 'bold' },
  activateBtn: { backgroundColor: '#e5e7eb', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, marginRight: 8 },
  activateBtnActive: { backgroundColor: '#059669' },
  activateBtnText: { color: '#374151', fontWeight: 'bold' },
  classBtn: { backgroundColor: '#f3f4f6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  classBtnActive: { backgroundColor: '#059669', borderColor: '#059669' },
  classBtnText: { color: '#111827', fontWeight: 'bold' },
  sectionTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
  studentRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#e5e7eb', paddingVertical: 8, flexWrap: 'wrap' },
  studentCell: { minWidth: 60, fontSize: 12, color: '#374151', marginHorizontal: 2 },
  statusDropdownRow: { flexDirection: 'row', gap: 4, marginLeft: 8 },
  statusBtn: { backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 4 },
  statusBtnActive: { backgroundColor: '#059669' },
  statusBtnText: { color: '#111827', fontWeight: 'bold', fontSize: 12 },
  promoteBtn: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center', marginRight: 8 },
  promoteBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  historyBtn: { backgroundColor: '#059669', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center' },
  historyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  historySection: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, marginTop: 12 },
  historyRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#e5e7eb', paddingVertical: 6, flexWrap: 'wrap' },
  historyCell: { minWidth: 60, fontSize: 4, color: '#374151', marginHorizontal: 2 },
  reloadingOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
});

export default Promotion;