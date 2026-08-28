import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import {
  Clock,
  MapPin,
  Video,
  FileText,
  ChevronRight,
  ListChecks,
} from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';

// ---------------------------------------------------------------------------
// Monthly General Meeting — detail page.
// Presentational only: agenda, schedule, join link and past minutes.
// Params: { meetingId?: string, date?: string } via route.params.
// ---------------------------------------------------------------------------
export default function MonthlyGeneralMeetingScreen({ navigation, route }) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);

  const params = route?.params ?? {};
  const schedule = params.date || '1st Sunday of next month';

  const agenda = [
    'Opening prayer & welcome address',
    "Reading of last meeting minutes",
    "Treasurer's report & savings update",
    'Loan disbursement review',
    'Member welfare discussions',
    'Closing remarks & next meeting date',
  ];

  const pastMinutes = [
    { title: 'December General Meeting', date: 'Sun, 7 Dec 2025' },
    { title: 'November General Meeting', date: 'Sun, 2 Nov 2025' },
    { title: 'October General Meeting', date: 'Sun, 5 Oct 2025' },
  ];

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
    iconCircle: [styles.iconCircle, { backgroundColor: colors.surface }],
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Monthly General Meeting"
        subtitle="Next meeting details & records"
        onBack={() => navigation?.goBack?.()}
      />
      {/* Next meeting schedule */}
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
        <Text style={s.sectionTitle}>Meeting Agenda</Text>
        <View style={[s.card, { paddingVertical: 6 }]}>
          {agenda.map((item, i) => (
            <View key={item} style={s.agendaRow}>
              <ListChecks size={14} color={colors.primary} />
              <Text style={s.agendaText}>{i + 1}. {item}</Text>
            </View>
          ))}
        </View>

        {/* Join button */}
        <TouchableOpacity style={s.joinBtn} activeOpacity={0.85}>
          <Video size={17} color={s.joinBtnText[1].color} />
          <Text style={s.joinBtnText}>Join Virtual Meeting</Text>
        </TouchableOpacity>

        {/* Past minutes */}
        <Text style={s.sectionTitle}>Past Meeting Minutes</Text>
        {pastMinutes.map((m) => (
          <TouchableOpacity key={m.title} style={s.card} activeOpacity={0.8}>
            <View style={s.iconCircle}>
              <FileText size={18} color={colors.primary} />
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
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 10, marginTop: 4 },
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
