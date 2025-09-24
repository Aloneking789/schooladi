import React from "react";
import { View, StyleSheet } from "react-native";

const AttendanceSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitle} />
        <View style={styles.headerActions}>
          <View style={styles.headerAction} />
          <View style={styles.headerAction} />
        </View>
      </View>
      {/* Search */}
      <View style={styles.searchBar} />
      {/* Table */}
      <View style={styles.table}>
        {/* Table header */}
        <View style={styles.tableHeaderRow}>
          <View style={styles.tableHeaderCell} />
          <View style={styles.tableHeaderCell} />
          <View style={styles.tableHeaderCell} />
        </View>
        {/* Table rows */}
        {[...Array(5)].map((_, idx) => (
          <View key={idx} style={styles.tableRow}>
            <View style={styles.tableCellShort} />
            <View style={styles.tableCellLong} />
            <View style={styles.tableCellActions}>
              <View style={styles.actionCircle} />
              <View style={styles.actionCircle} />
            </View>
          </View>
        ))}
      </View>
      {/* Footer */}
      <View style={styles.footerRow}>
        <View style={styles.footerActions}>
          <View style={styles.footerAction} />
          <View style={styles.footerAction} />
        </View>
        <View style={styles.footerButton} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitle: {
    height: 32,
    width: 192,
    backgroundColor: "#d1d5db",
    borderRadius: 8,
  },
  headerActions: {
    flexDirection: "row",
    gap: 16,
  },
  headerAction: {
    height: 32,
    width: 96,
    backgroundColor: "#d1d5db",
    borderRadius: 8,
    marginLeft: 8,
  },
  searchBar: {
    height: 40,
    width: "33%",
    backgroundColor: "#d1d5db",
    borderRadius: 8,
    marginBottom: 24,
  },
  table: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    padding: 16,
    gap: 16,
  },
  tableHeaderCell: {
    height: 16,
    flex: 1,
    backgroundColor: "#d1d5db",
    borderRadius: 8,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    gap: 16,
  },
  tableCellShort: {
    height: 16,
    width: 64,
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
  },
  tableCellLong: {
    height: 16,
    width: 160,
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
  },
  tableCellActions: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 8,
  },
  actionCircle: {
    height: 24,
    width: 24,
    backgroundColor: "#e5e7eb",
    borderRadius: 12,
    marginLeft: 4,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
  },
  footerActions: {
    flexDirection: "row",
    gap: 16,
  },
  footerAction: {
    height: 16,
    width: 80,
    backgroundColor: "#d1d5db",
    borderRadius: 8,
    marginLeft: 8,
  },
  footerButton: {
    height: 40,
    width: 144,
    backgroundColor: "#d1d5db",
    borderRadius: 8,
  },
});

export default AttendanceSkeleton;
