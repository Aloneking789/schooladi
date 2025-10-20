import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Button, FlatList, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

interface DailyAttendanceSummaryProps {
  schoolId: string;
  teacherId?: string;
}

const DailyAttendanceSummary = ({ schoolId, teacherId }: DailyAttendanceSummaryProps) => {
  const [date, setDate] = useState(new Date());
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchAttendanceSummary = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem("principal_token");

      const response = await axios.get(
        `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/teacher-attendance/daily-summary`,
        {
          params: {
            schoolId,
            date: date.toISOString().split('T')[0],
            teacherId: teacherId || undefined,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setAttendanceSummary(response.data.data);
    } catch (err: any) {
      console.error("Error fetching attendance summary:", (err as any).response || (err as any).message);
      setError((err as any).response?.data?.message || "Failed to fetch attendance summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceSummary();
  }, [date, teacherId]);

  const renderPunches = (punches: any[]) =>
    punches.map((punch: any, index: number) => (
      <View key={index} style={styles.punchItem}>
        <Text style={styles.boldText}>{punch.type}:</Text>
        <Text>{new Date(punch.time).toLocaleTimeString()}</Text>
        <Text style={styles.smallText}>
          Lat: {punch.latitude}, Lon: {punch.longitude}
        </Text>
      </View>
    ));

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.name}>{item.fullName}</Text>
      <Text style={styles.email}>{item.email}</Text>
      {renderPunches(item.punches)}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Daily Attendance Summary</Text>

      <View style={styles.dateContainer}>
        <Button
          title={`Select Date: ${date.toISOString().split('T')[0]}`}
          onPress={() => setShowDatePicker(true)}
        />
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}
      </View>

      {loading && <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }} />}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && !error && attendanceSummary.length > 0 && (
        <FlatList
          data={attendanceSummary}
          keyExtractor={(item) => item.teacherId.toString()}
          renderItem={renderItem}
        />
      )}

      {!loading && !error && attendanceSummary.length === 0 && (
        <Text style={styles.noData}>No attendance records found for the selected date.</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  dateContainer: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#f4f4f4',
    padding: 16,
    marginBottom: 12,
    borderRadius: 10,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  email: {
    color: '#555',
    marginBottom: 8,
  },
  punchItem: {
    marginBottom: 8,
  },
  boldText: {
    fontWeight: 'bold',
  },
  smallText: {
    fontSize: 12,
    color: '#777',
  },
  error: {
    color: 'red',
    marginTop: 16,
  },
  noData: {
    marginTop: 16,
    fontStyle: 'italic',
  },
});

export default DailyAttendanceSummary;
