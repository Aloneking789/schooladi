import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const API_URL = 'https://1rzlgxk8-5001.inc1.devtunnels.ms/api/onlineTest/online-test/create';

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
	const [token, setToken] = useState('');

	useEffect(() => {
		// Get teacher classId and token from AsyncStorage (like MyStudents)
		const getClassIdAndToken = async () => {
			try {
				const userDataRaw = await AsyncStorage.getItem('teacher_user');
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

	// Fetch my tests
	useEffect(() => {
		const fetchMyTests = async () => {
			if (!token) return;
			setLoadingTests(true);
			try {
				const res = await fetch('https://1rzlgxk8-5001.inc1.devtunnels.ms/api/onlineTest/online-test/my-tests', {
					headers: { 'Authorization': `Bearer ${token}` },
				});
				const data = await res.json();
				if (data.success && Array.isArray(data.tests)) {
					setMyTests(data.tests);
				} else {
					setMyTests([]);
				}
			} catch {
				setMyTests([]);
			} finally {
				setLoadingTests(false);
			}
		};
		fetchMyTests();
	}, [token, success]);

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
						<ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 10 }} />
					) : myTests.length === 0 ? (
						<Text style={{ color: '#64748b', textAlign: 'center', marginTop: 10 }}>No tests found.</Text>
					) : (
						myTests.map((test, idx) => (
							<View key={test.id || idx} style={styles.testCard}>
								<Text style={styles.qText}>{test.subject} - {test.chapterPrompt}</Text>
								<Text style={styles.testMeta}>Type: {test.questionType} | Created: {new Date(test.createdAt).toLocaleString()}</Text>
								<View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
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
										<Text style={styles.showQuestionsBtnText}>Show Questions</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={[styles.startStopBtn, { backgroundColor: '#059669', opacity: test.isStartest ? 0.5 : 1 }]}
										disabled={test.isStartest}
										onPress={async () => {
											if (!token) return;
											try {
												const res = await fetch(`https://1rzlgxk8-5001.inc1.devtunnels.ms/api/onlineTest/online-test/${test.id}/start`, {
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
												const res = await fetch(`https://1rzlgxk8-5001.inc1.devtunnels.ms/api/onlineTest/online-test/${test.id}/stop`, {
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
																const res = await fetch(`https://1rzlgxk8-5001.inc1.devtunnels.ms/api/onlineTest/online-test/${test.id}`, {
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
	scrollContent: { padding: 20, paddingBottom: 40 },
	header: { fontSize: 28, fontWeight: '800', marginBottom: 22, color: '#1e293b', textAlign: 'center', letterSpacing: 1 },
	form: { backgroundColor: '#fff', borderRadius: 16, padding: 22, marginBottom: 28, shadowColor: '#2563eb', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: '#e0e7ef' },
	label: { fontSize: 16, fontWeight: '700', color: '#334155', marginTop: 12, marginBottom: 6, letterSpacing: 0.2 },
	input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 16, backgroundColor: '#f1f5f9', marginBottom: 8 },
	inputDisabled: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, backgroundColor: '#f1f5f9', marginBottom: 8 },
	pickerRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
	pickerBtn: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, alignItems: 'center', backgroundColor: '#f1f5f9', marginHorizontal: 2 },
	pickerBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb', shadowColor: '#2563eb', shadowOpacity: 0.12, shadowRadius: 4, elevation: 2 },
	pickerBtnText: { color: '#334155', fontWeight: '500', fontSize: 15 },
	pickerBtnTextActive: { color: '#fff', fontWeight: '700', fontSize: 15 },
	submitBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 18, shadowColor: '#2563eb', shadowOpacity: 0.10, shadowRadius: 4, elevation: 2 },
	submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 17, letterSpacing: 0.5 },
	errorText: { color: '#dc2626', marginTop: 12, textAlign: 'center', fontWeight: '700', fontSize: 15 },
	resultSection: { marginTop: 28 },
	resultHeader: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 14, textAlign: 'center', letterSpacing: 0.2 },
	questionCard: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#2563eb', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
	qText: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
	optionsList: { marginLeft: 10, marginBottom: 8 },
	optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
	optionText: { fontSize: 15, color: '#334155', fontWeight: '500' },
	answerText: { marginTop: 7, color: '#059669', fontWeight: '700', fontSize: 15 },
	myTestsSection: { marginTop: 36, marginBottom: 18 },
	testCard: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#2563eb', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
	testMeta: { color: '#64748b', fontSize: 13, marginBottom: 7 },
	showQuestionsBtn: { backgroundColor: '#9506d2ff', borderRadius: 7, paddingVertical: 9, alignItems: 'center', marginTop: 7, flex: 1, marginRight: 4 },
	showQuestionsBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
	startStopBtn: { flex: 1, borderRadius: 7, paddingVertical: 9, alignItems: 'center', marginTop: 0, marginRight: 4 },
	startStopBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default OnlineTestexam;
