import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import type { RootStackScreenProps } from '../navigation/AppNavigator';
import type { User } from '../models/User';
import { AuthService } from '../services/AuthService';
import { useAuth } from '../contexts/AuthContext';

const authService = new AuthService();

type Props = RootStackScreenProps<'Accounts'>;

function AccountsScreen({ navigation }: Props): React.JSX.Element {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);

  const loadUsers = useCallback(() => {
    setUsers(authService.listActiveUsers());
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadUsers);
    return unsubscribe;
  }, [navigation, loadUsers]);

  const handleDeactivate = (user: User) => {
    Alert.alert('Vô hiệu hoá tài khoản', `Vô hiệu hoá tài khoản "${user.fullName}"?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Vô hiệu hoá',
        style: 'destructive',
        onPress: () => {
          authService.deactivate(user.id);
          loadUsers();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.addButton}
        onPress={() => navigation.navigate('AddAccount')}>
        <Text style={styles.addButtonText}>+ Thêm tài khoản</Text>
      </Pressable>

      {users.map(user => (
        <View key={user.id} style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowName}>
              {user.fullName}
              {user.id === currentUser?.id ? ' (bạn)' : ''}
            </Text>
            <Text style={styles.rowDetail}>
              {user.username}
              {user.phone ? ` · ${user.phone}` : ''}
            </Text>
          </View>
          {user.id !== currentUser?.id ? (
            <Pressable style={styles.deactivateButton} onPress={() => handleDeactivate(user)}>
              <Text style={styles.deactivateButtonText}>Vô hiệu hoá</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  addButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  rowInfo: {
    flexShrink: 1,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '600',
  },
  rowDetail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  deactivateButton: {
    borderWidth: 1,
    borderColor: '#b91c1c',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  deactivateButtonText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AccountsScreen;
