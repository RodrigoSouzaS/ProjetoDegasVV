import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  Alert, Share, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { t } from '../../i18n';

interface Student {
  id: string;
  username: string;
  xp: number;
  level: number;
  streakDays: number;
  sessionsCount: number;
  xpLast7d: number;
}

interface InviteResponse { token: string; inviteUrl: string }

export default function TeacherScreen() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  useEffect(() => {
    api.get<Student[]>('/teacher/students')
      .then(setStudents)
      .finally(() => setLoading(false));
  }, []);

  const generateInvite = async () => {
    try {
      const res = await api.post<InviteResponse>('/teacher/invite');
      await Share.share({ message: `Entre na minha turma de flashcards! Código: ${res.token}` });
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  const sendFeedback = async () => {
    if (!selectedStudent || !feedbackMsg.trim()) return;
    try {
      await api.post('/teacher/feedback', { studentId: selectedStudent.id, message: feedbackMsg });
      setFeedbackModal(false);
      setFeedbackMsg('');
      Alert.alert(t('common.success'), 'Feedback enviado!');
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color="#6366F1" size="large" />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('teacher.title')}</Text>
        <Pressable style={styles.inviteBtn} onPress={generateInvite}>
          <Ionicons name="link" size={18} color="#fff" />
          <Text style={styles.inviteBtnText}>Convidar</Text>
        </Pressable>
      </View>

      <FlatList
        data={students}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{t('teacher.noStudents')}</Text>}
        renderItem={({ item }) => (
          <View style={styles.studentCard}>
            <View style={styles.studentInfo}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>{item.username[0].toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.studentName}>{item.username}</Text>
                <Text style={styles.studentMeta}>
                  Nível {item.level} · 🔥 {item.streakDays} dias · +{item.xpLast7d} XP (7d)
                </Text>
              </View>
            </View>
            <Pressable
              style={styles.feedbackBtn}
              onPress={() => { setSelectedStudent(item); setFeedbackModal(true); }}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#6366F1" />
            </Pressable>
          </View>
        )}
      />

      <Modal visible={feedbackModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              Feedback para {selectedStudent?.username}
            </Text>
            <TextInput
              style={styles.feedbackInput}
              placeholder="Escreva um feedback..."
              placeholderTextColor="#6B7280"
              multiline
              value={feedbackMsg}
              onChangeText={setFeedbackMsg}
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelBtn} onPress={() => setFeedbackModal(false)}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable style={styles.sendBtn} onPress={sendFeedback}>
                <Text style={styles.sendText}>Enviar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F1A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0F1A' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#F9FAFB' },
  inviteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#6366F1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  inviteBtnText: { color: '#fff', fontWeight: '700' },
  list: { padding: 20, paddingTop: 0, gap: 12 },
  empty: { color: '#6B7280', textAlign: 'center', marginTop: 60, fontSize: 16 },
  studentCard: {
    backgroundColor: '#1E1E2E', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  studentInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontWeight: '700', fontSize: 18 },
  studentName: { fontSize: 16, fontWeight: '700', color: '#F9FAFB' },
  studentMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  feedbackBtn: {
    backgroundColor: '#6366F120', borderRadius: 10, padding: 10,
  },
  modalOverlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#1E1E2E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#F9FAFB' },
  feedbackInput: {
    backgroundColor: '#0F0F1A', borderRadius: 12, padding: 14, height: 120,
    fontSize: 15, color: '#F9FAFB', textAlignVertical: 'top',
    borderWidth: 1, borderColor: '#2D2D3E',
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#2D2D3E' },
  cancelText: { color: '#9CA3AF', fontWeight: '600' },
  sendBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#6366F1' },
  sendText: { color: '#fff', fontWeight: '700' },
});
