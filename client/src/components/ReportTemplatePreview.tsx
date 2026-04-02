/**
 * 报表模板实时预览组件
 * 根据模板配置动态渲染预览效果
 */

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Users,
  FileText,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";

// 报表类型图标映射
const REPORT_TYPE_ICONS: Record<string, any> = {
  summary: FileText,
  funnel: BarChart3,
  trend: TrendingUp,
  source: PieChart,
  performance: Users,
};

// 模拟数据
const MOCK_DATA = {
  summary: {
    total: 156,
    new: 23,
    converted: 12,
    lost: 5,
    conversionRate: 45.2,
    avgValue: 125000,
  },
  funnel: [
    { stage: "线索", count: 156, rate: 100 },
    { stage: "初步接触", count: 98, rate: 62.8 },
    { stage: "需求确认", count: 67, rate: 43.0 },
    { stage: "方案报价", count: 45, rate: 28.8 },
    { stage: "商务谈判", count: 28, rate: 17.9 },
    { stage: "成交", count: 12, rate: 7.7 },
  ],
  trend: [
    { month: "1月", value: 45 },
    { month: "2月", value: 52 },
    { month: "3月", value: 48 },
    { month: "4月", value: 61 },
    { month: "5月", value: 55 },
    { month: "6月", value: 72 },
  ],
  source: [
    { name: "官网", value: 35, color: "#f97316" },
    { name: "展会", value: 25, color: "#10b981" },
    { name: "转介绍", value: 20, color: "#6366f1" },
    { name: "电话", value: 12, color: "#ec4899" },
    { name: "其他", value: 8, color: "#8b5cf6" },
  ],
  performance: [
    { name: "戴晓燕", deals: 8, amount: 1250000, rank: 1 },
    { name: "刘健康", deals: 6, amount: 980000, rank: 2 },
    { name: "冯艳", deals: 5, amount: 750000, rank: 3 },
    { name: "韩保程", deals: 4, amount: 620000, rank: 4 },
    { name: "李柯瑶", deals: 3, amount: 450000, rank: 5 },
  ],
};

interface LayoutSection {
  type: string;
  title: string;
  width: "full" | "half" | "third";
  order: number;
  visible: boolean;
}

interface StylingConfig {
  theme: "light" | "dark" | "professional";
  primaryColor: string;
  showHeader: boolean;
  showFooter: boolean;
  showLogo: boolean;
  logoUrl?: string;
  headerText?: string;
  footerText?: string;
}

interface ReportTemplatePreviewProps {
  layout?: {
    columns: number;
    sections: LayoutSection[];
  };
  styling?: StylingConfig;
  className?: string;
}

