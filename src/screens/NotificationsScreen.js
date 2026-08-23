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
  Alert,
} from 'react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { Bell, CalendarClock, Volume2, Music } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import ScreenHeader from '../components/ScreenHeader';
import { useUser } from '../context/UserContext';

const SOUNDS = ['Chime', 'Ping', 'Marimba', 'Coop Drum'];

export default function NotificationsScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const { user, updateUser } = useUser();
  const [remindersEnabled, setRemindersEnabled] = useState(user.remindersEnabled);
  const [reminderFrequency, setReminderFrequency] = useState(user.reminderFrequency);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(user.reminderDaysBefore);
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState(user.soundAlertsEnabled);
  const [alertSound, setAlertSound] = useState(user.alertSound);
  const [alertSoundUri, setAlertSoundUri] = useState(user.alertSoundUri ?? null);
  const [alertSoundName, setAlertSoundName] = useState(
    user.alertSoundUri ? 'Custom sound' : '',
  );

  // Pick a custom notification audio file from device storage.
  const pickDeviceAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const picked = result.assets[0];
        setAlertSoundUri(picked.uri);
        setAlertSoundName(picked.name || 'Custom sound');
        updateUser({ alertSoundUri: picked.uri });
      }
    } catch (e) {
      Alert.alert('Import error', 'Could not open the audio picker.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B2211" />
      <ScreenHeader
        title="Notifications & Reminders"
        subtitle="Payment alerts and scheduling"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, styles.grow]} showsVerticalScrollIndicator={true}>
        {/* Payment consistency scheduler */}
        <Text style={styles.sectionTitle}>Payment Consistency Scheduler</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <CalendarClock size={20} color="#F59E0B" />
            <View style={styles.switchTextGroup}>
              <Text style={styles.switchTitle}>Automated Payment Reminders</Text>
              <Text style={styles.switchSub}>Alert me before my next cooperative payment</Text>
            </View>
            <Switch
              value={remindersEnabled}
              onValueChange={v => {
                setRemindersEnabled(v);
                updateUser({ remindersEnabled: v });
              }}
              trackColor={{ false: '#1C4A2E', true: '#4CAF50' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {remindersEnabled && (
            <>
              <Text style={styles.label}>Schedule Frequency</Text>
              <View style={styles.chipRow}>
                {['weekly', 'monthly'].map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.chip, reminderFrequency === f && styles.chipActive]}
                    onPress={() => {
                      setReminderFrequency(f);
                      updateUser({ reminderFrequency: f });
                    }}
                  >
                    <Text
                      style={[styles.chipText, reminderFrequency === f && styles.chipTextActive]}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Remind Me (days before due date)</Text>
              <TextInput
                style={styles.input}
                value={String(reminderDaysBefore)}
                onChangeText={t => {
                  const clean = t.replace(/[^0-9]/g, '');
                  setReminderDaysBefore(clean);
                  updateUser({ reminderDaysBefore: clean });
                }}
                placeholder="e.g. 3"
                placeholderTextColor="#93A69B"
                keyboardType="number-pad"
                maxLength={2}
              />
            </>
          )}
        </View>

        {/* Audio alert configuration */}
        <Text style={styles.sectionTitle}>Audio Alert Configuration</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <Volume2 size={20} color="#2563EB" />
            <View style={styles.switchTextGroup}>
              <Text style={styles.switchTitle}>Sound Alerts</Text>
              <Text style={styles.switchSub}>Play a sound for payment notifications</Text>
            </View>
            <Switch
              value={soundAlertsEnabled}
              onValueChange={v => {
                setSoundAlertsEnabled(v);
                updateUser({ soundAlertsEnabled: v });
              }}
              trackColor={{ false: '#1C4A2E', true: '#4CAF50' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {soundAlertsEnabled && (
            <>
              <Text style={styles.label}>Alert Sound</Text>
              <View style={styles.soundGrid}>
                {SOUNDS.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.soundChip, alertSound === s && styles.chipActive]}
                    onPress={() => {
                      setAlertSound(s);
                      updateUser({ alertSound: s, alertSoundUri: null });
                    }}
                  >
                    <Music size={14} color={alertSound === s ? '#FFFFFF' : '#4CAF50'} />
                    <Text style={[styles.chipText, alertSound === s && styles.chipTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom audio from device storage */}
              <TouchableOpacity
                style={styles.deviceAudioBtn}
                onPress={() => pickDeviceAudio()}
              >
                <Music size={16} color="#FFFFFF" />
                <Text style={styles.deviceAudioText}>
                  {alertSoundUri
                    ? `Custom: ${alertSoundName}`
                    : 'Choose audio file from device'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.noteCard}>
          <Bell size={16} color="#8B5CF6" />
          <Text style={styles.noteText}>
            Reminder settings apply to your {reminderFrequency} cooperative contribution schedule.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  grow: { flexGrow: 1 },
  container: { flex: 1, backgroundColor: '#0B2211' },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: {
    color: '#0B2211',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 6,
  },
  card: {
    backgroundColor: '#0F2A19',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1C4A2E',
    marginBottom: 18,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchTextGroup: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  switchTitle: {
    color: '#0B2211',
    fontSize: 13,
    fontWeight: '600',
  },
  switchSub: {
    color: '#93A69B',
    fontSize: 11,
    marginTop: 2,
  },
  label: {
    color: '#0B2211',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F2A19',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1C4A2E',
    paddingVertical: 9,
  },
  chipActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  chipText: {
    color: '#0B2211',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#0F2A19',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1C4A2E',
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#0B2211',
    fontSize: 14,
  },
  soundGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  deviceAudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0B2211',
    borderRadius: 12,
    paddingVertical: 11,
    marginTop: 4,
  },
  deviceAudioText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  soundChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F2A19',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1C4A2E',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F2A19',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1C4A2E',
    gap: 8,
  },
  noteText: {
    flex: 1,
    color: '#93A69B',
    fontSize: 11,
    lineHeight: 15,
  },
});
