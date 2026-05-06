import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { t } from '../../i18n';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [loading, setLoading] = useState(false);
  const { signInWithEmail } = useAuthStore();

  const handleRegister = async () => {
    if (!username || !email || !password) return;
    setLoading(true);
    try {
      await api.post('/auth/register', { username, email, password, role });
      await signInWithEmail(email, password);
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('auth.register')}</Text>

        <TextInput
          style={styles.input}
          placeholder={t('auth.username')}
          placeholderTextColor="#6B7280"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder={t('auth.email')}
          placeholderTextColor="#6B7280"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder={t('auth.password')}
          placeholderTextColor="#6B7280"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <View style={styles.roleRow}>
          {(['student', 'teacher'] as const).map((r) => (
            <Pressable
              key={r}
              style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              onPress={() => setRole(r)}
            >
              <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                {r === 'student' ? 'Aluno' : 'Professor'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.button} onPress={handleRegister} disabled={loading}>
          <Text style={styles.buttonText}>
            {loading ? t('common.loading') : t('auth.register')}
          </Text>
        </Pressable>

        <Link href="/(auth)/login" style={styles.link}>
          <Text style={styles.linkText}>{t('auth.hasAccount')}</Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 26, fontWeight: '700', color: '#F9FAFB', textAlign: 'center', marginBottom: 16 },
  input: {
    backgroundColor: '#1E1E2E',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#2D2D3E',
  },
  roleRow: { flexDirection: 'row', gap: 12 },
  roleBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D2D3E',
    alignItems: 'center',
    backgroundColor: '#1E1E2E',
  },
  roleBtnActive: { borderColor: '#6366F1', backgroundColor: '#6366F120' },
  roleBtnText: { color: '#9CA3AF', fontWeight: '600' },
  roleBtnTextActive: { color: '#818CF8' },
  button: { backgroundColor: '#6366F1', borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: '#F9FAFB', fontSize: 16, fontWeight: '700' },
  link: { alignSelf: 'center', marginTop: 8 },
  linkText: { color: '#818CF8', fontSize: 14 },
});
