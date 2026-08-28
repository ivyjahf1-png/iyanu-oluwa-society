import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, FlatList, Alert } from 'react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { Bell, CheckCheck, Trash2, CreditCard, Banknote, Calendar, MessageCircle } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { useTransactions } from '../context/TransactionsContext';
import { useTheme } from '../theme/ThemeContext';

const FILTERS = ['All', 'Deposit Approved', 'Loan Disbursement', 'Repayment Due', 'Admin Notices'];
const iconFor = (type) => {
  switch (type) {
    case 'Deposit Approved': return CreditCard;
    case 'Loan Disbursement': return Banknote;
    case 'Repayment Due': return Calendar;
    case 'Admin Notices': return MessageCircle;
    default: return Bell;
  }
};

export default function NotificationScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const { transactions } = useTransactions();
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);

  const seedNotifications = transactions.slice(0, 5).map((t, i) => ({
    id: 'tx-' + i,
    type: t.type === 'contribution' ? 'Deposit Approved' : 'Repayment Due',
    title: t.type === 'contribution' ? 'Contribution Deposited' : 'Repayment Due',
    message: 'Your ' + t.label + ' of ' + t.type + ' is due for review.',
    amount: '₦' + Number(t.amount || 0).toLocaleString(),
    time: new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    read: i === 0,
    txId: t.id,
  }));

  const [notifications, setNotifications] = useState([
    ...seedNotifications,
    { id: 'admin-1', type: 'Admin Notices', title: 'System Maintenance', message: 'Scheduled maintenance tonight 10PM-12AM. Expect brief downtime.', time: '09:45 AM', read: false },
    { id: 'loan-1', type: 'Loan Disbursement', title: 'Loan Disbursed', message: 'Your loan of ₦150,000.00 has been disbursed to your account.', amount: '₦150,000.00', time: 'Yesterday', read: false },
  ]);
  const [activeFilter, setActiveFilter] = useState('All');
  const filtered = notifications.filter((n) => activeFilter === 'All' || n.type === activeFilter);
  const markRead = (id) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const clearAll = () => Alert.alert('Clear All', 'Remove all notifications?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Clear', style: 'destructive', onPress: () => setNotifications([]) },
  ]);
  const renderItem = ({ item }) => {
    const Icon = iconFor(item.type);
    const isUnread = !item.read;
    return (
      <TouchableOpacity
        style={[styles.notifCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => {
          markRead(item.id);
          if (item.txId) { navigation.navigate('AccountStatement'); }
        }}>
        <View style={[styles.notifIcon, { backgroundColor: colors.primary + '15' }]}>
          <Icon size={20} color={colors.primary} />
        </View>
        <View style={styles.notifTextGroup}>
          <View style={styles.notifHeader}>
            <Text style={[styles.notifTitle, { color: colors.text, fontWeight: isUnread ? '700' : '600' }]}>{item.title}</Text>
            {isUnread && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
          </View>
          <Text style={[styles.notifMessage, { color: colors.textSecondary }]}>{item.message}</Text>
          {item.amount ? <Text style={[styles.notifAmount, { color: colors.primary }]}>{item.amount}</Text> : null}
          <Text style={[styles.notifTime, { color: colors.textSecondary }]}>{item.time}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScreenHeader title="Notifications" subtitle={notifications.filter((n) => !n.read).length + ' unread'} onBack={() => navigation.goBack()} />
      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={markAllRead}>
          <CheckCheck size={16} color={colors.primary} />
          <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Mark all read</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={clearAll}>
          <Trash2 size={16} color={colors.danger} />
          <Text style={[styles.actionBtnText, { color: colors.danger }]}>Clear all</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.filterRow}>
        <FlatList data={FILTERS} keyExtractor={(item) => item} horizontal showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const active = activeFilter === item;
            return (
              <TouchableOpacity
                style={[styles.filterChip, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}
                onPress={() => setActiveFilter(item)}
              >
                <Text style={[styles.filterChipText, { color: active ? colors.background : colors.textSecondary }]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }} />
      </View>
      <FlatList data={filtered} keyExtractor={(item) => item.id} renderItem={renderItem} contentContainerStyle={styles.list}
        ListEmptyComponent={<View style={styles.empty}><Bell size={40} color={colors.textSecondary} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>No notifications</Text></View>} />
    </SafeAreaView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1 },
  actionsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderRadius: 12, borderWidth: 1, paddingVertical: 10 },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  filterRow: { paddingHorizontal: 16, paddingBottom: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  filterChipText: { fontSize: 12, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 32 },
  notifCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 10 },
  notifIcon: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  notifTextGroup: { flex: 1 },
  notifHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  notifTitle: { fontSize: 13 },
  unreadDot: { width: 7, height: 7, borderRadius: 3.5, marginLeft: 'auto' },
  notifMessage: { fontSize: 12, lineHeight: 16 },
  notifAmount: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  notifTime: { fontSize: 11, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 13, marginTop: 12 },
});
