/**
 * PastMeetingsScreen — member meeting history & upcoming sessions.
 *
 * - Upcoming session card (deep-links into the virtual meeting room).
 * - Past minutes / meeting logs fetched from the Supabase `meetings` table
 *   with an 8-month (240-day) expiration filter.
 * - Realtime: postgres_changes channel re-syncs the list instantly whenever
 *   an admin adds or edits a meeting record.
 * - If the `meetings` table isn't provisioned yet, falls back to the bundled
 *   recent minutes so the page is never empty/broken.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CalendarClock, ChevronRight, History, Radio, Users } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../theme/ThemeContext';
import { supabase } from '../lib/supabase';
import { useSafeNavigation } from '../hooks/useSafeNavigation';

const EIGHT_MONTHS_MS = 240 * 24 * 60 * 60 * 1000; // 8-month expiration window
const ROOM_ID = 'mgm-monthly-general-meeting';

/** Bundled fallback history (mirrors the Monthly General Meeting screen). */
const FALLBACK_MINUTES = [
  { id: 'mtg-dec-2025', title: 'December General Meeting', meeting_date: '2025-12-07', agenda: 'Opening prayer & welcome • Last minutes • Treasurer’s report • Dividend approval', attendance: 142 },
  { id: 'mtg-nov-2025', title: 'November General Meeting', meeting_date: '2025-11-02', agenda: 'Last minutes • Welfare committee elections • Loan disbursement review', attendance: 138 },
  { id: 'mtg-oct-2025', title: 'October General Meeting', meeting_date: '2025-10-05', agenda: 'Opening prayer • Treasurer’s report • Dividend declaration • Welfare', attendance: 127 },
];

