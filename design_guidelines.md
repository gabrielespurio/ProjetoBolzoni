# Design Guidelines: Sistema Bolzoni Management Platform

## Design Approach

**Selected Approach:** Enterprise Design System
Drawing from Carbon Design System and Ant Design principles, optimized for data-heavy business applications where clarity, scanability, and operational efficiency are paramount.

**Core Principles:**
- Information hierarchy over visual flair
- Consistent patterns for predictable user experience
- Dense information display without overwhelming users
- Action-oriented interface design

---

## Typography System

**Font Families:**
- Primary: Inter (Google Fonts) - for UI elements, labels, data
- Monospace: JetBrains Mono - for numerical data, IDs, codes

**Hierarchy:**
- Page Titles: text-2xl font-semibold
- Section Headers: text-lg font-semibold
- Card/Module Titles: text-base font-semibold
- Body Text: text-sm font-normal
- Labels: text-xs font-medium uppercase tracking-wide
- Table Headers: text-xs font-semibold uppercase
- Data/Numbers: text-sm font-medium (monospace for financial values)
- Helper Text: text-xs text-opacity-70

---

## Layout System

**Spacing Primitives:**
Use Tailwind units: **2, 4, 6, 8, 12, 16** for consistent rhythm throughout the application.

**Application Shell:**
- Fixed sidebar: w-64 with navigation, company branding at top
- Main content area: ml-64 with full-height scrollable content
- Top header: h-16 fixed, containing breadcrumbs, user profile, notifications
- Content container: max-w-7xl with px-6 py-8
- Mobile: sidebar collapses to overlay drawer

**Grid Patterns:**
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6
- Form layouts: grid-cols-1 md:grid-cols-2 gap-6
- Data tables: full-width with horizontal scroll on mobile
- Detail pages: grid-cols-1 lg:grid-cols-3 (2/3 main content, 1/3 sidebar info)

**Card Structure:**
All data containers use consistent card pattern:
- Border: border border-opacity-20
- Padding: p-6
- Rounded: rounded-lg
- Shadow: shadow-sm
- Spacing between cards: gap-6

---

## Component Library

### Navigation
**Sidebar Navigation:**
- Company logo/branding: h-16 px-4 with border-b
- Navigation items: py-3 px-4 with icon (w-5 h-5) + label
- Active state: left border accent (border-l-4)
- Section dividers: border-t with py-2 text-xs labels
- Icons: Heroicons outline style

**Top Header:**
- Breadcrumb navigation: text-sm with separators
- Right section: notification bell + user avatar dropdown
- Height: h-16 with px-6, border-b

### Dashboard Components
**Metric Cards:**
- Label: text-xs uppercase tracking-wide
- Value: text-3xl font-bold (monospace for currency)
- Change indicator: text-sm with up/down arrow icons
- Trend sparkline (optional): small line chart at bottom
- Structure: p-6 space-y-2

**Data Tables:**
- Striped rows: even row background treatment
- Sticky header: thead with sticky positioning
- Cell padding: px-4 py-3
- Action column: right-aligned with icon buttons
- Row hover state for interactivity
- Pagination: bottom-right with page numbers + prev/next
- Filters: top section with inline filter chips

**Charts/Graphs:**
- Use Chart.js or Recharts library
- Container: aspect-video or h-64
- Legend: positioned top-right or bottom
- Responsive: maintain readability on mobile
- Types needed: line (cash flow), bar (monthly revenue), donut (inventory distribution)

### Forms
**Input Fields:**
- Label: text-sm font-medium mb-2
- Input: h-10 px-4 border rounded-md
- Helper text: text-xs mt-1
- Error states: red border + error message below
- Required indicator: red asterisk after label

**Form Layouts:**
- Grouped sections with section headers
- Two-column grid on desktop, stacked on mobile
- Form actions (submit/cancel): bottom-right, gap-4
- Inline validation with immediate feedback

**Select/Dropdown:**
- Height: h-10 matching inputs
- Custom dropdown with search for long lists
- Multi-select: with tag/chip display

