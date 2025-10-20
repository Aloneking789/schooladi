import axios from "axios";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface Notice {
  id: string;
  title: string;
  content: string;
  tag: string;
  pdfUrl?: string;
  createdAt: string;
  publishedBy: {
    fullName: string;
  };
}

const filterOptions = ["Announcements", "Events", "Scholarships", "Exams"];

const ShowNotice: React.FC = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [filters, setFilters] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const response = await axios.get("https://1rzlgxk8-5001.inc1.devtunnels.ms/api/notices/notices");
        if (response.data.success) {
          setNotices(response.data.notices.slice(0, 5));
        }
      } catch (err) {
        setError("Failed to load notices.");
      } finally {
        setLoading(false);
      }
    };

    fetchNotices();
  }, []);

  const toggleFilter = (option: string) => {
    setFilters((prev) =>
      prev.includes(option)
        ? prev.filter((f) => f !== option)
        : [...prev, option]
    );
  };

  const clearFilters = () => setFilters([]);
  const selectAllFilters = () => setFilters(filterOptions);

  const filteredNotices = filters.length
    ? notices.filter((notice) => filters.includes(notice.tag))
    : notices;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Important Updates</Text>

      <View style={styles.filterBox}>
        <Text style={styles.subtitle}>Filter Options</Text>
        {filterOptions.map((option) => (
          <TouchableOpacity key={option} onPress={() => toggleFilter(option)}>
            <Text style={filters.includes(option) ? styles.checked : styles.unchecked}>
              {filters.includes(option) ? "✅ " : "⬜ "}{option}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.filterButtons}>
          <TouchableOpacity onPress={selectAllFilters} style={styles.button}>
            <Text style={styles.buttonText}>Select All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearFilters} style={styles.button}>
            <Text style={styles.buttonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && <ActivityIndicator size="large" color="#000" />}
      {error && <Text style={styles.error}>{error}</Text>}
      {!loading && !error && filteredNotices.length === 0 && (
        <Text>No notices available.</Text>
      )}

      {!loading && !error && filteredNotices.map((notice) => (
        <View key={notice.id} style={styles.noticeBox}>
          <Text style={styles.noticeAuthor}>{notice.publishedBy.fullName} on {notice.title}</Text>
          <Text style={styles.noticeContent}>{notice.content}</Text>
          {notice.pdfUrl && (
            <Text style={styles.link} onPress={() => { }}>
              View PDF
            </Text>
          )}
          <Text style={styles.timestamp}>
            {Math.floor((Date.now() - new Date(notice.createdAt).getTime()) / 3600000)} hours ago
          </Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  noticeBox: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  noticeAuthor: {
    fontWeight: "600",
    color: "#1f2937",
  },
  noticeContent: {
    marginTop: 6,
    color: "#374151",
  },
  timestamp: {
    marginTop: 4,
    fontSize: 12,
    color: "#9ca3af",
  },
  link: {
    marginTop: 6,
    color: "#2563eb",
    textDecorationLine: "underline",
  },
  filterBox: {
    marginBottom: 16,
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
  },
  filterButtons: {
    flexDirection: "row",
    marginTop: 10,
    gap: 8,
  },
  button: {
    backgroundColor: "#000",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
  },
  checked: {
    fontSize: 14,
    color: "#10b981",
  },
  unchecked: {
    fontSize: 14,
    color: "#374151",
  },
  error: {
    color: "red",
    marginVertical: 10,
  },
});

export default ShowNotice;
