import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { PASSWORD_POLICY_HINT, validatePassword } from '../utils/passwordPolicy';

interface Props {
  submitLabel: string;
  onSuccess: () => void;
}

const REQUIRED_ERROR = 'Không được để trống';

function RegisterForm({ submitLabel, onSuccess }: Props): React.JSX.Element {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [fullName, setFullName] = useState('');
  const [fullNameTouched, setFullNameTouched] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const usernameError = username.trim().length === 0 ? REQUIRED_ERROR : null;
  const fullNameError = fullName.trim().length === 0 ? REQUIRED_ERROR : null;
  const phoneError = phone.trim().length === 0 ? REQUIRED_ERROR : null;
  const passwordError = password.length > 0 ? validatePassword(password) : REQUIRED_ERROR;

  const showUsernameError = usernameTouched && usernameError != null;
  const showFullNameError = fullNameTouched && fullNameError != null;
  const showPhoneError = phoneTouched && phoneError != null;
  const showPasswordError = passwordTouched && passwordError != null;

  const handleSubmit = () => {
    setUsernameTouched(true);
    setFullNameTouched(true);
    setPhoneTouched(true);
    setPasswordTouched(true);
    if (usernameError || fullNameError || phoneError || passwordError) {
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      register({ username, fullName, phone, password });
      onSuccess();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View>
      {errorMessage != null ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <Text style={styles.label}>Tên đăng nhập</Text>
      <TextInput
        style={[styles.input, showUsernameError && styles.inputError]}
        value={username}
        onChangeText={setUsername}
        onBlur={() => setUsernameTouched(true)}
        autoCapitalize="none"
      />
      {showUsernameError ? <Text style={styles.hintError}>{usernameError}</Text> : null}

      <Text style={styles.label}>Họ tên</Text>
      <TextInput
        style={[styles.input, showFullNameError && styles.inputError]}
        value={fullName}
        onChangeText={setFullName}
        onBlur={() => setFullNameTouched(true)}
      />
      {showFullNameError ? <Text style={styles.hintError}>{fullNameError}</Text> : null}

      <Text style={styles.label}>Số điện thoại</Text>
      <TextInput
        style={[styles.input, showPhoneError && styles.inputError]}
        value={phone}
        onChangeText={setPhone}
        onBlur={() => setPhoneTouched(true)}
        keyboardType="phone-pad"
      />
      {showPhoneError ? <Text style={styles.hintError}>{phoneError}</Text> : null}

      <Text style={styles.label}>Mật khẩu</Text>
      <TextInput
        style={[styles.input, showPasswordError && styles.inputError]}
        value={password}
        onChangeText={setPassword}
        onBlur={() => setPasswordTouched(true)}
        secureTextEntry
        autoCapitalize="none"
      />
      <Text style={showPasswordError ? styles.hintError : styles.hint}>
        {showPasswordError ? passwordError : PASSWORD_POLICY_HINT}
      </Text>

      <Pressable
        style={[styles.submitButton, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}>
        <Text style={styles.submitButtonText}>{submitLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 13,
    color: '#666',
  },
  hint: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
  hintError: {
    marginTop: 4,
    fontSize: 12,
    color: '#b91c1c',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputError: {
    borderColor: '#b91c1c',
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

export default RegisterForm;
