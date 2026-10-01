import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { RootStackScreenProps } from '../navigation/AppNavigator';
import type { Invoice, PrintStatus } from '../models/Invoice';
import type { Customer } from '../models/Customer';
import type { User } from '../models/User';
import { InvoiceService } from '../services/InvoiceService';
import { CustomerService } from '../services/CustomerService';
import { AuthService } from '../services/AuthService';
import { formatCurrency } from '../utils/currency';

const invoiceService = new InvoiceService();
const customerService = new CustomerService();
const authService = new AuthService();

const PRINT_STATUS_LABEL: Record<PrintStatus, string> = {
  NOT_PRINTED: 'Chưa in',
  PRINTED: 'Đã in',
  PRINT_FAILED: 'In thất bại',
};

type Props = RootStackScreenProps<'InvoiceDetail'>;

function InvoiceDetailScreen({ route, navigation }: Props): React.JSX.Element {
  const { invoiceId } = route.params;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [collector, setCollector] = useState<User | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const found = invoiceService.getById(invoiceId);
    if (!found) {
      setErrorMessage(`Không tìm thấy hóa đơn #${invoiceId}`);
      return;
    }
    setInvoice(found);
    setCustomer(customerService.getById(found.customerId));
    setCollector(
      found.collectedByUserId != null ? authService.getById(found.collectedByUserId) : null,
    );
  }, [invoiceId]);

  const handlePrint = () => {
    navigation.navigate('Printer', { invoiceId });
  };

  if (errorMessage != null) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{errorMessage}</Text>
      </View>
    );
  }

  if (!invoice || !customer) {
    return <View style={styles.container} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.invoiceCode}>{invoice.invoiceCode}</Text>
      <Text style={styles.printStatus}>{PRINT_STATUS_LABEL[invoice.printStatus]}</Text>

      <View style={styles.section}>
        <Row label="Mã KH" value={customer.customerCode} />
        <Row label="Tên KH" value={customer.fullName} />
        <Row label="ĐT" value={customer.phone || '—'} />
        <Row label="Địa chỉ" value={customer.address || '—'} />
      </View>

      <View style={styles.section}>
        <Row label="Kỳ" value={invoice.period} />
        <Row label="Từ ngày" value={invoice.periodFrom ?? '—'} />
        <Row label="Đến ngày" value={invoice.periodTo ?? '—'} />
        <Row
          label="Chỉ số"
          value={`${invoice.oldReading} → ${invoice.newReading} (${invoice.consumption} ${
            customer.serviceType === 'WATER' ? 'm³' : 'kWh'
          })`}
        />
      </View>

      <View style={styles.section}>
        <Row label="Số tiền" value={formatCurrency(invoice.subtotal + invoice.tax)} />
        <Row label="Phí dịch vụ" value={formatCurrency(invoice.serviceFee)} />
        <Row label="Tổng cộng" value={formatCurrency(invoice.total)} emphasis />
      </View>

      {collector ? (
        <View style={styles.section}>
          <Row label="Người thu" value={collector.fullName} />
        </View>
      ) : null}

      <Pressable style={styles.printButton} onPress={handlePrint}>
        <Text style={styles.printButtonText}>In hóa đơn</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, emphasis && styles.rowValueEmphasis]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  invoiceCode: {
    fontSize: 20,
    fontWeight: '700',
  },
  printStatus: {
    marginTop: 4,
    marginBottom: 16,
    color: '#666',
  },
  section: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  rowLabel: {
    color: '#666',
  },
  rowValue: {
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: 12,
  },
  rowValueEmphasis: {
    fontSize: 16,
    color: '#1d4ed8',
  },
  printButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  printButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  errorText: {
    padding: 16,
    color: '#b91c1c',
  },
});

export default InvoiceDetailScreen;
