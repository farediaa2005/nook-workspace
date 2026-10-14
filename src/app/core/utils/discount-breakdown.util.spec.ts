import { describe, it, expect } from 'vitest';
import { calculateCheckoutDiscount } from './discount-breakdown.util';

describe('Discount & Coupon Breakdown (O-1)', () => {
  it('should calculate percentage promo code (NOOK63 - 20%) on subtotal 3100.00 and generate explicit label', () => {
    const res = calculateCheckoutDiscount({
      subtotal: 3100,
      couponCode: 'NOOK63',
      couponType: 1, // Percentage
      couponValue: 20
    });

    expect(res.subtotal).toBe(3100);
    expect(res.discountAmount).toBe(620);
    expect(res.finalTotal).toBe(2480);
    expect(res.effectivePercent).toBe(20);
    expect(res.labelAr).toBe('خصم (NOOK63 — 20%)');
    expect(res.labelEn).toBe('Discount (NOOK63 — 20%)');
  });

  it('should calculate fixed amount promo code and clamp to subtotal if greater', () => {
    const res = calculateCheckoutDiscount({
      subtotal: 100,
      couponCode: 'SAVE50',
      couponType: 2, // Fixed EGP
      couponValue: 50
    });

    expect(res.discountAmount).toBe(50);
    expect(res.finalTotal).toBe(50);
    expect(res.labelAr).toBe('خصم (SAVE50 — 50.00 ج.م)');

    // Clamped case
    const clamped = calculateCheckoutDiscount({
      subtotal: 30,
      couponCode: 'BIG50',
      couponType: 2,
      couponValue: 50
    });
    expect(clamped.discountAmount).toBe(30);
    expect(clamped.finalTotal).toBe(0);
  });

  it('should prioritize coupon discount over manual discount (non-stacking rule)', () => {
    const res = calculateCheckoutDiscount({
      subtotal: 1000,
      couponCode: 'NOOK10',
      couponType: 1,
      couponValue: 10,
      manualPercent: 15
    });

    // Coupon takes precedence
    expect(res.discountAmount).toBe(100);
    expect(res.finalTotal).toBe(900);
    expect(res.labelAr).toBe('خصم (NOOK10 — 10%)');
  });

  it('should calculate manual percentage discount when no coupon is applied', () => {
    const res = calculateCheckoutDiscount({
      subtotal: 200,
      manualPercent: 15
    });

    expect(res.discountAmount).toBe(30);
    expect(res.finalTotal).toBe(170);
    expect(res.effectivePercent).toBe(15);
    expect(res.labelAr).toBe('خصم (15%)');
  });

  it('should calculate manual fixed discount when no coupon is applied', () => {
    const res = calculateCheckoutDiscount({
      subtotal: 200,
      manualFixed: 25
    });

    expect(res.discountAmount).toBe(25);
    expect(res.finalTotal).toBe(175);
    expect(res.labelAr).toBe('خصم مخصص (25.00 ج.م)');
  });
});
