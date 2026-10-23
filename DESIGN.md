---
name: Precision Scheduler
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464555'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#005338'
  on-tertiary: '#ffffff'
  tertiary-container: '#006e4c'
  on-tertiary-container: '#7df1bd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#85f8c4'
  tertiary-fixed-dim: '#68dba9'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.025em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.005em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  numeric-mono:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: -0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system is engineered for structured collaboration, temporal clarity, and effortless coordination. It balances utilitarian productivity with an executive, modern finish. Designed for club administrators, event organizers, and committee leads, the interface eliminates cognitive clutter to accelerate scheduling decisions.

The aesthetic philosophy centers on **Modern Structural Precision**:
- **Utilitarian Elegance**: Density without chaos. Data-dense schedule grids coexist with generous macro-margins.
- **Architectural Framing**: Crisp 1px structural dividing lines segment distinct spatial zones, drawing inspiration from architectural drafts and Swiss design.
- **Calm Authority**: The canvas remains cool, tranquil, and neutral, allowing colored status tags and live availability blocks to command focus instantly.

## Colors

The palette is tuned for information architecture and rapid visual parsing:

- **Primary (`#4f46e5` - Indigo)**: Used strictly for primary calls-to-action, active date selections, and primary user availability blocks.
- **Secondary (`#0d9488` - Teal)**: Represents collaborative multi-user consensus, synchronized calendar feeds, and confirmed event states.
- **Tertiary (`#059669` - Emerald)**: Signifies optimal overlapping availability, open slots, and success indicators.
- **Neutral (`#64748b` - Slate)**: Dictates the foundational interface framework. Surface backgrounds rest on `#f8fafc` and `#ffffff`, bordered by sharp `#e2e8f0` (slate-200) structural strokes. Typography moves systematically from `#0f172a` (slate-900) for headers to `#64748b` (slate-500) for secondary metadata.
- **Surface Roles**: Canvas `#f8fafc`, Card/Panel Surface `#ffffff`, Muted Grid Track `#f1f5f9`.

## Typography

Inter powers all typographical hierarchies to guarantee systematic legibility across complex time-matrix layouts.

- **Tabular Numerics**: For calendar time axes, countdowns, attendee counters, and 30-minute interval markers, enable `font-variant-numeric: tabular-nums` or `tnum` to maintain vertical decimal alignment across multi-column views.
- **Tight Headings**: Display and headline styles use negative tracking (-0.01em to -0.025em) to maintain visual compactness in tight productivity dashboards.
- **Micro Labels**: Sub-12px text (e.g., `label-sm`) must always use uppercase styling with expanded tracking (`+0.04em`) and medium/semibold weights to ensure readability on grid axes.

## Layout & Spacing

The layout is built upon a hybrid responsive structure:

- **Application Shell**: Sticky horizontal command bar (56px tall), paired with an optional collapsible 280px left rail for roster filtering and mini calendar navigation.
- **Main Viewport**: Fluid calendar workspace with horizontal overflow handling for multi-day columns.
- **Calendar Grid Rhythm**:
  - Each 1-hour row measures 48px in height.
  - 30-minute intervals are demarcated by an interior sub-divider stroke of `1px solid #f1f5f9`.
  - Hourly demarcations utilize `1px solid #e2e8f0`.
- **Breakpoints**:
  - Mobile (`< 768px`): Single-day view or vertical agenda view. Margin set to `1rem`. Floating bottom action bar replaces top utility right-rail.
  - Tablet (`768px - 1024px`): 3-day view, collapsible sidebar becomes a drawer.
  - Desktop (`> 1024px`): Full 7-day or custom multi-user heat-map view with persistent sidebar. Margin expanded to `2rem`.

## Elevation & Depth

Visual order is established via **architectural boundary lines and subtle directional micro-shadows**, keeping the interface crisp rather than buoyant.

- **Surface Tiering**:
  - `Base`: Canvas `#f8fafc`.
  - `Panel / Card`: Crisp pure white `#ffffff` with a mandatory border (`1px solid #e2e8f0`).
  - `Interactive Cells / Hover Tracks`: `#f1f5f9`.
