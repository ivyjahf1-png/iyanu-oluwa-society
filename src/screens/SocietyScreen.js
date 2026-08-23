import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Users, Shield, Award, ChevronRight } from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS } from '../constants/theme';

export default function SocietyScreen() {
  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.headerTitle}>Society Hub</Text>
        <Text style={styles.headerSub}>Iyanu Oluwa Cooperative Community</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Shield size={22} color={COLORS.emeraldAccent} />
            </View>
            <View style={styles.textGroup}>
              <Text style={styles.title}>Membership Status</Text>
              <Text style={styles.sub}>Verified Member • ID: #IOS-8842</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Community Activities</Text>

        <TouchableOpacity style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Users size={20} color={COLORS.textPrimary} />
            </View>
            <View style={styles.textGroup}>
              <Text style={styles.title}>Monthly General Meeting</Text>
              <Text style={styles.sub}>Scheduled for 1st Sunday of next month</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Award size={20} color={COLORS.textPrimary} />
            </View>
            <View style={styles.textGroup}>
              <Text style={styles.title}>Dividend Distribution</Text>
              <Text style={styles.sub}>Annual financial ledger report</Text>
            </View>
            <ChevronRight size={18} color={COLORS.textSecondary} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 90 },
  headerTitle: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '700' },
  headerSub: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 16 },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: { flex: 1 },
  title: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  sub: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '600', marginVertical: 12 },
});