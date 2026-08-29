import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Send, Paperclip, Smile, Camera, Mic } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

/**
 * WhatsApp-style message composer.
 *
 * Layout (left → right): rounded text bar [emoji → input → attachment → camera]
 * + standalone circular action button (mic when empty, send when typing).
 *
 * NOTE: the parent screen is responsible for keyboard avoidance and
 * safe-area insets — this bar renders as a plain flex child so it can sit
 * inside an existing KeyboardAvoidingView dock without double-padding.
 */
interface AssemblyMessageInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onEmojiPress: () => void;
  onAttachmentPress?: () => void;
  onCameraPress?: () => void;
  /** Voice-note press-and-hold gestures (rendered when no text). */
  onMicTouchStart?: (e: any) => void;
  onMicTouchMove?: (e: any) => void;
  onMicTouchEnd?: (e: any) => void;
  onMicTouchCancel?: (e: any) => void;
  isRecording?: boolean;
  /** Editing mode: send button commits the edit, placeholder updates. */
  editing?: boolean;
}

export default function AssemblyMessageInput({
  value,
  onChangeText,
  onSend,
  onEmojiPress,
  onAttachmentPress,
  onCameraPress,
  onMicTouchStart,
  onMicTouchMove,
  onMicTouchEnd,
  onMicTouchCancel,
  isRecording = false,
  editing = false,
}: AssemblyMessageInputProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const hasText = value.trim().length > 0;

  const handleSend = () => {
    if (hasText || editing) onSend();
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        {/* Rounded text bar: emoji → input → attachment → camera */}
        <View style={[styles.inputWrapper, isFocused && styles.inputWrapperFocused]}>
          <TouchableOpacity style={styles.iconBtn} onPress={onEmojiPress}>
            <Smile size={22} color={colors.primary} />
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            style={styles.textInput}
            placeholder={editing ? 'Update your message...' : 'Message'}
            placeholderTextColor={colors.textSecondary}
            value={value}
            onChangeText={onChangeText}
            multiline
            maxLength={2000}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            blurOnSubmit={false}
            textAlignVertical="center"
          />

          {onAttachmentPress ? (
            <TouchableOpacity style={styles.iconBtn} onPress={onAttachmentPress}>
              <Paperclip size={20} color={colors.primary} />
            </TouchableOpacity>
          ) : null}

          {onCameraPress ? (
            <TouchableOpacity style={styles.iconBtn} onPress={onCameraPress}>
              <Camera size={22} color={colors.primary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Standalone circular action button: mic (empty) / send (or commit edit) */}
        {hasText || editing ? (
          <TouchableOpacity
            style={[styles.sendBtn, styles.sendBtnActive]}
            onPress={handleSend}
          >
            <Send size={20} color={colors.background} />
          </TouchableOpacity>
        ) : (
          <View
            style={[styles.sendBtn, isRecording && styles.sendBtnRecording]}
            onTouchStart={onMicTouchStart}
            onTouchMove={onMicTouchMove}
            onTouchEnd={onMicTouchEnd}
            onTouchCancel={onMicTouchCancel}
          >
            <Mic size={20} color={colors.text} />
          </View>
        )}
      </View>
    </View>
  );
}

const makeStyles = (c: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: c.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      paddingHorizontal: 8,
      paddingTop: 6,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 6,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    inputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
      backgroundColor: c.card,
      borderRadius: 24,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 10 : 6,
      minHeight: 44,
      maxHeight: 120,
      borderWidth: 1,
      borderColor: c.border,
    },
    inputWrapperFocused: {
      borderColor: c.primary,
    },
    textInput: {
      flex: 1,
      fontSize: 16,
      lineHeight: 22,
      color: c.text,
      paddingTop: 0,
      paddingBottom: 0,
      maxHeight: 100,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendBtnActive: {
      backgroundColor: c.primary,
    },
    sendBtnRecording: {
      backgroundColor: c.danger,
    },
  });
