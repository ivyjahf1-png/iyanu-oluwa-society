import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { ScrollText, ArrowDownLeft, ArrowUpRight, ShieldAlert, CheckCircle2 } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { supabase, isServerConfigured } from '../lib/supabase';
import { useTheme } from '../theme/ThemeContext';

/**
 * AdminLedgerScreen — READ-ONLY view of the immutable `ledger_entries` table.
 *
 * SECURITY: this screen renders only. There is deliberately NO edit-balance,
 * no delete and no adjustment action — corrections must go through a
 * controlled server-side adjustment RPC (none exists yet; see report). Rows
 * are protected by RLS (`ledger_select_own` / admin read-all).
 */

const TYPES = [
  'All', 'deposit', 'withdrawal', 'contribution',
  'loan_disbursement', 'loan_repayment', 'adjustment',
];

const fmt = n =>
  '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdminLedgerScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');

  const load = useCallback(async () => {
    if (!isServerConfigured()) {
      setError('Backend not configured on this device.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('ledger_entries')
        .select('id, user_id, entry_type, direction, amount, category, reference, description, created_at, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(300);
      if (err) throw new Error(err.message);
      setEntries(data || []);
    } catch (e) {
      setError(e.message || 'Could not load the ledger.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = filter === 'All' ? entries : entries.filter(e => e.entry_type === filter);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScreenHeader
        title="Transaction Ledger"
        subtitle="Immutable record of every money movement"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.chipRow}>
        {TYPES.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, filter === t && styles.chipActive]}
            onPress={() => setFilter(t)}
          >
            <Text style={[styles.chipText, filter === t && styles.chipTextActive]}>
              {t.replace(/_/g, ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.hint}>Loading ledger…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ShieldAlert size={34} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <ScrollText size={34} color={colors.textSecondary} />
          <Text style={styles.hint}>
            No ledger entries{filter === 'All' ? '' : ` for "${filter}"`} yet.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        >
          {filtered.map(e => (
            <View key={e.id} style={styles.row}>
              <View style={styles.dirIcon}>
                {e.direction === 'credit' ? (
                  <ArrowDownLeft size={16} color={colors.primary} />
                ) : (
                  <ArrowUpRight size={16} color={colors.danger} />
                )}
              </View>
              <View style={styles.info}>
                <Text style={styles.type} numberOfLines={1}>
                  {(e.entry_type || 'entry').replace(/_/g, ' ')}
                </Text>
                <Text style={styles.member} numberOfLines={1}>
                  {e.profiles?.full_name || 'Unknown member'}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {new Date(e.created_at).toLocaleString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                  {e.reference ? ` • Ref ${e.reference}` : ''}
                </Text>
              </View>
              <View style={styles.amountBox}>
                <Text
                  style={[styles.amount, { color: e.direction === 'credit' ? colors.primary : colors.danger }]}
                >
                  {e.direction === 'credit' ? '+' : '−'}
                  {fmt(e.amount)}
                </Text>
                <Text style={styles.idText} numberOfLines={1}>
                  ID {e.id?.slice(0, 8)}…
                </Text>
              </View>
            </View>
          ))}
          <View style={styles.footerNote}>
            <CheckCircle2 size={14} color={colors.primary} />
            <Text style={styles.footerText}>
              Read-only. Entries are immutable — corrections require a controlled
              adjustment (backend pending).
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  chipRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  chip: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  chipTextActive: { color: colors.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  dirIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: colors.surface,
  },
  info: { flex: 1 },
  type: { color: colors.text, fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  member: { color: colors.text, fontSize: 12, marginTop: 2 },
  meta: { color: colors.textSecondary, fontSize: 10, marginTop: 3 },
  amountBox: { alignItems: 'flex-end', marginLeft: 8 },
  amount: { fontSize: 13, fontWeight: 'bold' },
  idText: { color: colors.textSecondary, fontSize: 9, marginTop: 3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  hint: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  errorText: { color: colors.danger, fontSize: 13, textAlign: 'center' },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  retryText: { color: colors.background, fontWeight: '700', fontSize: 13 },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginTop: 6,
  },
  footerText: { color: colors.textSecondary, fontSize: 11, flex: 1, lineHeight: 15 },
});
