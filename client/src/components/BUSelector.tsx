/**
 * Business Unit (BU) 选择器组件
 * 支持BU1-BU5的完整业务单元选择
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_BUSINESS_UNITS, type BusinessUnit } from "@shared/bu-tx-types";
import { cn } from "@/lib/utils";

interface BUSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showDescription?: boolean;
  filterActive?: boolean;
}

/**
 * BU选择器组件
 * @param value - 当前选中的BU代码 (BU1, BU2, etc.)
 * @param onValueChange - 选择变更回调
 * @param placeholder - 占位文本
 * @param disabled - 是否禁用
 * @param className - 自定义样式类
 * @param showDescription - 是否显示BU描述
 * @param filterActive - 是否只显示激活的BU
 */
export function BUSelector({
  value,
  onValueChange,
  placeholder = "选择业务单元",
  disabled = false,
  className,
  showDescription = false,
  filterActive = true,
}: BUSelectorProps) {
  const businessUnits = filterActive 
    ? DEFAULT_BUSINESS_UNITS.filter(bu => bu.isActive)
    : DEFAULT_BUSINESS_UNITS;

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {businessUnits.map((bu) => (
          <SelectItem key={bu.code} value={bu.code}>
            <div className="flex flex-col">
              <span className="font-medium">{bu.name}</span>
              {showDescription && bu.description && (
                <span className="text-xs text-muted-foreground line-clamp-1">
                  {bu.description}
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * BU徽章组件 - 用于显示BU信息
 */
interface BUBadgeProps {
  buCode: string;
  className?: string;
  showFullName?: boolean;
}

export function BUBadge({ buCode, className, showFullName = false }: BUBadgeProps) {
  const bu = DEFAULT_BUSINESS_UNITS.find(b => b.code === buCode);
  
  if (!bu) {
    return (
      <span className={cn("px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400 border border-gray-500/30", className)}>
        {buCode}
      </span>
    );
  }

  // 根据BU代码设置不同的颜色
  const colorMap: Record<string, string> = {
    BU1: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    BU2: "bg-green-500/20 text-green-400 border-green-500/30",
    BU3: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    BU4: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    BU5: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  };

  const colorClass = colorMap[buCode] || "bg-gray-500/20 text-gray-400 border-gray-500/30";

  return (
    <span className={cn("px-2 py-0.5 rounded text-xs border", colorClass, className)}>
      {showFullName ? bu.name : buCode}
    </span>
  );
}

export default BUSelector;
