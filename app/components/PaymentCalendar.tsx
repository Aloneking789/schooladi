import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import responsive, { rem } from '../utils/responsive';

type AppliedToEntry = {
  year: number;
  month: string;
  // API uses `amount`; older code used `paidAmount` — accept both
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

const APRIL_TO_MARCH = [
  'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'
];

type Props = {
  studentId: string;
  apiBaseUrl?: string; // e.g. https://.../api
  tokenKey?: string; // AsyncStorage key for token, default falls back to 'teacher_token'
};

const PaymentCalendar: React.FC<Props> = ({ studentId, apiBaseUrl = '', tokenKey }) => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const token = tokenKey ? await AsyncStorage.getItem(tokenKey) : await AsyncStorage.getItem('teacher_token');
      const url = `${apiBaseUrl}/onlineTest/payments/student/${studentId}`;
      const res = await axios.get(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      setPayments(res.data || []);
    } catch (e: any) {
      console.warn('Failed to fetch payments', e?.message || e);
      setError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, apiBaseUrl, tokenKey]);

  // Build a map of monthName -> totalPaid
  const monthMap: Record<string, { paidAmount: number; entries: AppliedToEntry[] }> = {} as any;
  APRIL_TO_MARCH.forEach((m) => (monthMap[m] = { paidAmount: 0, entries: [] }));

  payments.forEach((p) => {
    if (!p.appliedTo) return;
    Object.values(p.appliedTo).forEach((entryAny) => {
      const entry = entryAny as AppliedToEntry;
      const monthRaw = (entry.month || '').toString().trim();
      if (!monthRaw) return;
      const normalized = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1).toLowerCase();
      if (!monthMap[normalized]) return; // ignore non-month items
      const amt = Number(entry.amount ?? entry.paidAmount ?? 0);
      monthMap[normalized].paidAmount += amt;
      monthMap[normalized].entries.push(entry);
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

      {error ? (
        <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
      ) : (
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
  legendRow: { flexDirection: 'row', gap: 12, marginTop: 12, alignItems: 'center' } as any,
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  legendSwatch: { width: 14, height: 14, borderRadius: 4, marginRight: 8 },
  legendLabel: { color: '#374151' },
  refreshBtn: { marginTop: 0, backgroundColor: '#4f46e5', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  refreshText: { color: '#fff', fontWeight: '700' },
  errorBox: { padding: 12, backgroundColor: '#fff5f5', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' },
  errorText: { color: '#b91c1c' },
});

export default PaymentCalendar;
