import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import ScreenHeader from '../components/ScreenHeader';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  History,
  RefreshCw,
} from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { fetchAuditLog, fetchLedger, fetchPendingPayments } from '../lib/ledger';

const fmt = n =>
  '₦' + Number(n || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * AuditScreen — financial audit & monitoring page.
 *
 * Route params:  { auditorId?: string }
 *
 * Shows the server-side audit trail (audit_log), a verification list of member
 * contributions (from ledger + pending payments), and lets the auditor export a
 * printable HTML/PDF report of the monitored activity. Read-only by design —
 * no balances or roles are mutated here.
 */
export default function AuditScreen({ navigation: rawNav, route }) {
  const navigation = useSafeNavigation(rawNav);
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);

  const auditorId = route?.params?.auditorId || null;

  const [auditLog, setAuditLog] = useState([]);
  const [ledgerRows, setLedgerRows] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [audit, ledger, pend] = await Promise.all([
        fetchAuditLog(100),
        fetchLedger(200),
        fetchPendingPayments(),
      ]);
      setAuditLog(audit || []);
      setLedgerRows(ledger || []);
      setPending(pend || []);
    } catch (e) {
      // Best-effort — the screen still renders from whatever loaded.
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate for the monitoring summary cards.
  const totalEntries = ledgerRows.length + pending.length;
  const credits = ledgerRows.filter(l => l.type === 'credit' || l.direction === 'credit')
    .reduce((s, l) => s + Number(l.amount || 0), 0);
  const debits = ledgerRows.filter(l => l.type === 'debit' || l.direction === 'debit')
    .reduce((s, l) => s + Number(l.amount || 0), 0);
  const pendingCount = pending.length;

  // Contribution verification tags (member contributions/deposits from ledger).
  const contributions = ledgerRows
    .filter(l => ['contribution', 'deposit'].includes(l.entry_type || l.type))
    .slice(0, 20);

  const reportHtml = `
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
          .footer { margin-top: 30px; font-size: 9px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <div class="tag">STANDARD MUTUAL SAVINGS — FINANCIAL AUDIT</div>
        <div class="brand">Audit Report</div>
        <div class="meta">
          Auditor ID: ${auditorId || 'current session'}<br/>
          Generated: ${new Date().toLocaleString()}<br/>
          Ledger entries: ${ledgerRows.length} · Pending verifications: ${pendingCount}
        </div>
        <div class="divider"></div>
        <table>
          <tr><th>Date</th><th>Type</th><th>Reference</th><th>Amount (₦)</th></tr>
          ${ledgerRows
            .slice(0, 50)
            .map(l => `
              <tr>
                <td>${new Date(l.created_at || l.date).toLocaleString()}</td>
                <td>${l.entry_type || l.type || 'text'}</td>
                <td>${l.reference || '—'}</td>
                <td class="${l.direction === 'debit' || l.type === 'debit' ? 'debit' : 'credit'}">${fmt(l.amount)}</td>
              </tr>`)
            .join('')}
        </table>
        <div class="footer">
          This is a computer-generated financial audit report of the Standard Mutual
          Cooperative Society and is valid without signature.
        </div>
      </body>
    </html>
  `;

  const generateReport = async () => {
    setGenerating(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: reportHtml });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Export Audit Report',
        });
      } else {
        Alert.alert('Report ready', 'PDF generated.');
      }
    } catch (e) {
      Alert.alert('Export failed', e.message);
    }
    setGenerating(false);
  };
