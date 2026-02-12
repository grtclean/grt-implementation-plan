/**
 * Cron表达式可视化编辑器
 * 支持快捷选项和自定义表达式，实时预览下次执行时间
 */

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Calendar, RefreshCw, Check, AlertCircle } from "lucide-react";

// 预设的Cron快捷选项
const CRON_PRESETS = [
  { label: "每分钟", value: "* * * * *", description: "每分钟执行一次" },
  { label: "每5分钟", value: "*/5 * * * *", description: "每5分钟执行一次" },
  { label: "每15分钟", value: "*/15 * * * *", description: "每15分钟执行一次" },
  { label: "每30分钟", value: "*/30 * * * *", description: "每30分钟执行一次" },
  { label: "每小时", value: "0 * * * *", description: "每小时整点执行" },
  { label: "每天9点", value: "0 9 * * *", description: "每天上午9点执行" },
  { label: "每天18点", value: "0 18 * * *", description: "每天下午6点执行" },
  { label: "工作日9点", value: "0 9 * * 1-5", description: "周一至周五上午9点" },
  { label: "每周一9点", value: "0 9 * * 1", description: "每周一上午9点执行" },
  { label: "每月1号9点", value: "0 9 1 * *", description: "每月1号上午9点执行" },
];

// 星期选项
const WEEKDAYS = [
  { value: "0", label: "周日" },
  { value: "1", label: "周一" },
  { value: "2", label: "周二" },
  { value: "3", label: "周三" },
  { value: "4", label: "周四" },
  { value: "5", label: "周五" },
  { value: "6", label: "周六" },
];

interface CronExpressionEditorProps {
  value: string;
  onChange: (value: string) => void;
  showPreview?: boolean;
}

// 解析Cron表达式
function parseCronExpression(cron: string): {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
} {
  const parts = cron.trim().split(/\s+/);
  return {
    minute: parts[0] || "*",
    hour: parts[1] || "*",
    dayOfMonth: parts[2] || "*",
    month: parts[3] || "*",
    dayOfWeek: parts[4] || "*",
  };
}

// 生成Cron表达式
function buildCronExpression(parts: {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}): string {
  return `${parts.minute} ${parts.hour} ${parts.dayOfMonth} ${parts.month} ${parts.dayOfWeek}`;
}

// 验证Cron表达式
function validateCronExpression(cron: string): { valid: boolean; error?: string } {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    return { valid: false, error: "Cron表达式必须包含5个部分" };
  }
  
  const patterns = [
    /^(\*|(\d+|\*)(\/\d+)?|(\d+-\d+)(\/\d+)?|(\d+,)+\d+)$/, // minute
    /^(\*|(\d+|\*)(\/\d+)?|(\d+-\d+)(\/\d+)?|(\d+,)+\d+)$/, // hour
    /^(\*|(\d+|\*)(\/\d+)?|(\d+-\d+)(\/\d+)?|(\d+,)+\d+)$/, // day of month
    /^(\*|(\d+|\*)(\/\d+)?|(\d+-\d+)(\/\d+)?|(\d+,)+\d+)$/, // month
    /^(\*|(\d+|\*)(\/\d+)?|(\d+-\d+)(\/\d+)?|(\d+,)+\d+)$/, // day of week
  ];
  
  for (let i = 0; i < 5; i++) {
    if (!patterns[i].test(parts[i])) {
      const fieldNames = ["分钟", "小时", "日期", "月份", "星期"];
      return { valid: false, error: `${fieldNames[i]}字段格式无效: ${parts[i]}` };
    }
  }
  
  return { valid: true };
}

// 计算下次执行时间
function getNextExecutionTimes(cron: string, count: number = 5): Date[] {
  const validation = validateCronExpression(cron);
  if (!validation.valid) return [];
  
  const parts = parseCronExpression(cron);
  const results: Date[] = [];
  const now = new Date();
  let current = new Date(now);
  current.setSeconds(0);
  current.setMilliseconds(0);
  
  const maxIterations = 10000;
  let iterations = 0;
  
  while (results.length < count && iterations < maxIterations) {
    current = new Date(current.getTime() + 60000); // 加1分钟
    iterations++;
    
    if (matchesCron(current, parts)) {
      results.push(new Date(current));
    }
  }
  
  return results;
}