function fmtDate(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return iso || '';
  return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

export default function PastMeetingsScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);

  const [meetings, setMeetings] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  // Fetch + realtime subscription on the `meetings` table.
  useEffect(() => {
    let cancelled = false;
    const cutoffIso = new Date(Date.now() - EIGHT_MONTHS_MS).toISOString();

    const applyRows = (rows) => {
      if (cancelled) return;
      const cutoffMs = Date.now() - EIGHT_MONTHS_MS;
      const mapped = (rows || [])
        .map((r) => ({
          id: String(r.id),
          title: r.title || 'General Meeting',
          meeting_date: r.meeting_date || r.created_at || null,
          agenda: r.agenda || r.agenda_items || '',
          attendance: r.attendance_count ?? r.attendance ?? null,
          ts: new Date(r.meeting_date || r.created_at || 0).getTime(),
        }))
        .filter((m) => m.ts >= cutoffMs) // 8-month expiration filter
        .sort((a, b) => b.ts - a.ts);
      setMeetings(mapped);
      setUsingFallback(false);
      setLoaded(true);
    };

    (async () => {
      try {
        const { data, error } = await supabase
          .from('meetings')
          .select('*')
          .gte('created_at', cutoffIso)
          .order('meeting_date', { ascending: false })
          .limit(100);
        if (!error && data) {
          applyRows(data);
        } else if (!cancelled) {
          setMeetings(FALLBACK_MINUTES.map((m) => ({ ...m, ts: new Date(m.meeting_date).getTime() })));
          setUsingFallback(true);
          setLoaded(true);
        }
      } catch (e) {
        if (!cancelled) {
          setMeetings(FALLBACK_MINUTES.map((m) => ({ ...m, ts: new Date(m.meeting_date).getTime() })));
          setUsingFallback(true);
          setLoaded(true);
        }
      }
    })();

    // Admin-to-user realtime sync.
    let channel;
    try {
      channel = supabase
        .channel('meetings-feed')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'meetings' },
          () => {
            supabase
              .from('meetings')
              .select('*')
              .gte('created_at', cutoffIso)
              .order('meeting_date', { ascending: false })
              .limit(100)
              .then(({ data }) => {
                if (data) applyRows(data);
              })
              .catch(() => {});
          },
        )
        .subscribe();
    } catch (e) {
      /* realtime unavailable — static fallback is fine */
    }

    return () => {
      cancelled = true;
      try {
        if (channel) supabase.removeChannel(channel);
      } catch (e) {}
    };
  }, []);

  // Next meeting = 1st Sunday of the month, 10:00.
  const nextMeeting = useMemo(() => {
    const now = new Date();
    for (let i = 0; i < 3; i += 1) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1, 10, 0, 0);
      while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
      if (d.getTime() > now.getTime()) return d;
    }
    return null;
  }, []);
  const isLive = useMemo(() => {
    const now = new Date();
    const dayStart = new Date(nextMeeting);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    return (
      nextMeeting && now >= dayStart && now < dayEnd &&
      now.getHours() >= 10 && now.getHours() < 14
    );
  }, [nextMeeting]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <History size={14} color={colors.primary} />
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.date}>{fmtDate(item.meeting_date)}</Text>
      </View>
      {!!item.agenda && <Text style={styles.agenda}>{item.agenda}</Text>}
      {item.attendance != null && (
        <View style={styles.attendRow}>
          <Users size={12} color={colors.textSecondary} />
          <Text style={styles.attendTxt}>{item.attendance} members attended</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="General Meetings"
        subtitle="Upcoming sessions & past minutes (last 8 months)"
        onBack={() => navigation.goBack()}
      />

      {/* Upcoming / live session card */}
      <TouchableOpacity
        style={[styles.upcomingCard, isLive && styles.liveCard]}
        activeOpacity={0.85}
        onPress={() =>
          isLive
            ? navigation.navigate('VirtualMeetingRoom', { roomId: ROOM_ID })
            : navigation.navigate('MonthlyGeneralMeeting')
        }
      >
        <View style={[styles.iconCircle, isLive && styles.liveIconCircle]}>
          {isLive ? <Radio size={20} color='#FFFFFF' /> : <CalendarClock size={20} color={colors.primary} />}
        </View>
        <View style={{ flex: 1 }}>
          {isLive ? (
            <>
              <Text style={styles.liveTitle}>General Assembly is LIVE</Text>
              <Text style={styles.upcomingSub}>Tap to join the virtual meeting now</Text>
            </>
          ) : (
            <>
              <Text style={styles.upcomingTitle}>Upcoming General Meeting</Text>
              <Text style={styles.upcomingSub}>
                {nextMeeting ? fmtDate(nextMeeting.toISOString()) : 'Schedule to be announced'}
              </Text>
            </>
          )}
        </View>
        <ChevronRight size={18} color={colors.textSecondary} />
      </TouchableOpacity>
      {isLive && (
        <TouchableOpacity
          style={styles.joinBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('VirtualMeetingRoom', { roomId: ROOM_ID })}
        >
          <Text style={styles.joinBtnTxt}>Join Live Assembly</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionLabel}>Past Minutes & Meeting Logs</Text>
      <FlatList
        data={meetings}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <History size={26} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>
              {loaded ? 'No meetings in the last 8 months' : 'Loading meeting history…'}
            </Text>
          </View>
        }
        ListFooterComponent={
          usingFallback ? (
            <Text style={styles.fallbackNote}>
              Showing recent bundled minutes — live meeting records sync automatically once provisioned.
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const makeStyles = (colors, isDark) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: { padding: 16, paddingTop: 8, paddingBottom: 40 },
    upcomingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginHorizontal: 16,
      marginTop: 12,
    },
    liveCard: { borderColor: colors.success, borderWidth: 1.5 },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    liveIconCircle: { backgroundColor: colors.success },
    upcomingTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
    liveTitle: { color: colors.success, fontSize: 14, fontWeight: '700' },
    upcomingSub: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
    joinBtn: {
      backgroundColor: colors.success,
      borderRadius: 12,
      paddingVertical: 11,
      alignItems: 'center',
      marginHorizontal: 16,
      marginTop: 10,
    },
    joinBtnTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 13, letterSpacing: 0.3 },
    sectionLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      paddingHorizontal: 16,
      marginTop: 20,
      marginBottom: 4,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
    },
    headRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    title: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
    date: { color: colors.textSecondary, fontSize: 10 },
    agenda: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 8 },
    attendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
    attendTxt: { color: colors.textSecondary, fontSize: 11 },
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 32,
      alignItems: 'center',
      marginTop: 16,
    },
    emptyTitle: { color: colors.textSecondary, fontSize: 13, marginTop: 12, textAlign: 'center' },
    fallbackNote: {
      color: colors.textSecondary,
      fontSize: 11,
      textAlign: 'center',
      paddingHorizontal: 24,
      paddingBottom: 20,
      opacity: 0.8,
    },
  });