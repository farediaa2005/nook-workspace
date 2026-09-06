# NOOK Workspace — Design System & Style Guide
**Version**: 2.0  
**Language Support**: Full Bilingual (Arabic RTL & English LTR)  
**Themes**: Dark Mode (`#0a0a0b` / `#17181c`) & Light Mode (`#f2ede2` / `#ffffff`)

---

## 1. 🔤 Typography & Font Hierarchy

### Font Families
| Font Family | Scope | Primary Role |
| :--- | :--- | :--- |
| **Cairo** | Arabic (RTL) | Primary Arabic UI, Navigation, Headings, Forms, Buttons |
| **Poppins** | English (LTR) | Primary English UI, Body, Navigation, Forms, Tables |
| **Quicksand** | English (Display) | Logos, Brand Names, Headlines |

---

### Font Size & Weight Specification Matrix

| UI Component | Size (rem) | Size (px) | Font Weight | Line Height | Applied Element |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Page Title** | `1.75rem` - `1.85rem` | `28px` - `30px` | `600` / `700` | `1.2` | `.page-title`, `Add Student`, `لوحة التحكم` |
| **Page Subtitle** | `0.92rem` - `0.95rem` | `14.5px` - `15px` | `400` | `1.4` | `.page-subtitle`, descriptions |
| **Section Heading** | `1.20rem` - `1.25rem` | `19px` - `20px` | `700` | `1.3` | `1. Student Information`, `2. Session & Billing` |
| **Stat Big Number** | `2.15rem` - `2.25rem` | `34px` - `36px` | `600` | `1.1` | `.stat-value` (`248`, `32`, `156`, `76%`) |
| **Stat Label** | `0.92rem` - `0.95rem` | `14.5px` - `15px` | `400` | `1.3` | `.stat-label` (`Active bookings`, `الحجوزات النشطة`) |
| **Trend Badge** | `0.78rem` - `0.80rem` | `12.5px` - `13px` | `600` | `1.0` | `.trend-badge` (`▲ 12%`, `▲ 8%`) |
| **Sidebar Group Title** | `0.75rem` | `12px` | `500` | `1.0` | `.nav__section-title` (`MAIN`, `MANAGEMENT`, `OTHER`) |
| **Sidebar Main Item** | `0.88rem` - `0.90rem` | `14px` | `400` (600 active) | `1.2` | `.nav__item` (`Workspace`, `Classrooms`) |
| **Sidebar Sub Item** | `0.82rem` | `13px` | `400` (600 active) | `1.2` | `.sub-item` (`Add Student`, `Show Students`) |
| **Form Field Label** | `0.72rem` - `0.74rem` | `11.5px` - `12px` | `700` (UPPER) | `1.0` | `.field-label` (`STUDENT NAME`, `PHONE NUMBER`) |
| **Form Input / Select**| `0.92rem` | `14.5px` | `400` | `1.4` | `.field-input`, text fields, dropdowns |
| **Option Card Title** | `0.92rem` | `14.5px` | `700` | `1.2` | `.option-title` (`New Session`, `Use Package`) |
| **Option Subtitle** | `0.78rem` | `12.5px` | `400` | `1.2` | `.option-subtitle` (`Standard hourly rate`) |
| **Primary Action Btn** | `0.88rem` - `0.92rem` | `14px` - `15px` | `700` | `1.0` | `.btn-confirm`, `.btn--primary` |
| **Cancel / Ghost Btn** | `0.88rem` - `0.90rem` | `14px` - `14.5px` | `600` | `1.0` | `.btn-cancel`, `.btn--ghost` |
| **Table Header (th)** | `0.82rem` | `13px` | `500` | `1.2` | `th`, table columns |
| **Table Cell (td)** | `0.88rem` | `14px` | `400` | `1.3` | `td`, row data |
| **Navbar User Name** | `0.88rem` | `14px` | `500` | `1.2` | `.user__meta strong` |
| **Navbar User Role** | `0.74rem` | `12px` | `400` | `1.0` | `.user__meta small` |

---

## 2. 🎨 Core Brand Color Palette

| Color Token | HEX Code | RGB | Usage |
| :--- | :--- | :--- | :--- |
| **Primary Gold** | `#f5b921` | `rgb(245, 185, 33)` | Primary buttons, active menu capsules, glowing active focus borders |
| **Primary Gold Hover**| `#ffc93d` | `rgb(255, 201, 61)` | Button hover state |
| **Amber Gold (Light)**| `#c48300` | `rgb(196, 131, 0)` | High-contrast gold text/icons in Light Theme |
| **Danger Red** | `#ef4444` | `rgb(239, 68, 68)` | Error alerts, blacklist warnings, sign-out button |
| **Success Green** | `#22c55e` | `rgb(34, 197, 94)` | Active status, trend growth badges, available desks |
| **Info Blue** | `#3b82f6` | `rgb(59, 130, 246)` | Active members metric icon |
| **Analytics Purple** | `#a855f7` | `rgb(168, 85, 247)` | Occupancy rate icon and analytics |

