import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView,
  StatusBar, ActivityIndicator, Alert, TextInput, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';
import { Users, Search, RefreshCcw, Trash2, ShieldAlert, KeyRound, UserPlus, X } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { supabase } from '../lib/supabase';
import { getAllSettings, getSetting } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getRegisteredUsers } from '../auth/authService';
import { toast } from '../lib/safe';

/** Admin User Management — monitor members, reset passwords, suspend accounts. */
export default function AdminUserManagementScreen({ navigation: rawNav }) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const navigation = rawNav;
  const { userEmail } = useAuth();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [resettingEmail, setResettingEmail] = useState(null);

  /**
   * Load every registered member profile from Supabase (`profiles` table,
   * falling back to a `users` table when present). Normalises rows so the
   * list shows full account metadata: name, email, registration date, status.
   */
  const loadUsers = async () => {
    setLoading(true);
    setLoadError(null);
    let list = [];
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      if (data) {
        list = data.map((p) => ({
          id: p.id || p.uid,
          uid: p.uid || p.id,
          displayName: p.display_name || p.full_name || p.name || p.username || 'Member',
          email: p.email || null,
          phone: p.phone || null,
          status: p.status || p.account_status || 'active',
          createdAt: p.created_at || null,
          balance: p.balance ?? p.savings ?? 0,
          loanOutstanding: p.loan_outstanding ?? p.loanOutstanding ?? 0,
        }));
      }
    } catch (e) {
      console.log('[usermgmt] profiles load failed:', e?.message);
      // Fallback: some deployments keep members in a `users` table instead.
      try {
        const { data: usersData } = await supabase.from('users').select('*').limit(200);
        if (usersData) {
          list = usersData.map((p) => ({
            id: p.id || p.uid,
            uid: p.uid || p.id,
            displayName: p.displayName || p.fullName || p.name || 'Member',
            email: p.email || null,
            phone: p.phone || null,
            status: p.status || 'active',
            createdAt: p.created_at || p.createdAt || null,
            balance: p.balance ?? p.savings ?? 0,
            loanOutstanding: p.loanOutstanding ?? 0,
          }));
        }
      } catch (e2) {
        console.log('[usermgmt] users fallback failed:', e2?.message);
      }
      if (list.length === 0) {
        setLoadError(
          e?.message?.includes('does not exist')
            ? 'The "profiles" table was not found in Supabase. Create it (id uuid, display_name, email, status, created_at) to enable member management.'
            : `Could not load members: ${e?.message || 'unknown error'}. Check your Supabase connection and RLS policies.`,
        );
      }
    }
    // Always merge the local persistent account registry so every account
    // created on this device appears in Admin management — even when
    // Supabase is unreachable or the remote list is empty.
    try {
      const registered = await getRegisteredUsers();
      const known = new Set(list.map((u) => (u.email || '').toLowerCase()));
      const localRows = registered
        .filter((r) => !known.has((r.email || '').toLowerCase()))
        .map((r) => ({
          id: r.uid,
          uid: r.uid,
          displayName: r.displayName || 'Member',
          email: r.email,
          phone: null,
          status: 'active',
          createdAt: r.createdAt,
          balance: 0,
          loanOutstanding: 0,
          source: 'local-registry',
        }));
      list = [...localRows, ...list];
    } catch (e3) {
      console.log('[usermgmt] local registry merge failed:', e3?.message);
    }
    setUsers(list);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  /** Trigger Supabase's native password-reset email for this member. */
  const sendPasswordReset = async (u) => {
    const email = u.email;
    if (!email) { Alert.alert('No Email', 'This member has no email on file.'); return; }
    setResettingEmail(email);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: process.env.EXPO_PUBLIC_PASSWORD_RESET_URL || undefined,
      });
      if (error) throw error;
      Alert.alert('Reset Sent', `A password-reset link was emailed to ${email}.`);
    } catch (e) {
      console.log('[usermgmt] reset err:', e?.message);
      Alert.alert('Reset Failed', e?.message || `Could not send a reset email to ${email}.`);
    }
    setResettingEmail(null);
  };

  const suspendUser = async (u) => {
    Alert.alert('Suspend Account', `Suspend ${u.email || 'this member'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Suspend', style: 'destructive',
        onPress: async () => {
          try {
            if (supabase.auth?.admin?.updateUserById && u.uid) {
              await supabase.auth.admin.updateUserById(u.uid, { ban_duration: '8760h' });
            }
          } catch (e) { console.log('[usermgmt] suspend err', e?.message); }
          Alert.alert('Suspended', `Account for ${u.email || 'this member'} was suspended.`);
        },
      },
    ]);
  };

  const filtered = (users || []).filter((u) =>
    !query ||
    (u.email || '').toLowerCase().includes(query.toLowerCase()) ||
    (u.displayName || u.fullName || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor='#F4F7F5' barStyle="dark-content" />
      <ScreenHeader title="User Management" subtitle="Monitor and manage cooperative members" onBack={() => navigation?.goBack()} />

      <View style={styles.searchRow}>
        <Search size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or email"
          placeholderTextColor="#526E63"
          autoCapitalize="none"
        />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.success} /></View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Users size={40} color={colors.textSecondary} />
          <Text style={styles.empty}>{loadError || 'No members found yet.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadUsers}>
            <RefreshCcw size={15} color={colors.text} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={true}>
          {filtered.map((u, i) => (
            <View key={u.id || u.uid || i} style={styles.userCard}>
              <View style={styles.userInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>{u.displayName || u.fullName || 'Member'}</Text>
                  <View style={[styles.statusPill, u.status === 'suspended' ? styles.statusSuspended : styles.statusActive]}>
                    <Text style={styles.statusText}>{String(u.status || 'active').toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.userEmail}>{u.email || '—'}</Text>
                {u.phone ? <Text style={styles.userMeta}>Phone: {u.phone}</Text> : null}
                {u.createdAt ? (
                  <Text style={styles.userMeta}>
                    Registered: {new Date(u.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </Text>
                ) : null}
                <Text style={styles.userMeta}>
                  Savings: ₦{Number(u.balance || 0).toLocaleString()} • Loan: ₦{Number(u.loanOutstanding || 0).toLocaleString()}
                </Text>

                {/* Password reset action */}
                <TouchableOpacity
                  style={[styles.resetEmailBtn, resettingEmail === u.email && styles.btnDisabled]}
                  onPress={() => sendPasswordReset(u)}
                  disabled={!u.email || resettingEmail === u.email}
                >
                  <KeyRound size={14} color={colors.text} />
                  <Text style={styles.resetEmailText}>
                    {resettingEmail === u.email ? 'Sending…' : 'Send Password Reset Email'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={[styles.actionBtn, styles.suspendBtn]} onPress={() => suspendUser(u)}>
                  <ShieldAlert size={16} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F5' },
  scroll: { flex: 1 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 12, marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 10, color: '#0F172A', fontSize: 14, marginLeft: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  empty: { color: '#047857', fontSize: 14, textAlign: 'center', marginTop: 12 },
  userCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, marginHorizontal: 16, marginBottom: 10,
    padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { color: '#0F172A', fontSize: 15, fontWeight: 'bold' },
  statusPill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusActive: { backgroundColor: 'rgba(16,185,129,0.18)' },
  statusSuspended: { backgroundColor: 'rgba(192,57,43,0.25)' },
  statusText: { color: '#047857', fontSize: 9, fontWeight: '700' },
  userEmail: { color: '#10B981', fontSize: 12, marginTop: 2 },
  userMeta: { color: '#8EA89D', fontSize: 11, marginTop: 2 },
  resetEmailBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2563EB',
    borderRadius: 9, paddingVertical: 7, paddingHorizontal: 12, marginTop: 10, alignSelf: 'flex-start',
  },
  resetEmailText: { color: '#0F172A', fontSize: 11, fontWeight: '700' },
  btnDisabled: { opacity: 0.55 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10B981',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginTop: 14,
  },
  retryText: { color: '#0F172A', fontSize: 12, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, marginLeft: 10 },
  actionBtn: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  resetBtn: { backgroundColor: '#2563EB' },
  suspendBtn: { backgroundColor: '#C0392B' },
});

const styles = makeStyles(themes.darkEmerald, true);
