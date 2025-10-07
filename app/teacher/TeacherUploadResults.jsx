import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { rem } from '../utils/responsive';

const API_BASE_URL = 'https://api.pbmpublicschool.in/api';

const examTypes = [
	'Periodic I',
	'Note Book',
	'Half Yearly Exam',
	'Periodic II',
	'Note Book II ',
	'Annual Exam',
	'Test April',
	'Test May',
	'Test Jun',
	'Test July',
	'Test Aug',
	'Test Setember',
	'Test Oct',
	'Test Nov',
	'Test Dec',
	'Test Jan',
	'Test Fer',
	'Test march',
	'Periodic Test I',
	'Monthly Test',
];

// map exam type to max marks used to auto-fill maxMarks per subject
const examMaxMap = {
	'Monthly Test': 10,
	'Test April': 10,
	'Test May': 10,
	'Test Jun': 10,
	'Test July': 10,
	'Test Aug': 10,
	'Test Setember': 10,
	'Test Oct': 10,
	'Test Nov': 10,
	'Test Dec': 10,
	'Test Jan': 10,
	'Test Fer': 10,
	'Test march': 10,
	'Periodic I': 40,
	'Periodic Test I': 40,
	'Periodic II': 40,
	'Note Book': 10,
	'Note Book II ': 10,
	'Half Yearly Exam': 50,
	'Annual Exam': 50,
};

