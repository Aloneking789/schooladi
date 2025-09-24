import React, { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  Text,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system';

const filePath = `${FileSystem.documentDirectory}notes.txt`;

const TextEditor: React.FC = () => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadFile = async () => {
      setLoading(true);
      try {
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
          const content = await FileSystem.readAsStringAsync(filePath);
          setText(content);
        } else {
          setText('');
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    loadFile();
  }, []);

  const saveFile = async () => {
    setLoading(true);
    try {
      await FileSystem.writeAsStringAsync(filePath, text);
      Alert.alert('Saved!', 'Your text has been saved.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Text File Editor (.txt)</Text>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <>
          <TextInput
            style={styles.input}
            multiline
            placeholder="Start typing here..."
            value={text}
            onChangeText={setText}
          />
          <View style={{ marginTop: 8 }}>
            <Button title="Save File" onPress={saveFile} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

export default TextEditor;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    borderColor: '#aaa',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
});
