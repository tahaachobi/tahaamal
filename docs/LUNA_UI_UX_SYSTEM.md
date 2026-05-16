# Luna Salon Operating System — Unified UI/UX System

This document defines the single, shared design language for **Luna Salon Operating System** (enterprise ERP + POS + Booking + CRM + Inventory + Accounting + Loyalty + Analytics).

**Goal:** every module feels like the same product: clean like Apple, professional like Stripe, functional like Shopify POS, simple like Notion.

---

## 1) Global UI Principles

- **Clarity first:** information must be readable in ~2 seconds.
- **Card + table structure:** all data surfaces as cards, tables, or timelines.
- **One action = one result:** state-based transitions only; no duplicate/ambiguous actions.
- **Fast UX:** minimal layout shifts, minimal animations, predictable interaction.
- **Real-time by default:** data surfaces show “freshness” and handle concurrency safely (see Audit & State).
- **Mobile-first responsive:** every screen works on mobile; desktop adds density, not complexity.

---

## 2) Design Tokens (Source of Truth)

**Implementation:** `D:/Form/app/globals.css` defines CSS variables; `D:/Form/tailwind.config.ts` maps them into Tailwind semantic colors/radii/shadows.

### 2.1 Colors

**Brand / info**
- Primary / Info: `#3b82f6`

**Status (required)**
- Success: `#22c55e`
- Warning: `#facc15`
- Error: `#ef4444`
- Neutral: `#64748b`

**Neutrals**
- Light background: white / soft gray (`--luna-gray-50` .. `--luna-gray-900`)

### 2.2 Surfaces

- App background: soft gray
- Primary surface: white
- Cards: white + soft shadow + subtle border

### 2.3 Radius & Shadows

- Rounded corners: **12–16px** baseline
- Shadows: soft, low-contrast; borders stay **1px subtle** (no heavy separators)

---

## 3) Typography System

**Font:** Inter/SF-Pro style (Inter via Next.js font loader).

**Hierarchy classes (preferred)**
- `luna-h1`: Page title
- `luna-h2`: Section title
- `luna-h3`: Card title / table title
- `luna-text-muted`: Secondary text
- `luna-caption`: Microcopy, hints, timestamps

---

## 4) Layout System (Unified Shell)

### 4.1 Shell pattern (Owner/Backoffice)

**Structure**
- Left fixed sidebar (primary navigation)
- Top bar (search + notifications + quick profile)
- Content area using cards + grids

**Implementation hooks**
- Shell containers: `luna-shell`, `luna-sidebar`, `luna-topbar`, `luna-content` (CSS in `D:/Form/app/globals.css`)
- Owner navigation layout: `D:/Form/app/dashboard/layout.tsx`

### 4.2 Density rules

- Desktop: prioritize **scan speed** (tables, split panes, denser grids)
- Mobile: prioritize **step-by-step** screens (single column, sticky actions)

---

## 5) Component System (Reusable Building Blocks)

**Implementation:** `D:/Form/components/ui/*`

### 5.1 Buttons

Variants:
- Primary / Secondary / Outline / Danger / Success

Usage:
- Primary: the single “main” action per surface
- Secondary: common actions, navigation actions
- Danger: destructive or irreversible transitions (requires confirmation)

### 5.2 Cards

Card types:
- Data cards (tables, lists)
- KPI cards
- Service cards (for booking / catalogs)

### 5.3 Tables

Tables are the default for:
- Bookings
- Transactions
- Inventory rows
- Staff performance rows

Rules:
- Sticky header on long tables (desktop)
- Row action(s) placed at far right; never duplicate primary action per row

### 5.4 Badges

Use for:
- Booking status
- Resource status
- Payment status
- Stock status (low / ok / out)

### 5.5 Inputs

Inputs are minimal:
- Clear label + placeholder
- Focus ring on primary blue
- Validation inline (no modal errors)

### 5.6 Modals

Use only for:
- Confirm actions (state transitions)
- Small forms that do not require navigation

Rule:
- Destructive actions always require confirmation.

---

## 6) Core Modules — Page Templates

### 6.1 Owner Dashboard (Enterprise SaaS)

Pattern:
- KPI cards (Revenue, Bookings, Staff, Cash)
- Line/bar charts
- Tables (bookings & transactions)
- Quick actions panel

UX rules:
- Every KPI is clickable to drill-down.
- Default time range: Today / Week / Month.

### 6.2 POS / Cashier (Retail POS)

Pattern:
- Split layout
  - Left: services/catalog + cart builder
  - Right: client + staff + payment + totals

UX rules:
- Large payment buttons (cash/card)
- Always show invoice preview (summary at minimum)
- Avoid distractions: no sidebars, minimal navigation, keyboard-friendly

### 6.3 Staff Interface (Queue + Duty)

Pattern:
- Duty toggle: **ON DUTY / OFF DUTY** (always visible)
- Assigned queue only (no global calendar)
- Booking details (service, time, resource, notes)

UX rules:
- No financial data
- Fast transitions: “Arriving” → “In service” → “Completed”

### 6.4 Client Booking (Mobile-first, premium)

Pattern:
1) Choose service
2) Pick date
3) Pick time
4) Confirm

UX rules:
- Card-based service list (image + duration + price)
- Single-column layout, sticky bottom action
- Show trust/loyalty info inside profile (not in booking flow)

### 6.5 Reporting & Analytics (GA + Stripe)

Pattern:
- KPI highlights
- Filters (date / staff / service / resource)
- Charts + drill-down tables
- Export actions (PDF / Excel)

UX rules:
- Filters are persistent per report view (save last used)
- Exports are deliberate (no “print spam”)

---

## 7) Status & State Rules (No Spam, Single Transition)

### 7.1 Booking lifecycle (canonical)

1. `PENDING`
2. `ACCEPTED`
3. `CONFIRMED`
4. `ARRIVING` (one-time, locked)
5. `FINAL_CONFIRMATION`
6. `IN_SERVICE`
7. `COMPLETED` / `CANCELLED` / `NO_SHOW`

Rules:
- A booking can move **forward** via single allowed transitions only.
- “ARRIVING” is a one-time event; UI locks it after activation.
- Every transition writes an audit event.

### 7.2 Resource status

- `FREE` | `BUSY` | `CLEANING` | `MAINTENANCE`

Rules:
- Resource status changes are state-based (no repeated toggles).
- Status changes are logged.

---

## 8) RBAC UX (Strict Role Separation)

User roles (target):
- Owner
- Cashier/Receptionist (POS only)
- Staff (queue only)
- Stock manager (inventory only)

UX rules:
- **No role confusion:** navigation only shows what you can access.
- Owners go directly to dashboard after login (no profile landing).
- “Unauthorized” is explicit and calm (no scary tone).

---

## 9) Audit Trail (UX implications)

Every state-changing action must capture:
- Who did it
- When
- From which status → to which status
- Optional reason (required for cancellations/refunds/manual overrides)

UI rules:
- Every critical entity screen has a “Timeline / Activity” tab.
- Use `luna-table` + `luna-badge` for history rows.