---

## 3. 🌙 Dark Theme Palette (Default)

| CSS Variable | HEX / RGBA Value | Applied To |
| :--- | :--- | :--- |
| `--page` | `#0a0a0b` | Main page background & Sidebar background |
| `--surface` | `#17181c` | Cards, Search Bar, Stat Boxes, Content Containers |
| `--surface-2` | `#202227` | Form inputs, Dropdowns, Table headers |
| `--header-bg` | `rgba(10, 10, 11, 0.95)` | Navbar header with backdrop blur |
| `--border` | `#23252b` | Card borders, Input borders, Dividers |
| `--border-strong`| `#2f323a` | High-contrast borders |
| `--sidebar-border`| `#1a1b20` | Vertical sidebar dividing line |
| `--text` | `#ffffff` | Primary text, big numbers, card titles |
| `--text-dim` | `#8e929b` | Subtitles, input placeholders, stat labels |
| `--sidebar-group`| `#5f636e` | Sidebar group titles (`MAIN`, `MANAGEMENT`, `OTHER`) |
| `--sidebar-hover`| `#17181c` | Sidebar items hover background |

---

## 4. ☀️ Light Theme Palette (Warm Sand Cream)

| CSS Variable | HEX / RGBA Value | Applied To |
| :--- | :--- | :--- |
| `--page` | `#f2ede2` | Main page background (Warm Sand Cream) |
| `--surface` | `#ffffff` | Pure white cards, Stat Boxes, Form Cards, Content Containers |
| `--surface-2` | `#f7f5f0` | Dropdowns, search bar secondary surface |
| **Input Tint** | `#faf4e8` | Form input boxes in Checkin / Add Student |
| `--header-bg` | `#ffffff` | Navbar top header |
| `--sidebar-bg` | `#ffffff` | Sidebar background |
| `--border` | `#e6e0d4` | Soft cream borders and dividers |
| `--border-strong`| `#d5cdbf` | High-contrast light borders |
| `--sidebar-border`| `#e6e0d4` | Vertical sidebar dividing line |
| `--text` | `#1a1815` | Deep charcoal primary text |
| `--text-dim` | `#736c61` | Muted descriptions and secondary text |
| `--sidebar-group`| `#91897c` | Sidebar group titles |
| `--sidebar-hover`| `#f7f5f0` | Sidebar items hover background |

---

## 5. 📊 Stat Cards Color Matrix (Dark vs Light)

| Metric Card | Mode | Box Background | Icon Color | Trend Badge BG | Trend Text Color |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Active Bookings** | **Dark** | `#38311c` | `#f5b921` (Gold) | `#0f2922` | `#22c55e` |
| | **Light** | `#fdf6e7` | `#c48300` (Gold) | `#ecf8f2` | `#16a34a` |
| **Available Desks** | **Dark** | `#143024` | `#22c55e` (Green) | `#0f2922` | `#22c55e` |
| | **Light** | `#ecf8f2` | `#16a34a` (Green) | `#ecf8f2` | `#16a34a` |
| **Active Members** | **Dark** | `#152940` | `#3b82f6` (Blue) | `#0f2922` | `#22c55e` |
| | **Light** | `#eff6ff` | `#2563eb` (Blue) | `#ecf8f2` | `#16a34a` |
| **Occupancy Rate** | **Dark** | `#2c1a40` | `#a855f7` (Purple) | `#0f2922` | `#22c55e` |
| | **Light** | `#f8f0fc` | `#9333ea` (Purple) | `#ecf8f2` | `#16a34a` |

---

## 6. 💡 Login Page & Lamp Glow Effects

| Element | Color / Gradient | Effect / Description |
| :--- | :--- | :--- |
| **Lamp Shade** | `linear-gradient(#5a4926, #3a2d16)` | Metallic bronze lampshade |
| **Glowing Bulb** | `radial-gradient(circle at 50% 38%, #fff3d0, #ffcf5a)` | Warm glowing light source |
| **Bulb Halo Glow**| `box-shadow: 0 0 24px 8px rgba(245, 185, 33, 0.65)` | Double-layer radial light |
| **Dark Card Scrim**| `rgba(8, 8, 8, 0.78)` with `backdrop-filter: blur(1px)` | Fixed dark background overlay |
| **Active Input Glow**| `border: 1px solid #f5b921; box-shadow: 0 0 0 3px rgba(245, 185, 33, 0.2)` | Golden focus ring |
