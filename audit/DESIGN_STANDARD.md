# NOOK web — design standard

This standard is based on what the site already uses most. It does not introduce a new design. Every value below is either:
- an existing token in `src/styles.css`, or
- the value that dominates the component styles today, with counts measured on 2026-11-11 over `src/app/**/*.css`.

Pages should use these tokens and the shared components in `src/app/shared/components/`.

## 0. Current state, measured

| What | Count |
|---|---|
| Component CSS | 44,572 lines |
| Hardcoded hex colors in component CSS | 2,248 (205 distinct) |
| `rgba()` literals in component CSS | 1,838 |
| Literal `font-size` values | 1,416 (36 distinct, `0.68rem`–`1.6rem`) |
| Distinct `box-shadow` values | 307 |
| `style="…"` in templates | 547 |
| Lines of user-visible Arabic text outside `language.service.ts` | 1,939 (52 TS + 32 HTML files) |
| `isArabic() ? … : …` ternaries | 1,214 |
| Custom modal overlays not using `<app-modal>` | 50, in 22 files |

## 1. Colors

The site has two themes:
- **Dark** is the default: `:root` / `[data-theme="dark"]`.
- **Light** uses a warm cream palette: `[data-theme="light"]`.

Always use the **semantic token**. Never write a raw color in a component, because the light theme needs a different value.

### 1.1 Core palette (already in `styles.css`)

| Token | Dark | Light | Use |
|---|---|---|---|
| `--yellow` (primary) | `#f5b921` | `#f5b921` | Primary actions, active states, highlights |
| `--yellow-hover` | `#ffca3a` | `#ffca3a` | Hover on primary |
| `--accent` | `#ffcf5a` | `#bd7f00` | Accent text on surfaces (readable yellow per theme) |
| `--page` | `#0a0a0b` | `#f2ede2` | Page background |
| `--surface` | `#17181c` | `#ffffff` | Cards, modals, inputs' containers |
| `--surface-2` | `#1f2026` | `#fbf8f1` | Inputs, nested panels, hover rows |
| `--surface-3` | `#2c2d36` | (add) | Third level (chips on surface-2) |
| `--text` | `#f2f2f4` | `#1f1b12` | Main text |
| `--text-dim` | `#9a9ba6` | `#7a7360` | Secondary / muted text, placeholders, captions |
| `--border` | `#2a2b33` | `#e8e1d2` | Default borders, dividers |
| `--border-strong` | `#3a3b45` | `#d6cbb3` | Input borders, emphasized dividers |
| `--success` | `#3ec98a` | `#1f9d61` | Success text/icons |
| `--danger` | `#ff7a6b` | `#e04343` | Errors, destructive actions |

### 1.2 Tokens to add (used everywhere as raw values today)

| New token | Dark | Light | Replaces (raw values in components) |
|---|---|---|---|
| `--on-primary` | `#16130a` | `#16130a` | Text on yellow buttons: `#16130a` (56), `#1a1509` (38), `#1c1810` |
| `--warning` | `#f59e0b` | `#b45309` | `#f59e0b` (70), `#d97706` (55), `#b45309` (43), `#fbbf24` |
| `--info` | `#60a5fa` | `#2563eb` | `#3b82f6` (64), `#2563eb`, `#60a5fa` |
| `--danger-strong` | `#ef4444` | `#dc2626` | Solid red backgrounds/buttons: `#ef4444` (157), `#dc2626`, `#e04343` |
| `--success-strong` | `#22c55e` | `#16a34a` | Solid green backgrounds: `#22c55e` (89), `#16a34a`, `#10b981` |
| `--on-color` | `#ffffff` | `#ffffff` | White text on red/green/blue solid fills (part of `#ffffff`, 162) |
| `--primary-soft` / `--danger-soft` / `--success-soft` / `--warning-soft` / `--info-soft` | `rgba(<color>, .12)` | `rgba(<color>, .10)` | The tinted backgrounds of badges/alerts, today ~600 hand-written `rgba(…, .08–.15)` |
| `--primary-line` / `--danger-line` / … | `rgba(<color>, .30)` | `rgba(<color>, .35)` | Tinted borders of the same badges/alerts |
| `--overlay` | `rgba(0,0,0,.65)` | `rgba(31,27,18,.45)` | Modal backdrops: `rgba(0,0,0,.5–.75)` in 22 files |

