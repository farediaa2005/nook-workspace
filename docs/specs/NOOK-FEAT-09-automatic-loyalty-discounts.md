# Architectural Specification: NOOK-FEAT-09 Automated Loyalty Discounts & Tier Engine

## 1. Problem Statement & Business Justification
Student retention in NOOK is driven by consistency. Currently, discounts are either manually keyed in by cashiers or applied via one-off promo coupons. This creates two problems:
1. Staff friction and human error (forgetting to discount frequent regulars or over-discounting friends).
2. Lack of gamification and reward transparency for students who spend hundreds of hours in the space.

This specification details an automated loyalty discount engine that automatically calculates tiered discounts upon checkout based on historical visit counts, cumulative study hours, and active package subscription milestones.

---

## 2. Loyalty Rules & Tier Hierarchy

### 2.1 Tier Definitions

| Tier Level | Name (Arabic / English) | Qualifying Threshold | Automatic Seating Discount | Catering Perk |
|---|---|---|---|---|
| **Tier 1: Bronze** | برونزي / Regular | 5+ Visits OR 15+ Hours | 5% off Hourly Seating | None |
| **Tier 2: Silver** | فضي / Scholar | 15+ Visits OR 40+ Hours | 10% off Hourly Seating | Free Standard Drink every 5 visits |
| **Tier 3: Gold** | ذهبي / Resident | 30+ Visits OR 80+ Hours | 15% off Hourly Seating | 10% off all Canteen orders |
| **Tier 4: Platinum** | بلاتيني / Master | 50+ Visits OR 150+ Hours | 20% off Hourly Seating | Priority Hall Booking + 15% Canteen |

### 2.2 Package Renewal Continuity Bonus
If a student renews an expiring package within 3 days of expiration or hour depletion:
- **Immediate Perk:** 10% bonus hours added to the renewed package (e.g., 50-hour package receives +5 complimentary hours).

---

## 3. Financial Calculation & Stacking Rules

### 3.1 Non-Compounding Stacking Invariant
To safeguard NOOK profit margins, automated loyalty discounts **never** compound multiplicatively with manual promo codes or package hours:
$$\text{Applied Discount} = \max(\text{LoyaltyDiscount}, \text{PromoCodeDiscount})$$

### 3.2 Pure Calculation Utility Specification

```typescript
export interface LoyaltyTierInfo {
  tier: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';
  nameAr: string;
  nameEn: string;
  discountPct: number;
  cateringDiscountPct: number;
  nextTierThreshold?: { visits: number; hours: number };
}

export function computeLoyaltyTier(totalVisits: number, totalHours: number): LoyaltyTierInfo {
  if (totalVisits >= 50 || totalHours >= 150) {
    return {
      tier: 'platinum',
      nameAr: 'بلاتيني (Master)',
      nameEn: 'Platinum',
      discountPct: 20,
      cateringDiscountPct: 15
    };
  }
  if (totalVisits >= 30 || totalHours >= 80) {
    return {
      tier: 'gold',
      nameAr: 'ذهبي (Resident)',
      nameEn: 'Gold',
      discountPct: 15,
      cateringDiscountPct: 10,
      nextTierThreshold: { visits: 50, hours: 150 }
    };
  }
  if (totalVisits >= 15 || totalHours >= 40) {
    return {
      tier: 'silver',
      nameAr: 'فضي (Scholar)',
      nameEn: 'Silver',
      discountPct: 10,
      cateringDiscountPct: 0,
      nextTierThreshold: { visits: 30, hours: 80 }
    };
  }
  if (totalVisits >= 5 || totalHours >= 15) {
    return {
      tier: 'bronze',
      nameAr: 'برونزي (Regular)',
      nameEn: 'Bronze',
      discountPct: 5,
      cateringDiscountPct: 0,
      nextTierThreshold: { visits: 15, hours: 40 }
    };
  }
  return {
    tier: 'none',
    nameAr: 'عضو جديد',
    nameEn: 'Standard Member',
    discountPct: 0,
    cateringDiscountPct: 0,
    nextTierThreshold: { visits: 5, hours: 15 }
  };
}
```

---

## 4. UI/UX Checkout & Receipt Integration
- **Checkout Modal Breakdown:**
  When checking out a student in `checkout.component.html`, the financial summary displays:
  - Base Seating Cost (e.g., `60.00 EGP`)
  - **خصم الولاء التلقائي (Loyalty Tier - Gold 15%):** `-9.00 EGP`
  - Catering Total (with 10% Gold discount applied if applicable)
  - Final Amount Due
- **Printed Thermal Receipt:** Explicit line item printed: `خصم ولاء العضوية: 15% (ذهبي)`.
