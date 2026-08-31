import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  FlatList,
  Alert,
} from 'react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import {
  Bell,
  CheckCheck,
  Trash2,
  CreditCard,
  Banknote,
  Calendar,
  MessageCircle,
} from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { useAnnouncements } from '../context/AnnouncementsContext';
import { useTheme } from '../theme/ThemeContext';
import { supabase } from '../lib/supabase';
import { storage } from '../lib/storage';

const FILTERS = ['All', 'Deposit Approved', 'Loan Disbursement', 'Repayment Due', 'Admin Notices'];
const iconFor = (type) => {
  switch (type) {
    case 'Deposit Approved':
      return CreditCard;
    case 'Loan Disbursement':
      return Banknote;
    case 'Repayment Due':
      return Calendar;
    case 'Admin Notices':
      return MessageCircle;
    default:
      return Bell;
  }
};

// Persisted read-state so read banners survive restarts / offline.
const READ_KEY = '@ius_notifications_read';

export default function NotificationScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const { activeAnnouncements } = useAnnouncements();
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);

  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState([]);

  // Load persisted read-ids once.
  useEffect(() => {
    (async () => {
      try {
        const raw = await storage.getItem(READ_KEY);
        if (raw) setReadIds(JSON.parse(raw));
      } catch {
        // corrupt payload — start empty

  // Live per-member notification feed from the `notifications` table.
  // Replaces the old hardcoded dummy seed — this list is populated entirely
  // from realtime DB writes (INSERT/UPDATE/DELETE) once the user is known.
  useEffect(() => {
    let cancelled = false;
    let channel;
    let uid;

    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        uid = user.id;

        // 1. Snapshot of the member's notifications.
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!cancelled && !error && data) {
          setNotifications(data.map(mapNotifRow));
        }
      } catch (e) {
        if (!cancelled)
          console.warn('[notifications] fetch failed:', e?.message);
      }

      // 2. Realtime listener (INSERT/UPDATE/DELETE) filtered to this member.
      if (!uid) return;
      try {
        channel = supabase
          .channel(`notifications:user:${uid}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${uid}`,
            },
            (payload) => {
              if (!payload?.new || cancelled) return;
              const entry = mapNotifRow(payload.new);
              setNotifications((prev) =>
                prev.some((n) => n.id === entry.id)
                  ? prev
                  : [entry, ...prev],
              );
            },
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${uid}`,
            },
            (payload) => {
              if (!payload?.new || cancelled) return;
              const entry = mapNotifRow(payload.new);
              setNotifications((prev) =>
                prev.map((n) => (n.id === entry.id ? entry : n)),
              );
            },
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${uid}`,
            },
            (payload) => {
              if (!payload?.old || cancelled) return;
              setNotifications((prev) =>
                prev.filter((n) => n.id !== payload.old.id),
              );
            },
          )
          .subscribe();
      } catch (e) {
        console.warn('[notifications] realtime subscribe failed:', e?.message);
      }
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  /** Map a DB row to the shape rendered by this screen's list. */
  function mapNotifRow(row) {
    const txType = row.tx_type || row.type;
    const amount = row.amount
      ? `₦${Number(row.amount).toLocaleString()}`
      : null;
    const time = row.created_at
      ? new Date(row.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

    return {
      id: String(row.id || `srv-${Date.now()}`),
      type:
        txType === 'contribution'
          ? 'Deposit Approved'
          : txType === 'repayment'
          ? 'Repayment Due'
          : row.type || 'info',
      title:
        row.title ||
        (txType === 'contribution'
          ? 'Contribution Deposited'
          : txType === 'repayment'
          ? 'Repayment Due'
          : 'Notification'),
      message: row.body || '',
      amount,
      time,
      read: Boolean(row.read),
      date: row.created_at
        ? new Date(row.created_at).toLocaleDateString()
        : 'Today',
    };
  }

      }
    })();
  }, []);


  const [activeFilter, setActiveFilter] = useState('All');
  const isRead = useCallback(
    (n) => readIds.includes(n.id) || n.read,
    [readIds],
  );
  const filtered = notifications.filter(
    (n) => activeFilter === 'All' || n.type === activeFilter,
  );
  const markRead = (id) => {
    setReadIds((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      storage.setItem(READ_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
    // Mirror back to the server so other devices mark it read too.
    supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .catch(() => {});
  };
  const markAllRead = () => {
    const ids = notifications.map((n) => n.id);
    setReadIds((prev) => {
      const next = Array.from(new Set([...prev, ...ids]));
      storage.setItem(READ_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
    supabase
      .from('notifications')
      .update({ read: true })
      .in('id', ids)
      .catch(() => {});
  };
  const clearAll = () =>
    Alert.alert('Clear All', 'Remove all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => setNotifications([]),
      },
    ]);


  const renderItem = ({ item }) => {
    const Icon = iconFor(item.type);
    const unread = !isRead(item);
    return (
      <TouchableOpacity
        style={[
          styles.notifCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        onPress={() => {
          markRead(item.id);
          if (item.txId) {
            navigation.navigate('AccountStatement');
          }
        }}
      >
        <View
          style={[styles.notifIcon, { backgroundColor: colors.primary + '15' }]}
        >
          <Icon size={20} color={colors.primary} />
        </View>
        <View style={styles.notifTextGroup}>
          <View style={styles.notifHeader}>
            <Text
              style={[
                styles.notifTitle,
                { color: colors.text, fontWeight: unread ? '700' : '600' },
              ]}
            >
              {item.title}
            </Text>
            {unread && (
              <View
                style={[styles.unreadDot, { backgroundColor: colors.primary }]}
              />
            )}
          </View>
          <Text
            style={[styles.notifMessage, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.message || item.time}
          </Text>
          {item.amount ? (
            <Text style={[styles.notifAmount, { color: colors.success }]}>
              {item.amount}
            </Text>
          ) : null}
          <Text
            style={[styles.notifTime, { color: colors.textSecondary }]}
          >
            {item.time}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };


  const renderAdminNotice = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notifCard,
        styles.adminNoticeCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={() => markRead(item.id)}
    >
      <View
        style={[styles.notifIcon, { backgroundColor: colors.primary + '15' }]}
      >
        <MessageCircle size={20} color={colors.primary} />
      </View>
      <View style={styles.notifTextGroup}>
        <Text
          style={[
            styles.notifTitle,
            { color: colors.text, fontWeight: '700' },
          ]}
        >
          {item.title}
        </Text>
        <Text
          style={[styles.notifMessage, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {item.message}
        </Text>
        <Text
          style={[styles.notifTime, { color: colors.textSecondary }]}
        >
          {new Date(item.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Admin notices (live from AnnouncementsContext, isActive == true) are shown
  // only under the "Admin Notices" filter; the transaction feed uses `filtered`.
  const listData = activeFilter === 'Admin Notices' ? [] : filtered;
  const adminNoticeData =
    activeFilter === 'Admin Notices' ? activeAnnouncements : [];


  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <ScreenHeader
        title="Notifications"
        subtitle={
          notifications.filter((n) => !isRead(n)).length + ' unread'
        }
        onBack={() => navigation.goBack()}
      />
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={markAllRead}
        >
          <CheckCheck size={16} color={colors.primary} />
          <Text
            style={[styles.actionBtnText, { color: colors.textSecondary }]}
          >
            Mark all read
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={clearAll}
        >
          <Trash2 size={16} color={colors.danger} />
          <Text style={[styles.actionBtnText, { color: colors.danger }]}>
            Clear all
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.filterRow}>
        <FlatList
          data={FILTERS}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const active = activeFilter === item;
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active
                      ? colors.primary
                      : colors.border,
                  },
                ]}
                onPress={() => setActiveFilter(item)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: active
                        ? colors.background
                        : colors.textSecondary,
                    },
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Admin notices — live, isActive==true feed from AnnouncementsContext */}
      {activeFilter === 'Admin Notices' && (
        <FlatList
          data={adminNoticeData}
          keyExtractor={(item) => item.id}
          renderItem={renderAdminNotice}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Bell size={40} color={colors.textSecondary} />
              <Text
                style={[styles.emptyText, { color: colors.textSecondary }]}
              >
                No admin notices
              </Text>
            </View>
          }
        />
      )}

      {/* Transaction notification feed from the live DB fetch */}
      {activeFilter !== 'Admin Notices' && (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Bell size={40} color={colors.textSecondary} />
              <Text
                style={[styles.emptyText, { color: colors.textSecondary }]}
              >
                No notifications
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c) =>
  StyleSheet.create({
    container: { flex: 1 },
    actionsRow: {
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
      borderRadius: 12,
      borderWidth: 1,
      paddingVertical: 10,
    },
    actionBtnText: { fontSize: 12, fontWeight: '600' },
    filterRow: { paddingHorizontal: 16, paddingBottom: 8 },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      marginRight: 8,
    },
    filterChipText: { fontSize: 12, fontWeight: '600' },
    list: { padding: 16, paddingBottom: 32 },
    notifCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      marginBottom: 10,
    },
    adminNoticeCard: { borderLeftWidth: 3, borderLeftColor: '#10B981' },
    notifIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      justifyContent: 'center',
      alignItems: 'center',
    },
    notifTextGroup: { flex: 1 },
    notifHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 2,
    },
    notifTitle: { fontSize: 13 },
    unreadDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      marginLeft: 'auto',
    },
    notifMessage: { fontSize: 12, lineHeight: 16 },
    notifAmount: { fontSize: 12, fontWeight: '700', marginTop: 2 },
    notifTime: { fontSize: 11, marginTop: 2 },
    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 13, marginTop: 12 },
  });
