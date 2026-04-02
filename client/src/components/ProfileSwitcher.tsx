import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useUserProfile,
  UserRole,
  ROLE_CONFIGS,
  ROLE_HIERARCHY,
} from "@/contexts/UserProfileContext";
import { DEFAULT_BUSINESS_UNITS } from "../../../shared/bu-tx-types";
import {
  Shield,
  Users,
  User,
  ChevronDown,
  Check,
  Eye,
  Loader2,
  Building2,
  Crown,
  FolderKanban,
  TrendingUp,
  Cog,
  Zap,
  ShoppingCart,
  Headphones,
  UserCheck,
  UserCog,
  UserPlus,
  Landmark,
  Calculator,
  HardHat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

// 角色图标映射 - 扩展版
const RoleIcon: Record<UserRole, React.ComponentType<{ className?: string }>> = {
  admin: Shield,
  ceo: Crown,
  cto: Crown,
  cfo: Crown,
  director: Crown,
  hr_director: Crown,
  bu_gm: Building2,
  bu_pm: FolderKanban,
  bu_sales: TrendingUp,
  bu_mech: Cog,
  bu_elec: Zap,
  procurement_eng: ShoppingCart,
  cs_engineer: Headphones,
  quality_eng: Cog,
  dept_manager: Users,
  team_lead: UserCheck,
  hr_manager: UserCog,
  hr_specialist: UserPlus,
  finance_manager: Landmark,
  finance_specialist: Calculator,
  employee: User,
  production_worker: HardHat,
  customer: Users,
  guest: Eye,
};

// 按类别分组的角色选项 — uses i18n keys resolved at render time
interface RoleGroup {
  labelKey: string;
  roles: { role: UserRole; labelKey: string }[];
}

const ROLE_GROUPS: RoleGroup[] = [
  {
    labelKey: "common.roleGroup.system",
    roles: [
      { role: "admin", labelKey: "common.role.admin" },
      { role: "ceo", labelKey: "common.role.ceo" },
      { role: "cto", labelKey: "common.role.cto" },
      { role: "cfo", labelKey: "common.role.cfo" },
      { role: "director", labelKey: "common.role.director" },
      { role: "hr_director", labelKey: "common.role.hr_director" },
    ],
  },
  {
    labelKey: "common.roleGroup.bu",
    roles: [
      { role: "bu_gm", labelKey: "common.role.bu_gm" },
      { role: "bu_pm", labelKey: "common.role.bu_pm" },
      { role: "bu_sales", labelKey: "common.role.bu_sales" },
      { role: "bu_mech", labelKey: "common.role.bu_mech" },
      { role: "bu_elec", labelKey: "common.role.bu_elec" },
      { role: "procurement_eng", labelKey: "common.role.procurement_eng" },
      { role: "cs_engineer", labelKey: "common.role.cs_engineer" },
      { role: "quality_eng", labelKey: "common.role.quality_eng" },
    ],
  },
  {
    labelKey: "common.roleGroup.dept",
    roles: [
      { role: "dept_manager", labelKey: "common.role.dept_manager" },
      { role: "team_lead", labelKey: "common.role.team_lead" },
    ],
  },
  {
    labelKey: "common.roleGroup.function",
    roles: [
      { role: "hr_manager", labelKey: "common.role.hr_manager" },
      { role: "hr_specialist", labelKey: "common.role.hr_specialist" },
      { role: "finance_manager", labelKey: "common.role.finance_manager" },
      { role: "finance_specialist", labelKey: "common.role.finance_specialist" },
    ],
  },
  {
    labelKey: "common.roleGroup.basic",
    roles: [
      { role: "employee", labelKey: "common.role.employee" },
      { role: "production_worker", labelKey: "common.role.production_worker" },
    ],
  },
];

interface ProfileSwitcherProps {
  className?: string;
  compact?: boolean;
}

export function ProfileSwitcher({ className, compact = false }: ProfileSwitcherProps) {
  const {
    currentUserRole,
    currentBU,
    roleConfig,
    dataScope,
    isRoleSwitching,
    maxLevel,
    switchRole,
    switchBU,
  } = useUserProfile();
  const { t } = useLanguage();

  const CurrentIcon = RoleIcon[currentUserRole] || User;

  // BU选项
  const buOptions = DEFAULT_BUSINESS_UNITS.filter(bu => bu.isActive);
  const currentBUName = buOptions.find(bu => bu.code === currentBU)?.name;
  // 是否是BU相关角色（需要显示BU选择）
  const isBURole = ["bu_gm", "bu_pm", "bu_sales", "bu_mech", "bu_elec", "procurement_eng", "cs_engineer"].includes(currentUserRole);

  return (
    <div className="space-y-2">
      {/* BU切换器 - 仅BU角色或高级角色显示 */}
      {(isBURole || ROLE_HIERARCHY[currentUserRole] >= 5) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-full justify-start gap-2 h-8 text-xs",
                "border-sidebar-border bg-sidebar hover:bg-sidebar-accent",
                currentBU ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span className="flex-1 text-left truncate">
                {currentBUName || t("common.bu.selectBU")}
              </span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-60" sideOffset={4}>
            <DropdownMenuLabel className="text-xs">{t("common.bu.switchBU")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ROLE_HIERARCHY[currentUserRole] >= 5 && (
              <>
                <DropdownMenuItem
                  onClick={() => switchBU(null)}
                  className={cn("cursor-pointer", !currentBU && "bg-accent")}
                >
                  <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{t("common.bu.allBU")}</span>
                  {!currentBU && <Check className="h-3 w-3 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {buOptions.map(bu => (
              <DropdownMenuItem
                key={bu.code}
                onClick={() => switchBU(bu.code)}
                className={cn("cursor-pointer", currentBU === bu.code && "bg-accent")}
              >
                <span className="flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-primary text-xs font-bold mr-2">
                  {bu.code.replace("BU", "")}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{bu.name}</div>
                </div>
                {currentBU === bu.code && <Check className="h-3 w-3 ml-auto text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* 角色切换器 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-2 px-2 py-1.5 h-auto",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "transition-colors duration-200",
              className
            )}
            disabled={isRoleSwitching}
          >
            {isRoleSwitching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <div
                className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-md",
                  roleConfig.color,
                  "text-white"
                )}
              >
                <CurrentIcon className="h-3.5 w-3.5" />
              </div>
            )}

            {!compact && (
              <>
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span className="text-xs font-medium truncate">
                    {t(`common.role.${currentUserRole}`)}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {roleConfig.labelEn} · {dataScope}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          side="top"
          className="w-72 max-h-96 overflow-y-auto"
          sideOffset={8}
        >
          <DropdownMenuLabel className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span>{t("common.bu.switchRole")}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {ROLE_GROUPS.map((group) => {
            // 只显示用户 maxLevel 范围内的角色
            const allowedRoles = group.roles.filter(
              ({ role }) => ROLE_HIERARCHY[role] <= maxLevel
            );
            if (allowedRoles.length === 0) return null;

            return (
              <React.Fragment key={group.labelKey}>
                <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground tracking-wider py-1">
                  {t(group.labelKey)}
                </DropdownMenuLabel>
                {allowedRoles.map(({ role, labelKey }) => {
                  const Icon = RoleIcon[role] || User;
                  const config = ROLE_CONFIGS[role];
                  const isActive = currentUserRole === role;

                  return (
                    <DropdownMenuItem
                      key={role}
                      onClick={() => switchRole(role)}
                      className={cn(
                        "flex items-center gap-2 py-1.5 cursor-pointer",
                        isActive && "bg-accent"
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-center w-6 h-6 rounded-md",
                          config.color,
                          "text-white"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm">{t(labelKey)}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">L{config.level}</span>
                      {isActive && <Check className="h-3 w-3 text-primary" />}
                    </DropdownMenuItem>
                  );
                })}
              </React.Fragment>
            );
          })}

          <DropdownMenuSeparator />
          <div className="px-2 py-2">
            <p className="text-xs text-muted-foreground">
              {t("common.bu.current")} <Badge variant="outline" className="ml-1">{t(`common.role.${currentUserRole}`)}</Badge>
              {currentBU && (
                <Badge variant="secondary" className="ml-1">{currentBU}</Badge>
              )}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {t("common.bu.dataScope")} {dataScope} · {roleConfig.description}
            </p>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default ProfileSwitcher;
