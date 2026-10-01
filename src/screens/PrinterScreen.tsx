import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { BluetoothDevice } from 'react-native-bluetooth-classic';

import LoadingDots from '../components/LoadingDots';
import type { RootStackScreenProps } from '../navigation/AppNavigator';
import type { AppSettings } from '../models/AppSetting';
import type { Invoice } from '../models/Invoice';
import type { Customer } from '../models/Customer';
import type { ImportedInvoiceRecord } from '../models/ImportedInvoiceRecord';
import { SettingsService } from '../services/SettingsService';
import { InvoiceService } from '../services/InvoiceService';
import { CustomerService } from '../services/CustomerService';
import { AuthService } from '../services/AuthService';
import { ImportedInvoiceService } from '../services/ImportedInvoiceService';
import { BluetoothPrinterService, type ConnectionStatus } from '../services/BluetoothPrinterService';
import { buildInvoiceReceipt, buildImportedInvoiceReceipt } from '../services/EscPosService';
import { useAuth } from '../contexts/AuthContext';

const settingsService = new SettingsService();
const invoiceService = new InvoiceService();
const customerService = new CustomerService();
const authService = new AuthService();
const importedInvoiceService = new ImportedInvoiceService();
const bluetoothPrinterService = new BluetoothPrinterService();

// collectorName/collectorPhone không còn ở đây — từ khi có đăng nhập nhiều tài
// khoản, 2 dòng đó lấy trực tiếp từ tài khoản đã tạo hóa đơn (xem
// invoice.collectedByUserId / EscPosService.buildInvoiceReceipt).
const SETTINGS_FIELDS: { key: keyof AppSettings; label: string }[] = [
  { key: 'companyName', label: 'Tên đơn vị điện lực' },
  { key: 'hotline', label: 'Hotline liên hệ' },
  { key: 'bankAccountNumber', label: 'Số tài khoản ngân hàng' },
  { key: 'bankName', label: 'Tên ngân hàng' },
];

type Props = RootStackScreenProps<'Printer'>;

