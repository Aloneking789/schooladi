import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  StyleSheet,
  Button,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import type { ImagePickerAsset } from 'expo-image-picker';
import RemoteImage from '../utils/getImageUrl';

const SchoolGallery = () => {
  const [schoolid, setSchoolid] = useState('');
  const [type, setType] = useState('');
  const [customType, setCustomType] = useState('');
  const [altText, setAltText] = useState('');
  const [image, setImage] = useState<ImagePickerAsset | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gallery, setGallery] = useState<any[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [Name, setName] = useState('');
  const [topperClass, setTopperClass] = useState('');
  const [topperPercentage, setTopperPercentage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const userRaw = await AsyncStorage.getItem('principal_user');
        const user = userRaw ? JSON.parse(userRaw) : null;
        const schools = user?.principal_user?.schools || user?.schools || [];
        const schoolId = schools[0]?.id || '';
        setSchoolid(schoolId);
      } catch {
        setSchoolid('');
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    if (showGallery && schoolid) {
      fetchGallery();
    }
  }, [showGallery, schoolid]);

  const fetchGallery = async () => {
    if (!schoolid) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.pbmpublicschool.in/api/newSchool/landing-images/by-school/${schoolid}`
      );
      const data = await res.json();
      setGallery(data.images || []);
    } catch {
      Alert.alert('Error', 'Failed to fetch images.');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePick = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Camera roll access is required!');
      return;
    }
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!pickerResult.canceled && pickerResult.assets.length > 0) {
      const selected = pickerResult.assets[0];
      setImage(selected);
      setPreview(selected.uri);
    }
  };

  const handleSubmit = async () => {
    const finalType = type === 'other' ? customType : type;

    if (!schoolid || !finalType || !image) {
      Alert.alert('Error', 'Please fill all required fields.');
      return;
    }

    const requiresName = [
      "principal",
      "vice_principal",
      "manager",
      "topper_highschool_1",
      "topper_highschool_2",
      "topper_highschool_3",
      "topper_inter_1",
      "topper_inter_2",
      "topper_inter_3",
    ].includes(finalType);

    if (requiresName && !Name.trim()) {
      Alert.alert('Error', 'Name is required.');
      return;
    }

    if (
      finalType.startsWith('topper') &&
      (!topperClass.trim() || !topperPercentage.trim())
    ) {
      Alert.alert('Error', 'Topper class and percentage required.');
      return;
    }

    const formData = new FormData();
    formData.append('image', {
      uri: Platform.OS === 'ios' ? image.uri.replace('file://', '') : image.uri,
      name: 'photo.jpg',
      type: 'image/jpeg',
    } as any);

    formData.append('schoolid', schoolid);
    formData.append('type', finalType);
    formData.append('altText', altText);
    formData.append('name', Name);
    formData.append('class', topperClass);
    formData.append('percentage', topperPercentage);

    setLoading(true);
    try {
      await fetch('https://api.pbmpublicschool.in/api/newSchool/landing-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      Alert.alert('Success', 'Image uploaded!');
      setType('');
      setCustomType('');
      setAltText('');
      setImage(null);
      setPreview(null);
      setName('');
      setTopperClass('');
      setTopperPercentage('');
      if (showGallery) fetchGallery();
    } catch {
      Alert.alert('Error', 'Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteItemId(id);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    setShowConfirmModal(false);
    if (!deleteItemId) return;
    setLoading(true);
    try {
      await fetch(
        `https://api.pbmpublicschool.in/api/newSchool/landing-images/${deleteItemId}`,
        { method: 'DELETE' }
      );
      Alert.alert('Success', 'Image deleted.');
      fetchGallery();
    } catch {
      Alert.alert('Error', 'Delete failed.');
    } finally {
      setLoading(false);
      setDeleteItemId(null);
    }
  };

  return (

    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={schoolid}
        editable={false}
        placeholder={schoolid ? `${schoolid}` : 'Loading school ID...'}
      />

      <Picker
        selectedValue={type}
        onValueChange={(itemValue) => {
          setType(itemValue);
          if (itemValue !== 'other') setCustomType('');
        }}
        style={styles.input}
      >
        <Picker.Item label="Select type" value="" />
        <Picker.Item label="Principal" value="principal" />
        <Picker.Item label="Vice Principal" value="vice_principal" />
        <Picker.Item label="Manager" value="manager" />
        <Picker.Item label="High School Topper 1" value="topper_highschool_1" />
        <Picker.Item label="High School Topper 2" value="topper_highschool_2" />
        <Picker.Item label="High School Topper 3" value="topper_highschool_3" />
        <Picker.Item label="Intermediate Topper 1" value="topper_inter_1" />
        <Picker.Item label="Intermediate Topper 2" value="topper_inter_2" />
        <Picker.Item label="Intermediate Topper 3" value="topper_inter_3" />
        <Picker.Item label="School Logo" value="SchoolLogo" />
        <Picker.Item label="School Banner" value="school_banner" />
        <Picker.Item label="School Building" value="school_building" />
        <Picker.Item label="School Event" value="school_event" />
        <Picker.Item label="School Activity" value="school_activity" />
        <Picker.Item label="School Cultural" value="school_cultural" />
        <Picker.Item label="School Sports" value="school_sports" />
        <Picker.Item label="School Trip" value="school_trip" />
        <Picker.Item label="School Festival" value="school_festival" />
        <Picker.Item label="School Achievement" value="school_achievement" />
        <Picker.Item label="Other" value="other" />
      </Picker>

      {type === 'other' && (
        <TextInput
          style={styles.input}
          placeholder="Custom Type"
          value={customType}
          onChangeText={setCustomType}
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="Name"
        value={Name}
        onChangeText={setName}
      />

      {type.startsWith('topper') && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Class"
            value={topperClass}
            onChangeText={setTopperClass}
          />
          <TextInput
            style={styles.input}
            placeholder="Percentage"
            value={topperPercentage}
            onChangeText={setTopperPercentage}
          />
        </>
      )}

      <TextInput
        style={styles.input}
        placeholder="Alt Text"
        value={altText}
        onChangeText={setAltText}
      />

      <Button title="Pick Image" onPress={handleImagePick} />

      {preview && <Image source={{ uri: preview }} style={styles.preview} />}

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.buttonText}>
          {loading ? 'Uploading...' : 'Upload Image'}
        </Text>
      </TouchableOpacity>

      <Button
        title={showGallery ? 'Hide Uploaded Images' : 'Show Uploaded Images'}
        onPress={() => setShowGallery((prev) => !prev)}
      />

      {showGallery && (
        loading ? (
          <ActivityIndicator size="large" />
        ) : (
          <FlatList
            data={gallery}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.galleryItem}>
                <RemoteImage
                  path={item.url}
                  style={styles.galleryImage}
                  resizeMode="cover"
                  alt={item.altText || item.type}
                  onError={() => console.log("Image failed to load:", item.url)}
                />
                <Text>{item.type}</Text>
                {item.name && <Text>Name: {item.name}</Text>}
                {item['class'] && <Text>Class: {item['class']}</Text>}
                {item.percentage && <Text>Percentage: {item.percentage}%</Text>}
                {item.altText && <Text>Alt: {item.altText}</Text>}
                <Button title="Delete" onPress={() => handleDeleteClick(item.id)} />
              </View>
            )}
          />
        )
      )}

      <Modal visible={showConfirmModal} transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text>Are you sure you want to delete this image?</Text>
            <View style={styles.modalButtons}>
              <Button title="Cancel" onPress={() => setShowConfirmModal(false)} />
              <Button title="Delete" onPress={confirmDelete} color="red" />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  preview: {
    width: '100%',
    height: 200,
    marginTop: 12,
    marginBottom: 12,
  },
  galleryItem: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
  },
  galleryImage: {
    width: '100%',
    height: 150,
    marginBottom: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
});

export default SchoolGallery;
