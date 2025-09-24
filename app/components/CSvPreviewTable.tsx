import React from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";

type CsvRow = Record<string, string | number | null | undefined>;

type CsvPreviewTableProps = {
  csvData: CsvRow[];
};

const CsvPreviewTable: React.FC<CsvPreviewTableProps> = ({ csvData }) => {
  if (!csvData || csvData.length === 0) {
    return null;
  }

  const headers = Object.keys(csvData[0]);

  return (
    <ScrollView horizontal style={styles.container}>
      <View>
        {/* Header Row */}
        <View style={[styles.row, styles.headerRow]}>
          {headers.map((header, index) => (
            <View key={index} style={[styles.cell, styles.headerCell]}>
              <Text style={styles.headerText}>{header}</Text>
            </View>
          ))}
        </View>
        {/* Data Rows */}
        {csvData.map((row, rowIndex) => (
          <View
            key={rowIndex}
            style={[
              styles.row,
              rowIndex % 2 === 1 && styles.evenRow,
            ]}
          >
            {headers.map((header, colIndex) => (
              <View key={`${rowIndex}-${colIndex}`} style={styles.cell}>
                <Text style={styles.cellText}>
                  {row[header] !== undefined && row[header] !== null
                    ? String(row[header])
                    : "-"}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginVertical: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerRow: {
    backgroundColor: "#f3f4f6",
  },
  evenRow: {
    backgroundColor: "#f9f9f9",
  },
  cell: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
    minWidth: 80,
    justifyContent: "center",
  },
  headerCell: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerText: {
    fontWeight: "bold",
    fontSize: 15,
  },
  cellText: {
    fontSize: 14,
  },
});

export default CsvPreviewTable;
