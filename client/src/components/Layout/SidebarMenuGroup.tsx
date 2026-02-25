import { memo } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { MenuGroup } from "@/config/menuConfig";

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
  const getGroupName = () => {
    switch (language) {
      case "zh": return group.name;
      case "de": return group.nameDe || group.nameEn;
      case "fr": return group.nameFr || group.nameEn;
      default: return group.nameEn;
    }
  };
  const groupName = getGroupName();
  const GroupIcon = group.icon;

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
          {group.items.map((item) => {
            const isActive = activeItemPath === item.path;
            const getItemName = () => {
              switch (language) {
                case "zh": return item.name;
                case "de": return item.nameDe || item.nameEn;
                case "fr": return item.nameFr || item.nameEn;
                default: return item.nameEn;
              }
            };
            const itemName = getItemName();
            const ItemIcon = item.icon;
            const isCompliancePage = item.path === "/compliance-dashboard";

            return (
              <div
                key={item.path}
                className="relative group/item"
                data-menu-path={item.path}
                data-menu-active={isActive ? "true" : "false"}
              >
                <a href={item.path} onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.path);
                }}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 rounded-md transition-colors duration-150 cursor-pointer border border-transparent relative touch-feedback",
                      isActive
                        ? "bg-[#eff6fc] text-[#0078d4]"
                        : "text-[#605e5c] hover:bg-[#f3f2f1] hover:text-[#323130]"
                    )}
                  >
                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-[#0078d4]" />}
                    <ItemIcon className={cn("w-4 h-4", isActive ? "text-[#0078d4]" : "text-[#605e5c] group-hover/item:text-[#323130]")} />
                    <span className="text-sm flex-1">{itemName}</span>
                    {item.isNew && (
                      <span className="px-1 py-0.5 text-[9px] font-bold text-[#0078d4] bg-[#deecf9] rounded leading-none">
                        NEW
                      </span>
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
          })}
        </div>
      )}
    </div>
  );
}

export const SidebarMenuGroup = memo(SidebarMenuGroupImpl);