### 1.3 Colors to retire

**Tailwind "slate" grays** belong to a cold palette and clash with the warm cream and black themes. Map them like this:

| Raw value | Token |
|---|---|
| `#0f172a`, `#1e293b` | `--text` (light) / `--surface` (dark) |
| `#64748b`, `#94a3b8` | `--text-dim` |
| `#e2e8f0`, `#cbd5e1` | `--border` |
| `#f8fafc`, `#f1f5f9` | `--surface-2` |

**Alias tokens** that duplicate core tokens (all in `styles.css`) must not be used in new code. Use `--text`, `--text-dim`, `--surface`, `--surface-2`, `--border`, `--yellow` instead:
- `--text-main`, `--text-1`, `--text-color`, `--text-primary`
- `--text-muted`, `--text-secondary`, `--text-tertiary`
- `--card-bg`, `--bg-card`, `--surface-1`
- `--bg-subtle`, `--bg-secondary`, `--bg-hover`, `--surface-light`, `--surface-hover`, `--input-bg`
- `--border-color`, `--glass-border`
- `--primary-color`, `--primary-accent`, `--yellow-primary`

The aliases stay defined so nothing breaks. They are removed once nothing uses them.

**Exceptions that stay as raw values** (per-item data, not theme):
- Room card accent colors (`card.accentColor`)
- College chart colors (`getDistinctCollegeColor`)
- Instructor `colour`
- Chart series

### 1.4 Palette tokens (added in C8-02)

- Every fixed color a page still uses is a token in the palette block of `styles.css`. There are 189, with the same value in both themes.
  - Tailwind-scale names where the value matches (`--slate-900`, `--amber-400` …).
  - `--tone-<hex>` for the brand's own warm and dark tones.
- No page CSS contains a hex color any more. New colors go into the palette or, better, use a theme token.
- For new work, prefer the theme tokens in 1.1 (`--text`, `--surface`, `--success` …): they follow the light/dark theme, the palette tokens do not.

## 2. Typography

### Families (existing)
- **Arabic UI:** `--font-ar` = `'Cairo', system-ui, sans-serif`
- **English UI:** `--font-en` = `'Poppins', system-ui, sans-serif`
- **Body:** `--font-body` follows the language (Cairo in RTL, Poppins in LTR)
- **Headings and numbers in cards:** `--font-display` = `'Quicksand', 'Cairo', …`
- **Codes, IDs and amounts that must align:** `monospace` stays allowed (8 uses), but as `--font-mono: ui-monospace, 'Cascadia Mono', Consolas, monospace` (new token)
- **Form fields:** `input, select, textarea, button { font-family: inherit }`, done globally

### Size scale
These are new tokens, taken from the most-used values. Each nearby value maps to the closest step:

| Token | Value | Replaces | Use |
|---|---|---|---|
| `--fs-2xs` | `0.70rem` | 0.68, 0.70, 0.72 | Tiny labels, badges |
| `--fs-xs` | `0.75rem` | 0.74, 0.75, 0.76 | Captions, table meta |
| `--fs-sm` | `0.80rem` | 0.78, 0.80, 0.82 | Secondary text, small buttons |
| `--fs-ui` | `0.85rem` | 0.84, 0.85 | Labels, table cells, compact UI text (added in C2-10: 180 uses sat between sm and base) |
| `--fs-base` | `0.88rem` | 0.86, 0.875, 0.88, 0.9 | Body text, inputs, buttons (dominant: 165 uses) |
| `--fs-md` | `0.95rem` | 0.92, 0.95, 1rem | Emphasized body, card titles |
| `--fs-lg` | `1.1rem` | 1.05, 1.1, 1.15 | Section titles, modal titles |
| `--fs-xl` | `1.6rem` | 1.5–1.85 rem (pages used 24–29.6 px) | Page titles (h1) |
| `--fs-2xl` | `1.75rem` | 1.6–2rem | Big KPI numbers |