- **Depth Hierarchy**:
  - **Level 0 (Flat / Embedded)**: Calendar cells, inputs, inline tables. Rely entirely on borders (`border-slate-200`). No shadow.
  - **Level 1 (Cards, Selectors)**: `box-shadow: 0 1px 2px 0 rgba(15, 23, 42, 0.05)`, framed with `border: 1px solid #e2e8f0`.
  - **Level 2 (Popovers, Context Menus, Flyouts)**: Elevated scheduling detail popovers use `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.05)`, backed by `border: 1px solid #cbd5e1`.
  - **Level 3 (Modal Dialogs)**: Centered meeting setup dialogs use `box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)`, with a backdrop wash of `rgba(15, 23, 42, 0.4)`.

## Shapes

A calibrated **Soft (`1`)** shape language delivers crisp precision while avoiding blunt corners.

- **Base Corner Radius (0.25rem / 4px)**: Checkboxes, badges, tiny indicators, and 30-minute calendar block selections.
- **Medium Corner Radius (0.5rem / 8px)**: Standard buttons, text inputs, dropdown menus, popovers, and segmented controls.
- **Large Corner Radius (0.75rem / 12px)**: Main scheduling panels, modal shells, and standalone dashboard cards.
- **Avatars & Status Dots**: Fully circular (`rounded-full`) to contrast immediately against the geometric rectangularity of the grid.

## Components

### Buttons & Interactive Controls
- **Primary Action**: Solid `#4f46e5`, label `#ffffff`, 8px radius, height 36px (compact) or 40px (standard). On hover: `#4338ca`. Shadow: `0 1px 2px 0 rgba(79, 70, 229, 0.2)`.
- **Secondary / Outlined**: Surface `#ffffff`, border `1px solid #e2e8f0`, label `#334155`. On hover: surface `#f8fafc`, border `#cbd5e1`.
- **Ghost / Icon Action**: Borderless, text `#64748b`, hover background `#f1f5f9`, hover text `#0f172a`.

### Time Slots & Availability Cells
- **Empty Slot**: Background transparent, border bottom `1px solid #f1f5f9` (half-hour) or `#e2e8f0` (hour).
- **Selecting / Dragging**: Outlined with `2px dashed #4f46e5`, background `rgba(79, 70, 229, 0.08)`.
- **Selected (Single User)**: Solid background `rgba(79, 70, 229, 0.15)`, left border `3px solid #4f46e5`, text `#3730a3`.
- **Optimal Group Match**: Background `rgba(5, 150, 105, 0.15)`, left border `3px solid #059669`, text `#065f46`.

### Badges & Status Chips
- **Structure**: Height 20px, 4px corner radius, padding `0 6px`, font `label-sm`.
- **Neutral (Pending)**: Background `#f1f5f9`, text `#475569`, border `1px solid #e2e8f0`.
- **Success (Available)**: Background `#ecfdf5`, text `#047857`, border `1px solid #a7f3d0`.
- **Primary (Organizer)**: Background `#eef2ff`, text `#4338ca`, border `1px solid #c7d2fe`.
- **Warning (Partial Match)**: Background `#fffbeb`, text `#b45309`, border `1px solid #fde68a`.

### Popovers & Slot Inspector
- Rendered with Level 2 elevation, `0.5rem` radius, clean `#ffffff` surface, and `1px solid #cbd5e1`.
- Always displays a quick header featuring the formatted interval (e.g., `10:00 AM – 11:30 AM`), participant availability ratio chip (`4/5 Available`), and stacked micro-avatars.

### Form Inputs & Date Selectors
- Standard height 36px, padding `0 12px`, border `1px solid #cbd5e1`, background `#ffffff`.
- Focus ring: `0 0 0 2px rgba(79, 70, 229, 0.2)`, border `#4f46e5`.
- Integrated suffix icons for calendar triggers and timezone dropdowns.