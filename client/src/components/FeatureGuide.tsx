/**
 * 功能引导组件
 * 为新功能提供首次使用引导提示
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Lightbulb,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Sparkles,
  FileText,
  History,
  Bell,
  Wand2,
  Share2,
  BarChart3,
} from "lucide-react";

interface GuideStep {
  title: string;
  description: string;
  icon?: React.ReactNode;
  tips?: string[];
}

interface FeatureGuideProps {
  featureKey?: string;
  featureId?: string; // alias for featureKey
  featureName?: string;
  title?: string; // alias for featureName
  description?: string;
  steps?: GuideStep[];
  features?: string[]; // simple feature list
  onComplete?: () => void;
}

// 本地存储键前缀
const GUIDE_STORAGE_PREFIX = "grt_feature_guide_";

/**
 * 检查功能引导是否已完成
 */
export function isGuideCompleted(featureKey: string): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(`${GUIDE_STORAGE_PREFIX}${featureKey}`) === "completed";
}

/**
 * 标记功能引导为已完成
 */
export function markGuideCompleted(featureKey: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${GUIDE_STORAGE_PREFIX}${featureKey}`, "completed");
}

/**
 * 重置功能引导状态
 */
export function resetGuide(featureKey: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${GUIDE_STORAGE_PREFIX}${featureKey}`);
}

/**
 * 功能引导对话框组件
 */
