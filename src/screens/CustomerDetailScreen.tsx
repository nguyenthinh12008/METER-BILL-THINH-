import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { RootStackScreenProps } from '../navigation/AppNavigator';
import type { NewCustomer, ServiceType } from '../models/Customer';
import type { ImportedInvoiceRecord } from '../models/ImportedInvoiceRecord';
import { CustomerService } from '../services/CustomerService';
import { ImportedInvoiceService } from '../services/ImportedInvoiceService';
import { formatCurrency } from '../utils/currency';

const customerService = new CustomerService();
const importedInvoiceService = new ImportedInvoiceService();

const EMPTY_FORM: NewCustomer = {
  customerCode: '',
  fullName: '',
  address: '',
  phone: '',
  meterCode: '',
  serviceType: 'ELECTRIC',
  readingBookCode: null,
};

type Props = RootStackScreenProps<'CustomerDetail'>;

function CustomerDetailScreen({ route, navigation }: Props): React.JSX.Element {
  const customerId = route.params?.customerId;
  const isEditing = customerId != null;

  const [form, setForm] = useState<NewCustomer>(EMPTY_FORM);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importedInvoices, setImportedInvoices] = useState<
    ImportedInvoiceRecord[]
  >([]);

  useEffect(() => {
    if (customerId == null) {
      return;
    }
    const customer = customerService.getById(customerId);
    if (!customer) {
      setErrorMessage(`Không tìm thấy khách hàng #${customerId}`);
      return;
    }
    setForm({
      customerCode: customer.customerCode,
      fullName: customer.fullName,
      address: customer.address,
      phone: customer.phone,
      meterCode: customer.meterCode,
      serviceType: customer.serviceType,
      readingBookCode: customer.readingBookCode,
    });
    setImportedInvoices(importedInvoiceService.listByCustomerId(customerId));
  }, [customerId]);

  const setField = (field: keyof NewCustomer) => (value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const setServiceType = (serviceType: ServiceType) => {
    setForm(prev => ({ ...prev, serviceType }));
  };

  const handleSave = () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      if (isEditing) {
        customerService.update(customerId, form);
      } else {
        customerService.create(form);
      }
      navigation.goBack();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (customerId == null) {
      return;
    }
    Alert.alert(
      'Xoá khách hàng',
      `Xoá khách hàng "${form.fullName}"? Hành động này không thể hoàn tác.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá',
          style: 'destructive',
          onPress: () => {
            customerService.remove(customerId);
            navigation.goBack();
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {errorMessage != null ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      <Text style={styles.label}>Mã khách hàng</Text>
      <TextInput
        style={styles.input}
        value={form.customerCode}
        onChangeText={setField('customerCode')}
        autoCapitalize="none"
      />

      <Text style={styles.label}>Họ tên</Text>
      <TextInput
        style={styles.input}
        value={form.fullName}
        onChangeText={setField('fullName')}
      />

      <Text style={styles.label}>Địa chỉ</Text>
      <TextInput
        style={styles.input}
        value={form.address}
        onChangeText={setField('address')}
      />

      <Text style={styles.label}>Số điện thoại</Text>
      <TextInput
        style={styles.input}
        value={form.phone}
        onChangeText={setField('phone')}
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Mã đồng hồ</Text>
      <TextInput
        style={styles.input}
        value={form.meterCode}
        onChangeText={setField('meterCode')}
        autoCapitalize="none"
      />

      <Text style={styles.label}>Mã sổ/tuyến (GCS)</Text>
      <TextInput
        style={styles.input}
        value={form.readingBookCode ?? ''}
        onChangeText={setField('readingBookCode')}
        autoCapitalize="none"
      />

      <Text style={styles.label}>Loại dịch vụ</Text>
      <View style={styles.serviceTypeRow}>
        <Pressable
          style={[
            styles.serviceTypeButton,
            form.serviceType === 'ELECTRIC' && styles.serviceTypeButtonActive,
          ]}
          onPress={() => setServiceType('ELECTRIC')}>
          <Text
            style={[
              styles.serviceTypeText,
              form.serviceType === 'ELECTRIC' && styles.serviceTypeTextActive,
            ]}>
            Điện
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.serviceTypeButton,
            form.serviceType === 'WATER' && styles.serviceTypeButtonActive,
          ]}
          onPress={() => setServiceType('WATER')}>
          <Text
            style={[
              styles.serviceTypeText,
              form.serviceType === 'WATER' && styles.serviceTypeTextActive,
            ]}>
            Nước
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.saveButton}
        onPress={handleSave}
        disabled={saving}>
        <Text style={styles.saveButtonText}>
          {isEditing ? 'Lưu thay đổi' : 'Thêm khách hàng'}
        </Text>
      </Pressable>

      {isEditing ? (
        <Pressable
          style={styles.meterReadingButton}
          onPress={() => navigation.navigate('MeterReading', { customerId })}>
          <Text style={styles.meterReadingButtonText}>Nhập chỉ số</Text>
        </Pressable>
      ) : null}

      {isEditing ? (
        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Xoá khách hàng</Text>
        </Pressable>
      ) : null}

      {importedInvoices.length > 0 ? (
        <View style={styles.importedSection}>
          <Text style={styles.importedTitle}>Lịch sử hóa đơn nhập</Text>
          {importedInvoices.map(record => (
            <View key={record.id} style={styles.importedRow}>
              <View style={styles.importedRowLeftGroup}>
                <Text style={styles.importedRowLeft}>
                  {record.externalInvoiceId}
                  {record.invoiceType ? ` · ${record.invoiceType}` : ''}
                </Text>
                <Text style={styles.importedRowRight}>
                  {formatCurrency(record.amount)}
                </Text>
              </View>
              <Pressable
                style={styles.importedPrintButton}
                onPress={() =>
                  navigation.navigate('Printer', {
                    importedInvoiceRecordId: record.id,
                  })
                }>
                <Text style={styles.importedPrintButtonText}>In</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
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
  serviceTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  serviceTypeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  serviceTypeButtonActive: {
    backgroundColor: '#1d4ed8',
  },
  serviceTypeText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  serviceTypeTextActive: {
    color: '#fff',
  },
  saveButton: {
    marginTop: 24,
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  meterReadingButton: {
    marginTop: 12,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1d4ed8',
  },
  meterReadingButtonText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  deleteButton: {
    marginTop: 12,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#b91c1c',
  },
  deleteButtonText: {
    color: '#b91c1c',
    fontWeight: '600',
  },
  errorText: {
    marginBottom: 12,
    color: '#b91c1c',
  },
  importedSection: {
    marginTop: 24,
  },
  importedTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  importedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  importedRowLeftGroup: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginRight: 12,
  },
  importedPrintButton: {
    borderWidth: 1,
    borderColor: '#1d4ed8',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  importedPrintButtonText: {
    color: '#1d4ed8',
    fontWeight: '600',
    fontSize: 13,
  },
  importedRowLeft: {
    color: '#333',
  },
  importedRowRight: {
    fontWeight: '600',
  },
});

export default CustomerDetailScreen;
