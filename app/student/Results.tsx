import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const PUBLIC_API = 'https://api.pbmpublicschool.in/api/resultpublish/public/results/by-idcard';

const Results = () => {
  const [idcard, setIdcard] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    const loadAndFetch = async () => {
      try {
        const stored = await AsyncStorage.getItem('student_user');
        let id = '';
        if (stored) {
          const u = JSON.parse(stored);
          id = u.idcardNumber || u.idcard || u.idCard || u.idcardNumber;
        }
        // fallback: try explicit key
        const explicit = await AsyncStorage.getItem('idcardNumber');
        if (explicit) id = explicit;
        setIdcard(id || '');
        if (!id) {
          setLoading(false);
          return;
        }
        const res = await axios.get(`${PUBLIC_API}/${encodeURIComponent(id)}`);
        if (res.data && res.data.success) {
          setData(res.data);
        } else {
          Alert.alert('No results', res.data?.message || 'No results found');
        }
      } catch (e) {
        console.warn('Failed to fetch public results', e?.response || e);
        Alert.alert('Error', 'Unable to fetch results');
      } finally {
        setLoading(false);
      }
    };
    loadAndFetch();
  }, []);

  const buildHtml = (logoBase64?: string) => {
    if (!data) return '<p>No data</p>';
    const student = data.student || {};
    const results = data.results || [];
    // use the first result for main report (exam-level layout)
    const r = results[0] || { marks: [], examType: '', academicYear: '', grade: '', percentage: 0, class: { name: '' }, rollNumber: '' };

    // build marks rows
    const marksRows = (r.marks || []).map((m: any) => `
      <tr>
        <td style="border:1px solid #000;padding:6px;">${m.subject}</td>
        <td style="border:1px solid #000;padding:6px;text-align:center;">${m.maxMarks || '-'}</td>
        <td style="border:1px solid #000;padding:6px;text-align:center;">${m.obtained || '-'}</td>
        <td style="border:1px solid #000;padding:6px;text-align:center;">${m.grade || '-'}</td>
      </tr>
    `).join('');

    // simple bar chart values
    const chartValues = (r.marks || []).map((m: any) => ({ label: m.subject, value: Math.round(((m.obtained || 0) / (m.maxMarks || 1)) * 100) }));

    const chartBars = chartValues.map((c: any, i: number) => `
      <g transform="translate(${i * 90},0)">
        <rect x="10" y="${220 - (c.value * 2)}" width="60" height="${c.value * 2}" fill="#${['4f46e5','f59e0b','10b981','ef4444','c026d3','facc15','3b82f6'][i % 7]}" />
        <text x="40" y="235" font-size="12" text-anchor="middle">${c.label}</text>
        <text x="40" y="${215 - (c.value * 2)}" font-size="12" text-anchor="middle">${c.value}%</text>
      </g>
    `).join('');

    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: Arial, Helvetica, sans-serif; background:#fff; color:#111827; }
            .container { max-width:900px; margin:0 auto; padding:18px; }
            .header { text-align:center; }
            .school-name { font-size:28px; font-weight:800; color:#0b2b5a; }
            .sub { font-size:12px; color:#333; }
            .student-info { border:1px solid #000; padding:10px; margin-top:12px; }
            table { width:100%; border-collapse:collapse; }
            .marks-table th, .marks-table td { border:1px solid #000; padding:6px; }
            .section { margin-top:18px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${logoBase64 ? `<div style="position:relative;"><img src="data:image/png;base64,${logoBase64}" style="position:absolute;left:18px;top:0;width:90px;" /></div>` : ''}
            <div class="header">
              <div class="school-name">P.B.M. Public School</div>
              <div class="sub">KHANIMPUR (KHAJANI ROAD) GORAKHPUR-273212</div>
              <div class="sub">ACADEMIC SESSION: ${r.academicYear || ''}</div>
              <h2 style="color:#b91c1c;margin-top:10px;">ANNUAL EXAMINATION REPORT CARD</h2>
            </div>

            <div class="student-info">
              <table>
                <tr>
                  <td style="width:60%;"><strong>Student Name:</strong> ${student.studentName || '-' }<br/><strong>Father\'s Name:</strong> ${student.fathersName || ''}</td>
                  <td style="width:40%;"><strong>Student ID:</strong> ${student.idcardNumber || '-'}<br/><strong>Class:</strong> ${r.class?.name || '-'}<br/><strong>Roll:</strong> ${r.rollNumber || '-'}</td>
                </tr>
              </table>
            </div>

            <div class="section">
              <table class="marks-table">
                <thead>
                  <tr>
                    <th style="background:#f3f4f6;">SUBJECT NAME</th>
                    <th style="background:#f3f4f6;">Max</th>
                    <th style="background:#f3f4f6;">Obt</th>
                    <th style="background:#f3f4f6;">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  ${marksRows}
                  <tr>
                    <td style="border:1px solid #000;padding:6px;"><strong>Total</strong></td>
                    <td style="border:1px solid #000;padding:6px;text-align:center;"><strong>${(r.marks || []).reduce((s: number, m: any) => s + (m.maxMarks || 0), 0)}</strong></td>
                    <td style="border:1px solid #000;padding:6px;text-align:center;"><strong>${(r.marks || []).reduce((s: number, m: any) => s + (m.obtained || 0), 0)}</strong></td>
                    <td style="border:1px solid #000;padding:6px;text-align:center;"><strong>${Math.round(r.percentage || 0)}%</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="section" style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div style="width:65%;">
                <h4>CO-SCHOLASTIC AREA</h4>
                <table>
                  <tr><td style="border:1px solid #000;padding:8px;">PUNCTUALITY</td><td style="border:1px solid #000;padding:8px;">A</td></tr>
                  <tr><td style="border:1px solid #000;padding:8px;">PHYSICAL PRESENTATION</td><td style="border:1px solid #000;padding:8px;">B</td></tr>
                </table>
              </div>
              <div style="width:30%;">
                <h4>Key to Grade</h4>
                <table>
                  <tr><td style="border:1px solid #000;padding:6px;">90 - 100</td><td style="border:1px solid #000;padding:6px;">A+</td></tr>
                  <tr><td style="border:1px solid #000;padding:6px;">80 - 89</td><td style="border:1px solid #000;padding:6px;">A</td></tr>
                  <tr><td style="border:1px solid #000;padding:6px;">70 - 79</td><td style="border:1px solid #000;padding:6px;">B+</td></tr>
                </table>
              </div>
            </div>

            <div class="section" style="margin-top:20px;">
              <svg width="100%" height="260" viewBox="0 0 ${Math.max(300, (chartValues.length * 90))} 260">
                <g transform="translate(20,20)">
                  ${chartBars}
                </g>
              </svg>
            </div>

            ${logoBase64 ? `<div style="position:absolute;left:0;top:0;opacity:0.08;width:100%;height:100%;display:block;text-align:center;"><img src="data:image/png;base64,${logoBase64}" style="width:420px;margin-top:80px;opacity:0.08;"/></div>` : ''}

          </div>
        </body>
      </html>
    `;
  };

  const onExport = async () => {
    if (!data) {
      Alert.alert('No data', 'Nothing to export');
      return;
    }
    try {
      // Load local logo asset and convert to base64 so it embeds correctly in PDF
      let logoBase64: string | undefined;
      try {
        // Download remote logo and read as base64 so it can be embedded in the PDF HTML
        const remoteUrl = 'https://api.pbmpublicschool.in/uploads/1758045530526.png';
  const baseDir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
  const downloadRes = await FileSystem.downloadAsync(remoteUrl, baseDir + 'pbm_logo.png');
        const fileInfo = await FileSystem.readAsStringAsync(downloadRes.uri, { encoding: 'base64' });
        logoBase64 = fileInfo;
      } catch (e) {
        console.warn('Failed to download remote logo as base64, proceeding without embedded logo', e);
      }

      const html = buildHtml(logoBase64);
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      } else {
        Alert.alert('Saved', `PDF saved to ${uri}`);
      }
    } catch (e) {
      console.warn('Export failed', e);
      Alert.alert('Error', 'Failed to export PDF');
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator /><Text style={{ marginTop: 8 }}>Loading...</Text></View>;

  if (!data) return (
    <View style={styles.center}>
      <Text>No results available for ID: {idcard || '-'}. Try logging in or provide idcardNumber in storage.</Text>
    </View>
  );

  const student = data.student || {};
  const results = data.results || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.header}>
        <Image source={{ uri: 'https://api.pbmpublicschool.in/uploads/1758045530526.png' }} style={styles.logo} />
        <Text style={styles.school}>P.B.M Public School</Text>
        <Text style={styles.subtitle}>Student Report Card</Text>
      </View>

      <View style={styles.studentCard}>
        <Text style={styles.studentName}>{student.studentName}</Text>
        <Text style={styles.meta}>ID: {student.idcardNumber}</Text>
        <Text style={styles.meta}>Class: {results[0]?.class?.name || '-'}</Text>
        <Text style={styles.meta}>Roll: {results[0]?.rollNumber || '-'}</Text>
      </View>
      {/* Horizontal scrollable cards for each exam result */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={{ paddingHorizontal: 4 }}>
        {results.map((r: any) => (
          <ResultCard key={r.id} result={r} />
        ))}
      </ScrollView>

      <View style={{ marginTop: 10 }}>
        <TouchableOpacity style={styles.btn} onPress={onExport}>
          <Text style={styles.btnText}>Export as PDF</Text>
        </TouchableOpacity>
        <View style={{ height: 8 }} />
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#059669' }]} onPress={onExportAll}>
          <Text style={styles.btnText}>Export All Results</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// ...existing code... (onExportAll implemented further below)

// Small presentational card component with expand/collapse to show marks
const ResultCard = ({ result }: { result: any }) => {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => setOpen((s) => !s)} style={styles.cardWrap}>
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.cardTitle}>{result.examType}</Text>
          <Text style={styles.cardMeta}>{Math.round(result.percentage || 0)}% • {result.grade}</Text>
        </View>
        <Text style={styles.cardSub}>{result.academicYear} • Class: {result.class?.name || '-'}</Text>
        {open && (
          <View style={{ marginTop: 10 }}>
            {(result.marks || []).map((m: any) => (
              <View key={m.id} style={styles.resultRow}>
                <Text style={{ flex: 1 }}>{m.subject}</Text>
                <Text style={{ width: 110, textAlign: 'right' }}>{m.obtained}/{m.maxMarks}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Helper to build HTML section for a single result (used by Export All)
const buildResultSection = (student: any, r: any, logoBase64?: string) => {
  const marksRows = (r.marks || []).map((m: any) => `
    <tr>
      <td style="border:1px solid #000;padding:6px;">${m.subject}</td>
      <td style="border:1px solid #000;padding:6px;text-align:center;">${m.maxMarks || '-'}</td>
      <td style="border:1px solid #000;padding:6px;text-align:center;">${m.obtained || '-'}</td>
      <td style="border:1px solid #000;padding:6px;text-align:center;">${m.grade || '-'}</td>
    </tr>
  `).join('');

  return `
    <div style="page-break-after:always;padding:18px;">
      ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" style="width:90px;position:absolute;left:18px;top:18px;" />` : ''}
      <h2 style="text-align:center;margin-top:0;">P.B.M. Public School</h2>
      <h3 style="text-align:center;color:#b91c1c;">${r.examType} — ${r.academicYear}</h3>
      <div style="border:1px solid #000;padding:8px;margin-bottom:12px;">
        <strong>Student:</strong> ${student.studentName || '-'} &nbsp; <strong>ID:</strong> ${student.idcardNumber || '-'}<br />
        <strong>Class:</strong> ${r.class?.name || '-'} &nbsp; <strong>Roll:</strong> ${r.rollNumber || '-'}
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="border:1px solid #000;padding:6px;">Subject</th>
            <th style="border:1px solid #000;padding:6px;">Max</th>
            <th style="border:1px solid #000;padding:6px;">Obt</th>
            <th style="border:1px solid #000;padding:6px;">Grade</th>
          </tr>
        </thead>
        <tbody>
          ${marksRows}
          <tr>
            <td style="border:1px solid #000;padding:6px;"><strong>Total</strong></td>
            <td style="border:1px solid #000;padding:6px;text-align:center;"><strong>${(r.marks || []).reduce((s: number, m: any) => s + (m.maxMarks || 0), 0)}</strong></td>
            <td style="border:1px solid #000;padding:6px;text-align:center;"><strong>${(r.marks || []).reduce((s: number, m: any) => s + (m.obtained || 0), 0)}</strong></td>
            <td style="border:1px solid #000;padding:6px;text-align:center;"><strong>${Math.round(r.percentage || 0)}%</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
};

// Export all results in a single PDF (each result on its own page)
const onExportAll = async () => {
  try {
    // prepare logo
    let logoBase64: string | undefined;
    try {
      const remoteUrl = 'https://api.pbmpublicschool.in/uploads/1758045530526.png';
      const baseDir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
      const downloadRes = await FileSystem.downloadAsync(remoteUrl, baseDir + 'pbm_logo_all.png');
      const fileInfo = await FileSystem.readAsStringAsync(downloadRes.uri, { encoding: 'base64' });
      logoBase64 = fileInfo;
    } catch (e) {
      console.warn('Failed to download remote logo for Export All, continuing without logo', e);
    }

    // build combined HTML
    const student = (await AsyncStorage.getItem('student_user')) ? JSON.parse(await AsyncStorage.getItem('student_user') as string) : {};
    const resultsJson = (await AsyncStorage.getItem('last_results_cache')) || null;
    // prefer in-memory `data` if available - but we can't access it here. We'll fetch results again if needed.
    let allResults: any[] = [];
    // try to read from the component-level data by fetching idcard again
    const stored = await AsyncStorage.getItem('student_user');
    let id = '';
    if (stored) {
      const u = JSON.parse(stored);
      id = u.idcardNumber || u.idcard || u.idCard || u.idcardNumber || '';
    }
    if (resultsJson) {
      try { allResults = JSON.parse(resultsJson); } catch { allResults = []; }
    }
    // Fallback: if no cached results, attempt to call the public API directly
    if (!allResults || allResults.length === 0) {
      try {
        const PUBLIC_API = 'https://api.pbmpublicschool.in/api/resultpublish/public/results/by-idcard';
        if (id) {
          const res = await axios.get(`${PUBLIC_API}/${encodeURIComponent(id)}`);
          if (res.data && res.data.success) {
            allResults = res.data.results || [];
          }
        }
      } catch (e) {
        console.warn('Failed to fetch all results for export', e);
      }
    }

    if (!allResults || allResults.length === 0) {
      Alert.alert('No results', 'No results found to export');
      return;
    }

    const sections = allResults.map((res) => buildResultSection(student, res, logoBase64)).join('\n');

    const fullHtml = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>body{font-family:Arial,Helvetica,sans-serif;color:#111}</style>
        </head>
        <body>
          ${sections}
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html: fullHtml });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } else {
      Alert.alert('Saved', `PDF saved to ${uri}`);
    }
  } catch (e) {
    console.warn('Export all failed', e);
    Alert.alert('Error', 'Failed to export all results');
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 12 },
  logo: { width: 90, height: 90, resizeMode: 'contain', opacity: 0.95 },
  school: { fontSize: 18, fontWeight: '800', color: '#111827' },
  subtitle: { color: '#6b7280' },
  studentCard: { backgroundColor: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e6e9f2', marginBottom: 12 },
  studentName: { fontWeight: '800', fontSize: 16 },
  meta: { color: '#6b7280', marginTop: 4 },
  resultBlock: { backgroundColor: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e9ecf3', marginBottom: 10 },
  resultTitle: { fontWeight: '700' },
  resultMeta: { color: '#6b7280' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  btn: { backgroundColor: '#4f46e5', padding: 12, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  horizontalScroll: { marginVertical: 8 },
  cardWrap: { paddingHorizontal: 6 },
  card: { width: 300, backgroundColor: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e9ecf3', marginRight: 8 },
  cardTitle: { fontWeight: '700', fontSize: 16, color: '#111827' },
  cardMeta: { color: '#6b7280', fontWeight: '700' },
  cardSub: { color: '#6b7280', marginTop: 6 },
});

export default Results;
