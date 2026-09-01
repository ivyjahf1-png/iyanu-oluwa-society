import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Check, CheckCheck } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

/** WhatsApp-style delivery state for one of my own messages. */
export type MessageStatus = 'sent' | 'delivered' | 'read';

interface ChatBubbleProps {
  text: string;
  isMine: boolean;
  status?: MessageStatus;
  timestamp: string;
  /** Renders the small "Edited" sub-tag next to the timestamp. */
  edited?: boolean;
  onLongPress?: () => void;
  /** Optional extra callback fired after copy-to-clipboard succeeds. */
  onCopied?: (text: string) => void;
}

/**
 * WhatsApp-style chat bubble: long-press copies the text with a floating
 * "Copied" badge, and my own messages show delivery ticks in the meta row
 * (single grey = sent, double grey = delivered, double green = read).
 */
export default function ChatBubble({
  text,
  isMine,
  status = 'sent',
  timestamp,
  edited = false,
  onLongPress,
  onCopied,
}: ChatBubbleProps) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const [showCopied, setShowCopied] = useState(false);

  const handleLongPress = async () => {
    // Callers can override the gesture entirely (e.g. open Edit/Delete sheet).
    if (onLongPress) {
      onLongPress();
      return;
    }
    try {
      Clipboard.setString(text);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 1500);
      onCopied?.(text);
    } catch {
      // Clipboard unavailable — fail silently, the bubble stays interactive.
    }
  };

  /** Delivery ticks — only ever shown on my own messages. */
  const renderStatus = () => {
    if (!isMine) return null;
    if (status === 'read') {
      return <CheckCheck size={14} color={colors.success} style={styles.statusIcon} />;
    }
    if (status === 'delivered') {
      return <CheckCheck size={14} color={colors.textSecondary} style={styles.statusIcon} />;
    }
    return <Check size={14} color={colors.textSecondary} style={styles.statusIcon} />;
  };

  return (
    <Pressable
      onLongPress={handleLongPress}
      delayLongPress={400}
      style={({ pressed }) => [
        styles.bubbleWrapper,
        isMine ? styles.mineWrapper : styles.theirsWrapper,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.bubble, isMine ? styles.mine : styles.theirs]}>
        <Text style={styles.messageText}>{text}</Text>

        <View style={styles.metaRow}>
          {edited ? <Text style={styles.editedTag}>edited</Text> : null}
          <Text
            style={[
              styles.time,
              // Timestamps inside my own (accent/green) bubbles need extra
              // contrast: translucent white on dark bubbles, textSecondary on
              // light surfaces.
              isMine && isDark && { color: 'rgba(255,255,255,0.7)' },
              isMine && !isDark && { color: 'rgba(15,23,42,0.65)' },
            ]}
          >
            {timestamp}
          </Text>
          {renderStatus()}
        </View>

        {/* Temporary "Copied" feedback — no permanent copy icon. */}
        {showCopied ? (
          <View style={styles.copiedBadge}>
            <Text style={styles.copiedText}>Copied</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const makeStyles = (c: any, isDark: boolean) =>
  StyleSheet.create({
    bubbleWrapper: {
      marginVertical: 2,
      marginHorizontal: 10,
      maxWidth: '80%',
    },
    mineWrapper: { alignSelf: 'flex-end' },
    theirsWrapper: { alignSelf: 'flex-start' },
    pressed: { opacity: 0.85 },
    bubble: {
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      paddingBottom: 6,
    },
    mine: {
      backgroundColor: isDark ? c.primary : '#DCF8C6',
      borderBottomRightRadius: 4,
    },
    theirs: {
      backgroundColor: c.surface,
      borderBottomLeftRadius: 4,
    },
    messageText: {
      fontSize: 15,
      lineHeight: 20,
      color: c.text,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: 3,
      gap: 3,
    },
    time: {
      fontSize: 11,
      color: c.textSecondary,
    },
    editedTag: {
      fontSize: 11,
      fontStyle: 'italic',
      color: c.textSecondary,
      marginRight: 1,
    },
    statusIcon: { marginLeft: 1 },
    copiedBadge: {
      position: 'absolute',
      top: -28,
      alignSelf: 'center',
      backgroundColor: 'rgba(0,0,0,0.75)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    copiedText: { color: '#fff', fontSize: 12 },
  });
