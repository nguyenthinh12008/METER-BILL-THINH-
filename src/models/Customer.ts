export type ServiceType = 'ELECTRIC' | 'WATER';

export interface Customer {
  id: number;
  customerCode: string;
  fullName: string;
  address: string;
  phone: string;
  meterCode: string;
  serviceType: ServiceType;
  /** "Mã Sổ GCS" — mã sổ ghi chỉ số/tuyến thu, null nếu không có trong nguồn dữ liệu. */
  readingBookCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewCustomer = Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>;
