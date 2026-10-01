export interface TariffTier {
  id: number;
  serviceType: string;
  fromValue: number;
  /** null = không giới hạn (bậc cao nhất). */
  toValue: number | null;
  price: number;
}

export type NewTariffTier = Omit<TariffTier, 'id'>;
