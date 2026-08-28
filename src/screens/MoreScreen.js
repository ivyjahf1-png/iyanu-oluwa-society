import React from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { Menu, Settings, ChevronRight, CheckCircle2, PackageOpen, Megaphone, Users, Trash2, Award } from 'lucide-react-native';
import { Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function MoreScreen({ navigation: rawNav }) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const navigation = useSafeNavigation(rawNav);
  const { resetAllAccounts } = useAuth();

  const confirmClearAllData = () => {
    Alert.alert(
      'Clear All Data (Dev)',
      'This permanently deletes every account, passcode and biometric setting on this device. Previously used emails become available for fresh sign-ups. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetAllAccounts();
            Alert.alert('Accounts Cleared', 'All accounts were removed. You can now sign up fresh.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B2211" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={true} contentContainerStyle={[styles.scrollContent, styles.grow]}>
        <View style={styles.headerCard}>
          <Menu size={40} color={colors.primaryDark} />
          <Text style={styles.title}>More</Text>
          <Text style={styles.subtitle}>Settings, support, and additional services will appear here.</Text>
        </View>

        {/* Admin area */}
        <TouchableOpacity
          style={styles.adminRow}
          onPress={() => navigation.navigate('AdminSettings')}
        >
          <View style={[styles.adminIcon, { backgroundColor: '#8B5CF6' }]}>
            <Settings size={20} color={colors.text} />
          </View>
          <View style={styles.adminTextGroup}>
            <Text style={styles.adminTitle}>Admin Settings</Text>
            <Text style={styles.adminSub}>Configure the cooperative bank account</Text>
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.adminRow}
          onPress={() => navigation.navigate('AdminDeposits')}
        >
          <View style={[styles.adminIcon, { backgroundColor: '#2563EB' }]}>
            <CheckCircle2 size={20} color={colors.text} />
          </View>
          <View style={styles.adminTextGroup}>
            <Text style={styles.adminTitle}>Verify Deposits</Text>
            <Text style={styles.adminSub}>Review pending manual funding proofs</Text>
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
        </TouchableOpacity>

                <TouchableOpacity
          style={styles.adminRow}
          onPress={() => navigation.navigate('AdminMarketplace')}
        >
          <View style={[styles.adminIcon, { backgroundColor: '#F59E0B' }]}>
            <PackageOpen size={20} color={colors.text} />
          </View>
          <View style={styles.adminTextGroup}>
            <Text style={styles.adminTitle}>Marketplace Dashboard</Text>
            <Text style={styles.adminSub}>Upload & manage marketplace inventory</Text>
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Admin exclusive: Channels & Announcements broadcast */}
        <TouchableOpacity
          style={styles.adminRow}
          onPress={() => navigation.navigate('Announcements')}
        >
          <View style={[styles.adminIcon, { backgroundColor: '#10B981' }]}>
            <Megaphone size={20} color={colors.text} />
          </View>
          <View style={styles.adminTextGroup}>
            <Text style={styles.adminTitle}>Channels & Announcements</Text>
            <Text style={styles.adminSub}>Broadcast announcements to members</Text>
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        
        <TouchableOpacity style={styles.adminRow} onPress={() => navigation.navigate('AdminUserManagement')}>
          <View style={[styles.adminIcon, { backgroundColor: '#2563EB' }]}>
            <Users size={20} color={colors.text} />
          </View>
          <View style={styles.adminTextGroup}>
            <Text style={styles.adminTitle}>User Management</Text>
            <Text style={styles.adminSub}>Monitor members, reset passwords & suspend accounts</Text>
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Member: Society Hub */}
        <TouchableOpacity
          style={styles.adminRow}
          onPress={() => navigation.navigate('SocietyHub')}
        >
          <View style={[styles.adminIcon, { backgroundColor: '#10B981' }]}>
            <Award size={20} color={colors.text} />
          </View>
          <View style={styles.adminTextGroup}>
            <Text style={styles.adminTitle}>Society Hub</Text>
            <Text style={styles.adminSub}>Membership status & community activities</Text>
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Developer: clear all local data */}
        <TouchableOpacity style={styles.adminRow} onPress={confirmClearAllData}>
          <View style={[styles.adminIcon, { backgroundColor: '#C0392B' }]}>
            <Trash2 size={20} color={colors.text} />
          </View>
          <View style={styles.adminTextGroup}>
            <Text style={styles.adminTitle}>Clear All Data (Dev)</Text>
            <Text style={styles.adminSub}>Developer reset — wipes local accounts</Text>
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors, isDark) => StyleSheet.create({
  scrollView: { flex: 1 },
  grow: { flexGrow: 1 },
  container: {
    flex: 1,
    backgroundColor: '#0B2211',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerCard: {
    backgroundColor: '#123B24',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
  },
  subtitle: {
    color: '#9CB8A6',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  adminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F2A19',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1C4A2E',
    padding: 14,
    marginTop: 16,
  },
  adminIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0E2A18',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  adminTextGroup: {
    flex: 1,
  },
  adminTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  adminSub: {
    color: '#9CB8A6',
    fontSize: 11,
    marginTop: 2,
  },
});

const styles = makeStyles(themes.darkEmerald, true);
