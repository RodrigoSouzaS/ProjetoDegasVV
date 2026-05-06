import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useStudyStore, type StudyMode } from '../../stores/studyStore';
import FlashCard from '../../components/FlashCard';
import type { Card } from '../../stores/deckStore';

const QUALITY_LABELS: Record<number, string> = {
  1: 'Difícil',
  3: 'Bom',
  5: 'Fácil',
};

export default function StudyScreen() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode: StudyMode }>();
  const { queue, currentIndex, loadQueue, startSession, answerCard, endSession, nextCard } =
    useStudyStore();

  const [loading, setLoading] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [typeAnswer, setTypeAnswer] = useState('');
  const [feedback, setFeedback] = useState<null | 'correct' | 'wrong'>(null);
  const [mcOptions, setMcOptions] = useState<string[]>([]);
  const [sessionXP, setSessionXP] = useState(0);

  const card: Card | undefined = queue[currentIndex];
  const isFinished = currentIndex >= queue.length && queue.length > 0;

  useEffect(() => {
    const init = async () => {
      await loadQueue(id);
      await startSession(id, mode ?? 'flip');
      setLoading(false);
    };
    init();
    return () => { endSession(); };
  }, [id]);

  useEffect(() => {
    if (card && mode === 'multiple_choice') buildMCOptions();
    setFlipped(false);
    setTypeAnswer('');
    setFeedback(null);
  }, [currentIndex, card]);

  const buildMCOptions = () => {
    if (!card) return;
    const others = queue
      .filter((_, i) => i !== currentIndex)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((c) => c.back);
    setMcOptions([card.back, ...others].sort(() => Math.random() - 0.5));
  };

  const handleFlipAnswer = async (quality: number) => {
    if (!card) return;
    const result = await answerCard(card.id, quality);
    setSessionXP((x) => x + result.xpEarned);
    nextCard();
  };

  const handleMC = async (answer: string) => {
    if (!card || feedback) return;
    const correct = answer === card.back;
    setFeedback(correct ? 'correct' : 'wrong');
    Haptics.impactAsync(correct ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Heavy);
    const result = await answerCard(card.id, correct ? 4 : 1);
    setSessionXP((x) => x + result.xpEarned);
    setTimeout(() => nextCard(), 900);
  };

  const handleType = async () => {
    if (!card) return;
    const exact = typeAnswer.trim().toLowerCase() === card.back.trim().toLowerCase();
    const correct = typeAnswer.trim().length > 0 && exact;
    setFeedback(correct ? 'correct' : 'wrong');
    Haptics.impactAsync(correct ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Heavy);
    const result = await answerCard(card.id, correct ? 5 : 1, exact);
    setSessionXP((x) => x + result.xpEarned);
    setTimeout(() => nextCard(), 1200);
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color="#6366F1" size="large" />
    </View>
  );

  if (isFinished) return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.finishScreen}>
        <Text style={styles.finishEmoji}>🎉</Text>
        <Text style={styles.finishTitle}>Sessão concluída!</Text>
        <Text style={styles.finishStat}>+{sessionXP} XP ganhos</Text>
        <Text style={styles.finishStat}>{queue.length} cartas estudadas</Text>
        <Pressable style={styles.doneBtn} onPress={() => router.back()}>
          <Text style={styles.doneBtnText}>Concluir</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );

  if (!card) return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.emptyText}>Nenhuma carta para revisar hoje! 🎉</Text>
        <Pressable style={styles.doneBtn} onPress={() => router.back()}>
          <Text style={styles.doneBtnText}>Voltar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={26} color="#F9FAFB" />
          </Pressable>
          <Text style={styles.progress}>
            {currentIndex + 1} / {queue.length}
          </Text>
          <Text style={styles.xpBadge}>+{sessionXP} XP</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentIndex) / queue.length) * 100}%` },
            ]}
          />
        </View>

        <View style={styles.body}>
          {/* Card */}
          {mode === 'flip' ? (
            <>
              <FlashCard
                front={card.front}
                back={card.back}
                status={card.status}
                onFlip={setFlipped}
              />
              {flipped && (
                <View style={styles.flipActions}>
                  {([1, 3, 5] as const).map((q) => (
                    <Pressable
                      key={q}
                      style={[styles.flipBtn, { borderColor: q === 1 ? '#EF4444' : q === 3 ? '#F59E0B' : '#22C55E' }]}
                      onPress={() => handleFlipAnswer(q)}
                    >
                      <Text style={[styles.flipBtnText, { color: q === 1 ? '#EF4444' : q === 3 ? '#F59E0B' : '#22C55E' }]}>
                        {QUALITY_LABELS[q]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          ) : mode === 'multiple_choice' ? (
            <>
              <View style={styles.questionCard}>
                <Text style={styles.questionLabel}>FRENTE</Text>
                <Text style={styles.questionText}>{card.front}</Text>
              </View>
              <View style={styles.options}>
                {mcOptions.map((opt) => {
                  let bg = '#1E1E2E';
                  if (feedback && opt === card.back) bg = '#22C55E30';
                  else if (feedback === 'wrong') bg = '#EF444430';

                  return (
                    <Pressable
                      key={opt}
                      style={[styles.optionBtn, { backgroundColor: bg }]}
                      onPress={() => handleMC(opt)}
                    >
                      <Text style={styles.optionText}>{opt}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <>
              <View style={styles.questionCard}>
                <Text style={styles.questionLabel}>FRENTE</Text>
                <Text style={styles.questionText}>{card.front}</Text>
              </View>
              {feedback && (
                <View style={styles.answerReveal}>
                  <Text style={styles.correctAnswer}>✓ {card.back}</Text>
                </View>
              )}
              <TextInput
                style={[
                  styles.typeInput,
                  feedback === 'correct' && styles.inputCorrect,
                  feedback === 'wrong' && styles.inputWrong,
                ]}
                placeholder="Digite a resposta..."
                placeholderTextColor="#6B7280"
                value={typeAnswer}
                onChangeText={setTypeAnswer}
                onSubmitEditing={handleType}
                editable={!feedback}
                returnKeyType="done"
              />
              {!feedback && (
                <Pressable style={styles.submitBtn} onPress={handleType}>
                  <Text style={styles.submitBtnText}>Confirmar</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F1A' },
  kav: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 20 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  progress: { fontSize: 15, fontWeight: '600', color: '#9CA3AF' },
  xpBadge: { fontSize: 14, fontWeight: '700', color: '#6366F1' },
  progressTrack: { height: 4, backgroundColor: '#1E1E2E', marginHorizontal: 20, borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 2 },
  body: { flex: 1, padding: 20, gap: 16 },
  questionCard: {
    backgroundColor: '#1E1E2E', borderRadius: 20, padding: 28,
    alignItems: 'center', minHeight: 160, justifyContent: 'center',
  },
  questionLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280', letterSpacing: 1.5, marginBottom: 12 },
  questionText: { fontSize: 24, fontWeight: '600', color: '#F9FAFB', textAlign: 'center', lineHeight: 32 },
  flipActions: { flexDirection: 'row', gap: 12 },
  flipBtn: {
    flex: 1, padding: 16, borderRadius: 16, alignItems: 'center',
    borderWidth: 1.5, backgroundColor: '#1E1E2E',
  },
  flipBtnText: { fontSize: 15, fontWeight: '700' },
  options: { gap: 10 },
  optionBtn: { padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#2D2D3E' },
  optionText: { fontSize: 16, color: '#F9FAFB', textAlign: 'center', fontWeight: '500' },
  typeInput: {
    backgroundColor: '#1E1E2E', borderRadius: 14, padding: 16, fontSize: 16,
    color: '#F9FAFB', borderWidth: 1, borderColor: '#2D2D3E',
  },
  inputCorrect: { borderColor: '#22C55E', backgroundColor: '#22C55E10' },
  inputWrong: { borderColor: '#EF4444', backgroundColor: '#EF444410' },
  answerReveal: { backgroundColor: '#22C55E20', borderRadius: 12, padding: 12 },
  correctAnswer: { color: '#22C55E', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  submitBtn: { backgroundColor: '#6366F1', borderRadius: 14, padding: 16, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  finishScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32 },
  finishEmoji: { fontSize: 64 },
  finishTitle: { fontSize: 28, fontWeight: '800', color: '#F9FAFB' },
  finishStat: { fontSize: 18, color: '#9CA3AF' },
  doneBtn: { marginTop: 16, backgroundColor: '#6366F1', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40 },
  doneBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  emptyText: { fontSize: 18, color: '#9CA3AF', textAlign: 'center' },
});
