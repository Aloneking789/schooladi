import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import responsive, { rem } from '../utils/responsive';

const API_URL = 'https://api.pbmpublicschool.inapi/onlineTest/online-test/class-tests';

const OnlineTest = () => {
  const [classId, setClassId] = useState('');
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTest, setSelectedTest] = useState(null);
  const [takingTest, setTakingTest] = useState(false);
  const [answers, setAnswers] = useState({});
  const [perQuestionTimes, setPerQuestionTimes] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [endedAt, setEndedAt] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null); // in seconds
  const timerRef = useRef(null);
  const questionStartTime = useRef(null);

  useEffect(() => {
    const fetchClassIdAndTests = async () => {
      setLoading(true);
      setError('');
      try {
        // Try to get classId from AsyncStorage (student_user)
        const userDataRaw = await AsyncStorage.getItem('user');
        let cid = '';
        if (userDataRaw) {
          const userData = JSON.parse(userDataRaw);
          cid = userData.classId || userData.user?.classId || '';
          const studentId = userData.id || userData.user?.StudentId || '';
        }
        // fallback: use hardcoded classId if not found
        if (!cid) cid = '';
        setClassId(cid);
        if (!cid) {
          setError('Class ID not found.');
          setLoading(false);
          return;
        }
        // Get student token for Authorization header
        const token = await AsyncStorage.getItem('student_token');
        const res = await fetch(`${API_URL}?classId=${cid}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.tests)) {
          // Sort tests by createdAt descending so most recent tests show first
          const sorted = data.tests.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setTests(sorted);
        } else {
          setTests([]);
          setError('No tests found.');
        }
      } catch (e) {
        setError('Failed to fetch tests.');
        setTests([]);
      } finally {
        setLoading(false);
      }
    };
    fetchClassIdAndTests();
  }, []);

// Real camera modal using expo-camera
// Dummy modal for exam start (no camera)
const DummyStartModal = ({ visible, onClose }) => (
  <Modal visible={visible} animationType="slide" transparent={false}>
    <View style={styles.cameraContainer}>
      <View style={styles.cameraView}>
        <Text style={styles.cameraIcon}>📝</Text>
        <Text style={styles.cameraText}>Get ready to start your test!</Text>
        <TouchableOpacity style={styles.cameraCloseBtn} onPress={onClose}>
          <Text style={styles.cameraCloseBtnText}>Start Test</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// Called when dummy camera is closed (start the test for real)
const handleCameraClosed = (setShowCamera, setTakingTest, setAnswers, setPerQuestionTimes, setCurrentQuestion, setStartedAt, questionStartTime, setRemainingTime, selectedTest, timerRef, handleSubmitTest) => {
  setShowCamera(false);
  setTakingTest(true);
  setAnswers({});
  setPerQuestionTimes([]);
  setCurrentQuestion(0);
  setStartedAt(new Date().toISOString());
  questionStartTime.current = Date.now();
  // Set timer if test has duration (in minutes)
  if (selectedTest && selectedTest.duration) {
    setRemainingTime(selectedTest.duration * 60); // convert min to sec
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev === 1) {
          clearInterval(timerRef.current);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  } else {
    setRemainingTime(null);
  }
};
  const renderTestCard = (test) => (
    <View key={test.id} style={styles.testCard}>
      <TouchableOpacity onPress={() => setSelectedTest(test)} activeOpacity={0.85}>
        <Text style={styles.testTitle}>{test.subject} - {test.chapterPrompt}</Text>
        <Text style={styles.testMeta}>Type: {test.questionType} | Created: {new Date(test.createdAt).toLocaleString()}</Text>
        <Text style={[styles.status, test.isStartest ? styles.statusActive : styles.statusInactive]}>
          {test.isStartest ? 'Test is Active' : 'Test Not Started'}
        </Text>
      </TouchableOpacity>
    </View>
  );


  // Start test: reset state, set start time
  const handleStartTest = () => {
    setShowCamera(true);
  };

  // Handle answer selection and move to next question
  const handleSelectAnswer = (qIdx, opt) => {
    const now = Date.now();
    const timeSpent = Math.round((now - questionStartTime.current) / 1e3); // seconds
    setAnswers(prev => ({ ...prev, [qIdx]: opt }));
    setPerQuestionTimes(prev => {
      const arr = [...prev];
      arr[qIdx] = timeSpent;
      return arr;
    });
    if (selectedTest.questions && qIdx < selectedTest.questions.length - 1) {
      setCurrentQuestion(qIdx + 1);
      questionStartTime.current = Date.now();
    } else {
      // Last question, finish
      setEndedAt(new Date().toISOString());
    }
  };

  // Submit answers to API
  const handleSubmitTest = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!selectedTest) return;
    try {
      const token = await AsyncStorage.getItem('student_token');
      const UserRaw = await AsyncStorage.getItem('user');
      const User = JSON.parse(UserRaw);
       console.log('Fetched StudentId from AsyncStorage:', User.StudentId);
      if (!User || !User.StudentId) {
        Alert.alert('Submission Failed', 'Student ID not found.');
        return;
       
      }
      setLoading(true);
      const res = await fetch(`https://api.pbmpublicschool.inapi/onlineTest/online-test/${selectedTest.id}/submit`, {
        
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
           
        },
        body: JSON.stringify({
          answers,
          StudentId: User.StudentId,
          perQuestionTimes,
          startedAt,
          endedAt: endedAt || new Date().toISOString(),
        }),
      });
      const data = await res.json();
      setLoading(false);
      setRemainingTime(null);
      if (data.success) {
        setTakingTest(false);
        setShowResult(true);
        fetchTestResult(selectedTest.id, token);
      } else {
        Alert.alert('Submission Failed', data.message || 'Could not submit test.');
      }
    } catch (e) {
      setLoading(false);
      setRemainingTime(null);
      Alert.alert('Submission Error', 'Network or server error.');
    }
  };

  // Fetch test result by testId
  
  const fetchTestResult = async (testId, token) => {
    const UserRaw = await AsyncStorage.getItem('user');
    const User = JSON.parse(UserRaw);
    const StudentId = User.StudentId;
    console.log('Fetching result for StudentId:', StudentId);
    try {
      setLoading(true);
      const res = await fetch(`https://api.pbmpublicschool.inapi/onlineTest/online-test/${testId}/my-result/${StudentId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setResultData(data);
      setLoading(false);
    } catch (e) {
      setResultData(null);
      setLoading(false);
    }
  };

  // Render one question at a time, with navigation and reset
  const renderTakeTest = (test) => {
    if (!test.questions || !Array.isArray(test.questions) || !test.questions[currentQuestion]) return null;
    const q = test.questions[currentQuestion];
    const total = test.questions.length;
    const formatTime = (sec) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };
    // Reset answers handler
    const handleResetAnswers = () => {
      setAnswers({});
      setPerQuestionTimes([]);
      setCurrentQuestion(0);
    };
    return (
      <View style={styles.questionsContainer}>
        {/* Timer fixed at top */}
        {remainingTime !== null && (
          <View style={styles.timerBar}>
            <Text style={[styles.timerText, remainingTime < 30 && { color: '#dc2626' }]}>⏰ Time Left: {formatTime(remainingTime)}</Text>
          </View>
        )}
        <View style={{ width: '100%', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={styles.questionsHeader}>Question {currentQuestion + 1} of {total}</Text>
          <View style={[styles.questionBlock, { marginBottom: 18, borderWidth: 2, borderColor: answers[currentQuestion] ? '#059669' : '#e2e8f0', backgroundColor: answers[currentQuestion] ? '#f0fdf4' : '#fff', width: 340, maxWidth: '100%' }]}> 
            <Text style={styles.questionText}>{q.question}</Text>
            {q.options && Array.isArray(q.options) && (
              <View style={styles.optionsList}>
                {q.options.map((opt, i) => {
                  const checked = String(answers[currentQuestion]) === String(opt);
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.optionRow, checked && { backgroundColor: '#bbf7d0', borderRadius: 6 }]}
                      onPress={() => handleSelectAnswer(currentQuestion, opt)}
                      disabled={!!answers[currentQuestion]}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.checkbox, checked && styles.checkboxChecked, checked && { borderColor: '#059669', backgroundColor: '#059669' }]}>
                        {checked ? <Text style={styles.checkboxTick}>✓</Text> : null}
                      </View>
                      <Text style={styles.optionLetter}>{String.fromCharCode(65 + i)}.</Text>
                      <Text style={styles.optionText}>{opt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 }}>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: '#64748b', marginRight: 10, minWidth: 100, opacity: currentQuestion === 0 ? 0.5 : 1 }]}
              onPress={() => setCurrentQuestion(q => Math.max(0, q - 1))}
              disabled={currentQuestion === 0}
            >
              <Text style={styles.closeBtnText}>Previous</Text>
            </TouchableOpacity>
            {currentQuestion < total - 1 && (
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: '#059669', marginLeft: 10, minWidth: 100, opacity: answers[currentQuestion] ? 1 : 0.5 }]}
                onPress={() => setCurrentQuestion(q => Math.min(total - 1, q + 1))}
                disabled={!answers[currentQuestion]}
              >
                <Text style={styles.closeBtnText}>Next</Text>
              </TouchableOpacity>
            )}
            {currentQuestion === total - 1 && (
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: '#059669', marginLeft: 10, minWidth: 120, opacity: answers[currentQuestion] ? 1 : 0.5 }]}
                onPress={handleSubmitTest}
                disabled={!answers[currentQuestion]}
              >
                <Text style={styles.closeBtnText}>Submit Test</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: '#dc2626', marginTop: 18, minWidth: 180 }]}
            onPress={handleResetAnswers}
          >
            <Text style={[styles.closeBtnText, { color: '#fff' }]}>Reset Answers</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Available Online Tests</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#4e3da3ff" style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : tests.length === 0 ? (
        <Text style={styles.emptyText}>No tests available for your class.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.testsList}>
          {tests.map(renderTestCard)}
        </ScrollView>
      )}
      {selectedTest && !takingTest && (
        <View style={styles.questionsContainer}>
          <Text style={styles.questionsHeader}>Test: {selectedTest.subject} - {selectedTest.chapterPrompt}</Text>
          <Text style={{ marginBottom: 16, color: '#64748b' }}>Questions: {selectedTest.questions.length}</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedTest(null)}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: '#059669', marginTop: 10 }]} onPress={handleStartTest}>
            <Text style={styles.closeBtnText}>Start Test</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: '#0f172a', marginTop: 10 }]} onPress={() => {
            setShowResult(true);
            AsyncStorage.getItem('student_token').then(token => fetchTestResult(selectedTest.id, token));
          }}>
            <Text style={styles.closeBtnText}>View My Result</Text>
          </TouchableOpacity>
        </View>
      )}
      {selectedTest && takingTest && renderTakeTest(selectedTest)}
  {/* Dummy Start Modal - always rendered at root */}
  <DummyStartModal visible={showCamera} onClose={() => handleCameraClosed(setShowCamera, setTakingTest, setAnswers, setPerQuestionTimes, setCurrentQuestion, setStartedAt, questionStartTime, setRemainingTime, selectedTest, timerRef, handleSubmitTest)} />

  {/* Result Modal */}
  <Modal visible={showResult} animationType="slide" transparent={false} onRequestClose={() => setShowResult(false)}>
    <View style={[styles.cameraContainer, { backgroundColor: '#fff' }]}> 
      <View style={[styles.cameraView, { justifyContent: 'flex-start', alignItems: 'flex-start', width: '100%' }]}> 
        <Text style={{ fontSize: 26, fontWeight: '700', color: '#059669', marginBottom: 10, alignSelf: 'center', width: '100%', textAlign: 'center' }}>Test Result</Text>
        {resultData && resultData.success ? (
          <>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 10 }}>Score: <Text style={{ color: '#059669' }}>{resultData.submission?.score}</Text></Text>
            <ScrollView style={{ width: '100%' }}>
              {resultData.questions && resultData.questions.map((q, idx) => (
                <View key={idx} style={{ marginBottom: 18, backgroundColor: '#f1f5f9', borderRadius: 8, padding: 12 }}>
                  <Text style={{ fontWeight: '700', color: '#1e293b', marginBottom: 4 }}>{idx + 1}. {q.question}</Text>
                  {q.options && q.options.map((opt, i) => (
                    <Text key={i} style={{ marginLeft: 12, color: opt === q.answer ? '#059669' : (resultData.answers && resultData.answers[idx] === opt ? '#dc2626' : '#334155'), fontWeight: opt === q.answer ? '700' : '400' }}>
                      {String.fromCharCode(65 + i)}. {opt}
                      {opt === q.answer ? ' (Correct)' : (resultData.answers && resultData.answers[idx] === opt ? ' (Your Answer)' : '')}
                    </Text>
                  ))}
                </View>
              ))}
            </ScrollView>
          </>
        ) : (
          <Text style={{ color: '#dc2626', fontWeight: '600', fontSize: 18 }}>No result found.</Text>
        )}
        <TouchableOpacity style={[styles.closeBtn, { backgroundColor: '#059669', marginTop: 20 }]} onPress={() => setShowResult(false)}>
          <Text style={styles.closeBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#2563eb',
    borderRadius: 5,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkboxTick: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    lineHeight: 18,
  },
  timerBar: { position: 'absolute', top: rem(18), left: 0, right: 0, alignItems: 'center', zIndex: 20, backgroundColor: 'rgba(255,255,255,0.95)', paddingVertical: rem(6), borderBottomWidth: 1, borderColor: '#e2e8f0' },
  timerText: { fontSize: rem(20), fontWeight: 'bold', color: '#059669', letterSpacing: 1 },
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: rem(16) },
  header: { fontSize: rem(24), fontWeight: '700', color: '#1e293b', textAlign: 'center', marginVertical: rem(18) },
  cameraContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  cameraView: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
  cameraCloseBtn: { backgroundColor: '#fff', borderRadius: rem(8), paddingVertical: rem(12), paddingHorizontal: rem(30), alignItems: 'center', position: 'absolute', bottom: rem(40), alignSelf: 'center' },
  cameraCloseBtnText: { color: '#000', fontWeight: '700', fontSize: rem(16) },
  testsList: { paddingBottom: rem(40) },
  testCard: { backgroundColor: '#fff', borderRadius: rem(12), padding: rem(18), marginBottom: rem(18), shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: rem(6), elevation: 2, borderWidth: 1, borderColor: '#e2e8f0', width: '100%', maxWidth: Math.min(responsive.width - rem(32), 900) },
  testTitle: { fontSize: rem(18), fontWeight: '700', color: '#334155', marginBottom: rem(6) },
  testMeta: { color: '#64748b', fontSize: rem(13), marginBottom: rem(8) },
  status: { fontWeight: '700', fontSize: rem(15), marginTop: rem(2) },
  statusActive: { color: '#059669' },
  statusInactive: { color: '#dc2626' },
  errorText: { color: '#dc2626', textAlign: 'center', marginTop: 30, fontWeight: '600' },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 30, fontWeight: '500' },
  questionsContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(248,249,250,0.98)', justifyContent: 'center', alignItems: 'center', padding: rem(20), zIndex: 10 },
  questionsHeader: { fontSize: rem(22), fontWeight: '700', color: '#0f172a', marginBottom: rem(18), textAlign: 'center' },
  questionBlock: { backgroundColor: '#fff', borderRadius: rem(10), padding: rem(14), marginBottom: rem(14), borderWidth: 1, borderColor: '#e2e8f0', width: Math.min(responsive.width - rem(40), rem(340)) },
  questionText: { fontSize: rem(16), fontWeight: '600', color: '#1e293b', marginBottom: rem(8) },
  optionsList: { marginLeft: rem(8), marginBottom: rem(6) },
  optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: rem(6) },
  optionLetter: { fontWeight: '700', color: '#3f75eaff', marginRight: rem(6) },
  optionText: { fontSize: rem(15), color: '#334155' },
  closeBtn: { backgroundColor: '#2563eb', borderRadius: rem(8), paddingVertical: rem(10), paddingHorizontal: rem(30), alignItems: 'center', marginTop: rem(18) },
  closeBtnText: { color: '#fff', fontWeight: '700', fontSize: rem(16) },
});

export default OnlineTest;