**Date Pickers:**
- Calendar overlay interface
- Range selection for reports/filters
- Time picker for event scheduling

### Buttons
**Primary Actions:**
- Height: h-10 px-6
- Font: text-sm font-medium
- Rounded: rounded-md
- Icons: optional, left-aligned with mr-2

**Button Hierarchy:**
- Primary: solid background (CTAs, submit)
- Secondary: border only (cancel, back)
- Tertiary: text-only (auxiliary actions)
- Icon-only: square (w-10 h-10) for table actions, rounded-full for FABs

### Modals/Overlays
**Modal Structure:**
- Max width: max-w-2xl for forms, max-w-4xl for data views
- Header: text-lg font-semibold with close button
- Body: p-6 with max-h-[70vh] overflow-y-auto
- Footer: border-t with action buttons right-aligned
- Backdrop: semi-transparent overlay

**Confirmation Dialogs:**
- Compact size: max-w-md
- Icon at top (warning/info)
- Clear action buttons

### Status Indicators
**Event Status Tags:**
- Agendado: pill-shaped badge
- Concluído: pill-shaped badge
- Cancelado: pill-shaped badge
- Size: px-3 py-1 text-xs font-medium rounded-full

**Stock Levels:**
- Visual bar indicators for inventory
- Warning states for low stock
- Availability calendar for characters

### Lists & Cards
**Client/Employee Cards:**
- Avatar/icon: w-12 h-12 rounded-full
- Primary info: name as text-base font-semibold
- Secondary info: text-sm with icon prefixes
- Actions: right-aligned icon buttons
- Padding: p-4, gap-4 between items

---

## Page-Specific Layouts

### Dashboard Home
- 4-column metric cards at top
- 2-column layout: upcoming events list (left 2/3) + quick actions/alerts (right 1/3)
- Charts section: 2-column grid with revenue and cash flow charts
- Recent activity feed at bottom

### Event Management
- Calendar view option with monthly grid
- List view: table with filters (date range, status, client)
- Event detail: modal or full page with tabs (details, financials, team, inventory)

### Financial Module
- Summary cards: receivables, payables, balance
- Transaction table with advanced filters
- Date range selector prominently positioned
- Export buttons: top-right (PDF, Excel)

### Inventory
- Grid view for products with thumbnail images
- Character availability: calendar grid showing bookings
- Low stock alerts: prominent banner when applicable
- Entry/exit forms: modal overlays

---

## Responsive Behavior

**Breakpoints:**
- Mobile (< 768px): Single column, stacked layout, hamburger menu
- Tablet (768px - 1024px): Hybrid layout, collapsible sidebar
- Desktop (> 1024px): Full multi-column layouts

**Mobile Optimizations:**
- Tables: horizontal scroll with sticky first column
- Charts: simplified views, stack vertically
- Forms: full-width inputs
- Action buttons: bottom sticky bar for primary actions

---

## Animation & Interactions

**Micro-interactions (minimal, purposeful):**
- Sidebar navigation: smooth slide-in/out
- Dropdown menus: fade + slight scale
- Modals: fade backdrop + scale content
- Success confirmations: brief toast notification (top-right)
- Loading states: skeleton screens for tables, spinner for actions

**Avoid:**
- Decorative animations
- Parallax effects
- Scroll-triggered animations
- Unnecessary transitions

---

## Icons

**Library:** Heroicons (via CDN)
**Usage:**
- Navigation: outline style
- Actions: outline for inactive, solid for active/primary
- Status: solid style in appropriate semantic context
- Consistent sizing: w-5 h-5 for UI elements, w-4 h-4 for inline icons

---

## Images

**Minimal Image Usage:**
This is a business management system - images are functional, not decorative.

**Required Images:**
- Company logo: Bolzoni Produções branding in sidebar header
- User avatars: circular thumbnails in header and user lists
- Character thumbnails: small product images in inventory module (square, 80x80px minimum)

**No hero sections or decorative imagery required** - this is a utility-focused admin panel.