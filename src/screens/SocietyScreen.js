import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BookOpen,
  CalendarClock,
  ChevronRight,
  FileText,
  Landmark,
  Megaphone,
  Radio,
  ScrollText,
  Shield,
  Sprout,
  TrendingUp,
  Tractor,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../theme/ThemeContext';
import { useAnnouncements } from '../context/AnnouncementsContext';
import { openExternalLink } from '../lib/webBrowser';

const SITE = 'https://standardmutualsavings.com';

/** Next general meeting = 1st Sunday of the month, 10:00 local time. */
function getNextMeeting(now = new Date()) {
  for (let i = 0; i < 3; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1, 10, 0, 0);
    while (d.getDay() !== 0) d.setDate(d.getDate() + 1); // first Sunday
    if (d.getTime() > now.getTime()) return d;
  }
  return null;
}

/** A meeting is "live" between 10:00 and 14:00 on the meeting day, OR whenever
 *  an admin has broadcast a live-session announcement in the last 4 hours. */
function isMeetingLive(now = new Date(), adminLive = false) {
  if (adminLive) return true;
  const next = getNextMeeting(now);
  if (!next) return false;
  const dayStart = new Date(next);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const sameDay = now >= dayStart && now < dayEnd;
  return sameDay && now.getHours() >= 10 && now.getHours() < 14;
}

const LIVE_ANNOUNCEMENT_RE = /(assembly|meeting|session)[^.]*\blive\b|\blive\b[^.]*\b(assembly|meeting|session)\b/i;
const LIVE_WINDOW_MS = 4 * 60 * 60 * 1000;

const PROMOS = [
  { id: 'land', icon: Landmark, title: 'Land & Property', sub: 'Pool savings toward communal land purchase with verified titles.', tint: '#2E7D32' },
  { id: 'commodity', icon: Sprout, title: 'Commodity Savings', sub: 'Buy farm inputs in bulk at cooperative prices — pay monthly.', tint: '#6A9A2D' },
  { id: 'invest', icon: TrendingUp, title: 'Investment Projects', sub: 'Join vetted group ventures and earn dividend-backed returns.', tint: '#14532D' },
  { id: 'asset', icon: Tractor, title: 'Asset Financing', sub: 'Spread equipment & asset costs over flexible member cycles.', tint: '#1B6C8C' },
];

const DOCUMENTS = [
  { id: 'bylaws', icon: ScrollText, title: 'Society Bye-Laws', url: `${SITE}/bye-laws` },
  { id: 'finance', icon: FileText, title: 'Financial Reports', url: `${SITE}/financial-reports` },
  { id: 'execs', icon: BookOpen, title: 'Executive Directory', url: `${SITE}/executive-directory` },
];

