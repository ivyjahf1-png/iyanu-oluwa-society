import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Video, Mic, MicOff, VideoOff, Phone } from 'lucide-react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';

/**
 * Virtual Meeting Room screen.
 *
 * Route params (AppParamList['VirtualMeetingRoom']):
 *   roomId: string
 *   roomTitle: string
 *   hostName: string
 *   isVideoEnabled: boolean
 *   isAudioEnabled: boolean
 */
export default function VirtualMeetingRoomScreen({ navigation: rawNav, route }) {
  const navigation = useSafeNavigation(rawNav);
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);

  const params = route?.params ?? {};
  const {
    roomId,
    roomTitle = 'Virtual Meeting',
    hostName = 'Host',
    isVideoEnabled: initialVideo = true,
    isAudioEnabled: initialAudio = true,
  } = typeof params === 'object' && params ? params : {};

  const [videoOn, setVideoOn] = useState(!!initialVideo);
  const [audioOn, setAudioOn] = useState(!!initialAudio);
  const [speakerOn, setSpeakerOn] = useState(true);

  const toggleVideo = () => setVideoOn(v => !v);
  const toggleAudio = () => setAudioOn(a => !a);
  const toggleSpeaker = () => setSpeakerOn(s => !s);
  const endCall = () => navigation?.goBack?.();

  const participants = [
    { id: 'host', name: hostName },
    { id: 'p1', name: 'You' },
    { id: 'p2', name: 'Member' },
  ];

  // Theme-aware overrides.
  const s = {
    container: [styles.container, { backgroundColor: colors.background }],
    headerBox: [styles.headerBox, { backgroundColor: colors.card, borderColor: colors.border }],
    roomTitle: [styles.roomTitle, { color: colors.text }],
    roomMeta: [styles.roomMeta, { color: colors.textSecondary }],
    avatar: [styles.avatar, { backgroundColor: colors.surface }],
    avatarText: [styles.avatarText, { color: colors.textSecondary }],
    nameText: [styles.nameText, { color: colors.text }],
    controlBtn: [styles.controlBtn, { backgroundColor: colors.surface }],
    controlLabel: [styles.controlLabel, { color: colors.textSecondary }],
    endCallBtn: [styles.endCallBtn, { backgroundColor: colors.danger }],
    endCallText: [styles.endCallText, { color: colors.background }],
    controlActive: { backgroundColor: colors.primary },
  };

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader
        title={roomTitle}
        subtitle={`Room ${roomId || '—'}`}
        onBack={endCall}
      />

      {/* Room header */}
      <View style={s.headerBox}>
        <Text style={s.roomTitle}>{roomTitle}</Text>
        <Text style={s.roomMeta}>Host: {hostName} · {participants.length} participants</Text>
      </View>

      {/* Participant avatars */}
      <View style={styles.avatarRow}>
        {participants.map(p => (
          <View key={p.id} style={styles.participant}>
            <View style={s.avatar}>
              {p.avatar ? null : (
                <Text style={s.avatarText}>{(p.name || 'U').charAt(0).toUpperCase()}</Text>
              )}
            </View>
            <Text style={s.nameText} numberOfLines={1}>{p.name}</Text>
          </View>
        ))}
      </View>

            {/* Full-screen video placeholder area */}
      <View style={styles.videoStage}>
        {!videoOn ? (
          <VideoOff size={64} color={colors.textSecondary} />
        ) : (
          <Video size={64} color={colors.primary} />
        )}
      </View>

      {/* Bottom control bar */}
      <View style={styles.controlBar}>
        <TouchableOpacity style={s.controlBtn} onPress={toggleSpeaker}>
          <Text style={s.controlLabel}>Speaker</Text>
          <View style={[styles.speakerDot, { backgroundColor: speakerOn ? colors.primary : colors.textSecondary }]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.controlBtn, audioOn ? s.controlActive : null]}
          onPress={toggleAudio}
        >
          {audioOn ? <MicOff size={22} color={colors.background} /> : <Mic size={22} color={colors.text} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.controlBtn, videoOn ? s.controlActive : null]}
          onPress={toggleVideo}
        >
          {videoOn ? <VideoOff size={22} color={colors.background} /> : <Video size={22} color={colors.text} />}
        </TouchableOpacity>

        <TouchableOpacity style={s.endCallBtn} onPress={endCall}>
          <Phone size={22} color={s.endCallText[1].color} />
          <Text style={s.endCallText}>End</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors, isDark) =>
  StyleSheet.create({
    container: { flex: 1 },
    headerBox: { margin: 16, padding: 14, borderRadius: 14, borderWidth: 1 },
    roomTitle: { fontSize: 18, fontWeight: '700' },
    roomMeta: { fontSize: 12, marginTop: 4 },
    avatarRow: {
      flexDirection: 'row', alignItems: 'center', gap: 16,
      paddingHorizontal: 16, marginBottom: 10, flexWrap: 'wrap',
    },
    participant: { alignItems: 'center', width: 64 },
    avatar: {
      width: 46, height: 46, borderRadius: 23,
      alignItems: 'center', justifyContent: 'center', marginBottom: 4,
    },
    avatarText: { fontSize: 17, fontWeight: '700' },
    nameText: { fontSize: 11, textAlign: 'center', flexShrink: 1 },
    videoStage: {
      flex: 1, margin: 16, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
    },
    controlBar: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 12,
      padding: 10, borderTopWidth: 1,
    },
    controlBtn: {
      width: 46, height: 46, borderRadius: 23, padding: 6,
      alignItems: 'center', justifyContent: 'center',
    },
    controlLabel: { fontSize: 10, marginTop: 2 },
    speakerDot: { width: 8, height: 8, borderRadius: 4, marginTop: 2 },
    endCallBtn: {
      width: 56, height: 56, borderRadius: 28,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    },
    endCallText: { fontSize: 12, fontWeight: 'bold' },
  });

const styles = makeStyles(themes.darkEmerald, true);

