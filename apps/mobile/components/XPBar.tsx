import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

interface Props {
  xp: number;
  level: number;
}

function xpForNextLevel(level: number) { return Math.pow(level, 2) * 100; }
function xpForLevel(level: number) { return Math.pow(level - 1, 2) * 100; }

export default function XPBar({ xp, level }: Props) {
  const prevXp = xpForLevel(level);
  const nextXp = xpForNextLevel(level);
  const pct = Math.min(1, (xp - prevXp) / (nextXp - prevXp));
  const width = useSharedValue(0);
  React.useEffect(() => { width.value = withTiming(pct, { duration: 800 }); }, [pct]);
  const barStyle = useAnimatedStyle(() => ({ width: `${width.value * 100}%` as any }));

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.level}>Nível {level}</Text>
        <Text style={styles.xpText}>{xp} / {nextXp} XP</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, barStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  level: { fontSize: 13, fontWeight: '700', color: '#F9FAFB' },
  xpText: { fontSize: 12, color: '#9CA3AF' },
  track: { height: 8, borderRadius: 4, backgroundColor: '#2D2D3E', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: '#6366F1' },
});