export default function ReportTemplatePreview({
  layout,
  styling,
  className = "",
}: ReportTemplatePreviewProps) {
  // 计算主题样式
  const themeStyles = useMemo(() => {
    const theme = styling?.theme || "professional";
    const primaryColor = styling?.primaryColor || "#f97316";
    
    switch (theme) {
      case "light":
        return {
          bg: "bg-white",
          text: "text-gray-900",
          border: "border-gray-200",
          cardBg: "bg-gray-50",
          mutedText: "text-gray-500",
        };
      case "dark":
        return {
          bg: "bg-gray-900",
          text: "text-white",
          border: "border-gray-700",
          cardBg: "bg-gray-800",
          mutedText: "text-gray-400",
        };
      case "professional":
      default:
        return {
          bg: "bg-slate-900",
          text: "text-white",
          border: "border-slate-700",
          cardBg: "bg-slate-800",
          mutedText: "text-slate-400",
        };
    }
  }, [styling?.theme]);

  // 渲染概览卡片
  const renderSummary = () => (
    <div className="grid grid-cols-3 gap-3">
      <div className={`p-3 rounded-lg ${themeStyles.cardBg}`}>
        <div className={`text-xs ${themeStyles.mutedText}`}>商机总数</div>
        <div className={`text-xl font-bold ${themeStyles.text}`}>{MOCK_DATA.summary.total}</div>
        <div className="flex items-center gap-1 text-green-500 text-xs">
          <ArrowUp className="w-3 h-3" />
          +{MOCK_DATA.summary.new} 本月新增
        </div>
      </div>
      <div className={`p-3 rounded-lg ${themeStyles.cardBg}`}>
        <div className={`text-xs ${themeStyles.mutedText}`}>转化率</div>
        <div className={`text-xl font-bold ${themeStyles.text}`}>{MOCK_DATA.summary.conversionRate}%</div>
        <div className="flex items-center gap-1 text-green-500 text-xs">
          <ArrowUp className="w-3 h-3" />
          +2.3% 环比
        </div>
      </div>
      <div className={`p-3 rounded-lg ${themeStyles.cardBg}`}>
        <div className={`text-xs ${themeStyles.mutedText}`}>平均金额</div>
        <div className={`text-xl font-bold ${themeStyles.text}`}>¥{(MOCK_DATA.summary.avgValue / 10000).toFixed(1)}万</div>
        <div className="flex items-center gap-1 text-red-500 text-xs">
          <ArrowDown className="w-3 h-3" />
          -5.2% 环比
        </div>
      </div>
    </div>
  );

  // 渲染漏斗图
  const renderFunnel = () => (
    <div className="space-y-2">
      {MOCK_DATA.funnel.map((item, index) => (
        <div key={item.stage} className="flex items-center gap-2">
          <div className={`w-20 text-xs ${themeStyles.mutedText}`}>{item.stage}</div>
          <div className="flex-1 h-6 bg-slate-700/50 rounded overflow-hidden">
            <div
              className="h-full rounded transition-all duration-300"
              style={{
                width: `${item.rate}%`,
                backgroundColor: styling?.primaryColor || "#f97316",
                opacity: 1 - index * 0.12,
              }}
            />
          </div>
          <div className={`w-16 text-right text-xs ${themeStyles.text}`}>
            {item.count} ({item.rate}%)
          </div>
        </div>
      ))}
    </div>
  );

  // 渲染趋势图
  const renderTrend = () => {
    const maxValue = Math.max(...MOCK_DATA.trend.map(d => d.value));
    return (
      <div className="flex items-end gap-2 h-32">
        {MOCK_DATA.trend.map((item) => (
          <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t transition-all duration-300"
              style={{
                height: `${(item.value / maxValue) * 100}%`,
                backgroundColor: styling?.primaryColor || "#f97316",
              }}
            />
            <div className={`text-xs ${themeStyles.mutedText}`}>{item.month}</div>
          </div>
        ))}
      </div>
    );
  };

  // 渲染来源饼图
  const renderSource = () => (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {MOCK_DATA.source.reduce((acc, item, index) => {
            const total = MOCK_DATA.source.reduce((sum, s) => sum + s.value, 0);
            const startAngle = acc.angle;
            const angle = (item.value / total) * 360;
            const endAngle = startAngle + angle;
            
            const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
            const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
            const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
            const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);
            
            const largeArc = angle > 180 ? 1 : 0;
            
            acc.elements.push(
              <path
                key={item.name}
                d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={item.color}
              />
            );
            acc.angle = endAngle;
            return acc;
          }, { elements: [] as React.ReactElement[], angle: 0 }).elements}
        </svg>
      </div>
      <div className="flex-1 space-y-1">
        {MOCK_DATA.source.map((item) => (
          <div key={item.name} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
            <span className={themeStyles.mutedText}>{item.name}</span>
            <span className={`ml-auto ${themeStyles.text}`}>{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );

  // 渲染业绩排行
  const renderPerformance = () => (
    <div className="space-y-2">
      {MOCK_DATA.performance.map((item) => (
        <div key={item.name} className={`flex items-center gap-3 p-2 rounded ${themeStyles.cardBg}`}>
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              backgroundColor: item.rank <= 3 ? styling?.primaryColor || "#f97316" : "transparent",
              color: item.rank <= 3 ? "white" : themeStyles.mutedText,
            }}
          >
            {item.rank}
          </div>
          <div className={`flex-1 ${themeStyles.text}`}>{item.name}</div>
          <div className={`text-xs ${themeStyles.mutedText}`}>{item.deals}单</div>
          <div className={`text-sm font-medium ${themeStyles.text}`}>
            ¥{(item.amount / 10000).toFixed(0)}万
          </div>
        </div>
      ))}
    </div>
  );

  // 渲染单个区块
  const renderSection = (section: LayoutSection) => {
    const Icon = REPORT_TYPE_ICONS[section.type] || FileText;
    
    let content;
    switch (section.type) {
      case "summary":
        content = renderSummary();
        break;
      case "funnel":
        content = renderFunnel();
        break;
      case "trend":
        content = renderTrend();
        break;
      case "source":
        content = renderSource();
        break;
      case "performance":
        content = renderPerformance();
        break;
      default:
        content = <div className={`text-center py-4 ${themeStyles.mutedText}`}>未知报表类型</div>;
    }

    return (
      <Card
        key={section.type}
        className={`${themeStyles.cardBg} ${themeStyles.border} border ${
          section.width === "full" ? "col-span-full" :
          section.width === "half" ? "col-span-1" :
          "col-span-1"
        }`}
      >
        <CardHeader className="pb-2">
          <CardTitle className={`flex items-center gap-2 text-sm ${themeStyles.text}`}>
            <Icon className="w-4 h-4" style={{ color: styling?.primaryColor }} />
            {section.title}
          </CardTitle>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  };

  // 获取可见的sections并排序
  const visibleSections = useMemo(() => {
    return (layout?.sections || [])
      .filter(s => s.visible)
      .sort((a, b) => a.order - b.order);
  }, [layout?.sections]);

  // 计算网格列数
  const gridCols = layout?.columns || 2;

  return (
    <div className={`rounded-lg overflow-hidden ${themeStyles.bg} ${className}`}>
      {/* 页眉 */}
      {styling?.showHeader && (
        <div
          className="px-4 py-3 border-b"
          style={{
            borderColor: styling?.primaryColor || "#f97316",
            backgroundColor: `${styling?.primaryColor || "#f97316"}15`,
          }}
        >
          <div className="flex items-center gap-3">
            {styling?.showLogo && (
              <div
                className="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: styling?.primaryColor || "#f97316" }}
              >
                GRT
              </div>
            )}
            <div>
              <div className={`font-medium ${themeStyles.text}`}>
                {styling?.headerText || "分析报表"}
              </div>
              <div className={`text-xs ${themeStyles.mutedText}`}>
                生成时间: {new Date().toLocaleString("zh-CN")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 内容区域 */}
      <div className="p-4">
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
          }}
        >
          {visibleSections.map(section => renderSection(section))}
        </div>
      </div>

      {/* 页脚 */}
      {styling?.showFooter && (
        <div
          className={`px-4 py-2 text-center text-xs ${themeStyles.mutedText} border-t ${themeStyles.border}`}
        >
          {styling?.footerText || "本报表由系统自动生成"}
        </div>
      )}
    </div>
  );
}