### Weights
These follow existing usage:
- `400` body text
- `500` sometimes
- `600` labels
- `700` buttons, titles (dominant, 582 uses)
- `800` KPI numbers, page titles (239 uses)

`750` / `850` / `900` map to the nearest of 700 / 800.

### Line height
- `1.5` for body text
- `1.25` for titles
- `1` for single-line chips and badges

## 3. Spacing, radius, shadows, breakpoints

### Spacing
A 4 px grid with half steps, because 2, 6, 10 and 14 px are very common:

| Token | Value |
|---|---|
| `--space-0-5` | `2px` |
| `--space-1` | `4px` |
| `--space-1-5` | `6px` |
| `--space-2` | `8px` (dominant) |
| `--space-2-5` | `10px` |
| `--space-3` | `12px` |
| `--space-3-5` | `14px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |

`3px`, `5px`, `7px` and `9px` map to the nearest step.

### Radius
The existing tokens are kept. Two are new, and the duplicate is fixed:

| Token | Value | Replaces | Use |
|---|---|---|---|
| `--radius-2xs` (new) | `6px` | 4–7 px | Chips inside inputs, small tags |
| `--radius-xs` | `8px` | 8, 9 px | Buttons sm, inputs sm |
| `--radius-sm` | `10px` | 10 px (dominant, 209) | Buttons, inputs |
| `--radius-md` (new) | `12px` | 12, 13 px | Cards inside cards, menus |
| `--radius` | `14px` | 14–18 px | Cards, panels |
| `--radius-lg` | `20px` | 20 px | Modals, large cards |
| `--radius-pill` (new) | `999px` | 999 / 9999 px | Badges, pills, toggles |
| (literal) | `50%` | — | Avatars, round icon buttons |

`--radius-xl` (also 20 px) duplicates `--radius-lg` and becomes an alias.

### Shadows
The existing tokens have per-theme values: `--shadow-xs`, `--shadow-sm`, `--shadow`, `--shadow-md`, `--shadow-lg`. Two are added:
- `--shadow-primary` = `0 4px 14px rgba(245,185,33,.30)`, for primary buttons
- `--shadow-focus` = `0 0 0 3px rgba(245,185,33,.25)`, the focus ring for inputs and buttons

The 307 distinct `box-shadow` values map to these 7.

### Breakpoints
Media queries can't use variables, so these are fixed values. Every new or touched media query uses only them:

| Name | Query | Replaces |
|---|---|---|
| phone | `max-width: 480px` | 480 / 520 / 576 / 580 / 600 px |
| tablet | `max-width: 768px` | dominant (28 uses), plus 640 px |
| small desktop | `max-width: 1024px` | 860 / 900 / 992 / 1024 px |
| desktop | `max-width: 1280px` | 1200 / 1280 px |

Test widths are 360, 768, 1024 and 1440 px.

## 4. Shared components

Every repeated UI piece comes from `src/app/shared/components/`.

### Existing components and their target API

| Component | Today | Standard |
|---|---|---|
| `app-primary-button` | Primary only (`text`, `type`, `fullWidth`, `disabled`); 12 files | Turned into the site button: `variant: 'primary' \| 'secondary' \| 'ghost' \| 'danger'`, `size: 'sm' \| 'md'`, `loading`, icon slot. Replaces `.btn-cancel` (18), `.btn-secondary` (14), `.btn-primary-modal` / `.btn-ghost-modal` (5+5), `.btn-confirm-delete` (5), `.btn-save` … |
| `app-modal` | `isOpen`, `title`, `close`; 6 files | Header / body / footer slots, `size: 'sm' \| 'md' \| 'lg'`, Escape + backdrop close, focus trap. Used by the 22 files with hand-made overlays. |
| `app-confirm-dialog` | 1 file | Every "are you sure" (delete, cancel, unblock, sign out), with `tone: 'danger' \| 'default'` and confirm/cancel labels from the language file |
| `app-page-header` | 7 files | Every page title + subtitle + actions row |
| `app-search-box` | 8 files | Every list search |
| `app-custom-select` | 12 files | Every dropdown (no raw `<select>` today ✓) |
| `app-pagination` | 7 files | Every paged table |
| `app-metric-card` | 7 files | Every KPI tile |
| `app-date-filter-dropdown`, `app-clock-time-picker` | — | Date / time inputs |
| `app-toast-container` + `NotificationService` | Global | The only way to give feedback after an action (success / error / warning / info) |

### Components to add (repeated by hand today)

| Component | Replaces |
|---|---|
| `app-status-badge` (`tone: success \| warning \| danger \| info \| neutral \| primary`) | Status pills in tables and cards (active / scheduled / completed / blocked / paid / debt …) |
| `app-empty-state` (icon, title, text, optional action) | "لا توجد بيانات مسجلة هنا حالياً." and other per-page empty blocks |
| `app-loading-state` (skeleton rows or spinner) | Per-page spinners and "Loading…" text |
| `app-error-state` (message + retry) | Failed-load blocks |
| `app-form-field` (label, hint, error, required mark) | The label + input + error markup repeated in every form |

### Variants (visual rules)

**Button**
- Height 40 px for `md`, 32 px for `sm`. Radius `--radius-sm`. Weight 700, size `--fs-base`. Focus ring `--shadow-focus`. Disabled: opacity .5, `cursor: not-allowed`.
- Primary: background `--yellow`, text `--on-primary`.
- Secondary: background `--surface-2`, border `--border-strong`, text `--text`.
- Ghost: transparent background, text `--text-dim` (hover `--text`).
- Danger: background `--danger-strong`, text `--on-color`.

**Inputs / selects / textarea**
- Height 42 px, background `--surface-2`, 1.5 px border `--border-strong`, radius `--radius-sm`.
- Focus: border `--yellow` + `--shadow-focus`.
- Error: border `--danger`, message `--fs-xs` in `--danger`.

**Checkbox / toggle**
- Accent `--yellow`. Touch target at least 40 × 40 px.

**Card**
- Background `--surface`, 1 px border `--border`, radius `--radius`, padding `--space-4` (`--space-3` on phones), shadow `--shadow`.

**Modal**
- Backdrop `--overlay`. Panel `--surface`, radius `--radius-lg`, `--shadow-lg`. Max width 520 / 720 / 960 px (sm / md / lg).
- Header title `--fs-lg` 800. Footer actions are right-aligned in LTR and left-aligned in RTL, with primary last.

**Table**
- Header `--fs-xs` 700 `--text-dim` on `--surface-2`. Rows `--fs-base`, 1 px `--border` dividers, hover `--surface-2`.
- Actions column: icon buttons 36 px, or a "⋮" menu that flips upwards when there's no room below.

**Badge**
- Pill radius, `--fs-2xs` 700, padding `2px 10px`, background `--<tone>-soft`, text `--<tone>`, border `--<tone>-line`.

**Tabs**
- Pill group on `--surface-2`, active tab `--yellow` with `--on-primary`.

**Header / navbar / sidebar**
- Already shared (`app-navbar`, `app-sidebar`): `--header-h` 64 px, `--sidebar-w` 256 px, `--sidebar-*` tokens.

**Loader**
- `--yellow` spinner or `--surface-2` skeleton blocks.

**Empty / error states**
- Centered, icon 40 px in `--text-dim`, title `--fs-md` 700, text `--fs-sm` `--text-dim`, optional primary/secondary button.

**Toast**
- From `NotificationService` only. Success / error / warning / info tones.

## 5. Text and language

**Every visible string comes from `LanguageService` translations.** This covers:
- labels, buttons, titles, placeholders
- errors and validation messages, toasts
- empty states, tooltips, `alt` / `aria-label` text, page titles

No `isArabic() ? '…' : '…'` in templates or components.

**Key naming**
- Today's flat `camelCase` keys (`closeShiftBtn`, `checkOutBtn` …) are kept.
- New keys are `camelCase` and grouped by a page prefix: `reservationDeleteTitle`, `blacklistSearchEmpty`, `shiftCloseConfirm`.
- Both `en` and `ar` objects have the same key set (the `Translations` interface enforces it).

**RTL**
- Arabic is the main language. Every page is checked in RTL and LTR.
- Spacing uses logical properties where it's touched: `margin-inline-start`, `padding-inline-end`, `inset-inline-start`.
