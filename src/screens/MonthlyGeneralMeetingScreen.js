import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import {
  Clock,
  MapPin,
  Video,
  FileText,
  ChevronRight,
  ListChecks,
  ShieldCheck,
} from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';
import { isAdminAccount } from '../lib/adminSecurity';
import { useAuth } from '../context/AuthContext';

// ---------------------------------------------------------------------------
// Monthly General Meeting — detail page.
// Presentational only: agenda, schedule, join link and past minutes.
// Params: { meetingId?: string, date?: string } via route.params.
// ---------------------------------------------------------------------------
export default function MonthlyGeneralMeetingScreen({ navigation: rawNav, route }) {
  const navigation = useSafeNavigation(rawNav);
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const { userEmail } = useAuth();

  const params = route?.params ?? {};
  const schedule = params.date || '1st Sunday of next month';

  // Regular members see a clean agenda without admin-only items
  const agenda = [
    'Opening prayer & welcome address',
    "Reading of last meeting minutes",
    "Treasurer's report & savings update",
    'Member welfare discussions',
    'Closing remarks & next meeting date',
  ];

  // Admin-only agenda includes loan disbursement review
  const adminAgenda = [
    ...agenda.slice(0, 3),
    'Loan disbursement review',
    ...agenda.slice(3),
  ];

  const isAdmin = isAdminAccount(userEmail);
  const displayAgenda = isAdmin ? adminAgenda : agenda;

  const pastMinutes = [
    {
      id: 'mtg-dec-2025',
      title: 'December General Meeting',
      date: 'Sun, 7 Dec 2025',
      agendaItems: ['Opening prayer & welcome address', "Reading of last meeting minutes", "Treasurer's report", 'Dividend approval'],
      attendanceCount: 142,
      documentUrl: null,
    },
    {
      id: 'mtg-nov-2025',
      title: 'November General Meeting',
      date: 'Sun, 2 Nov 2025',
      agendaItems: ['Reading of last meeting minutes', 'Election of welfare commitee', 'Loan disbursement review', 'Closing remarks'],
      attendanceCount: 138,
      documentUrl: null,
    },
    {
      id: 'mtg-oct-2025',
      title: 'October General Meeting',
      date: 'Sun, 5 Oct 2025',
      agendaItems: ['Opening prayer', "Treasurer's report", 'Dividend declaration', 'Member welfare discussions'],
      attendanceCount: 127,
      documentUrl: null,
    },
  ];

  const goToMinutes = m =>
    navigation.navigate('MeetingMinutesDetail', {
      meetingId: m.id,
      title: m.title,
      date: m.date,
      agendaItems: m.agendaItems,
      attendanceCount: m.attendanceCount,
      documentUrl: m.documentUrl ?? undefined,
    });

  const startMeeting = () => {
    // Loan review meetings require admin access
    if (isAdmin && params.isLoanReview) {
      navigation.navigate('VirtualMeetingRoom', {
        roomId: 'loan-review-' + (params.meetingId || schedule),
        roomTitle: 'Loan Disbursement Review',
        hostName: params.hostName || 'Admin Host',
        isVideoEnabled: true,
        isAudioEnabled: true,
      });
      return;
    }
    navigation.navigate('VirtualMeetingRoom', {
      roomId: 'mgm-' + (params.meetingId || schedule),
      roomTitle: 'Monthly General Meeting',
      hostName: params.hostName || 'Meeting Host',
      isVideoEnabled: true,
      isAudioEnabled: true,
    });
  };

  // Theme-aware style overrides so every surface follows the active theme.
  const s = {
    card: [styles.card, { backgroundColor: colors.card, borderColor: colors.border }],
    sectionTitle: [styles.sectionTitle, { color: colors.text }],
    label: [styles.label, { color: colors.textSecondary }],
    value: [styles.value, { color: colors.text }],
    meta: [styles.meta, { color: colors.textSecondary }],
    agendaRow: [styles.agendaRow, { backgroundColor: colors.surface }],
    agendaText: [styles.agendaText, { color: colors.text }],
    rowTitle: [styles.rowTitle, { color: colors.text }],
    rowSub: [styles.rowSub, { color: colors.textSecondary }],
    joinBtn: [styles.joinBtn, { backgroundColor: colors.primary }],
    joinBtnText: [styles.joinBtnText, { color: colors.background }],
    adminBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      marginLeft: 8,
    },
    adminBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primary,
    },
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Monthly General Meeting" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <Text style={s.label}>Next Meeting</Text>
          <Text style={s.value}>{schedule}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Clock size={14} color={colors.textSecondary} />
              <Text style={s.meta}>Time: 10:00 AM</Text>
            </View>
            <View style={styles.metaItem}>
              <MapPin size={14} color={colors.textSecondary} />
              <Text style={s.meta}>Venue: Community Hall</Text>
            </View>
          </View>
        </View>

        {/* Agenda */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Text style={s.sectionTitle}>Meeting Agenda</Text>
          {isAdmin && (
            <View style={s.adminBadge}>
              <ShieldCheck size={12} color={colors.primary} />
              <Text style={s.adminBadgeText}>ADMIN</Text>
            </View>
          )}
        </View>
        <View style={[s.card, { paddingVertical: 6 }]}>
          {displayAgenda.map((item, i) => (
            <View key={item} style={s.agendaRow}>
              <ListChecks size={14} color={colors.primary} />
              <Text style={s.agendaText}>{i + 1}. {item}</Text>
            </View>
          ))}
        </View>

        {/* Join button — protected for loan review meetings */}
        <TouchableOpacity style={s.joinBtn} activeOpacity={0.85} onPress={startMeeting}>
          <Video size={17} color={s.joinBtnText[1].color} />
          <Text style={s.joinBtnText}>Join Virtual Meeting</Text>
        </TouchableOpacity>

        {/* Past minutes */}
        <Text style={s.sectionTitle}>Past Meeting Minutes</Text>
        {pastMinutes.map(m => (
          <TouchableOpacity key={m.id} style={s.card} activeOpacity={0.8} onPress={() => goToMinutes(m)}>
            <View style={s.iconCircle}>
              <FileText size={18} color={colors.primary} />

// Layout skeleton; all colors are applied dynamically in the component body.
const makeStyles = () => StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginTop: 4 },
  label: { fontSize: 12 },
  value: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { fontSize: 11 },
  agendaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 6,
  },
  agendaText: { fontSize: 12.5, flex: 1 },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 13,
    marginVertical: 6,
  },
  joinBtnText: { fontSize: 13.5, fontWeight: 'bold' },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: { flex: 1 },
  rowTitle: { fontSize: 13.5, fontWeight: '600' },
  rowSub: { fontSize: 11, marginTop: 2 },
});

const styles = makeStyles(themes.darkEmerald, true);
            </View>
            <View style={styles.textGroup}>
              <Text style={s.rowTitle}>{m.title}</Text>
              <Text style={s.rowSub}>{m.date}</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
    navigation.navigate('MeetingMinutesDetail', {
      meetingId: m.id,
      title: m.title,
      date: m.date,
      agendaItems: m.agendaItems,
      attendanceCount: m.attendanceCount,
      documentUrl: m.documentUrl ?? undefined,
    });

  const startMeeting = () => {
    // Loan review meetings require admin access
    if (isAdmin && params.isLoanReview) {
      navigation.navigate('VirtualMeetingRoom', {
        roomId: 'loan-review-' + (params.meetingId || schedule),
        roomTitle: 'Loan Disbursement Review',
        hostName: params.hostName || 'Admin Host',
        isVideoEnabled: true,
        isAudioEnabled: true,
      });
      return;
    }
    navigation.navigate('VirtualMeetingRoom', {
      roomId: 'mgm-' + (params.meetingId || schedule),
      roomTitle: 'Monthly General Meeting',
      hostName: params.hostName || 'Meeting Host',
      isVideoEnabled: true,
      isAudioEnabled: true,
    });
  };