const TeacherUploadResults = () => {
	const [token, setToken] = useState('');
	const [classId, setClassId] = useState('');
	const [schoolId, setSchoolId] = useState('');

	const [subjects, setSubjects] = useState([]);
	const [students, setStudents] = useState([]);

	const [selectedExam, setSelectedExam] = useState('');
	const [selectedStudent, setSelectedStudent] = useState(null);

	const [marksState, setMarksState] = useState({});
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);

	const [showExamModal, setShowExamModal] = useState(false);
	const [showStudentModal, setShowStudentModal] = useState(false);

	// existing marks keyed by sessionId
	const [existingMarks, setExistingMarks] = useState({});
	const [marksLoading, setMarksLoading] = useState(false);

	useEffect(() => {
		const loadUser = async () => {
			try {
				const userRaw = await AsyncStorage.getItem('teacher_user');
				const tokenRaw = await AsyncStorage.getItem('teacher_token');
				if (userRaw) {
					const u = JSON.parse(userRaw);
					setClassId(u.classId || u.user?.classId || '');
					setSchoolId(u.schoolId?.toString() || u.user?.schools?.[0]?.id || '');
				}
				if (tokenRaw) setToken(tokenRaw);
			} catch (e) {
				console.warn('Failed to load user/token', e);
			}
		};
		loadUser();
	}, []);

	useEffect(() => {
		const fetchData = async () => {
			if (!classId || !token) {
				setLoading(false);
				return;
			}
			setLoading(true);
			try {
				// fetch subjects for class
				const subjectsRes = await axios.get(`${API_BASE_URL}/classes/${classId}/subjects`, {
					params: { schoolId },
					headers: { Authorization: `Bearer ${token}` },
				});
				if (subjectsRes.data && subjectsRes.data.success) {
					setSubjects(subjectsRes.data.subjects || []);
				} else {
					setSubjects([]);
				}

				// fetch students by class
				const studentsRes = await axios.get(`${API_BASE_URL}/admission/students/by-class/${classId}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (studentsRes.data && studentsRes.data.success) {
					setStudents(studentsRes.data.students || []);
				} else {
					setStudents([]);
				}
			} catch (e) {
				console.warn('Failed to fetch subjects/students', e);
				setSubjects([]);
				setStudents([]);
			}
			setLoading(false);
		};
		fetchData();
	}, [classId, token, schoolId]);

	// when exam type changes, auto-fill maxMarks for each subject
	useEffect(() => {
		if (!selectedExam || !subjects.length) return;
		const maxVal = examMaxMap[selectedExam] ?? 100;
		const next = {};
		subjects.forEach((s) => {
			next[s.name] = {
				obtained: marksState[s.name]?.obtained ?? '',
				maxMarks: maxVal,
			};
		});
		setMarksState(next);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedExam, subjects]);

	useEffect(() => {
		const fetchMarks = async () => {
			if (!selectedStudent || !token) {
				setExistingMarks({});
				return;
			}
			setMarksLoading(true);
			try {
				const res = await axios.get(`${API_BASE_URL}/result/marks/by-student/${selectedStudent.id}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (res.data && res.data.success) {
					setExistingMarks(res.data.data || {});
				} else {
					setExistingMarks({});
				}
			} catch (e) {
				console.warn('Failed to fetch existing marks', e);
				setExistingMarks({});
			}
			setMarksLoading(false);
		};
		fetchMarks();
	}, [selectedStudent, token]);

	const updateObtained = (subjectName, value) => {
		// allow only numbers
		const numeric = value.replace(/[^0-9]/g, '');
		setMarksState((prev) => ({
			...prev,
			[subjectName]: {
				...(prev[subjectName] || {}),
				obtained: numeric,
			},
		}));
	};

	const submitMarks = async () => {
		if (!selectedStudent) {
			Alert.alert('Select student', 'Please select a student');
			return;
		}
		if (!selectedExam) {
			Alert.alert('Select exam', 'Please select an exam type');
			return;
		}
		const marksPayload = [];
		for (const subj of subjects) {
			const state = marksState[subj.name] || {};
			const obtained = parseInt(state.obtained || '0', 10);
			const maxMarks = state.maxMarks ?? (examMaxMap[selectedExam] ?? 100);
			// skip empty entries (entirely blank)
			if (state.obtained === '' ) continue;
			// clamp obtained
			const clamped = Math.max(0, Math.min(obtained, maxMarks));
			marksPayload.push({ subject: subj.name, component: 'Theory', maxMarks, obtained: clamped });
			const API_BASE_URL = 'https://api.pbmpublicschool.in/api';

		}

		if (!marksPayload.length) {
			Alert.alert('No marks', 'Please enter marks for at least one subject');
			return;
		}

		const body = {
			studentId: selectedStudent.id,
			classId,
			examType: selectedExam,
			marks: marksPayload,
		};

		setSubmitting(true);
		try {
			const res = await axios.post(`${API_BASE_URL}/result/add-mark`, body, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (res.data && res.data.success) {
				Alert.alert('Success', 'Marks uploaded successfully');
				// clear marks
				setMarksState({});
				setSelectedExam('');
			} else {
				console.warn('Upload failed', res.data);
				Alert.alert('Failed', 'Server responded with an error');
			}
		} catch (e) {
			console.warn('Submit error', e);
			Alert.alert('Error', 'Failed to submit marks');
		}
		setSubmitting(false);
	};

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color="#667eea" />
				<Text style={{ marginTop: rem(8) }}>Loading...</Text>
			</View>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView contentContainerStyle={styles.content}>
				<Text style={styles.title}>Upload Marks</Text>

				<Text style={styles.label}>Select Exam Type</Text>
				<TouchableOpacity style={styles.selector} onPress={() => setShowExamModal(true)}>
					<Text style={styles.selectorText}>{selectedExam || 'Choose exam type'}</Text>
					<Ionicons name="chevron-down" size={20} color="#374151" />
				</TouchableOpacity>

				<Text style={styles.label}>Select Student</Text>
				<TouchableOpacity style={styles.selector} onPress={() => setShowStudentModal(true)}>
					<Text style={styles.selectorText}>{selectedStudent ? selectedStudent.studentName : 'Choose a student'}</Text>
					<Ionicons name="chevron-down" size={20} color="#374151" />
				</TouchableOpacity>

				<View style={styles.subjectsHeader}>
					<Text style={{ fontWeight: '700' }}>Subjects</Text>
					<Text style={{ color: '#6b7280' }}>{subjects.length} subjects</Text>
				</View>

				{subjects.map((s) => (
					<View key={s.id} style={styles.subjectRow}>
						<View style={{ flex: 1 }}>
							<Text style={styles.subjectName}>{s.name}</Text>
							<Text style={styles.subjectCode}>{s.subjectCode}</Text>
						</View>
						<View style={styles.marksBox}>
							<Text style={styles.maxLabel}>Max</Text>
							<Text style={styles.maxValue}>{marksState[s.name]?.maxMarks ?? (examMaxMap[selectedExam] ?? '-')}</Text>
						</View>
						<TextInput
							keyboardType="numeric"
							placeholder="Obt"
							value={marksState[s.name]?.obtained?.toString() ?? ''}
							onChangeText={(t) => updateObtained(s.name, t)}
							style={styles.obtInput}
						/>
					</View>
				))}

				<TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={submitMarks} disabled={submitting}>
					{submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Upload Marks</Text>}
				</TouchableOpacity>

				{/* Existing marks for selected student */}
				<View style={{ marginTop: rem(18) }}>
					<Text style={{ fontSize: rem(18), fontWeight: '700', marginBottom: rem(8) }}>Existing Marks</Text>
					{marksLoading ? (
						<View style={{ padding: rem(12) }}><ActivityIndicator /></View>
					) : Object.keys(existingMarks || {}).length === 0 ? (
						<Text style={{ color: '#6b7280' }}>No marks found for selected student.</Text>
					) : (
						Object.entries(existingMarks).map(([sessionKey, sessions]) => {
							return (
								<View key={sessionKey} style={{ marginBottom: 12, backgroundColor: '#fff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#eef2ff' }}>
									<Text style={{ fontWeight: '800' }}>Session: {sessionKey}</Text>
									{Array.isArray(sessions) ? sessions.map((sess) => (
										<View key={sess.examResultId || Math.random()} style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
											<Text style={{ fontWeight: '700' }}>{sess.examType} — {sess.academicYear}</Text>
											{Array.isArray(sess.marks) && sess.marks.map((m) => (
												<View key={m.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
													<Text>{m.subject} ({m.component})</Text>
													<Text>{m.obtained}/{m.maxMarks}</Text>
												</View>
											))}
										</View>
									)) : null}
								</View>
							);
						})
					)}
				</View>

				{/* Exam type modal */}
				<Modal visible={showExamModal} animationType="slide" transparent>
					<View style={styles.modalOverlay}>
						<View style={styles.modalContent}>
							<Text style={styles.modalTitle}>Choose Exam</Text>
							<FlatList data={examTypes} keyExtractor={(i) => i} renderItem={({ item }) => (
								<TouchableOpacity style={styles.modalRow} onPress={() => { setSelectedExam(item); setShowExamModal(false); }}>
									<Text>{item}</Text>
								</TouchableOpacity>
							)} />
							<TouchableOpacity style={styles.modalClose} onPress={() => setShowExamModal(false)}>
								<Text style={{ color: '#ef4444' }}>Close</Text>
							</TouchableOpacity>
						</View>
					</View>
				</Modal>

				{/* Student modal */}
				<Modal visible={showStudentModal} animationType="slide" transparent>
					<View style={styles.modalOverlay}>
						<View style={styles.modalContent}>
							<Text style={styles.modalTitle}>Choose Student</Text>
							<FlatList data={students} keyExtractor={(it) => it.id} renderItem={({ item }) => (
								<TouchableOpacity style={styles.modalRow} onPress={() => { setSelectedStudent(item); setShowStudentModal(false); }}>
									<Text>{item.studentName} ({item.rollNumber || item.id.slice(0,4)})</Text>
								</TouchableOpacity>
							)} />
							<TouchableOpacity style={styles.modalClose} onPress={() => setShowStudentModal(false)}>
								<Text style={{ color: '#ef4444' }}>Close</Text>
							</TouchableOpacity>
						</View>
					</View>
				</Modal>

			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f8fafc' },
	content: { padding: rem(16), paddingBottom: rem(40) },
	center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	title: { fontSize: rem(22), fontWeight: '800', color: '#403ae2', marginBottom: rem(12) },
	label: { color: '#374151', marginTop: rem(8), marginBottom: rem(6), fontWeight: '600' },
	selector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: rem(12), borderRadius: rem(10), borderWidth: 1, borderColor: '#e6e9f2' },
	selectorText: { color: '#111827' },
	subjectsHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: rem(12), marginBottom: rem(8), alignItems: 'center' },
	subjectRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: rem(12), borderRadius: rem(10), marginBottom: rem(8), borderWidth: 1, borderColor: '#eef2ff' },
	subjectName: { fontWeight: '700' },
	subjectCode: { color: '#6b7280', fontSize: rem(12) },
	marksBox: { alignItems: 'center', marginHorizontal: rem(8) },
	maxLabel: { fontSize: rem(12), color: '#6b7280' },
	maxValue: { fontWeight: '700' },
	obtInput: { width: rem(68), height: rem(36), borderRadius: rem(8), borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: rem(8), textAlign: 'center', backgroundColor: '#fff' },
	submitBtn: { marginTop: rem(16), backgroundColor: '#4f46e5', padding: rem(14), borderRadius: rem(12), alignItems: 'center' },
	submitText: { color: '#fff', fontWeight: '700' },
	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
	modalContent: { width: '90%', maxHeight: '70%', backgroundColor: '#fff', borderRadius: rem(12), padding: rem(12) },
	modalTitle: { fontWeight: '800', fontSize: rem(16), marginBottom: rem(8) },
	modalRow: { paddingVertical: rem(12), borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
	modalClose: { marginTop: rem(8), alignItems: 'center' },
});

export default TeacherUploadResults;