return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScreenHeader
        title="Financial Audit"
        subtitle="Ledger monitoring & verification"
        onBack={() => navigation.goBack()}
      />

      {/* Report export */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: colors.primary }]}
          onPress={generateReport}
          disabled={generating || loading}
        >
          {generating ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <FileText size={16} color={colors.background} />
          )}
          <Text style={[styles.exportBtnText, { color: colors.background }]}>
            {generating ? 'Exporting…' : 'Export Report'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.refreshBtn, { borderColor: colors.border }]} onPress={loadData}>
          <RefreshCw size={16} color={colors.text} />
          <Text style={[styles.refreshText, { color: colors.text }]}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Summary metrics */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <History size={18} color={colors.primary} />
            <Text style={[styles.metricValue, { color: colors.text }]}>{totalEntries}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Ledger Entries</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <CheckCircle2 size={18} color={colors.success} />
            <Text style={[styles.metricValue, { color: colors.text }]}>{contributions.length}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Contributions</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ShieldCheck size={18} color={colors.warning} />
            <Text style={[styles.metricValue, { color: colors.text }]}>{pendingCount}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Pending Verify</Text>
          </View>
        </View>

        {/* Contribution verification tags */}
        {contributions.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Member Contribution Verification</Text>
            {contributions.map((c, i) => (
              <View key={i} style={[styles.verifyRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.verifyIcon, { backgroundColor: colors.surface }]}>
                  <CheckCircle2 size={16} color={colors.success} />
                </View>
                <View style={styles.verifyTextGroup}>
                  <Text style={[styles.verifyTitle, { color: colors.text }]}>{c.description || c.entry_type || c.type}</Text>
                  <Text style={[styles.verifySub, { color: colors.textSecondary }]}>{c.reference || 'verified'}</Text>
                </View>
                <Text style={[styles.verifyAmount, { color: colors.success }]}>{fmt(c.amount)}</Text>
              </View>
            ))}
          </>
        ) : null}
{/* Transaction history verification */}
        {ledgerRows.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Transaction History Verification</Text>
            {ledgerRows.slice(0, 15).map((l, i) => (
              <View key={i} style={[styles.historyRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.historyTextGroup}>
                  <Text style={[styles.historyTitle, { color: colors.text }]}>
                    {l.description || l.entry_type || l.type}
                  </Text>
                  <Text style={[styles.historySub, { color: colors.textSecondary }]}>
                    {new Date(l.created_at || l.date).toLocaleString()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.historyAmount,
                    { color: l.type === 'debit' || l.direction === 'debit' ? colors.danger : colors.success },
                  ]}
                >
                  {l.type === 'debit' || l.direction === 'debit' ? '-' : '+'}{fmt(l.amount)}
                </Text>
              </View>
            ))}
          </>
        ) : null}

        {/* Financial audit log */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Financial Audit Log</Text>
        {auditLog.length === 0 && !loading ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No audit log available from the server yet.
            </Text>
          </View>
        ) : (
          auditLog.slice(0, 20).map((a, i) => (
            <View key={i} style={[styles.historyRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.auditIcon, { backgroundColor: colors.surface }]}>
                <History size={16} color={colors.primary} />
              </View>
              <View style={styles.historyTextGroup}>
                <Text style={[styles.historyTitle, { color: colors.text }]}>{a.action || 'action'}</Text>
                <Text style={[styles.historySub, { color: colors.textSecondary }]}>
                  {a.entity || ''} {a.entity_id ? `#${a.entity_id}` : ''} · {new Date(a.created_at).toLocaleString()}
                </Text>
              </View>
            </View>
          ))
        )}

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : null}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 40 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  exportBtnText: { fontSize: 13, fontWeight: '700' },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  refreshText: { fontSize: 13, fontWeight: '600' },
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  metricValue: { fontSize: 22, fontWeight: '700', marginTop: 8 },
  metricLabel: { fontSize: 10, marginTop: 2, textAlign: 'center' },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 6,
  },
  verifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  verifyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyTextGroup: { flex: 1 },
  verifyTitle: { fontSize: 13, fontWeight: '600' },
  verifySub: { fontSize: 11, marginTop: 2 },
  verifyAmount: { fontSize: 13, fontWeight: '700' },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  historyTextGroup: { flex: 1 },
  historyTitle: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  historySub: { fontSize: 11, marginTop: 2 },
  historyAmount: { fontSize: 13, fontWeight: '700' },
  auditIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  emptyText: { fontSize: 12, textAlign: 'center' },
});

const styles = makeStyles(themes.darkEmerald, true);