function PrinterScreen({ route }: Props): React.JSX.Element {
  const invoiceId = route.params?.invoiceId;
  const importedInvoiceRecordId = route.params?.importedInvoiceRecordId;
  const { currentUser } = useAuth();

  const [settingsForm, setSettingsForm] = useState<AppSettings>(settingsService.getAll());
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    bluetoothPrinterService.getStatus(),
  );
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(
    bluetoothPrinterService.getConnectedDevice(),
  );
  const [bluetoothError, setBluetoothError] = useState<string | null>(null);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [importedRecord, setImportedRecord] = useState<ImportedInvoiceRecord | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (invoiceId == null) {
      return;
    }
    const found = invoiceService.getById(invoiceId);
    setInvoice(found);
    if (found) {
      setCustomer(customerService.getById(found.customerId));
    }
  }, [invoiceId]);

  useEffect(() => {
    if (importedInvoiceRecordId == null) {
      return;
    }
    const found = importedInvoiceService.getById(importedInvoiceRecordId);
    setImportedRecord(found);
    if (found) {
      setCustomer(customerService.getById(found.customerId));
    }
  }, [importedInvoiceRecordId]);

  const handleSaveSettings = () => {
    settingsService.save(settingsForm);
    setSettingsMessage('Đã lưu cấu hình.');
  };

  const handleLoadDevices = useCallback(async () => {
    setBluetoothError(null);
    setLoadingDevices(true);
    try {
      const granted = await bluetoothPrinterService.requestPermissions();
      if (!granted) {
        setBluetoothError('Cần cấp quyền Bluetooth để tìm máy in.');
        return;
      }
      const enabled = await bluetoothPrinterService.isBluetoothEnabled();
      if (!enabled) {
        setBluetoothError('Bluetooth đang tắt — vui lòng bật Bluetooth.');
        return;
      }
      const bonded = await bluetoothPrinterService.listBondedDevices();
      setDevices(bonded);
    } catch (error) {
      setBluetoothError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    handleLoadDevices();
  }, [handleLoadDevices]);

  const handleConnect = async (device: BluetoothDevice) => {
    setBluetoothError(null);
    setConnectionStatus('CONNECTING');
    try {
      await bluetoothPrinterService.connect(device.address);
      setConnectionStatus(bluetoothPrinterService.getStatus());
      setConnectedDevice(bluetoothPrinterService.getConnectedDevice());
    } catch (error) {
      setConnectionStatus(bluetoothPrinterService.getStatus());
      setBluetoothError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleDisconnect = async () => {
    await bluetoothPrinterService.disconnect();
    setConnectionStatus(bluetoothPrinterService.getStatus());
    setConnectedDevice(bluetoothPrinterService.getConnectedDevice());
  };

  const handlePrintInvoice = async () => {
    if (!invoice || !customer) {
      return;
    }
    setPrinting(true);
    try {
      const printedAt = new Date().toISOString();
      const collector =
        invoice.collectedByUserId != null ? authService.getById(invoice.collectedByUserId) : null;
      const bytes = buildInvoiceReceipt(
        invoice,
        customer,
        settingsService.getAll(),
        collector,
        printedAt,
      );
      await bluetoothPrinterService.printBytes(bytes);
      invoiceService.markPrinted(invoice.id, printedAt);
      setInvoice(invoiceService.getById(invoice.id));
      Alert.alert('Đã in', `Đã gửi hóa đơn ${invoice.invoiceCode} tới máy in.`);
    } catch (error) {
      invoiceService.markPrintFailed(invoice.id);
      setInvoice(invoiceService.getById(invoice.id));
      Alert.alert('In thất bại', error instanceof Error ? error.message : String(error));
    } finally {
      setPrinting(false);
    }
  };

  const handlePrintImportedRecord = async () => {
    if (!importedRecord || !customer) {
      return;
    }
    setPrinting(true);
    try {
      const printedAt = new Date().toISOString();
      const bytes = buildImportedInvoiceReceipt(
        importedRecord,
        customer,
        settingsService.getAll(),
        currentUser,
        printedAt,
      );
      await bluetoothPrinterService.printBytes(bytes);
      Alert.alert('Đã in', `Đã gửi hóa đơn ${importedRecord.externalInvoiceId} tới máy in.`);
    } catch (error) {
      Alert.alert('In thất bại', error instanceof Error ? error.message : String(error));
    } finally {
      setPrinting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Cấu hình in hóa đơn</Text>
      {SETTINGS_FIELDS.map(field => (
        <View key={field.key}>
          <Text style={styles.label}>{field.label}</Text>
          <TextInput
            style={styles.input}
            value={settingsForm[field.key]}
            onChangeText={value =>
              setSettingsForm(prev => ({ ...prev, [field.key]: value }))
            }
          />
        </View>
      ))}
      {settingsMessage != null ? (
        <Text style={styles.successText}>{settingsMessage}</Text>
      ) : null}
      <Pressable style={styles.secondaryButton} onPress={handleSaveSettings}>
        <Text style={styles.secondaryButtonText}>Lưu cấu hình</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Máy in Bluetooth</Text>
      <Text style={styles.statusText}>
        Trạng thái:{' '}
        {connectionStatus === 'CONNECTED'
          ? `Đã kết nối (${connectedDevice?.name ?? connectedDevice?.address})`
          : connectionStatus === 'CONNECTING'
            ? 'Đang kết nối...'
            : 'Chưa kết nối'}
      </Text>

      {bluetoothError != null ? (
        <Text style={styles.errorText}>{bluetoothError}</Text>
      ) : null}

      {loadingDevices ? <LoadingDots label="Đang tìm máy in..." /> : null}

      {devices.map(device => (
        <Pressable
          key={device.address}
          style={styles.deviceRow}
          onPress={() => handleConnect(device)}>
          <Text style={styles.deviceName}>{device.name || '(Không tên)'}</Text>
          <Text style={styles.deviceAddress}>{device.address}</Text>
        </Pressable>
      ))}
      {!loadingDevices && devices.length === 0 && bluetoothError == null ? (
        <Text style={styles.hint}>
          Chưa có máy in nào đã ghép đôi. Ghép đôi qua Cài đặt Bluetooth trước.
        </Text>
      ) : null}

      <View style={styles.buttonRow}>
        <Pressable style={styles.secondaryButton} onPress={handleLoadDevices}>
          <Text style={styles.secondaryButtonText}>Tải lại danh sách</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => bluetoothPrinterService.openSystemBluetoothSettings()}>
          <Text style={styles.secondaryButtonText}>Mở Cài đặt Bluetooth</Text>
        </Pressable>
      </View>

      {connectionStatus === 'CONNECTED' ? (
        <Pressable style={styles.dangerButton} onPress={handleDisconnect}>
          <Text style={styles.dangerButtonText}>Ngắt kết nối</Text>
        </Pressable>
      ) : null}

      {invoiceId != null ? (
        <>
          <Text style={styles.sectionTitle}>In hóa đơn</Text>
          {invoice ? (
            <Pressable
              style={[
                styles.primaryButton,
                (connectionStatus !== 'CONNECTED' || printing) && styles.buttonDisabled,
              ]}
              onPress={handlePrintInvoice}
              disabled={connectionStatus !== 'CONNECTED' || printing}>
              <Text style={styles.primaryButtonText}>
                {printing ? 'Đang in...' : `In hóa đơn ${invoice.invoiceCode}`}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.errorText}>Không tìm thấy hóa đơn #{invoiceId}</Text>
          )}
        </>
      ) : null}

      {importedInvoiceRecordId != null ? (
        <>
          <Text style={styles.sectionTitle}>In hóa đơn</Text>
          {importedRecord ? (
            <Pressable
              style={[
                styles.primaryButton,
                (connectionStatus !== 'CONNECTED' || printing) && styles.buttonDisabled,
              ]}
              onPress={handlePrintImportedRecord}
              disabled={connectionStatus !== 'CONNECTED' || printing}>
              <Text style={styles.primaryButtonText}>
                {printing
                  ? 'Đang in...'
                  : `In hóa đơn ${importedRecord.externalInvoiceId}`}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.errorText}>
              Không tìm thấy hóa đơn nhập #{importedInvoiceRecordId}
            </Text>
          )}
        </>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  label: {
    marginTop: 8,
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
  statusText: {
    marginBottom: 8,
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    flex: 1,
    marginTop: 12,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1d4ed8',
  },
  secondaryButtonText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  dangerButton: {
    marginTop: 12,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#b91c1c',
  },
  dangerButtonText: {
    color: '#b91c1c',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  deviceRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '600',
  },
  deviceAddress: {
    fontSize: 12,
    color: '#666',
  },
  hint: {
    marginTop: 8,
    color: '#666',
    fontSize: 13,
  },
  loading: {
    marginTop: 12,
  },
  errorText: {
    marginTop: 8,
    color: '#b91c1c',
  },
  successText: {
    marginTop: 8,
    color: '#15803d',
  },
});

export default PrinterScreen;
