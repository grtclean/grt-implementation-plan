/**
 * Meeting Editor
 * 会议笔记实时编辑界面（使用Tiptap编辑器）
 */

import React, { useEffect, useState, useCallback } from "react";
// @ts-expect-error - @tiptap/react is an optional dependency
import { useEditor, EditorContent } from "@tiptap/react";
// @ts-expect-error - @tiptap/starter-kit is an optional dependency
import StarterKit from "@tiptap/starter-kit";
// @ts-expect-error - @tiptap/extension-placeholder is an optional dependency
import Placeholder from "@tiptap/extension-placeholder";
// @ts-expect-error - @tiptap/extension-link is an optional dependency
import Link from "@tiptap/extension-link";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Save,
  Download,
  Share2,
  Sparkles,
  Users,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface MeetingEditorProps {
  meetingId: string;
}

interface AIInsight {
  id: string;
  insightType: string;
  content: string;
  confidenceScore: number;
}

export default function MeetingEditor({ meetingId }: MeetingEditorProps) {
  const { t } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  // 获取会议详情
  const { data: meeting, isLoading: meetingLoading } = (trpc.meeting as any).get.useQuery({
    id: meetingId,
  });

  // 获取AI洞察
  const { data: insights = [] } = (trpc.meeting as any).getInsights.useQuery({
    meetingId,
  });

  // 更新笔记
  const updateNotesMutation = (trpc.meeting as any).updateNotes.useMutation({
    onSuccess: () => {
      setLastSaved(new Date());
    },
  });

  // 生成AI洞察
  const generateInsightsMutation = (trpc.meeting as any).generateInsights.useMutation({
    onSuccess: () => {
      setIsGeneratingInsights(false);
    },
  });

  // 初始化编辑器
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: t("mi.editor.notesPlaceholder"),
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: meeting?.notes?.content || "",
    onUpdate: ({ editor }: any) => {
      // 自动保存（防抖）
      const content = editor.getJSON();
      handleAutoSave(JSON.stringify(content));
    },
  });

  // 自动保存（防抖）
  const autoSaveTimer = React.useRef<NodeJS.Timeout>(undefined);

  const handleAutoSave = useCallback((content: string) => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await updateNotesMutation.mutateAsync({
          meetingId,
          content,
        });
      } catch (error) {
        console.error("Error saving notes:", error);
      } finally {
        setIsSaving(false);
      }
    }, 1000); // 1秒后保存
  }, [meetingId, updateNotesMutation]);

  // 手动保存
  const handleManualSave = async () => {
    if (!editor) return;

    setIsSaving(true);
    try {
      const content = JSON.stringify(editor.getJSON());
      await updateNotesMutation.mutateAsync({
        meetingId,
        content,
      });
    } catch (error) {
      console.error("Error saving notes:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // 生成AI洞察
  const handleGenerateInsights = async () => {
    setIsGeneratingInsights(true);
    try {
      await generateInsightsMutation.mutateAsync({
        meetingId,
        insightTypes: [
          "summary",
          "action_items",
          "decisions",
          "risks",
          "opportunities",
        ],
      });
    } catch (error) {
      console.error("Error generating insights:", error);
    }
  };

  // 导出笔记
  const handleExport = async (format: "pdf" | "docx" | "markdown") => {
    try {
      // 调用导出API
      const response = await fetch(`/api/meetings/${meetingId}/notes/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `meeting-${meetingId}.${format === "pdf" ? "pdf" : format === "docx" ? "docx" : "md"}`;
        a.click();
      }
    } catch (error) {
      console.error("Error exporting notes:", error);
    }
  };

  if (meetingLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!meeting) {
    return <div className="text-center py-12">{t("mi.editor.meetingNotFound")}</div>;
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="space-y-4">
        <PageHeader
          icon={Save}
          title={meeting.title}
          description={meeting.description}
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSave}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("mi.editor.saving")}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {t("mi.editor.save")}
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateInsights}
                disabled={isGeneratingInsights}
                className="gap-2"
              >
                {isGeneratingInsights ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("mi.editor.generating")}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {t("mi.editor.aiAnalyze")}
                  </>
                )}
              </Button>

              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                {t("mi.editor.export")}
              </Button>

              <Button variant="outline" size="sm" className="gap-2">
                <Share2 className="w-4 h-4" />
                {t("mi.editor.share")}
              </Button>
            </>
          }
        />

        {/* 会议信息 */}
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {format(new Date(meeting.startTime), "PPP HH:mm", {
              locale: zhCN,
            })}
          </div>

          <div>{t("mi.editor.projectPhase")}: {meeting.projectPhase || t("mi.editor.unspecified")}</div>

          {meeting.revenueTarget && (
            <div>{t("mi.editor.revenueTarget")}: ¥{meeting.revenueTarget}M</div>
          )}

          {meeting.profitMargin && (
            <div>{t("mi.editor.profitMargin")}: {meeting.profitMargin}%</div>
          )}

          {lastSaved && (
            <div className="text-xs text-gray-500">
              {t("mi.editor.lastSaved")}: {format(lastSaved, "HH:mm:ss")}
            </div>
          )}
        </div>
      </div>

      {/* 编辑器和洞察 */}
      <Tabs defaultValue="editor" className="w-full">
        <TabsList>
          <TabsTrigger value="editor">{t("mi.editor.noteEditor")}</TabsTrigger>
          <TabsTrigger value="insights">{t("mi.editor.aiInsightsTab")}</TabsTrigger>
          <TabsTrigger value="participants">{t("mi.editor.participantsTab")}</TabsTrigger>
        </TabsList>

        {/* 编辑器标签 */}
        <TabsContent value="editor">
          <Card>
            <CardContent className="pt-6">
              <div className="prose prose-sm max-w-none">
                <EditorContent
                  editor={editor}
                  className="min-h-[500px] p-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI洞察标签 */}
        <TabsContent value="insights">
          <div className="space-y-4">
            {insights.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500 mb-4">{t("mi.editor.noInsights")}</p>
                  <Button onClick={handleGenerateInsights}>
                    {t("mi.editor.generateAiInsights")}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              insights.map((insight: AIInsight) => (
                <Card key={insight.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {getInsightTypeLabel(insight.insightType, t)}
                      </CardTitle>
                      <div className="text-xs text-gray-500">
                        {t("mi.editor.confidence")}: {(insight.confidenceScore * 100).toFixed(0)}%
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <InsightContent
                      type={insight.insightType}
                      content={insight.content}
                      t={t}
                    />
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* 参与者标签 */}
        <TabsContent value="participants">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {t("mi.editor.participants")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {meeting.participants && meeting.participants.length > 0 ? (
                <div className="space-y-2">
                  {meeting.participants.map((participant: any) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded"
                    >
                      <div>
                        <p className="font-medium">{participant.userName}</p>
                        <p className="text-sm text-gray-600">
                          {participant.role}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500">
                        {t("mi.editor.joined")}: {format(new Date(participant.joinedAt), "HH:mm")}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">{t("mi.editor.noParticipants")}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * 获取洞察类型标签
 */
function getInsightTypeLabel(type: string, t: (key: string) => string): string {
  const keyMap: Record<string, string> = {
    summary: "mi.editor.meetingSummary",
    action_items: "mi.editor.actionItemsLabel",
    decisions: "mi.editor.decisionsLabel",
    risks: "mi.editor.risksLabel",
    opportunities: "mi.editor.opportunitiesLabel",
  };
  return keyMap[type] ? t(keyMap[type]) : type;
}

/**
 * 洞察内容渲染组件
 */
function InsightContent({ type, content, t }: { type: string; content: string; t: (key: string) => string }) {
  try {
    const data = JSON.parse(content);

    switch (type) {
      case "summary":
        return <p className="text-gray-700">{data}</p>;

      case "action_items":
        return (
          <ul className="space-y-2">
            {Array.isArray(data) &&
              data.map((item: any, idx: number) => (
                <li key={idx} className="flex gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">{item.task}</p>
                    {item.owner && (
                      <p className="text-sm text-gray-600">{t("mi.editor.owner")}: {item.owner}</p>
                    )}
                    {item.deadline && (
                      <p className="text-sm text-gray-600">
                        {t("mi.editor.deadline")}: {item.deadline}
                      </p>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        );

      case "decisions":
        return (
          <ul className="space-y-2">
            {Array.isArray(data) &&
              data.map((decision: string, idx: number) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>{decision}</span>
                </li>
              ))}
          </ul>
        );

      case "risks":
        return (
          <ul className="space-y-3">
            {Array.isArray(data) &&
              data.map((risk: any, idx: number) => (
                <li key={idx} className="border-l-4 border-red-500 pl-3">
                  <p className="font-medium text-red-700">{risk.risk}</p>
                  <p className="text-sm text-gray-600">
                    {t("mi.editor.mitigation")}: {risk.mitigation}
                  </p>
                </li>
              ))}
          </ul>
        );

      case "opportunities":
        return (
          <ul className="space-y-2">
            {Array.isArray(data) &&
              data.map((opportunity: string, idx: number) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-blue-600 font-bold">→</span>
                  <span>{opportunity}</span>
                </li>
              ))}
          </ul>
        );

      default:
        return <p>{content}</p>;
    }
  } catch (error) {
    return <p>{content}</p>;
  }
}
