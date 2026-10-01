import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from 'react-native';

import type { RootStackScreenProps } from '../navigation/AppNavigator';
import type { Customer } from '../models/Customer';
import { CustomerService } from '../services/CustomerService';
import { MeterService } from '../services/MeterService';
import { BillingService } from '../services/BillingService';
import { formatCurrency } from '../utils/currency';
import { getCurrentPeriod } from '../utils/date';

const customerService = new CustomerService();
const meterService = new MeterService();
const billingService = new BillingService();

type Props = RootStackScreenProps<'MeterReading'>;

function MeterReadingScreen({ route, navigation }: Props): React.JSX.Element {
  const { customerId } = route.params;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [period, setPeriod] = useState(getCurrentPeriod());
  const [oldReading, setOldReading] = useState('0');
  const [newReading, setNewReading] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const found = customerService.getById(customerId);
    if (!found) {
      setErrorMessage(`Không tìm thấy khách hàng #${customerId}`);
      return;
    }
    setCustomer(found);
    setOldReading(String(meterService.getSuggestedOldReading(customerId)));
  }, [customerId]);

  const oldReadingValue = Number(oldReading);
  const newReadingValue = Number(newReading);
  const hasValidReadings =
    newReading.trim().length > 0 &&
    !Number.isNaN(oldReadingValue) &&
    !Number.isNaN(newReadingValue) &&
    newReadingValue >= oldReadingValue;
  const consumption = hasValidReadings ? newReadingValue - oldReadingValue : 0;

  const billPreview = useMemo(() => {
    if (!customer || !hasValidReadings) {
      return null;
    }
    return billingService.estimate(customer.serviceType, consumption);
  }, [customer, hasValidReadings, consumption]);

  const handleSave = () => {
    if (!customer) {
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      const reading = meterService.create({
        customerId,
        period: period.trim(),
        oldReading: oldReadingValue,
        newReading: newReadingValue,
      });
      navigation.navigate('InvoicePreview', { meterReadingId: reading.id });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {customer ? (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{customer.fullName}</Text>
          <Text style={styles.headerSubtitle}>
            {customer.customerCode} ·{' '}
            {customer.serviceType === 'ELECTRIC' ? 'Điện' : 'Nước'}
          </Text>
        </View>
      ) : null}

      {errorMessage != null ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      <Text style={styles.label}>Kỳ (MM/YYYY)</Text>
      <TextInput style={styles.input} value={period} onChangeText={setPeriod} />

      <Text style={styles.label}>Chỉ số cũ</Text>
      <TextInput
        style={styles.input}
        value={oldReading}
        onChangeText={setOldReading}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Chỉ số mới</Text>
      <TextInput
        style={styles.input}
        value={newReading}
        onChangeText={setNewReading}
        keyboardType="numeric"
        placeholder="Nhập chỉ số mới"
      />

      {newReading.trim().length > 0 && !hasValidReadings ? (
        <Text style={styles.errorText}>
          Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ
        </Text>
      ) : null}

      {hasValidReadings ? (
        <View style={styles.previewBox}>
          <Text style={styles.previewLine}>
            Lượng sử dụng: {consumption} {customer?.serviceType === 'WATER' ? 'm³' : 'kWh'}
          </Text>
          {billPreview ? (
            billPreview.total > 0 || consumption === 0 ? (
              <Text style={styles.previewTotal}>
                Ước tính: {formatCurrency(billPreview.total)}
              </Text>
            ) : (
              <Text style={styles.errorText}>
                Chưa cấu hình bậc giá cho loại dịch vụ này
              </Text>
            )
          ) : null}
        </View>
      ) : null}

      <Pressable
        style={[styles.saveButton, (!customer || saving) && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={!customer || saving}>
        <Text style={styles.saveButtonText}>Lưu chỉ số</Text>
      </Pressable>
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
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: '#666',
    marginTop: 2,
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
  previewBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  previewLine: {
    fontSize: 14,
  },
  previewTotal: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  saveButton: {
    marginTop: 24,
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  errorText: {
    marginTop: 8,
    color: '#b91c1c',
  },
});

export default MeterReadingScreen;
