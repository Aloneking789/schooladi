import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";

const AdmissionsSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: '#f3f4f6',
  },
});

export default AdmissionsSkeleton;
