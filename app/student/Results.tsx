import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

const { width } = Dimensions.get('window');

const Results = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
 


  useEffect(() => {
    fetchReportCard();
  }, []);

  const fetchReportCard = async () => {
    try {
      const studentRaw = await AsyncStorage.getItem('student_user');
      const student = studentRaw ? JSON.parse(studentRaw) : null;
      const idCardNumber =
        student?.idcardNumber ||
        student?.IdcardNumber ||
        student?.student?.idcardNumber ||
        student?.student?.IdcardNumber ||
        '';

      console.log('ID Card Number:', idCardNumber);

      if (!idCardNumber) {
        console.warn('No ID card number found in storage');
        setLoading(false);
        return;
      }

      const url = `https://api.pbmpublicschool.in/api/resultpublish/public/results/by-idcard/${encodeURIComponent(
        idCardNumber
      )}`;

      const response = await fetch(url);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching report card:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade) => {
    const colors = {
      'A+': '#10b981',
      'A': '#22c55e',
      'B+': '#3b82f6',
      'B': '#6366f1',
      'C+': '#f59e0b',
      'C': '#f97316',
      'D': '#ef4444',
      'E': '#dc2626'
    };
    return colors[grade] || '#6b7280';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading Report Card...</Text>
      </View>
    );
  }

  if (!data || !data.success) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load report card</Text>
      </View>
    );
  }

  const { student, results } = data;

  // Calculate age from date of birth
  const calculateAge = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={{ uri: 'https://api.pbmpublicschool.in/uploads/1758045530526.png' }}
          style={styles.logo}
        />
        <View style={styles.schoolInfo}>
          <Text style={styles.schoolName}>P B M PUBLIC SCHOOL</Text>
          <Text style={styles.schoolAddress}>
            Khanimpur, Khajani Road, Gorakhpur, Uttar Pradesh
          </Text>
          <Text style={styles.schoolContact}>
            📧 pbmpublicschool@gmail.com | 📞 +91 7525945555
          </Text>
        </View>
      </View>

      {/* Academic Session Banner */}
      <View style={styles.sessionBanner}>
        <Text style={styles.reportTitle}>EXAMINATION REPORT CARD</Text>
      </View>

      {/* Student Information Card */}
      <View style={styles.studentCard}>
        <View style={styles.studentInfoContainer}>
          <View style={styles.studentDetails}>
            <InfoRow label="Student Name" value={student.studentName} />
            <InfoRow label="Father's Name" value={student.fatherName} />
            <InfoRow label="Mother's Name" value={student.motherName} />
            <InfoRow label="Date of Birth" value={new Date(student.dateOfBirth).toLocaleDateString('en-IN')} />
            <InfoRow label="Age" value={`${calculateAge(student.dateOfBirth)} years`} />
          </View>
          {student.photo && (
            <Image
              source={{ uri: `https://api.pbmpublicschool.in/${student.photo}` }}
              style={styles.studentPhoto}
            />
          )}
        </View>
        <View style={styles.studentDetailsSecondary}>
          <InfoRow label="Class" value={`${student.className} - ${student.section}`} />
          <InfoRow label="Roll Number" value={student.rollNumber} />
          <InfoRow label="SR Number" value={student.srNumber} />
          <InfoRow label="ID Card Number" value={student.idcardNumber} />
        </View>
      </View>

      {/* Examination Results */}
      {results.map((result, index) => (
        <View key={result.id} style={styles.examCard}>
          <View style={styles.examHeader}>
            <Text style={styles.examType}>{result.examType}</Text>
            <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(result.grade) }]}>
              <Text style={styles.gradeText}>{result.grade}</Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Marks</Text>
              <Text style={styles.summaryValue}>{result.totalMarks}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Obtained</Text>
              <Text style={styles.summaryValue}>{result.obtainedMarks}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Percentage</Text>
              <Text style={styles.summaryValue}>{result.percentage.toFixed(2)}%</Text>
            </View>
          </View>

          {/* Marks Table */}
          <View style={styles.marksTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.subjectColumn]}>Subject</Text>
              <Text style={styles.tableCell}>Max</Text>
              <Text style={styles.tableCell}>Obtained</Text>
              <Text style={styles.tableCell}>%</Text>
            </View>
            {result.marks.map((mark, idx) => (
              <View key={mark.id} style={[styles.tableRow, idx % 2 === 0 ? styles.evenRow : styles.oddRow]}>
                <Text style={[styles.tableCell, styles.subjectColumn, styles.subjectText]}>
                  {mark.subject}
                </Text>
                <Text style={styles.tableCell}>{mark.maxMarks}</Text>
                <Text style={[styles.tableCell, styles.obtainedMarks]}>{mark.obtained}</Text>
                <Text style={styles.tableCell}>
                  {((mark.obtained / mark.maxMarks) * 100).toFixed(0)}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Overall Performance Summary */}
      <View style={styles.overallCard}>
        <Text style={styles.overallTitle}>Overall Academic Performance</Text>
        {results.map((result) => (
          <View key={result.id} style={styles.performanceRow}>
            <Text style={styles.performanceLabel}>{result.examType}</Text>
            <View style={styles.performanceRight}>
              <Text style={styles.performancePercentage}>{result.percentage.toFixed(2)}%</Text>
              <View style={[styles.performanceBadge, { backgroundColor: getGradeColor(result.grade) }]}>
                <Text style={styles.performanceBadgeText}>{result.grade}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Grade Scale */}
      <View style={styles.gradeScale}>
        <Text style={styles.gradeScaleTitle}>Grade Scale</Text>
        <View style={styles.gradeScaleGrid}>
          {[
            { grade: 'A+', range: '90-100' },
            { grade: 'A', range: '80-89' },
            { grade: 'B+', range: '70-79' },
            { grade: 'B', range: '60-69' },
            { grade: 'C+', range: '50-59' },
            { grade: 'C', range: '40-49' },
          ].map((item) => (
            <View key={item.grade} style={styles.gradeScaleItem}>
              <View style={[styles.gradeBox, { backgroundColor: getGradeColor(item.grade) }]}>
                <Text style={styles.gradeBoxText}>{item.grade}</Text>
              </View>
              <Text style={styles.gradeRange}>{item.range}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          This is a computer-generated report card. No signature required.
        </Text>
      </View>
    </ScrollView>
  );
};

const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}:</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#3b82f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logo: {
    width: 60,
    height: 60,
    marginRight: 15,
    borderRadius: 35,
  },
  schoolInfo: {
    flex: 1,
  },
  schoolName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  schoolAddress: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 1,
  },
  schoolContact: {
    fontSize: 9,
    color: '#6b7280',
  },
  sessionBanner: {
    backgroundColor: '#f97316',
    padding: 1,
    alignItems: 'center',
  },
  sessionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  reportTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  studentCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  studentInfoContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  studentDetails: {
    flex: 1,
  },
  studentPhoto: {
    width: 100,
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  studentDetailsSecondary: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 15,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
    width: 120,
  },
  infoValue: {
    fontSize: 13,
    color: '#1f2937',
    fontWeight: '500',
    flex: 1,
  },
  examCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  examType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  gradeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  gradeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 8,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  marksTable: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    padding: 12,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  evenRow: {
    backgroundColor: '#f9fafb',
  },
  oddRow: {
    backgroundColor: '#fff',
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
    color: '#1f2937',
    textAlign: 'center',
    fontWeight: '500',
  },
  subjectColumn: {
    flex: 2,
    textAlign: 'left',
  },
  subjectText: {
    fontWeight: '600',
  },
  obtainedMarks: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  overallCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overallTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15,
    textAlign: 'center',
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  performanceLabel: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  performanceRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  performancePercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginRight: 10,
  },
  performanceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  performanceBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  gradeScale: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gradeScaleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15,
    textAlign: 'center',
  },
  gradeScaleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  gradeScaleItem: {
    alignItems: 'center',
    marginBottom: 10,
    width: '30%',
  },
  gradeBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  gradeBoxText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  gradeRange: {
    fontSize: 11,
    color: '#6b7280',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default Results;