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
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { CheckCircle2, XCircle, RefreshCw, FileText } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { supabase } from '../lib/supabase';

export default function AdminDepositsScreen({ navigation: rawNav }) {
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
    } else {
      setDeposits(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const approve = deposit =>
    Alert.alert(
      'Approve deposit',
      `Credit ₦${Number(deposit.amount).toLocaleString()} to ${deposit.profiles?.full_name || 'member'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setProcessing(deposit.id);
            const { error } = await supabase.rpc('approve_deposit', {
              p_deposit_id: deposit.id,
            });
            setProcessing(null);
            if (error) {
              Alert.alert('Approve failed', error.message);
            } else {
              Alert.alert('Approved', 'Deposit credited to the member balance.');
              loadPending();
            }
          },
        },
      ],
    );

  const reject = deposit =>
    Alert.alert('Reject deposit', 'Mark this deposit as failed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          setProcessing(deposit.id);
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

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.memberName}>{item.profiles?.full_name || 'Member'}</Text>
        <Text style={styles.amount}>₦{Number(item.amount ?? 0).toLocaleString()}</Text>
      </View>

      <Text style={styles.meta}>
        {item.method === 'manual' ? 'Manual bank transfer' : 'Flutterwave'} •{' '}
        {new Date(item.created_at).toLocaleString()}
      </Text>
      {item.reference_id ? <Text style={styles.meta}>Ref: {item.reference_id}</Text> : null}

      {item.receipt_url ? (
        <TouchableOpacity style={styles.receiptBtn} onPress={() => openReceipt(item.receipt_url)}>
          <FileText size={16} color="#10B981" />
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
          <CheckCircle2 size={16} color="#FFFFFF" />
          <Text style={styles.approveText}>
            {processing === item.id ? 'Working…' : 'Approve'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn]}
          onPress={() => reject(item)}
          disabled={processing === item.id}
        >
          <XCircle size={16} color="#FFFFFF" />
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2D1E1B" />
      <ScreenHeader
        title="Pending Deposits"
        subtitle="Manual transfers awaiting verification"
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={deposits}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadPending} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <RefreshCw size={34} color="#9CB8A6" />
            <Text style={styles.emptyText}>No pending deposits right now.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#091813' },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#0D1D18',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#172F27',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberName: {
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  rejectBtn: {
    backgroundColor: '#C0392B',
  },
  rejectText: {
    color: '#FFFFFF',
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