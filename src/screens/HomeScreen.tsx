import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { RootStackScreenProps } from '../navigation/AppNavigator';
import type { Invoice, PrintStatus } from '../models/Invoice';
import { CustomerService } from '../services/CustomerService';
import { InvoiceService } from '../services/InvoiceService';
import { AuthService } from '../services/AuthService';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/currency';
import { getCurrentPeriod } from '../utils/date';

const customerService = new CustomerService();
const invoiceService = new InvoiceService();
const authService = new AuthService();

const PRINT_STATUS_LABEL: Record<PrintStatus, string> = {
  NOT_PRINTED: 'Chưa in',
  PRINTED: 'Đã in',
  PRINT_FAILED: 'In thất bại',
};

interface RecentInvoiceRow {
  invoice: Invoice;
  customerName: string;
  collectorName: string;
}

type Props = RootStackScreenProps<'Home'>;

function HomeScreen({ navigation }: Props): React.JSX.Element {
  const { currentUser, logout } = useAuth();
  const [customerCount, setCustomerCount] = useState(0);
  const [monthInvoiceCount, setMonthInvoiceCount] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [monthUnprinted, setMonthUnprinted] = useState(0);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoiceRow[]>([]);

  const loadDashboard = useCallback(() => {
    setCustomerCount(customerService.count());

    const monthInvoices = invoiceService.listByPeriod(getCurrentPeriod());
    setMonthInvoiceCount(monthInvoices.length);
    setMonthRevenue(monthInvoices.reduce((sum, invoice) => sum + invoice.total, 0));
    setMonthUnprinted(
      monthInvoices.filter(invoice => invoice.printStatus === 'NOT_PRINTED').length,
    );

    const recent = invoiceService.listRecent(5).map(invoice => ({
      invoice,
      customerName: customerService.getById(invoice.customerId)?.fullName ?? '—',
      collectorName:
        (invoice.collectedByUserId != null
          ? authService.getById(invoice.collectedByUserId)?.fullName
          : null) ?? '—',
    }));
    setRecentInvoices(recent);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadDashboard);
    return unsubscribe;
  }, [navigation, loadDashboard]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>MeterBill</Text>
          <Text style={styles.subtitle}>Xin chào, {currentUser?.fullName}</Text>
        </View>
        <Pressable style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutButtonText}>Đăng xuất</Text>
        </Pressable>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          label="Tổng khách hàng"
          value={String(customerCount)}
          onPress={() => navigation.navigate('CustomerList')}
        />
        <StatCard label="Hóa đơn tháng này" value={String(monthInvoiceCount)} />
        <StatCard label="Doanh thu tháng này" value={formatCurrency(monthRevenue)} />
        <StatCard label="Chưa in" value={String(monthUnprinted)} />
      </View>

      <Text style={styles.sectionTitle}>Truy cập nhanh</Text>
      <View style={styles.actionsRow}>
        <ActionButton
          label="Hóa đơn cần in"
          onPress={() => navigation.navigate('ImportedInvoiceList')}
        />
        <ActionButton
          label="Khách hàng"
          onPress={() => navigation.navigate('CustomerList')}
        />
        <ActionButton
          label="Import Excel"
          onPress={() => navigation.navigate('ImportCustomer')}
        />
        <ActionButton
          label="Máy in / Cấu hình"
          onPress={() => navigation.navigate('Printer')}
        />
        <ActionButton
          label="Quản lý tài khoản"
          onPress={() => navigation.navigate('Accounts')}
        />
      </View>

      <Text style={styles.sectionTitle}>Hóa đơn gần đây</Text>
      {recentInvoices.length === 0 ? (
        <Text style={styles.emptyText}>Chưa có hóa đơn nào</Text>
      ) : (
        recentInvoices.map(row => (
          <Pressable
            key={row.invoice.id}
            style={styles.invoiceRow}
            onPress={() =>
              navigation.navigate('InvoiceDetail', { invoiceId: row.invoice.id })
            }>
            <View style={styles.invoiceRowLeft}>
              <Text style={styles.invoiceCode}>{row.invoice.invoiceCode}</Text>
              <Text style={styles.invoiceCustomer}>{row.customerName}</Text>
              <Text style={styles.invoiceCollector}>Người thu: {row.collectorName}</Text>
            </View>
            <View style={styles.invoiceRowRight}>
              <Text style={styles.invoiceTotal}>{formatCurrency(row.invoice.total)}</Text>
              <Text style={styles.invoiceStatus}>
                {PRINT_STATUS_LABEL[row.invoice.printStatus]}
              </Text>
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

function StatCard({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress?: () => void;
}): React.JSX.Element {
  const content = (
    <>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );
  if (onPress) {
    return (
      <Pressable style={styles.statCard} onPress={onPress}>
        {content}
      </Pressable>
    );
  }
  return <View style={styles.statCard}>{content}</View>;
}

function ActionButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable style={styles.actionButton} onPress={onPress}>
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#666',
    marginTop: 2,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#b91c1c',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  logoutButtonText: {
    color: '#b91c1c',
    fontWeight: '600',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  statLabel: {
    marginTop: 4,
    fontSize: 13,
    color: '#666',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  invoiceRowLeft: {
    flexShrink: 1,
  },
  invoiceRowRight: {
    alignItems: 'flex-end',
  },
  invoiceCode: {
    fontSize: 15,
    fontWeight: '600',
  },
  invoiceCustomer: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  invoiceCollector: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  invoiceTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  invoiceStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  emptyText: {
    color: '#666',
    marginTop: 8,
  },
});

export default HomeScreen;