export function FeatureGuideDialog({
  featureKey,
  featureId,
  featureName,
  title,
  description,
  steps = [],
  features = [],
  onComplete,
}: FeatureGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // 支持featureId作为featureKey的别名
  const actualFeatureKey = featureKey || featureId || 'default';
  // 支持title作为featureName的别名
  const actualFeatureName = featureName || title || '功能引导';
  
  // 如果提供了features数组，转换为steps格式
  const actualSteps: GuideStep[] = steps.length > 0 ? steps : features.map((feature, index) => ({
    title: `功能 ${index + 1}`,
    description: feature,
    icon: <Lightbulb className="w-5 h-5" />,
  }));

  useEffect(() => {
    // 检查是否需要显示引导
    if (actualSteps.length > 0 && !isGuideCompleted(actualFeatureKey)) {
      setIsOpen(true);
    }
  }, [actualFeatureKey, actualSteps.length]);

  // 如果没有steps，不渲染任何内容
  if (actualSteps.length === 0) {
    return null;
  }

  const handleNext = () => {
    if (currentStep < actualSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    markGuideCompleted(actualFeatureKey);
    setIsOpen(false);
    onComplete?.();
  };

  const handleSkip = () => {
    markGuideCompleted(actualFeatureKey);
    setIsOpen(false);
  };

  const progress = ((currentStep + 1) / actualSteps.length) * 100;
  const currentStepData = actualSteps[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg mx-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="w-3 h-3" />
              新功能
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              跳过引导
            </Button>
          </div>
          <DialogTitle className="flex items-center gap-2 mt-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            {actualFeatureName}
          </DialogTitle>
          <DialogDescription>
            步骤 {currentStep + 1} / {actualSteps.length}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Progress value={progress} className="h-1" />

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {currentStepData.icon}
                </div>
                <CardTitle className="text-lg">{currentStepData.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{currentStepData.description}</p>
              {currentStepData.tips && currentStepData.tips.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">💡 小贴士：</p>
                  <ul className="space-y-1">
                    {currentStepData.tips.map((tip, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            上一步
          </Button>
          <Button onClick={handleNext}>
            {currentStep === actualSteps.length - 1 ? (
              <>
                开始使用
                <CheckCircle2 className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                下一步
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 功能提示卡片组件
 */
export function FeatureTipCard({
  title,
  description,
  icon,
  onDismiss,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onDismiss?: () => void;
}) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm mb-1">{title}</h4>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0"
            onClick={() => {
              setIsVisible(false);
              onDismiss?.();
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ 预定义的功能引导配置 ============

/**
 * 报表模板功能引导
 */
export const reportTemplateGuideSteps: GuideStep[] = [
  {
    title: "创建自定义报表模板",
    description: "您可以创建自定义的报表模板，选择需要包含的报表类型和布局方式。",
    icon: <FileText className="w-5 h-5" />,
    tips: [
      "支持漏斗、趋势、来源、业绩、概览五种报表类型",
      "可以自由组合多个报表类型",
    ],
  },
  {
    title: "配置布局和样式",
    description: "调整报表的布局方式和视觉样式，包括列数、主题颜色等。",
    icon: <BarChart3 className="w-5 h-5" />,
    tips: [
      "支持1-4列布局，适应不同展示需求",
      "提供浅色、深色、专业三种主题风格",
    ],
  },
  {
    title: "实时预览效果",
    description: "在编辑过程中可以实时预览报表效果，确保满足您的需求。",
    icon: <Sparkles className="w-5 h-5" />,
    tips: [
      "切换到预览标签页查看效果",
      "预览会根据您的配置实时更新",
    ],
  },
  {
    title: "分享和导出",
    description: "将您的模板分享给团队成员，或导出为JSON文件备份。",
    icon: <Share2 className="w-5 h-5" />,
    tips: [
      "支持JSON格式导出导入",
      "可以发布到公共模板库供团队使用",
    ],
  },
];

/**
 * 导入历史功能引导
 */
export const importHistoryGuideSteps: GuideStep[] = [
  {
    title: "查看导入记录",
    description: "所有的数据导入操作都会被记录，您可以随时查看历史导入详情。",
    icon: <History className="w-5 h-5" />,
    tips: [
      "记录包含导入时间、文件名、结果统计",
      "可以查看每次导入的成功/失败/跳过数量",
    ],
  },
  {
    title: "查看错误详情",
    description: "如果导入过程中有失败的记录，可以查看详细的错误信息。",
    icon: <FileText className="w-5 h-5" />,
    tips: [
      "点击记录可展开查看错误日志",
      "错误信息包含具体的行号和原因",
    ],
  },
  {
    title: "回滚导入数据",
    description: "如果发现导入的数据有问题，可以一键回滚删除该批次的所有数据。",
    icon: <Wand2 className="w-5 h-5" />,
    tips: [
      "回滚操作会删除该次导入的所有记录",
      "回滚前请确认是否真的需要删除",
    ],
  },
];

/**
 * 告警规则功能引导
 */
export const alertRuleGuideSteps: GuideStep[] = [
  {
    title: "创建告警规则",
    description: "设置告警规则，当任务执行出现异常时自动触发通知。",
    icon: <Bell className="w-5 h-5" />,
    tips: [
      "支持连续失败、执行超时、错误率三种告警类型",
      "可以为不同任务设置不同的告警阈值",
    ],
  },
  {
    title: "配置通知渠道",
    description: "选择告警通知的发送方式，支持多种渠道同时通知。",
    icon: <Share2 className="w-5 h-5" />,
    tips: [
      "支持系统通知、邮件、Webhook、企业微信",
      "可以测试通知渠道是否配置正确",
    ],
  },
  {
    title: "查看告警历史",
    description: "查看所有触发的告警记录，了解系统运行状况。",
    icon: <History className="w-5 h-5" />,
    tips: [
      "告警记录包含触发时间、规则名称、告警内容",
      "可以确认告警已处理",
    ],
  },
];

/**
 * 智能映射功能引导
 */
export const smartMappingGuideSteps: GuideStep[] = [
  {
    title: "智能字段映射",
    description: "系统会自动分析源文件字段，智能推荐与目标字段的映射关系。",
    icon: <Wand2 className="w-5 h-5" />,
    tips: [
      "基于字段名称相似度自动匹配",
      "会参考历史映射记录提高准确率",
    ],
  },
  {
    title: "批量应用推荐",
    description: "一键应用所有高置信度的映射推荐，快速完成字段配置。",
    icon: <Sparkles className="w-5 h-5" />,
    tips: [
      "只应用置信度超过70%的推荐",
      "应用后仍可手动调整单个映射",
    ],
  },
  {
    title: "保存映射配置",
    description: "将常用的映射配置保存为模板，下次导入时一键加载。",
    icon: <FileText className="w-5 h-5" />,
    tips: [
      "可以为不同数据源保存不同的配置",
      "支持设置默认配置自动加载",
    ],
  },
];

export default FeatureGuideDialog;
