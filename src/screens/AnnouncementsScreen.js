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
  Alert,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  ChevronLeft,
  Megaphone,
  Trash2,
  Bell,
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
  const { announcements, addAnnouncement, removeAnnouncement } = useAnnouncements();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [posting, setPosting] = useState(false);

  const postAnnouncement = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Missing details', 'Enter both a title and a message for the announcement.');
      return;
    }
    setPosting(true);
    try {
      addAnnouncement({ title: title.trim(), message: message.trim(), author: 'Admin' });

      // Push notification — banners arrive even when the app is closed.
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `📢 ${title.trim()}`,
          body: message.trim(),
          sound: true,
        },
        trigger: null, // fire immediately
      });

      setTitle('');
      setMessage('');
      Alert.alert('Posted', 'Announcement published and pushed to all members.');
    } catch (e) {
      Alert.alert('Post failed', e.message || 'Could not publish the announcement.');
    }
    setPosting(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor='#091813' />
      <ScreenHeader
        title="Channels & Announcements"
        subtitle="Society-wide updates and push alerts"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, styles.grow]} showsVerticalScrollIndicator={true}>
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
        <TouchableOpacity
          style={[styles.postBtn, posting && styles.btnDisabled]}
          onPress={postAnnouncement}
          disabled={posting}
        >
          <Megaphone size={17} color="#FFFFFF" />
          <Text style={styles.postBtnText}>{posting ? 'Posting…' : 'Post & Notify Members'}</Text>
        </TouchableOpacity>

        {/* Feed */}
        <Text style={styles.sectionTitle}>Recent Announcements</Text>
        {announcements.length === 0 ? (
          <View style={styles.emptyCard}>
            <Bell size={30} color="#9CB8A6" />
            <Text style={styles.emptyText}>No announcements yet.</Text>
          </View>
        ) : (
          announcements.map(a => (
            <View key={a.id} style={styles.announcementCard}>
              <View style={styles.announcementHead}>
                <Bell size={14} color="#10B981" />
                <Text style={styles.authorText}>{a.author}</Text>
                <Text style={styles.dateText}>
                  {new Date(a.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </Text>
                <TouchableOpacity
                  onPress={() => removeAnnouncement(a.id)}
                  style={styles.deleteBtn}
                >
                  <Trash2 size={15} color="#C0392B" />
                </TouchableOpacity>
              </View>
              <Text style={styles.announcementTitle}>{a.title}</Text>
              <Text style={styles.announcementMessage}>{a.message}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  grow: { flexGrow: 1 },
  container: { flex: 1, backgroundColor: '#091813' },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#0D1D18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#172F27',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 12,
  },
  textArea: { height: 84, textAlignVertical: 'top' },
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
  postBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  emptyCard: {
    backgroundColor: '#0D1D18',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#172F27',
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { color: '#8EA89D', fontSize: 12, marginTop: 8 },
  announcementCard: {
    backgroundColor: '#0D1D18',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#172F27',
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
  deleteBtn: { marginLeft: 8, padding: 2 },
  announcementTitle: {
    color: '#FFFFFF',
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
