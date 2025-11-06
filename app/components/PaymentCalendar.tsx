import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import responsive, { rem } from '../utils/responsive';

type AppliedToEntry = {
  year: number;
  month: string;
  amount?: number;
  paidAmount?: number;
  previousDueAmount?: number;
};

type PaymentRecord = {
  id: number | string;
  studentId: string;
  amount: number;
  method: string;
  reference?: string;
  appliedTo: Record<string, AppliedToEntry>;
  date?: string;
  receiptNo?: string;
  note?: string;
};

type ApiResponse = {
  success?: boolean;
  dueFees?: number;
  payments: PaymentRecord[];
};

const APRIL_TO_MARCH = [
  'April', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'March'
];

type Props = {
  studentId: string;
  apiBaseUrl?: string;
  tokenKey?: string;
};

const PaymentCalendar: React.FC<Props> = ({ studentId, apiBaseUrl = '', tokenKey }) => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [dueFees, setDueFees] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const token = tokenKey ? await AsyncStorage.getItem(tokenKey) : await AsyncStorage.getItem('teacher_token');
      const url = `${apiBaseUrl}/onlineTest/payments/student/${studentId}`;
      const res = await axios.get(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      
      // Handle both old format (array) and new format (object with payments array)
      const data: ApiResponse = res.data;
      if (Array.isArray(data)) {
        setPayments(data);
        setDueFees(0);
      } else {
        setPayments(data.payments || []);
        setDueFees(data.dueFees || 0);
      }
    } catch (e: any) {
      console.warn('Failed to fetch payments', e?.message || e);
      setError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [studentId, apiBaseUrl, tokenKey]);

  // Build a map of monthName -> totalPaid
  const monthMap: Record<string, { paidAmount: number; entries: AppliedToEntry[] }> = {} as any;
  APRIL_TO_MARCH.forEach((m) => (monthMap[m] = { paidAmount: 0, entries: [] }));

  // Track other fees (non-monthly)
  const otherFees: Array<{ name: string; amount: number; date?: string; receiptNo?: string }> = [];

  payments.forEach((p) => {
    if (!p.appliedTo) return;
    Object.values(p.appliedTo).forEach((entryAny) => {
      const entry = entryAny as AppliedToEntry;
      const monthRaw = (entry.month || '').toString().trim();
      if (!monthRaw) return;
      const normalized = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1).toLowerCase();
      
      // Check if it's a standard month
      if (monthMap[normalized]) {
        const amt = Number(entry.amount ?? entry.paidAmount ?? 0);
        monthMap[normalized].paidAmount += amt;
        monthMap[normalized].entries.push(entry);
      } else {
        // It's a non-monthly fee (like Admission Fees, Other Fees, etc.)
        const amt = Number(entry.amount ?? entry.paidAmount ?? 0);
        if (amt > 0 && monthRaw.toLowerCase() !== 'due') {
          otherFees.push({
            name: monthRaw,
            amount: amt,
            date: p.date,
            receiptNo: p.receiptNo
          });
        }
      }
    });
  });

  const now = new Date();
  const standardMonthNames = [
    'January','February','March','April','May','June','July','August','September','October','November','December'
  ];
  const currentStdName = standardMonthNames[now.getMonth()];
  const currentMonthName = currentStdName;

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const monthsPaidCount = APRIL_TO_MARCH.filter((m) => monthMap[m].paidAmount > 0).length;
  const otherFeesTotal = otherFees.reduce((s, f) => s + f.amount, 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading payments...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { padding: rem(12) }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Fee Payments</Text>
        <View style={styles.summary}>
          <Text style={styles.summaryText}>Paid: ₹{totalPaid}</Text>
          <Text style={styles.summarySub}>{monthsPaidCount} / 12 months</Text>
        </View>
      </View>

      {/* Due Fees Alert */}
      {dueFees > 0 && (
        <View style={styles.dueAlert}>
          <Text style={styles.dueAlertTitle}>⚠️ Outstanding Dues</Text>
          <Text style={styles.dueAlertAmount}>₹{dueFees}</Text>
        </View>
      )}

      {dueFees === 0 && payments.length > 0 && (
        <View style={styles.noDueAlert}>
          <Text style={styles.noDueAlertText}>✓ No Outstanding Dues</Text>
        </View>
      )}

      {error ? (
        <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
      ) : (
        <>
          {/* Monthly Fees Section */}
          <Text style={styles.sectionTitle}>Monthly Fees</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthsRow}>
            {APRIL_TO_MARCH.map((m) => {
              const paidAmount = monthMap[m]?.paidAmount || 0;
              const isPaid = paidAmount > 0;
              const isCurrent = m.toLowerCase() === currentMonthName.toLowerCase();
              return (
                <View key={m} style={[styles.monthCard, isPaid ? styles.monthPaid : styles.monthUnpaid, { width: Math.min(responsive.width * 0.45, 240) }]}>
                  <Text style={[styles.monthTitle, { fontSize: rem(16) }]}>{m}</Text>
                  <Text style={[styles.monthAmount, { fontSize: rem(16) }]}>₹{paidAmount > 0 ? paidAmount : '—'}</Text>
                  <View style={styles.rowCenter}>
                    <View style={[styles.statusPill, isPaid ? styles.paidPill : styles.unpaidPill]}>
                      <Text style={[styles.pillText, isPaid ? styles.pillTextPaid : styles.pillTextUnpaid]}>{isPaid ? 'Paid' : 'Not Paid'}</Text>
                    </View>
                    {isCurrent && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Current</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Other Fees Section */}
          {otherFees.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Other Fees</Text>
              <View style={styles.otherFeesContainer}>
                {otherFees.map((fee, idx) => (
                  <View key={idx} style={styles.otherFeeCard}>
                    <View style={styles.otherFeeHeader}>
                      <Text style={styles.otherFeeName}>{fee.name}</Text>
                      <Text style={styles.otherFeeAmount}>₹{fee.amount}</Text>
                    </View>
                    {fee.receiptNo && (
                      <Text style={styles.otherFeeReceipt}>Receipt: {fee.receiptNo}</Text>
                    )}
                    {fee.date && (
                      <Text style={styles.otherFeeDate}>
                        {new Date(fee.date).toLocaleDateString('en-IN', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </Text>
                    )}
                  </View>
                ))}
                <View style={styles.otherFeesTotal}>
                  <Text style={styles.otherFeesTotalLabel}>Total Other Fees:</Text>
                  <Text style={styles.otherFeesTotalAmount}>₹{otherFeesTotal}</Text>
                </View>
              </View>
            </>
          )}
        </>
      )}

      <View style={styles.legendRow}>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, styles.paidPill]} /><Text style={styles.legendLabel}>Paid</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, styles.unpaidPill]} /><Text style={styles.legendLabel}>Not paid</Text></View>
      </View>

      <TouchableOpacity style={styles.refreshBtn} onPress={fetchPayments}>
        <Text style={styles.refreshText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 12 },
  center: { padding: 20, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 8, color: '#6b7280' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  summary: { alignItems: 'flex-end' },
  summaryText: { fontWeight: '700', color: '#10b981' },
  summarySub: { fontSize: 12, color: '#6b7280' },
  dueAlert: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dueAlertTitle: { fontSize: 14, fontWeight: '600', color: '#dc2626' },
  dueAlertAmount: { fontSize: 18, fontWeight: '700', color: '#dc2626' },
  noDueAlert: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 10, padding: 12, marginBottom: 12, alignItems: 'center' },
  noDueAlertText: { fontSize: 14, fontWeight: '600', color: '#15803d' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 4 },
  monthsRow: { paddingVertical: 6, paddingHorizontal: 2 },
  monthCard: { minHeight: 110, borderRadius: 10, padding: rem(12), marginRight: rem(12), justifyContent: 'space-between', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6e9f8' },
  monthPaid: { backgroundColor: '#ecffef', borderColor: '#bbf7d0' },
  monthUnpaid: { backgroundColor: '#fff5f5', borderColor: '#fecaca' },
  monthTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  monthAmount: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 6 },
  statusPill: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 20, marginTop: 8 },
  paidPill: { backgroundColor: '#10b981' },
  unpaidPill: { backgroundColor: '#ef4444' },
  pillText: { fontWeight: '700', color: '#fff', fontSize: 12 },
  pillTextPaid: { color: '#fff' },
  pillTextUnpaid: { color: '#fff' },
  rowCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  currentBadge: { backgroundColor: '#eef2ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
  currentBadgeText: { color: '#4f46e5', fontWeight: '700', fontSize: 12 },
  otherFeesContainer: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, marginTop: 8 },
  otherFeeCard: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  otherFeeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  otherFeeName: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  otherFeeAmount: { fontSize: 16, fontWeight: '700', color: '#10b981' },
  otherFeeReceipt: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  otherFeeDate: { fontSize: 12, color: '#6b7280' },
  otherFeesTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', marginTop: 4 },
  otherFeesTotalLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  otherFeesTotalAmount: { fontSize: 16, fontWeight: '700', color: '#4f46e5' },
  legendRow: { flexDirection: 'row', gap: 12, marginTop: 12, alignItems: 'center' } as any,
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  legendSwatch: { width: 14, height: 14, borderRadius: 4, marginRight: 8 },
  legendLabel: { color: '#374151' },
  refreshBtn: { marginTop: 12, backgroundColor: '#4f46e5', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  refreshText: { color: '#fff', fontWeight: '700' },
  errorBox: { padding: 12, backgroundColor: '#fff5f5', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' },
  errorText: { color: '#b91c1c' },
});

export default PaymentCalendar;