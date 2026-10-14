/**
 * Single tested pure function for Shift Channel Balances, Reconciliation, and Variance Calculation.
 *
 * Rules:
 * - expected = opening + inflows - outflows per channel (cash / vodafone / instapay / fawry)
 * - difference = counted_closing - expected
 * - status "متوازن" ('balanced') ONLY when difference is 0 per channel (within 0.01 tolerance)
 * - otherwise "فيه خلاف" ('disputed') with per-channel breakdown
 * - strictly sanitizes negative zero (-0.00 -> 0.00)
 */

export interface ChannelFinancialFlow {
  opening: number;
  inflows: number;
  outflows: number;
  countedClosing?: number | null;
}

export interface ChannelBalanceReport {
  channelKey: 'cash' | 'vodafone' | 'instapay' | 'fawry';
  channelNameAr: string;
  channelNameEn: string;
  opening: number;
  inflows: number;
  outflows: number;
  expected: number;
  countedClosing: number;
  difference: number;
  isBalanced: boolean;
}

export interface ShiftFinancialReport {
  cash: ChannelBalanceReport;
  vodafone: ChannelBalanceReport;
  instapay: ChannelBalanceReport;
  fawry: ChannelBalanceReport;
  channels: ChannelBalanceReport[];
  totalOpening: number;
  totalInflows: number;
  totalOutflows: number;
  totalExpected: number;
  totalCountedClosing: number;
  totalDifference: number;
  isBalanced: boolean;
  status: 'balanced' | 'disputed';
}

export function sanitizeMoney(val: number): number {
  if (Math.abs(val) < 0.005) return 0;
  return Number((Math.round(val * 100) / 100).toFixed(2));
}

export function calculateChannelBalance(
  channelKey: 'cash' | 'vodafone' | 'instapay' | 'fawry',
  flow: ChannelFinancialFlow
): ChannelBalanceReport {
  const opening = sanitizeMoney(flow.opening || 0);
  const inflows = sanitizeMoney(flow.inflows || 0);
  const outflows = sanitizeMoney(flow.outflows || 0);
  const expected = sanitizeMoney(opening + inflows - outflows);

  const countedClosing = flow.countedClosing !== null && flow.countedClosing !== undefined
    ? sanitizeMoney(flow.countedClosing)
    : expected;

  const rawDiff = countedClosing - expected;
  const difference = sanitizeMoney(rawDiff);
  const isBalanced = Math.abs(difference) < 0.01;

  const names: Record<string, { ar: string; en: string }> = {
    cash: { ar: 'الدرج النقدي (كاش)', en: 'Cash Drawer' },
    vodafone: { ar: 'فودافون كاش', en: 'Vodafone Cash' },
    instapay: { ar: 'إنستاباي', en: 'InstaPay' },
    fawry: { ar: 'فوري', en: 'Fawry POS' }
  };

  return {
    channelKey,
    channelNameAr: names[channelKey]?.ar || channelKey,
    channelNameEn: names[channelKey]?.en || channelKey,
    opening,
    inflows,
    outflows,
    expected,
    countedClosing,
    difference,
    isBalanced
  };
}

export function calculateShiftBalances(flows: {
  cash: ChannelFinancialFlow;
  vodafone: ChannelFinancialFlow;
  instapay: ChannelFinancialFlow;
  fawry: ChannelFinancialFlow;
}): ShiftFinancialReport {
  const cashReport = calculateChannelBalance('cash', flows.cash);
  const vfReport = calculateChannelBalance('vodafone', flows.vodafone);
  const ipReport = calculateChannelBalance('instapay', flows.instapay);
  const fwReport = calculateChannelBalance('fawry', flows.fawry);

  const channels = [cashReport, vfReport, ipReport, fwReport];

  const totalOpening = sanitizeMoney(channels.reduce((sum, c) => sum + c.opening, 0));
  const totalInflows = sanitizeMoney(channels.reduce((sum, c) => sum + c.inflows, 0));
  const totalOutflows = sanitizeMoney(channels.reduce((sum, c) => sum + c.outflows, 0));
  const totalExpected = sanitizeMoney(channels.reduce((sum, c) => sum + c.expected, 0));
  const totalCountedClosing = sanitizeMoney(channels.reduce((sum, c) => sum + c.countedClosing, 0));
  const totalDifference = sanitizeMoney(channels.reduce((sum, c) => sum + c.difference, 0));

  // Balanced ONLY when difference is 0 per channel!
  const isBalanced = channels.every(c => c.isBalanced);
  const status: 'balanced' | 'disputed' = isBalanced ? 'balanced' : 'disputed';

  return {
    cash: cashReport,
    vodafone: vfReport,
    instapay: ipReport,
    fawry: fwReport,
    channels,
    totalOpening,
    totalInflows,
    totalOutflows,
    totalExpected,
    totalCountedClosing,
    totalDifference,
    isBalanced,
    status
  };
}

// ============================================================
// Storage Persistence for Opening Floats and Reconciliation
// ============================================================

export interface ShiftFloatsRecord {
  shiftId: string;
  initialCash: number;
  startVodafone: number;
  startInstaPay: number;
  startFawry: number;
  openedAt?: string;
  closing?: {
    actualCash: number;
    actualVodafone: number;
    actualInstaPay: number;
    actualFawry: number;
    variance: number;
    closedAt: string;
    channelReports?: ChannelBalanceReport[];
    status?: 'balanced' | 'disputed';
  };
}

const STORAGE_KEY_PREFIX = 'nook_shift_floats_';
const ACTIVE_SHIFT_FLOATS_KEY = 'nook_active_shift_floats';

export function saveShiftFloats(floats: ShiftFloatsRecord): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(ACTIVE_SHIFT_FLOATS_KEY, JSON.stringify(floats));
    if (floats.shiftId) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${floats.shiftId}`, JSON.stringify(floats));
    }
  } catch (err) {
    console.warn('[ShiftBalanceUtil] Failed to save shift floats', err);
  }
}

export function getSavedShiftFloats(shiftId?: string | null): ShiftFloatsRecord | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    if (shiftId) {
      const byId = localStorage.getItem(`${STORAGE_KEY_PREFIX}${shiftId}`);
      if (byId) return JSON.parse(byId);
    }
    const active = localStorage.getItem(ACTIVE_SHIFT_FLOATS_KEY);
    if (active) {
      const parsed: ShiftFloatsRecord = JSON.parse(active);
      if (!shiftId || parsed.shiftId === shiftId) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[ShiftBalanceUtil] Failed to load shift floats', err);
  }
  return null;
}
