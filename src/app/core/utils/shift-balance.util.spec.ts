import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateChannelBalance,
  calculateShiftBalances,
<<<<<<< HEAD
  sanitizeMoney
=======
  sanitizeMoney,
  saveShiftFloats,
  getSavedShiftFloats,
  ShiftFloatsRecord
>>>>>>> fix/audit-remediation
} from './shift-balance.util';

describe('ShiftBalanceUtil', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('sanitizeMoney', () => {
    it('should eliminate negative zero -0.00 and return 0', () => {
      expect(Object.is(sanitizeMoney(-0.00), 0)).toBe(true);
      expect(Object.is(sanitizeMoney(-0.0001), 0)).toBe(true);
    });

    it('should round to 2 decimal places properly', () => {
      expect(sanitizeMoney(123.456)).toBe(123.46);
      expect(sanitizeMoney(123.454)).toBe(123.45);
    });
  });

  describe('calculateChannelBalance', () => {
    it('should calculate expected balance as opening + inflows - outflows', () => {
      const res = calculateChannelBalance('cash', {
        opening: 250,
        inflows: 1500,
        outflows: 200,
        countedClosing: 1550
      });

      expect(res.expected).toBe(1550);
      expect(res.countedClosing).toBe(1550);
      expect(res.difference).toBe(0);
      expect(res.isBalanced).toBe(true);
    });

    it('should detect shortage (negative variance)', () => {
      const res = calculateChannelBalance('vodafone', {
        opening: 3450,
        inflows: 500,
        outflows: 100,
        countedClosing: 3800 // expected 3850 -> -50 shortage
      });

      expect(res.expected).toBe(3850);
      expect(res.difference).toBe(-50);
      expect(res.isBalanced).toBe(false);
    });

    it('should detect surplus (positive variance)', () => {
      const res = calculateChannelBalance('instapay', {
        opening: 202,
        inflows: 300,
        outflows: 0,
        countedClosing: 520 // expected 502 -> +18 surplus
      });

      expect(res.expected).toBe(502);
      expect(res.difference).toBe(18);
      expect(res.isBalanced).toBe(false);
    });
  });

  describe('calculateShiftBalances', () => {
    it('should report status balanced ONLY when difference is 0 across all channels', () => {
      const report = calculateShiftBalances({
        cash: { opening: 250, inflows: 800, outflows: 50, countedClosing: 1000 },
        vodafone: { opening: 3450, inflows: 200, outflows: 0, countedClosing: 3650 },
        instapay: { opening: 202, inflows: 100, outflows: 0, countedClosing: 302 },
        fawry: { opening: 0, inflows: 50, outflows: 0, countedClosing: 50 }
      });

      expect(report.isBalanced).toBe(true);
      expect(report.status).toBe('balanced');
      expect(report.totalDifference).toBe(0);
      expect(report.totalExpected).toBe(5002);
      expect(report.totalCountedClosing).toBe(5002);
    });

    it('should report status disputed if one channel has variance, even if other channels are balanced', () => {
      const report = calculateShiftBalances({
        cash: { opening: 250, inflows: 800, outflows: 50, countedClosing: 1000 },
        vodafone: { opening: 3450, inflows: 200, outflows: 0, countedClosing: 3600 }, // -50 difference
        instapay: { opening: 202, inflows: 100, outflows: 0, countedClosing: 302 },
        fawry: { opening: 0, inflows: 50, outflows: 0, countedClosing: 50 }
      });

      expect(report.isBalanced).toBe(false);
      expect(report.status).toBe('disputed');
      expect(report.vodafone.difference).toBe(-50);
      expect(report.cash.isBalanced).toBe(true);
      expect(report.vodafone.isBalanced).toBe(false);
    });

    it('should report disputed when channels have opposing differences that net to zero (no false balanced)', () => {
      // Cash has +100 surplus, Vodafone has -100 shortage
      // Net difference = 0, BUT neither channel is balanced!
      const report = calculateShiftBalances({
        cash: { opening: 100, inflows: 0, outflows: 0, countedClosing: 200 }, // +100
        vodafone: { opening: 500, inflows: 0, outflows: 0, countedClosing: 400 }, // -100
        instapay: { opening: 0, inflows: 0, outflows: 0, countedClosing: 0 },
        fawry: { opening: 0, inflows: 0, outflows: 0, countedClosing: 0 }
      });

      expect(report.totalDifference).toBe(0);
      expect(report.isBalanced).toBe(false);
      expect(report.status).toBe('disputed');
    });
  });
<<<<<<< HEAD
=======

  describe('Storage persistence', () => {
    it('should save and load shift floats by ID and active fallback', () => {
      const record: ShiftFloatsRecord = {
        shiftId: 'SHIFT-1234',
        initialCash: 250,
        startVodafone: 3450,
        startInstaPay: 202,
        startFawry: 0
      };

      saveShiftFloats(record);

      const loadedById = getSavedShiftFloats('SHIFT-1234');
      expect(loadedById).toEqual(record);

      const loadedActive = getSavedShiftFloats(null);
      expect(loadedActive).toEqual(record);
    });
  });
>>>>>>> fix/audit-remediation
});
