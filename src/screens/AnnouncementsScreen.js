import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Switch,
  Image,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';
import * as Notifications from 'expo-notifications';
import {
  ChevronLeft,
  Megaphone,
  Trash2,
  Bell,
  Upload,
  ImageIcon,
} from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { useAnnouncements } from '../context/AnnouncementsContext';

// Configure how notification banners behave while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function AnnouncementsScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const { announcements, addAnnouncement, removeAnnouncement } = useAnnouncements();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [active, setActive] = useState(true);
  const [posting, setPosting] = useState(false);

  const pickImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Upload error', 'Could not open the image picker.');
    }
  };

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setImageUri(null);
    setActive(true);
  };

  const postAnnouncement = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Missing details', 'Enter both a title and a message for the announcement.');
      return;
    }
    setPosting(true);
    try {
      // Writes title, message, image_url, is_active, created_at to Supabase.
      addAnnouncement({
        title: title.trim(),
        message: message.trim(),
        author: 'Admin',
        imageUri,
        active,
      });

      // Push notification — banners arrive even when the app is closed.
      if (active) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `📢 ${title.trim()}`,
            body: message.trim(),
            sound: true,
          },
          trigger: null, // fire immediately
        });
      }

      resetForm();
      Alert.alert('Posted', 'Announcement published and pushed to all members.');
    } catch (e) {
      Alert.alert('Post failed', e.message || 'Could not publish the announcement.');
    }
    setPosting(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7F5" />
      <ScreenHeader
        title="Channels & Announcements"
        subtitle="Society-wide updates and push alerts"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, styles.grow]}
        showsVerticalScrollIndicator={false}
      >
        {/* Admin compose */}
        <Text style={styles.sectionTitle}>Post Announcement (Admin)</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Announcement title"
          placeholderTextColor="#526E63"
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          value={message}
          onChangeText={setMessage}
          placeholder="Announcement message..."
          placeholderTextColor="#526E63"
          multiline
          numberOfLines={3}
        />

        {/* Image picker */}
        <TouchableOpacity
          style={styles.imagePickerBtn}
          onPress={pickImage}
          activeOpacity={0.8}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.pickedImage} />
          ) : (
            <>
              <ImageIcon size={18} color="#526E63" />
              <Text style={styles.imagePickerText}>Add an image (optional)</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Active toggle */}
        <View style={styles.rowBetween}>
          <Text style={styles.toggleLabel}>Publish live to members</Text>
          <Switch
            value={active}
            onValueChange={setActive}
            thumbColor={active ? '#10B981' : '#CBD5E1'}
          />
        </View>

        <TouchableOpacity
          style={[styles.postBtn, posting && styles.btnDisabled]}
          onPress={postAnnouncement}
          disabled={posting}
        >
          <Megaphone size={17} color={colors.text} />
          <Text style={styles.postBtnText}>
            {posting ? 'Posting…' : 'Post & Notify Members'}
          </Text>
        </TouchableOpacity>
        {/* Feed */}
        <Text style={styles.sectionTitle}>Recent Announcements</Text>
        {announcements.length === 0 ? (
          <View style={styles.emptyCard}>
            <Bell size={30} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No announcements yet.</Text>
          </View>
        ) : (
          announcements.map((a) => (
            <View key={a.id} style={styles.announcementCard}>
              <View style={styles.announcementHead}>
                <Bell size={14} color={colors.success} />
                <Text style={styles.authorText}>{a.author}</Text>
                <Text style={styles.dateText}>
                  {new Date(a.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </Text>
                <View
                  style={[
                    styles.activeDot,
                    { backgroundColor: a.active ? '#10B981' : '#CBD5E1' },
                  ]}
                />
                <TouchableOpacity
                  onPress={() => removeAnnouncement(a.id)}
                  style={styles.deleteBtn}
                >
                  <Trash2 size={15} color={colors.danger} />
                </TouchableOpacity>
              </View>
              <Text style={styles.announcementTitle}>{a.title}</Text>
              <Text style={styles.announcementMessage}>{a.message}</Text>
              {a.imageUrl ? (
                <Image source={{ uri: a.imageUrl }} style={styles.feedImage} />
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors, isDark) =>
  StyleSheet.create({
    scrollView: { flex: 1 },
    grow: { flexGrow: 1 },
    container: { flex: 1, backgroundColor: '#F4F7F5' },
    content: { padding: 16, paddingBottom: 32 },
    sectionTitle: {
      color: '#0F172A',
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 10,
      marginTop: 6,
    },
    input: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#D1FAE5',
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: '#0F172A',
      fontSize: 14,
      marginBottom: 12,
    },
    textArea: { height: 84, textAlignVertical: 'top' },
    imagePickerBtn: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#D1FAE5',
      paddingHorizontal: 14,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    pickedImage: { width: 48, height: 48, borderRadius: 8 },
    feedImage: {
      width: '100%',
      height: 160,
      borderRadius: 10,
      marginTop: 8,
      resizeMode: 'cover',
    },
    imagePickerText: { color: '#526E63', fontSize: 13 },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      marginBottom: 12,
    },
    toggleLabel: { color: '#0F172A', fontSize: 14 },
    postBtn: {
      backgroundColor: '#10B981',
      borderRadius: 12,
      paddingVertical: 13,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      marginBottom: 22,
    },
    btnDisabled: { opacity: 0.6 },
    postBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 13 },
    emptyCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#D1FAE5',
      padding: 24,
      alignItems: 'center',
    },
    emptyText: { color: '#8EA89D', fontSize: 12, marginTop: 8 },
    announcementCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#D1FAE5',
      padding: 14,
      marginBottom: 10,
    },
    announcementHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    authorText: { color: '#127A41', fontSize: 11, fontWeight: 'bold' },
    dateText: { color: '#4B6358', fontSize: 10, marginLeft: 'auto' },
    activeDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    deleteBtn: { marginLeft: 8, padding: 2 },
    announcementTitle: {
      color: '#0F172A',
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    announcementMessage: {
      color: '#8EA89D',
      fontSize: 12,
      lineHeight: 17,
    },
  });

const styles = makeStyles(themes.darkEmerald, true);

