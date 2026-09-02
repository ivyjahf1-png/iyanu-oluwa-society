/**
 * AnnouncementsFeedScreen — member-facing announcements feed.
 *
 * Read-only view of official cooperative updates (news, meeting schedules,
 * policy notices) pulled live from the Supabase `announcements` table via
 * AnnouncementsContext (INSERT/UPDATE/DELETE realtime channels — anything the
 * admin posts appears here instantly, no refresh).
 *
 * 3-month expiration: only records created within the last 90 days are shown.
 */
import React, { useMemo } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Megaphone } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../theme/ThemeContext';
import { useAnnouncements } from '../context/AnnouncementsContext';
import { useSafeNavigation } from '../hooks/useSafeNavigation';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export default function AnnouncementsFeedScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  // Realtime-synced store: hydrated from Supabase on mount and updated by
  // live postgres_changes channels whenever an admin posts/edits/deletes.
  const { announcements, hydrated } = useAnnouncements();

  const feed = useMemo(() => {
    const cutoff = Date.now() - NINETY_DAYS_MS;
    return announcements
      .filter((a) => a.active)
      .filter((a) => a.createdAt >= cutoff) // 3-month expiration filter
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [announcements]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <Megaphone size={14} color={colors.primary} />
        <Text style={styles.author}>{item.author || 'Admin'}</Text>
        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      {!!item.message && <Text style={styles.message}>{item.message}</Text>}
      {!!item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.image} />}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Announcements & News"
        subtitle="Official cooperative updates from the admin"
        onBack={() => navigation.goBack()}
      />
      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Megaphone size={26} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No announcements yet</Text>
            <Text style={styles.emptySub}>
              {hydrated
                ? 'Official society updates from the admin will appear here.'
                : 'Syncing latest announcements…'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const makeStyles = (colors, isDark) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: { padding: 16, paddingBottom: 40 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
    },
    headRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    author: { color: colors.primary, fontSize: 11, fontWeight: '700' },
    date: { color: colors.textSecondary, fontSize: 10, marginLeft: 'auto' },
    title: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
    message: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
    image: {
      width: '100%',
      height: 160,
      borderRadius: 10,
      marginTop: 10,
      resizeMode: 'cover',
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 32,
      alignItems: 'center',
      marginTop: 24,
    },
    emptyTitle: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 12 },
    emptySub: { color: colors.textSecondary, fontSize: 12, marginTop: 6, textAlign: 'center' },
  });