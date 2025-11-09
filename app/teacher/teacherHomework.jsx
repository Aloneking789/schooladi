import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const HomeworkManagement = () => {
  const [homeworks, setHomeworks] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [filterSection, setFilterSection] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [token, setToken] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    assignedSections: 'A',
    dueDate: new Date(),
    studentVisible: true,
    parentVisible: true,
  });

  // Initialize
  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (schoolId && token) {
      fetchClasses();
    }
  }, [schoolId, token]);

  useEffect(() => {
    if (selectedClass && token) {
      fetchHomeworks();
    }
  }, [selectedClass, token]);

  const initialize = async () => {
    try {
      const userRaw =
        (await AsyncStorage.getItem('teacher_user')) || (await AsyncStorage.getItem('user')) || (await AsyncStorage.getItem('principal_user'));
      let tokenRaw =
        (await AsyncStorage.getItem('teacher_token')) || (await AsyncStorage.getItem('token')) || (await AsyncStorage.getItem('user_token')) || (await AsyncStorage.getItem('principal_token'));
      if (userRaw) {
        const user = JSON.parse(userRaw);
        setSchoolId(String(user.schoolId?.toString() || user.user?.schools?.[0]?.id || '1'));
        const assigned = user.classId || user.user?.classId || user.assignedClass || user.assignedClassId;
        if (assigned) {
          // assigned might be an id or an object; normalize to string id
          const id = typeof assigned === 'object' ? (assigned.id || assigned.classId || assigned._id) : assigned;
          if (id) setSelectedClass(String(id));
        }

        // If token not found in dedicated keys, try common nested token fields inside user object
        if (!tokenRaw) {
          tokenRaw = user.token || user.accessToken || user.auth?.token || user.user?.token || user.user?.accessToken;
          if (tokenRaw) console.log('Resolved token from user object');
        }
      }

      if (tokenRaw) setToken(tokenRaw);
    } catch (err) {
      console.error('Error initializing:', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch(`https://1rzlgxk8-5001.inc1.devtunnels.ms/api/classes/${schoolId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const clsArr = data.classes || [];
      setClasses(clsArr);

      // If selectedClass is empty, default to first class id
      if (!selectedClass && clsArr.length > 0) {
        setSelectedClass(String(clsArr[0].id));
        return;
      }

      // If selectedClass exists but doesn't match any class id, try to map by class name or other common fields
      if (selectedClass && clsArr.length > 0) {
        const foundById = clsArr.find((c) => String(c.id) === String(selectedClass));
        if (!foundById) {
          // try match by name, or numeric name, or short name
          const foundByName = clsArr.find(
            (c) => String(c.name) === String(selectedClass) || String(c.name).trim() === String(selectedClass).trim()
          );
          if (foundByName) {
            setSelectedClass(String(foundByName.id));
          }
        }
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchHomeworks = async () => {
    if (!selectedClass) return;
    console.log('Fetching homeworks for class:', selectedClass);

    setLoading(true);
    try {
      const url = `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/homeworks/homeworks/by-class/${selectedClass}`;
      console.log('GET', url, 'with token present:', !!token);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      console.log('Fetch homeworks response status:', res.status);

      let text = '';
      try {
        text = await res.text();
      } catch (e) {
        console.warn('Could not read response text', e);
      }

      // Try to parse JSON if possible
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        data = {};
      }

      if (res.ok && data.success && Array.isArray(data.homeworks)) {
        const items = data.homeworks;
        const unique = items.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        if (unique.length !== items.length) console.warn('Duplicate homework ids removed:', items.length - unique.length);
        setHomeworks(unique);
      } else {
        console.warn('Failed to fetch by-class, status:', res.status, 'body:', text);
        // If forbidden, surface message and attempt a fallback to fetch all homeworks and filter client-side
        if (res.status === 403) {
          const msg = (data && data.message) || text || 'Forbidden';
          Alert.alert('Access denied', msg);
          // Attempt fallback: fetch all homeworks and filter by class id (in case API rejects by-class but allows listing)
          try {
            const allUrl = 'https://1rzlgxk8-5001.inc1.devtunnels.ms/api/homeworks/homeworks';
            console.log('Attempting fallback GET', allUrl);
            const allRes = await fetch(allUrl, { headers: { Authorization: `Bearer ${token}` } });
            const allText = await allRes.text();
            let allData = {};
            try { allData = allText ? JSON.parse(allText) : {}; } catch (e) { allData = {}; }
            if (allRes.ok && Array.isArray(allData.homeworks)) {
              const items = allData.homeworks.filter(hw => String(hw.classId || hw.class?.id || hw.class) === String(selectedClass));
              const unique = items.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
              setHomeworks(unique);
            } else {
              console.warn('Fallback fetch failed', allRes.status, allText);
              setHomeworks([]);
            }
          } catch (e) {
            console.warn('Fallback fetch error', e);
            setHomeworks([]);
          }
        } else {
          setHomeworks([]);
        }
      }
    } catch (err) {
      console.warn('Error fetching homeworks', err);
      Alert.alert('Error', 'Failed to load homeworks');
      setHomeworks([]);
    }
    console.log('Finished fetching homeworks; homeworks count:', homeworks.length);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHomeworks();
    setRefreshing(false);
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Homework',
      'Are you sure you want to delete this homework?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleteLoading(id);
            try {
              const res = await fetch(
                `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/homeworks/homeworks/${id}`,
                {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` },
                }
              );

              if (res.ok) {
                setHomeworks((prev) => prev.filter((hw) => hw.id !== id));
                Alert.alert('Success', 'Homework deleted successfully!');
              } else {
                Alert.alert('Error', 'Failed to delete homework');
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to delete homework');
            }
            setDeleteLoading(null);
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Validation', 'Please enter a title');
      return;
    }
    if (!formData.content.trim()) {
      Alert.alert('Validation', 'Please enter homework content');
      return;
    }
    if (!selectedClass) {
      Alert.alert('Validation', 'Please select a class');
      return;
    }

    try {
      const body = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        dueDate: formData.dueDate.toISOString(),
        classId: selectedClass,
        studentVisible: formData.studentVisible,
        parentVisible: formData.parentVisible,
        assignedSections: formData.assignedSections,
      };

      const res = await fetch('https://1rzlgxk8-5001.inc1.devtunnels.ms/api/homeworks/homeworks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create homework');
      }

      Alert.alert('Success', 'Homework created successfully!');
      setShowAddModal(false);
      setFormData({
        title: '',
        content: '',
        assignedSections: 'A',
        dueDate: new Date(),
        studentVisible: true,
        parentVisible: true,
      });
      fetchHomeworks();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save homework');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate.getTime() === today.getTime()) return 'Today';
    if (checkDate.getTime() === tomorrow.getTime()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredHomeworks = homeworks.filter((hw) => {
    if (filterSection === 'all') return true;
    return hw.assignedSections === filterSection;
  });

  const sections = [...new Set(homeworks.map((hw) => hw.assignedSections))].filter(Boolean);

  const renderHomeworkCard = ({ item }) => {
    const daysUntil = getDaysUntilDue(item.dueDate);
    const isOverdue = daysUntil < 0;
    const isDueSoon = daysUntil >= 0 && daysUntil <= 2;

    return (
      <View style={styles.homeworkCard}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <LinearGradient colors={['#3B82F6', '#8B5CF6']} style={styles.iconGradient}>
              <Feather name="book-open" size={20} color="#fff" />
            </LinearGradient>
          </View>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardContent}>{item.content}</Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            disabled={deleteLoading === item.id}
            style={styles.deleteButton}
          >
            {deleteLoading === item.id ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <Feather name="trash-2" size={18} color="#DC2626" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.badgeContainer}>
          <View style={styles.badgePurple}>
            <Feather name="users" size={12} color="#7C3AED" />
            <Text style={styles.badgeTextPurple}>Section {item.assignedSections}</Text>
          </View>

          <View style={styles.badgeBlue}>
            <Text style={styles.badgeTextBlue}>Class {item.class?.name}</Text>
          </View>

          <View
            style={[
              styles.badge,
              isOverdue ? styles.badgeRed : isDueSoon ? styles.badgeOrange : styles.badgeGreen,
            ]}
          >
            <Feather name="calendar" size={12} color={isOverdue ? '#DC2626' : isDueSoon ? '#EA580C' : '#059669'} />
            <Text
              style={[
                styles.badgeText,
                isOverdue ? styles.badgeTextRed : isDueSoon ? styles.badgeTextOrange : styles.badgeTextGreen,
              ]}
            >
              {formatDate(item.dueDate)}
            </Text>
          </View>

          {isOverdue && (
            <View style={styles.overdueTag}>
              <Text style={styles.overdueText}>Overdue</Text>
            </View>
          )}
          {isDueSoon && !isOverdue && (
            <View style={styles.dueSoonTag}>
              <Text style={styles.dueSoonText}>Due Soon</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.visibilityContainer}>
            <Text style={styles.visibilityLabel}>Visible to:</Text>
            {item.studentVisible && (
              <View style={styles.visibilityBadgeBlue}>
                <Feather name="check-circle" size={12} color="#2563EB" />
                <Text style={styles.visibilityTextBlue}>Students</Text>
              </View>
            )}
            {item.parentVisible && (
              <View style={styles.visibilityBadgeGreen}>
                <Feather name="check-circle" size={12} color="#059669" />
                <Text style={styles.visibilityTextGreen}>Parents</Text>
              </View>
            )}
          </View>
          <View style={styles.timestampContainer}>
            <Feather name="clock" size={10} color="#9CA3AF" />
            <Text style={styles.timestamp}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#3B82F6', '#8B5CF6']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Feather name="book-open" size={24} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Homework Management</Text>
            <Text style={styles.headerSubtitle}>Assign and manage homework</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Class Selector & Actions */}
      <View style={styles.controlsCard}>
        <Text style={styles.label}>Select Class</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedClass}
            onValueChange={(val) => setSelectedClass(val ? String(val) : '')}
            style={styles.picker}
          >
            <Picker.Item label="Choose a class" value="" />
            {classes.map((cls, idx) => (
              <Picker.Item key={`${String(cls.id)}-${idx}`} label={`Class ${cls.name}`} value={String(cls.id)} />
            ))}
          </Picker>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => setShowFilterMenu(true)}
            style={styles.filterButton}
          >
            <Feather name="filter" size={18} color="#374151" />
            <Text style={styles.filterButtonText}>
              {filterSection === 'all' ? 'All Sections' : `Section ${filterSection}`}
            </Text>
            <Feather name="chevron-down" size={16} color="#374151" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
            <LinearGradient colors={['#3B82F6', '#8B5CF6']} style={styles.addButtonGradient}>
              <Feather name="plus" size={18} color="#fff" />
              <Text style={styles.addButtonText}>Add New</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Homework List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading homeworks...</Text>
        </View>
      ) : !selectedClass ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Feather name="book-open" size={48} color="#3B82F6" />
          </View>
          <Text style={styles.emptyTitle}>Select a Class</Text>
          <Text style={styles.emptyText}>Choose a class from the dropdown above to view homework</Text>
        </View>
      ) : filteredHomeworks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Feather name="inbox" size={48} color="#8B5CF6" />
          </View>
          <Text style={styles.emptyTitle}>No Homework Found</Text>
          <Text style={styles.emptyText}>
            {filterSection === 'all'
              ? 'Start by adding homework for this class'
              : `No homework found for Section ${filterSection}`}
          </Text>
          <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.emptyButton}>
            <LinearGradient colors={['#3B82F6', '#8B5CF6']} style={styles.emptyButtonGradient}>
              <Feather name="plus" size={18} color="#fff" />
              <Text style={styles.emptyButtonText}>Add Homework</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredHomeworks}
          renderItem={renderHomeworkCard}
          keyExtractor={(item, index) => (item?.id ? `${item.id}-${index}` : String(index))}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />}
        />
      )}

      {/* Filter Modal */}
      <Modal visible={showFilterMenu} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterMenu(false)}
        >
          <View style={styles.filterModal}>
            <Text style={styles.filterModalTitle}>Filter by Section</Text>
            <TouchableOpacity
              onPress={() => {
                setFilterSection('all');
                setShowFilterMenu(false);
              }}
              style={[styles.filterOption, filterSection === 'all' && styles.filterOptionSelected]}
            >
              <Text style={[styles.filterOptionText, filterSection === 'all' && styles.filterOptionTextSelected]}>
                All Sections
              </Text>
              {filterSection === 'all' && <Feather name="check" size={18} color="#3B82F6" />}
            </TouchableOpacity>
            {sections.map((section, idx) => (
              <TouchableOpacity
                key={`${section}-${idx}`}
                onPress={() => {
                  setFilterSection(section);
                  setShowFilterMenu(false);
                }}
                style={[styles.filterOption, filterSection === section && styles.filterOptionSelected]}
              >
                <Text
                  style={[styles.filterOptionText, filterSection === section && styles.filterOptionTextSelected]}
                >
                  Section {section}
                </Text>
                {filterSection === section && <Feather name="check" size={18} color="#3B82F6" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Homework Modal */}
      <Modal visible={showAddModal} animationType="slide">
        <View style={styles.modalContainer}>
          <LinearGradient colors={['#3B82F6', '#8B5CF6']} style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <View style={styles.modalHeaderIcon}>
                <Feather name="plus" size={20} color="#fff" />
              </View>
              <Text style={styles.modalTitle}>Add New Homework</Text>
            </View>
            <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.modalCloseButton}>
              <Feather name="x" size={24} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Title <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                style={styles.input}
                placeholder="e.g., Math Chapter 5 Exercise"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Description <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                value={formData.content}
                onChangeText={(text) => setFormData({ ...formData, content: text })}
                style={[styles.input, styles.textArea]}
                placeholder="Describe the homework assignment..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Assigned Section <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.assignedSections}
                  onValueChange={(val) => setFormData({ ...formData, assignedSections: val })}
                  style={styles.picker}
                >
                  <Picker.Item label="Section A" value="A" />
                  <Picker.Item label="Section B" value="B" />
                  <Picker.Item label="Section C" value="C" />
                  <Picker.Item label="Section D" value="D" />
                </Picker>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Due Date <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
                <Feather name="calendar" size={18} color="#374151" />
                <Text style={styles.dateButtonText}>{formatDate(formData.dueDate)}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={formData.dueDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setFormData({ ...formData, dueDate: selectedDate });
                    }
                  }}
                />
              )}
            </View>

            <View style={styles.visibilitySection}>
              <Text style={styles.formLabel}>Visibility Settings</Text>
              <View style={styles.switchContainer}>
                <View style={styles.switchRow}>
                  <View style={styles.switchLabelContainer}>
                    <Feather name={formData.studentVisible ? 'eye' : 'eye-off'} size={16} color="#3B82F6" />
                    <Text style={styles.switchLabel}>Visible to Students</Text>
                  </View>
                  <Switch
                    value={formData.studentVisible}
                    onValueChange={(val) => setFormData({ ...formData, studentVisible: val })}
                    trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                    thumbColor={formData.studentVisible ? '#3B82F6' : '#F3F4F6'}
                  />
                </View>
                <View style={styles.switchRow}>
                  <View style={styles.switchLabelContainer}>
                    <Feather name={formData.parentVisible ? 'eye' : 'eye-off'} size={16} color="#059669" />
                    <Text style={styles.switchLabel}>Visible to Parents</Text>
                  </View>
                  <Switch
                    value={formData.parentVisible}
                    onValueChange={(val) => setFormData({ ...formData, parentVisible: val })}
                    trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                    thumbColor={formData.parentVisible ? '#059669' : '#F3F4F6'}
                  />
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmit} style={styles.submitButton}>
                <LinearGradient colors={['#3B82F6', '#8B5CF6']} style={styles.submitButtonGradient}>
                  <Text style={styles.submitButtonText}>Create Homework</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  controlsCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  addButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  listContainer: {
    padding: 16,
  },
  homeworkCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  iconContainer: {
    marginRight: 12,
  },
  iconGradient: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  cardContent: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  deleteButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgePurple: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3E8FF',
  },
  badgeTextPurple: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7C3AED',
  },
  badgeBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
  },
  badgeTextBlue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2563EB',
  },
  badgeRed: {
    backgroundColor: '#FEE2E2',
  },
  badgeTextRed: {
    fontSize: 12,
    fontWeight: '500',
    color: '#DC2626',
  },
  badgeOrange: {
    backgroundColor: '#FFEDD5',
  },
  badgeTextOrange: {
    fontSize: 12,
    fontWeight: '500',
    color: '#EA580C',
  },
  badgeGreen: {
    backgroundColor: '#D1FAE5',
  },
  badgeTextGreen: {
    fontSize: 12,
    fontWeight: '500',
    color: '#059669',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  overdueTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#DC2626',
  },
  overdueText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  dueSoonTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#EA580C',
  },
  dueSoonText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  visibilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  visibilityLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  visibilityBadgeBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#DBEAFE',
  },
  visibilityTextBlue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2563EB',
  },
  visibilityBadgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#D1FAE5',
  },
  visibilityTextGreen: {
    fontSize: 12,
    fontWeight: '500',
    color: '#059669',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  filterModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 320,
  },
  filterModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  filterOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  filterOptionTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#DC2626',
  },
  input: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#111827',
  },
  visibilitySection: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  switchContainer: {
    marginTop: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  submitButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default HomeworkManagement;