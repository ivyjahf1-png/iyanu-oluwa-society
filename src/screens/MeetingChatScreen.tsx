import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  Modal,
  Image,
  Alert,
  GestureResponderEvent,
  SectionList,
  FlatList,
} from 'react-native';
import {
  ChevronLeft,
  Phone,
  Video,
  MoreHorizontal,
  Eye,
  EyeOff,
  Search,
  Smile,
  Paperclip,
  Camera,
  Send,
  Mic,
  Play,
  Download,
  X,
  FileText,
  Check,
  Pencil,
  Trash2,
  Plus,
  Sticker,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { storage } from '../lib/storage';
import { onMeetingMessage, broadcastMeetingMessage, MeetingMessage } from '../lib/meetingChat';
import {
  STICKER_CATEGORIES,
  DEFAULT_STICKERS,
  stickersForCategory,
} from '../data/defaultStickers';

/** Local message model used for rendering. */
interface ChatMessage {
  id: string;
  type: 'text' | 'image' | 'system' | 'voice' | 'file';
  senderId: string;
  senderName: string;
  senderPhone?: string;
  avatarUrl?: string | null;
  text?: string;
  mediaUrl?: string | null;
  fileName?: string;
  fileSize?: string;
  duration?: string;
  time: string; // "HH:MM"
  isMe: boolean;
  edited?: boolean;
}

/** Connected member profile used for member/array state. */
interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  [key: string]: any;
}

type EmojiCategory = { label: string; data: string[] };

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    label: 'Smileys',
    data: [
      '😀','😁','😂','😃','😄','😅','😆','😇','😈','😉','😊','😋','😎','😍','😘','😗','😙','😚','😛','😜',
      '😝','😠','😡','😢','😣','😥','😌','😔','😖','😫','😶','😷','😹','😺','😻','😼','🐅','🐆','🦓','🐘',
      '🦏','🐒','🐵','🐶','🐕','🐩','🦊','🐸','🐷','🐹','😺','😻','😼','🐅','🐆','🦏','🐘','🐒',
    ],
  },
  {
    label: 'Gestures',
    data: [
      '👋','👌','👍','👎','✊','👊','🤝','🙏','👏','🌟','🤟','🖐','✋','👐','🤲','🧎','🧑','👀','👂','👃',
      '👄','🙌','👉','👈','👆','👇','👋','💪','🤝','🙏','👏','🙌','👐','👍','👎','✊','👊','🤲','🧎','🙏',
    ],
  },
  {
    label: 'Animals',
    data: [
      '🐵','🐒','🦍','🦧','🐶','🐕','🦮','🐕','🐩','🐺','🦊','🐱','🐈','🦁','🐯','🐅','🐆','🦓','🐘','🦏',
      '🦛','🐪','🐫','🦒','🦘','🦬','🐄','🐮','🐂','🐃','🐷','🐖','🐗','🐽','🐏','🐑','🐝','🦋','🐛',
    ],
  },
  {
    label: 'Food',
    data: [
      '🍎','🍊','🍋','🍌','🍉','🍇','🍓','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🌽','🌶','🌰','🫘',
      '🍞','🥐','🥖','🫓','🥨','🧀','🥚','🍳','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🥪','🌮',
    ],
  },
  {
    label: 'Objects',
    data: [
      '🏠','🏡','🏢','🏣','🏥','🏦','🏧','🌉','🗽','🗼','⛪','⛩','🏛','🏠','🏬','🏭','💒','🗝️','🗯','💻',
      '🚗','🚕','🚓','🚜','🦺','🚒','🚑','🚐','🚊','🚋','🚆','🚄','✈️','🛩','🛸','🛺','🚲','🛴','🛵','⚓',
    ],
  },
  {
    label: 'Symbols',
    data: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','💥','✨','⚡','🔥','💫','⭐','🌟','🌠','✅','❌',
      '⭕','❗','❓','❔','✳️','✴️','⚇','⚡','⚛️','⃣','〰','🆕','🆔','🅰️','🆎','🅿️','♻️','✖️','✖','〽️',
    ],
  },
];

// Backwards-compatible flat list alias
const EMOJIS: string[] = EMOJI_CATEGORIES.flatMap(c => c.data);

/** Storage keys for the sticker system. */
const STICKER_STORAGE_KEY = 'meeting_chat_saved_stickers';

/** Default / bundled sticker packs (WhatsApp-style). */
type StickerPack = { name: string; stickers: { id: string; url: string }[] };

