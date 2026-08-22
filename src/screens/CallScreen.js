import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, StatusBar } from 'react-native';
import { PhoneOff, MicOff, VideoOff, Volume2, ChevronLeft } from 'lucide-react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';

export default function CallScreen({ route, navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const { type } = route.params || { type: 'voice' };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0B2211" barStyle="light-content" />

      {/* Back navigation control */}
      <View style={styles.backRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#A7F3D0" />
        </TouchableOpacity>
      </View>

      <View style={styles.topInfo}>
        <Text style={styles.callType}>{type === 'video' ? 'CO-OP VIDEO CALL' : 'CO-OP VOICE CALL'}</Text>
        <Text style={styles.groupTitle}>Co-op General Assembly</Text>
        <Text style={styles.status}>Connecting encrypted stream...</Text>
      </View>

      <View style={styles.avatarContainer}>
        <View style={styles.largeAvatar}>
          <Text style={styles.avatarText}>CG</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn}>
          <MicOff color="#FFFFFF" size={22} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn}>
          <VideoOff color="#FFFFFF" size={22} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn}>
          <Volume2 color="#FFFFFF" size={22} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.endCallBtn}>
          <PhoneOff color="#FFFFFF" size={24} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B2211', justifyContent: 'space-between', paddingVertical: 40, paddingHorizontal: 20 },
  backRow: { alignItems: 'flex-start' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1C4A2E', justifyContent: 'center', alignItems: 'center' },
  topInfo: { alignItems: 'center', marginTop: 20 },
  callType: { color: '#A7F3D0', fontSize: 11, fontWeight: 'bold' },
  groupTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginTop: 8 },
  status: { color: '#9CB8A6', fontSize: 12, marginTop: 4 },
  avatarContainer: { alignItems: 'center' },
  largeAvatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#0B2211', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 36, fontWeight: 'bold' },
  controls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#0F2A19', borderRadius: 30, paddingVertical: 14 },
  controlBtn: { backgroundColor: '#1C4A2E', padding: 12, borderRadius: 25 },
  endCallBtn: { backgroundColor: '#FF3B30', padding: 14, borderRadius: 30 },
});