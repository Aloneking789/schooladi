import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const subjects = [
  { name: 'Mathematics', marks: 92, grade: 'A+' },
  { name: 'Science', marks: 88, grade: 'A' },
  { name: 'English', marks: 85, grade: 'A' },
  { name: 'History', marks: 78, grade: 'B+' },
  { name: 'Physical Education', marks: 95, grade: 'A+' },
];

const Academic = () => {
  const totalMarks = subjects.reduce((acc, subject) => acc + subject.marks, 0);
  const average = (totalMarks / subjects.length).toFixed(2);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Academic Report Card</Text>

      <View style={styles.infoBox}>
        <Text><Text style={styles.label}>Student Name:</Text> John Doe</Text>
        <Text><Text style={styles.label}>Class:</Text> 8th Grade</Text>
        <Text><Text style={styles.label}>Roll No:</Text> 23</Text>
        <Text><Text style={styles.label}>Academic Year:</Text> 2024–2025</Text>
      </View>

      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={[styles.tableCell, styles.headerCell]}>Subject</Text>
          <Text style={[styles.tableCell, styles.headerCell]}>Marks</Text>
          <Text style={[styles.tableCell, styles.headerCell]}>Grade</Text>
        </View>
        {subjects.map((subject, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.tableCell}>{subject.name}</Text>
            <Text style={styles.tableCell}>{subject.marks}</Text>
            <Text style={styles.tableCell}>{subject.grade}</Text>
          </View>
        ))}
        <View style={[styles.tableRow, styles.tableFooter]}>
          <Text style={styles.tableCell}>Average</Text>
          <Text style={styles.tableCell}>{average}</Text>
          <Text style={styles.tableCell}>—</Text>
        </View>
      </View>

      <View style={styles.remarksBox}>
        <Text style={styles.remarks}>
          Remarks: <Text style={styles.italic}>Excellent performance. Keep it up!</Text>
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'stretch',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#222',
  },
  infoBox: {
    marginBottom: 18,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  label: {
    fontWeight: 'bold',
  },
  table: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 18,
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
  },
  tableFooter: {
    backgroundColor: '#f3f4f6',
  },
  tableCell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    textAlign: 'left',
    fontSize: 15,
  },
  headerCell: {
    fontWeight: 'bold',
  },
  remarksBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  remarks: {
    color: '#555',
    fontSize: 14,
  },
  italic: {
    fontStyle: 'italic',
  },
});

export default Academic;
