import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, Modal,
  TextInput, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDeckStore } from '../../stores/deckStore';
import DeckCard from '../../components/DeckCard';
import { t } from '../../i18n';

export default function DecksScreen() {
  const { decks, loading, fetchDecks, createDeck, deleteDeck } = useDeckStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchDecks(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createDeck({ name: name.trim(), description: description.trim() || undefined, isPublic });
      setModalVisible(false);
      setName('');
      setDescription('');
      setIsPublic(false);
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (id: string, deckName: string) => {
    Alert.alert('Excluir deck', `Excluir "${deckName}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteDeck(id) },
    ]);
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color="#6366F1" size="large" />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('decks.title')}</Text>
        <Pressable style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      <FlatList
        data={decks}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <DeckCard
            deck={item}
            onPress={() => router.push(`/deck/${item.id}`)}
            onLongPress={item.isOwner ? () => handleDelete(item.id, item.name) : undefined}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>{t('decks.empty')}</Text>
        }
      />

      {/* Create deck modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('decks.create')}</Text>

            <TextInput
              style={styles.input}
              placeholder={t('decks.deckName')}
              placeholderTextColor="#6B7280"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder={t('decks.description')}
              placeholderTextColor="#6B7280"
              multiline
              value={description}
              onChangeText={setDescription}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t('decks.public')}</Text>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ true: '#6366F1', false: '#2D2D3E' }}
              />
            </View>

            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleCreate} disabled={creating}>
                <Text style={styles.saveBtnText}>
                  {creating ? t('common.loading') : t('common.save')}
                </Text>
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
  addBtn: { backgroundColor: '#6366F1', borderRadius: 12, padding: 8 },
  list: { padding: 20, paddingTop: 0 },
  empty: { color: '#6B7280', textAlign: 'center', marginTop: 60, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#1E1E2E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#F9FAFB', marginBottom: 4 },
  input: {
    backgroundColor: '#0F0F1A', borderRadius: 12, padding: 14,
    fontSize: 15, color: '#F9FAFB', borderWidth: 1, borderColor: '#2D2D3E',
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { fontSize: 15, color: '#F9FAFB' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 12, alignItems: 'center',
    backgroundColor: '#2D2D3E',
  },
  cancelBtnText: { color: '#9CA3AF', fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#6366F1' },
  saveBtnText: { color: '#fff', fontWeight: '700' },
});
