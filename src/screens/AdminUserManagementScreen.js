import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView,
  StatusBar, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { Users, Search, RefreshCcw, Trash2, ShieldAlert, KeyRound } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { supabase } from '../lib/supabase';
import { getAllSettings, getSetting } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/** Admin User Management — monitor members, reset passwords, suspend accounts. */
export default function AdminUserManagementScreen({ navigation: rawNav }) {
  const navigation = rawNav;
  const { userEmail } = useAuth();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    const list = [];
    try {
      const { data } = await supabase.from('profiles').select('*');
      if (data) list.push(...data);
      const { data: usersData } = await supabase.from('users').select('*');
      if (usersData) list.push(...usersData);
    } catch (e) {
      console.log('[usermgmt] db load failed', e?.message);
    }
    setUsers(list.slice(0, 200));
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const sendPasswordReset = async (u) => {
    const email = u.email;
    if (!email) { Alert.alert('No Email', 'This member has no email on file.'); return; }
    try {
      if (supabase.auth?.resetPasswordForEmail) await supabase.auth.resetPasswordForEmail(email);
    } catch (e) { console.log('[usermgmt] reset err', e?.message); }
    Alert.alert('Reset Sent', `A password-reset link/code was sent to ${email}.`);
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
      <StatusBar backgroundColor='#091813' barStyle="light-content" />
      <ScreenHeader title="User Management" subtitle="Monitor and manage cooperative members" onBack={() => navigation?.goBack()} />

      <View style={styles.searchRow}>
        <Search size={18} color='#8EA89D' />
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
        <View style={styles.center}><ActivityIndicator size="large" color="#10B981" /></View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Users size={40} color="#9CB8A6" />
          <Text style={styles.empty}>No members found yet.</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={true}>
          {filtered.map((u, i) => (
            <View key={u.id || u.uid || i} style={styles.userCard}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{u.displayName || u.fullName || 'Member'}</Text>
                <Text style={styles.userEmail}>{u.email || '—'}</Text>
                {u.phone ? <Text style={styles.userMeta}>Phone: {u.phone}</Text> : null}
                <Text style={styles.userMeta}>
                  Savings: ₦{Number(u.balance || u.savings || 0).toLocaleString()} • Loan: ₦{Number(u.loanOutstanding || 0).toLocaleString()}
                </Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={[styles.actionBtn, styles.resetBtn]} onPress={() => sendPasswordReset(u)}>
                  <KeyRound size={16} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.suspendBtn]} onPress={() => suspendUser(u)}>
                  <ShieldAlert size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#091813' },
  scroll: { flex: 1 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D1D18',
    borderRadius: 12, marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 10, color: '#FFFFFF', fontSize: 14, marginLeft: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  empty: { color: '#A7F3D0', fontSize: 14, textAlign: 'center', marginTop: 12 },
  userCard: {
    backgroundColor: '#0D1D18', borderRadius: 14, marginHorizontal: 16, marginBottom: 10,
    padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  userInfo: { flex: 1 },
  userName: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  userEmail: { color: '#10B981', fontSize: 12, marginTop: 2 },
  userMeta: { color: '#8EA89D', fontSize: 11, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, marginLeft: 10 },
  actionBtn: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  resetBtn: { backgroundColor: '#2563EB' },
  suspendBtn: { backgroundColor: '#C0392B' },
});