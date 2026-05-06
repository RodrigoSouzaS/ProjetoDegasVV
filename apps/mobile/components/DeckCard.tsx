import React from 'react';
import { StyleSheet, Text, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Deck } from '../stores/deckStore';

interface Props {
  deck: Deck;
  onPress: () => void;
  onLongPress?: () => void;
}

export default function DeckCard({ deck, onPress, onLongPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={2}>{deck.name}</Text>
        <Ionicons
          name={deck.isPublic ? 'globe-outline' : 'lock-closed-outline'}
          size={16}
          color="#9CA3AF"
        />
      </View>

      {deck.description ? (
        <Text style={styles.description} numberOfLines={2}>{deck.description}</Text>
      ) : null}

      <View style={styles.footer}>
        <View style={styles.stat}>
          <Ionicons name="copy-outline" size={14} color="#6366F1" />
          <Text style={styles.statText}>{deck.cardCount} cartas</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="people-outline" size={14} color="#6366F1" />
          <Text style={styles.statText}>{deck.studentCount}</Text>
        </View>
        <Text style={styles.owner}>por {deck.ownerUsername}</Text>
      </View>

      {deck.tags.length > 0 && (
        <View style={styles.tags}>
          {deck.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2D2D3E',
  },
  pressed: { opacity: 0.8 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F9FAFB',
    flex: 1,
    marginRight: 8,
  },
  description: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  owner: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 'auto',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tag: {
    backgroundColor: '#6366F120',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    color: '#818CF8',
    fontWeight: '600',
  },
});
