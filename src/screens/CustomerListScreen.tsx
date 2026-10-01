import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import LoadingDots from '../components/LoadingDots';
import SkeletonList from '../components/SkeletonList';
import type { RootStackScreenProps } from '../navigation/AppNavigator';
import type { Customer } from '../models/Customer';
import { CustomerService } from '../services/CustomerService';

const PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 300;

const customerService = new CustomerService();

type Props = RootStackScreenProps<'CustomerList'>;

function CustomerListScreen({ navigation }: Props): React.JSX.Element {
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const keywordRef = useRef(keyword);
  useEffect(() => {
    keywordRef.current = keyword;
  }, [keyword]);

  const loadPage = useCallback(
    (searchKeyword: string, targetPage: number, append: boolean) => {
      setLoading(true);
      try {
        const result = customerService.list({
          keyword: searchKeyword,
          page: targetPage,
          pageSize: PAGE_SIZE,
        });
        setItems(prev => (append ? [...prev, ...result.items] : result.items));
        setTotal(result.total);
        setPage(targetPage);
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadPage(keywordRef.current, 0, false);
    });
    return unsubscribe;
  }, [navigation, loadPage]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  const handleChangeKeyword = useCallback(
    (value: string) => {
      setKeyword(value);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        loadPage(value, 0, false);
      }, SEARCH_DEBOUNCE_MS);
    },
    [loadPage],
  );

  const handleEndReached = () => {
    if (loading || items.length >= total) {
      return;
    }
    loadPage(keyword, page + 1, true);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Tìm theo mã KH, tên, mã đồng hồ..."
        value={keyword}
        onChangeText={handleChangeKeyword}
        autoCapitalize="none"
      />
      <View style={styles.actionsRow}>
        <Pressable
          style={styles.actionButton}
          onPress={() => navigation.navigate('ImportCustomer')}>
          <Text style={styles.actionButtonText}>Import Excel</Text>
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() => navigation.navigate('CustomerDetail')}>
          <Text style={styles.actionButtonText}>+ Thêm khách hàng</Text>
        </Pressable>
      </View>
      {errorMessage != null ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
      <Text style={styles.total}>{total} khách hàng</Text>
      <FlatList
        data={items}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              navigation.navigate('CustomerDetail', { customerId: item.id })
            }>
            <Text style={styles.rowTitle}>{item.fullName}</Text>
            <Text style={styles.rowSubtitle}>
              {item.customerCode}
              {item.meterCode ? ` · ${item.meterCode}` : ''}
            </Text>
          </Pressable>
        )}
        onEndReachedThreshold={0.4}
        onEndReached={handleEndReached}
        ListEmptyComponent={
          loading ? (
            <SkeletonList />
          ) : (
            <Text style={styles.emptyText}>Không có khách hàng nào</Text>
          )
        }
        ListFooterComponent={
          loading && items.length > 0 ? <LoadingDots label="Đang tải thêm..." /> : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  total: {
    marginTop: 12,
    marginBottom: 4,
    color: '#666',
  },
  errorText: {
    marginTop: 8,
    color: '#b91c1c',
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 32,
  },
  loading: {
    marginVertical: 16,
  },
});

export default CustomerListScreen;
