import { Linking, PermissionsAndroid, Platform } from 'react-native';
import RNBluetoothClassic, { type BluetoothDevice } from 'react-native-bluetooth-classic';
import { Buffer } from 'buffer';

export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';

/**
 * Thiết bị giả lập dùng khi chạy trên emulator. Lưu ý: emulator Android đời
 * mới (API 33+) có Bluetooth ảo qua netsim nên isBluetoothEnabled() vẫn trả
 * về true bình thường — chỉ là danh sách thiết bị đã ghép đôi luôn rỗng (chưa
 * ghép đôi gì trong Bluetooth ảo đó). Vì vậy điểm kích hoạt mock là ở
 * listBondedDevices() khi danh sách thật rỗng, không phải ở isBluetoothEnabled().
 * Chỉ kích hoạt ở __DEV__.
 */
const MOCK_DEVICES: BluetoothDevice[] = [
  { address: '00:11:22:33:AA:01', name: 'May in nhiet (gia lap)' } as BluetoothDevice,
  { address: '00:11:22:33:AA:02', name: 'POS-58 (gia lap)' } as BluetoothDevice,
];

/**
 * Wrapper RN-only quanh react-native-bluetooth-classic (module cầu nối kiểu cũ,
 * chạy qua lớp tương thích New Architecture — không phải TurboModule thật, xem
 * lý do chọn trong PROGRESS.md Phase 7/8). Không unit test — không có máy in/
 * thiết bị Android thật trong môi trường build.
 */
export class BluetoothPrinterService {
  private connectedDevice: BluetoothDevice | null = null;
  private status: ConnectionStatus = 'DISCONNECTED';
  private mockMode = false;

  isMockMode(): boolean {
    return this.mockMode;
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }
    const apiLevel = Platform.Version as number;
    const permissions =
      apiLevel >= 31
        ? [
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          ]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

    const results = await PermissionsAndroid.requestMultiple(permissions);
    return Object.values(results).every(
      result => result === PermissionsAndroid.RESULTS.GRANTED,
    );
  }

  async isBluetoothEnabled(): Promise<boolean> {
    try {
      return await RNBluetoothClassic.isBluetoothEnabled();
    } catch {
      // Không có adapter Bluetooth thật (một số emulator cũ) — vẫn cho qua ở
      // __DEV__ để listBondedDevices() bên dưới rơi vào nhánh mock.
      return __DEV__;
    }
  }

  /**
   * __DEV__ và danh sách ghép đôi thật rỗng => bật mock để test được toàn bộ
   * luồng kết nối/in trên emulator (xem ghi chú MOCK_DEVICES ở trên).
   */
  async listBondedDevices(): Promise<BluetoothDevice[]> {
    if (this.mockMode) {
      return MOCK_DEVICES;
    }
    let bonded: BluetoothDevice[] = [];
    try {
      bonded = await RNBluetoothClassic.getBondedDevices();
    } catch (error) {
      if (!__DEV__) {
        throw error;
      }
    }
    if (bonded.length === 0 && __DEV__) {
      this.mockMode = true;
      return MOCK_DEVICES;
    }
    return bonded;
  }

  /** Mở màn hình Cài đặt Bluetooth hệ thống để người dùng tự ghép đôi máy in mới. */
  openSystemBluetoothSettings(): void {
    if (Platform.OS === 'android') {
      RNBluetoothClassic.openBluetoothSettings();
    } else {
      Linking.openSettings();
    }
  }

  async connect(address: string): Promise<void> {
    this.status = 'CONNECTING';
    try {
      if (this.mockMode) {
        await new Promise(resolve => setTimeout(resolve, 500));
        this.connectedDevice = MOCK_DEVICES.find(d => d.address === address) ?? MOCK_DEVICES[0];
        this.status = 'CONNECTED';
        return;
      }
      const device = await RNBluetoothClassic.connectToDevice(address);
      this.connectedDevice = device;
      this.status = 'CONNECTED';
    } catch (error) {
      this.status = 'DISCONNECTED';
      this.connectedDevice = null;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connectedDevice && !this.mockMode) {
      await RNBluetoothClassic.disconnectFromDevice(this.connectedDevice.address);
    }
    this.connectedDevice = null;
    this.status = 'DISCONNECTED';
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getConnectedDevice(): BluetoothDevice | null {
    return this.connectedDevice;
  }

  async printBytes(bytes: Uint8Array): Promise<void> {
    if (!this.connectedDevice) {
      throw new Error('Chưa kết nối máy in');
    }
    if (this.mockMode) {
      const preview = Buffer.from(bytes)
        .toString('latin1')
        .split('')
        .filter(ch => ch.charCodeAt(0) >= 0x20 && ch.charCodeAt(0) <= 0x7e || ch === '\n')
        .join('');
      console.log(
        `[MOCK PRINTER] "${this.connectedDevice.name}" nhan ${bytes.length} byte:\n` +
          '----------------------------------------\n' +
          preview +
          '\n----------------------------------------',
      );
      await new Promise(resolve => setTimeout(resolve, 300));
      return;
    }
    await RNBluetoothClassic.writeToDevice(this.connectedDevice.address, Buffer.from(bytes));
  }
}
