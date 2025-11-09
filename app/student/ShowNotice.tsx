import { Feather } from '@expo/vector-icons';
import axios from "axios";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Modal,
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
  recipient: 'ALL' | 'STUDENT' | 'STAFF';
  createdAt: string;
  publishedBy: {
    fullName: string;
    role: string;
  };
}

const filterOptions = ["Announcements", "Events", "Scholarships", "Exams"];

const ShowNotice: React.FC = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [filters, setFilters] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const response = await axios.get("https://api.pbmpublicschool.in/api/notices/notices?schoolId=1");
        if (response.data.success) {
          // Filter notices for students (ALL or STUDENT)
          const studentNotices = response.data.notices.filter(
            (notice: Notice) => notice.recipient === 'ALL' || notice.recipient === 'STUDENT'
          );
          setNotices(studentNotices);
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


      {loading && <ActivityIndicator size="large" color="#000" />}
      {error && <Text style={styles.error}>{error}</Text>}
      {!loading && !error && filteredNotices.length === 0 && (
        <Text>No notices available.</Text>
      )}

      {!loading && !error && filteredNotices.map((notice) => (
        <TouchableOpacity
          key={notice.id}
          style={styles.noticeBox}
          onPress={() => {
            setSelectedNotice(notice);
            setModalVisible(true);
            Animated.spring(modalAnimation, {
              toValue: 1,
              useNativeDriver: true,
            }).start();
          }}
        >
          <View style={styles.noticeHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.noticeTitle}>{notice.title}</Text>
              <View style={[
                styles.recipientBadge,
                notice.recipient === 'STUDENT' ? styles.studentBadge : styles.allBadge
              ]}>
                <Text style={styles.recipientText}>{notice.recipient}</Text>
              </View>
            </View>
            <Text style={styles.noticeAuthor}>by {notice.publishedBy.fullName}</Text>
          </View>
          <Text style={styles.noticePreview} numberOfLines={2}>
            {notice.content}
          </Text>
          <View style={styles.noticeFooter}>
            {notice.tag && (
              <View style={styles.tagContainer}>
                <Feather name="tag" size={12} color="#6b7280" />
                <Text style={styles.tag}>{notice.tag}</Text>
              </View>
            )}
            <Text style={styles.timestamp}>
              {new Date(notice.createdAt).toLocaleDateString()}
            </Text>
          </View>
          {notice.pdfUrl && (
            <View style={styles.pdfIndicator}>
              <Feather name="file-text" size={12} color="#2563eb" />
            </View>
          )}
        </TouchableOpacity>
      ))}

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setModalVisible(false);
          modalAnimation.setValue(0);
        }}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                transform: [
                  {
                    scale: modalAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  },
                ],
                opacity: modalAnimation,
              },
            ]}
          >
            {selectedNotice && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>{selectedNotice.title}</Text>
                    <Text style={styles.modalAuthor}>
                      by {selectedNotice.publishedBy.fullName} • {selectedNotice.publishedBy.role}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setModalVisible(false);
                      modalAnimation.setValue(0);
                    }}
                    style={styles.closeButton}
                  >
                    <Feather name="x" size={24} color="#374151" />
                  </TouchableOpacity>
                </View>

                <ScrollView 
                  style={styles.modalBody}
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={styles.modalBodyContent}
                >
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Content</Text>
                    <Text style={styles.modalContent}>{selectedNotice.content}</Text>
                  </View>

                  {selectedNotice.tag && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Category</Text>
                      <View style={styles.modalTagContainer}>
                        <Feather name="tag" size={14} color="#6b7280" />
                        <Text style={styles.modalTag}>{selectedNotice.tag}</Text>
                      </View>
                    </View>
                  )}

                  {selectedNotice.pdfUrl && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Attachments</Text>
                      <TouchableOpacity style={styles.pdfButton} onPress={() => {}}>
                        <Feather name="file-text" size={16} color="#ffffff" />
                        <Text style={styles.pdfButtonText}>View PDF</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.modalInfoSection}>
                    <View style={styles.recipientInfo}>
                      <Text style={styles.modalLabel}>Intended For</Text>
                      <View style={[
                        styles.recipientBadge,
                        selectedNotice.recipient === 'STUDENT' ? styles.studentBadge : styles.allBadge,
                        styles.modalRecipientBadge
                      ]}>
                        <Text style={[styles.recipientText, styles.modalRecipientText]}>
                          {selectedNotice.recipient}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.modalTimestamp}>
                      Posted on {new Date(selectedNotice.createdAt).toLocaleDateString()} at{' '}
                      {new Date(selectedNotice.createdAt).toLocaleTimeString()}
                    </Text>
                  </View>
                </ScrollView>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>
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
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noticeHeader: {
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    flex: 1,
    marginRight: 8,
  },
  noticeAuthor: {
    fontSize: 12,
    color: "#6b7280",
    fontStyle: 'italic',
  },
  noticePreview: {
    color: "#374151",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  noticeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tag: {
    fontSize: 12,
    color: "#6b7280",
    marginLeft: 4,
  },
  timestamp: {
    fontSize: 12,
    color: "#9ca3af",
  },
  recipientBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  studentBadge: {
    backgroundColor: "#fef3c7",
  },
  allBadge: {
    backgroundColor: "#d1fae5",
  },
  recipientText: {
    fontSize: 12,
    fontWeight: "500",
  },
  pdfIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  filterBox: {
    marginBottom: 16,
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: Dimensions.get('window').width < 768 
      ? Dimensions.get('window').width - 32 
      : Math.min(600, Dimensions.get('window').width - 64),
    maxHeight: Dimensions.get('window').height * 0.9,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  modalAuthor: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flexGrow: 1,
  },
  modalBodyContent: {
    padding: 16,
    flexGrow: 1,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
  },
  modalTagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  modalTag: {
    marginLeft: 8,
    color: '#4b5563',
    fontSize: 14,
  },
  modalInfoSection: {
    marginTop: 'auto',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  recipientInfo: {
    marginBottom: 12,
  },
  modalRecipientBadge: {
    alignSelf: 'flex-start',
  },
  modalRecipientText: {
    fontSize: 14,
  },
  modalTimestamp: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
  },
  pdfButton: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  pdfButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ShowNotice;
