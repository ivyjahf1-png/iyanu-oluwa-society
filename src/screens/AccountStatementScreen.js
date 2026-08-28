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
import { fetchReceiptByReference, generateReceiptPdf } from '../lib/receipt';
import { isServerConfigured } from '../lib/ledger';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';

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
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const navigation = useSafeNavigation(rawNav);

  // Theme-aware overrides so every surface follows the active theme.
  const t = {
    container: [styles.container, { backgroundColor: colors.background }],
    actionBtn: [styles.actionBtn, { backgroundColor: colors.card }],
    shareBtn: [styles.shareBtn, { backgroundColor: colors.primaryDark }],
    generateBtn: [styles.generateBtn, { backgroundColor: colors.primary }],
    actionBtnText: [styles.actionBtnText, { color: isDark ? colors.text : '#FFFFFF' }],
    summaryCard: [styles.summaryCard, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }],
    summaryLabel: [styles.summaryLabel, { color: colors.primary }],
    summaryValue: [styles.summaryValue, { color: colors.text }],
    summaryMeta: [styles.summaryMeta, { color: colors.textSecondary }],
    debitText: [styles.debitText, { color: colors.danger }],
    ledgerTitle: [styles.ledgerTitle, { color: colors.text }],
    ledgerRow: [styles.ledgerRow, { backgroundColor: colors.card, borderColor: colors.border }],
    creditIcon: [styles.creditIcon, { backgroundColor: colors.surface }],
    debitIcon: [styles.debitIcon, { backgroundColor: colors.surface }],
    ledgerLabel: [styles.ledgerLabel, { color: colors.text }],
    ledgerDate: [styles.ledgerDate, { color: colors.textSecondary }],
    creditAmount: [styles.creditAmount, { color: colors.success }],
    debitAmount: [styles.debitAmount, { color: colors.danger }],
    runningBalance: [styles.runningBalance, { color: colors.textSecondary }],
    receiptRowBtn: [styles.receiptRowBtn, { backgroundColor: colors.surface }],
    pdfReadyCard: [styles.pdfReadyCard, { backgroundColor: colors.card, borderColor: colors.primary }],
    pdfReadyText: [styles.pdfReadyText, { color: colors.text }],
  };
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
          .brand { color: #06130D; font-size: 22px; font-weight: bold; }
          .tag { color: #4CAF50; font-size: 12px; margin-bottom: 4px; }
          .meta { font-size: 11px; color: #555; margin-top: 14px; line-height: 1.6; }
          .divider { border-top: 2px solid #4CAF50; margin: 18px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #06130D; color: #fff; font-size: 11px; text-align: left; padding: 8px; }
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
        <div class="tag">STANDARD MUTUAL SAVINGS</div>
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
          This is a computer-generated statement of the Standard Mutual Cooperative Society and is
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

  // Phase 7/8: generate + share an official thermal receipt for a ledger row
  // that has an approved backend payment reference (authoritative records).
  const viewReceipt = async entry => {
    if (!isServerConfigured() || !entry?.reference) {
      Alert.alert('Receipt unavailable', 'This transaction has no approved receipt yet.');
      return;
    }
    try {
      const receipt = await fetchReceiptByReference(entry.reference);
      if (!receipt) {
        Alert.alert('Receipt unavailable', 'No official receipt was generated for this transaction yet.');
        return;
      }
      await generateReceiptPdf(receipt, { share: true });
    } catch (e) {
      Alert.alert('Receipt failed', e.message);
    }
  };

  return (
    <SafeAreaView style={t.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScreenHeader
        title="Account Statement"
        subtitle="Transaction ledger & downloadable report"
        onBack={() => navigation.goBack()}
      />

      {/* Print & Share actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={t.actionBtn} onPress={printStatement}>
          <Printer size={17} color={colors.text} />
          <Text style={t.actionBtnText}>Print</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[t.actionBtn, t.shareBtn]} onPress={sharePdf}>
          <Share2 size={17} color={t.actionBtnText[1].color} />
          <Text style={t.actionBtnText}>Share PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[t.actionBtn, t.generateBtn]}
          onPress={generatePdf}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator size="small" color={t.actionBtnText[1].color} />
          ) : (
            <FileText size={17} color={t.actionBtnText[1].color} />
          )}
          <Text style={t.actionBtnText}>{generating ? '…' : 'Generate'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, styles.grow]} showsVerticalScrollIndicator={true}>
        {/* Summary card */}
        <View style={t.summaryCard}>
          <Text style={t.summaryLabel}>Closing Balance</Text>
          <Text style={t.summaryValue}>₦{fmt(totals.closing)}</Text>
          <View style={styles.summaryMetaRow}>
            <Text style={t.summaryMeta}>Credits: ₦{fmt(totals.credits)}</Text>
            <Text style={[t.summaryMeta, t.debitText]}>Debits: ₦{fmt(totals.debits)}</Text>
          </View>
        </View>

        {/* Ledger */}
        <Text style={t.ledgerTitle}>Transaction Ledger</Text>
        {ledger.map(entry => (
          <View key={entry.id} style={t.ledgerRow}>
            <View style={[styles.ledgerIcon, entry.type === 'credit' ? t.creditIcon : t.debitIcon]}>
              {entry.type === 'credit' ? (
                <ArrowDownLeft size={16} color={colors.success} />
              ) : (
                <ArrowUpRight size={16} color={colors.danger} />
              )}
            </View>
            <View style={styles.ledgerInfo}>
              <Text style={t.ledgerLabel}>{entry.label}</Text>
              <Text style={t.ledgerDate}>
                {new Date(entry.date).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <View style={styles.ledgerAmounts}>
              <Text style={entry.type === 'credit' ? t.creditAmount : t.debitAmount}>
                {entry.type === 'credit' ? '+' : '-'}₦{fmt(entry.amount)}
              </Text>
              <Text style={t.runningBalance}>Bal ₦{fmt(entry.running)}</Text>
            </View>
            {entry.reference && isServerConfigured() ? (
              <TouchableOpacity
                style={t.receiptRowBtn}
                onPress={() => viewReceipt(entry)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <FileText size={14} color={colors.primary} />
              </TouchableOpacity>
            ) : null}
          </View>
        ))}

        {pdfUri ? (
          <View style={t.pdfReadyCard}>
            <FileText size={16} color={colors.primary} />
            <Text style={t.pdfReadyText}>PDF statement generated and ready to share.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors, isDark) => StyleSheet.create({
  scrollView: { flex: 1 },
  grow: { flexGrow: 1 },
  container: { flex: 1, backgroundColor: '#F4F7F5' },
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
    backgroundColor: '#06130D',
    borderRadius: 12,
    paddingVertical: 11,
  },
  shareBtn: { backgroundColor: '#127A41' },
  generateBtn: { backgroundColor: '#10B981' },
  actionBtnText: { color: '#0F172A', fontSize: 12, fontWeight: 'bold' },
  content: { padding: 16, paddingBottom: 32 },
  summaryCard: {
    backgroundColor: '#06130D',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
  },
  summaryLabel: { color: '#047857', fontSize: 12 },
  summaryValue: {
    color: '#0F172A',
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
    color: '#0F172A',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
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
  creditIcon: { backgroundColor: '#FFFFFF' },
  debitIcon: { backgroundColor: '#FDE8E8' },
  ledgerInfo: { flex: 1 },
  ledgerLabel: {
    color: '#0F172A',
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
  receiptRowBtn: {
    marginLeft: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfReadyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    padding: 12,
    marginTop: 8,
  },
  pdfReadyText: { color: '#0F172A', fontSize: 12 },
});

const styles = makeStyles(themes.darkEmerald, true);
