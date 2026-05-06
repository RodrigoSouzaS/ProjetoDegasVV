import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import StreakCalendar from '../../components/StreakCalendar';
import XPBar from '../../components/XPBar';

interface HomeData {
  id: string;
  username: string;
  xp: number;
  level: number;
  streakDays: number;
  lastStudyDate: string | null;
  role: string;
  heatmap: { activityDate: string; cardsStudied: number; xpEarned: number }[];
}

interface LeaderboardPos { myPosition: number | null }

export default function HomeScreen() {
  const { user, signOut } = useAuthStore();
  const [data, setData] = useState<HomeData | null>(null);
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<HomeData>('/users/me'),
      api.get<LeaderboardPos>('/leaderboard'),
    ]).then(([me, lb]) => {
      setData(me);
      setRank(lb.myPosition);
    });
  }, []);

  if (!data) return (
    <View style={styles.center}>
      <ActivityIndicator color="#6366F1" size="large" />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Olá, {data.username} 👋</Text>
          <Pressable onPress={signOut}>
            <Ionicons name="log-out-outline" size={22} color="#6B7280" />
          </Pressable>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🔥</Text>
            <Text style={styles.statValue}>{data.streakDays}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⭐</Text>
            <Text style={styles.statValue}>{data.xp.toLocaleString()}</Text>
            <Text style={styles.statLabel}>XP Total</Text>
          </View>
          {rank !== null && (
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>🏆</Text>
              <Text style={styles.statValue}>#{rank}</Text>
              <Text style={styles.statLabel}>Ranking</Text>
            </View>
          )}
        </View>

        {/* XP bar */}
        <View style={styles.card}>
          <XPBar xp={data.xp} level={data.level} />
        </View>

        {/* Activity heatmap */}
        <View style={styles.card}>
          <StreakCalendar data={data.heatmap} />
        </View>

        {/* Quick study button */}
        <Pressable style={styles.studyButton} onPress={() => router.push('/decks')}>
          <Ionicons name="flash" size={20} color="#fff" />
          <Text style={styles.studyButtonText}>Estudar agora</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F1A' },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0F1A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 22, fontWeight: '700', color: '#F9FAFB' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  statIcon: { fontSize: 24 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#F9FAFB' },
  statLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  card: { backgroundColor: '#1E1E2E', borderRadius: 16, padding: 16 },
  studyButton: {
    backgroundColor: '#6366F1',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  studyButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
