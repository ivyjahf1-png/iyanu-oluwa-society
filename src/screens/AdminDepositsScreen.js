import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { CheckCircle2, XCircle, RefreshCw, FileText } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { supabase } from '../lib/supabase';
import { reconcileWallets, fetchPendingPayments, approvePayment } from '../lib/ledger';

export default function AdminDepositsScreen({ navigation: rawNav }) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const navigation = useSafeNavigation(rawNav);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  const loadPending = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('deposits')
      .select('id, amount, method, status, reference_id, receipt_url, created_at, profiles(full_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (error) {
      Alert.alert('Load failed', error.message);
      setDeposits([]);
    } else {
      // Merge in member-submitted PENDING payments (contribution / savings
      // deposit / loan repayment / withdrawal) tagged with kind='payment'.
      const memberPayments = await fetchPendingPayments();
      const depositRows = (data || []).map(d => ({ ...d, kind: 'deposit' }));
      const paymentRows = memberPayments.map(p => ({
        id: p.id,
        kind: 'payment',
        amount: p.amount,
        method: p.tx_type,
        status: p.status,
        reference_id: p.reference,
        created_at: p.created_at,
        profiles: p.profiles,
      }));
      setDeposits([...depositRows, ...paymentRows]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const approve = deposit =>
    Alert.alert(
      'Approve payment',
      `Credit ₦${Number(deposit.amount).toLocaleString()} to ${deposit.profiles?.full_name || 'member'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setProcessing(deposit.id);
            try {
              if (deposit.kind === 'payment') {
                // Secure backend workflow: authorization, pending check,
                // ledger, loan update, receipt and audit happen atomically
                // server-side. The result carries authoritative figures.
                const result = await approvePayment(deposit.id);
                Alert.alert(
                  'Approved',
                  result?.receipt_number
                    ? `Processed. Receipt ${result.receipt_number}.`
                    : 'Processed. Receipt generation will retry automatically.',
                );
              } else {
                const { error } = await supabase.rpc('approve_deposit', {
                  p_deposit_id: deposit.id,
                });
                if (error) throw new Error(error.message);
                Alert.alert('Approved', 'Deposit credited to the member balance.');
              }
            } catch (e) {
              // Duplicate approvals land here as "already processed" — pending
              // list refresh shows the authoritative state either way.
              Alert.alert('Approve failed', e.message);
            } finally {
              setProcessing(null);
              loadPending();
            }
          },
        },
      ],
    );

  const reject = deposit =>
    Alert.alert('Reject payment', 'Mark this payment as failed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          setProcessing(deposit.id);
          if (deposit.kind === 'payment') {
            // Rejection of member-submitted payments is done by the admin via
            // a status change; the record stays for the audit trail.
            const { error } = await supabase
              .from('pending_payments')
              .update({ status: 'failed' })
              .eq('id', deposit.id)
              .eq('status', 'pending');
            setProcessing(null);
            if (error) {
              Alert.alert('Reject failed', error.message);
            } else {
              loadPending();
            }
            return;
          }
          const { error } = await supabase.rpc('reject_deposit', {
            p_deposit_id: deposit.id,
          });
          setProcessing(null);
          if (error) {
            Alert.alert('Reject failed', error.message);
          } else {
            loadPending();
          }
        },
      },
    ]);

  const openReceipt = url => {
    if (url) Linking.openURL(url);
  };

  // Phase 9/13: verify every wallet balance against the ledger replay and
  // repair any drift (audit-logged server-side).
  const reconcile = () =>
    Alert.alert('Reconcile wallets', 'Verify all wallet balances against the ledger and repair any drift?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Run',
        onPress: async () => {
          try {
            const repaired = await reconcileWallets();
            Alert.alert(
              'Reconciliation complete',
              repaired === 0
                ? 'All wallet balances match the ledger.'
                : `${repaired} wallet balance(s) were repaired. This action was recorded in the audit log.`,
            );
          } catch (e) {
            Alert.alert('Reconciliation failed', e.message);
          }
        },
      },
    ]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.memberName}>{item.profiles?.full_name || 'Member'}</Text>
        <Text style={styles.amount}>₦{Number(item.amount ?? 0).toLocaleString()}</Text>
      </View>

      <Text style={styles.meta}>
        {item.kind === 'payment'
          ? item.method.replace(/_/g, ' ')
          : item.method === 'manual'
          ? 'Manual bank transfer'
          : 'Flutterwave'}{' '}
        • {new Date(item.created_at).toLocaleString()}
      </Text>
      {item.reference_id ? <Text style={styles.meta}>Ref: {item.reference_id}</Text> : null}

      {item.receipt_url ? (
        <TouchableOpacity style={styles.receiptBtn} onPress={() => openReceipt(item.receipt_url)}>
          <FileText size={16} color={colors.success} />
          <Text style={styles.receiptBtnText}>View uploaded receipt</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.noReceipt}>No receipt attached</Text>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.approveBtn]}
          onPress={() => approve(item)}
          disabled={processing === item.id}
        >
          <CheckCircle2 size={16} color={colors.text} />
          <Text style={styles.approveText}>
            {processing === item.id ? 'Working…' : 'Approve'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn]}
          onPress={() => reject(item)}
          disabled={processing === item.id}
        >
          <XCircle size={16} color={colors.text} />
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor='#06130D' />
      <ScreenHeader
        title="Pending Deposits"
        subtitle="Manual transfers awaiting verification"
        onBack={() => navigation.goBack()}
      />

      {/* Phase 13: admin dashboard enhancement — ledger reconciliation */}
      <TouchableOpacity style={styles.reconcileBtn} onPress={reconcile}>
        <RefreshCw size={16} color="#A7F3D0" />
        <Text style={styles.reconcileText}>Reconcile wallets vs ledger</Text>
      </TouchableOpacity>

      <FlatList
        data={deposits}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadPending} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <RefreshCw size={34} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No pending deposits right now.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
const makeStyles = (colors, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F5' },
  reconcileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E3A30',
    backgroundColor: '#0A1C14',
  },
  reconcileText: { color: '#A7F3D0', fontSize: 13, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberName: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: 'bold',
  },
  amount: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: 'bold',
  },
  meta: {
    color: '#8EA89D',
    fontSize: 11,
    marginTop: 4,
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  receiptBtnText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  noReceipt: {
    color: '#4B6358',
    fontSize: 11,
    marginTop: 10,
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 11,
  },
  approveBtn: {
    backgroundColor: '#10B981',
  },
  approveText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 13,
  },
  rejectBtn: {
    backgroundColor: '#C0392B',
  },
  rejectText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 13,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#8EA89D',
    fontSize: 13,
    marginTop: 10,
  },
});

const styles = makeStyles(themes.darkEmerald, true);
