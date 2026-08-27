import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { Send, Bot, Sparkles, MoreVertical, Trash2, Pencil, Check, X } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { askAI } from '../lib/aiChat';

const SUGGESTIONS = [
  'How is my loan interest calculated?',
  'What do I need to qualify for a loan?',
  'Explain weekly vs monthly savings',
  'Tell me something interesting',
];

export default function AIAssistantScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
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
  const scrollRef = useRef(null);

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor='#091813' />
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
          <MoreVertical size={20} color="#A7F3D0" />
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
            <Trash2 size={16} color="#F87171" />
            <Text style={[styles.menuRowText, { color: '#F87171' }]}>Clear Chat</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <FlatList
          style={styles.scrollView}
          ref={scrollRef}
          data={messages}
          keyExtractor={(item) => item.id}
          extraData={{ editingId, editingText, loading, messages }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.messageList, styles.grow]}
          ListHeaderComponent={
            <>
              {/* Suggestion chips */}
              <View style={styles.suggestionWrap}>
                <Sparkles size={14} color="#10B981" />
                <Text style={styles.suggestionLabel}>Try asking</Text>
              </View>
              <View style={styles.chipRow}>
                {SUGGESTIONS.map(s => (
                  <TouchableOpacity key={s} style={styles.chip} onPress={() => handleAskAI(s)}>
                    <Text style={styles.chipText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          }
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
                  <Bot size={14} color="#A7F3D0" />
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
                    placeholderTextColor="#526E63"
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={styles.editCancel}
                      onPress={() => {
                        setEditingId(null);
                        setEditingText('');
                      }}
                    >
                      <X size={14} color="#9CB8A6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.editSave, !editingText.trim() && { opacity: 0.5 }]}
                      onPress={applyEdit}
                      disabled={!editingText.trim() || loading}
                    >
                      <Check size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={styles.bubbleText}>{item.text}</Text>
                  {item.sender === 'me' && !loading ? (
                    <View style={styles.editHintRow}>
                      <Pencil size={10} color="#64748B" />
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
                <ActivityIndicator size="small" color="#10B981" />
              </View>
            ) : null
          }
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me anything..."
            placeholderTextColor="#526E63"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={() => handleAskAI()}
            disabled={!inputText.trim() || loading}
          >
            <Send size={18} color="#FFFFFF" />
          </TouchableOpacity>
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
            <Trash2 size={22} color="#F87171" />
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
const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  grow: { flexGrow: 1 },
  container: { flex: 1, backgroundColor: '#091813' },
  flex: { flex: 1 },
  messageList: { padding: 16, paddingBottom: 12 },
  suggestionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  suggestionLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    backgroundColor: '#0D1D18',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: {
    color: '#127A41',
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
    backgroundColor: '#091813',
    alignSelf: 'flex-end',
  },
  bubbleAi: {
    backgroundColor: '#0D1D18',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#172F27',
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  aiTag: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  bubbleText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 19,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#0D1D18',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#172F27',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginBottom: 10,
    gap: 8,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    maxHeight: 90,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#B9D6BC',
  },
  // Options menu
  menuBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  menuBtn: { padding: 4 },
  menuSheet: {
    position: 'absolute',
    top: 96,
    right: 16,
    backgroundColor: '#132620',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1C4A2E',
    paddingVertical: 4,
    width: 170,
    zIndex: 20,
    elevation: 8,
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 14 },
  menuRowText: { fontSize: 13, fontWeight: '600' },

  // Inline message editing
  editBox: { minWidth: 180 },
  editInput: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 6,
  },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  editCancel: { padding: 5 },
  editSave: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    padding: 5,
  },
  editHintRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4, alignSelf: 'flex-end' },
  editHint: { color: '#64748B', fontSize: 9 },

  // Clear-chat confirmation
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 330,
    backgroundColor: '#0D1D18',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1C4A2E',
    padding: 22,
    alignItems: 'center',
  },
  confirmTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: 'bold', marginTop: 10 },
  confirmText: {
    color: '#9CB8A6',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  confirmActions: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
  confirmCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1C4A2E',
    alignItems: 'center',
  },
  confirmCancelText: { color: '#9CB8A6', fontWeight: '600', fontSize: 13 },
  confirmOk: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#DC2626', alignItems: 'center' },
  confirmOkText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
});