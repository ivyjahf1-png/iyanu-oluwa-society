import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, StatusBar, ScrollView, Alert } from 'react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { Search, Send, UserPlus, Check } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../theme/ThemeContext';

const MOCK_MEMBERS = [
  { id: 'member-001', full_name: 'Alice Johnson', email: 'alice@creditunion.com', balance: 25000 },
  { id: 'member-002', full_name: 'Bob Smith', email: 'bob@creditunion.com', balance: 48000 },
  { id: 'member-003', full_name: 'Carol Davis', email: 'carol@creditunion.com', balance: 12000 },
  { id: 'member-004', full_name: 'David Wilson', email: 'david@creditunion.com', balance: 75000 },
];

export default function GuarantorRequestScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [guaranteeAmount, setGuaranteeAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const searchResults = searchQuery.length > 1
    ? MOCK_MEMBERS.filter((m) => m.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const selectMember = (member) => {
    setSelectedMember(member);
    setSearchQuery('');
  };

  const sendRequest = () => {
    if (!selectedMember) { Alert.alert('Select Member', 'Please select a fellow cooperative member first.'); return; }
    if (!guaranteeAmount || Number(guaranteeAmount) <= 0) { Alert.alert('Valid Amount Required', 'Please enter a valid guarantee amount.'); return; }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      Alert.alert('Request Sent', 'Your guarantee request has been sent to ' + selectedMember.full_name + '.', [{ text: 'OK', onPress: () => rawNav?.goBack() }]);
    }, 1200);
  };
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScreenHeader title="Request Guarantor" subtitle="Find a fellow member to guarantee your loan" onBack={() => rawNav?.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.label, { color: colors.text }]}>Search Member</Text>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Search by name" placeholderTextColor={colors.textSecondary} value={searchQuery} onChangeText={setSearchQuery} />
        </View>

        {selectedMember ? (
          <View style={[styles.memberCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}><UserPlus size={20} color={colors.primary} /></View>
            <View style={styles.memberInfo}>
              <Text style={[styles.memberName, { color: colors.text }]}>{selectedMember.full_name}</Text>
              <Text style={[styles.memberEmail, { color: colors.textSecondary }]}>{selectedMember.email}</Text>
              <Text style={[styles.memberBalance, { color: colors.primary }]}>Balance: ₦{selectedMember.balance.toLocaleString()}</Text>
            </View>
            <Check size={20} color={colors.success} />
          </View>
        ) : null}

        {searchResults.length > 0 ? (
          <View style={styles.resultsList}>
            {searchResults.map((member) => (
              <TouchableOpacity key={member.id} style={[styles.resultItem, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => selectMember(member)}>
                <View style={styles.resultInfo}>
                  <Text style={[styles.resultName, { color: colors.text }]}>{member.full_name}</Text>
                  <Text style={[styles.resultSub, { color: colors.textSecondary }]}>{member.email}</Text>
                </View>
                <Text style={[styles.resultBalance, { color: colors.primary }]}>₦{member.balance.toLocaleString()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <Text style={[styles.label, { color: colors.text }]}>Guarantee Amount</Text>
        <View style={[styles.amountWrap, { borderColor: colors.border }]}>
          <Text style={[styles.nairaPrefix, { color: colors.primary }]}>₦</Text>
          <TextInput style={[styles.amountInput, { color: colors.text }]} placeholder="0.00" placeholderTextColor={colors.textSecondary} value={guaranteeAmount} onChangeText={setGuaranteeAmount} keyboardType="numeric" />
        </View>

        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]} onPress={sendRequest} disabled={submitting}>
          <Send size={18} color={colors.background} />
          <Text style={[styles.submitBtnText, { color: colors.background }]}>{submitting ? 'Sending...' : 'Send Request'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 14 },
  memberCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  memberInfo: { flex: 1 }, memberName: { fontSize: 16, fontWeight: '600' }, memberEmail: { fontSize: 12 }, memberBalance: { fontSize: 12, fontWeight: '700' },
  resultsList: { marginBottom: 16 }, resultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  resultInfo: { flex: 1 }, resultName: { fontSize: 14, fontWeight: '600' }, resultSub: { fontSize: 12 }, resultBalance: { fontSize: 13, fontWeight: '700' },
  amountWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 18 },
  nairaPrefix: { fontSize: 18, fontWeight: 'bold' }, amountInput: { flex: 1, fontSize: 17, fontWeight: '600' },
  submitBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 14, paddingVertical: 15, marginTop: 8 },
  submitBtnText: { fontSize: 14, fontWeight: 'bold' },
});