const DEFAULT_STICKER_PACKS: StickerPack[] = [
  {
    name: 'Thumbs',
    stickers: [
      { id: 'thumbs-1', url: 'https://img.icons8.com/emoji/128/thumbs-up-2_1f44d.png' },
      { id: 'thumbs-2', url: 'https://img.icons8.com/emoji/128/thumbs-up_1f44d.png' },
      { id: 'thumbs-3', url: 'https://img.icons8.com/emoji/128/middle-finger_1f918.png' },
    ],
  },
  {
    name: 'React',
    stickers: [
      { id: 'react-1', url: 'https://img.icons8.com/emoji/128/hundred-points_1f4af.png' },
      { id: 'react-2', url: 'https://img.icons8.com/emoji/128/fire_1f525.png' },
      { id: 'react-3', url: 'https://img.icons8.com/emoji/128/red-heart_2764.png' },
      { id: 'react-4', url: 'https://img.icons8.com/emoji/128/smiling-face-with-hearts_1f970.png' },
    ],
  },
  {
    name: 'Meme',
    stickers: [
      { id: 'meme-1', url: 'https://img.icons8.com/emoji/128/face-with-tears-of-joy_1f602.png' },
      { id: 'meme-2', url: 'https://img.icons8.com/emoji/128/smiling-face-with-sunglasses_1f60e.png' },
      { id: 'meme-3', url: 'https://img.icons8.com/emoji/128/disguised-face_1f978.png' },
    ],
  },
];

interface SavedSticker { id: string; url: string; pack: string; }

