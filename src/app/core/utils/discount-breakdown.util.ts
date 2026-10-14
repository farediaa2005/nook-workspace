/**
 * Pure discount and coupon calculation utility.
 * Enforces non-stacking rules, breakdown labels, and 2-decimal money rounding.
 */

export interface DiscountCalculationResult {
  subtotal: number;
  discountAmount: number;
  finalTotal: number;
  effectivePercent: number;
  labelAr: string;
  labelEn: string;
}

export function calculateCheckoutDiscount(params: {
  subtotal: number;
  couponCode?: string;
  couponType?: number; // 1 = percentage, 2 = fixed
  couponValue?: number;
  manualPercent?: number;
  manualFixed?: number;
}): DiscountCalculationResult {
  const subtotal = Math.max(0, params.subtotal);
  const code = (params.couponCode || '').trim().toUpperCase();

  let discountAmount = 0;
  let effectivePercent = 0;
  let labelAr = 'خصم مطبق';
  let labelEn = 'Discount Applied';

  if (code && params.couponValue !== undefined && params.couponValue > 0) {
    if (params.couponType === 1) {
      // Percentage coupon (e.g. NOOK63 -> 20%)
      effectivePercent = Math.min(100, Math.round(params.couponValue));
      discountAmount = +((subtotal * effectivePercent) / 100).toFixed(2);
      labelAr = `خصم (${code} — ${effectivePercent}%)`;
      labelEn = `Discount (${code} — ${effectivePercent}%)`;
    } else {
      // Fixed amount coupon (e.g. NOOK50 -> 50 EGP)
      discountAmount = Math.min(subtotal, +params.couponValue.toFixed(2));
      effectivePercent = subtotal > 0 ? Math.round((discountAmount / subtotal) * 100) : 0;
      labelAr = `خصم (${code} — ${discountAmount.toFixed(2)} ج.م)`;
      labelEn = `Discount (${code} — ${discountAmount.toFixed(2)} EGP)`;
    }
  } else if (params.manualPercent !== undefined && params.manualPercent > 0) {
    effectivePercent = Math.min(100, Math.round(params.manualPercent));
    discountAmount = +((subtotal * effectivePercent) / 100).toFixed(2);
    labelAr = `خصم (${effectivePercent}%)`;
    labelEn = `Discount (${effectivePercent}%)`;
  } else if (params.manualFixed !== undefined && params.manualFixed > 0) {
    discountAmount = Math.min(subtotal, +params.manualFixed.toFixed(2));
    effectivePercent = subtotal > 0 ? Math.round((discountAmount / subtotal) * 100) : 0;
    labelAr = `خصم مخصص (${discountAmount.toFixed(2)} ج.م)`;
    labelEn = `Custom Discount (${discountAmount.toFixed(2)} EGP)`;
  }

  const finalTotal = Math.max(0, +(subtotal - discountAmount).toFixed(2));

  return {
    subtotal,
    discountAmount,
    finalTotal,
    effectivePercent,
    labelAr,
    labelEn
  };
}
