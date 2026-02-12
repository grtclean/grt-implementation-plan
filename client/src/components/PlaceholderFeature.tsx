/**
 * 占位符功能提示组件
 * 用于标记正在开发中的功能，提供统一的用户体验
 */
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Construction, Wrench } from "lucide-react";
import React, { ReactNode } from "react";

interface PlaceholderButtonProps extends Omit<React.ComponentProps<typeof Button>, 'onClick'> {
  /** 功能名称 */
  featureName: string;
  /** 预计完成时间（可选） */
  estimatedTime?: string;
  /** 按钮内容 */
  children: ReactNode;
  /** 是否显示开发中图标 */
  showIcon?: boolean;
}

/**
 * 占位符按钮 - 点击时显示"功能开发中"提示
 */
export function PlaceholderButton({
  featureName,
  estimatedTime,
  children,
  showIcon = false,
  ...props
}: PlaceholderButtonProps) {
  const { toast } = useToast();

  const handleClick = () => {
    toast({
      title: "功能完善中",
      description: estimatedTime 
        ? `${featureName}功能正在开发中，预计${estimatedTime}上线`
        : `${featureName}功能正在开发完善中，敬请期待`,
    });
  };

  return (
    <Button onClick={handleClick} {...props}>
      {showIcon && <Construction className="w-4 h-4 mr-2" />}
      {children}
    </Button>
  );
}

interface PlaceholderCardProps {
  /** 功能名称 */
  featureName: string;
  /** 功能描述 */
  description?: string;
  /** 预计完成时间 */
  estimatedTime?: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * 占位符卡片 - 用于显示开发中的功能区域
 */
export function PlaceholderCard({
  featureName,
  description,
  estimatedTime,
  className = "",
}: PlaceholderCardProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      <div className="p-4 rounded-full bg-muted mb-4">
        <Wrench className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{featureName}</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        {description || "该功能正在开发完善中，敬请期待"}
      </p>
      {estimatedTime && (
        <p className="text-xs text-muted-foreground mt-2">
          预计上线时间：{estimatedTime}
        </p>
      )}
    </div>
  );
}

/**
 * 使用Toast显示占位符提示的Hook
 */
export function usePlaceholderToast() {
  const { toast } = useToast();

  const showPlaceholder = (featureName: string, estimatedTime?: string) => {
    toast({
      title: "功能完善中",
      description: estimatedTime 
        ? `${featureName}功能正在开发中，预计${estimatedTime}上线`
        : `${featureName}功能正在开发完善中，敬请期待`,
    });
  };

  return { showPlaceholder };
}