// 检查时间是否匹配Cron表达式
function matchesCron(date: Date, parts: ReturnType<typeof parseCronExpression>): boolean {
  const minute = date.getMinutes();
  const hour = date.getHours();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1;
  const dayOfWeek = date.getDay();
  
  return (
    matchesCronField(minute, parts.minute, 0, 59) &&
    matchesCronField(hour, parts.hour, 0, 23) &&
    matchesCronField(dayOfMonth, parts.dayOfMonth, 1, 31) &&
    matchesCronField(month, parts.month, 1, 12) &&
    matchesCronField(dayOfWeek, parts.dayOfWeek, 0, 6)
  );
}

// 检查单个字段是否匹配
function matchesCronField(value: number, field: string, min: number, max: number): boolean {
  if (field === "*") return true;
  
  // 处理步长 */n
  if (field.startsWith("*/")) {
    const step = parseInt(field.slice(2));
    return value % step === 0;
  }
  
  // 处理范围 n-m
  if (field.includes("-") && !field.includes(",")) {
    const [start, end] = field.split("-").map(Number);
    return value >= start && value <= end;
  }
  
  // 处理列表 n,m,o
  if (field.includes(",")) {
    const values = field.split(",").map(Number);
    return values.includes(value);
  }
  
  // 单个值
  return parseInt(field) === value;
}

// 生成Cron表达式的人类可读描述
function describeCronExpression(cron: string): string {
  const validation = validateCronExpression(cron);
  if (!validation.valid) return "无效的表达式";
  
  const parts = parseCronExpression(cron);
  const descriptions: string[] = [];
  
  // 分钟
  if (parts.minute === "*") {
    descriptions.push("每分钟");
  } else if (parts.minute.startsWith("*/")) {
    descriptions.push(`每${parts.minute.slice(2)}分钟`);
  } else if (parts.minute === "0") {
    descriptions.push("整点");
  } else {
    descriptions.push(`第${parts.minute}分钟`);
  }
  
  // 小时
  if (parts.hour !== "*") {
    if (parts.hour.includes("-")) {
      const [start, end] = parts.hour.split("-");
      descriptions.push(`${start}点到${end}点`);
    } else {
      descriptions.push(`${parts.hour}点`);
    }
  }
  
  // 星期
  if (parts.dayOfWeek !== "*") {
    if (parts.dayOfWeek === "1-5") {
      descriptions.push("工作日");
    } else if (parts.dayOfWeek === "0,6") {
      descriptions.push("周末");
    } else {
      const days = parts.dayOfWeek.split(",").map(d => WEEKDAYS.find(w => w.value === d)?.label || d);
      descriptions.push(days.join("、"));
    }
  }
  
  // 日期
  if (parts.dayOfMonth !== "*") {
    descriptions.push(`每月${parts.dayOfMonth}号`);
  }
  
  return descriptions.join(" ") || "自定义时间";
}

