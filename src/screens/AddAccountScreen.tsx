import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import type { RootStackScreenProps } from '../navigation/AppNavigator';
import RegisterForm from '../components/RegisterForm';

type Props = RootStackScreenProps<'AddAccount'>;

function AddAccountScreen({ navigation }: Props): React.JSX.Element {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <RegisterForm submitLabel="Thêm tài khoản" onSuccess={() => navigation.goBack()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
});

export default AddAccountScreen;
