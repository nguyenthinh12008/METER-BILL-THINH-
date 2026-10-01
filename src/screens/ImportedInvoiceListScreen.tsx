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
import type { ImportedInvoiceRecordWithCustomer } from '../models/ImportedInvoiceRecord';
import { ImportedInvoiceService } from '../services/ImportedInvoiceService';
import { formatCurrency } from '../utils/currency';

const PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 300;

const importedInvoiceService = new ImportedInvoiceService();

type Props = RootStackScreenProps<'ImportedInvoiceList'>;

function ImportedInvoiceListScreen({ navigation }: Props): React.JSX.Element {
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<ImportedInvoiceRecordWithCustomer[]>([]);
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
        const result = importedInvoiceService.list({
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
      {errorMessage != null ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
      <Text style={styles.total}>{total} hóa đơn cần in</Text>
      <FlatList
        data={items}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              navigation.navigate('Printer', { importedInvoiceRecordId: item.id })
            }>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>{item.customerFullName}</Text>
              <Text style={styles.rowSubtitle}>
                {item.customerCode} · {item.externalInvoiceId}
                {item.invoiceType ? ` · ${item.invoiceType}` : ''}
              </Text>
            </View>
            <Text style={styles.rowAmount}>{formatCurrency(item.amount)}</Text>
          </Pressable>
        )}
        onEndReachedThreshold={0.4}
        onEndReached={handleEndReached}
        ListEmptyComponent={
          loading ? (
            <SkeletonList />
          ) : (
            <Text style={styles.emptyText}>Không có hóa đơn cần in</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  rowLeft: {
    flexShrink: 1,
    marginRight: 12,
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
  rowAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1d4ed8',
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

export default ImportedInvoiceListScreen;
