import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Mic, MicOff, VideoOff, Phone, Lock, Video, CalendarClock, Clock } from 'lucide-react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';
import { WebView } from 'react-native-webview';

/**
 * Virtual Meeting Room screen - powered by a live Jitsi Meet room.
 *
 * On web (the Vercel deployment) the room is rendered through the Jitsi
 * IFrame API so members get a real, interactive video conference with
 * Jitsi's native controls (mute mic, toggle camera, end/hangup call).
 * On native, Jitsi's full SDK is not bundled, so we keep the lightweight
 * placeholder room (remote/media controls still toggle local state).
 *
 * Route params:
 *   roomId, roomTitle, hostName, isVideoEnabled, isAudioEnabled
 */
const JITSI_DOMAIN = 'meet.jit.si';
const EXTERNAL_API_URL = 'https://meet.jit.si/external_api.js';

export default function VirtualMeetingRoomScreen({ navigation: rawNav, route }) {
  const navigation = useSafeNavigation(rawNav);
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const { userEmail, displayName: authDisplayName } = useAuth();
  const { user } = useUser();

  const params = route?.params ?? {};
  const {
    roomId = 'mgm-monthly-general-meeting',
    roomTitle = 'Virtual Meeting',
    hostName = 'Host',
    isVideoEnabled: initialVideo = true,
    isAudioEnabled: initialAudio = true,
    // Member time-lock params:
    meetingDate = null,      // ISO timestamp — room stays locked until then
    agenda = null,           // string or array of agenda items set by admin
    forceUnlocked = false,   // admin can open the room early
  } = typeof params === 'object' && params ? params : {};

  const [videoOn, setVideoOn] = useState(!!initialVideo);
  const [audioOn, setAudioOn] = useState(!!initialAudio);
  const [joining, setJoining] = useState(true);
  const containerRef = useRef(null);
  const apiRef = useRef(null);

  // Pre-join gate: members first see the meeting details; the Join button is
  // time-locked until the scheduled meetingDate (or an admin early-open).
  const [stage, setStage] = useState('detail'); // 'detail' | 'room'
  const meetingTs = useMemo(
    () => (meetingDate ? new Date(meetingDate).getTime() : null),
    [meetingDate],
  );
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const isLocked = !!meetingTs && !forceUnlocked && now < meetingTs;
  const countdown = useMemo(() => {
    if (!isLocked) return null;
    const ms = meetingTs - now;
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }, [isLocked, meetingTs, now]);
  const agendaItems = useMemo(() => {
    if (Array.isArray(agenda)) return agenda.filter(Boolean);
    if (typeof agenda === 'string' && agenda.trim())
      return agenda.split(/[•\n;]|,(?=\s*[A-Z])/).map((x) => x.trim()).filter(Boolean);
    return [];
  }, [agenda]);

  const isWeb = Platform.OS === 'web';

  // Logged-in member's display name for the Jitsi participant tile.
  const memberName = useMemo(() => {
    const saved =
      user?.fullName && user.fullName !== 'Temitope Adewale' ? user.fullName : null;
    return (
      saved || authDisplayName || (userEmail ? userEmail.split('@')[0] : hostName) || 'Member'
    );
  }, [user?.fullName, authDisplayName, userEmail, hostName]);

  // Native fallback: an inline HTML page that embeds the Jitsi room in an
  // iframe with camera + microphone permissions granted to the frame.
  const roomUrl = `https://${JITSI_DOMAIN}/${roomId}`;
  const jitsiHtml = useMemo(() => {
    const hash = `#userInfo.displayName=${encodeURIComponent(memberName)}`;
    return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body { margin: 0; padding: 0; height: 100%; background: #000; overflow: hidden; }
      iframe { width: 100%; height: 100%; border: 0; }
    </style>
  </head>
  <body>
    <iframe
      src="${roomUrl}${hash}"
      allow="camera; microphone; fullscreen; display-capture; autoplay"
      allowfullscreen="true"
      webkitallowfullscreen="true"
      mozallowfullscreen="true"
    ></iframe>
  </body>
</html>`;
  }, [roomUrl, memberName]);

  const toggleVideo = () => {
    setVideoOn((v) => {
      const n = !v;
      try { apiRef.current?.executeCommand('setVideoMuted', !n); } catch { /* pre-join */ }
      return n;
    });
  };
  const toggleAudio = () => {
    setAudioOn((a) => {
      const n = !a;
      try { apiRef.current?.executeCommand('setAudioMuted', !n); } catch { /* pre-join */ }
      return n;
    });
  };
  const endCall = () => {
    try { apiRef.current?.dispose(); } catch { /* never created */ }
    apiRef.current = null;
    navigation?.goBack?.();
  };
// Embed the live Jitsi Meet iframe on web via the IFrame API.
  useEffect(() => {
    if (!isWeb || stage !== 'room') { setJoining(false); return; }
    let cancelled = false;
    (async () => {
      // Load the external API script once.
      if (typeof window !== 'undefined' && !window.JitsiMeetExternalAPI) {
        try {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = EXTERNAL_API_URL;
            s.async = true;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
          });
        } catch (e) {
          console.warn('[jitsi] external api script failed to load', e);
          if (!cancelled) setJoining(false);
          return;
        }
      }
      if (cancelled) return;
      const API = window.JitsiMeetExternalAPI;
      if (!API) { if (!cancelled) setJoining(false); return; }
      await new Promise((r) => setTimeout(r, 50));
      if (cancelled || !containerRef.current) return;

      const api = new API(JITSI_DOMAIN, {
        roomName: roomId,
        width: '100%',
        height: '100%',
        parentNode: containerRef.current,
        userInfo: { displayName: memberName },
        configOverwrite: {
          startWithAudioMuted: !audioOn,
          startWithVideoMuted: !videoOn,
          disableModeratorIndicator: true,
          prejoinConfig: { enabled: false },
          toolbarButtons: [
            'microphone', 'camera', 'desktop', 'fullscreen',
            'chat', 'raisehand', 'videoquality', 'tileview', 'settings', 'hangup',
          ],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'desktop', 'fullscreen',
            'chat', 'raisehand', 'videoquality', 'tileview', 'settings', 'hangup',
          ],
        },
      });
      apiRef.current = api;
      if (!cancelled) setJoining(false);

      api.addListener('videoConferenceJoined', () => {
        try {
          api.executeCommand('setVideoMuted', !videoOn);
          api.executeCommand('setAudioMuted', !audioOn);
        } catch { /* ignore */ }
      });
    })();

    return () => {
      cancelled = true;
      try { apiRef.current?.dispose(); } catch { /* ignore */ }
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWeb, roomId, memberName, stage]);

  // Keep remote Jitsi toggle in sync with local state.
  useEffect(() => {
    try {
      apiRef.current?.executeCommand('setVideoMuted', !videoOn);
      apiRef.current?.executeCommand('setAudioMuted', !audioOn);
    } catch { /* not joined yet */ }
  }, [videoOn, audioOn]);

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
const participants = [
    { id: 'host', name: hostName },
    { id: 'p1', name: 'You' },
    { id: 'p2', name: 'Member' },
  ];

  // ---- Pre-join detail stage: meeting info + time-locked join button ----
  if (stage === 'detail') {
    const scheduled = meetingTs ? new Date(meetingTs) : null;
    return (
      <SafeAreaView style={s.container}>
        <ScreenHeader title={roomTitle} subtitle="Member Meeting Room" onBack={() => navigation?.goBack?.()} />
        <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: isLocked ? colors.border : colors.success }]}>
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: colors.surface }]}>
                <CalendarClock size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.roomTitle}>{roomTitle}</Text>
                <Text style={s.roomMeta}>
                  {scheduled
                    ? `Scheduled: ${scheduled.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • ${scheduled.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
                    : 'Schedule to be announced'}
                </Text>
              </View>
            </View>

            {agendaItems.length > 0 && (
              <View style={{ marginTop: 14 }}>
                <Text style={s.roomMeta}>Agenda</Text>
                {agendaItems.map((item, i) => (
                  <Text key={i} style={styles.agendaItem}>• {item}</Text>
                ))}
              </View>
            )}

            {/* Time-locked join button */}
            <TouchableOpacity
              style={[styles.joinRoomBtn, { backgroundColor: isLocked ? colors.surface : colors.success }, isLocked && styles.joinRoomLocked]}
              disabled={isLocked}
              activeOpacity={0.85}
              onPress={() => setStage('room')}
            >
              {isLocked ? (
                <>
                  <Lock size={18} color={colors.textSecondary} />
                  <Text style={[styles.joinRoomTxt, { color: colors.textSecondary }]}>
                    {scheduled
                      ? `Meeting Room Opens on ${scheduled.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${scheduled.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
                      : 'Meeting Room Locked'}
                  </Text>
                </>
              ) : (
                <>
                  <Video size={18} color='#FFFFFF' />
                  <Text style={styles.joinRoomTxt}>Join Virtual Meeting</Text>
                </>
              )}
            </TouchableOpacity>

            {isLocked && countdown && (
              <View style={styles.countdownRow}>
                <Clock size={14} color={colors.textSecondary} />
                <Text style={[styles.countdownTxt, { color: colors.textSecondary }]}>
                  Opens in {countdown}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title={roomTitle} subtitle={`Room ${roomId || '—'}`} onBack={endCall} />

      {isWeb ? (
        /* Live Jitsi Meet iframe fills the available space + native controls. */
        <View style={styles.webFrameWrap}>
          {joining ? (
            <Text style={s.roomMeta}>Joining room “{roomId}”…</Text>
          ) : null}
          <View
            ref={containerRef}
            style={[styles.jitsiFrame, joining && styles.hidden]}
            pointerEvents="auto"
          />
        </View>
      ) : (
        <>
          {/* Room header */}
          <View style={s.headerBox}>
            <Text style={s.roomTitle}>{roomTitle}</Text>
            <Text style={s.roomMeta}>
              Host: {hostName} · {participants.length} participants
            </Text>
          </View>

          {/* Participant avatars */}
          <View style={styles.avatarRow}>
            {participants.map((p) => (
              <View key={p.id} style={styles.participant}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{(p.name || 'U').charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={s.nameText} numberOfLines={1}>{p.name}</Text>
              </View>
            ))}
          </View>

          {/* Full-screen video placeholder area */}
          <View style={styles.videoStage}>
            {videoOn ? (
              /* Live Jitsi room embedded via an inline HTML iframe
                 (camera + microphone granted to the frame). */
              <WebView
                source={{ html: jitsiHtml, baseUrl: `https://${JITSI_DOMAIN}` }}
                style={styles.webStage}
                javaScriptEnabled
                domStorageEnabled
                mediaPlaybackRequiresUserAction={false}
                allowsFullScreen
                originWhitelist={['*']}
                onPermissionRequest={(event) => {
                  try { event.grant(event.resources); } catch { /* already granted */ }
                }}
              />
            ) : (
              <VideoOff size={64} color={colors.textSecondary} />
            )}
          </View>

          {/* Bottom control bar */}
          <View style={styles.controlBar}>
            <TouchableOpacity style={s.controlBtn} onPress={endCall}>
              <Text style={s.controlLabel}>Speaker</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[s.controlBtn, audioOn ? s.controlActive : null]} onPress={toggleAudio}>
              {audioOn ? <MicOff size={22} color={colors.background} /> : <Mic size={22} color={colors.text} />}
            </TouchableOpacity>

            <TouchableOpacity style={[s.controlBtn, videoOn ? s.controlActive : null]} onPress={toggleVideo}>
              {videoOn ? <Text style={s.controlLabel}>Video</Text> : <VideoOff size={22} color={colors.text} />}
            </TouchableOpacity>

            <TouchableOpacity style={s.endCallBtn} onPress={endCall}>
              <Phone size={22} color={s.endCallText[1].color} />
              <Text style={s.endCallText}>End</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
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
      overflow: 'hidden',
    },
    webStage: { flex: 1, width: '100%', backgroundColor: '#000' },
    controlBar: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 12,
      padding: 10, borderTopWidth: 1, borderTopColor: colors.border,
    },
    controlBtn: {
      width: 46, height: 46, borderRadius: 23, padding: 6,
      alignItems: 'center', justifyContent: 'center',
    },
    controlLabel: { fontSize: 10, marginTop: 2 },
    endCallBtn: {
      width: 56, height: 56, borderRadius: 28,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    },
    endCallText: { fontSize: 12, fontWeight: 'bold' },
    webFrameWrap: { flex: 1, marginHorizontal: 12, marginBottom: 12, position: 'relative' },
    jitsiFrame: { flex: 1, borderRadius: 14, overflow: 'hidden' },
    hidden: { opacity: 0 },
  });

const styles = makeStyles(themes.darkEmerald, true);
