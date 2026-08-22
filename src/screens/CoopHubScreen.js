import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import {
  MessageSquare,
  ShoppingBag,
  Users,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function CoopHubScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0B2211" barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Text style={styles.headerTitle}>Co-op Hub</Text>
        <Text style={styles.headerSub}>Meetings, community marketplace, and member tools</Text>

        {/* Quick actions — vibrant colorful badge icons */}
        <Text style={styles.sectionHeader}>Community Tools</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionCard}
            onPress={() => navigation.navigate('Marketplace')}
          >
            <LinearGradient
              colors={['#F59E0B', '#EA580C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionIcon}
            >
              <ShoppingBag color="#FFFFFF" size={24} />
            </LinearGradient>
            <Text style={styles.actionTitle}>Marketplace</Text>
            <Text style={styles.actionDesc}>Land, cars & items</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <LinearGradient
              colors={['#7C3AED', '#4F46E5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionIcon}
            >
              <ShieldCheck color="#FFFFFF" size={24} />
            </LinearGradient>
            <Text style={styles.actionTitle}>Admin Group</Text>
            <Text style={styles.actionDesc}>Restricted access</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <LinearGradient
              colors={['#2563EB', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionIcon}
            >
              <Users color="#FFFFFF" size={24} />
            </LinearGradient>
            <Text style={styles.actionTitle}>Member Directory</Text>
            <Text style={styles.actionDesc}>Browse all members</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <LinearGradient
              colors={['#10B981', '#0D9488']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionIcon}
            >
              <MessageSquare color="#FFFFFF" size={24} />
            </LinearGradient>
            <Text style={styles.actionTitle}>Channels & Announcements</Text>
            <Text style={styles.actionDesc}>Society updates</Text>
          </TouchableOpacity>
        </View>

        {/* Member directory list */}
        <Text style={styles.sectionHeader}>Members</Text>
        <View style={styles.listContainer}>
          <TouchableOpacity style={styles.listItem}>
            <View style={styles.listLeft}>
              <Users color="#A7F3D0" size={20} />
              <Text style={styles.listTitle}>Member Directory</Text>
            </View>
            <ChevronRight color="#9CB8A6" size={18} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.listItem}>
            <View style={styles.listLeft}>
              <MessageSquare color="#A7F3D0" size={20} />
              <Text style={styles.listTitle}>Channels & Announcements</Text>
            </View>
            <ChevronRight color="#9CB8A6" size={18} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: '#0B2211' },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 24 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: '#9CB8A6', fontSize: 12, marginTop: 4, marginBottom: 16 },
  sectionHeader: { color: '#D3F99D', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  actionCard: { backgroundColor: '#0F2A19', borderRadius: 12, padding: 14, width: '48%', marginBottom: 10, borderWidth: 1, borderColor: '#1C4A2E' },
  actionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1C4A2E', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginTop: 8 },
  actionDesc: { color: '#9CB8A6', fontSize: 10, marginTop: 2 },
  listContainer: { backgroundColor: '#0F2A19', borderRadius: 12, borderWidth: 1, borderColor: '#1C4A2E', paddingHorizontal: 14 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1B3D28' },
  listLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' },
});