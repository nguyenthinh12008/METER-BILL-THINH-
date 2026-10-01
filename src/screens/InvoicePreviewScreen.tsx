import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { RootStackScreenProps } from '../navigation/AppNavigator';
import { InvoiceService, type InvoicePreviewData } from '../services/InvoiceService';
import { formatCurrency } from '../utils/currency';
import { useAuth } from '../contexts/AuthContext';

const invoiceService = new InvoiceService();

type Props = RootStackScreenProps<'InvoicePreview'>;

function InvoicePreviewScreen({ route, navigation }: Props): React.JSX.Element {
  const { meterReadingId } = route.params;
  const { currentUser } = useAuth();

  const [preview, setPreview] = useState<InvoicePreviewData | null>(null);
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [serviceFee, setServiceFee] = useState('0');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const data = invoiceService.buildPreview(meterReadingId);
      setPreview(data);
      setPeriodFrom(data.periodFrom);
      setPeriodTo(data.periodTo);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }, [meterReadingId]);

  const serviceFeeValue = Number(serviceFee) || 0;
  const total = preview ? preview.bill.subtotal + preview.bill.tax + serviceFeeValue : 0;

  const handleCreate = () => {
    if (!currentUser) {
      setErrorMessage('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      const invoice = invoiceService.create({
        meterReadingId,
        periodFrom: periodFrom.trim(),
        periodTo: periodTo.trim(),
        serviceFee: serviceFeeValue,
        collectedByUserId: currentUser.id,
      });
      navigation.navigate('InvoiceDetail', { invoiceId: invoice.id });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  if (!preview) {
    return (
      <View style={styles.container}>
        {errorMessage != null ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
      </View>
    );
  }

  const { customer, reading, bill } = preview;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>{customer.fullName}</Text>
      <Text style={styles.headerSubtitle}>
        {customer.customerCode} · Kỳ {reading.period}
      </Text>

      {errorMessage != null ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      <View style={styles.infoBox}>
        <Text style={styles.infoLine}>
          Chỉ số: {reading.oldReading} → {reading.newReading} ({reading.consumption}{' '}
          {customer.serviceType === 'WATER' ? 'm³' : 'kWh'})
        </Text>
        <Text style={styles.infoLine}>Số tiền: {formatCurrency(bill.subtotal + bill.tax)}</Text>
      </View>

      <Text style={styles.label}>Từ ngày</Text>
      <TextInput style={styles.input} value={periodFrom} onChangeText={setPeriodFrom} />

      <Text style={styles.label}>Đến ngày</Text>
      <TextInput style={styles.input} value={periodTo} onChangeText={setPeriodTo} />

      <Text style={styles.label}>Phí dịch vụ</Text>
      <TextInput
        style={styles.input}
        value={serviceFee}
        onChangeText={setServiceFee}
        keyboardType="numeric"
      />

      <View style={styles.totalBox}>
        <Text style={styles.totalLabel}>Tổng cộng</Text>
        <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
      </View>

      <Pressable
        style={[styles.saveButton, saving && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={saving}>
        <Text style={styles.saveButtonText}>Tạo hóa đơn</Text>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: '#666',
    marginTop: 2,
    marginBottom: 16,
  },
  infoBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    marginBottom: 8,
  },
  infoLine: {
    fontSize: 14,
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
  totalBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
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
    marginBottom: 8,
    color: '#b91c1c',
  },
});

export default InvoicePreviewScreen;
