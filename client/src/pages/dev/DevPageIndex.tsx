import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  ExternalLink,
  Eye,
  EyeOff,
  Layers,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronRight,
  Monitor,
  AlertCircle,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { menuConfig, type MenuItem, type MenuGroup } from "@/config/menuConfig";

// ── Extract all routes from menuConfig ──────────────────────────────
interface FlatPage {
  path: string;
  name: string;
  nameEn: string;
  group: string;
  groupEn: string;
  subgroup?: string;
  inMenu: true;
  isSandbox?: boolean;
  isNew?: boolean;
  disabled?: boolean;
  allowedRoles?: string[];
  minLevel?: number;
}

function flattenMenu(): FlatPage[] {
  const pages: FlatPage[] = [];
  for (const group of menuConfig) {
    // Direct items
    for (const item of group.items) {
      pages.push({
        path: item.path,
        name: item.name,
        nameEn: item.nameEn,
        group: group.name,
        groupEn: group.nameEn,
        inMenu: true,
        isSandbox: item.isSandbox,
        isNew: item.isNew,
        disabled: item.disabled,
        allowedRoles: item.allowedRoles,
        minLevel: item.minLevel,
      });
    }
    // Subgroup items
    if (group.subgroups) {
      for (const sub of group.subgroups) {
        for (const item of sub.items) {
          pages.push({
            path: item.path,
            name: item.name,
            nameEn: item.nameEn,
            group: group.name,
            groupEn: group.nameEn,
            subgroup: sub.name,
            inMenu: true,
            isSandbox: item.isSandbox,
            isNew: item.isNew,
            disabled: item.disabled,
            allowedRoles: item.allowedRoles ?? sub.allowedRoles,
            minLevel: item.minLevel ?? sub.minLevel,
          });
        }
      }
    }
  }
  return pages;
}

type ViewMode = "grouped" | "flat";
type StatusFilter = "all" | "active" | "new" | "sandbox" | "disabled";

export default function DevPageIndex() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const allPages = useMemo(() => flattenMenu(), []);

  const filtered = useMemo(() => {
    let list = allPages;

    // Status filter
    if (statusFilter === "active") list = list.filter((p) => !p.disabled);
    else if (statusFilter === "new") list = list.filter((p) => p.isNew);
    else if (statusFilter === "sandbox") list = list.filter((p) => p.isSandbox);
    else if (statusFilter === "disabled") list = list.filter((p) => p.disabled);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.nameEn.toLowerCase().includes(q) ||
          p.path.toLowerCase().includes(q) ||
          p.group.toLowerCase().includes(q) ||
          (p.subgroup && p.subgroup.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allPages, search, statusFilter]);

  // Group pages by menu group
  const grouped = useMemo(() => {
    const map = new Map<string, FlatPage[]>();
    for (const p of filtered) {
      const key = p.group;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [filtered]);

  // Stats
  const stats = useMemo(() => {
    const total = allPages.length;
    const active = allPages.filter((p) => !p.disabled).length;
    const newCount = allPages.filter((p) => p.isNew).length;
    const sandboxCount = allPages.filter((p) => p.isSandbox).length;
    const disabledCount = allPages.filter((p) => p.disabled).length;
    const groups = new Set(allPages.map((p) => p.group)).size;
    return { total, active, newCount, sandboxCount, disabledCount, groups };
  }, [allPages]);

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const statusFilters: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "全部", count: stats.total },
    { key: "active", label: "可用", count: stats.active },
    { key: "new", label: "新功能", count: stats.newCount },
    { key: "sandbox", label: "沙盘", count: stats.sandboxCount },
    { key: "disabled", label: "开发中", count: stats.disabledCount },
  ];

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Monitor className="h-6 w-6" />
            开发者页面索引
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            全部 {stats.total} 个菜单页面 · {stats.groups} 个模块组 · 点击即跳转
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grouped" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grouped")}
          >
            <Layers className="h-4 w-4 mr-1" />
            分组
          </Button>
          <Button
            variant={viewMode === "flat" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("flat")}
          >
            <List className="h-4 w-4 mr-1" />
            列表
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-3">
        {statusFilters.map((f) => (
          <Card
            key={f.key}
            className={`cursor-pointer transition-colors ${
              statusFilter === f.key ? "border-primary bg-primary/5" : "hover:border-muted-foreground/30"
            }`}
            onClick={() => setStatusFilter(f.key)}
          >
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{f.count}</div>
              <div className="text-xs text-muted-foreground">{f.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索页面名称、路径、模块..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Results */}
      <ScrollArea className="h-[calc(100vh-320px)]">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>未找到匹配的页面</p>
          </div>
        ) : viewMode === "grouped" ? (
          <div className="space-y-2">
            {Array.from(grouped.entries()).map(([group, pages]) => {
              const isCollapsed = collapsedGroups.has(group);
              const groupEn = pages[0]?.groupEn ?? "";
              return (
                <Card key={group}>
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 rounded-t-lg"
                    onClick={() => toggleGroup(group)}
                  >
                    <div className="flex items-center gap-2">
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      <span className="font-semibold">{group}</span>
                      <span className="text-xs text-muted-foreground">{groupEn}</span>
                      <Badge variant="secondary" className="text-xs">
                        {pages.length}
                      </Badge>
                    </div>
                  </div>
                  {!isCollapsed && (
                    <CardContent className="pt-0 pb-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
                        {pages.map((page) => (
                          <PageItem key={page.path} page={page} onNavigate={navigate} />
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
            {filtered.map((page) => (
              <PageItem key={page.path} page={page} onNavigate={navigate} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function PageItem({
  page,
  onNavigate,
}: {
  page: FlatPage;
  onNavigate: (path: string) => void;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors group ${
        page.disabled
          ? "opacity-50 hover:bg-muted/30"
          : "hover:bg-primary/10"
      }`}
      onClick={() => !page.disabled && onNavigate(page.path)}
      title={page.disabled ? "开发中" : `跳转到 ${page.path}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium truncate">{page.name}</span>
          {page.isNew && (
            <Badge className="text-[10px] px-1 py-0 bg-green-500/20 text-green-700 border-green-300">
              NEW
            </Badge>
          )}
          {page.isSandbox && (
            <Badge className="text-[10px] px-1 py-0 bg-amber-500/20 text-amber-700 border-amber-300">
              SB
            </Badge>
          )}
          {page.disabled && (
            <Badge className="text-[10px] px-1 py-0 bg-red-500/20 text-red-700 border-red-300">
              DEV
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {page.path}
          {page.subgroup && (
            <span className="ml-1 text-muted-foreground/60">· {page.subgroup}</span>
          )}
        </div>
      </div>
      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
    </div>
  );
}
