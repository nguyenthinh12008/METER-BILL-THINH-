export interface MeterReading {
  id: number;
  customerId: number;
  period: string;
  oldReading: number;
  newReading: number;
  consumption: number;
  createdAt: string;
}

export type NewMeterReading = Omit<
  MeterReading,
  'id' | 'consumption' | 'createdAt'
>;
