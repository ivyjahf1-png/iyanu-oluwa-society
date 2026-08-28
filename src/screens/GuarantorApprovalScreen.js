import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, FlatList, Alert, Modal } from 'react-native';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import { XCircle, Clock, UserCheck, CheckCircle, Check, X } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../theme/ThemeContext';

const STATUS_ICONS = { pending: Clock, approved: CheckCircle, rejected: XCircle };

export default function GuarantorApprovalScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);

  const [requests, setRequests] = useState([
    { id: 'req-001', requester: 'Ada Nwosu', amount: 250000, note: 'Guarantor needed for housing loan repayment', time: '2 hours ago', status: 'pending' },
    { id: 'req-002', requester: 'Chris Adeyemi', amount: 180000, note: 'Guarantor for education loan top-up', time: 'Yesterday', status: 'pending' },
  ]);
  const [modal, setModal] = useState(null);

  const confirmAction = (item, action) => {
    setRequests((prev) => prev.map((r) => (r.id === item.id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r)));
    setModal(null);
    Alert.alert('Request ' + (action === 'approve' ? 'Approved' : 'Declined'), 'The guarantee request has been updated.');
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  const renderItem = ({ item }) => {
    return (
      <View style={[styles.reqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}><UserCheck size={20} color={colors.primary} /></View>
        <View style={styles.reqInfo}>
          <Text style={[styles.reqName, { color: colors.text }]}>{item.requester}</Text>
          <Text style={[styles.reqAmount, { color: colors.text }]}>Guarantee: ₦{item.amount.toLocaleString()}</Text>
          <Text style={[styles.reqNote, { color: colors.textSecondary }]}>{item.note}</Text>
          <Text style={[styles.reqTime, { color: colors.textSecondary }]}>{item.time}</Text>
        </View>
        <View style={styles.reqActions}>
          <TouchableOpacity style={[styles.approveBtn, { backgroundColor: colors.success }]} onPress={() => setModal({ item, action: 'approve' })}>
            <Check size={16} color={colors.background} />
            <Text style={[styles.approveText, { color: colors.background }]}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.declineBtn, { borderColor: colors.danger }]} onPress={() => setModal({ item, action: 'decline' })}>
            <X size={16} color={colors.danger} />
            <Text style={[styles.declineText, { color: colors.danger }]}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScreenHeader title="Guarantor Requests" subtitle={pendingRequests.length + ' pending requests'} onBack={() => rawNav?.goBack()} />
      {pendingRequests.length === 0 ? (
        <View style={styles.empty}><UserCheck size={40} color={colors.textSecondary} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>No pending guarantor requests</Text></View>
      ) : (
        <FlatList data={pendingRequests} keyExtractor={(item) => item.id} renderItem={renderItem} contentContainerStyle={styles.list} />
      )}

      <Modal visible={!!modal} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Confirm {(modal?.action || '').toUpperCase()}</Text>
            <Text style={[styles.modalBody, { color: colors.textSecondary }]}>Are you sure you want to {(modal?.action || '')} the guarantee request from {modal?.item?.requester}?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalCancel, { borderColor: colors.border }]} onPress={() => setModal(null)}><Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirm, { backgroundColor: modal?.action === 'approve' ? colors.success : colors.danger }]} onPress={() => confirmAction(modal.item, modal.action)}><Text style={[styles.modalConfirmText, { color: colors.background }]}>Confirm</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1 }, list: { padding: 16, paddingBottom: 32 },
  reqCard: { flexDirection: 'row', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  reqInfo: { flex: 1 }, reqName: { fontSize: 15, fontWeight: '600' }, reqAmount: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  reqNote: { fontSize: 12, marginTop: 4 }, reqTime: { fontSize: 11, marginTop: 4 },
  reqActions: { justifyContent: 'center', gap: 8 },
  approveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  approveText: { fontSize: 11, fontWeight: '700' },
  declineBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  declineText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80 }, emptyText: { fontSize: 14, marginTop: 16 },
  modalWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.overlay, padding: 24 },
  modalCard: { width: '100%', borderRadius: 16, borderWidth: 1, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 }, modalBody: { fontSize: 13, lineHeight: 20, marginBottom: 18 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 12, alignItems: 'center' }, modalCancelText: { fontSize: 14, fontWeight: '600' },
  modalConfirm: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }, modalConfirmText: { fontSize: 14, fontWeight: '700' },
});
