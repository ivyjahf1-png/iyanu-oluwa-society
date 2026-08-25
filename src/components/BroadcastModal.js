import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { X, ArrowRight } from 'lucide-react-native';
import SafeImage from './SafeImage';
import { useBanners } from '../context/BannerContext';

/**
 * BroadcastModal — global announcement/banner popup overlay.
 *
 * When an admin saves an active banner (Channels & Announcements / Banner
 * Manager), it is stored via BannerContext; this component displays the most
 * recent ONE as a high-quality overlay so the latest announcement surfaces on
 * the dashboard. Content (title, image, description, action button) renders
 * dynamically from the stored banner — nothing is hardcoded.
 *
 * "X" dismisses it for the current session (reappears on next launch until the
 * banner's display window expires).
 */
export default function BroadcastModal() {
  const { visibleBanners, dismissBanner } = useBanners();
  const [hasShown, setHasShown] = useState(false);

  // Show the newest active, non-dismissed banner once per session.
  const current = visibleBanners.length ? visibleBanners[0] : null;
  const show = !!current && !hasShown;

  // When a new banner becomes visible (admin posts it live), surface it.
  useEffect(() => {
    if (current && !hasShown) {
      setHasShown(true);
    }
  }, [current, hasShown]);

  if (!show) return null;

  // Photo-only banner: full-bleed image popup with a dismiss (X) button.
  if (current.kind === 'photo') {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={() => dismissBanner(current.id)}>
        <View style={styles.overlay}>
          <View style={[styles.card, styles.photoCard]}>
            {current.imageUri ? (
              <SafeImage source={{ uri: current.imageUri }} style={styles.photoImage} resizeMode="cover" />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Text style={styles.heroEmoji}>🏦</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.photoCloseBtn}
              onPress={() => dismissBanner(current.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => dismissBanner(current.id)}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.cardContent}>
            {current.imageUri ? (
              <SafeImage source={{ uri: current.imageUri }} style={styles.heroImage} resizeMode="cover" />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Text style={styles.heroEmoji}>🏦</Text>
              </View>
            )}

            {!!current.category && (
              <View style={styles.tagRow}>
                <Text style={styles.tagText}>{current.category}</Text>
              </View>
            )}

            {!!current.title && <Text style={styles.title}>{current.title}</Text>}

            {!!current.description && (
              <Text style={styles.description}>{current.description}</Text>
            )}
            <View style={styles.spacer} />
          </ScrollView>

          {/* Action + close */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => dismissBanner(current.id)}
            >
              <Text style={styles.actionBtnText}>Learn More</Text>
              <ArrowRight size={16} color="#091813" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={() => dismissBanner(current.id)}>
              <X size={16} color="#A7F3D0" />
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4,10,8,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '82%',
    backgroundColor: '#0D1D18',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#1C4A2E',
    overflow: 'hidden',
  },
  cardContent: { paddingBottom: 8 },
  photoCard: { maxWidth: 320, position: 'relative' },
  photoImage: { width: '100%', height: 340 },
  photoCloseBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroImage: { width: '100%', height: 190 },
  heroPlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#132620',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroEmoji: { fontSize: 58 },
  tagRow: { paddingHorizontal: 20, paddingTop: 16 },
  tagText: {
    alignSelf: 'flex-start',
    color: '#D4AF37',
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'rgba(212,175,55,0.14)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginTop: 12,
    lineHeight: 26,
  },
  description: {
    color: '#9CB8A6',
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  spacer: { height: 12 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#1B3D28',
    padding: 16,
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
  },
  actionBtnText: { color: '#091813', fontWeight: '800', fontSize: 14 },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  closeText: { color: '#A7F3D0', fontSize: 13, fontWeight: '600' },
});
