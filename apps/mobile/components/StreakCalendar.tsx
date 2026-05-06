import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ActivityDay {
  activityDate: string;
  cardsStudied: number;
  xpEarned: number;
}

interface Props {
  data: ActivityDay[];
  weeks?: number;
}

function intensityColor(xp: number): string {
  if (xp === 0) return '#1E1E2E';
  if (xp < 20) return '#312E81';
  if (xp < 60) return '#4338CA';
  if (xp < 120) return '#6366F1';
  return '#818CF8';
}

export default function StreakCalendar({ data, weeks = 12 }: Props) {
  const grid = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of data) map[d.activityDate] = d.xpEarned;

    const today = new Date();
    const days: { date: string; xp: number }[] = [];

    for (let i = weeks * 7 - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days.push({ date: key, xp: map[key] ?? 0 });
    }

    const cols: { date: string; xp: number }[][] = [];
    for (let i = 0; i < days.length; i += 7) cols.push(days.slice(i, i + 7));
    return cols;
  }, [data, weeks]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Atividade</Text>
      <View style={styles.grid}>
        {grid.map((col, ci) => (
          <View key={ci} style={styles.col}>
            {col.map((cell) => (
              <View
                key={cell.date}
                style={[styles.cell, { backgroundColor: intensityColor(cell.xp) }]}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <Text style={styles.legendLabel}>Menos</Text>
        {[0, 20, 60, 120, 200].map((v) => (
          <View key={v} style={[styles.legendCell, { backgroundColor: intensityColor(v) }]} />
        ))}
        <Text style={styles.legendLabel}>Mais</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 12 },
  title: { fontSize: 14, fontWeight: '600', color: '#9CA3AF', marginBottom: 8 },
  grid: { flexDirection: 'row', gap: 3 },
  col: { gap: 3 },
  cell: { width: 14, height: 14, borderRadius: 3 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  legendLabel: { fontSize: 10, color: '#6B7280' },
  legendCell: { width: 12, height: 12, borderRadius: 2 },
});
