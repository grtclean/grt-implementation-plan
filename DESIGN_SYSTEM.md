# GRT Design System

Reference document for generating visually consistent pages in the GRT system.

---

## Color System

### Theme Variables (OKLCh)

The system uses a dark-first Industrial Precision theme defined in `client/src/index.css`.

| Token | Dark Value | Purpose |
|-------|-----------|---------|
| `--background` | `oklch(0.13 0.02 260)` | Deep navy page background |
| `--foreground` | `oklch(0.92 0.01 260)` | Light grey text |
| `--card` | `oklch(0.17 0.03 260)` | Card surfaces |
| `--primary` | `oklch(0.646 0.222 41.116)` | Safety orange — actions, CTAs |
| `--secondary` | `oklch(0.25 0.03 260)` | Slate blue |
| `--muted` | `oklch(0.25 0.03 260)` | Subdued areas |
| `--muted-foreground` | `oklch(0.6 0.02 260)` | Secondary text |
| `--border` | `oklch(0.3 0.03 260)` | Card/section borders |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Error / danger |

### Status Color Palette

Use the `StatusBadge` component or the `STATUS_COLORS` constant for consistent status indicators.

| Color | Class Pattern | Use For |
|-------|--------------|---------|
| `blue` | `bg-blue-500/20 text-blue-400 border-blue-500/30` | Planning, info |
| `green` | `bg-green-500/20 text-green-400 border-green-500/30` | Active, online |
| `red` | `bg-red-500/20 text-red-400 border-red-500/30` | Error, cancelled |
| `yellow` | `bg-yellow-500/20 text-yellow-400 border-yellow-500/30` | Warning, on-hold |
| `orange` | `bg-orange-500/20 text-orange-400 border-orange-500/30` | High priority |
| `purple` | `bg-purple-500/20 text-purple-400 border-purple-500/30` | Strategic, premium |
| `slate` | `bg-slate-500/20 text-slate-400 border-slate-500/30` | Draft, default |
| `emerald` | `bg-emerald-500/20 text-emerald-400 border-emerald-500/30` | Completed, success |
| `cyan` | `bg-cyan-500/20 text-cyan-400 border-cyan-500/30` | Info, technical |
| `gray` | `bg-gray-500/20 text-gray-400 border-gray-500/30` | Disabled, archived |

---

## Typography

| Element | Font | Class |
|---------|------|-------|
| Headings (h1–h6) | Oswald | `font-heading tracking-tight uppercase` |
| Body text | Inter | `font-sans` (default) |
| Monospace / Codes | JetBrains Mono | `font-mono` |

### Heading Sizes

| Level | Class |
|-------|-------|
| Page title | `text-2xl font-heading font-bold` |
| Section title | `text-lg font-semibold` |
| Card title | `text-base font-semibold` |
| Label | `text-sm text-muted-foreground` |

---

## Layout Conventions

### Page Structure

```tsx
<Layout>
  <div className="space-y-6">
    <PageHeader icon={MyIcon} title="Page Title" description="Description" actions={<Button>Action</Button>} />
    {/* Stats row */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard ... />
    </div>
    {/* Main content */}
    ...
  </div>
</Layout>
```

### Spacing

- Page sections: `space-y-6`
- Card padding: `p-4`
- Grid gaps: `gap-4`
- Component internal gaps: `gap-2` or `gap-3`

### Cards

```tsx
<Card className="bg-card/50 border-border">
  <CardContent className="p-4">...</CardContent>
</Card>
```

- Use `bg-card/50` for translucent card backgrounds
- Use `border-border` for default borders
- Use `hover:border-primary/50 transition-colors` for interactive cards

### Border Radius

System default is `--radius: 0.25rem` (sharp, industrial feel). Use `rounded-sm` for buttons, badges.

---

## Component Catalog

All components are importable from `@/components/grt`:

```tsx
import { PageHeader, StatCard, StatusBadge, SearchBar, DataTable, createStatusColorMap } from "@/components/grt";
```

### PageHeader

Standard page header with icon, title, optional description and action buttons.

```tsx
<PageHeader
  icon={FolderKanban}
  title="项目管理"
  description="管理所有项目的生命周期"
  actions={<Button><Plus className="w-4 h-4 mr-2" />新建</Button>}
/>
```

### StatCard

KPI statistic card for dashboard grids.

```tsx
<StatCard
  icon={TrendingUp}
  label="进行中"
  value={12}
  iconColor="text-green-400"
  iconBg="bg-green-500/10"
  trend={{ value: 5.2, label: "较上月" }}
/>
```

### StatusBadge

Consistent colored badge for status display.

```tsx
<StatusBadge color="green" icon={<CheckCircle2 className="w-3 h-3" />}>
  已完成
</StatusBadge>
```

Use `createStatusColorMap()` for typed enum-to-color mappings:

```tsx
const statusColors = createStatusColorMap({
  draft: "slate",
  active: "green",
  on_hold: "yellow",
  completed: "emerald",
  cancelled: "red",
});
```

### SearchBar

Search input with icon prefix.

```tsx
const [search, setSearch] = useState("");
<SearchBar value={search} onChange={setSearch} placeholder="搜索项目..." />
```

### DataTable

Generic data table with loading skeletons and empty state.

```tsx
import type { Column } from "@/components/grt";

const columns: Column<Project>[] = [
  { key: "name", header: "项目名称", render: (row) => row.name },
  { key: "status", header: "状态", render: (row) => <StatusBadge color={statusColors[row.status]}>{row.status}</StatusBadge> },
];

<DataTable
  columns={columns}
  data={projects}
  isLoading={isLoading}
  emptyIcon={FolderKanban}
  emptyMessage="暂无项目"
  onRowClick={(row) => navigate(`/projects/${row.id}`)}
/>
```

---

## Icon Conventions

- Use `lucide-react` icons exclusively
- Page header icons: `w-6 h-6`
- Stat card icons: `w-5 h-5`
- Badge/inline icons: `w-3 h-3` or `w-4 h-4`
- Color icons via `text-{color}` classes, not `stroke` or `fill`

---

## Shadcn/UI Primitives

54 atomic components are available in `client/src/components/ui/`. Key ones:

| Component | Import Path |
|-----------|------------|
| Button | `@/components/ui/button` |
| Card, CardContent | `@/components/ui/card` |
| Badge | `@/components/ui/badge` |
| Input | `@/components/ui/input` |
| Table, TableRow, ... | `@/components/ui/table` |
| Skeleton | `@/components/ui/skeleton` |
| Dialog, DialogContent, ... | `@/components/ui/dialog` |
| Select, SelectContent, ... | `@/components/ui/select` |
| Tabs, TabsList, ... | `@/components/ui/tabs` |
| Tooltip | `@/components/ui/tooltip` |