export default function SocietyScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const { announcements } = useAnnouncements();

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Admin-initiated live session: an active announcement about a live
  // assembly/meeting broadcast by an admin within the last 4 hours.
  const adminLive = useMemo(() => {
    const nowMs = now.getTime();
    return announcements.some(
      (a) =>
        a.active &&
        (a.author === 'Admin' || /admin/i.test(a.author || '')) &&
        nowMs - a.createdAt < LIVE_WINDOW_MS &&
        LIVE_ANNOUNCEMENT_RE.test(`${a.title} ${a.message}`),
    );
  }, [announcements, now]);

  const live = useMemo(() => isMeetingLive(now, adminLive), [now, adminLive]);
  const nextMeeting = useMemo(() => getNextMeeting(now), [now]);

  const latestAnnouncements = useMemo(() => {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000; // 3-month expiration
    return announcements
      .filter((a) => a.active)
      .filter((a) => a.createdAt >= cutoff)
      .slice(0, 3);
  }, [announcements]);

  // --- Promo carousel (auto-slide every 4s) ---
  const promoScroll = useRef(null);
  const [promoIndex, setPromoIndex] = useState(0);
  const promoWidth = Math.max(Dimensions.get('window').width - 32, 280);
  useEffect(() => {
    const t = setInterval(() => {
      setPromoIndex((i) => {
        const next = (i + 1) % PROMOS.length;
        promoScroll.current?.scrollTo({ x: next * promoWidth, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [promoWidth]);

  const fmtDate = (d) =>
    d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) + ' • 10:00 AM';

  return (
    <ScreenWrapper>
      <View style={styles.root}>
        {/* ===== FIXED TOP: header + membership status (never scroll) ===== */}
        <View style={styles.fixedTop}>
          <Text style={styles.headerTitle}>Society Hub</Text>
          <Text style={styles.headerSub}>Standard Mutual Cooperative Community</Text>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconCircle}>
                <Shield size={22} color={colors.primary} />
              </View>
              <View style={styles.textGroup}>
                <Text style={styles.title}>Membership Status</Text>
                <Text style={styles.sub}>Verified Member • ID: #IOS-8842</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ===== SCROLLABLE BELOW: announcements, governance, promos ===== */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Upcoming meeting / live assembly banner */}
        <TouchableOpacity
          style={[styles.card, live && styles.liveCard]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('PastMeetings')}
        >
          <View style={styles.row}>
            <View style={[styles.iconCircle, live && styles.liveIconCircle]}>
              {live ? <Radio size={22} color='#fff' /> : <CalendarClock size={22} color={colors.primary} />}
            </View>
            <View style={styles.textGroup}>
              {live ? (
                <>
                  <Text style={styles.liveTitle}>General Assembly is LIVE</Text>
                  <Text style={styles.sub}>Tap to join the virtual meeting now</Text>
                </>
              ) : (
                <>
                  <Text style={styles.title}>Upcoming General Meeting</Text>
                  <Text style={styles.sub}>
                    {nextMeeting ? fmtDate(nextMeeting) : 'Schedule to be announced'}
                  </Text>
                </>
              )}
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </View>
          {live && (
            <TouchableOpacity
              style={styles.joinBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('VirtualMeetingRoom', { roomId: 'mgm-monthly-general-meeting' })}
            >
              <Text style={styles.joinBtnTxt}>Join Live Assembly</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Announcements & News (Supabase-backed via AnnouncementsContext) */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Megaphone size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Announcements & News</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AnnouncementsFeed')} hitSlop={8}>
              <Text style={styles.sectionLink}>View all</Text>
            </TouchableOpacity>
          </View>
          {latestAnnouncements.length > 0 ? (
            latestAnnouncements.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('AnnouncementsFeed')}
              >
                <Text style={styles.annTitle} numberOfLines={1}>{a.title}</Text>
                {!!a.message && <Text style={styles.annBody} numberOfLines={2}>{a.message}</Text>}
                <Text style={styles.annMeta}>
                  {a.author} • {new Date(a.createdAt).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.card}>
              <Text style={styles.annTitle}>Next General Meeting</Text>
              <Text style={styles.annBody}>
                {nextMeeting ? fmtDate(nextMeeting) : 'Schedule to be announced'} — all members are expected to attend.
              </Text>
              <Text style={styles.annMeta}>Official cooperative update</Text>
            </View>
          )}
        </View>

        {/* Co-op documents & resources */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <FileText size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Governance & Resources</Text>
          </View>
          <View style={styles.docGrid}>
            {DOCUMENTS.map(({ id, icon: Icon, title, url }) => (
              <TouchableOpacity
                key={id}
                style={styles.docCard}
                activeOpacity={0.85}
                onPress={() => openExternalLink(url)}
              >
                <Icon size={20} color={colors.primary} />
                <Text style={styles.docTitle}>{title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Internal promo carousel (auto-sliding) */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Landmark size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Internal Opportunities</Text>
          </View>
          <ScrollView
            ref={promoScroll}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.promoScroll}
            onMomentumScrollEnd={(e) => {
              const i = Math.round(e.nativeEvent.contentOffset.x / promoWidth);
              if (PROMOS[i]) setPromoIndex(i);
            }}
          >
            {PROMOS.map(({ id, icon: Icon, title, sub, tint }) => (
              <View key={id} style={[styles.promoCard, { width: promoWidth, backgroundColor: tint }]}>
                <View style={styles.promoIconWrap}>
                  <Icon size={22} color='#fff' />
                </View>
                <Text style={styles.promoTitle}>{title}</Text>
                <Text style={styles.promoSub}>{sub}</Text>
                <View style={styles.promoDots}>
                  {PROMOS.map((p, i) => (
                    <View key={p.id} style={[styles.dot, i === promoIndex && styles.dotActive]} />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </ScreenWrapper>
  );
}

// All colors are theme-dynamic (styles built per render from useTheme()).
const makeStyles = (colors, isDark) =>
  StyleSheet.create({
    root: { flex: 1 },
    fixedTop: { padding: 16, paddingBottom: 0 },
    scrollContent: { padding: 16, paddingTop: 12, paddingBottom: 90 },
    headerTitle: { fontSize: 24, fontWeight: '700', color: colors.text },
    headerSub: { fontSize: 13, marginBottom: 16, color: colors.textSecondary },
    card: {
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      marginBottom: 12,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    textGroup: { flex: 1 },
    title: { fontSize: 14, fontWeight: '600', color: colors.text },
    sub: { fontSize: 11, marginTop: 2, color: colors.textSecondary },
    liveCard: { borderColor: colors.success, borderWidth: 1.5 },
    liveIconCircle: { backgroundColor: colors.success },
    liveTitle: { fontSize: 14, fontWeight: '700', color: colors.success },
    joinBtn: {
      marginTop: 12,
      backgroundColor: colors.success,
      borderRadius: 12,
      paddingVertical: 11,
      alignItems: 'center',
    },
    joinBtnTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 13, letterSpacing: 0.3 },
    section: { marginBottom: 12 },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 4 },
    sectionTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
    sectionLink: { fontSize: 12, fontWeight: '600', color: colors.primary },
    annTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
    annBody: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
    annMeta: { fontSize: 10, color: colors.textSecondary, marginTop: 6, opacity: 0.8 },
    docGrid: { flexDirection: 'row', gap: 8 },
    docCard: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingVertical: 14,
      paddingHorizontal: 8,
      alignItems: 'center',
      gap: 6,
    },
    docTitle: { fontSize: 10.5, fontWeight: '600', textAlign: 'center', color: colors.text },
    promoScroll: { borderRadius: 16, overflow: 'hidden' },
    promoCard: { borderRadius: 16, padding: 16, justifyContent: 'center', minHeight: 132 },
    promoIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    promoTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    promoSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11.5, marginTop: 3 },
    promoDots: { flexDirection: 'row', gap: 5, alignSelf: 'flex-start', marginTop: 10 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
    dotActive: { backgroundColor: '#FFFFFF', width: 14 },
  });