async function loadSavedStickers(): Promise<SavedSticker[]> {
  try {
    const raw = await storage.getItem(STICKER_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SavedSticker[];
  } catch { /* corrupted — start fresh */ }
  return [];
}

async function saveSavedStickers(stickers: SavedSticker[]): Promise<void> {
  try {
    await storage.setItem(STICKER_STORAGE_KEY, JSON.stringify(stickers));
  } catch (e) {
    console.log('[stickers] save failed:', e);
  }
}

/** Format an epoch ms into an "HH:MM" clock label. */
function nowClock(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const AVATAR_COLORS = ['#10B981', '#38BDF8', '#F59E0B', '#A78BFA', '#F87171', '#2DD4BF'];

const SEED_MESSAGES: ChatMessage[] = [
  {
    id: 's1', type: 'system', senderId: 'sys', senderName: 'System',
    text: '~ 4EVERGREEN joined using a group link.', time: nowClock(), isMe: false,
  },
  {
    id: 's2', type: 'text', senderId: 'u1', senderName: '~ EMMEE',
    senderPhone: '+234 806 906 4406', avatarUrl: null,
    text: 'Good morning executives. Meeting assets are uploaded — review before 4 PM.',
    time: nowClock(), isMe: false,
  },
  {
    id: 's3', type: 'text', senderId: 'me', senderName: 'Me',
    senderPhone: '+234 803 000 0000', avatarUrl: null,
    text: 'Received. Will review shortly.', time: nowClock(), isMe: true,
  },
  {
    id: 's4', type: 'system', senderId: 'sys', senderName: 'System',
    text: '+234 803 800 7071 left', time: nowClock(), isMe: false,
  },
];
export default function MeetingChatScreen({ navigation }: { navigation: any }) {
  const [messages, setMessages] = useState<ChatMessage[]>(SEED_MESSAGES);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isOnlineVisible, setIsOnlineVisible] = useState<boolean>(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [pickerTab, setPickerTab] = useState<'emojis' | 'stickers'>('emojis');
  const [savedStickers, setSavedStickers] = useState<SavedSticker[]>([]);
  // Quick-filter category for the sticker grid ('All' | 'Hi' | 'Haha' | ...).
  const [activeStickerCategory, setActiveStickerCategory] = useState<string>('All');
  const [showOverflowMenu, setShowOverflowMenu] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);
  const [actionMsgId, setActionMsgId] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<string>('');

  const [voiceState, setVoiceState] = useState({
    pressing: false, recording: false, seconds: 0, startY: 0,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  const senderId = 'me';
  const senderName = 'Me';
  const senderPhone = '+234 803 000 0000';

  // Auto-scroll to the newest message.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollToEnd({ animated: true });
  }, [messages.length]);

  // ---------- Persistence ----------
  const CHAT_KEY = '@ius_chat_messages_v2';
  useEffect(() => {
    (async () => {
      try {
        const raw = await storage.getItem(CHAT_KEY);
        if (raw) {
          const saved: ChatMessage[] = JSON.parse(raw);
          if (Array.isArray(saved) && saved.length) setMessages(saved);
        }
      } catch (e) { console.log('[chat] restore failed:', e); }
    })();
  }, []);
  useEffect(() => {
    storage.setItem(CHAT_KEY, JSON.stringify(messages)).catch(() => {});
  }, [messages]);

  // ---------- Real-time multi-user sync ----------
  // Auto-subscribe on load: incoming messages render immediately, no refresh.
  useEffect(() => {
    return onMeetingMessage((payload) => {
      pushMessage({
        id: payload.id,
        type: payload.type === 'system' ? 'system' : 'text',
        senderId: payload.senderId,
        senderName: payload.senderName || 'Member',
        senderPhone: payload.senderPhone,
        avatarUrl: payload.avatarUrl ?? null,
        text: payload.text,
        mediaUrl: payload.mediaUrl ?? null,
        time: payload.timestamp || nowClock(),
        isMe: payload.senderId === senderId,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushMessage = (msg: ChatMessage) => setMessages(prev => [...prev, msg]);

  const clock = nowClock();

  /** Broadcast a message to all other connected members in the shared schema. */
  const broadcast = (msg: Partial<MeetingMessage> & { id: string; type: MeetingMessage['type'] }) => {
    broadcastMeetingMessage({
      id: msg.id,
      senderId: msg.senderId || senderId,
      senderName: msg.senderName || senderName,
      senderPhone: senderPhone,
      avatarUrl: null,
      text: msg.text,
      mediaUrl: msg.mediaUrl || null,
      timestamp: clock,
      type: msg.type,
    }).catch(() => {});
  };

  const sendMessage = (): void => {
    if (!inputText.trim()) return;
    const msgId = `t-${Date.now()}`;
    pushMessage({
      id: msgId, type: 'text', senderId, senderName, senderPhone, avatarUrl: null,
      text: inputText.trim(), time: clock, isMe: true,
    });
    broadcast({ id: msgId, text: inputText.trim(), type: 'text' });
    setInputText('');
  };

  const appendEmoji = (e: string) => setInputText(prev => prev + e);

  // ---------- Sticker save / load ----------
  /** Load saved stickers from persistent storage on mount. */
  useEffect(() => {
    loadSavedStickers().then(setSavedStickers);
  }, []);

  /** Tap-and-hold action: save an image/sticker to the user's personal sticker shelf. */
  const saveSticker = async (uri: string, pack = 'Saved'): Promise<void> => {
    const existing = savedStickers.some(s => s.url === uri);
    if (existing) return;
    const newSticker: SavedSticker = { id: `saved-${Date.now()}`, url: uri, pack };
    const updated = [...savedStickers, newSticker];
    setSavedStickers(updated);
    await saveSavedStickers(updated);
  };

  /** Remove a sticker from the user's saved shelf. */
  const removeSticker = async (id: string): Promise<void> => {
    const updated = savedStickers.filter(s => s.id !== id);
    setSavedStickers(updated);
    await saveSavedStickers(updated);
  };

  /**
   * Send a sticker through the chat's EXISTING message submission pipeline
   * (push + broadcast as an 'image' message, which renders natively in the
   * stream), then close the picker sheet cleanly.
   */
  const sendSticker = (url: string): void => {
    const msgId = `stk-${Date.now()}`;
    pushMessage({
      id: msgId, type: 'image', senderId, senderName, senderPhone, avatarUrl: null,
      mediaUrl: url, time: clock, isMe: true,
    });
    broadcast({ id: msgId, text: '', mediaUrl: url, type: 'image' });
    setShowEmojiPicker(false);
  };



  // ---------- Media ----------
  const lunchImage = async (): Promise<void> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const file = result.assets[0];
      const msgId = `i-${Date.now()}`;
      pushMessage({
        id: msgId, type: 'image', senderId, senderName, senderPhone, avatarUrl: null,
        mediaUrl: file.uri, fileName: file.name, fileSize: `${Math.max(1, Math.round((file.size || 0) / 1024))} KB`,
        time: clock, isMe: true,
      });
      broadcast({ id: msgId, text: '', mediaUrl: file.uri, type: 'image' });
    } catch (e) {
      Alert.alert('Import error', 'Could not import the selected image.');
    }
  };

  const pickAttachment = async (): Promise<void> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const file = result.assets[0];
      const msgId = `f-${Date.now()}`;
      pushMessage({
        id: msgId, type: 'file', senderId, senderName, senderPhone, avatarUrl: null,
        mediaUrl: file.uri, fileName: file.name,
        fileSize: `${Math.max(1, Math.round((file.size || 0) / 1024))} KB`,
        time: clock, isMe: true,
      });
      broadcast({ id: msgId, text: '', mediaUrl: file.uri, type: 'text' });
    } catch (e) {
      Alert.alert('Import error', 'Could not import the selected file.');
    }
  };

  const downloadMedia = async (uri: string, name?: string): Promise<void> => {
    try {
      if (!uri) throw new Error('No file location');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: name && name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : undefined,
          dialogTitle: name ? `Save ${name}` : 'Save file',
        });
      } else {
        Alert.alert('Download', 'Saving is not supported on this device.');
      }
    } catch (e) {
      Alert.alert('Download failed', (e as Error).message || 'Could not save the file.');
    }
  };

  // ---------- Clear / edit / delete ----------
  /** Purge the whole conversation for this session (persisted too). */
  const clearChat = (): void => {
    setConfirmClear(false);
    setEditingMsgId(null);
    setActionMsgId(null);
    setMessages([]);
  };

  /** Permanently remove a single message. */
  const deleteMessage = (id: string): void => {
    setActionMsgId(null);
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  /** Enter inline editing mode for one of my own messages. */
  const beginEditMessage = (msg: ChatMessage): void => {
    setActionMsgId(null);
    setEditingMsgId(msg.id);
    setEditDraft(msg.text || '');
  };

  /** Commit the edited text and flag the bubble with an "(edited)" tag. */
  const saveEditedMessage = (): void => {
    const text = editDraft.trim();
    if (!text || !editingMsgId) return;
    setMessages(prev =>
      prev.map(m => (m.id === editingMsgId ? { ...m, text, edited: true } : m)),
    );
    setEditingMsgId(null);
    setEditDraft('');
  };

  // ---------- Voice note ----------
  const fmtDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const onMicTouchStart = (e: GestureResponderEvent) => {
    setVoiceState({ pressing: true, recording: false, seconds: 0, startY: e.nativeEvent.pageY });
  };
  const onMicTouchMove = (e: GestureResponderEvent) => {
    const dy = e.nativeEvent.pageY - voiceState.startY;
    if (voiceState.pressing && !voiceState.recording && dy < -40) {
      setVoiceState(prev => ({ ...prev, recording: true }));
    }
  };
  useEffect(() => {
    if (voiceState.recording) {
      timerRef.current = setInterval(() => setVoiceState(v => ({ ...v, seconds: v.seconds + 1 })), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [voiceState.recording]);
  const onMicTouchEnd = (): void => {
    const secs = voiceState.seconds;
    const wasRecording = voiceState.recording;
    if (timerRef.current) clearInterval(timerRef.current);
    setVoiceState({ pressing: false, recording: false, seconds: 0, startY: 0 });
    if (wasRecording && secs > 0) {
      const msgId = `v-${Date.now()}`;
      pushMessage({
        id: msgId, type: 'voice', senderId, senderName, senderPhone, avatarUrl: null,
        duration: fmtDuration(secs), time: clock, isMe: true,
      });
    }
  };

  // ---------- Render helpers ----------
  const renderSystemPill = (label: string, kind: 'system' | 'date') => (
    <View key={`sep-${label}`} style={styles.systemPillRow}>
      <View style={[styles.systemPill, kind === 'date' && styles.datePill]}>
        <Text style={styles.systemPillText}>{label}</Text>
      </View>
    </View>
  );

  const avatarColor = (id: string) => {
    let n = 0;
    for (let i = 0; i < id.length; i++) n += id.charCodeAt(i);
    return AVATAR_COLORS[n % AVATAR_COLORS.length];
  };

  const renderMessage = (msg: ChatMessage) => {
    if (msg.type === 'system') return renderSystemPill(msg.text || '', 'system');
    if (msg.isMe) {
      return (
        <View key={msg.id} style={styles.outRow}>
          <TouchableOpacity
            style={styles.outBubble}
            activeOpacity={0.85}
            delayLongPress={350}
            onLongPress={
              msg.type === 'text' && !voiceState.recording
                ? () => setActionMsgId(msg.id)
                : undefined
            }
          >
            {msg.type === 'image' && msg.mediaUrl ? (
              <TouchableOpacity
                onPress={() => setViewerUri(msg.mediaUrl as string)}
                onLongPress={() => {
                  saveSticker(msg.mediaUrl as string, 'My Uploads');
                  Alert.alert('Sticker saved', 'This image was added to My Stickers.');
                }}
              >
                <Image source={{ uri: msg.mediaUrl }} style={styles.outImage} />
                {msg.fileSize ? (
                  <View style={styles.downloadBadge}>
                    <Download size={12} color="#FFFFFF" />
                    <Text style={styles.downloadBadgeText}>{msg.fileSize}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ) : msg.type === 'file' ? (
              <TouchableOpacity style={styles.fileCard} onPress={() => downloadMedia(msg.mediaUrl || '', msg.fileName)}>
                <FileText size={18} color="#A7F3D0" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.outText} numberOfLines={1}>{msg.fileName || 'Attachment'}</Text>
                  <Text style={styles.outSubtext}>{msg.fileSize || ''}</Text>
                </View>
                <Download size={16} color="#A7F3D0" />
              </TouchableOpacity>
            ) : msg.type === 'voice' ? (
              <View style={styles.voiceRow}>
                <Play size={18} color="#A7F3D0" />
                {[4, 9, 6, 11, 7, 10, 5].map((h, i) => (
                  <View key={i} style={[styles.waveBar, { height: h }]} />
                ))}
                <Text style={styles.voiceDuration}>{msg.duration || '0:00'}</Text>
              </View>
            ) : editingMsgId === msg.id ? (
              <View style={styles.editBox}>
                <TextInput
                  style={styles.editInput}
                  value={editDraft}
                  onChangeText={setEditDraft}
                  multiline
                  autoFocus
                  placeholderTextColor="#6B7F76"
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.editCancel}
                    onPress={() => {
                      setEditingMsgId(null);
                      setEditDraft('');
                    }}
                  >
                    <X size={14} color="#9CB8A6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editSave, !editDraft.trim() && { opacity: 0.5 }]}
                    onPress={saveEditedMessage}
                    disabled={!editDraft.trim()}
                  >
                    <Check size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={styles.outText}>{msg.text || ''}</Text>
            )}
            <View style={styles.outMetaRow}>
              {msg.edited ? <Text style={styles.editedTag}>(edited)</Text> : null}
              <Text style={styles.outTime}>{msg.time}</Text>
              <Check size={13} color="#A7F3D0" />
            </View>
          </TouchableOpacity>
        </View>
      );
    }
    // Incoming — avatar left, gold sender name, phone right-aligned.
    return (
      <View key={msg.id} style={styles.inRow}>
        <View style={[styles.avatar, { backgroundColor: avatarColor(msg.senderId) }]}>
          {msg.avatarUrl ? (
            <Image source={{ uri: msg.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{(msg.senderName || '?').charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.inCard}>
          <View style={styles.inHeaderRow}>
            <Text style={styles.inSenderName} numberOfLines={1}>{msg.senderName}</Text>
            {msg.senderPhone ? (
              <Text style={styles.inSenderPhone} numberOfLines={1}>{msg.senderPhone}</Text>
            ) : null}
          </View>
          {msg.type === 'image' && msg.mediaUrl ? (
            <TouchableOpacity
              onPress={() => setViewerUri(msg.mediaUrl as string)}
              onLongPress={() => {
                saveSticker(msg.mediaUrl as string, msg.senderName || 'Received');
                Alert.alert('Sticker saved', 'This image was added to My Stickers.');
              }}
            >
              <Image source={{ uri: msg.mediaUrl }} style={styles.inImage} />
              {msg.fileSize ? (
                <View style={styles.downloadBadge}>
                  <Download size={12} color="#FFFFFF" />
                  <Text style={styles.downloadBadgeText}>{msg.fileSize}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ) : msg.type === 'file' ? (
            <TouchableOpacity style={styles.fileCard} onPress={() => downloadMedia(msg.mediaUrl || '', msg.fileName)}>
              <FileText size={18} color="#A7F3D0" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.inText} numberOfLines={1}>{msg.fileName || 'Attachment'}</Text>
                <Text style={styles.inSubtext}>{msg.fileSize || ''}</Text>
              </View>
              <Download size={16} color="#A7F3D0" />
            </TouchableOpacity>
          ) : (
            <Text style={styles.inText}>{msg.text || ''}</Text>
          )}
          <Text style={styles.inTime}>{msg.time}</Text>
        </View>
      </View>
    );
  };

  const visibleMessages = showSearch && searchQuery.trim()
    ? messages.filter(m => (m.text || '').toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : messages;

  // ---------- Render ----------
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1412" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.groupName}>Co-op General Assembly</Text>
          <Text style={styles.onlineStatus}>
            {isOnlineVisible ? '34 members online' : 'Status Hidden (Ghost Mode)'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('CallScreen', { type: 'voice' })}>
            <Phone size={20} color="#A7F3D0" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('CallScreen', { type: 'video' })}>
            <Video size={20} color="#A7F3D0" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsOnlineVisible(v => !v)}>
            {isOnlineVisible ? <Eye size={20} color="#FFFFFF" /> : <EyeOff size={20} color="#FFD700" />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowOverflowMenu(true)}>
            <MoreHorizontal size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      {showSearch ? (
        <View style={styles.searchBar}>
          <Search size={16} color="#9CB8A6" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search chat history..."
            placeholderTextColor="#9CB8A6"
          />
          <TouchableOpacity onPress={() => { setSearchQuery(''); setShowSearch(false); }}>
            <Text style={styles.searchCancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Message threads */}
      <ScrollView
        style={styles.scrollView}
        ref={scrollRef}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
      >
        {renderSystemPill('Today', 'date')}
        {visibleMessages.map(renderMessage)}
        {visibleMessages.length === 0 ? (
          <Text style={styles.noResults}>No messages match your search.</Text>
        ) : null}
      </ScrollView>

      {/* Voice note recording bar */}
      {voiceState.recording ? (
        <View style={styles.recordingBar}>
          <Mic size={20} color="#FF3B30" />
          <Text style={styles.recordingText}>Recording… {fmtDuration(voiceState.seconds)}</Text>
          <Text style={styles.recordingHint}>Drag down to send</Text>
        </View>
      ) : null}

            {/* Picker panel (emoji + stickers) */}
      {showEmojiPicker ? (
        <View style={styles.pickerPanel}>
          {/* Tab bar */}
          <View style={styles.pickerTabBar}>
            <TouchableOpacity
              style={[styles.pickerTab, pickerTab === 'emojis' && styles.pickerTabActive]}
              onPress={() => setPickerTab('emojis')}
            >
              <Text style={[styles.pickerTabText, pickerTab === 'emojis' && styles.pickerTabTextActive]}>Emojis</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pickerTab, pickerTab === 'stickers' && styles.pickerTabActive]}
              onPress={() => setPickerTab('stickers')}
            >
              <Sticker size={18} color={pickerTab === 'stickers' ? '#10B981' : '#9CB8A6'} />
              <Text style={[styles.pickerTabText, pickerTab === 'stickers' && styles.pickerTabTextActive]}>Stickers</Text>
            </TouchableOpacity>
          </View>

          {pickerTab === 'emojis' ? (
            /* Categorized emoji grid rendered via SectionList for 60fps scrolling */
            <SectionList
              sections={EMOJI_CATEGORIES.map(c => ({ title: c.label, data: c.data }))}
              keyExtractor={(item, idx) => `${item}-${idx}`}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.emojiCellContainer} onPress={() => appendEmoji(item)}>
                  <Text style={styles.emojiCell}>{item}</Text>
                </TouchableOpacity>
              )}
              renderSectionHeader={({ section }) => (
                <Text style={styles.emojiSectionHeader}>{section.title}</Text>
              )}
              stickySectionHeadersEnabled={false}
              numColumns={6}
              columnWrapperStyle={{ justifyContent: 'center' }}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={<View style={{ height: 16 }} />}
            />
          ) : (
            /* Stickers tab */
            <ScrollView
              style={styles.stickerScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* User's saved stickers */}
              {savedStickers.length > 0 && (
                <>
                  <Text style={styles.stickerSectionTitle}>My Stickers</Text>
                  <View style={styles.stickerGrid}>
                    {savedStickers.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        style={styles.stickerCell}
                        onPress={() => { setInputText(prev => prev + s.url); setShowEmojiPicker(false); }}
                        onLongPress={() => removeSticker(s.id)}
                      >
                        <Image source={{ uri: s.url }} style={styles.stickerImg} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Category quick-filter bar */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.stickerFilterBar}
                contentContainerStyle={{ paddingHorizontal: 4, gap: 8 }}
              >
                {STICKER_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.stickerFilterPill,
                      activeStickerCategory === cat && styles.stickerFilterPillActive,
                    ]}
                    onPress={() => setActiveStickerCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.stickerFilterText,
                        activeStickerCategory === cat && styles.stickerFilterTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* WhatsApp-style sticker grid (virtualized, 6 columns) */}
              <FlatList
                data={stickersForCategory(activeStickerCategory)}
                keyExtractor={(item) => item.id}
                numColumns={6}
                columnWrapperStyle={{ justifyContent: 'center' }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <Text style={styles.noResults}>No stickers in this category.</Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.stickerCell}
                    onPress={() => sendSticker(item.url)}
                    onLongPress={() => saveSticker(item.url, item.category)}
                  >
                    <Image
                      source={{ uri: item.url }}
                      style={{ width: 48, height: 48, resizeMode: 'contain' }}
                    />
                  </TouchableOpacity>
                )}
              />

              {/* + Save / Add Sticker option */}
              <TouchableOpacity
                style={styles.addStickersRow}
                onPress={() => Alert.alert('Add Sticker', 'Long-press any received image to save it here.')}
              >
                <Plus size={22} color="#A7F3D0" />
                <Text style={styles.addStickersText}>Save / Add Sticker</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      ) : null}

      {/* Bottom input bar — professional layout */}
      <View style={styles.inputBar}>
        <View style={styles.inputBarLeading}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowEmojiPicker(v => !v)}>
            <Smile size={22} color="#A7F3D0" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={pickAttachment}>
            <Paperclip size={20} color="#A7F3D0" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={lunchImage}>
            <Camera size={22} color="#A7F3D0" />
          </TouchableOpacity>
        </View>

        <View style={styles.textInputWrapper}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message"
            placeholderTextColor="#6B7F76"
            onSubmitEditing={sendMessage}
          />
        </View>

        {inputText.trim() ? (
          <TouchableOpacity onPress={sendMessage} style={styles.voiceNoteBtn}>
            <Send size={18} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View
            style={[styles.voiceNoteBtn, voiceState.recording && styles.recordingBtn]}
            onTouchStart={onMicTouchStart}
            onTouchMove={onMicTouchMove}
            onTouchEnd={onMicTouchEnd}
          >
            <Mic size={18} color="#FFFFFF" />
          </View>
        )}
      </View>

      {/* Overflow menu modal */}
      <Modal visible={showOverflowMenu} transparent animationType="fade"
        onRequestClose={() => setShowOverflowMenu(false)}>
        <TouchableOpacity style={styles.menuOverlay} onPress={() => setShowOverflowMenu(false)}>
          <View style={styles.menuSheet}>
            {[
              { label: 'Group Call Initiation', onPress: () => navigation.navigate('CallScreen', { type: 'voice' }) },
              { label: 'Search Chat History', onPress: () => { setShowSearch(true); } },
              { label: 'Download All Media', onPress: () => Alert.alert('Coming Soon', 'Bulk download coming soon.') },
              { label: 'Clear Chat', danger: true, onPress: () => setConfirmClear(true) },
            ].map(action => (
              <TouchableOpacity key={action.label} style={styles.menuRow} onPress={() => { setShowOverflowMenu(false); action.onPress(); }}>
                <Text style={[styles.menuRowText, action.danger && styles.menuRowDanger]}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Image viewer modal */}
      <Modal visible={!!viewerUri} transparent animationType="fade"
        onRequestClose={() => setViewerUri(null)}>
        <View style={styles.viewerOverlay}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerUri(null)}>
            <X size={20} color="#FFFFFF" />
          </TouchableOpacity>
          {viewerUri ? <Image source={{ uri: viewerUri }} style={styles.viewerImage} resizeMode="contain" /> : null}
        </View>
      </Modal>

      {/* Message action sheet — long-press on my own message */}
      <Modal
        visible={!!actionMsgId}
        transparent
        animationType="fade"
        onRequestClose={() => setActionMsgId(null)}
      >
        <TouchableOpacity style={styles.actionOverlay} activeOpacity={1} onPress={() => setActionMsgId(null)}>
          <View style={styles.actionSheet}>
            <Text style={styles.actionTitle}>Message options</Text>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                const msg = messages.find(m => m.id === actionMsgId);
                if (msg) beginEditMessage(msg);
              }}
            >
              <Pencil size={17} color="#A7F3D0" />
              <Text style={[styles.actionText, { color: '#A7F3D0' }]}>Edit Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionRow, styles.actionRowLast]}
              onPress={() => actionMsgId && deleteMessage(actionMsgId)}
            >
              <Trash2 size={17} color="#F87171" />
              <Text style={[styles.actionText, { color: '#F87171' }]}>Delete Chat</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
              This will erase the entire meeting conversation. This cannot be undone.
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
  container: { flex: 1, backgroundColor: '#0B1412', overflow: 'hidden', width: '100%', maxWidth: '100%', touchAction: 'pan-y' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0D1D18', paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#1C4A2E',
  },
  backBtn: { padding: 6 },
  headerInfo: { flex: 1, marginLeft: 10 },
  groupName: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  onlineStatus: { color: '#A7F3D0', fontSize: 11, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#0D1D18', paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#1C4A2E',
  },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 13, paddingVertical: 4 },
  searchCancel: { color: '#10B981', fontSize: 13, fontWeight: '600' },
  scrollView: { flex: 1 },
  messageList: { paddingHorizontal: 12, paddingVertical: 12, paddingBottom: 8, flexGrow: 1 },

  // System / date pills
  systemPillRow: { alignItems: 'center', marginVertical: 10 },
  systemPill: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  datePill: { backgroundColor: 'rgba(16,185,129,0.16)' },
  systemPillText: { color: '#9CB8A6', fontSize: 12, fontWeight: '600' },

  // Incoming
  inRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, marginRight: 40 },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center', marginRight: 8, overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  inCard: {
    flex: 1, backgroundColor: '#12261F', borderRadius: 14,
    borderTopLeftRadius: 4, paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: '#1C4A2E',
  },
  inHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  inSenderName: { color: '#D4AF37', fontSize: 12, fontWeight: '700', flexShrink: 1, marginRight: 8 },
  inSenderPhone: { color: '#6B7F76', fontSize: 10, flexShrink: 1 },
  inText: { color: '#F1F5F1', fontSize: 14, lineHeight: 20 },
  inSubtext: { color: '#9CB8A6', fontSize: 11, marginTop: 2 },
  inTime: { color: '#6B7F76', fontSize: 10, alignSelf: 'flex-end', marginTop: 6 },
  inImage: { width: '100%', height: 180, borderRadius: 10, marginTop: 6 },

  // Outgoing
  outRow: { alignItems: 'flex-end', marginBottom: 12, marginLeft: 60 },
  outBubble: {
    backgroundColor: '#10B981', borderRadius: 14, borderTopRightRadius: 4,
    paddingHorizontal: 12, paddingVertical: 8, maxWidth: '100%',
  },
  outText: { color: '#07120E', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  outSubtext: { color: '#064E3B', fontSize: 11, marginTop: 2 },
  outImage: { width: 200, height: 140, borderRadius: 10, marginBottom: 4 },
  outMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
  outTime: { color: '#064E3B', fontSize: 10, fontWeight: '600' },

  // Shared media / download
  downloadBadge: {
    position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3,
  },
  downloadBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
  fileCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  waveBar: { width: 3, borderRadius: 2, backgroundColor: '#A7F3D0' },
  voiceDuration: { color: '#A7F3D0', fontSize: 12, marginLeft: 6 },

  // Recording bar
  recordingBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#3A1D24', paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 12, borderRadius: 12, marginBottom: 6,
  },
  recordingText: { color: '#F87171', fontSize: 13, fontWeight: '600' },
  recordingHint: { color: '#9CB8A6', fontSize: 11, marginLeft: 'auto' },

  // Picker panel (emoji + stickers)
  pickerPanel: { backgroundColor: '#0D1D18', padding: 10, maxHeight: 240 },
  pickerTabBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 6, gap: 10, borderBottomWidth: 1, borderBottomColor: '#1C4A2E' },
  pickerTab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14 },
  pickerTabActive: { backgroundColor: '#132620' },
  pickerTabText: { color: '#9CB8A6', fontSize: 13, fontWeight: '600', marginHorizontal: 6 },
  pickerTabTextActive: { color: '#10B981', fontWeight: '800' },
  emojiSectionHeader: { color: '#A7F3D0', fontSize: 12, fontWeight: '700', paddingVertical: 4, paddingHorizontal: 10, marginTop: 4 },
  emojiCellContainer: { padding: 2, alignItems: 'center', justifyContent: 'center' },
  emojiCell: { fontSize: 24, padding: 6 },

  // Stickers tab
  stickerScroll: { maxHeight: 210 },
  stickerFilterBar: { flexGrow: 0, marginBottom: 6 },
  stickerFilterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#132620',
    borderWidth: 1,
    borderColor: '#1C4A2E',
  },
  stickerFilterPillActive: { backgroundColor: '#064E3B', borderColor: '#10B981' },
  stickerFilterText: { color: '#9CB8A6', fontSize: 12, fontWeight: '600' },
  stickerFilterTextActive: { color: '#A7F3D0', fontWeight: '800' },
  stickerSectionTitle: { color: '#A7F3D0', fontSize: 12, fontWeight: '700', paddingVertical: 4, marginTop: 4 },
  stickerPackSection: { marginBottom: 8 },
  stickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', alignItems: 'center' },
  stickerCell: { width: 58, height: 58, borderRadius: 10, backgroundColor: '#132620', justifyContent: 'center', alignItems: 'center', marginBottom: 8, overflow: 'hidden' },
  stickerImg: { width: 48, height: 48, resizeMode: 'contain' },
  addStickersRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1C4A2E', borderStyle: 'dashed', backgroundColor: '#0B1412', gap: 8 },
  addStickersText: { color: '#A7F3D0', fontSize: 13, fontWeight: '700' },

  // Bottom input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0D1D18', paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#1C4A2E',
  },
  inputBarLeading: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: { padding: 4 },
  textInputWrapper: { flex: 1, marginHorizontal: 6, justifyContent: 'center' },
  textInput: {
    flex: 1, height: 42, borderRadius: 21, backgroundColor: '#132620',
    paddingHorizontal: 16, color: '#FFFFFF', fontSize: 14,
  },
  voiceNoteBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#10B981',
    justifyContent: 'center', alignItems: 'center',
  },
  recordingBtn: { backgroundColor: '#FF3B30' },

  // Modals
  noResults: { color: '#9CB8A6', fontSize: 13, textAlign: 'center', marginTop: 24 },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'flex-end', padding: 16 },
  menuSheet: { backgroundColor: '#132620', borderRadius: 14, paddingVertical: 6, width: 230, marginTop: 80 },
  menuRow: { paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1C4A2E' },
  menuRowText: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' },
  viewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  viewerClose: { position: 'absolute', top: 46, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16, padding: 8, zIndex: 10 },
  viewerImage: { width: '100%', height: '80%' },

  // Message action sheet
  actionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  actionSheet: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: '#0D1D18',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1C4A2E',
    paddingVertical: 4,
  },
  actionTitle: {
    color: '#9CB8A6',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    paddingVertical: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderTopColor: '#172F27',
  },
  actionRowLast: { borderBottomWidth: 0 },
  actionText: { fontSize: 14, fontWeight: '600' },

  // Inline edit (meeting chat)
  editBox: { minWidth: 160 },
  editInput: {
    color: '#07120E',
    fontSize: 14,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 6,
  },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  editCancel: { padding: 5 },
  editSave: { backgroundColor: '#064E3B', borderRadius: 8, padding: 5 },

  // (edited) tag
  editedTag: { color: '#064E3B', fontSize: 10, fontStyle: 'italic', marginRight: 4 },

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

