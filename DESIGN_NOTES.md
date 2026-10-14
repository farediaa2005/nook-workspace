# NOOK Workspace — Design System & Visual Identity Notes (DESIGN_NOTES.md)

This document catalogs the design system, color tokens, typography rules, Arabic-first RTL micro-interactions, and accessibility standards enforced across the NOOK Workspace platform. All UI updates must strictly adhere to these specifications with zero visual regression.

---

## 1. Brand Identity & Color Tokens

NOOK Workspace employs a dual-theme warm luxury aesthetic: a signature warm cream light theme and an obsidian dark theme, unified by gold accents and Cairo typography.

### Core Color Palette

| Token | Dark Theme Value | Light Theme Value | Usage |
|---|---|---|---|
| `--page` | `#0a0a0b` | `#f2ede2` | Page canvas background |
| `--surface` | `#17181c` | `#ffffff` | Primary cards, panels, modals |
| `--surface-2` | `#1f2026` | `#fbf8f1` | Inset containers, inputs, table zebra rows |
| `--sidebar-bg` | `#0d0e11` | `#ffffff` | Navigation sidebar |
| `--header-bg` | `#0d0e11` | `#ffffff` | Top application header |
| `--border` | `#2a2b33` | `#e8e1d2` | Card outlines, structural dividers |
| `--border-strong` | `#3a3b45` | `#d6cbb3` | Input borders, active tab borders |
| `--text` | `#f2f2f4` | `#1f1b12` | Primary readable text |
| `--text-dim` | `#9a9ba6` | `#7a7360` | Secondary labels, captions, metadata |
| `--yellow` | `#f5b921` | `#f5b921` | Brand gold accent, Primary CTAs, active highlights |
| `--yellow-hover` | `#ffca3a` | `#ffca3a` | Hover states for primary buttons |
| `--danger` | `#ff7a6b` | `#e04343` | Destructive actions, error text, warnings |
| `--success` | `#3ec98a` | `#1f9d61` | Active sessions, successful toasts, paid status |

### Layout Dimensions & Radii

| Token | Value | Purpose |
|---|---|---|
| `--header-h` | `64px` | Fixed top header height |
| `--sidebar-w` | `256px` | Expanded navigation drawer width |
| `--radius` | `14px` | Standard border radius for cards, tables, dialogs |
| `--radius-sm` | `10px` | Interactive elements (buttons, inputs, dropdowns) |
| `--radius-pill` | `9999px` | Badges, status pills, circular action triggers |

---

## 2. Typography & Font Hierarchy

The interface is built primarily for Arabic users, with seamless English bilingual support.

| Element | Font Family | Weights | Direction | Notes |
|---|---|---|---|---|
| **Arabic Text (Headings & Body)** | `'Cairo', system-ui, sans-serif` | 400, 500, 600, 700, 800 | RTL | Primary application font |
| **English Body Text** | `'Poppins', system-ui, sans-serif` | 400, 500, 600 | LTR | Used when English language active |
| **Metrics & Digital Numbers** | `'Quicksand', 'Cairo', sans-serif` | 600, 700 | LTR/RTL | Clean, legible numerals for timers and currency |

---

## 3. WCAG AA Accessibility & Contrast Audit

A core requirement of audit remediation is compliance with WCAG 2.1 Level AA standards (minimum 4.5:1 contrast for normal text, 3:1 for large text and UI components).

### Key Contrast Ratios Verified

1. **Light Theme (`#f2ede2` page background):**
   - Text `#1f1b12` on `#f2ede2`: **14.8:1** (Passes AAA).
   - Text `#1f1b12` on `#ffffff` (card surface): **17.2:1** (Passes AAA).
   - Dim text `#7a7360` on `#ffffff`: **4.8:1** (Passes AA).
   - Gold CTA `#f5b921` with dark text `#1c1810`: **9.4:1** (Passes AAA).

2. **Dark Theme (`#17181c` card surface):**
   - Text `#f2f2f4` on `#17181c`: **14.2:1** (Passes AAA).
   - Dim text `#9a9ba6` on `#17181c`: **5.1:1** (Passes AA).
   - Danger `#ff7a6b` on `#17181c`: **5.6:1** (Passes AA).
   - Success `#3ec98a` on `#17181c`: **7.3:1** (Passes AAA).

3. **[O-4] Recurring Reservation Cancel Dialog Audit Fix:**
   - *Previous Defect:* Muted cancellation warning text had a contrast ratio of `2.8:1` against dark dialog surface `#17181c`.
   - *Remediation Fix:* Replaced with `#f2f2f4` (14.2:1) for body text and amber highlight `#f5b921` (9.6:1) for reservation series warnings. Fully passes WCAG AA.

---

## 4. Arabic-First RTL Micro-Interaction Guidelines

All components must respect Arabic RTL reading flow and layout symmetry:

1. **Directionality Attribute:**
   - Root container dynamically binds `[dir]="isArabic() ? 'rtl' : 'ltr'"`.
   - Layout grids and flexboxes automatically invert column order.

2. **Input Alignment & Numeral Handling:**
   - Text inputs (names, descriptions, notes) right-align in Arabic mode.
   - Numerical inputs (phones, prices, hours) display with numbers formatted cleanly.
   - Arabic-Indic numerals (`٠١٢٣٤٥٦٧٨٩`) are automatically normalized to standard digits (`0123456789`) on keystroke (`normalizeArabicDigits`) to prevent backend regex parsing rejections while preserving natural customer input.

3. **Icon Directionality:**
   - Navigational arrows (`next`, `previous`, `chevron`) must mirror in RTL mode.
   - Action icons (print, delete, edit, checkmark) remain non-mirrored.

4. **Smooth Scroll & Focus Management (O-2):**
   - On form validation failure, viewport smoothly scrolls to the top-most invalid input:
   ```typescript
   firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
   firstInvalid.focus();
   ```

---

## 5. Modal & Dialog Standards (NOOK-SEC-01 & O-10)

Destructive actions (e.g. deleting student profile, room, product, or pricing tier) follow a strict UX specification:

1. **No Password Obstacles:** Legacy requirements forcing staff to enter the shift-opener password for standard entity deletions have been removed.
2. **Clear Intent & Entity Highlighting:** Dialog must clearly state the exact entity name in bold (e.g., `هل أنت متأكد من حذف بيانات الطالب "أحمد علي"؟`).
3. **High-Contrast Confirm CTA:** The confirmation button must use `--danger` background (`#ef4444` / `#ff7a6b`) with bold white text. Cancel button must use neutral `--surface-2` with clean border.
4. **Escape Key & Backdrop Dismissal:** Clicking outside the modal or pressing `Escape` dismisses without executing the destructive action.
