// Canadian provincial sales tax — single source of truth (plan US#1, Task 1.2).
// Tax logic lives on the backend so clients never compute it themselves.

export interface ProvinceTax {
  code: string;
  name: string;
  rate: number;
  label: string;
}

export const PROVINCES: Record<string, ProvinceTax> = {
  ON: { code: "ON", name: "Ontario", rate: 0.13, label: "HST 13%" },
  BC: { code: "BC", name: "British Columbia", rate: 0.12, label: "GST 5% + PST 7%" },
  AB: { code: "AB", name: "Alberta", rate: 0.05, label: "GST 5%" },
  QC: { code: "QC", name: "Quebec", rate: 0.14975, label: "GST 5% + QST 9.975%" },
  SK: { code: "SK", name: "Saskatchewan", rate: 0.11, label: "GST 5% + PST 6%" },
  MB: { code: "MB", name: "Manitoba", rate: 0.12, label: "GST 5% + PST 7%" },
  NS: { code: "NS", name: "Nova Scotia", rate: 0.15, label: "HST 15%" },
  NB: { code: "NB", name: "New Brunswick", rate: 0.15, label: "HST 15%" },
  NL: { code: "NL", name: "Newfoundland & Labrador", rate: 0.15, label: "HST 15%" },
  PE: { code: "PE", name: "Prince Edward Island", rate: 0.15, label: "HST 15%" },
  NT: { code: "NT", name: "Northwest Territories", rate: 0.05, label: "GST 5%" },
  NU: { code: "NU", name: "Nunavut", rate: 0.05, label: "GST 5%" },
  YT: { code: "YT", name: "Yukon", rate: 0.05, label: "GST 5%" },
};

export const DEFAULT_PROVINCE = "ON";

export const PROVINCE_LIST = Object.values(PROVINCES);

export function taxInfo(province: string): ProvinceTax {
  return PROVINCES[province] ?? PROVINCES[DEFAULT_PROVINCE];
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface PriceBreakdown {
  basePrice: number;
  taxRate: number;
  taxAmount: number;
  tipPercent: number;
  tipAmount: number;
  total: number;
  taxLabel: string;
}

export interface PriceOptions {
  province?: string;
  tipPercent?: number; // 0..1 (0.15 = 15%)
}

/** Compute final price: base + province tax + optional tip (tip is a % of base, per plan). */
export function calculatePrice(basePrice: number, opts: PriceOptions = {}): PriceBreakdown {
  const info = taxInfo(opts.province ?? DEFAULT_PROVINCE);
  const tipPercent = opts.tipPercent ?? 0;
  const taxAmount = round2(basePrice * info.rate);
  const tipAmount = round2(basePrice * tipPercent);
  const total = round2(basePrice + taxAmount + tipAmount);
  return {
    basePrice,
    taxRate: info.rate,
    taxAmount,
    tipPercent,
    tipAmount,
    total,
    taxLabel: info.label,
  };
}
