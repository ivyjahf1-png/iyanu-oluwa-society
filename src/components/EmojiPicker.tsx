/**
 * EmojiPicker — bottom-sheet emoji picker.
 *
 * Design reference:
 *  - Scrollable modal/sheet with a dark slate background (#12181F).
 *  - Exactly 8 columns per row, compact spacing.
 *  - Left-aligned bold section headers (#E1E7EF).
 *  - Fixed bottom category navigation bar (8 tabs, active = highlighted white).
 *  - Each emoji sits in a centered, >=40x40 touch target.
 *
 * Also keeps the existing sticker tab working by receiving sticker state/
 * handlers from the parent (MeetingChatScreen).
 */
import React, { useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent, LayoutChangeEvent } from 'react-native';
import { STICKER_CATEGORIES, stickersForCategory } from '../data/defaultStickers';

type EmojiCategoryId =
  | 'smileys'
  | 'animals'
  | 'food'
  | 'activity'
  | 'travel'
  | 'objects'
  | 'symbols'
  | 'flags';

interface EmojiCategory {
  id: EmojiCategoryId;
  label: string;
  icon: string;
  data: string[];
}

/** Saved-sticker shape (mirrors the parent's SavedSticker). */
interface StickerItem {
  id: string;
  url: string;
  [key: string]: any;
}

export interface EmojiPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  // ---- Stickers tab (preserved from MeetingChatScreen) ----
  savedStickers: StickerItem[];
  activeStickerCategory: string;
  onStickerCategoryChange: (category: string) => void;
  onSelectSticker: (url: string) => void;
  onLongPressSticker: (url: string, category?: string) => void;
  onRemoveSavedSticker: (id: string) => void;
  onAddStickerHint: () => void;
}

