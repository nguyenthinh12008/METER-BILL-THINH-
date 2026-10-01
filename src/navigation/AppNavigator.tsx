import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { useAuth } from '../contexts/AuthContext';
import BootstrapScreen from '../screens/BootstrapScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import CustomerListScreen from '../screens/CustomerListScreen';
import ImportedInvoiceListScreen from '../screens/ImportedInvoiceListScreen';
import ImportCustomerScreen from '../screens/ImportCustomerScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import MeterReadingScreen from '../screens/MeterReadingScreen';
import InvoicePreviewScreen from '../screens/InvoicePreviewScreen';
import InvoiceDetailScreen from '../screens/InvoiceDetailScreen';
import PrinterScreen from '../screens/PrinterScreen';
import AccountsScreen from '../screens/AccountsScreen';
import AddAccountScreen from '../screens/AddAccountScreen';

export type AuthStackParamList = {
  Bootstrap: undefined;
  Login: undefined;
};

export type AuthStackScreenProps<RouteName extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, RouteName>;

export type RootStackParamList = {
  Home: undefined;
  CustomerList: undefined;
  ImportedInvoiceList: undefined;
  ImportCustomer: undefined;
  CustomerDetail: { customerId?: number } | undefined;
  MeterReading: { customerId: number };
  InvoicePreview: { meterReadingId: number };
  InvoiceDetail: { invoiceId: number };
  Printer:
    | { invoiceId?: number; importedInvoiceRecordId?: number }
    | undefined;
  Accounts: undefined;
  AddAccount: undefined;
};

export type RootStackScreenProps<RouteName extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, RouteName>;

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator(): React.JSX.Element {
  const { currentUser, hasAnyAccount } = useAuth();

  return (
    <NavigationContainer>
      {currentUser ? (
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'Trang chủ' }}
          />
          <Stack.Screen
            name="CustomerList"
            component={CustomerListScreen}
            options={{ title: 'Khách hàng' }}
          />
          <Stack.Screen
            name="ImportedInvoiceList"
            component={ImportedInvoiceListScreen}
            options={{ title: 'Hóa đơn cần in' }}
          />
          <Stack.Screen
            name="ImportCustomer"
            component={ImportCustomerScreen}
            options={{ title: 'Import Excel' }}
          />
          <Stack.Screen
            name="CustomerDetail"
            component={CustomerDetailScreen}
            options={{ title: 'Chi tiết khách hàng' }}
          />
          <Stack.Screen
            name="MeterReading"
            component={MeterReadingScreen}
            options={{ title: 'Nhập chỉ số' }}
          />
          <Stack.Screen
            name="InvoicePreview"
            component={InvoicePreviewScreen}
            options={{ title: 'Xem trước hóa đơn' }}
          />
          <Stack.Screen
            name="InvoiceDetail"
            component={InvoiceDetailScreen}
            options={{ title: 'Chi tiết hóa đơn' }}
          />
          <Stack.Screen
            name="Printer"
            component={PrinterScreen}
            options={{ title: 'Máy in' }}
          />
          <Stack.Screen
            name="Accounts"
            component={AccountsScreen}
            options={{ title: 'Quản lý tài khoản' }}
          />
          <Stack.Screen
            name="AddAccount"
            component={AddAccountScreen}
            options={{ title: 'Thêm tài khoản' }}
          />
        </Stack.Navigator>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          {hasAnyAccount ? (
            <AuthStack.Screen name="Login" component={LoginScreen} />
          ) : (
            <AuthStack.Screen name="Bootstrap" component={BootstrapScreen} />
          )}
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default AppNavigator;
