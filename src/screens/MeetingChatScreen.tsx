import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  StatusBar,
  Modal,
  Image,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  GestureResponderEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  CheckCheck,
  Pencil,
  Trash2,
  Plus,
  Copy,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { Audio } from 'expo-av';
import { storage } from '../lib/storage';
import { toast } from '../lib/safe';
import { onMeetingMessage, broadcastMeetingMessage, MeetingMessage } from '../lib/meetingChat';
import { supabase } from '../lib/supabase';
import EmojiPicker from '../components/EmojiPicker';
import AssemblyMessageInput from '../components/AssemblyMessageInput';
import ChatBubble from '../components/ChatBubble';
import AudioBubble from '../components/AudioBubble';
import { useTheme } from '../theme/ThemeContext';

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
  /** WhatsApp-style receipt: sent -> delivered -> read. */
  status?: 'sent' | 'delivered' | 'read';
  editedAt?: number;
}

/** Connected member profile used for member/array state. */
interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  [key: string]: any;
}

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

/** Room key this screen syncs to in the `messages` table. */
const MEETING_ROOM_ID = 'general-meeting';

/** Map a `messages` row (id, created_at, content, room_id, sender_id) into the renderable in-room ChatMessage. */
function mapMeetingRowToChat(row: any, selfId: string): ChatMessage {
  const rawSenderId = String(row.sender_id ?? '');
  const isMe = rawSenderId === selfId;
  return {
    id: String(row.id),
    type: 'text',
    senderId: rawSenderId || 'member',
    senderName: isMe ? 'Me' : (row.sender_name || 'Member'),
    text: row.content || '',
    time: row.created_at
      ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : nowClock(),
    isMe,
    // History rows were already rendered by the room, so they count as read.
    status: 'read',
  };
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
    text: 'Received. Will review shortly.', time: nowClock(), isMe: true, status: 'read',
  },
  {
    id: 's4', type: 'system', senderId: 'sys', senderName: 'System',
    text: '+234 803 800 7071 left', time: nowClock(), isMe: false,
  },
];
export default function MeetingChatScreen({ navigation }: { navigation: any }) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const [messages, setMessages] = useState<ChatMessage[]>(SEED_MESSAGES);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isOnlineVisible, setIsOnlineVisible] = useState<boolean>(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
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
  const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);
  const insets = useSafeAreaInsets();

  const [voiceState, setVoiceState] = useState({
    pressing: false, recording: false, locked: false, seconds: 0,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<FlatList<ChatMessage> | null>(null);
  // Voice-note capture session (browser MediaRecorder API).
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const gestureRef = useRef({ recording: false, locked: false, seconds: 0 });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  /** Native (expo-av) recorder fallback for devices without MediaRecorder. */
  const nativeRecorderRef = useRef<Audio.Recording | null>(null);

  const senderName = 'Me';
  const senderPhone = '+234 803 000 0000';

  // Resolve the authenticated member's real id once (used as `sender_id` when
  // writing to the `messages` table, and to mark incoming rows as "mine").
  const [selfId, setSelfId] = useState<string>('me');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!cancelled && !error && user?.id) setSelfId(user.id);
      } catch { /* keep fallback */ }
    })();
    return () => { cancelled = true; };
  }, []);
  const senderId = selfId;

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

  /** Append a message, deduping so realtime echoes and optimistic inserts don't double. */
  const pushMessage = (msg: ChatMessage) =>
    setMessages(prev => (prev.some(m => m.id === String(msg.id)) ? prev : [...prev, msg]));

  // ---------- WhatsApp-style read receipts ----------
  // Own messages progress sent -> delivered -> read (✓ -> ✓✓ gray -> ✓✓ blue).
  useEffect(() => {
    const hasPending = messages.some(m => m.isMe && (!m.status || m.status === 'sent'));
    const hasDelivered = messages.some(m => m.isMe && m.status === 'delivered');
    if (!hasPending && !hasDelivered) return;
    const t1 = hasPending
      ? setTimeout(() =>
          setMessages(prev =>
            prev.map(m => (m.isMe && (!m.status || m.status === 'sent') ? { ...m, status: 'delivered' } : m)),
          ), 900)
      : null;
    const t2 = setTimeout(() =>
      setMessages(prev =>
        prev.map(m => (m.isMe && m.status === 'delivered' ? { ...m, status: 'read' } : m)),
      ), 2600);
    return () => { if (t1) clearTimeout(t1); clearTimeout(t2); };
  }, [messages]);

  // Recipient-side read trigger: when this screen mounts — and whenever new
  // messages arrive while it is open — everything from other users is viewed.
  // Incoming messages flip to status read, which is what senders blue
  // double-ticks reflect (fan-out happens through the room channel).
  useEffect(() => {
    const unreadIds = messages
      .filter((m) => !m.isMe && m.status !== 'read')
      .map((m) => m.id);
    if (unreadIds.length === 0) return;
    // (API hook point: persist read receipts for unreadIds here when the
    // backend exposes a read-status column/channel for messages.)
    setMessages((prev) =>
      prev.map((m) => (unreadIds.includes(m.id) ? { ...m, status: 'read' } : m)),
    );
  }, [messages]);

  // Keyboard height drives the bottom padding on the input dock so the bar
  // tracks the soft keyboard precisely. insets.bottom only applies while the
  // keyboard is hidden (home-gesture bar).
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardVisible(true);
      // Capture the real keyboard height so the dock translates up exactly.
      setKeyboardHeight(e.endCoordinates.height);
      // Keep the latest message pinned above the input bar when the keyboard opens.
      if (scrollRef.current) scrollRef.current.scrollToEnd({ animated: true });
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });
    return () => { show.remove(); hide.remove(); };
  }, []);

  // ---------- Persistent + realtime room chat (messages table) ----------
  // 1) Load existing history on screen open, 2) subscribe to live INSERTs.
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    // A. Fetch the current room's messages once.
    (async () => {
      try {
        let data: any = null;
        let error: any = null;
        const rpc = await supabase.rpc('fetch_room_messages', {
          p_room_id: MEETING_ROOM_ID,
        });
        if (rpc.error) {
          const direct = await supabase
            .from('messages')
            .select('*')
            .eq('room_id', MEETING_ROOM_ID)
            .order('created_at', { ascending: true });
          data = direct.data;
          error = direct.error;
        } else {
          data = rpc.data;
        }
        if (error) { console.warn('[chat] messages fetch failed:', error.message); return; }
        if (data && !cancelled) {
          const remote = data.map((r: any) => mapMeetingRowToChat(r, selfId));
          setMessages(prev => {
            const seen = new Set(prev.map((m: any) => m.id));
            return [...prev, ...remote.filter(m => !seen.has(m.id))];
          });
        }
      } catch (e) { console.warn('[chat] load failed:', (e as Error).message); }
    })();

    // B. Live INSERT events — new & other users' messages render instantly.
    const channel = supabase
      .channel(`room:${MEETING_ROOM_ID}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${MEETING_ROOM_ID}` },
        (payload) => {
          if (cancelled || !payload?.new) return;
          pushMessage(mapMeetingRowToChat(payload.new as any, selfId));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      try { supabase.removeChannel(channel); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfId]);

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

  /** Send text by inserting into the `messages` table — realtime fans it out to every device. */
  const sendMessage = async (): Promise<void> => {
    // While an edit session is active the send button commits the edit instead.
    if (editingMsgId) { saveEditedMessage(); return; }
    const content = inputText.trim();
    if (!content) return;
    try {
      if (!supabase) throw new Error('Supabase client unavailable');
      // Prefer the backend route (save_room_message) which writes with the
      // authenticated sender_id; fall back to a direct insert if RPC is absent.
      let data: any = null;
      let error: any = null;
      const rpcResult = await supabase.rpc('save_room_message', {
        p_room_id: MEETING_ROOM_ID,
        p_content: content,
      });
      if (rpcResult.error) {
        const direct = await supabase
          .from('messages')
          .insert({ room_id: MEETING_ROOM_ID, sender_id: senderId, content })
          .select()
          .single();
        data = direct.data;
        error = direct.error;
      } else {
        data = rpcResult.data;
      }
      if (error) throw error;
      // Optimistic echo for the sender; the realtime INSERT event is deduped.
      // Starts as 'sent' (single grey tick)...
      if (data) pushMessage({ ...mapMeetingRowToChat(data, selfId), status: 'sent' });
      // ...then the successful API response confirms server upload → 'delivered'.
      if (data) {
        setMessages(prev =>
          prev.map(m => (m.id === String(data.id) ? { ...m, status: 'delivered' as const } : m)),
        );
      }
    } catch (e) {
      // Resilient fallback: keep the bubble local if the table is unreachable.
      // Stays at 'sent' (single tick) — never faked as delivered.
      console.warn('[chat] insert failed, showing locally:', (e as Error).message);
      pushMessage({
        id: `t-${Date.now()}`, type: 'text', senderId, senderName, senderPhone, avatarUrl: null,
        text: content, time: nowClock(), isMe: true, status: 'sent',
      });
    }
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

  /** Enter edit mode: the message text is populated into the BOTTOM INPUT BAR
   * with an active editing indicator above it (WhatsApp-style), NOT inline. */
  const beginEditMessage = (msg: ChatMessage): void => {
    setActionMsgId(null);
    setEditingMsgId(msg.id);
    setInputText(msg.text || '');
    Keyboard.dismiss();
  };

  /** Cancel edit mode: restore the empty composer. */
  const cancelEditMessage = (): void => {
    setEditingMsgId(null);
    setInputText('');
  };

  /** Commit the edited text (isEdited + editedAt) and flag the bubble with an
   * "(edited)" sub-tag next to the timestamp. */
  const saveEditedMessage = (): void => {
    const text = inputText.trim();
    if (!text || !editingMsgId) return;
    setMessages(prev =>
      prev.map(m =>
        m.id === editingMsgId
          ? { ...m, text, edited: true, editedAt: Date.now() }
          : m,
      ),
    );
    setEditingMsgId(null);
    setInputText('');
  };

  // ---------- Voice note (WhatsApp-style press-and-hold recording) ----------
  const fmtDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  /** Tear down any active capture session WITHOUT sending anything. */
  const teardownRecording = (): void => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    streamRef.current = null;
    recorderRef.current = null;
    if (nativeRecorderRef.current) {
      try { nativeRecorderRef.current.stopAndUnloadAsync().catch(() => {}); } catch { /* noop */ }
      nativeRecorderRef.current = null;
    }
    chunksRef.current = [];
    gestureRef.current = { recording: false, locked: false, seconds: 0 };
    setVoiceState({ pressing: false, recording: false, locked: false, seconds: 0 });
  };

  /** Route a finished take through the chat's EXISTING message pipeline. */
  const commitVoiceMessage = (blob: Blob | null, secs: number): void => {
    if (secs <= 0 || !blob) return;
    const msgId = `v-${Date.now()}`;
    const uri = URL.createObjectURL(blob);
    pushMessage({
      id: msgId, type: 'voice', senderId, senderName, senderPhone, avatarUrl: null,
      mediaUrl: uri, duration: fmtDuration(secs), time: clock, isMe: true,
    });
    if (uri) broadcast({ id: msgId, text: '', mediaUrl: uri, type: 'text' });
  };

  /** Message pipeline runner for native recordings (keeps a file:// URI). */
  const commitVoiceUri = (uri: string | null, secs: number): void => {
    if (secs <= 0 || !uri) return;
    const msgId = `v-${Date.now()}`;
    pushMessage({
      id: msgId, type: 'voice', senderId, senderName, senderPhone, avatarUrl: null,
      mediaUrl: uri, duration: fmtDuration(secs), time: clock, isMe: true,
    });
    broadcast({ id: msgId, text: '', mediaUrl: uri, type: 'text' });
  };

  /**
   * Stop the active recorder (MediaRecorder on web, expo-av on native) and
   * deliver its output to `send` or discard it.
   * The MediaRecorder finalisation happens inside `onstop`, once the last
   * chunk lands.
   */
  const stopRecording = (action: 'send' | 'discard'): void => {
    const secs = gestureRef.current.seconds;

    // Native (expo-av) path — recording provides a file URI on stop.
    const nativeRec = nativeRecorderRef.current;
    if (nativeRec) {
      (async () => {
        try {
          await nativeRec.stopAndUnloadAsync();
          nativeRecorderRef.current = null;
          const uri = nativeRec.getURI();
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
          gestureRef.current = { recording: false, locked: false, seconds: 0 };
          setVoiceState({ pressing: false, recording: false, locked: false, seconds: 0 });
          if (action === 'send') commitVoiceUri(uri, secs);
        } catch (e) {
          console.warn('[voice] native stop failed:', e);
          teardownRecording();
        }
      })();
      return;
    }

    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      teardownRecording();
      return;
    }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      chunksRef.current = [];
      recorderRef.current = null;
      streamRef.current = null;
      gestureRef.current = { recording: false, locked: false, seconds: 0 };
      setVoiceState({ pressing: false, recording: false, locked: false, seconds: 0 });
      if (action === 'send') commitVoiceMessage(blob, secs);
    };
    try { recorder.stop(); } catch { teardownRecording(); }
  };

  /**
   * Open the microphone and start capturing.
   * Explicitly requests audio-recording permission (via Expo Audio) BEFORE
   * any capture starts, then uses the browser MediaRecorder API on web and
   * falls back to an expo-av Recording on native devices that lack it.
   */
  const beginHoldRecording = async (): Promise<void> => {
    // --- 1. Request microphone permission (native + web prompts). ---
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Microphone permission required', 'Allow microphone access to record voice notes.');
        teardownRecording();
        return;
      }
    } catch (e) {
      console.warn('[voice] requestPermissionsAsync failed, continuing:', e);
    }

    const canRecord =
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined';

    // --- 2. Web / browser: MediaRecorder API. ---
    if (canRecord) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        recorderRef.current = recorder;
        chunksRef.current = [];
        recorder.ondataavailable = (e: any) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onerror = () => stopRecording('discard');
        recorder.start();
        gestureRef.current.recording = true;
        setVoiceState((v) => ({ ...v, recording: true }));
        return;
      } catch (e) {
        console.warn('[voice] MediaRecorder start failed:', e);
        teardownRecording();
        try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
        streamRef.current = null;
        Alert.alert('Microphone unavailable', 'Allow microphone access to record voice notes.');
        return;
      }
    }

    // --- 3. Native (expo-av) fallback. ---
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      nativeRecorderRef.current = recording;
      gestureRef.current.recording = true;
      setVoiceState((v) => ({ ...v, recording: true }));
    } catch (e) {
      console.warn('[voice] native recording unsupported:', e);
      teardownRecording();
      Alert.alert('Voice notes unavailable', 'Audio recording is not supported on this device.');
    }
  };

  // Unmount safety: never leave the mic open or timers running.
  useEffect(() => () => stopRecording('discard'), []);

  const onMicTouchStart = (e: GestureResponderEvent) => {
    touchStartRef.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
    gestureRef.current = { recording: false, locked: false, seconds: 0 };
    setVoiceState({ pressing: true, recording: false, locked: false, seconds: 0 });
    // Long-press begins the capture; a quick tap never opens the microphone.
    holdTimerRef.current = setTimeout(beginHoldRecording, 300);
  };
  const onMicTouchMove = (e: GestureResponderEvent) => {
    if (!gestureRef.current.recording || gestureRef.current.locked) return;
    const dy = e.nativeEvent.pageY - touchStartRef.current.y;
    const dx = e.nativeEvent.pageX - touchStartRef.current.x;
    if (dy < -70) {
      // Drag up → lock: the finger can now be lifted while recording continues.
      gestureRef.current.locked = true;
      setVoiceState((v) => ({ ...v, locked: true }));
    } else if (dx < -70) {
      // Drag left → slide-to-cancel.
      stopRecording('discard');
    }
  };
  const onMicTouchEnd = (): void => {
    if (!gestureRef.current.recording) {
      // Released before the long-press fired (or capture failed) — clean reset.
      teardownRecording();
      return;
    }
    if (gestureRef.current.locked) return; // locked: wait for Send / Cancel taps
    stopRecording('send');                 // plain hold-release sends the note
  };
  useEffect(() => {
    if (voiceState.recording) {
      timerRef.current = setInterval(() => setVoiceState((v) => {
        const seconds = v.seconds + 1;
        gestureRef.current.seconds = seconds; // ref copy for touch-end readers
        return { ...v, seconds };
      }), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [voiceState.recording]);

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

  /** Copy a chat message to the clipboard with friendly feedback. */
  const handleCopyMessage = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text || '');
      toast('Copied to clipboard', 'Message copied successfully.');
    } catch (e) {
      toast('Could not copy', 'Please copy the message manually.');
    }
  };

  const renderMessage = (msg: ChatMessage) => {
    if (msg.type === 'system') return renderSystemPill(msg.text || '', 'system');
    if (msg.isMe) {
      return (
        <View key={msg.id} style={styles.outRow}>
          {msg.type === 'image' && msg.mediaUrl ? (
            <TouchableOpacity
              style={styles.outBubble}
              onPress={() => setViewerUri(msg.mediaUrl as string)}
              onLongPress={() => {
                saveSticker(msg.mediaUrl as string, 'My Uploads');
                Alert.alert('Sticker saved', 'This image was added to My Stickers.');
              }}
            >
              <Image source={{ uri: msg.mediaUrl }} style={styles.outImage} />
              {msg.fileSize ? (
                <View style={styles.downloadBadge}>
                  <Download size={12} color={colors.text} />
                  <Text style={styles.downloadBadgeText}>{msg.fileSize}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ) : msg.type === 'file' ? (
            <TouchableOpacity style={[styles.outBubble, styles.fileCard]} onPress={() => downloadMedia(msg.mediaUrl || '', msg.fileName)}>
              <FileText size={18} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.outText} numberOfLines={1}>{msg.fileName || 'Attachment'}</Text>
                <Text style={styles.outSubtext}>{msg.fileSize || ''}</Text>
              </View>
              <Download size={16} color={colors.primary} />
            </TouchableOpacity>
          ) : msg.type === 'voice' ? (
            <View style={styles.outBubble}>
              <AudioBubble
                uri={msg.mediaUrl || ''}
                durationLabel={msg.duration || '0:00'}
                isMine
                primaryColor={colors.primary}
              />
            </View>
          ) : (
            <ChatBubble
              text={msg.text || ''}
              isMine
              status={msg.status}
              timestamp={msg.time}
              edited={msg.edited}
              onLongPress={!voiceState.recording ? () => setActionMsgId(msg.id) : undefined}
              onCopied={(t) => handleCopyMessage(t)}
            />
          )}
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
                  <Download size={12} color={colors.text} />
                  <Text style={styles.downloadBadgeText}>{msg.fileSize}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ) : msg.type === 'file' ? (
            <TouchableOpacity style={styles.fileCard} onPress={() => downloadMedia(msg.mediaUrl || '', msg.fileName)}>
              <FileText size={18} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.inText} numberOfLines={1}>{msg.fileName || 'Attachment'}</Text>
                <Text style={styles.inSubtext}>{msg.fileSize || ''}</Text>
              </View>
              <Download size={16} color={colors.primary} />
            </TouchableOpacity>
          ) : msg.type === 'voice' ? (
            <AudioBubble
              uri={msg.mediaUrl || ''}
              durationLabel={msg.duration || '0:00'}
              isMine={false}
              primaryColor={colors.primary}
            />
          ) : (
            <ChatBubble
              text={msg.text || ''}
              isMine={false}
              timestamp={msg.time}
              onCopied={(t) => handleCopyMessage(t)}
            />
          )}
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
<StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* ROOT FLEX LAYOUT — KeyboardAvoidingView keeps the header and bottom
          input column pinned while ONLY the message list scrolls vertically. */}
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.groupName}>Co-op General Assembly</Text>
          <Text style={styles.onlineStatus}>
            {isOnlineVisible ? '34 members online' : 'Status Hidden (Ghost Mode)'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('CallScreen', { type: 'voice' })}>
            <Phone size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('CallScreen', { type: 'video' })}>
            <Video size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsOnlineVisible(v => !v)}>
            {isOnlineVisible ? <Eye size={20} color={colors.text} /> : <EyeOff size={20} color={colors.warning} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowOverflowMenu(true)}>
            <MoreHorizontal size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      {showSearch ? (
        <View style={styles.searchBar}>
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search chat history..."
            placeholderTextColor={colors.textSecondary}
          />
          <TouchableOpacity onPress={() => { setSearchQuery(''); setShowSearch(false); }}>
            <Text style={styles.searchCancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* MESSAGE AREA — FlatList flex:1, the ONLY scrolling region */}
      <FlatList
        style={styles.scrollView}
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        data={visibleMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderMessage(item)}
        ListHeaderComponent={renderSystemPill('Today', 'date')}
        ListFooterComponent={
          visibleMessages.length === 0 ? (
            <Text style={styles.noResults}>No messages match your search.</Text>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Voice note recording bar */}
      {voiceState.recording ? (
        <View style={styles.recordingBar}>
          <Mic size={20} color={colors.danger} />
          <Text style={styles.recordingText}>Recording… {fmtDuration(voiceState.seconds)}</Text>
          {voiceState.locked ? (
            <>
              <TouchableOpacity
                style={styles.cancelRecBtn}
                onPress={() => stopRecording('discard')}
              >
                <Trash2 size={15} color={colors.danger} />
                <Text style={styles.cancelRecText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sendRecBtn}
                onPress={() => stopRecording('send')}
              >
                <Send size={13} color='#FFFFFF' />
                <Text style={styles.sendRecText}>Send</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.recordingHint}>Release to send · drag up to lock · left to cancel</Text>
          )}
        </View>
      ) : null}

            {/* Emoji & sticker picker (bottom-sheet modal) */}
      <EmojiPicker
        inline
        visible={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onSelectEmoji={appendEmoji}
        savedStickers={savedStickers}
        activeStickerCategory={activeStickerCategory}
        onStickerCategoryChange={setActiveStickerCategory}
        onSelectSticker={sendSticker}
        onLongPressSticker={saveSticker}
        onRemoveSavedSticker={removeSticker}
        onAddStickerHint={() => Alert.alert('Add Sticker', 'Long-press a received image to save it here.')}
      />

      {/* Bottom input dock — safe-area padding only while the keyboard is
          hidden so the bar stays elevated above home gestures. */}
      <View style={[styles.inputDock, {
        paddingBottom: keyboardHeight > 0
          ? (Platform.OS === 'ios' ? 8 : 0)
          : Math.max(insets.bottom, 8),
      }]}>
        {/* WhatsApp-style editing indicator above the composer */}
        {editingMsgId ? (
          <View style={styles.editingIndicator}>
            <Pencil size={13} color={colors.primary} />
            <View style={styles.editingIndicatorTextWrap}>
              <Text style={styles.editingIndicatorLabel}>Editing message</Text>
              <Text style={styles.editingIndicatorPreview} numberOfLines={1}>
                {messages.find(m => m.id === editingMsgId)?.text || ''}
              </Text>
            </View>
            <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={cancelEditMessage}>
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* WhatsApp-style composer (shared component): rounded text bar on the
            left (emoji, input, attachment, camera) + standalone circular
            action button on the right (mic when empty / send when typing). */}
        <AssemblyMessageInput
          value={inputText}
          onChangeText={setInputText}
          onSend={sendMessage}
          onEmojiPress={() => {
            Keyboard.dismiss();
            setShowEmojiPicker(v => !v);
          }}
          onAttachmentPress={pickAttachment}
          onCameraPress={lunchImage}
          isRecording={voiceState.recording}
          editing={!!editingMsgId}
          onMicTouchStart={onMicTouchStart}
          onMicTouchMove={onMicTouchMove}
          onMicTouchEnd={onMicTouchEnd}
          onMicTouchCancel={onMicTouchEnd}
        />
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
            <X size={20} color={colors.text} />
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
              <Pencil size={17} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>Edit Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionRow, styles.actionRowLast]}
              onPress={() => actionMsgId && deleteMessage(actionMsgId)}
            >
              <Trash2 size={17} color={colors.danger} />
              <Text style={[styles.actionText, { color: colors.danger }]}>Delete Chat</Text>
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
            <Trash2 size={22} color={colors.danger} />
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


const makeStyles = (c: any, dk: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background, overflow: 'hidden', width: '100%', maxWidth: '100%', ...(({ touchAction: 'pan-y' } as any)) },
  keyboardWrap: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.card, paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: c.border,
    flexShrink: 0,
  },
  backBtn: { padding: 6 },
  headerInfo: { flex: 1, marginLeft: 10 },
  groupName: { color: c.text, fontSize: 16, fontWeight: 'bold' },
  onlineStatus: { color: c.primary, fontSize: 11, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: c.card, paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  searchInput: { flex: 1, color: c.text, fontSize: 13, paddingVertical: 4 },
  searchCancel: { color: c.primary, fontSize: 13, fontWeight: '600' },
  scrollView: { flex: 1 },
  messageList: { paddingHorizontal: 12, paddingVertical: 12, paddingBottom: 8, flexGrow: 1 },

  // System / date pills
  systemPillRow: { alignItems: 'center', marginVertical: 10 },
  systemPill: { backgroundColor: dk ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  datePill: { backgroundColor: 'rgba(16,185,129,0.16)' },
  systemPillText: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },

  // Incoming
  inRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, marginRight: 40 },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center', marginRight: 8, overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: c.text, fontSize: 14, fontWeight: '700' },
  inCard: {
    flex: 1, backgroundColor: c.surface, borderRadius: 14,
    borderTopLeftRadius: 4, paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: c.border,
  },
  inHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  inSenderName: { color: dk ? '#D4AF37' : '#B45309', fontSize: 12, fontWeight: '700', flexShrink: 1, marginRight: 8 },
  inSenderPhone: { color: c.textSecondary, fontSize: 10, flexShrink: 1 },
  inText: { color: dk ? c.text : '#0F172A', fontSize: 14, lineHeight: 20 },
  inSubtext: { color: c.textSecondary, fontSize: 11, marginTop: 2 },
    inTime: { color: c.textSecondary, fontSize: 10, alignSelf: 'flex-end', marginTop: 6 },
  inMetaRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 4 },
  inImage: { width: '100%', height: 180, borderRadius: 10, marginTop: 6 },

  // Outgoing
  outRow: { alignItems: 'flex-end', marginBottom: 12, marginLeft: 60 },
  outBubble: {
    backgroundColor: c.primary, borderRadius: 14, borderTopRightRadius: 4,
    paddingHorizontal: 12, paddingVertical: 8, maxWidth: '100%',
  },
  outText: { color: c.background, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  outSubtext: { color: c.background, fontSize: 11, marginTop: 2 },
  outImage: { width: 200, height: 140, borderRadius: 10, marginBottom: 4 },
  outMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
  outTime: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '600' },

  // Shared media / download
  downloadBadge: {
    position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3,
  },
  downloadBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
  fileCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  waveBar: { width: 3, borderRadius: 2, backgroundColor: c.primary },
  voiceDuration: { color: c.primary, fontSize: 12, marginLeft: 6 },

  // Bottom input dock
  inputDock: {
    backgroundColor: c.card,
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingHorizontal: 8,
    paddingTop: 6,
  },

  // Editing indicator above the composer
  editingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: dk ? '#1E293B' : '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 8,
    marginTop: 4,
    borderRadius: 8,
  },
  editingIndicatorTextWrap: { flex: 1 },
  editingIndicatorLabel: { color: c.primary, fontSize: 11, fontWeight: '700' },
  editingIndicatorPreview: { color: c.textSecondary, fontSize: 11 },

  // Recording bar
  recordingBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: dk ? '#3A1D24' : '#FDE8E8', paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 12, borderRadius: 12, marginBottom: 6,
  },
  recordingText: { color: c.danger, fontSize: 13, fontWeight: '600' },
  recordingHint: { color: c.textSecondary, fontSize: 11, marginLeft: 'auto' },
  cancelRecBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginLeft: 'auto', paddingVertical: 4, paddingHorizontal: 8,
  },
  cancelRecText: { color: c.danger, fontSize: 12, fontWeight: '600' },
  sendRecBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: c.primary, borderRadius: 14, paddingVertical: 5, paddingHorizontal: 12,
  },
  sendRecText: { color: c.background, fontSize: 12, fontWeight: '700' },

  // Picker panel (emoji + stickers)
  pickerPanel: { backgroundColor: c.card, padding: 10, maxHeight: 240 },
  pickerTabBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 6, gap: 10, borderBottomWidth: 1, borderBottomColor: c.border },
  pickerTab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14 },
  pickerTabActive: { backgroundColor: c.inputBackground },
  pickerTabText: { color: c.textSecondary, fontSize: 13, fontWeight: '600', marginHorizontal: 6 },
  pickerTabTextActive: { color: c.primary, fontWeight: '800' },
  emojiSectionHeader: { color: c.primary, fontSize: 12, fontWeight: '700', paddingVertical: 4, paddingHorizontal: 10, marginTop: 4 },
  emojiCellContainer: { padding: 2, alignItems: 'center', justifyContent: 'center' },
  emojiCell: { fontSize: 24, padding: 6 },

  // Stickers tab
  stickerScroll: { maxHeight: 210 },
  stickerFilterBar: { flexGrow: 0, marginBottom: 6 },
  stickerFilterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: c.inputBackground,
    borderWidth: 1,
    borderColor: c.border,
  },
  stickerFilterPillActive: { backgroundColor: dk ? c.surface : c.inputBackground, borderColor: c.primary },
  stickerFilterText: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },
  stickerFilterTextActive: { color: c.primary, fontWeight: '800' },
  stickerSectionTitle: { color: c.primary, fontSize: 12, fontWeight: '700', paddingVertical: 4, marginTop: 4 },
  stickerPackSection: { marginBottom: 8 },
  stickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', alignItems: 'center' },
  stickerCell: { width: 58, height: 58, borderRadius: 10, backgroundColor: c.inputBackground, justifyContent: 'center', alignItems: 'center', marginBottom: 8, overflow: 'hidden' },
  stickerImg: { width: 48, height: 48, resizeMode: 'contain' },
  addStickersRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: c.border, borderStyle: 'dashed', backgroundColor: c.background, gap: 8 },
  addStickersText: { color: c.primary, fontSize: 13, fontWeight: '700' },

  // Bottom input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: c.card, paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: c.border,
    flexShrink: 0,
  },
  inputBarLeading: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: { padding: 4 },
  textInputWrapper: { flex: 1, marginHorizontal: 6, justifyContent: 'center' },
  textInput: {
    flex: 1, minHeight: 42, maxHeight: 120, borderRadius: 21, backgroundColor: c.inputBackground,
    paddingHorizontal: 16, paddingVertical: 10, color: c.text, fontSize: 14,
    textAlignVertical: 'center',
  },
  voiceNoteBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: c.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  recordingBtn: { backgroundColor: c.danger },

  // Modals
  noResults: { color: c.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 24 },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'flex-end', padding: 16 },
  menuSheet: { backgroundColor: c.inputBackground, borderRadius: 14, paddingVertical: 6, width: 230, marginTop: 80 },
  menuRow: { paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: c.border },
  menuRowText: { color: c.text, fontSize: 13, fontWeight: '500' },
  menuRowDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
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
    backgroundColor: c.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 4,
  },
  actionTitle: {
    color: c.textSecondary,
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
    borderTopColor: c.border,
  },
  actionRowLast: { borderBottomWidth: 0 },
  actionText: { fontSize: 14, fontWeight: '600' },

  // Inline edit (meeting chat)
  editBox: { minWidth: 160 },
  editInput: {
    color: c.text,
    fontSize: 14,
    backgroundColor: c.inputBackground,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 6,
  },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  editCancel: { padding: 5 },
  editSave: { backgroundColor: c.primary, borderRadius: 8, padding: 5 },

  // (edited) tag
  editedTag: { color: c.textSecondary, fontSize: 10, fontStyle: 'italic', marginRight: 4 },

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
    backgroundColor: c.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    padding: 22,
    alignItems: 'center',
  },
  confirmTitle: { color: c.text, fontSize: 17, fontWeight: 'bold', marginTop: 10 },
  confirmText: {
    color: c.textSecondary,
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
    borderColor: c.border,
    alignItems: 'center',
  },
  confirmCancelText: { color: c.textSecondary, fontWeight: '600', fontSize: 13 },
  confirmOk: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: c.danger, alignItems: 'center' },
  confirmOkText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
});

