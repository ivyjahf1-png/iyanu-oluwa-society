import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import {
  Share2,
  Download,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import ScreenHeader from '../components/ScreenHeader';
import { useTransactions } from '../context/TransactionsContext';
import { useTheme } from '../theme/ThemeContext';

const STATUS_INFO = {
  approved: { label: 'Approved', icon: CheckCircle },
  pending: { label: 'Pending', icon: Clock },
  rejected: { label: 'Rejected', icon: XCircle },
};

const makeStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 32 },
    emptyText: { fontSize: 14, marginTop: 12 },
    detailCard: { borderRadius: 16, padding: 18, borderWidth: 1, marginBottom: 20 },
    detailHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    detailTitle: { fontSize: 18, fontWeight: '700' },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    statusText: { fontSize: 11, fontWeight: '700' },
    amountBox: {
      borderRadius: 14,
      padding: 16,
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 1,
    },
    amountLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
    amountValue: { fontSize: 26, fontWeight: '700' },
    detailRow: { marginBottom: 14 },
    detailLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
    detailValue: { fontSize: 14 },
    actionsContainer: { flexDirection: 'row', gap: 12 },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      borderRadius: 12,
      paddingVertical: 12,
    },
    actionBtnText: { fontSize: 13, fontWeight: '700' },
    actionBtnOutline: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      borderRadius: 12,
      borderWidth: 1,
      paddingVertical: 12,
    },
    actionBtnTextOutline: { fontSize: 13, fontWeight: '700' },
    });

export default function TransactionDetailScreen({ navigation: rawNav, route }) {
  const navigation = useSafeNavigation(rawNav);
  const { transactions } = useTransactions();
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);

  const transactionId = route?.params?.transactionId;
  const passedData = route?.params?.transactionData;
  const [transaction, setTransaction] = useState(passedData || null);
  const [loading, setLoading] = useState(!passedData);

  useEffect(() => {
    if (passedData) {
      setTransaction(passedData);
      setLoading(false);
      return;
    }
    if (transactionId) {
      setLoading(true);
      const found = transactions.find((t) => t.id === transactionId);
      setTransaction(found || null);
      setLoading(false);
    }
  }, [transactionId, passedData, transactions]);

  const handleShare = async () => {
    if (!transaction) return;
    const content = 'Transaction Report\n' +
      '================\n' +
      'ID: ' + transaction.id + '\n' +
      'Type: ' + transaction.type + '\n' +
      'Amount: ' + (Number(transaction.amount) || 0).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' }) + '\n' +
      'Date: ' + new Date(transaction.date).toLocaleString() + '\n' +
      'Status: ' + (transaction.status || 'pending');
    try {
      await Sharing.shareAsync(
        'data:application/octet-stream;base64,' + btoa(content),
        { dialogTitle: 'Share Transaction ' + transaction.id }
      );
    } catch (e) {
      Alert.alert('Share failed', 'Could not share this transaction.');
    }
  };

  const handleDownloadPDF = async () => {
    if (!transaction) return;
    try {
      const fileUri = FileSystem.documentDirectory + 'transaction_' + transaction.id + '.txt';
      const content = 'Transaction Report\n' +
        '================\n' +
        'ID: ' + transaction.id + '\n' +
        'Type: ' + transaction.type + '\n' +
        'Amount: ' + (Number(transaction.amount) || 0).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' }) + '\n' +
        'Date: ' + new Date(transaction.date).toLocaleString() + '\n' +
        'Status: ' + (transaction.status || 'pending');
      await FileSystem.writeAsStringAsync(fileUri, content);
      await Sharing.shareAsync(fileUri);
    } catch (e) {
      Alert.alert('Download failed', 'Could not download transaction.');
    }
  };

  const statusInfo = transaction ? STATUS_INFO[transaction.status] || STATUS_INFO.pending : STATUS_INFO.pending;
  const StatusIcon = statusInfo.icon;

    if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <FileText size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Transaction not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScreenHeader
        title="Transaction Detail"
        subtitle={'#' + transaction.id}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.detailHeader}>
            <Text style={[styles.detailTitle, { color: colors.text }]}>{transaction.type || 'Transaction'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: colors.primary + '15' }]}>
              <StatusIcon size={14} color={colors.primary} />
              <Text style={[styles.statusText, { color: colors.primary }]}>{statusInfo.label}</Text>
            </View>
          </View>

          <View style={[styles.amountBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Amount</Text>
            <Text style={[styles.amountValue, { color: colors.primary }]}>
              ₦{(Number(transaction.amount) || 0).toLocaleString('en-NG')}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Transaction ID</Text>
            <Text selectable style={[styles.detailValue, { color: colors.text }]}>{transaction.id}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Date / Time</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{new Date(transaction.date).toLocaleString()}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Reference</Text>
            <Text selectable style={[styles.detailValue, { color: colors.text }]}>{transaction.paymentMethod || transaction.reference || transaction.type + ' #' + transaction.id}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Payment Method</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{transaction.paymentMethod || 'Wallet / Bank'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{statusInfo.label}</Text>
          </View>

          {transaction.description ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Description</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{transaction.description}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={handleDownloadPDF}>
            <Download size={18} color={colors.background} />
            <Text style={[styles.actionBtnText, { color: colors.background }]}>Download PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtnOutline, { borderColor: colors.primary }]} onPress={handleShare}>
            <Share2 size={18} color={colors.primary} />
            <Text style={[styles.actionBtnTextOutline, { color: colors.primary }]}>Share</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}