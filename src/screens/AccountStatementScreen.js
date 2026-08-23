import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  Share2,
  FileText,
} from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import ScreenHeader from '../components/ScreenHeader';
import { useTransactions } from '../context/TransactionsContext';

// ---------------------------------------------------------------------------
// Transaction ledger engine — built ENTIRELY from the real audit-trail
// transactions (contributions, deposits, withdrawals, loan disbursements &
// repayments). New members start with an empty ledger (₦0.00 everywhere).
// ---------------------------------------------------------------------------
function buildLedger(transactions) {
  let running = 0;
  const isCredit = t => ['contribution', 'deposit', 'loan_repayment'].includes(t.type);
  return transactions
    .slice()
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .map(e => {
      running += isCredit(e) ? e.amount : -e.amount;
      return { ...e, running, type: isCredit(e) ? 'credit' : 'debit' };
    });
}

const fmt = n =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AccountStatementScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const { transactions } = useTransactions();

  const ledger = useMemo(() => buildLedger(transactions), [transactions]);

  const totals = useMemo(() => {
    const credits = ledger.filter(l => l.type === 'credit').reduce((s, l) => s + l.amount, 0);
    const debits = ledger.filter(l => l.type === 'debit').reduce((s, l) => s + l.amount, 0);
    return { credits, debits, closing: credits - debits };
  }, [ledger]);

  const [generating, setGenerating] = useState(false);
  const [pdfUri, setPdfUri] = useState(null);

  // Professional paper-style HTML statement template (Blob/PDF engine source).
  const statementHtml = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 32px; }
          .brand { color: #091813; font-size: 22px; font-weight: bold; }
          .tag { color: #4CAF50; font-size: 12px; margin-bottom: 4px; }
          .meta { font-size: 11px; color: #555; margin-top: 14px; line-height: 1.6; }
          .divider { border-top: 2px solid #4CAF50; margin: 18px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #091813; color: #fff; font-size: 11px; text-align: left; padding: 8px; }
          td { font-size: 11px; padding: 8px; border-bottom: 1px solid #ddd; }
          .credit { color: #127A41; font-weight: bold; }
          .debit { color: #C0392B; font-weight: bold; }
          .summary { margin-top: 20px; width: 100%; }
          .summary td { border: none; font-size: 12px; padding: 5px 8px; }
          .summary .k { color: #555; }
          .summary .v { font-weight: bold; text-align: right; }
          .footer { margin-top: 30px; font-size: 9px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <div class="tag">IYANU OLUWA SOCIETY</div>
        <div class="brand">Account Statement</div>
        <div class="meta">
          Member: Temitope Adewale<br/>
          Period: 01 Jul 2026 — 31 Aug 2026<br/>
          Generated: ${new Date().toLocaleString()}<br/>
        </div>
        <div class="divider"></div>
        <table>
          <tr><th>Date</th><th>Description</th><th>Type</th><th>Amount (₦)</th><th>Balance (₦)</th></tr>
          ${ledger
            .map(
              l => `
            <tr>
              <td>${new Date(l.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
              <td>${l.label}</td>
              <td class="${l.type}">${l.type === 'credit' ? 'CREDIT' : 'DEBIT'}</td>
              <td class="${l.type}">${l.type === 'credit' ? '+' : '-'}${fmt(l.amount)}</td>
              <td>${fmt(l.running)}</td>
            </tr>`,
            )
            .join('')}
        </table>
        <table class="summary">
          <tr><td class="k">Total Credits</td><td class="v">₦${fmt(totals.credits)}</td></tr>
          <tr><td class="k">Total Debits</td><td class="v">₦${fmt(totals.debits)}</td></tr>
          <tr><td class="k"><b>Closing Balance</b></td><td class="v">₦${fmt(totals.closing)}</td></tr>
        </table>
        <div class="footer">
          This is a computer-generated statement of the Iyanu Oluwa Cooperative Society and is
          valid without signature.
        </div>
      </body>
    </html>
  `;

  const generatePdf = async () => {
    setGenerating(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: statementHtml });
      setPdfUri(uri);
      Alert.alert('Statement ready', 'Your PDF statement has been generated.');
    } catch (e) {
      Alert.alert('Generation failed', e.message);
    }
    setGenerating(false);
  };

  const sharePdf = async () => {
    try {
      let uri = pdfUri;
      if (!uri) {
        setGenerating(true);
        const { uri: generated } = await Print.printToFileAsync({ html: statementHtml });
        uri = generated;
        setPdfUri(generated);
        setGenerating(false);
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Statement',
        });
      } else {
        Alert.alert('Sharing unavailable', 'Sharing is not supported on this device.');
      }
    } catch (e) {
      setGenerating(false);
      Alert.alert('Share failed', e.message);
    }
  };

  const printStatement = async () => {
    try {
      await Print.printAsync({ html: statementHtml });
    } catch (e) {
      Alert.alert('Print failed', e.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor='#091813' />
      <ScreenHeader
        title="Account Statement"
        subtitle="Transaction ledger & downloadable report"
        onBack={() => navigation.goBack()}
      />

      {/* Print & Share actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={printStatement}>
          <Printer size={17} color="#FFFFFF" />
          <Text style={styles.actionBtnText}>Print</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.shareBtn]} onPress={sharePdf}>
          <Share2 size={17} color="#FFFFFF" />
          <Text style={styles.actionBtnText}>Share PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.generateBtn]}
          onPress={generatePdf}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <FileText size={17} color="#FFFFFF" />
          )}
          <Text style={styles.actionBtnText}>{generating ? '…' : 'Generate'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, styles.grow]} showsVerticalScrollIndicator={true}>
        {/* Summary card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Closing Balance</Text>
          <Text style={styles.summaryValue}>₦{fmt(totals.closing)}</Text>
          <View style={styles.summaryMetaRow}>
            <Text style={styles.summaryMeta}>Credits: ₦{fmt(totals.credits)}</Text>
            <Text style={[styles.summaryMeta, styles.debitText]}>Debits: ₦{fmt(totals.debits)}</Text>
          </View>
        </View>

        {/* Ledger */}
        <Text style={styles.ledgerTitle}>Transaction Ledger</Text>
        {ledger.map(entry => (
          <View key={entry.id} style={styles.ledgerRow}>
            <View style={[styles.ledgerIcon, entry.type === 'credit' ? styles.creditIcon : styles.debitIcon]}>
              {entry.type === 'credit' ? (
                <ArrowDownLeft size={16} color="#10B981" />
              ) : (
                <ArrowUpRight size={16} color="#C0392B" />
              )}
            </View>
            <View style={styles.ledgerInfo}>
              <Text style={styles.ledgerLabel}>{entry.label}</Text>
              <Text style={styles.ledgerDate}>
                {new Date(entry.date).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <View style={styles.ledgerAmounts}>
              <Text style={entry.type === 'credit' ? styles.creditAmount : styles.debitAmount}>
                {entry.type === 'credit' ? '+' : '-'}₦{fmt(entry.amount)}
              </Text>
              <Text style={styles.runningBalance}>Bal ₦{fmt(entry.running)}</Text>
            </View>
          </View>
        ))}

        {pdfUri ? (
          <View style={styles.pdfReadyCard}>
            <FileText size={16} color="#10B981" />
            <Text style={styles.pdfReadyText}>PDF statement generated and ready to share.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  grow: { flexGrow: 1 },
  container: { flex: 1, backgroundColor: '#091813' },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#091813',
    borderRadius: 12,
    paddingVertical: 11,
  },
  shareBtn: { backgroundColor: '#127A41' },
  generateBtn: { backgroundColor: '#10B981' },
  actionBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  content: { padding: 16, paddingBottom: 32 },
  summaryCard: {
    backgroundColor: '#091813',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
  },
  summaryLabel: { color: '#A7F3D0', fontSize: 12 },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 4,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  summaryMeta: { color: '#D3F99D', fontSize: 11 },
  debitText: { color: '#FFB4A9' },
  ledgerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1D18',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#172F27',
    marginBottom: 8,
  },
  ledgerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  creditIcon: { backgroundColor: '#0D1D18' },
  debitIcon: { backgroundColor: '#FDE8E8' },
  ledgerInfo: { flex: 1 },
  ledgerLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  ledgerDate: {
    color: '#8EA89D',
    fontSize: 10,
    marginTop: 2,
  },
  ledgerAmounts: { alignItems: 'flex-end' },
  creditAmount: { color: '#10B981', fontSize: 12, fontWeight: 'bold' },
  debitAmount: { color: '#C0392B', fontSize: 12, fontWeight: 'bold' },
  runningBalance: { color: '#8EA89D', fontSize: 9, marginTop: 2 },
  pdfReadyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0D1D18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    padding: 12,
    marginTop: 8,
  },
  pdfReadyText: { color: '#FFFFFF', fontSize: 12 },
});