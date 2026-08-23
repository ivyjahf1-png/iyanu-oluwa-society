import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PiggyBank, Plus, ArrowUpRight, ShieldCheck, Lock } from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, GRADIENTS } from '../constants/theme';
import { useTransactions } from '../context/TransactionsContext';

const fmt = n =>
  Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SavingsHubScreen() {
  // Total Accumulated Savings derives from the real transaction ledger
  // (contributions + deposits - withdrawals). Starts at ₦0.00.
  const { totalSavings } = useTransactions();

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.headerTitle}>Savings Hub</Text>
        <Text style={styles.headerSub}>Manage your target and cooperative plans</Text>

        <LinearGradient
          colors={GRADIENTS.metallicCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View>
            <Text style={styles.heroLabel}>Total Accumulated Savings</Text>
            <Text style={styles.heroAmount}>₦ {fmt(totalSavings)}</Text>
          </View>
          <TouchableOpacity style={styles.heroBtn}>
            <Plus size={16} color="#FFF" />
            <Text style={styles.heroBtnText}>New Goal</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Savings Plans</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.iconBox}>
              <PiggyBank size={20} color={COLORS.emeraldAccent} />
            </View>
            <View style={styles.cardTextGroup}>
              <Text style={styles.planTitle}>Weekly Cooperative Target</Text>
              <Text style={styles.planSub}>Cycle 4 of 12 • ₦10,000 / week</Text>
            </View>
            <ArrowUpRight size={20} color={COLORS.textSecondary} />
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: '33%' }]} />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.iconBox}>
              <Lock size={20} color={COLORS.emeraldAccent} />
            </View>
            <View style={styles.cardTextGroup}>
              <Text style={styles.planTitle}>Fixed Emergency Reserve</Text>
              <Text style={styles.planSub}>Locked until Dec 2026</Text>
            </View>
            <ShieldCheck size={20} color={COLORS.emeraldAccent} />
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 90 },
  headerTitle: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '700' },
  headerSub: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 16 },
  heroCard: {
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: 20,
  },
  heroLabel: { color: COLORS.textSecondary, fontSize: 12 },
  heroAmount: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '700', marginTop: 4 },
  heroBtn: {
    backgroundColor: COLORS.emeraldDark,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  heroBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '600' },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 12,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextGroup: { flex: 1 },
  planTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  planSub: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.iconBg,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: { height: '100%', backgroundColor: COLORS.emeraldAccent },
});