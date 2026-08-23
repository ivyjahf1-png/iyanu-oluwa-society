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
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { Send, Bot, Sparkles } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { supabase } from '../lib/supabase';

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
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [messages, loading]);

  const askAI = async question => {
    const userMessage = (question ?? inputText).trim();
    if (!userMessage || loading) return;

    // Build the conversation history for context (excluding the welcome bubble).
    const messageHistory = messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({ role: m.sender === 'me' ? 'user' : 'model', text: m.text ?? '' }));

    const userMsg = { id: `u-${Date.now()}`, sender: 'me', text: userMessage };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('coop-ai', {
        body: { prompt: userMessage, history: messageHistory },
      });
      if (error) throw error;

      setMessages(prev => [
        ...prev,
        { id: `a-${Date.now()}`, sender: 'ai', text: data?.reply || 'No response received.' },
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor='#091813' />
      <ScreenHeader
        title="Coop AI Assistant"
        subtitle="Cooperative tasks & general knowledge"
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView style={styles.scrollView}
          ref={scrollRef}
          contentContainerStyle={[styles.messageList, styles.grow]}
          showsVerticalScrollIndicator={false}
        >
          {/* Suggestion chips */}
          <View style={styles.suggestionWrap}>
            <Sparkles size={14} color="#10B981" />
            <Text style={styles.suggestionLabel}>Try asking</Text>
          </View>
          <View style={styles.chipRow}>
            {SUGGESTIONS.map(s => (
              <TouchableOpacity key={s} style={styles.chip} onPress={() => askAI(s)}>
                <Text style={styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Messages */}
          {messages.map(msg => (
            <View
              key={msg.id}
              style={[styles.bubble, msg.sender === 'me' ? styles.bubbleMine : styles.bubbleAi]}
            >
              {msg.sender === 'ai' ? (
                <View style={styles.aiRow}>
                  <Bot size={14} color="#A7F3D0" />
                  <Text style={styles.aiTag}>COOP AI</Text>
                </View>
              ) : null}
              <Text style={styles.bubbleText}>{msg.text}</Text>
            </View>
          ))}

          {loading ? (
            <View style={[styles.bubble, styles.bubbleAi]}>
              <ActivityIndicator size="small" color="#10B981" />
            </View>
          ) : null}
        </ScrollView>

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
            onPress={() => askAI()}
            disabled={!inputText.trim() || loading}
          >
            <Send size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
});