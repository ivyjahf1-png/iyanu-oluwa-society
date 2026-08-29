import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  FlatList,
  ActivityIndicator,
  Modal,
  Alert,
  Image,
} from 'react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import {
  Bot,
  Sparkles,
  MoreVertical,
  Trash2,
  Pencil,
  Check,
  X,
  Mic,
  Send,
  Copy,
  Smile,
  Paperclip,
  Camera,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EmojiPicker from '../components/EmojiPicker';
import ScreenHeader from '../components/ScreenHeader';
import { askAI } from '../lib/aiChat';
import { toast } from '../lib/safe';
import { useTheme } from '../theme/ThemeContext';
import * as Clipboard from 'expo-clipboard';

const SUGGESTIONS = [
  'How is my loan interest calculated?',
  'What do I need to qualify for a loan?',
  'Explain weekly vs monthly savings',
  'Tell me something interesting',
];

export default function AIAssistantScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text:
        "Hi! I'm your Coop AI Assistant. Ask me anything — savings, loans, repayments, or any general question at all.",
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  // Saved sticker shelf: long-press a sticker in the picker to save it here.
  // Declared so the EmojiPicker's required prop never reads an undefined var.
  const [savedStickers, setSavedStickers] = useState([]);
  // Quick-filter category for the sticker grid ('All' | 'Hi' | 'Haha' | ...).
  // Declared so the EmojiPicker's required props never read an undefined var.
  const [activeStickerCategory, setActiveStickerCategory] = useState('All');
  // Keyboard visibility drives the safe-area bottom padding on the input dock:
  // insets.bottom only applies while the keyboard is hidden (home-gesture bar).
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  /** Append a picked emoji to the composer text (WhatsApp-style emoji tray). */
  const appendEmoji = (e) => setInputText((prev) => prev + e);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [messages, loading]);

  const handleAskAI = async question => {
    const userMessage = (question ?? inputText).trim();
    if (!userMessage || loading) return;

    // Build the conversation history for context (excluding the welcome bubble).
    // Roles follow the OpenAI convention: 'user' | 'assistant'.
    const chatHistory = messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({
        role: m.sender === 'me' ? 'user' : 'assistant',
        content: m.text ?? '',
      }));

    const userMsg = { id: `u-${Date.now()}`, sender: 'me', text: userMessage };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const reply = await askAI(userMessage, chatHistory);
      setMessages(prev => [
        ...prev,
        { id: `a-${Date.now()}`, sender: 'ai', text: reply },
      ]);
    } catch (e) {
      setMessages(prev => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          sender: 'ai',
          text: e.message || 'Something went wrong. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /** Wipe the local conversation (keeps only a fresh welcome bubble). */
  const clearChat = () => {
    setConfirmClear(false);
    setShowMenu(false);
    setEditingId(null);
    setMessages([
      {
        id: 'welcome',
        sender: 'ai',
        text:
          "Hi! I'm your Coop AI Assistant. Ask me anything — savings, loans, repayments, or any general question at all.",
      },
    ]);
  };

  /**
   * Apply an edited user message: replace its text in state, drop any later
   * turns, and re-trigger the AI response for the corrected prompt.
   */
  const applyEdit = async () => {
    const newText = editingText.trim();
    if (!newText || !editingId) return;

    const idx = messages.findIndex(m => m.id === editingId);
    if (idx === -1) return;

    // Keep everything up to & including the edited bubble; discard later turns.
    const kept = messages
      .slice(0, idx + 1)
      .map(m => (m.id === editingId ? { ...m, text: newText } : m));

    setMessages(kept);
    setEditingId(null);
    setEditingText('');
    setLoading(true);

    const history = kept
      .filter(m => m.id !== 'welcome')
      .map(m => ({
        role: m.sender === 'me' ? 'user' : 'assistant',
        content: m.text ?? '',
      }))
      .slice(0, -1); // exclude the edited turn itself — askAI adds it

    try {
      const reply = await askAI(newText, history);
      setMessages(prev => [
        ...prev,
        { id: `a-${Date.now()}`, sender: 'ai', text: reply },
      ]);
    } catch (e) {
      setMessages(prev => [
        ...prev,
        { id: `e-${Date.now()}`, sender: 'ai', text: e.message || 'Something went wrong.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /** Begin inline editing of a sent user message. */
  const startEdit = msg => {
    if (msg.sender !== 'me') return;
    setEditingId(msg.id);
    setEditingText(msg.text ?? '');
  };

  /** Copy an AI response to the clipboard with friendly feedback. */
  const handleCopyMessage = async text => {
    try {
      await Clipboard.setStringAsync(text ?? '');
      toast('Copied to clipboard', 'Message copied successfully.');
    } catch (e) {
      toast('Could not copy', 'Please copy the message manually.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      {/* ROOT FLEX LAYOUT — KeyboardAvoidingView keeps the pinned header and
          bottom input column locked in place while only messages scroll. */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScreenHeader
          title="Coop AI Assistant"
          subtitle="Cooperative tasks & general knowledge"
          onBack={() => navigation.goBack()}
        />

        {/* Top-right options menu */}
        <View style={styles.menuBar}>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setShowMenu(v => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MoreVertical size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {showMenu ? (
          <View style={styles.menuSheet}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                setShowMenu(false);
                setConfirmClear(true);
              }}
            >
              <Trash2 size={16} color={colors.danger} />
              <Text style={[styles.menuRowText, { color: colors.danger }]}>Clear Chat</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* FIXED HEADER SECTION — "Try asking..." prompt chips live OUTSIDE
            the message list so they never scroll away with chat history. */}
        <View style={styles.suggestHeader}>
          <View style={styles.suggestionWrap}>
            <Sparkles size={14} color={colors.primary} />
            <Text style={styles.suggestionLabel}>Try asking</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {SUGGESTIONS.map(s => (
              <TouchableOpacity key={s} style={styles.chip} onPress={() => handleAskAI(s)}>
                <Text style={styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* MESSAGE AREA — the ONLY vertically scrolling region */}
        <FlatList
          style={styles.scrollView}
          ref={scrollRef}
          data={messages}
          keyExtractor={(item) => item.id}
          extraData={{ editingId, editingText, loading, messages }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.messageList, styles.grow]}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.bubble, item.sender === 'me' ? styles.bubbleMine : styles.bubbleAi]}
              onLongPress={() => startEdit(item)}
              delayLongPress={300}
              disabled={loading}
            >
              {item.sender === 'ai' ? (
                <View style={styles.aiRow}>
                  <Bot size={14} color={colors.textSecondary} />
                  <Text style={styles.aiTag}>COOP AI</Text>
                </View>
              ) : null}

              {editingId === item.id ? (
                <View style={styles.editBox}>
                  <TextInput
                    style={styles.editInput}
                    value={editingText}
                    onChangeText={setEditingText}
                    multiline
                    autoFocus
                    placeholderTextColor={colors.textSecondary}
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={styles.editCancel}
                      onPress={() => {
                        setEditingId(null);
                        setEditingText('');
                      }}
                    >
                      <X size={14} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.editSave, !editingText.trim() && { opacity: 0.5 }]}
                      onPress={applyEdit}
                      disabled={!editingText.trim() || loading}
                    >
                      <Check size={14} color={colors.background} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  {item.mediaUrl ? (
                    <Image source={{ uri: item.mediaUrl }} style={styles.stickerImage} resizeMode="contain" />
                  ) : (
                    <Text selectable style={item.sender === 'me' ? styles.bubbleTextMine : styles.bubbleText}>{item.text}</Text>
                  )}
                  {item.sender === 'ai' ? (
                    <View style={styles.aiCopyRow}>
                      <TouchableOpacity
                        style={styles.copyBtn}
                        onPress={() => handleCopyMessage(item.text)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Copy size={12} color={colors.textSecondary} />
                        <Text style={styles.copyLabel}>Copy</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  {item.sender === 'me' && !loading ? (
                    <View style={styles.editHintRow}>
                      <Pencil size={10} color={colors.textSecondary} />
                      <Text style={styles.editHint}>hold to edit</Text>
                    </View>
                  ) : null}
                </>
              )}
            </TouchableOpacity>
          )}
          ListFooterComponent={
            loading ? (
              <View style={[styles.bubble, styles.bubbleAi]}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
        />

        {/* WhatsApp-style emoji / sticker tray (bottom sheet) */}
        <EmojiPicker
          inline
          visible={showEmojiPicker}
          onClose={() => setShowEmojiPicker(false)}
          onSelectEmoji={appendEmoji}
          savedStickers={savedStickers}
          activeStickerCategory={activeStickerCategory || 'All'}
          onStickerCategoryChange={setActiveStickerCategory || (() => {})}
          onSelectSticker={(url) => {
            const msgId = `stk-${Date.now()}`;
            setMessages((prev) => [...prev, {
              id: msgId, sender: 'me', text: '', mediaUrl: url,
            }]);
            setShowEmojiPicker(false);
          }}
          onLongPressSticker={(url) => {
            if (savedStickers.some((s) => s.url === url)) return;
            setSavedStickers((prev) => [...prev, { id: `saved-${Date.now()}`, url, pack: 'Saved' }]);
            toast('Sticker saved', 'Added to your saved stickers.');
          }}
          onRemoveSavedSticker={(id) => setSavedStickers((prev) => prev.filter((s) => s.id !== id))}
          onAddStickerHint={() => Alert.alert('Add Sticker', 'Sticker saving is available in Meeting Chat.')}
        />

        {/* Bottom input dock — safe-area padding only while the keyboard is
            hidden so the bar stays elevated above home gestures. */}
        <View style={[styles.inputDock, { paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 8) }]}>
          {/* WhatsApp-style composer: rounded text bar on the left (emoji,
              input, attachment, camera) + standalone circular action button. */}
          <View style={styles.inputBar}>
            <View style={styles.inputFieldRow}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  // WhatsApp behavior: keyboard collapses, docked picker appears
                  // directly above the composer — it never covers the input bar.
                  Keyboard.dismiss();
                  setShowEmojiPicker((v) => !v);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Smile size={22} color={colors.primary} />
              </TouchableOpacity>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask me anything..."
                placeholderTextColor={colors.textSecondary}
                multiline
              />
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => toast('Attachments', 'File attachments are coming soon to AI chat.')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Paperclip size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => toast('Camera', 'Photo capture is coming soon to AI chat.')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Camera size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Standalone circular action button: mic (empty) / send */}
            {inputText.trim() && !loading ? (
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={() => handleAskAI()}
                disabled={!inputText.trim() || loading}
              >
                <Send size={18} color={colors.background} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.micBtn}
                onPress={() => Alert.alert('Voice Input', 'Voice dictation is coming soon.')}
                disabled={loading}
              >
                <Mic size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Clear-chat confirmation */}
      <Modal
        visible={confirmClear}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmClear(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Trash2 size={22} color={colors.danger} />
            <Text style={styles.confirmTitle}>Clear Chat?</Text>
            <Text style={styles.confirmText}>
              This will erase the entire conversation. This cannot be undone.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setConfirmClear(false)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmOk} onPress={clearChat}>
                <Text style={styles.confirmOkText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const makeStyles = (colors) =>
  StyleSheet.create({
  scrollView: { flex: 1 },
  grow: { flexGrow: 1 },
  container: { flex: 1, backgroundColor: colors.background, overflow: 'hidden' },
  flex: { flex: 1 },
  messageList: { padding: 16, paddingBottom: 12 },
  suggestHeader: {
    paddingHorizontal: 16,
    paddingTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexShrink: 0,
  },
  suggestionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 8,
  },
  suggestionLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
    paddingRight: 16,
  },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '600',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 10,
  },
  bubbleMine: {
    backgroundColor: colors.surface,
    alignSelf: 'flex-end',
  },
  bubbleAi: {
    backgroundColor: colors.card,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  aiTag: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  bubbleText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  stickerImage: {
    width: 96,
    height: 96,
    borderRadius: 8,
  },
  bubbleTextMine: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  inputDock: {
    flexShrink: 0,
    paddingHorizontal: 0,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginHorizontal: 12,
    flexShrink: 0,
  },
  inputFieldRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  iconBtn: { padding: 4 },
  textInput: { flex: 1, color: colors.text, fontSize: 14, maxHeight: 120, paddingVertical: 8, paddingHorizontal: 4 },
  micBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: colors.border },
  // Options menu
  menuBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 2 },
  menuBtn: { padding: 4 },
  menuSheet: {
    position: 'absolute',
    top: 96,
    right: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
    width: 170,
    zIndex: 20,
    elevation: 8,
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 14 },
  menuRowText: { color: colors.danger, fontSize: 13, fontWeight: '600' },

  // Inline message editing
  editBox: { minWidth: 180 },
  editInput: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    backgroundColor: colors.inputBackground,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 6,
  },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  editCancel: { padding: 5 },
  editSave: { backgroundColor: colors.primary, borderRadius: 8, padding: 5 },
  editHintRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4, alignSelf: 'flex-end' },
  editHint: { color: colors.textSecondary, fontSize: 9 },

  // AI response copy action
  aiCopyRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 4 },
  copyLabel: { color: colors.textSecondary, fontSize: 10 },

  // Clear-chat confirmation
  confirmOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 330,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    alignItems: 'center',
  },
  confirmTitle: { color: colors.text, fontSize: 17, fontWeight: 'bold', marginTop: 10 },
  confirmText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  confirmActions: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
  confirmCancel: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  confirmCancelText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
  confirmOk: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.danger, alignItems: 'center' },
  confirmOkText: { color: colors.background, fontWeight: 'bold', fontSize: 13 },
});