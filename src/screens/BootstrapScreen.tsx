import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import RegisterForm from '../components/RegisterForm';

function BootstrapScreen(): React.JSX.Element {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Chào mừng đến với MeterBill</Text>
      <Text style={styles.hint}>
        Chưa có tài khoản nào — tạo tài khoản đầu tiên để bắt đầu sử dụng.
      </Text>
      <RegisterForm submitLabel="Tạo tài khoản" onSuccess={() => {}} />
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
    fontSize: 22,
    fontWeight: '700',
  },
  hint: {
    marginTop: 8,
    color: '#666',
    fontSize: 13,
  },
});

export default BootstrapScreen;
