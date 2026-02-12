/**
 * Transaction (TX) 工序类型选择器组件
 * 支持TX-001到TX-015的工序类型选择
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_TRANSACTION_TYPES, TX_CATEGORIES, type TransactionType, type TXCategory } from "@shared/bu-tx-types";
import { cn } from "@/lib/utils";

interface TXSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showDescription?: boolean;
  filterActive?: boolean;
  filterCategory?: TXCategory;
}

/**
 * TX工序类型选择器组件
 * @param value - 当前选中的TX代码 (TX-001, TX-002, etc.)
 * @param onValueChange - 选择变更回调
 * @param placeholder - 占位文本
 * @param disabled - 是否禁用
 * @param className - 自定义样式类
 * @param showDescription - 是否显示TX描述
 * @param filterActive - 是否只显示激活的TX
 * @param filterCategory - 按类别过滤
 */
export function TXSelector({
  value,
  onValueChange,
  placeholder = "选择工序类型",
  disabled = false,
  className,
  showDescription = false,
  filterActive = true,
  filterCategory,
}: TXSelectorProps) {
  let transactionTypes = filterActive 
    ? DEFAULT_TRANSACTION_TYPES.filter(tx => tx.isActive)
    : DEFAULT_TRANSACTION_TYPES;

  if (filterCategory) {
    transactionTypes = transactionTypes.filter(tx => tx.category === filterCategory);
  }

  // 按类别分组
  const groupedTX = transactionTypes.reduce((acc, tx) => {
    if (!acc[tx.category]) {
      acc[tx.category] = [];
    }
    acc[tx.category].push(tx);
    return acc;
  }, {} as Record<TXCategory, TransactionType[]>);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(groupedTX).map(([category, txList]) => {
          const categoryInfo = TX_CATEGORIES.find(c => c.code === category);
          return (
            <div key={category}>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                {categoryInfo?.name || category}
              </div>
              {txList.map((tx) => (
                <SelectItem key={tx.code} value={tx.code}>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      <span className="text-muted-foreground mr-2">{tx.code}</span>
                      {tx.name}
                    </span>
                    {showDescription && tx.description && (
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {tx.description}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </div>
          );
        })}
      </SelectContent>
    </Select>
  );
}

/**
 * TX徽章组件 - 用于显示TX工序信息
 */
interface TXBadgeProps {
  txCode: string;
  className?: string;
  showFullName?: boolean;
}

export function TXBadge({ txCode, className, showFullName = false }: TXBadgeProps) {
  const tx = DEFAULT_TRANSACTION_TYPES.find(t => t.code === txCode);
  
  if (!tx) {
    return (
      <span className={cn("px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400 border border-gray-500/30", className)}>
        {txCode}
      </span>
    );
  }

  // 根据TX类别设置不同的颜色
  const categoryInfo = TX_CATEGORIES.find(c => c.code === tx.category);
  const colorMap: Record<TXCategory, string> = {
    manufacturing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    assembly: "bg-green-500/20 text-green-400 border-green-500/30",
    testing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    delivery: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    installation: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    other: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };

  const colorClass = colorMap[tx.category] || colorMap.other;

  return (
    <span className={cn("px-2 py-0.5 rounded text-xs border", colorClass, className)}>
      {showFullName ? `${tx.code} - ${tx.name}` : tx.name}
    </span>
  );
}

/**
 * TX类别选择器
 */
interface TXCategorySelectorProps {
  value?: TXCategory;
  onValueChange: (value: TXCategory) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TXCategorySelector({
  value,
  onValueChange,
  placeholder = "选择工序类别",
  disabled = false,
  className,
}: TXCategorySelectorProps) {
  return (
    <Select value={value} onValueChange={onValueChange as (value: string) => void} disabled={disabled}>
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {TX_CATEGORIES.map((category) => (
          <SelectItem key={category.code} value={category.code}>
            <div className="flex items-center gap-2">
              <span className={cn("w-2 h-2 rounded-full", category.color)} />
              <span>{category.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default TXSelector;
