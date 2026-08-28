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
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import {
  Megaphone,
  ShoppingBag,
  Users,
  ShieldCheck,
  ChevronRight,
  Home,
  Car,
  MessageSquare,
  MapPin,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function CoopHubScreen({ navigation: rawNav }) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const navigation = useSafeNavigation(rawNav);
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor='#F4F7F5' barStyle="dark-content" />
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, styles.grow]} showsVerticalScrollIndicator={false}>

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
              <ShoppingBag color={colors.text} size={24} />
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
              <ShieldCheck color={colors.text} size={24} />
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
              <Users color={colors.text} size={24} />
            </LinearGradient>
            <Text style={styles.actionTitle}>Member Directory</Text>
            <Text style={styles.actionDesc}>Browse all members</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}
            onPress={() => navigation.navigate('Announcements')}
          >
            <LinearGradient
              colors={['#10B981', '#0D9488']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionIcon}
            >
              <Megaphone color={colors.text} size={24} />
            </LinearGradient>
            <Text style={styles.actionTitle}>Announcements</Text>
            <Text style={styles.actionDesc}>Society updates</Text>
          </TouchableOpacity>
        </View>

        {/* Cooperative Marketplace hubs — rich rows with category deep-links */}
        <Text style={styles.sectionHeader}>Cooperative Marketplace</Text>
        <View style={styles.hubRows}>
          {/* 1. Land & Property */}
          <TouchableOpacity
            style={styles.hubRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Marketplace', { category: 'land_and_property' })}
          >
            <View style={[styles.hubRowIcon, { backgroundColor: '#10B981' }]}>
              <Home color={colors.text} size={24} />
            </View>
            <View style={styles.hubRowText}>
              <Text style={styles.hubRowTitle}>Land & Property</Text>
              <Text style={styles.hubRowSub}>Acquire plots with flexible payment plans</Text>
            </View>
            <View style={styles.hubRowBadges}>
              <View style={styles.hubBadge}>
                <MapPin color={colors.primaryDark} size={18} />
              </View>
              <ChevronRight color={colors.primaryDark} size={20} />
            </View>
          </TouchableOpacity>

          {/* 2. Vehicles, Home Appliances & Items */}
          <TouchableOpacity
            style={styles.hubRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Marketplace', { category: 'vehicles_and_appliances' })}
          >
            <View style={[styles.hubRowIcon, { backgroundColor: '#3B82F6' }]}>
              <Car color={colors.text} size={24} />
            </View>
            <View style={styles.hubRowText}>
              <Text style={styles.hubRowTitle}>Vehicles & Home Appliances</Text>
              <Text style={styles.hubRowSub}>Member auto financing options</Text>
            </View>
            <View style={styles.hubRowBadges}>
              <View style={[styles.hubBadge, { backgroundColor: '#1D2433' }]}>
                <Car color="#93C5FD" size={18} />
              </View>
              <ChevronRight color={colors.primaryDark} size={20} />
            </View>
          </TouchableOpacity>

          {/* 3. Meeting Chat */}
          <TouchableOpacity
            style={[styles.hubRow, styles.hubRowLast]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('MeetingChat')}
          >
            <View style={[styles.hubRowIcon, { backgroundColor: '#8B5CF6' }]}>
              <MessageSquare color={colors.text} size={24} />
            </View>
            <View style={styles.hubRowText}>
              <Text style={styles.hubRowTitle}>Meeting Chat</Text>
              <Text style={styles.hubRowSub}>Discuss & decide with members</Text>
            </View>
            <ChevronRight color={colors.primaryDark} size={20} />
          </TouchableOpacity>
        </View>

        {/* Member directory list */}
        <Text style={styles.sectionHeader}>Members</Text>
        <View style={styles.listContainer}>
          <TouchableOpacity style={styles.listItem}>
            <View style={styles.listLeft}>
              <Users color={colors.primaryDark} size={20} />
              <Text style={styles.listTitle}>Member Directory</Text>
            </View>
            <ChevronRight color={colors.textSecondary} size={18} />
          </TouchableOpacity>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors, isDark) => StyleSheet.create({
  scrollView: { flex: 1 },
  grow: { flexGrow: 1 },
container: { flex: 1, backgroundColor: '#F4F7F5' },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 24 },
  headerTitle: { color: '#0F172A', fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: '#9CB8A6', fontSize: 12, marginTop: 4, marginBottom: 16 },
  sectionHeader: { color: '#D3F99D', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  actionCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, width: '48%', marginBottom: 10, borderWidth: 1, borderColor: '#D1FAE5' },
  actionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionTitle: { color: '#0F172A', fontSize: 13, fontWeight: '600', marginTop: 8 },
  actionDesc: { color: '#9CB8A6', fontSize: 10, marginTop: 2 },
  listContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#D1FAE5', paddingHorizontal: 14 },
  hubRows: { gap: 12, marginBottom: 16 },
  hubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F291B',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1B3D2A',
  },
  hubRowLast: { marginBottom: 0 },
  hubRowIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  hubRowText: { flex: 1, marginRight: 8 },
  hubRowTitle: { color: '#0F172A', fontSize: 15, fontWeight: '600' },
  hubRowSub: { color: '#9CB8A6', fontSize: 11, marginTop: 2 },
  hubRowBadges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hubBadge: {
    backgroundColor: '#143222',
    padding: 7,
    borderRadius: 8,
  },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1B3D28' },
  hubListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1B3D28' },
  listLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  listTextGroup: { flex: 1 },
  listTitle: { color: '#0F172A', fontSize: 13, fontWeight: '600' },
  listSub: { color: '#9CB8A6', fontSize: 11, marginTop: 2 },
});

const styles = makeStyles(themes.darkEmerald, true);
