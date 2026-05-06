import React, { useState } from 'react';
import { StyleSheet, Text, Pressable, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { cardColor, COLOR_MAP } from '../services/srs';

interface Props {
  front: string;
  back: string;
  status?: string | null;
  onFlip?: (isBack: boolean) => void;
}

export default function FlashCard({ front, back, status, onFlip }: Props) {
  const [flipped, setFlipped] = useState(false);
  const rotation = useSharedValue(0);
  const color = COLOR_MAP[cardColor(status)];

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(rotation.value, [0, 1], [0, 180], Extrapolation.CLAMP)}deg` }],
    opacity: interpolate(rotation.value, [0, 0.5, 1], [1, 0, 0], Extrapolation.CLAMP),
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(rotation.value, [0, 1], [180, 360], Extrapolation.CLAMP)}deg` }],
    opacity: interpolate(rotation.value, [0, 0.5, 1], [0, 0, 1], Extrapolation.CLAMP),
  }));

  const handleFlip = () => {
    const next = !flipped;
    rotation.value = withTiming(next ? 1 : 0, { duration: 400 });
    setFlipped(next);
    onFlip?.(next);
  };

  return (
    <Pressable onPress={handleFlip} style={styles.container}>
      <View style={[styles.indicator, { backgroundColor: color }]} />

      <Animated.View style={[styles.face, styles.front, frontStyle]}>
        <Text style={styles.label}>FRENTE</Text>
        <Text style={styles.text}>{front}</Text>
      </Animated.View>

      <Animated.View style={[styles.face, styles.back, backStyle]}>
        <Text style={styles.label}>VERSO</Text>
        <Text style={styles.text}>{back}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 260,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1E1E2E',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  indicator: {
    height: 6,
    width: '100%',
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backfaceVisibility: 'hidden',
  },
  front: {},
  back: {},
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  text: {
    fontSize: 24,
    fontWeight: '600',
    color: '#F9FAFB',
    textAlign: 'center',
    lineHeight: 32,
  },
});
