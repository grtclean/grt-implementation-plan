/**
 * 项目知识库问答 — Conversational RAG Q&A
 * Phase D: AI项目智能
 */
import { useState, useRef, useEffect } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  MessageSquare, Send, Sparkles, BookOpen, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ title: string; category: string; matchScore: number }>;
}

const SUGGESTED_QUESTIONS = [
  "喷嘴如何选型？",
  "VDA19.1标准要求？",
  "IC-2000项目经验？",
  "超声波清洗频率如何选择？",
  "真空干燥最佳实践？",
  "BOM检查要点有哪些？",
];

export default function ProjectKnowledgeQA() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const askMutation = trpc.projectIntelligence.askKnowledge.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
        },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("projects.knowledge.aiUnavailable") },
      ]);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (question?: string) => {
    const q = question || input.trim();
    if (!q || askMutation.isPending) return;

    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setInput("");

    const history = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    askMutation.mutate({ question: q, history });
  };

  const toggleSources = (idx: number) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const categoryLabel: Record<string, string> = {
    technical: t("projects.knowledge.catTechnical"),
    process: t("projects.knowledge.catProcess"),
    material: t("projects.knowledge.catMaterial"),
    standard: t("projects.knowledge.catStandard"),
    case_study: t("projects.knowledge.catCaseStudy"),
    faq: t("projects.knowledge.catFAQ"),
  };

  return (
      <div className="flex flex-col h-[calc(100vh-4rem)] p-6">
        <PageHeader
          icon={MessageSquare}
          title={t("projects.knowledge.title")}
          description={t("projects.knowledge.description")}
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("projects.knowledge.ragEnhanced")}
            </Badge>
          }
        />

        <div className="flex-1 flex gap-4 mt-4 min-h-0">
          {/* Chat area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Messages */}
            <Card className="flex-1 overflow-hidden">
              <CardContent className="h-full overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageSquare className="h-16 w-16 mb-4 opacity-30" />
                    <p className="text-lg font-medium mb-2">{t("projects.knowledge.askKnowledgeBase")}</p>
                    <p className="text-sm">{t("projects.knowledge.inputHintOrClick")}</p>
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2">
                          <button
                            onClick={() => toggleSources(idx)}
                            className="flex items-center gap-1 text-xs opacity-70 hover:opacity-100"
                          >
                            <BookOpen className="h-3 w-3" />
                            {t("projects.knowledge.citeSources")} ({msg.sources.length})
                            {expandedSources.has(idx) ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>
                          {expandedSources.has(idx) && (
                            <div className="mt-2 space-y-1">
                              {msg.sources.map((src, si) => (
                                <div
                                  key={si}
                                  className="flex items-center gap-2 text-xs p-1.5 rounded bg-background/50"
                                >
                                  <Badge variant="outline" className="text-[10px] px-1">
                                    {categoryLabel[src.category] || src.category}
                                  </Badge>
                                  <span className="truncate">{src.title}</span>
                                  <span className="text-muted-foreground ml-auto flex-shrink-0">
                                    {t("projects.knowledge.match")} {src.matchScore}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {askMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("projects.knowledge.aiThinking")}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </CardContent>
            </Card>

            {/* Input bar */}
            <div className="mt-3 flex gap-2">
              <Input
                placeholder={t("projects.knowledge.inputPlaceholder")}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={askMutation.isPending}
              />
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || askMutation.isPending}
              >
                {askMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Suggested questions sidebar */}
          <div className="w-64 flex-shrink-0 hidden lg:block">
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-medium text-muted-foreground mb-3">{t("projects.knowledge.suggestedQuestions")}</p>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    disabled={askMutation.isPending}
                    className="w-full text-left text-sm p-2 rounded-md hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}
