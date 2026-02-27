import { memo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { MenuGroup, MenuSubgroup, MenuItem } from "@/config/menuConfig";

export interface SidebarMenuGroupProps {
  group: MenuGroup;
  isExpanded: boolean;
  hasActiveItem: boolean;
  activeItemPath: string | null;
  language: string;
  currentBU: string | null;
  alertCount: number;
  onToggle: (groupName: string) => void;
  onNavigate: (path: string) => void;
}

/** Resolve display name based on language */
function resolveLabel(item: { name: string; nameEn: string; nameDe?: string; nameFr?: string }, lang: string): string {
  switch (lang) {
    case "zh": return item.name;
    case "de": return item.nameDe || item.nameEn;
    case "fr": return item.nameFr || item.nameEn;
    default: return item.nameEn;
  }
}

/** Render a single menu item */
function MenuItemRow({
  item,
  isActive,
  language,
  currentBU,
  alertCount,
  onNavigate,
  indent = false,
}: {
  item: MenuItem;
  isActive: boolean;
  language: string;
  currentBU: string | null;
  alertCount: number;
  onNavigate: (path: string) => void;
  indent?: boolean;
}) {
  const itemName = resolveLabel(item, language);
  const ItemIcon = item.icon;
  const isCompliancePage = item.path === "/compliance-dashboard";

  return (
    <div
      className="relative group/item"
      data-menu-path={item.path}
      data-menu-active={isActive ? "true" : "false"}
    >
      <a href={item.path} onClick={(e) => { e.preventDefault(); onNavigate(item.path); }}>
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-2 rounded-md transition-colors duration-150 cursor-pointer border border-transparent relative touch-feedback",
            indent && "pl-7",
            isActive
              ? "bg-[#eff6fc] text-[#0078d4]"
              : "text-[#605e5c] hover:bg-[#f3f2f1] hover:text-[#323130]"
          )}
        >
          {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-[#0078d4]" />}
          <ItemIcon className={cn("w-4 h-4", isActive ? "text-[#0078d4]" : "text-[#605e5c] group-hover/item:text-[#323130]")} />
          <span className="text-sm flex-1">{itemName}</span>
          {item.isNew && (
            <span className="px-1 py-0.5 text-[9px] font-bold text-[#0078d4] bg-[#deecf9] rounded leading-none">NEW</span>
          )}
          {item.requiresBU && !currentBU && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title={language === 'zh' ? '请先选择事业部' : 'Select a BU first'} />
          )}
          {isCompliancePage && alertCount > 0 && (
            <span className="flex items-center justify-center min-w-[18px] h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse">
              {alertCount > 99 ? '99+' : alertCount}
            </span>
          )}
        </div>
      </a>
    </div>
  );
}

/** Render a collapsible subgroup (3rd level) */
function SubgroupSection({
  subgroup,
  activeItemPath,
  language,
  currentBU,
  alertCount,
  onNavigate,
}: {
  subgroup: MenuSubgroup;
  activeItemPath: string | null;
  language: string;
  currentBU: string | null;
  alertCount: number;
  onNavigate: (path: string) => void;
}) {
  const hasActive = subgroup.items.some(i => i.path === activeItemPath);
  const [open, setOpen] = useState(hasActive);
  const subLabel = resolveLabel(subgroup, language);
  const SubIcon = subgroup.icon;

  const toggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(v => !v);
  }, []);

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex items-center gap-2 w-full pl-5 pr-3 py-1.5 rounded-md transition-colors text-xs font-semibold tracking-wide cursor-pointer",
          hasActive ? "text-[#0078d4]" : "text-[#8a8886] hover:text-[#323130]"
        )}
      >
        {SubIcon && <SubIcon className="w-3.5 h-3.5" />}
        <span className="flex-1 text-left">{subLabel}</span>
        <span className="text-[10px] text-[#a19f9d] mr-1">{subgroup.items.length}</span>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {open && (
        <div className="space-y-0.5 mt-0.5">
          {subgroup.items.map(item => (
            <MenuItemRow
              key={item.path}
              item={item}
              isActive={activeItemPath === item.path}
              language={language}
              currentBU={currentBU}
              alertCount={alertCount}
              onNavigate={onNavigate}
              indent
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarMenuGroupImpl({
  group,
  isExpanded,
  hasActiveItem,
  activeItemPath,
  language,
  currentBU,
  alertCount,
  onToggle,
  onNavigate,
}: SidebarMenuGroupProps) {
  const groupName = resolveLabel(group, language);
  const GroupIcon = group.icon;
  const hasSubgroups = group.subgroups && group.subgroups.length > 0;

  return (
    <div data-menu-group={group.name}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          const scrollContainer = document.querySelector('nav.overflow-y-auto');
          const scrollTop = scrollContainer?.scrollTop || 0;
          (e.currentTarget as HTMLButtonElement).blur();
          onToggle(group.name);
          requestAnimationFrame(() => {
            if (scrollContainer) {
              scrollContainer.scrollTop = scrollTop;
            }
          });
        }}
        className={cn(
          "flex items-center gap-3 w-full px-4 py-2.5 rounded-md transition-colors duration-150 group cursor-pointer border border-transparent touch-feedback focus:outline-none",
          hasActiveItem
            ? "bg-[#f3f2f1] text-[#323130]"
            : "text-[#605e5c] hover:bg-[#f3f2f1] hover:text-[#323130]"
        )}
      >
        <GroupIcon className={cn("w-5 h-5", hasActiveItem ? "text-[#0078d4]" : "text-[#605e5c] group-hover:text-[#323130]")} />
        <span className="font-medium tracking-wide flex-1 text-left text-sm">{groupName}</span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {isExpanded && (
        <div className="pl-4 space-y-0.5 mt-1">
          {/* Render 3-level subgroups first */}
          {hasSubgroups && group.subgroups!.map(sg => (
            <SubgroupSection
              key={sg.name}
              subgroup={sg}
              activeItemPath={activeItemPath}
              language={language}
              currentBU={currentBU}
              alertCount={alertCount}
              onNavigate={onNavigate}
            />
          ))}
          {/* Render top-level items (not in any subgroup) */}
          {group.items.map((item) => (
            <MenuItemRow
              key={item.path}
              item={item}
              isActive={activeItemPath === item.path}
              language={language}
              currentBU={currentBU}
              alertCount={alertCount}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const SidebarMenuGroup = memo(SidebarMenuGroupImpl);
