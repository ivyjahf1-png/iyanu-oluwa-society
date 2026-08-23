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
} from 'react-native';
import {
  Phone,
  Video,
  Send,
  Smile,
  Paperclip,
  Eye,
  EyeOff,
  Mic,
  MoreHorizontal,
  ChevronLeft,
  Search,
  Play,
  FileText,
  Camera,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { storage } from '../lib/storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ChatMessage {
  id: string;
  sender: string;
  text?: string;
  time: string;
  isMe?: boolean;
  isAi?: boolean;
  isVoice?: boolean;
  duration?: string;
  isFile?: boolean;
  fileName?: string;
  fileSize?: string;
  fileUri?: string;
  isImage?: boolean;
  imageUri?: string;
}

type ThemeKey = 'forest' | 'ocean' | 'sunset';

interface ChatTheme {
  label: string;
  headerBg: string;
  pageBg: string;
  mineBg: string;
  otherBg: string;
  inputBg: string;
}

interface VoiceState {
  pressing: boolean;
  recording: boolean;
  seconds: number;
  startY: number;
}

interface OverflowAction {
  label: string;
  onPress: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const EMOJIS = [
  '😀', '😂', '🥰', '😍', '😎', '🤝', '👍', '👏',
  '🙏', '💪', '🔥', '✨', '🎉', '💰', '📈', '🏦',
  '❤️', '🙌', '😅', '😊', '🤔', '📢', '🗓️', '✅',
];

const CHAT_THEMES: Record<ThemeKey, ChatTheme> = {
  forest: { label: 'Forest', headerBg: '#091813', pageBg: '#091813', mineBg: '#1F5C39', otherBg: '#0D1D18', inputBg: '#0D1D18' },
  ocean: { label: 'Ocean', headerBg: '#0B3D5C', pageBg: '#082436', mineBg: '#12617E', otherBg: '#0E3040', inputBg: '#0E3040' },
  sunset: { label: 'Sunset', headerBg: '#5C2E2B', pageBg: '#2A1512', mineBg: '#8A4B3D', otherBg: '#3B201C', inputBg: '#3B201C' },
};

const SEED_MESSAGES: ChatMessage[] = [
  { id: '1', sender: 'President Okon', text: 'Good morning executive members, meeting begins at 4 PM.', time: '09:15 AM', isMe: false },
  { id: '2', sender: 'Coop AI', text: 'Reminder: 12 members have pending monthly dues.', time: '09:16 AM', isAi: true },
  { id: '3', sender: 'Me', text: 'Received. Will join prompt.', time: '09:20 AM', isMe: true },
];

export default function MeetingChatScreen({ navigation }: { navigation: any }) {
  const [activeTab, setActiveTab] = useState<string>('chats');
  const [isOnlineVisible, setIsOnlineVisible] = useState<boolean>(true);
  const [messages, setMessages] = useState<ChatMessage[]>(SEED_MESSAGES);
  const [inputText, setInputText] = useState<string>('');

  // Chat settings — themes / wallpaper / avatar
  const [themeKey, setThemeKey] = useState<ThemeKey>('forest');
  const theme: ChatTheme = CHAT_THEMES[themeKey];
  const [wallpaperUri, setWallpaperUri] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Panels & modals
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [customStickers, setCustomStickers] = useState<string[]>([]);
  const [showOverflowMenu, setShowOverflowMenu] = useState<boolean>(false);
  const [showChatSettings, setShowChatSettings] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  // Voice note drag gesture
  const [voiceState, setVoiceState] = useState<VoiceState>({
    pressing: false,
    recording: false,
    seconds: 0,
    startY: 0,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  // Recording duration ticker
  useEffect(() => {
    if (voiceState.recording) {
      timerRef.current = setInterval(() => {
        setVoiceState(v => ({ ...v, seconds: v.seconds + 1 }));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [voiceState.recording]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // ------------------------------------------------------------------
  // Persistence — chat history survives refreshes and log-outs.
  // ------------------------------------------------------------------
  const CHAT_KEY = '@ius_chat_messages';

  useEffect(() => {
    (async () => {
      try {
        const raw = await storage.getItem(CHAT_KEY);
        if (!raw) return;
        const saved: ChatMessage[] = JSON.parse(raw);
        if (Array.isArray(saved) && saved.length > 0) {
          setMessages(saved);
        }
      } catch (e) {
        console.log('[chat] failed to restore history:', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    storage.setItem(CHAT_KEY, JSON.stringify(messages)).catch(e => {
      console.log('[chat] failed to persist:', e);
    });
  }, [messages]);

  // ------------------------------------------------------------------
  // Messaging helpers
  // ------------------------------------------------------------------
  const pushMessage = (msg: ChatMessage): void => setMessages(prev => [...prev, msg]);

  const appendEmoji = (emoji: string): void => setInputText(prev => prev + emoji);

  const sendMessage = (): void => {
    if (!inputText.trim()) return;
    pushMessage({
      id: Date.now().toString(),
      sender: 'Me',
      text: inputText.trim(),
      time: 'Now',
      isMe: true,
    });
    setInputText('');
  };

  const fmtDuration = (s: number): string =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Voice note: drag UP to record, drag DOWN to complete & send.
  const onMicTouchStart = (e: GestureResponderEvent): void => {
    setVoiceState({
      pressing: true,
      recording: false,
      seconds: 0,
      startY: e.nativeEvent.pageY,
    });
  };

  const onMicTouchMove = (e: GestureResponderEvent): void => {
    const dy = e.nativeEvent.pageY - voiceState.startY;
    if (voiceState.pressing && !voiceState.recording && dy < -40) {
      setVoiceState(prev => ({ ...prev, recording: true }));
    }
  };

  const finalizeVoiceNote = (): void => {
    const secs = voiceState.seconds;
    const wasRecording = voiceState.recording;
    if (timerRef.current) clearInterval(timerRef.current);
    setVoiceState({ pressing: false, recording: false, seconds: 0, startY: 0 });
    if (wasRecording && secs > 0) {
      pushMessage({
        id: `v-${Date.now()}`,
        sender: 'Me',
        time: 'Now',
        isMe: true,
        isVoice: true,
        duration: fmtDuration(secs),
      });
    }
  };

  const onMicTouchEnd = (): void => {
    // Releasing (drag back down) completes and sends the voice note.
    finalizeVoiceNote();
  };

  // Media importer — files, photos & audio from device storage.
  const pickAttachment = async (): Promise<void> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'audio/*', 'video/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const file = result.assets[0];
      pushMessage({
        id: `f-${Date.now()}`,
        sender: 'Me',
        time: 'Now',
        isMe: true,
        isFile: true,
        fileName: file.name,
        fileUri: file.uri,
        fileSize: `${Math.max(1, Math.round((file.size || 0) / 1024))} KB`,
      });
    } catch (e) {
      Alert.alert('Import error', 'Could not import the selected file.');
    }
  };

  const pickImageAsset = (purpose: 'sticker' | 'wallpaper' | 'avatar'): void => {
    DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true })
      .then(result => {
        if (result.canceled || !result.assets || result.assets.length === 0) return;
        const uri: string = result.assets[0].uri;
        if (purpose === 'sticker') setCustomStickers(prev => [...prev, uri]);
        else if (purpose === 'wallpaper') setWallpaperUri(uri);
        else if (purpose === 'avatar') setAvatarUri(uri);
      })
      .catch(() => Alert.alert('Import error', 'Could not open the picker.'));
  };

  const sendCustomSticker = (uri: string): void => {
    pushMessage({
      id: `s-${Date.now()}`,
      sender: 'Me',
      time: 'Now',
      isMe: true,
      isImage: true,
      imageUri: uri,
    });
  };

  // Download / save a photo or file locally (web triggers a browser
  // download; native opens the system share-save sheet).
  const downloadMedia = async (uri: string, name?: string): Promise<void> => {
    try {
      if (!uri) throw new Error('No file location');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: name && name.endsWith('.pdf') ? 'application/pdf' : undefined,
          dialogTitle: name ? `Save ${name}` : 'Save file',
        });
      } else {
        Alert.alert('Download', 'Saving is not supported on this device.');
      }
    } catch (e) {
 Alert.alert('Download failed', (e as Error).message || 'Could not save the file.');
    }
  };
  // Overflow menu actions — every target is a registered route.
  const overflowActions: OverflowAction[] = [
    {
      label: 'Group Call Initiation',
      onPress: () => {
        setShowOverflowMenu(false);
        navigation.navigate('CallScreen', { type: 'voice' });
      },
    },
    {
      label: 'Create Group Meeting',
      onPress: () => {
        setShowOverflowMenu(false);
        pushMessage({
          id: `m-${Date.now()}`,
          sender: 'System',
          text: 'Group meeting created — invites sent to all members.',
          time: 'Now',
          isMe: false,
        });
      },
    },
    {
      label: 'Search Chat History',
      onPress: () => {
        setShowOverflowMenu(false);
        setShowSearch(true);
      },
    },
    {
      label: 'Chat Settings',
      onPress: () => {
        setShowOverflowMenu(false);
        setShowChatSettings(true);
      },
    },
  ];

  const visibleMessages: ChatMessage[] =
    showSearch && searchQuery.trim()
      ? messages.filter(m =>
          (m.text ?? '').toLowerCase().includes(searchQuery.trim().toLowerCase()),
        )
      : messages;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.pageBg }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.headerBg} />

      {/* Header — back button, avatar, actions & overflow menu */}
      <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => pickImageAsset('avatar')}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>CG</Text>
              </View>
            )}
          </TouchableOpacity>
          <View>
            <Text style={styles.groupName}>Co-op General Assembly</Text>
            <Text style={styles.onlineStatus}>
              {isOnlineVisible ? '34 members online' : 'Status Hidden (Ghost Mode)'}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('CallScreen', { type: 'voice' })}>
            <Phone color="#FFFFFF" size={20} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('CallScreen', { type: 'video' })}>
            <Video color="#FFFFFF" size={20} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsOnlineVisible(!isOnlineVisible)}>
            {isOnlineVisible ? <Eye color="#FFFFFF" size={20} /> : <EyeOff color="#FFD700" size={20} />}
          </TouchableOpacity>
          {/* Overflow (three dots) menu trigger */}
          <TouchableOpacity onPress={() => setShowOverflowMenu(true)}>
            <MoreHorizontal color="#FFFFFF" size={22} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat history search bar */}
      {showSearch ? (
        <View style={[styles.searchBar, { backgroundColor: theme.inputBg }]}>
          <Search size={16} color="#9CB8A6" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search chat history..."
            placeholderTextColor="#9CB8A6"
          />
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setShowSearch(false);
            }}
          >
            <Text style={styles.searchCancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Secondary navigation bar */}
      <View style={[styles.tabBar, { backgroundColor: theme.headerBg }]}>
        {(['chats', 'status', 'calls'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main Chat Body */}
      {activeTab === 'chats' ? (
        <View style={styles.chatContainer}>
          {/* Wallpaper layer */}
          {wallpaperUri ? (
            <Image source={{ uri: wallpaperUri }} style={styles.wallpaper} blurRadius={2} />
          ) : null}

          <ScrollView
            style={styles.scrollView}
            ref={scrollRef}
            contentContainerStyle={[styles.messageList, styles.grow]}
            showsVerticalScrollIndicator={false}
          >
            {visibleMessages.length === 0 ? (
              <Text style={styles.noResults}>No messages match your search.</Text>
            ) : null}

            {visibleMessages.map(msg => (
              <View
                key={msg.id}
                style={[
                  styles.msgBubble,
                  msg.isMe ? styles.myMsg : styles.otherMsg,
                  msg.isAi && styles.aiMsg,
                  {
                    backgroundColor: msg.isAi
                      ? '#38201D'
                      : msg.isMe
                      ? theme.mineBg
                      : theme.otherBg,
                  },
                ]}
              >
                {!msg.isMe && !msg.isAi && msg.sender ? (
                  <Text style={styles.senderName}>{msg.sender}</Text>
                ) : null}

                {msg.isVoice ? (
                  <View style={styles.voiceRow}>
                    <Play size={18} color="#4CAF50" />
                    {[3, 8, 5, 10, 6, 9, 4, 7].map((h, i) => (
                      <View key={i} style={[styles.waveBar, { height: h }]} />
                    ))}
                    <Text style={styles.voiceDuration}>{msg.duration ?? '0:00'}</Text>
                  </View>
                ) : msg.isFile ? (
                  <TouchableOpacity
                    style={styles.fileDownloadCard}
                    onPress={() => downloadMedia(msg.fileUri || '', msg.fileName)}
                  >
                    <FileText size={22} color="#A7F3D0" />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.msgText} numberOfLines={1}>
                        {msg.fileName ?? 'Attachment'}
                      </Text>
                      <Text style={styles.fileSize}>{msg.fileSize ?? ''}</Text>
                    </View>
                    <Text style={styles.downloadBtn}>Download</Text>
                  </TouchableOpacity>
                ) : msg.isImage && msg.imageUri ? (
                  <TouchableOpacity onPress={() => setViewerUri(msg.imageUri as string)}>
                    <Image source={{ uri: msg.imageUri }} style={styles.stickerImage} />
                    <Text style={styles.mediaHint}>Tap to view full size</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.msgText}>{msg.text ?? ''}</Text>
                )}
                <Text style={styles.msgTime}>{msg.time}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Voice note recording bar (drag up on mic) */}
          {voiceState.recording ? (
            <View style={styles.recordingBar}>
              <Mic size={20} color="#FF3B30" />
              <Text style={styles.recordingText}>
                Recording… {fmtDuration(voiceState.seconds)}
              </Text>
              <Text style={styles.recordingHint}>Drag down to send</Text>
            </View>
          ) : null}

          {/* Bottom input architecture — mic drag-to-record */}
          <View style={[styles.inputContainer, { backgroundColor: theme.inputBg }]}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile color="#9CB8A6" size={22} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={pickAttachment}>
              <Paperclip color="#9CB8A6" size={20} />
            </TouchableOpacity>

            <TextInput
              onChangeText={setInputText}
              placeholder="Type a message..."
              placeholderTextColor="#9CB8A6"
              style={styles.textInput}
              value={inputText}
            />

            {/* Microphone — drag up to record, drag down to send */}
            <View
              style={[styles.micBtn, voiceState.recording && styles.micBtnRecording]}
              onTouchStart={onMicTouchStart}
              onTouchMove={onMicTouchMove}
              onTouchEnd={onMicTouchEnd}
            >
              <Mic color="#FFFFFF" size={20} />
            </View>

            <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
              <Send color="#FFFFFF" size={18} />
            </TouchableOpacity>
          </View>

          {/* Emoji picker & sticker creator panel */}
          {showEmojiPicker ? (
            <View style={[styles.emojiPanel, { backgroundColor: theme.inputBg }]}>
              <View style={styles.emojiGrid}>
                {EMOJIS.map(e => (
                  <TouchableOpacity key={e} onPress={() => appendEmoji(e)}>
                    <Text style={styles.emojiCell}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.stickerSection}>
                <TouchableOpacity
                  style={styles.createStickerBtn}
                  onPress={() => pickImageAsset('sticker')}
                >
                  <Camera size={15} color="#FFFFFF" />
                  <Text style={styles.createStickerText}>Create Custom Emoji</Text>
                </TouchableOpacity>

                {customStickers.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {customStickers.map(uri => (
                      <TouchableOpacity key={uri} onPress={() => sendCustomSticker(uri)}>
                        <Image source={{ uri }} style={styles.stickerChip} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.stickerHint}>Pick a photo to create a custom sticker.</Text>
                )}
              </View>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.centerContainer}>
          <Text style={{ color: '#FFFFFF' }}>{activeTab.toUpperCase()} Section Active</Text>
        </View>
      )}

      {/* Overflow menu modal */}
      <Modal visible={showOverflowMenu} transparent animationType="fade">
        <TouchableOpacity style={styles.menuOverlay} onPress={() => setShowOverflowMenu(false)}>
          <View style={styles.menuSheet}>
            {overflowActions.map(action => (
              <TouchableOpacity
                key={action.label}
                style={styles.menuRow}
                onPress={() => {
                  try {
                    action.onPress();
                  } catch (e) {
                    Alert.alert('Coming Soon', 'This feature will be available soon.');
                  }
                }}
              >
                <Text style={styles.menuRowText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Chat settings modal — themes / wallpaper / avatar */}
      <Modal visible={showChatSettings} transparent animationType="slide">
        <View style={styles.settingsOverlay}>
          <View style={styles.settingsSheet}>
            <View style={styles.settingsHeaderRow}>
              <Text style={styles.settingsTitle}>Chat Settings</Text>
              <TouchableOpacity onPress={() => setShowChatSettings(false)}>
                <Text style={styles.settingsDone}>Done</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.settingsLabel}>Theme</Text>
            <View style={styles.themeRow}>
              {(Object.keys(CHAT_THEMES) as ThemeKey[]).map(key => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.themeChip,
                    { backgroundColor: CHAT_THEMES[key].headerBg },
                    themeKey === key && styles.themeChipActive,
                  ]}
                  onPress={() => setThemeKey(key)}
                >
                  <Text style={styles.themeChipText}>{CHAT_THEMES[key].label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.settingsLabel}>Wallpaper</Text>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => pickImageAsset('wallpaper')}
            >
              <Camera size={16} color="#FFFFFF" />
              <Text style={styles.pickerBtnText}>Choose device photo</Text>
            </TouchableOpacity>
            {wallpaperUri ? (
              <Image source={{ uri: wallpaperUri }} style={styles.wallpaperPreview} />
            ) : null}

            <Text style={styles.settingsLabel}>Profile Photo</Text>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => pickImageAsset('avatar')}
            >
              <Camera size={16} color="#FFFFFF" />
              <Text style={styles.pickerBtnText}>Update chat avatar</Text>
            </TouchableOpacity>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarPreview} />
            ) : null}
          </View>
        </View>
      </Modal>

    {/* Attachment image viewer */}
    <Modal transparent visible={!!viewerUri} animationType="fade" onRequestClose={() => setViewerUri(null)}>
      <TouchableOpacity style={styles.viewerBackdrop} activeOpacity={1} onPress={() => setViewerUri(null)}>
        <Image source={{ uri: viewerUri || '' }} style={styles.viewerImage} resizeMode="contain" />
      </TouchableOpacity>
    </Modal>
  </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  grow: { flexGrow: 1 },
  container: { flex: 1, backgroundColor: '#091813' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  backBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#172F27',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: { width: 38, height: 38, borderRadius: 19 },
  avatarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  groupName: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  onlineStatus: { color: '#A7F3D0', fontSize: 10 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginLeft: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, marginHorizontal: 12, paddingHorizontal: 10, marginBottom: 6 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 13, paddingVertical: 8, marginLeft: 8 },
  searchCancel: { color: '#10B981', fontSize: 12, fontWeight: '600' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#172F27' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#10B981' },
  tabText: { color: '#9CB8A6', fontSize: 11, fontWeight: 'bold' },
  activeTabText: { color: '#FFFFFF' },
  chatContainer: { flex: 1 },
  wallpaper: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.25 },
  messageList: { padding: 14 },
  mediaHint: { color: '#A7F3D0', fontSize: 9, marginTop: 4, textAlign: 'center' },
  fileDownloadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#172F27',
    borderRadius: 10,
    padding: 10,
    minWidth: 180,
  },
  downloadBtn: { color: '#10B981', fontWeight: 'bold', fontSize: 11, marginLeft: 10 },
  noResults: { color: '#9CB8A6', fontSize: 12, textAlign: 'center', marginTop: 20 },
  msgBubble: { borderRadius: 12, padding: 10, marginBottom: 10, maxWidth: '82%' },
  myMsg: { alignSelf: 'flex-end' },
  otherMsg: { alignSelf: 'flex-start' },
  aiMsg: { borderColor: '#10B981', borderWidth: 1 },
  senderName: { color: '#A7F3D0', fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
  msgText: { color: '#FFFFFF', fontSize: 13 },
  msgTime: { color: '#8E8E93', fontSize: 9, textAlign: 'right', marginTop: 4 },
  fileSize: { color: '#9CB8A6', fontSize: 9, marginTop: 2 },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  waveBar: { width: 3, borderRadius: 2, backgroundColor: '#10B981', marginHorizontal: 1 },
  voiceDuration: { color: '#A7F3D0', fontSize: 10, marginLeft: 6 },
  fileRow: { flexDirection: 'row', alignItems: 'center' },
  stickerImage: { width: 120, height: 120, borderRadius: 10 },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerClose: { position: 'absolute', top: 40, right: 20 },
  viewerCloseText: { color: '#FFFFFF', fontSize: 28 },
  viewerImage: { width: '90%', height: '80%' },
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B0A0A',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  recordingText: { color: '#FF6B60', fontSize: 12, fontWeight: '600', flex: 1 },
  recordingHint: { color: '#9CB8A6', fontSize: 10 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 8, gap: 6 },
  iconBtn: { padding: 6 },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 13,
  },
  micBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micBtnRecording: { backgroundColor: '#FF3B30' },
  sendBtn: { backgroundColor: '#10B981', padding: 10, borderRadius: 20 },
  emojiPanel: { padding: 12, maxHeight: 260 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  emojiCell: { fontSize: 24, padding: 6 },
  stickerSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#172F27',
    paddingTop: 10,
  },
  createStickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  createStickerText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  stickerChip: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  stickerHint: { color: '#9CB8A6', fontSize: 11 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'flex-end',
    padding: 16,
  },
  menuSheet: {
    backgroundColor: '#132620',
    borderRadius: 14,
    paddingVertical: 6,
    width: 230,
    marginTop: 90,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F0',
  },
  menuRowText: { color: '#091813', fontSize: 13, fontWeight: '500', marginLeft: 10 },
  settingsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  settingsSheet: {
    backgroundColor: '#132620',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  settingsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingsTitle: { color: '#091813', fontSize: 16, fontWeight: 'bold' },
  settingsDone: { color: '#10B981', fontSize: 14, fontWeight: 'bold' },
  settingsLabel: {
    color: '#091813',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 8,
  },
  themeRow: { flexDirection: 'row', gap: 10 },
  themeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeChipActive: { borderColor: '#10B981' },
  themeChipText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 11,
  },
  pickerBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  wallpaperPreview: { width: '100%', height: 110, borderRadius: 12, marginTop: 10 },
  avatarPreview: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginTop: 10,
    alignSelf: 'center',
  },
});