export default function CronExpressionEditor({
  value,
  onChange,
  showPreview = true,
}: CronExpressionEditorProps) {
  const [activeTab, setActiveTab] = useState<"preset" | "custom">("preset");
  const [customCron, setCustomCron] = useState(value);
  const [cronParts, setCronParts] = useState(parseCronExpression(value));
  
  // 验证结果
  const validation = useMemo(() => validateCronExpression(customCron), [customCron]);
  
  // 下次执行时间
  const nextExecutions = useMemo(() => {
    return validation.valid ? getNextExecutionTimes(customCron, 5) : [];
  }, [customCron, validation.valid]);
  
  // 表达式描述
  const description = useMemo(() => describeCronExpression(customCron), [customCron]);
  
  // 同步外部值变化
  useEffect(() => {
    setCustomCron(value);
    setCronParts(parseCronExpression(value));
  }, [value]);
  
  // 选择预设
  const handlePresetSelect = (preset: string) => {
    setCustomCron(preset);
    setCronParts(parseCronExpression(preset));
    onChange(preset);
  };
  
  // 更新自定义表达式
  const handleCustomChange = (newCron: string) => {
    setCustomCron(newCron);
    if (validateCronExpression(newCron).valid) {
      setCronParts(parseCronExpression(newCron));
      onChange(newCron);
    }
  };
  
  // 更新单个字段
  const handlePartChange = (field: keyof typeof cronParts, newValue: string) => {
    const newParts = { ...cronParts, [field]: newValue };
    setCronParts(newParts);
    const newCron = buildCronExpression(newParts);
    setCustomCron(newCron);
    onChange(newCron);
  };
  
  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "preset" | "custom")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preset">
            <Clock className="w-4 h-4 mr-2" />
            快捷选项
          </TabsTrigger>
          <TabsTrigger value="custom">
            <Calendar className="w-4 h-4 mr-2" />
            自定义
          </TabsTrigger>
        </TabsList>
        
        {/* 快捷选项 */}
        <TabsContent value="preset" className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {CRON_PRESETS.map((preset) => (
              <Button
                key={preset.value}
                variant={customCron === preset.value ? "default" : "outline"}
                className="justify-start h-auto py-2 px-3"
                onClick={() => handlePresetSelect(preset.value)}
              >
                <div className="text-left">
                  <div className="font-medium">{preset.label}</div>
                  <div className="text-xs text-muted-foreground">{preset.description}</div>
                </div>
                {customCron === preset.value && (
                  <Check className="w-4 h-4 ml-auto" />
                )}
              </Button>
            ))}
          </div>
        </TabsContent>
        
        {/* 自定义表达式 */}
        <TabsContent value="custom" className="space-y-4">
          {/* 直接输入 */}
          <div className="space-y-2">
            <Label>Cron表达式</Label>
            <div className="flex gap-2">
              <Input
                value={customCron}
                onChange={(e) => handleCustomChange(e.target.value)}
                placeholder="* * * * *"
                className={!validation.valid ? "border-red-500" : ""}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCustomChange(value)}
                title="重置"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            {!validation.valid && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {validation.error}
              </p>
            )}
          </div>
          
          {/* 可视化编辑 */}
          <div className="grid grid-cols-5 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">分钟</Label>
              <Select value={cronParts.minute} onValueChange={(v) => handlePartChange("minute", v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="*">每分钟 (*)</SelectItem>
                  <SelectItem value="*/5">每5分钟</SelectItem>
                  <SelectItem value="*/10">每10分钟</SelectItem>
                  <SelectItem value="*/15">每15分钟</SelectItem>
                  <SelectItem value="*/30">每30分钟</SelectItem>
                  <SelectItem value="0">整点 (0)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">小时</Label>
              <Select value={cronParts.hour} onValueChange={(v) => handlePartChange("hour", v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="*">每小时 (*)</SelectItem>
                  <SelectItem value="9">9点</SelectItem>
                  <SelectItem value="12">12点</SelectItem>
                  <SelectItem value="18">18点</SelectItem>
                  <SelectItem value="9-18">9-18点</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">日期</Label>
              <Select value={cronParts.dayOfMonth} onValueChange={(v) => handlePartChange("dayOfMonth", v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="*">每天 (*)</SelectItem>
                  <SelectItem value="1">1号</SelectItem>
                  <SelectItem value="15">15号</SelectItem>
                  <SelectItem value="1,15">1号和15号</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">月份</Label>
              <Select value={cronParts.month} onValueChange={(v) => handlePartChange("month", v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="*">每月 (*)</SelectItem>
                  <SelectItem value="1">1月</SelectItem>
                  <SelectItem value="1,4,7,10">季度首月</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">星期</Label>
              <Select value={cronParts.dayOfWeek} onValueChange={(v) => handlePartChange("dayOfWeek", v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="*">每天 (*)</SelectItem>
                  <SelectItem value="1-5">工作日</SelectItem>
                  <SelectItem value="0,6">周末</SelectItem>
                  <SelectItem value="1">周一</SelectItem>
                  <SelectItem value="5">周五</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* 格式说明 */}
          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
            <p className="font-medium mb-1">格式: 分钟 小时 日期 月份 星期</p>
            <p>* 表示任意值，*/n 表示每n个单位，n-m 表示范围，n,m 表示列表</p>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* 当前表达式和描述 */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
        <div>
          <code className="text-sm font-mono bg-background px-2 py-1 rounded">
            {customCron}
          </code>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        {validation.valid && (
          <Badge className="bg-green-500/20 text-green-400">
            <Check className="w-3 h-3 mr-1" />
            有效
          </Badge>
        )}
      </div>
      
      {/* 下次执行时间预览 */}
      {showPreview && validation.valid && nextExecutions.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm">下次执行时间</Label>
          <div className="space-y-1">
            {nextExecutions.map((time, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Clock className="w-3 h-3" />
                <span>{time.toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  weekday: 'short'
                })}</span>
                {index === 0 && (
                  <Badge variant="outline" className="text-xs">下一次</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
