import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Linking,
} from 'react-native';
import {
  Clock,
  MapPin,
  FileText,
  Users,
  Download,
  Share2,
} from 'lucide-react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';

/**
 * Meeting Minutes Detail screen.
 *
 * Route params (AppParamList['MeetingMinutesDetail']):
 *   meetingId: string
 *   title: string
 *   date: string
 *   agendaItems: string[]
 *   attendanceCount: number
 *   documentUrl?: string
 */
export default function MeetingMinutesDetailScreen({ navigation: rawNav, route }) {
  const navigation = useSafeNavigation(rawNav);
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);

  const params = route?.params ?? {};
  const {
    meetingId,
    title = 'Meeting Minutes',
    date = 'N/A',
    agendaItems = [],
    attendanceCount = 0,
    documentUrl,
  } = typeof params === 'object' && params ? params : {};

  const openDocument = () => {
    if (documentUrl) Linking.openURL(documentUrl);
  };

  const shareDocument = () => {
    // Placeholder share action — no API call.
  };

  const s = {
    container: [styles.container, { backgroundColor: colors.background }],
    card: [styles.card, { backgroundColor: colors.card, borderColor: colors.border }],
    sectionTitle: [styles.sectionTitle, { color: colors.text }],
    label: [styles.label, { color: colors.textSecondary }],
    value: [styles.value, { color: colors.text }],
    meta: [styles.meta, { color: colors.textSecondary }],
    agendaRow: [styles.agendaRow, { backgroundColor: colors.surface }],
    agendaText: [styles.agendaText, { color: colors.text }],
    actionBtn: [styles.actionBtn, { backgroundColor: colors.primary }],
    actionBtnText: [styles.actionBtnText, { color: colors.background }],
    docBtn: [styles.docBtn, { backgroundColor: colors.surface, borderColor: colors.border }],
    docBtnText: [styles.docBtnText, { color: colors.textSecondary }],
  };

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader
        title="Meeting Minutes"
        subtitle={title}
        onBack={() => navigation?.goBack?.()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Identity card */}
        <View style={s.card}>
          <Text style={s.label}>Meeting Title</Text>
          <Text style={s.value}>{title}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Clock size={14} color={colors.textSecondary} />
              <Text style={s.meta}>{date}</Text>
            </View>
            <View style={styles.metaItem}>
              <Users size={14} color={colors.textSecondary} />
              <Text style={s.meta}>{attendanceCount} attendees</Text>
            </View>
            {meetingId ? <Text style={s.meta}>ID: {meetingId}</Text> : null}
          </View>
        </View>

        {/* Agenda items */}
        <Text style={s.sectionTitle}>Agenda Items</Text>
        <View style={[s.card, { paddingVertical: 6 }]}>
          {agendaItems.map((item, i) => (
            <View key={`${title}-agenda-${i}`} style={s.agendaRow}>
              <FileText size={14} color={colors.primary} />
              <Text style={s.agendaText}>{i + 1}. {item}</Text>
            </View>
          ))}
          {agendaItems.length === 0 ? (
            <Text style={s.meta}>No agenda items recorded.</Text>
          ) : null}
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={s.actionBtn} onPress={openDocument}>
            <Download size={16} color={s.actionBtnText[1].color} />
            <Text style={s.actionBtnText}>View Document</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.docBtn} onPress={shareDocument}>
            <Share2 size={16} color={colors.textSecondary} />
            <Text style={s.docBtnText}>Share</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors, isDark) =>
  StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 16, paddingBottom: 40 },
    card: { borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 12 },
    sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 10, marginTop: 4 },
    label: { fontSize: 12 },
    value: { fontSize: 18, fontWeight: '700', marginTop: 4 },
    metaRow: { flexDirection: 'row', gap: 16, marginTop: 10, flexWrap: 'wrap' },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    meta: { fontSize: 11 },
    agendaRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, marginBottom: 6,
    },
    agendaText: { fontSize: 12.5, flex: 1 },
    actionsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
    actionBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 6, borderRadius: 14, paddingVertical: 12,
    },
    actionBtnText: { fontSize: 13, fontWeight: 'bold' },
    docBtn: {
      alignItems: 'center', justifyContent: 'center', gap: 4,
      borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1,
    },
    docBtnText: { fontSize: 11 },
  });

const styles = makeStyles(themes.darkEmerald, true);

