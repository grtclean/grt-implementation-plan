/**
 * HelpColumn - 右侧帮助面板组件
 * 为用户提供上下文相关的帮助内容
 * 自动检测当前路由并显示对应帮助
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  HelpCircle,
  X,
  BookOpen,
  ListChecks,
  MessageCircle,
  ChevronRight,
  Sparkles,
  MapPin,
} from "lucide-react";
import {
  getHelpContent,
  defaultHelpContent,
  type PageHelpContent,
} from "@/config/helpContent";

interface HelpColumnProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAI?: () => void;
}

type HelpTab = "overview" | "steps" | "faq";

export default function HelpColumn({ isOpen, onClose, onOpenAI }: HelpColumnProps) {
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState<HelpTab>("overview");
  const [helpContent, setHelpContent] = useState<PageHelpContent>(defaultHelpContent);

  // 当路由变化时更新帮助内容
  useEffect(() => {
    const content = getHelpContent(location);
    setHelpContent(content || defaultHelpContent);
    setActiveTab("overview");
  }, [location]);

  // F1快捷键（由Layout处理打开/关闭，这里不需要）

  const tabs: { key: HelpTab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "概览", icon: <BookOpen className="w-3.5 h-3.5" /> },
    { key: "steps", label: "操作指南", icon: <ListChecks className="w-3.5 h-3.5" /> },
    { key: "faq", label: "FAQ", icon: <MessageCircle className="w-3.5 h-3.5" /> },
  ];

  return (
    <div
      className={cn(
        "fixed right-0 top-0 h-full w-[380px] bg-card border-l border-border shadow-xl z-40 flex flex-col transition-transform duration-300",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-base">帮助</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* 当前页面指示器 */}
      <div className="px-5 py-3 border-b border-border/50 bg-muted/30 shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">当前页面:</span>
          <span className="font-medium text-primary truncate">
            {helpContent.title}
          </span>
        </div>
        {helpContent.description && (
          <p className="text-xs text-muted-foreground mt-1 ml-5">
            {helpContent.description}
          </p>
        )}
      </div>

      {/* Tab 切换 */}
      <div className="flex px-5 pt-3 gap-1 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
              activeTab === tab.key
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 内容区 */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-5 py-4">
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="bg-muted/40 rounded-lg p-4">
                <p className="text-sm leading-relaxed">
                  {helpContent.overview}
                </p>
              </div>

              {/* 快速入口 */}
              {helpContent.steps.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 text-muted-foreground">
                    快速了解
                  </h3>
                  <div className="space-y-2">
                    {helpContent.steps.slice(0, 3).map((step, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/50 cursor-default"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{step.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {helpContent.steps.length > 3 && (
                    <button
                      onClick={() => setActiveTab("steps")}
                      className="flex items-center gap-1 text-xs text-primary hover:underline mt-2 ml-9"
                    >
                      查看全部 {helpContent.steps.length} 个步骤
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* 常见问题预览 */}
              {helpContent.faq.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 text-muted-foreground">
                    常见问题
                  </h3>
                  {helpContent.faq.slice(0, 2).map((item, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-md bg-accent/30 mb-2"
                    >
                      <p className="text-sm font-medium">{item.question}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.answer}
                      </p>
                    </div>
                  ))}
                  {helpContent.faq.length > 2 && (
                    <button
                      onClick={() => setActiveTab("faq")}
                      className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                    >
                      查看全部 {helpContent.faq.length} 个问题
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "steps" && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                操作指南
              </h3>
              {helpContent.steps.map((step, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
              {helpContent.steps.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <ListChecks className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">暂无操作指南</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "faq" && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                常见问题
              </h3>
              {helpContent.faq.map((item, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border border-border/50 bg-card"
                >
                  <p className="text-sm font-medium flex items-start gap-2">
                    <span className="text-primary shrink-0">Q:</span>
                    {item.question}
                  </p>
                  <Separator className="my-2" />
                  <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
                    <span className="text-green-500 font-medium shrink-0">A:</span>
                    {item.answer}
                  </p>
                </div>
              ))}
              {helpContent.faq.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">暂无常见问题</p>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="shrink-0 px-5 py-4 border-t border-border space-y-2">
        <a
          href="/help"
          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors w-full"
        >
          <BookOpen className="w-4 h-4 text-primary" />
          <span>查看完整帮助中心</span>
          <ChevronRight className="w-3 h-3 ml-auto text-muted-foreground" />
        </a>
        {onOpenAI && (
          <button
            onClick={() => {
              onClose();
              onOpenAI();
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors w-full text-left"
          >
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span>联系AI助手</span>
            <ChevronRight className="w-3 h-3 ml-auto text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}
