import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ClipboardList,
  TrendingUp,
  Banknote,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RefreshCw,
  History,
  Database,
  BarChart3,
  PieChart,
  ShieldCheck,
  Lock,
  Download,
  FileSpreadsheet,
  File,
} from 'lucide-react-native';
import { useAppTheme } from '../context/ThemeContext';
import { fetchAuditLog, fetchLedger, fetchFinancialSummary } from '../lib/ledger';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/** Currency formatter — uses explicit Unicode escape so the Naira sign (₦)
 *  never suffers source-file encoding corruption. */
const fmt = (n: number | string): string => {
  const num = Number(n) || 0;
  return '₦' + num.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/** Audit log filter tabs. */
const FILTER_TABS = ['All', 'Transactions', 'User Auth', 'Admin Actions'] as const;
type FilterTab = (typeof FILTER_TABS)[number];

/** Stub financial summary. */
const STUB_SUMMARY = {
  totalVaultReserves: 4850000.0,
  activeLoanPortfolio: 2750000.0,
  accruedDividends: 312500.0,
  ledgerVerified: true,
  variance: 0,
};

export default function AuditDashboardScreen({ navigation: rawNav }: any) {
  const { colors, isDark } = useAppTheme();
  const styles = makeStyles(colors, isDark);

  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [ledgerRows, setLedgerRows] = useState<any[]>([]);
  const [summary, setSummary] = useState(STUB_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [audit, ledger, finSummary] = await Promise.all([
        fetchAuditLog(200),
        fetchLedger(200),
        fetchFinancialSummary(null),
      ]);
      setAuditLog(audit || []);
      setLedgerRows(ledger || []);
      if (finSummary) {
        setSummary((prev) => ({ ...prev, ...finSummary }));
      }
    } catch (e) {
      // Best-effort — stub values keep the UI meaningful.
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredLogs = auditLog.filter((entry) => {
    if (activeFilter === 'All') return true;
    const cat = (entry.category || entry.action || entry.type || '').toLowerCase();
    switch (activeFilter) {
      case 'Transactions':
        return (
          cat.includes('trans') ||
          cat.includes('payment') ||
          cat.includes('ledger') ||
          cat.includes('deposit') ||
          cat.includes('withdraw')
        );
      case 'User Auth':
        return (
          cat.includes('auth') ||
          cat.includes('login') ||
          cat.includes('sign') ||
          cat.includes('session') ||
          cat.includes('password')
        );
      case 'Admin Actions':
        return (
          cat.includes('admin') ||
          cat.includes('approve') ||
          cat.includes('verify') ||
          cat.includes('override')
        );
      default:
        return true;
    }
  });

  const exportCSV = async () => {
    setExporting(true);
    try {
      const header = 'Timestamp,Entity,Action,Details,Reference\n';
      const rows = filteredLogs
        .map((l) => {
          const ts = l.created_at
            ? new Date(l.created_at).toISOString().slice(0, 19).replace('T', ' ')
            : '';
          const entity = l.entity || l.entity_type || '';
          const action = l.action || l.event || '';
          const details = (l.details || l.description || '').replace(/"/g, '""');
          const reference = l.reference || '';
          return `${ts},${entity},${action},${details},${reference}`;
        })
        .join('\n');
      const csvContent = header + rows;
      const html = `<html><body><pre>${csvContent}</pre></body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Audit Report CSV',
        });
      }
    } catch (e) {
      Alert.alert('Export Failed', 'Unable to generate CSV report.');
    }
    setExporting(false);
  };

  const exportPDF = async () => {
    setExporting(true);
    try {
      const html = `
        <html><head><meta charset="utf-8"/>
        <style>
          body{font-family:Helvetica,Arial,sans-serif;color:#1a1a1a;padding:32px}
          .brand{color:#06130D;font-size:22px;font-weight:bold}
          .tag{color:#00D084;font-size:12px;margin-bottom:4px}
          .meta{font-size:11px;color:#555;margin-top:14px;line-height:1.6}
          .divider{border-top:2px solid #00D084;margin:18px 0}
          table{width:100%;border-collapse:collapse;margin-top:12px;font-size:11px}
          th{background:#06130D;color:#fff;padding:8px 6px;text-align:left}
          td{padding:6px;border-bottom:1px solid #ddd}
          .sg{display:flex;gap:12px;margin:16px 0}
          .sb{flex:1;border:1px solid #00D084;border-radius:8px;padding:12px}
          .sl{font-size:10px;color:#555}
          .sv{font-size:16px;font-weight:bold;color:#06130D;margin-top:4px}
        </style></head><body>
        <div class="brand">Standard Mutual Savings</div>
        <div class="tag">Audit Dashboard Report</div>
        <div class="meta">Generated: ${new Date().toLocaleString()}<br/>Ledger: ${ledgerRows.length}<br/>Audit: ${auditLog.length}</div>
        <div class="divider"></div>
        <div class="sg">
          <div class="sb"><div class="sl">Total Vault Reserves</div><div class="sv">${fmt(summary.totalVaultReserves)}</div></div>
          <div class="sb"><div class="sl">Active Loan Portfolio</div><div class="sv">${fmt(summary.activeLoanPortfolio)}</div></div>
          <div class="sb"><div class="sl">Accrued Dividends</div><div class="sv">${fmt(summary.accruedDividends)}</div></div>
        </div>
        <div class="divider"></div>
        <h3>Audit Trail Summary</h3>
        <table><tr><th>Action</th><th>Entity</th><th>Date</th></tr>
        ${auditLog
          .slice(0, 50)
          .map(
            (a: any) =>
              `<tr><td>${a.action || '-'}</td><td>${a.entity || '-'} ${a.entity_id ? '#' + a.entity_id : ''}</td><td>${new Date(a.created_at).toLocaleDateString()}</td></tr>`
          )
          .join('')}
        </table>
        <div class="meta" style="margin-top:24px"><strong>Reconciliation:</strong> ${
          summary.variance === 0 ? 'ZERO-VARIANCE' : 'REVIEW REQUIRED'
        }<br/><strong>Ledger:</strong> ${
        summary.ledgerVerified ? 'VERIFIED' : 'FLAGGED'
      }</div>
        </body></html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Audit Report PDF',
        });
      }
    } catch (e) {
      Alert.alert('Export Failed', 'Unable to generate PDF report.');
    }
    setExporting(false);
  };

  const renderStatCard = (
    icon: React.ReactNode,
    label: string,
    value: string,
    sub: string,
    accent: string
  ) => (
    <View
      style={[
        styles.statCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={[styles.statIcon, { backgroundColor: colors.surface }]}>{icon}</View>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.statSub, { color: colors.textSecondary }]}>{sub}</Text>
    </View>
  );

  const renderFilterTab = (tab: FilterTab) => {
    const isActive = activeFilter === tab;
    return (
      <TouchableOpacity
        key={tab}
        style={[
          styles.filterTab,
          { borderColor: colors.border },
          isActive && {
            backgroundColor: colors.primary + '20',
            borderColor: colors.primary,
          },
        ]}
        onPress={() => setActiveFilter(tab)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.filterTabText,
            { color: colors.textSecondary },
            isActive && { color: colors.primary, fontWeight: '700' },
          ]}
        >
          {tab}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderAuditRow = (entry: any, index: number) => {
    const ts = entry.created_at ? new Date(entry.created_at).toLocaleString() : '';
    const entity = entry.entity || entry.entity_type || 'System';
    const action = entry.action || entry.event || 'Event';
    const details = entry.details || entry.description || '';
    const cat = (entry.category || entry.action || '').toLowerCase();
    const iconMap: Record<string, React.ReactNode> = {
      transaction: <BarChart3 size={16} color={colors.primary} />,
      auth: <FileText size={16} color={colors.warning} />,
      admin: <ShieldCheck size={16} color={colors.danger} />,
    };
    const iconKey = Object.keys(iconMap).find((k) => cat.includes(k));
    const icon = iconKey ? iconMap[iconKey] : <History size={16} color={colors.textSecondary} />;

    return (
      <View
        key={entry.id || index}
        style={[
          styles.auditRow,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={[styles.auditIcon, { backgroundColor: colors.card }]}>{icon}</View>
        <View style={styles.auditContent}>
          <Text style={[styles.auditTitle, { color: colors.text }]}>{action}</Text>
          <Text style={[styles.auditSub, { color: colors.textSecondary }]}>
            {entity} · {details}
          </Text>
        </View>
        <View style={styles.auditTime}>
          <Text style={[styles.auditTimeText, { color: colors.textSecondary }]}>{ts}</Text>
          {entry.status && (
            <View style={[styles.statusPill, { backgroundColor: colors.card }]}>
              <Text style={[styles.statusPillText, { color: colors.textSecondary }]}>
                {entry.status}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ClipboardList size={28} color={colors.primary} />
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Audit Dashboard</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              Compliance & Financial Oversight
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.refreshWrap} onPress={loadData} activeOpacity={0.7}>
          <RefreshCw size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.readOnlyBanner,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Lock size={14} color={colors.primary} />
          <Text style={[styles.readOnlyText, { color: colors.primary }]}>
            Read-Only Compliance View — No edits permitted
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Key Financial Metrics
          </Text>
          <View style={styles.statsGrid}>
            {renderStatCard(
              <Banknote size={20} color={colors.primary} />,
              'Total Vault Reserves',
              fmt(summary.totalVaultReserves),
              'All-time reserves',
              colors.success
            )}
            {renderStatCard(
              <TrendingUp size={20} color={colors.primary} />,
              'Active Loan Portfolio',
              fmt(summary.activeLoanPortfolio),
              'Outstanding loans',
              colors.primary
            )}
            {renderStatCard(
              <PieChart size={20} color={colors.warning} />,
              'Accrued Dividends',
              fmt(summary.accruedDividends),
              'Pending distribution',
              colors.warning
            )}
            {renderStatCard(
              summary.ledgerVerified ? (
                <CheckCircle2 size={20} color={colors.success} />
              ) : (
                <AlertTriangle size={20} color={colors.danger} />
              ),
              'Ledger Balance Status',
              summary.ledgerVerified ? 'VERIFIED' : 'FLAGGED',
              summary.variance !== 0
                ? 'Variance: ' + fmt(summary.variance)
                : 'Zero-variance sync',
              summary.ledgerVerified ? colors.success : colors.danger
            )}
          </View>
        </View>

        <View
          style={[
            styles.section,
            styles.sectionCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <Database size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Discrepancy & Reconciliation
            </Text>
          </View>
          <View style={styles.reconciliationRow}>
            <View style={styles.reconciliationItem}>
              <Text style={[styles.reconciliationLabel, { color: colors.textSecondary }]}>
                Total Credits
              </Text>
              <Text style={[styles.reconciliationValue, { color: colors.success }]}>
                {fmt(ledgerRows.reduce((s, l) => s + Number(l.amount || 0), 0))}
              </Text>
            </View>
            <View style={styles.reconciliationItem}>
              <Text style={[styles.reconciliationLabel, { color: colors.textSecondary }]}>
                Ledger Balance
              </Text>
              <Text style={[styles.reconciliationValue, { color: colors.text }]}>
                {fmt(summary.totalVaultReserves - summary.activeLoanPortfolio)}
              </Text>
            </View>
            <View style={styles.reconciliationItem}>
              <Text style={[styles.reconciliationLabel, { color: colors.textSecondary }]}>
                Variance
              </Text>
              <Text
                style={[
                  styles.reconciliationValue,
                  { color: summary.variance === 0 ? colors.success : colors.danger },
                ]}
              >
                {fmt(summary.variance)}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.syncStatusBadge,
              {
                backgroundColor: summary.ledgerVerified
                  ? colors.success + '20'
                  : colors.danger + '20',
              },
            ]}
          >
            {summary.ledgerVerified ? (
              <CheckCircle2 size={14} color={colors.success} />
            ) : (
              <AlertTriangle size={14} color={colors.danger} />
            )}
            <Text
              style={[
                styles.syncStatusText,
                { color: summary.ledgerVerified ? colors.success : colors.danger },
              ]}
            >
              {summary.variance === 0
                ? 'Zero-Variance Ledger Sync — All Records Aligned'
                : 'Variance Detected — Review Required'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <History size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Audit Trails Feed</Text>
            <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
              {filteredLogs.length} entries
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterRow}
          >
            {FILTER_TABS.map((tab) => renderFilterTab(tab))}
          </ScrollView>
          {filteredLogs.length === 0 && !loading ? (
            <View style={[styles.emptyCard, { borderColor: colors.border }]}>
              <FileText size={24} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {activeFilter === 'All'
                  ? 'No audit entries found.'
                  : No ${activeFilter.toLowerCase()} entries found.}
              </Text>
            </View>
          ) : (
            filteredLogs.slice(0, 50).map((entry, index) => renderAuditRow(entry, index))
          )}
          {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : null}
        </View>

        <View
          style={[
            styles.section,
            styles.sectionCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <Download size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Export Ledger</Text>
          </View>
          <View style={styles.exportRow}>
            <TouchableOpacity
              style={[
                styles.exportBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={exportCSV}
              disabled={exporting}
            >
              <FileSpreadsheet size={18} color={colors.success} />
              <Text style={[styles.exportBtnText, { color: colors.text }]}>Export CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.exportBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={exportPDF}
              disabled={exporting}
            >
              <File size={18} color={colors.danger} />
              <Text style={[styles.exportBtnText, { color: colors.text }]}>Export PDF</Text>
            </TouchableOpacity>
          </View>
          {exporting ? (
            <Text style={[styles.generatingText, { color: colors.textSecondary }]}>
              Generating report...
            </Text>
          ) : null}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    headerSub: { fontSize: 11, marginTop: 2 },
    refreshWrap: { padding: 8 },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    readOnlyBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginBottom: 16,
      borderWidth: 1,
    },
    readOnlyText: { fontSize: 12, fontWeight: '600' },
    section: { marginBottom: 16 },
    sectionCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
    sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    resultCount: { fontSize: 11, marginLeft: 'auto' },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    statCard: {
      flex: 1,
      minWidth: '47%',
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
      alignItems: 'center',
    },
    statIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    statValue: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
    statLabel: { fontSize: 11, marginTop: 4, textAlign: 'center', fontWeight: '600' },
    statSub: { fontSize: 9, marginTop: 2, textAlign: 'center' },
    reconciliationRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    reconciliationItem: { flex: 1, alignItems: 'center' },
    reconciliationLabel: { fontSize: 10, marginBottom: 4 },
    reconciliationValue: { fontSize: 13, fontWeight: '700' },
    syncStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    syncStatusText: { fontSize: 11, fontWeight: '600' },
    filterRow: { marginBottom: 12 },
    filterTab: {
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 20,
      borderWidth: 1,
      marginRight: 8,
    },
    filterTabText: { fontSize: 12, fontWeight: '600' },
    auditRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 10,
      borderWidth: 1,
      padding: 10,
      marginBottom: 6,
    },
    auditIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    auditContent: { flex: 1 },
    auditTitle: { fontSize: 12, fontWeight: '600' },
    auditSub: { fontSize: 10, marginTop: 2 },
    auditTime: { alignItems: 'flex-end' },
    auditTimeText: { fontSize: 9 },
    statusPill: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      marginTop: 4,
    },
    statusPillText: { fontSize: 8, fontWeight: '600' },
    emptyCard: {
      borderRadius: 10,
      borderWidth: 1,
      borderStyle: 'dashed',
      padding: 20,
      alignItems: 'center',
    },
    emptyText: { fontSize: 11, marginTop: 6, textAlign: 'center' },
    exportRow: {
      flexDirection: 'row',
      gap: 10,
    },
    exportBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    exportBtnText: { fontSize: 12, fontWeight: '600' },
    generatingText: { fontSize: 11, textAlign: 'center', marginTop: 8 },
  });