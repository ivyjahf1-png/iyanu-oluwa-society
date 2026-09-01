import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Audio } from 'expo-av';
import { Pause, Play } from 'lucide-react-native';

interface AudioBubbleProps {
  uri: string;
  /** Pre-recorded duration label (e.g. "0:03") from the DB, used as a fallback. */
  durationLabel?: string;
  isMine: boolean;
  primaryColor: string;
}

/**
 * Playable voice-note bubble built on expo-av.
 *
 * - Loads the audio URI as an expo-av Sound and exposes Play / Pause.
 * - Tracks playback position with onPlaybackStatusUpdate so the progress bar
 *   and elapsed time stay in sync.
 * - Unloads the sound on unmount to avoid leaking native resources.
 */
export default function AudioBubble({
  uri,
  durationLabel,
  isMine,
  primaryColor,
}: AudioBubbleProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  // Load the sound once on mount; unload on unmount.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { sound: s } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: false },
          onStatus,
        );
        if (mounted) setSound(s);
      } catch (e) {
        console.warn('[AudioBubble] load failed:', (e as Error).message);
      }
    })();
    return () => {
      mounted = false;
      sound?.unloadAsync().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  const onStatus = (status: any) => {
    if (!status || !status.isLoaded) return;
    setPositionMs(status.positionMillis ?? 0);
    if (status.durationMillis) setDurationMs(status.durationMillis);
    setPlaying(status.isPlaying ?? false);
    // Reset position when playback finishes.
    if (status.didJustFinish) {
      setPositionMs(0);
      setPlaying(false);
    }
  };

  const toggle = async () => {
    if (!sound) return;
    try {
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) return;
      if (status.isPlaying) {
        await sound.pauseAsync();
      } else {
        // If we finished earlier, restart from the top.
        if (status.positionMillis && status.durationMillis
            && status.positionMillis >= status.durationMillis - 100) {
          await sound.setPositionAsync(0);
        }
        await sound.playAsync();
      }
    } catch (e) {
      console.warn('[AudioBubble] toggle failed:', (e as Error).message);
    }
  };

  const total = durationMs || parseLabel(durationLabel);
  const progress = total > 0 ? Math.min(1, positionMs / total) : 0;
  const elapsed = fmt(positionMs);
  const remaining = fmt(Math.max(0, total - positionMs));

  return (
    <View style={[styles.row, isMine ? styles.mine : styles.theirs]}>
      <TouchableOpacity
        onPress={toggle}
        style={[styles.btn, { backgroundColor: isMine ? 'rgba(255,255,255,0.25)' : primaryColor + '22' }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {playing
          ? <Pause size={18} color={isMine ? '#FFFFFF' : primaryColor} />
          : <Play  size={18} color={isMine ? '#FFFFFF' : primaryColor} />}
      </TouchableOpacity>

      {/* Progress track */}
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${progress * 100}%`, backgroundColor: isMine ? '#FFFFFF' : primaryColor },
          ]}
        />
      </View>

      <Text style={[styles.time, { color: isMine ? 'rgba(255,255,255,0.9)' : 'rgba(15,23,42,0.6)' }]}>
        {playing || positionMs > 0 ? `${elapsed} / ${remaining}` : (durationLabel || '0:00')}
      </Text>
    </View>
  );
}

/** mm:ss from a millisecond value. */
function fmt(ms: number): string {
  const totalSec = Math.floor((ms || 0) / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Parse a "m:ss" label into milliseconds (fallback when duration unknown). */
function parseLabel(label?: string): number {
  if (!label) return 0;
  const parts = label.split(':');
  if (parts.length !== 2) return 0;
  const [m, s] = parts.map((p) => parseInt(p, 10));
  if (Number.isNaN(m) || Number.isNaN(s)) return 0;
  return (m * 60 + s) * 1000;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 180,
  },
  mine: { justifyContent: 'flex-end' },
  theirs: { justifyContent: 'flex-start' },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(15,23,42,0.12)',
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
  time: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    minWidth: 56,
    textAlign: 'right',
  },
});
