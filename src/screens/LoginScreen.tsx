import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import RegisterForm from '../components/RegisterForm';

type Mode = 'login' | 'register';

function LoginScreen(): React.JSX.Element {
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      login(username, password);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>MeterBill</Text>
      <Text style={styles.hint}>
        {mode === 'login' ? 'Đăng nhập để tiếp tục' : 'Tạo tài khoản mới để bắt đầu sử dụng'}
      </Text>

      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleButton, mode === 'login' && styles.toggleButtonActive]}
          onPress={() => setMode('login')}>
          <Text
            style={[styles.toggleButtonText, mode === 'login' && styles.toggleButtonTextActive]}>
            Đăng nhập
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleButton, mode === 'register' && styles.toggleButtonActive]}
          onPress={() => setMode('register')}>
          <Text
            style={[
              styles.toggleButtonText,
              mode === 'register' && styles.toggleButtonTextActive,
            ]}>
            Tạo tài khoản
          </Text>
        </Pressable>
      </View>

      {mode === 'login' ? (
        <>
          {errorMessage != null ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <Text style={styles.label}>Tên đăng nhập</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <Pressable
            style={[styles.submitButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}>
            <Text style={styles.submitButtonText}>Đăng nhập</Text>
          </Pressable>
        </>
      ) : (
        <RegisterForm submitLabel="Tạo tài khoản" onSuccess={() => {}} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  hint: {
    marginTop: 4,
    marginBottom: 16,
    color: '#666',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#1d4ed8',
  },
  toggleButtonText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  label: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 13,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  submitButton: {
    marginTop: 24,
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  errorText: {
    marginBottom: 12,
    color: '#b91c1c',
  },
});

export default LoginScreen;
