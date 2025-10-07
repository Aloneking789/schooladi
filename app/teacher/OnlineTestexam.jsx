import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { rem } from '../utils/responsive';

const API_URL = 'https://api.pbmpublicschool.inapi/onlineTest/online-test/create';

const questionTypeOptions = [
	{ label: 'Objective', value: 'objective' },
	{ label: 'Long', value: 'long' },
	{ label: 'Mixed', value: 'mixed' },
];

const OnlineTestexam = () => {
	const [classId, setClassId] = useState('');
	const [subject, setSubject] = useState('');
	const [chapterPrompt, setChapterPrompt] = useState('');
	const [questionType, setQuestionType] = useState('objective');
	const [numQuestions, setNumQuestions] = useState('10');
	const [loading, setLoading] = useState(false);
	const [questions, setQuestions] = useState([]);
	const [apiError, setApiError] = useState('');
	const [success, setSuccess] = useState(false);
	const [myTests, setMyTests] = useState([]);
	const [loadingTests, setLoadingTests] = useState(false);
	const [resultsModalVisible, setResultsModalVisible] = useState(false);
	const [submissions, setSubmissions] = useState([]);
	const [loadingResults, setLoadingResults] = useState(false);
	const [token, setToken] = useState('');

	useEffect(() => {
		// Get teacher classId and token from AsyncStorage (like MyStudents)
		const getClassIdAndToken = async () => {
			try {
				const userDataRaw = await AsyncStorage.getItem('user');
				const tkn = await AsyncStorage.getItem('teacher_token');
				if (userDataRaw) {
					const teacherData = JSON.parse(userDataRaw);
					setClassId(teacherData.classId || teacherData.user?.classId || '');
				}
				if (tkn) setToken(tkn);
			} catch (e) {
				setClassId('');
				setToken('');
			}
		};
		getClassIdAndToken();
	}, []);
	// Fetch my tests (use teacher's assigned classId when available)
	useEffect(() => {
		
		const fetchMyTests = async () => {
			if (!token) return;
			setLoadingTests(true);
			try {
				const base = 'https://api.pbmpublicschool.inapi/onlineTest/online-test/my-tests/';
				const url = classId ? `${base}${encodeURIComponent(classId)}` : base;
				console.log('Fetching my tests from', url);
				console.log('Using token:', token ? 'Yes' : 'No');
				console.log('Using classId:', classId || 'No classId');
				const res = await fetch(url, {
					headers: { 'Authorization': `Bearer ${token}` },
				});
				const data = await res.json();
				if (data.success && Array.isArray(data.tests)) {
					setMyTests(data.tests);
				} else {
					setMyTests([]);
				}
			} catch (err) {
				console.warn('fetchMyTests error', err);
				setMyTests([]);
			} finally {
				setLoadingTests(false);
			}
		};
		fetchMyTests();
	}, [token, success, classId]);

	const handleCreateTest = async () => {
		setApiError('');
		setSuccess(false);
		setQuestions([]);
		if (!classId || !subject || !chapterPrompt || !questionType || !numQuestions) {
			Alert.alert('Missing Fields', 'Please fill all fields.');
			return;
		}
		setLoading(true);
		try {
			const res = await fetch(API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(token ? { 'Authorization': `Bearer ${token}` } : {}),
				},
				body: JSON.stringify({
					classId,
					subject,
					chapterPrompt,
					questionType,
					numQuestions: Number(numQuestions),
				}),
			});
			const data = await res.json();
			if (data.success && data.paper) {
				let qArr = [];
				try {
					qArr = JSON.parse(data.paper.questions);
				} catch {
					qArr = [];
				}
				setQuestions(qArr);
				setSuccess(true);
			} else {
				setApiError(data.message || 'Failed to create test');
			}
		} catch (e) {
			setApiError('Network or server error');
		} finally {
			setLoading(false);
		}
	};

	// Fetch results for a specific test and open modal
	const fetchTestResults = async (testId) => {
		if (!testId) return;
		setLoadingResults(true);
		try {
			const tkn = await AsyncStorage.getItem('teacher_token') || await AsyncStorage.getItem('principal_token');
			if (!tkn) {
				Alert.alert('Missing token', 'No authorization token found.');
				setLoadingResults(false);
				return;
			}
			const url = `https://api.pbmpublicschool.inapi/onlineTest/online-test/${encodeURIComponent(testId)}/results`;
			const res = await fetch(url, { headers: { Authorization: `Bearer ${tkn}` } });
			if (!res.ok) {
				const txt = await res.text();
				throw new Error(`Request failed ${res.status}: ${txt}`);
			}
			const body = await res.json();
			if (!body.success) throw new Error(body.message || 'API returned success:false');
			const subs = (body.submissions || []).map((s) => {
				let answers = {};
				let times = [];
				try { answers = JSON.parse(s.answers || '{}'); } catch (e) { answers = {}; }
				try { times = JSON.parse(s.perQuestionTimes || '[]'); } catch (e) { times = []; }
				return {
					id: s.id,
					testId: s.testId,
					studentId: s.studentId,
					studentName: s.student?.studentName || s.studentName || 'Unknown',
					class: s.student?.class_ || 'N/A',
					section: s.student?.sectionclass || 'N/A',
					answers,
					score: s.score,
					startedAt: s.startedAt,
					endedAt: s.endedAt,
					perQuestionTimes: times,
					submittedAt: s.submittedAt,
				};
			});
			setSubmissions(subs);
			setResultsModalVisible(true);
		} catch (err) {
			console.warn('fetchTestResults error', err);
			Alert.alert('Error', err.message || 'Failed to fetch results');
			setSubmissions([]);
		} finally {
			setLoadingResults(false);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView contentContainerStyle={styles.scrollContent}>
				<Text style={styles.header}>Create Online Test</Text>
				<View style={styles.form}>
					<Text style={styles.label}>Class ID</Text>
					<View style={styles.inputDisabled}><Text>{classId || 'Not found'}</Text></View>

					<Text style={styles.label}>Subject</Text>
					<TextInput
						style={styles.input}
						placeholder="Enter subject"
						value={subject}
						onChangeText={setSubject}
					/>

					<Text style={styles.label}>Chapter Prompt</Text>
					<TextInput
						style={styles.input}
						placeholder="Enter chapter prompt"
						value={chapterPrompt}
						onChangeText={setChapterPrompt}
					/>

					<Text style={styles.label}>Question Type</Text>
					<View style={styles.pickerRow}>
						{questionTypeOptions.map(opt => (
							<TouchableOpacity
								key={opt.value}
								style={[styles.pickerBtn, questionType === opt.value && styles.pickerBtnActive]}
								onPress={() => setQuestionType(opt.value)}
							>
								<Text style={[styles.pickerBtnText, questionType === opt.value && styles.pickerBtnTextActive]}>{opt.label}</Text>
							</TouchableOpacity>
						))}
					</View>
					{/* Results Modal */}
					<Modal visible={resultsModalVisible} animationType="slide" onRequestClose={() => setResultsModalVisible(false)}>
						<SafeAreaView style={{ flex: 1 }}>
							<View style={{ flex: 1, padding: rem(16) }}>
								<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rem(12) }}>
									<Text style={{ fontSize: rem(18), fontWeight: '800' }}>Test Results</Text>
									<TouchableOpacity onPress={() => setResultsModalVisible(false)}><Text style={{ color: '#2563eb' }}>Close</Text></TouchableOpacity>
								</View>
								{loadingResults ? <ActivityIndicator /> : submissions.length === 0 ? <Text>No submissions found.</Text> : (
									<ScrollView>
										{submissions.map((s) => (
											<View key={s.id} style={{ backgroundColor: '#fff', padding: rem(12), borderRadius: rem(8), marginBottom: rem(12) }}>
												<Text style={{ fontWeight: '700' }}>{s.studentName} ({s.class}-{s.section})</Text>
												<Text>Score: {s.score}</Text>
												<Text style={{ marginTop: rem(8), fontWeight: '700' }}>Answers</Text>
												{Object.keys(s.answers || {}).map((qIndex) => (
													<View key={qIndex} style={{ marginTop: rem(6) }}>
														<Text style={{ fontWeight: '600' }}>Q{Number(qIndex) + 1}: {s.answers[qIndex]}</Text>
													</View>
												))}
											</View>
										))}
									</ScrollView>
								)}
							</View>
						</SafeAreaView>
					</Modal>

					<Text style={styles.label}>Number of Questions</Text>
					<TextInput
						style={styles.input}
						placeholder="e.g. 10"
						value={numQuestions}
						onChangeText={setNumQuestions}
						keyboardType="numeric"
					/>

					<TouchableOpacity style={styles.submitBtn} onPress={handleCreateTest} disabled={loading}>
						{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create Test</Text>}
					</TouchableOpacity>
				</View>

				{apiError ? <Text style={styles.errorText}>{apiError}</Text> : null}
				{success && questions.length > 0 && (
					<View style={styles.resultSection}>
						<Text style={styles.resultHeader}>Generated Questions</Text>
						{questions.map((q, idx) => (
							<View key={idx} style={styles.questionCard}>
								<Text style={styles.qText}>{idx + 1}. {q.question}</Text>
								{q.options && Array.isArray(q.options) && (
									<View style={styles.optionsList}>
										{q.options.map((opt, i) => (
											<View key={i} style={styles.optionRow}>
												<Ionicons name="ellipse-outline" size={16} color="#888" style={{ marginRight: 6 }} />
												<Text style={styles.optionText}>{opt}</Text>
											</View>
										))}
									</View>
								)}
								{q.answer && (
									<Text style={styles.answerText}>Answer: <Text style={{ fontWeight: 'bold' }}>{q.answer}</Text></Text>
								)}
							</View>
						))}
					</View>
				)}
				{/* My Tests Section */}
				<View style={styles.myTestsSection}>
					<Text style={styles.resultHeader}>My Created Tests</Text>
					{loadingTests ? (
						<ActivityIndicator size="small" color="#2563eb" style={{ marginTop: rem(10) }} />
					) : myTests.length === 0 ? (
						<Text style={{ color: '#64748b', textAlign: 'center', marginTop: rem(10) }}>No tests found.</Text>
					) : (
						myTests.map((test, idx) => (
							<View key={test.id || idx} style={styles.testCard}>
								<Text style={styles.qText}>{test.subject} - {test.chapterPrompt}</Text>
								<Text style={styles.testMeta}>Type: {test.questionType} | Created: {new Date(test.createdAt).toLocaleString()}</Text>
								<View style={{ flexDirection: 'row', marginBottom: rem(6) }}>
									<TouchableOpacity
										style={styles.showQuestionsBtn}
										onPress={() => {
											let qArr = [];
											try { qArr = JSON.parse(test.questions); } catch { qArr = []; }
											Alert.alert(
												`${test.subject} - ${test.chapterPrompt}`,
												qArr.map((q, i) => `${i + 1}. ${q.question}\n${q.options && Array.isArray(q.options) ? q.options.map((opt, j) => `   ${String.fromCharCode(65 + j)}. ${opt}`).join('\n') : ''}\nAnswer: ${q.answer}\n`).join('\n'),
												[{ text: 'Close' }]
											);
										}}
									>
										<Text style={styles.showQuestionsBtnText}>Ques</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={[styles.showQuestionsBtn, { backgroundColor: '#111827' }]}
										onPress={() => fetchTestResults(test.id)}
									>
										<Text style={styles.showQuestionsBtnText}>Result</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={[styles.startStopBtn, { backgroundColor: '#059669', opacity: test.isStartest ? 0.5 : 1 }]}
										disabled={test.isStartest}
										onPress={async () => {
											if (!token) return;
											try {
												const res = await fetch(`https://api.pbmpublicschool.inapi/onlineTest/online-test/${test.id}/start`, {
													method: 'POST',
													headers: { 'Authorization': `Bearer ${token}` },
												});
												const data = await res.json();
												Alert.alert('Start Test', data.message || (data.success ? 'Test started.' : 'Failed to start test'));
											} catch {
												Alert.alert('Start Test', 'Network error');
											}
										}}
									>
										<Text style={styles.startStopBtnText}>Start Test</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={[styles.startStopBtn, { backgroundColor: '#dc2626', opacity: !test.isStartest ? 0.5 : 1 }]}
										disabled={!test.isStartest}
										onPress={async () => {
											if (!token) return;
											try {
												const res = await fetch(`https://api.pbmpublicschool.inapi/onlineTest/online-test/${test.id}/stop`, {
													method: 'POST',
													headers: { 'Authorization': `Bearer ${token}` },
												});
												const data = await res.json();
												Alert.alert('Stop Test', data.message || (data.success ? 'Test stopped.' : 'Failed to stop test'));
											} catch {
												Alert.alert('Stop Test', 'Network error');
											}
										}}
									>
										<Text style={styles.startStopBtnText}>Stop Test</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={[styles.startStopBtn, { backgroundColor: '#64748b' }]}
										onPress={async () => {
											if (!token) return;
											Alert.alert(
												'Delete Test',
												'Are you sure you want to delete this test?',
												[
													{ text: 'Cancel', style: 'cancel' },
													{
														text: 'Delete', style: 'destructive', onPress: async () => {
															try {
																const res = await fetch(`https://api.pbmpublicschool.inapi/onlineTest/online-test/${test.id}`, {
																	method: 'DELETE',
																	headers: { 'Authorization': `Bearer ${token}` },
																});
																const data = await res.json();
																if (data.success) {
																	setMyTests(prev => prev.filter(t => t.id !== test.id));
																	Alert.alert('Delete Test', 'Test deleted successfully.');
																} else {
																	Alert.alert('Delete Test', data.message || 'Failed to delete test');
																}
															} catch {
																Alert.alert('Delete Test', 'Network error');
															}
														}
													}
												]
											);
										}}
									>
										<Text style={styles.startStopBtnText}>Delete</Text>
									</TouchableOpacity>
								</View>
							</View>
						))
					)}
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f3f4f6' },
	scrollContent: { padding: rem(20), paddingBottom: rem(40) },
	header: { fontSize: rem(28), fontWeight: '800', marginBottom: rem(22), color: '#1e293b', textAlign: 'center', letterSpacing: 1 },
	form: { backgroundColor: '#fff', borderRadius: rem(16), padding: rem(22), marginBottom: rem(28), shadowColor: '#2563eb', shadowOpacity: 0.08, shadowRadius: rem(12), elevation: 4, borderWidth: 1, borderColor: '#e0e7ef' },
	label: { fontSize: rem(16), fontWeight: '700', color: '#334155', marginTop: rem(12), marginBottom: rem(6), letterSpacing: 0.2 },
	input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: rem(10), padding: rem(12), fontSize: rem(16), backgroundColor: '#f1f5f9', marginBottom: rem(8) },
	inputDisabled: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: rem(10), padding: rem(12), backgroundColor: '#f1f5f9', marginBottom: rem(8) },
	pickerRow: { flexDirection: 'row', marginBottom: rem(8) },
	pickerBtn: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: rem(10), padding: rem(12), alignItems: 'center', backgroundColor: '#f1f5f9', marginHorizontal: rem(2) },
	pickerBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb', shadowColor: '#2563eb', shadowOpacity: 0.12, shadowRadius: rem(4), elevation: 2 },
	pickerBtnText: { color: '#334155', fontWeight: '500', fontSize: rem(15) },
	pickerBtnTextActive: { color: '#fff', fontWeight: '700', fontSize: rem(15) },
	submitBtn: { backgroundColor: '#2563eb', borderRadius: rem(10), paddingVertical: rem(14), alignItems: 'center', marginTop: rem(18), shadowColor: '#2563eb', shadowOpacity: 0.10, shadowRadius: rem(4), elevation: 2 },
	submitBtnText: { color: '#fff', fontWeight: '800', fontSize: rem(17), letterSpacing: 0.5 },
	errorText: { color: '#dc2626', marginTop: rem(12), textAlign: 'center', fontWeight: '700', fontSize: rem(15) },
	resultSection: { marginTop: rem(28) },
	resultHeader: { fontSize: rem(22), fontWeight: '800', color: '#0f172a', marginBottom: rem(14), textAlign: 'center', letterSpacing: 0.2 },
	questionCard: { backgroundColor: '#f9fafb', borderRadius: rem(12), padding: rem(16), marginBottom: rem(16), borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#2563eb', shadowOpacity: 0.04, shadowRadius: rem(4), elevation: 1 },
	qText: { fontSize: rem(16), fontWeight: '700', color: '#1e293b', marginBottom: rem(8) },
	optionsList: { marginLeft: rem(10), marginBottom: rem(8) },
	optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: rem(3) },
	optionText: { fontSize: rem(15), color: '#334155', fontWeight: '500' },
	answerText: { marginTop: rem(7), color: '#059669', fontWeight: '700', fontSize: rem(15) },
	myTestsSection: { marginTop: rem(36), marginBottom: rem(18) },
	testCard: { backgroundColor: '#f9fafb', borderRadius: rem(12), padding: rem(16), marginBottom: rem(16), borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#2563eb', shadowOpacity: 0.04, shadowRadius: rem(4), elevation: 1 },
	testMeta: { color: '#64748b', fontSize: rem(13), marginBottom: rem(7) },
	showQuestionsBtn: { backgroundColor: '#9506d2ff', borderRadius: rem(7), paddingVertical: rem(9), alignItems: 'center', marginTop: rem(7), flex: 1, marginRight: rem(4) },
	showQuestionsBtnText: { color: '#fff', fontWeight: '700', fontSize: rem(15) },
	startStopBtn: { flex: 1, borderRadius: rem(7), paddingVertical: rem(9), alignItems: 'center', marginTop: 0, marginRight: rem(4) },
	startStopBtnText: { color: '#fff', fontWeight: '700', fontSize: rem(15) },
});

export default OnlineTestexam;