// Exact Smileys & People matrix (4 rows x 8), preserving the requested order.
const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    label: 'Smileys & People',
    icon: '😀',
    data: [
      '😀', '😃', '😄', '😁', '😆', '🥺', '😅', '😂',
      '🤣', '🥲', '☺️', '😊', '😇', '🙂', '🙃', '😉',
      '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋',
      '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎',
    ],
  },
  {
    id: 'animals',
    label: 'Animals & Nature',
    icon: '🐻',
    data: [
      '🐻', '🐻‍❄️', '🐨', '🐼', '🐯', '🦁', '🐮', '🐷',
      '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅',
      '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🦋',
      '🐌', '🐞', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙',
    ],
  },
  {
    id: 'food',
    label: 'Food & Drink',
    icon: '☕',
    data: [
      '☕', '🍵', '🧋', '🍺', '🍻', '🥂', '🍷', '🥤',
      '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈',
      '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆',
      '🍞', '🥐', '🥖', '🧀', '🍗', '🍔', '🍟', '🍕',
    ],
  },
  {
    id: 'activity',
    label: 'Activity & Sports',
    icon: '⚽',
    data: [
      '⚽', '⚾', '🏀', '🏐', '🏈', '🎾', '🏉', '🎱',
      '⛳', '🎯', '🎳', '🏓', '🏸', '🏒', '🏑', '🥅',
      '🎣', '🥊', '🥋', '⛸️', '🎿', '⛷️', '🏂', '🏋️',
      '🤸', '🤺', '🤾', '🏄', '🏊', '🚣', '🏇', '🚴',
    ],
  },
  {
    id: 'travel',
    label: 'Travel & Places',
    icon: '🚘',
    data: [
      '🚘', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓',
      '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🛵',
      '🏍️', '🛺', '🚲', '🛴', '🚁', '🛸', '✈️', '🛫',
      '🏔️', '⛰️', '🌋', '🏝️', '🏖️', '🏜️', '🌃', '🌅',
    ],
  },
  {
    id: 'objects',
    label: 'Objects',
    icon: '💡',
    data: [
      '💡', '🔦', '🪔', '🔋', '🔌', '💻', '🖥️', '⌚',
      '📱', '📲', '💾', '💿', '📀', '🎥', '📷', '📸',
      '📹', '🎬', '🔍', '🔎', '📌', '📎', '✂️', '🖊️',
      '📕', '📗', '📘', '📙', '📔', '📒', '📓', '📃',
    ],
  },
  {
    id: 'symbols',
    label: 'Symbols',
    icon: '🔣',
    data: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
      '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
      '✨', '⭐', '🌟', '💫', '🔥', '⚡', '❄️', '🌈',
      '✅', '❌', '⭕', '❓', '❗', '⚠️', '♻️', '➕',
    ],
  },
  {
    id: 'flags',
    label: 'Flags',
    icon: '🏳️',
    data: [
      '🏳️', '🏳️‍🌈', '🏴', '🏴‍☀️', '🇳🇬', '🇬🇭', '🇰🇪', '🇿🇦',
      '🇬🇧', '🇺🇸', '🇨🇦', '🇦🇺', '🇯🇵', '🇰🇷', '🇨🇳', '🇮🇳',
      '🇫🇷', '🇩🇪', '🇮🇹', '🇪🇸', '🇧🇷', '🇦🇷', '🇲🇽', '🇪🇬',
      '🇸🇦', '🇦🇪', '🇹🇷', '🇷🇺', '🇳🇱', '🇸🇪', '🇳🇴', '🇨🇭',
    ],
  },
];
export default function EmojiPicker({
  visible,
  onClose,
  onSelectEmoji,
  savedStickers,
  activeStickerCategory,
  onStickerCategoryChange,
  onSelectSticker,
  onLongPressSticker,
  onRemoveSavedSticker,
  onAddStickerHint,
}: EmojiPickerProps) {
  const [mode, setMode] = useState<'emojis' | 'stickers'>('emojis');
  const [activeTab, setActiveTab] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<number, number>>({});

  /** Scroll the emoji list so the tapped category is visible. */
  const goToTab = (index: number) => {
    setActiveTab(index);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: sectionOffsets.current[index] ?? 0,
        animated: true,
      });
    });
  };

  /** Track the currently-visible category while scrolling. */
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    let current = 0;
    for (let i = 0; i < EMOJI_CATEGORIES.length; i++) {
      const off = sectionOffsets.current[i] ?? 0;
      if (y >= off - 24) current = i;
    }
    setActiveTab(current);
  };

  const captureSection = (index: number) => (evt: LayoutChangeEvent) => {
    sectionOffsets.current[index] = evt.nativeEvent.layout.y;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Invisible backdrop — tap to dismiss */}
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        {/* Sheet */}
        <View style={styles.sheet}>
          <View style={styles.grabber} />

          {/* Emojis / Stickers + close */}
          <View style={styles.headerRow}>
            <View style={styles.modeSwitch}>
              <TouchableOpacity
                style={[styles.modePill, mode === 'emojis' && styles.modePillActive]}
                onPress={() => setMode('emojis')}
              >
                <Text style={[styles.modeText, mode === 'emojis' && styles.modeTextActive]}>Emojis</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modePill, mode === 'stickers' && styles.modePillActive]}
                onPress={() => setMode('stickers')}
              >
                <Text style={[styles.modeText, mode === 'stickers' && styles.modeTextActive]}>Stickers</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          {mode === 'emojis' ? (
            <>
              {/* Scrollable categorized emoji grid (8 columns) */}
              <ScrollView
                ref={scrollRef}
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={handleScroll}
              >
                {EMOJI_CATEGORIES.map((cat, i) => (
                  <View key={cat.id} onLayout={captureSection(i)}>
                    <Text style={styles.sectionHeader}>{cat.label}</Text>
                    <View style={styles.grid}>
                      {cat.data.map((emoji, idx) => (
                        <TouchableOpacity
                          key={`${cat.id}-${idx}`}
                          style={styles.cell}
                          onPress={() => onSelectEmoji(emoji)}
                          activeOpacity={0.6}
                        >
                          <Text style={styles.cellEmoji}>{emoji}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
                <View style={{ height: 8 }} />
              </ScrollView>

              {/* Bottom category navigation bar */}
              <View style={styles.bottomBar}>
                {EMOJI_CATEGORIES.map((cat, i) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.tab, activeTab === i && styles.tabActive]}
                    onPress={() => goToTab(i)}
                    hitSlop={{ top: 4, bottom: 4 }}
                  >
                    <Text style={[styles.tabIcon, activeTab === i && styles.tabIconActive]}>{cat.icon}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            /* Stickers tab (reuses parent state/handlers) */
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {savedStickers.length > 0 && (
                <>
                  <Text style={styles.sectionHeader}>My Stickers</Text>
                  <View style={styles.grid}>
                    {savedStickers.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        style={styles.stickerCell}
                        onPress={() => onSelectSticker(s.url)}
                        onLongPress={() => onRemoveSavedSticker(s.id)}
                      >
                        <Image source={{ uri: s.url }} style={styles.stickerImg} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.sectionHeader}>Sticker Packs</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.stickerFilterBar}
                contentContainerStyle={{ paddingHorizontal: 4, gap: 8 }}
              >
                {STICKER_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.stickerFilterPill, activeStickerCategory === cat && styles.stickerFilterPillActive]}
                    onPress={() => onStickerCategoryChange(cat)}
                  >
                    <Text style={[styles.stickerFilterText, activeStickerCategory === cat && styles.stickerFilterTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.grid}>
                {stickersForCategory(activeStickerCategory).map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.stickerCell}
                    onPress={() => onSelectSticker(s.url)}
                    onLongPress={() => onLongPressSticker(s.url, s.category)}
                  >
                    <Image source={{ uri: s.url }} style={styles.stickerImg} />
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.addStickersRow} onPress={onAddStickerHint}>
                <Text style={styles.addStickersText}>Long-press a received image to save it as a sticker</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    height: '68%',
    backgroundColor: '#12181F',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 8,
    paddingBottom: 4,
    borderColor: '#26313E',
    borderWidth: StyleSheet.hairlineWidth,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3A4755',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#1B242E',
    borderRadius: 14,
    padding: 3,
    gap: 4,
  },
  modePill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  modePillActive: {
    backgroundColor: '#26323E',
  },
  modeText: {
    color: '#8A98A7',
    fontSize: 13,
    fontWeight: '600',
  },
  modeTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1A242E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#9CB8A6',
    fontSize: 14,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 6,
    paddingTop: 4,
  },
  sectionHeader: {
    color: '#E1E7EF',
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 4,
    paddingTop: 12,
    paddingBottom: 6,
    textAlign: 'left',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // Exactly 8 columns per row.
  cell: {
    width: '12.5%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  cellEmoji: {
    fontSize: 24,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#26313E',
    backgroundColor: '#0E141A',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    opacity: 0.55,
  },
  tabActive: {
    opacity: 1,
    backgroundColor: '#1E2935',
  },
  tabIcon: {
    fontSize: 22,
    color: '#8A97A6',
  },
  tabIconActive: {
    color: '#0F172A',
  },
  // Stickers
  stickerFilterBar: {
    marginVertical: 4,
  },
  stickerFilterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#1A242E',
  },
  stickerFilterPillActive: {
    backgroundColor: '#2F3E4A',
  },
  stickerFilterText: {
    color: '#9CB8A6',
    fontSize: 13,
    fontWeight: '600',
  },
  stickerFilterTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  stickerCell: {
    width: '25%',
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  stickerImg: {
    width: 52,
    height: 52,
    resizeMode: 'contain',
  },
  addStickersRow: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  addStickersText: {
    color: '#9CB8A6',
    fontSize: 12,
  },
});
