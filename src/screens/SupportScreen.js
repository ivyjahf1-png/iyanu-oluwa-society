import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, ScrollView, TextInput, Alert, Linking } from 'react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { MessageCircle, Phone, ChevronDown, ChevronUp, Send } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../theme/ThemeContext';

const FAQS = [
  { q: 'How do I verify my KYC?', a: 'Go to KYC Verification from your profile, upload your ID and photo proof, then submit for review.' },
  { q: 'When are contributions deducted?', a: 'Contributions follow your cooperative schedule (weekly/monthly/yearly) and appear after admin approval.' },
  { q: 'How are loans approved?', a: 'Loan requests are reviewed by your cooperative administrator, then disbursed to your available balance once approved.' },
  { q: 'How do I view my account statement?', a: 'Open Account Statement from the dashboard to view and download your records.' },
];

export default function SupportScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);
  const [openIndex, setOpenIndex] = useState(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const openWhatsApp = () => Linking.openURL('https://wa.me/2348000000000?text=Hello%20Support').catch(() => Alert.alert('Error', 'Could not open WhatsApp.'));
  const callAdmin = () => Linking.openURL('tel:+2348000000000').catch(() => Alert.alert('Error', 'Could not open dialer.'));

  const submitTicket = () => {
    if (!subject.trim() || !message.trim()) { Alert.alert('Missing Info', 'Please provide both a subject and a message.'); return; }
    Alert.alert('Ticket Submitted', 'Our support team will get back to you soon.', [{ text: 'OK', onPress: () => { setSubject(''); setMessage(''); } }]);
  };
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScreenHeader title="Support" subtitle="We are here to help" onBack={() => rawNav?.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Frequently Asked Questions</Text>
        {FAQS.map((f, idx) => {
          const open = openIndex === idx;
          return (
            <TouchableOpacity key={idx} style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setOpenIndex(open ? null : idx)}>
              <View style={styles.faqHeader}>
                <Text style={[styles.faqQ, { color: colors.text }]}>{f.q}</Text>
                {open ? <ChevronUp size={18} color={colors.textSecondary} /> : <ChevronDown size={18} color={colors.textSecondary} />}
              </View>
              {open ? <Text style={[styles.faqA, { color: colors.textSecondary }]}>{f.a}</Text> : null}
            </TouchableOpacity>
          );
        })}

        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 14 }]}>Quick Contact</Text>
        <View style={styles.contactRow}>
          <TouchableOpacity style={[styles.contactBtn, { backgroundColor: colors.success }]} onPress={openWhatsApp}>
            <MessageCircle size={18} color={colors.background} /><Text style={[styles.contactText, { color: colors.background }]}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.contactBtn, { backgroundColor: colors.primary }]} onPress={callAdmin}>
            <Phone size={18} color={colors.background} /><Text style={[styles.contactText, { color: colors.background }]}>Call Admin</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 14 }]}>Submit a Support Ticket</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]} placeholder="Subject" placeholderTextColor={colors.textSecondary} value={subject} onChangeText={setSubject} />
        <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border, height: 110, textAlignVertical: 'top' }]}
          placeholder="Describe your issue..." placeholderTextColor={colors.textSecondary} value={message} onChangeText={setMessage} multiline />
        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={submitTicket}>
          <Send size={18} color={colors.background} /><Text style={[styles.submitText, { color: colors.background }]}>Submit Ticket</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1 }, scrollContent: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  faqCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 }, faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, faqQ: { fontSize: 14, fontWeight: '600', flex: 1 }, faqA: { fontSize: 13, lineHeight: 20, marginTop: 8 },
  contactRow: { flexDirection: 'row', gap: 10 }, contactBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderRadius: 12, paddingVertical: 13 }, contactText: { fontSize: 13, fontWeight: '700' },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 12 }, inputText: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 12 },
  submitBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderRadius: 14, paddingVertical: 15, marginTop: 6 }, submitText: { fontSize: 14, fontWeight: 'bold' },
});
