import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { rem } from '../utils/responsive';

const { width } = Dimensions.get('window');
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
	const [assignedClass, setAssignedClass] = useState('');
	const [assignedSection, setAssignedSection] = useState('');
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

	const [existingMarks, setExistingMarks] = useState({});
	const [marksLoading, setMarksLoading] = useState(false);

	// Validation errors state
	const [errors, setErrors] = useState({});

	useEffect(() => {
		const loadUser = async () => {
			try {
				const userRaw = await AsyncStorage.getItem('teacher_user');
				const tokenRaw = await AsyncStorage.getItem('teacher_token');
				if (userRaw) {
					const u = JSON.parse(userRaw);
					setClassId(u.classId || u.user?.classId || '');
					setSchoolId(u.schoolId?.toString() || u.user?.schools?.[0]?.id || '');
					// store assigned class/section if available
					setAssignedClass((u.assignedClass || u.classId || u.class || '')?.toString() || '');
					setAssignedSection(u.assignedSection || u.sectionclass || u.section || '');
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
			// prefer explicit classId, otherwise fall back to assignedClass
			const classToUse = classId || assignedClass;
			if (!classToUse || !token) {
				setLoading(false);
				return;
			}
			setLoading(true);
			try {
				const subjectsRes = await axios.get(`${API_BASE_URL}/classes/${classToUse}/subjects`, {
					params: { schoolId },
					headers: { Authorization: `Bearer ${token}` },
				});
				if (subjectsRes.data && subjectsRes.data.success) {
					setSubjects(subjectsRes.data.subjects || []);
				} else {
					setSubjects([]);
				}
				const studentsRes = await axios.get(`${API_BASE_URL}/admission/students/by-class/${classToUse}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (studentsRes.data && studentsRes.data.success) {
					let fetched = studentsRes.data.students || [];
					// sort students by numeric rollNumber
					const sortByRoll = (arr) => arr.slice().sort((a, b) => {
						const ra = Number(a.rollNumber) || Number.POSITIVE_INFINITY;
						const rb = Number(b.rollNumber) || Number.POSITIVE_INFINITY;
						return ra - rb;
					});
					// if assignedSection exists, filter by section field
					if (assignedSection) {
						fetched = fetched.filter((s) => (s.sectionclass || '').toString() === assignedSection.toString());
					}
					setStudents(sortByRoll(fetched));
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
		setErrors({}); // Clear errors when exam type changes
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
		const numeric = value.replace(/[^0-9]/g, '');
		setMarksState((prev) => ({
			...prev,
			[subjectName]: {
				...(prev[subjectName] || {}),
				obtained: numeric,
			},
		}));
		
		// Clear error for this subject when user starts typing
		if (errors[subjectName]) {
			setErrors((prev) => {
				const next = { ...prev };
				delete next[subjectName];
				return next;
			});
		}
	};

	const validateMarks = () => {
		const newErrors = {};
		let hasErrors = false;

		for (const subj of subjects) {
			const state = marksState[subj.name] || {};
			const obtained = state.obtained?.toString().trim();
			
			// Check if marks are entered
			if (!obtained || obtained === '') {
				newErrors[subj.name] = 'Required';
				hasErrors = true;
			} else {
				const obtainedNum = parseInt(obtained, 10);
				const maxMarks = state.maxMarks ?? (examMaxMap[selectedExam] ?? 100);
				
				// Check if marks exceed max marks
				if (obtainedNum > maxMarks) {
					newErrors[subj.name] = `Max ${maxMarks}`;
					hasErrors = true;
				}
			}
		}

		setErrors(newErrors);
		return !hasErrors;
	};

	const submitMarks = async () => {
		if (!selectedStudent) {
			Alert.alert('Select Student', 'Please select a student first');
			return;
		}
		if (!selectedExam) {
			Alert.alert('Select Exam', 'Please select an exam type first');
			return;
		}

		// Validate all marks are entered
		if (!validateMarks()) {
			Alert.alert(
				'Incomplete Marks', 
				'Please enter marks for all subjects. All fields are required.',
				[{ text: 'OK' }]
			);
			return;
		}

		const marksPayload = [];
		for (const subj of subjects) {
			const state = marksState[subj.name] || {};
			const obtained = parseInt(state.obtained || '0', 10);
			const maxMarks = state.maxMarks ?? (examMaxMap[selectedExam] ?? 100);
			const clamped = Math.max(0, Math.min(obtained, maxMarks));
			marksPayload.push({ subject: subj.name, component: 'Theory', maxMarks, obtained: clamped });
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
				Alert.alert('Success', 'Marks uploaded successfully!', [
					{
						text: 'OK',
						onPress: () => {
							setMarksState({});
							setSelectedExam('');
							setErrors({});
						}
					}
				]);
			} else {
				console.warn('Upload failed', res.data);
				Alert.alert('Failed', 'Server responded with an error');
			}
		} catch (e) {
			console.warn('Submit error', e);
			Alert.alert('Error', 'Failed to submit marks. Please try again.');
		}
		setSubmitting(false);
	};

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color="#667eea" />
				<Text style={styles.loadingText}>Loading data...</Text>
			</View>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.header}>
					<Ionicons name="school" size={rem(28)} color="#4f46e5" />
					<Text style={styles.title}>Upload Marks</Text>
				</View>

				<View style={styles.card}>
					<View style={styles.labelRow}>
						<Ionicons name="document-text" size={rem(16)} color="#6b7280" />
						<Text style={styles.label}>Exam Type</Text>
					</View>
					<TouchableOpacity 
						style={[styles.selector, !selectedExam && styles.selectorEmpty]} 
						onPress={() => setShowExamModal(true)}
					>
						<Text style={[styles.selectorText, !selectedExam && styles.placeholderText]}>
							{selectedExam || 'Choose exam type'}
						</Text>
						<Ionicons name="chevron-down" size={rem(20)} color="#6b7280" />
					</TouchableOpacity>
				</View>

				<View style={styles.card}>
					<View style={styles.labelRow}>
						<Ionicons name="person" size={rem(16)} color="#6b7280" />
						<Text style={styles.label}>Student</Text>
					</View>
					<TouchableOpacity 
						style={[styles.selector, !selectedStudent && styles.selectorEmpty]} 
						onPress={() => setShowStudentModal(true)}
					>
						<View style={styles.selectorContent}>
							<Text style={[styles.selectorText, !selectedStudent && styles.placeholderText]}>
								{selectedStudent ? selectedStudent.studentName : 'Choose a student'}
							</Text>
							{selectedStudent && selectedStudent.rollNumber && (
								<Text style={styles.rollNumber}>Roll: {selectedStudent.rollNumber}</Text>
							)}
						</View>
						<Ionicons name="chevron-down" size={rem(20)} color="#6b7280" />
					</TouchableOpacity>
				</View>

				{selectedExam && selectedStudent && (
					<View style={styles.card}>
						<View style={styles.subjectsHeader}>
							<View style={styles.headerLeft}>
								<Ionicons name="book" size={rem(20)} color="#4f46e5" />
								<Text style={styles.subjectsTitle}>Enter Marks</Text>
							</View>
							<View style={styles.badge}>
								<Text style={styles.badgeText}>{subjects.length} subjects</Text>
							</View>
						</View>

						<View style={styles.formNote}>
							<Ionicons name="information-circle" size={rem(16)} color="#f59e0b" />
							<Text style={styles.formNoteText}>All subjects are required</Text>
						</View>

						{subjects.map((s, index) => (
							<View key={s.id} style={[styles.subjectRow, index === subjects.length - 1 && styles.subjectRowLast]}>
								<View style={styles.subjectInfo}>
									<Text style={styles.subjectName}>{s.name}</Text>
									<Text style={styles.subjectCode}>{s.subjectCode}</Text>
								</View>
								<View style={styles.marksContainer}>
									<View style={styles.marksBox}>
										<Text style={styles.maxLabel}>Max</Text>
										<Text style={styles.maxValue}>
											{marksState[s.name]?.maxMarks ?? (examMaxMap[selectedExam] ?? '-')}
										</Text>
									</View>
									<View style={styles.inputContainer}>
										<TextInput
											keyboardType="numeric"
											placeholder="0"
											placeholderTextColor="#9ca3af"
											value={marksState[s.name]?.obtained?.toString() ?? ''}
											onChangeText={(t) => updateObtained(s.name, t)}
											style={[
												styles.obtInput,
												errors[s.name] && styles.obtInputError
											]}
											maxLength={3}
										/>
										{errors[s.name] && (
											<Text style={styles.errorText}>{errors[s.name]}</Text>
										)}
									</View>
								</View>
							</View>
						))}

						<TouchableOpacity 
							style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} 
							onPress={submitMarks} 
							disabled={submitting}
							activeOpacity={0.8}
						>
							{submitting ? (
								<ActivityIndicator color="#fff" size="small" />
							) : (
								<>
									<Ionicons name="cloud-upload" size={rem(20)} color="#fff" />
									<Text style={styles.submitText}>Upload Marks</Text>
								</>
							)}
						</TouchableOpacity>
					</View>
				)}

				{selectedStudent && (
					<View style={styles.card}>
						<View style={styles.existingHeader}>
							<Ionicons name="time" size={rem(20)} color="#6b7280" />
							<Text style={styles.existingTitle}>Previous Records</Text>
						</View>
						{marksLoading ? (
							<View style={styles.loadingContainer}>
								<ActivityIndicator color="#4f46e5" />
								<Text style={styles.loadingSmallText}>Loading records...</Text>
							</View>
						) : Object.keys(existingMarks || {}).length === 0 ? (
							<View style={styles.emptyState}>
								<Ionicons name="folder-open-outline" size={rem(48)} color="#d1d5db" />
								<Text style={styles.emptyText}>No previous records found</Text>
							</View>
						) : (
							Object.entries(existingMarks).map(([sessionKey, sessions]) => (
								<View key={sessionKey} style={styles.sessionCard}>
									<View style={styles.sessionHeader}>
										<Ionicons name="calendar" size={rem(16)} color="#4f46e5" />
										<Text style={styles.sessionText}>Session: {sessionKey}</Text>
									</View>
									{Array.isArray(sessions) ? sessions.map((sess, sidx) => (
										<View key={`${sess.examResultId || sessionKey}-${sidx}`} style={styles.examCard}>
											<Text style={styles.examTypeText}>{sess.examType}</Text>
											<Text style={styles.academicYear}>{sess.academicYear}</Text>
											{Array.isArray(sess.marks) && sess.marks.map((m) => (
												<View key={m.id} style={styles.markRow}>
													<Text style={styles.markSubject}>
														{m.subject} <Text style={styles.markComponent}>({m.component})</Text>
													</Text>
													<Text style={styles.markValue}>{m.obtained}/{m.maxMarks}</Text>
												</View>
											))}
										</View>
									)) : null}
								</View>
							))
						)}
					</View>
				)}

				{/* Exam type modal */}
				<Modal visible={showExamModal} animationType="slide" transparent>
					<View style={styles.modalOverlay}>
						<View style={styles.modalContent}>
							<View style={styles.modalHeader}>
								<Text style={styles.modalTitle}>Select Exam Type</Text>
								<TouchableOpacity onPress={() => setShowExamModal(false)}>
									<Ionicons name="close-circle" size={rem(28)} color="#6b7280" />
								</TouchableOpacity>
							</View>
							<FlatList 
								data={examTypes} 
								keyExtractor={(i) => i} 
								renderItem={({ item }) => (
									<TouchableOpacity 
										style={[styles.modalRow, selectedExam === item && styles.modalRowSelected]} 
										onPress={() => { 
											setSelectedExam(item); 
											setShowExamModal(false); 
										}}
										activeOpacity={0.7}
									>
										<Text style={[styles.modalRowText, selectedExam === item && styles.modalRowTextSelected]}>
											{item}
										</Text>
										{selectedExam === item && (
											<Ionicons name="checkmark-circle" size={rem(20)} color="#4f46e5" />
										)}
									</TouchableOpacity>
								)}
								showsVerticalScrollIndicator={false}
							/>
						</View>
					</View>
				</Modal>

				{/* Student modal */}
				<Modal visible={showStudentModal} animationType="slide" transparent>
					<View style={styles.modalOverlay}>
						<View style={styles.modalContent}>
							<View style={styles.modalHeader}>
								<Text style={styles.modalTitle}>Select Student</Text>
								<TouchableOpacity onPress={() => setShowStudentModal(false)}>
									<Ionicons name="close-circle" size={rem(28)} color="#6b7280" />
								</TouchableOpacity>
							</View>
							<FlatList 
								data={students} 
								keyExtractor={(it) => it.id} 
								renderItem={({ item }) => (
									<TouchableOpacity 
										style={[styles.modalRow, selectedStudent?.id === item.id && styles.modalRowSelected]} 
										onPress={() => { 
											setSelectedStudent(item); 
											setShowStudentModal(false); 
										}}
										activeOpacity={0.7}
									>
										<View style={styles.studentModalInfo}>
											<Text style={[styles.modalRowText, selectedStudent?.id === item.id && styles.modalRowTextSelected]}>
												{item.studentName}
											</Text>
											<Text style={styles.studentRollText}>
												Roll: {item.rollNumber || item.id.slice(0,4)}
											</Text>
											<Text style={styles.studentRollText}>Class: {item.class_ || item.classId || '-'}</Text>
											<Text style={styles.studentRollText}>Section: {item.sectionclass || '-'}</Text>
										</View>
										{selectedStudent?.id === item.id && (
											<Ionicons name="checkmark-circle" size={rem(20)} color="#4f46e5" />
										)}
									</TouchableOpacity>
								)}
								showsVerticalScrollIndicator={false}
							/>
						</View>
					</View>
				</Modal>

			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { 
		flex: 1, 
		backgroundColor: '#f8fafc' 
	},
	content: { 
		padding: rem(0), 
		paddingBottom: rem(40) 
	},
	center: { 
		flex: 1, 
		justifyContent: 'center', 
		alignItems: 'center',
		backgroundColor: '#f8fafc' 
	},
	loadingText: { 
		marginTop: rem(12), 
		color: '#6b7280',
		fontSize: rem(14) 
	},
	loadingSmallText: {
		marginLeft: rem(8),
		color: '#6b7280',
		fontSize: rem(13)
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: rem(20),
		gap: rem(12)
	},
	title: { 
		fontSize: rem(24), 
		fontWeight: '800', 
		color: '#111827'
	},
	card: {
		backgroundColor: '#fff',
		borderRadius: rem(16),
		padding: rem(16),
		marginBottom: rem(16),
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
		borderWidth: 1,
		borderColor: '#f3f4f6'
	},
	label: { 
		color: '#374151', 
		fontWeight: '600',
		fontSize: rem(14)
	},
	labelRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: rem(6),
		marginBottom: rem(10)
	},
	selector: { 
		flexDirection: 'row', 
		justifyContent: 'space-between', 
		alignItems: 'center', 
		backgroundColor: '#f9fafb', 
		padding: rem(14), 
		borderRadius: rem(12), 
		borderWidth: 1.5, 
		borderColor: '#e5e7eb'
	},
	selectorEmpty: {
		borderColor: '#d1d5db',
		borderStyle: 'dashed'
	},
	selectorContent: {
		flex: 1
	},
	selectorText: { 
		color: '#111827',
		fontSize: rem(15),
		fontWeight: '500'
	},
	placeholderText: {
		color: '#9ca3af',
		fontWeight: '400'
	},
	rollNumber: {
		fontSize: rem(12),
		color: '#6b7280',
		marginTop: rem(2)
	},
	subjectsHeader: { 
		flexDirection: 'row', 
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: rem(12),
		paddingBottom: rem(12),
		borderBottomWidth: 1,
		borderBottomColor: '#f3f4f6'
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: rem(8)
	},
	subjectsTitle: {
		fontWeight: '700',
		fontSize: rem(16),
		color: '#111827'
	},
	badge: {
		backgroundColor: '#eef2ff',
		paddingHorizontal: rem(10),
		paddingVertical: rem(4),
		borderRadius: rem(12)
	},
	badgeText: {
		color: '#4f46e5',
		fontSize: rem(12),
		fontWeight: '600'
	},
	formNote: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fffbeb',
		padding: rem(10),
		borderRadius: rem(8),
		marginBottom: rem(12),
		gap: rem(6)
	},
	formNoteText: {
		color: '#92400e',
		fontSize: rem(12),
		fontWeight: '500'
	},
	subjectRow: { 
		flexDirection: 'row', 
		alignItems: 'center', 
		justifyContent: 'space-between',
		paddingVertical: rem(14),
		borderBottomWidth: 1,
		borderBottomColor: '#f3f4f6'
	},
	subjectRowLast: {
		borderBottomWidth: 0
	},
	subjectInfo: {
		flex: 1,
		marginRight: rem(12)
	},
	subjectName: { 
		fontWeight: '600',
		fontSize: rem(14),
		color: '#111827',
		marginBottom: rem(2)
	},
	subjectCode: { 
		color: '#6b7280', 
		fontSize: rem(12) 
	},
	marksContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: rem(12)
	},
	marksBox: { 
		alignItems: 'center',
		minWidth: rem(48)
	},
	maxLabel: { 
		fontSize: rem(11), 
		color: '#9ca3af',
		fontWeight: '500',
		textTransform: 'uppercase'
	},
	maxValue: { 
		fontWeight: '700',
		fontSize: rem(16),
		color: '#4f46e5'
	},
	inputContainer: {
		position: 'relative'
	},
	obtInput: { 
		width: rem(72), 
		height: rem(44), 
		borderRadius: rem(10), 
		borderWidth: 1.5, 
		borderColor: '#d1d5db', 
		paddingHorizontal: rem(8), 
		textAlign: 'center', 
		backgroundColor: '#fff',
		fontSize: rem(16),
		fontWeight: '600',
		color: '#111827'
	},
	obtInputError: {
		borderColor: '#ef4444',
		backgroundColor: '#fef2f2'
	},
	errorText: {
		position: 'absolute',
		bottom: rem(-16),
		fontSize: rem(10),
		color: '#ef4444',
		fontWeight: '500',
		textAlign: 'center',
		width: '100%'
	},
	submitBtn: { 
		marginTop: rem(20), 
		backgroundColor: '#4f46e5', 
		padding: rem(16), 
		borderRadius: rem(12), 
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'center',
		gap: rem(8),
		shadowColor: '#4f46e5',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 4
	},
	submitBtnDisabled: {
		opacity: 0.6
	},
	submitText: { 
		color: '#fff', 
		fontWeight: '700',
		fontSize: rem(16)
	},
	existingHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: rem(8),
		marginBottom: rem(12),
		paddingBottom: rem(12),
		borderBottomWidth: 1,
		borderBottomColor: '#f3f4f6'
	},
	existingTitle: {
		fontSize: rem(16),
		fontWeight: '700',
		color: '#111827'
	},
	loadingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: rem(16),
		justifyContent: 'center'
	},
	emptyState: {
		alignItems: 'center',
		padding: rem(32),
		gap: rem(12)
	},
	emptyText: {
		color: '#9ca3af',
		fontSize: rem(14)
	},
	sessionCard: {
		backgroundColor: '#f9fafb',
		padding: rem(12),
		borderRadius: rem(12),
		marginBottom: rem(12),
		borderWidth: 1,
		borderColor: '#e5e7eb'
	},
	sessionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: rem(6),
		marginBottom: rem(10)
	},
	sessionText: {
		fontWeight: '700',
		fontSize: rem(14),
		color: '#374151'
	},
	examCard: {
		backgroundColor: '#fff',
		padding: rem(12),
		borderRadius: rem(10),
		marginTop: rem(8),
		borderWidth: 1,
		borderColor: '#f3f4f6'
	},
	examTypeText: {
		fontWeight: '700',
		fontSize: rem(14),
		color: '#111827',
		marginBottom: rem(2)
	},
	academicYear: {
		fontSize: rem(12),
		color: '#6b7280',
		marginBottom: rem(10)
	},
	markRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: rem(6),
		borderTopWidth: 1,
		borderTopColor: '#f3f4f6'
	},
	markSubject: {
		fontSize: rem(13),
		color: '#374151'
	},
	markComponent: {
		color: '#9ca3af'
	},
	markValue: {
		fontSize: rem(13),
		fontWeight: '600',
		color: '#4f46e5'
	},
	modalOverlay: { 
		flex: 1, 
		backgroundColor: 'rgba(0,0,0,0.5)', 
		justifyContent: 'flex-end'
	},
	modalContent: { 
		width: '100%',
		maxHeight: '80%', 
		backgroundColor: '#fff', 
		borderTopLeftRadius: rem(24),
		borderTopRightRadius: rem(24),
		paddingTop: rem(8),
		paddingBottom: rem(32),
		paddingHorizontal: rem(16)
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: rem(16),
		paddingHorizontal: rem(4),
		borderBottomWidth: 1,
		borderBottomColor: '#f3f4f6'
	},
	modalTitle: { 
		fontWeight: '800', 
		fontSize: rem(18),
		color: '#111827'
	},
	modalRow: { 
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: rem(14),
		paddingHorizontal: rem(4),
		borderBottomWidth: 1,
		borderBottomColor: '#f3f4f6'
	},
	modalRowSelected: {
		backgroundColor: '#eef2ff',
		borderRadius: rem(8),
		paddingHorizontal: rem(12)
	},
	modalRowText: {
		fontSize: rem(15),
		color: '#374151',
		fontWeight: '500'
	},
	modalRowTextSelected: {
		color: '#4f46e5',
		fontWeight: '600'
	},
	studentModalInfo: {
		flex: 1
	},
	studentRollText: {
		fontSize: rem(12),
		color: '#9ca3af',
		marginTop: rem(2)
	}
});export default TeacherUploadResults;