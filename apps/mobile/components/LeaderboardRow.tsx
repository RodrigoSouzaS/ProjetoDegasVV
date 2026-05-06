import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface Props {
  position: number;
  username: string;
  avatarUrl?: string | null;
  xp: number;
  level: number;
  isMe?: boolean;
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function LeaderboardRow({ position, username, avatarUrl, xp, level, isMe }: Props) {
  return (
    <View style={[styles.row, isMe && styles.highlighted]}>
      <Text style={styles.position}>{MEDAL[position] ?? `#${position}`}</Text>

      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarLetter}>{username[0].toUpperCase()}</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.username}>{username}{isMe ? ' (você)' : ''}</Text>
        <Text style={styles.level}>Nível {level}</Text>
      </View>

      <Text style={styles.xp}>{xp.toLocaleString()} XP</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D3E',
    gap: 12,
  },
  highlighted: { backgroundColor: '#6366F115' },
  position: { width: 36, fontSize: 18, textAlign: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#fff', fontWeight: '700', fontSize: 16 },
  info: { flex: 1 },
  username: { fontSize: 15, fontWeight: '600', color: '#F9FAFB' },
  level: { fontSize: 12, color: '#9CA3AF' },
  xp: { fontSize: 14, fontWeight: '700', color: '#6366F1' },
});
