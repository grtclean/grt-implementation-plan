/**
 * AgentCopilotPanel — Context-aware sandbox AI assistant
 *
 * Provides sandbox-specific guidance based on agentId + sandboxId context.
 * Uses rule-based knowledge engine (no external AI API dependency).
 */
import React, { useState, useCallback, useRef, useEffect } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AgentMessage {
  id: number;
  role: "user" | "agent";
  text: string;
  timestamp: Date;
}

interface AgentCopilotPanelProps {
  agentId: string;
  sandboxId: string;
}

// ── Context-aware response engine ──
const SANDBOX_KNOWLEDGE: Record<string, {
  greeting: string;
  quickActions: string[];
  contextResponses: Array<{ keywords: string[]; response: string }>;
}> = {
  "annual-planning": {
    greeting: "I'm your Annual Planning assistant. I can help with KPI definition, budget analysis, and strategic alignment.\n\nQuick tips:\n• Add KPIs in the \"Data Input\" tab — they auto-save to DB\n• Click \"Submit for AI Analysis\" to get quality scoring\n• Approve in \"Confirmation\" tab to trigger downstream events",
    quickActions: [
      "What categories should my KPIs cover?",
      "How many KPIs is ideal?",
      "What happens when I approve KPIs?",
    ],
    contextResponses: [
      {
        keywords: ["category", "categories", "cover", "missing"],
        response: "A balanced KPI set should cover 7 dimensions:\n\n1. **Revenue** — 营收目标\n2. **Cost** — 成本控制\n3. **Quality** — 质量指标\n4. **Delivery** — 交付效率\n5. **Customer** — 客户满意度\n6. **Employee** — 员工发展\n7. **Innovation** — 创新能力\n\nThe AI analysis will flag any missing categories. For GRT, ensure Innovation and Quality are not overlooked.",
      },
      {
        keywords: ["how many", "ideal", "number", "count"],
        response: "Industry best practice: **8-12 KPIs**.\n\n• <5: Too few — strategic blind spots\n• 5-12: Optimal focus\n• >15: Diluted attention — prioritize top 10\n\nFor GRT's scale (~120 employees, 5 BUs), 8-10 company-level KPIs is ideal, with 3-5 per department.",
      },
      {
        keywords: ["approve", "approval", "confirm", "event", "downstream", "trigger"],
        response: "When you approve KPIs:\n\n1. **DB**: All KPI items → status 'completed'\n2. **Event Bus**: `planning.budget.approved` emitted\n3. **Payroll Sandbox** (②): Receives budget allocation signal\n4. **Project Lifecycle** (⑤): Receives resource budget signal\n5. **Audit Log**: Approval recorded with timestamp + user\n\nThis is a one-way gate — approved KPIs become the baseline for the year.",
      },
      {
        keywords: ["save", "persist", "lost", "exit", "data"],
        response: "KPIs now **auto-save to database** on every add/edit/delete.\n\n• Saved to `annualPlanningItems` table (category='kpi')\n• Linked to active `annualPlanningConfig` for the year\n• You can exit and return — data persists\n• Manual save button available as backup\n• Last save timestamp shown in the status bar",
      },
      {
        keywords: ["analysis", "ai", "score", "grade", "analyze"],
        response: "The AI Analysis engine evaluates your KPIs across 6 dimensions:\n\n1. **Category coverage** — all 7 categories represented?\n2. **Owner assignment** — accountability gaps?\n3. **Calculation methods** — measurement clarity?\n4. **Data source mix** — automation vs manual?\n5. **Review frequency** — monitoring cadence?\n6. **Cross-KPI correlations** — logical consistency?\n\nScore: 0-100 → Grade A-F. Aim for 85+ (Grade A).",
      },
      {
        keywords: ["budget", "target", "revenue", "cost", "profit"],
        response: "For GRT's 2026 planning context:\n\n• Revenue target: Based on project pipeline (GRT-410~454)\n• Cost baseline: Reference 202602 salary data (¥1.03M/month)\n• Headcount: Current 112 employees across 11 departments\n• Investment: New production line + digital transformation\n\nEnsure budget KPIs align with the annualPlans table targets.",
      },
    ],
  },
  "payroll-attendance": {
    greeting: "Payroll & Attendance Agent ready. I can assist with salary calculation, attendance anomaly detection, and compliance checks.",
    quickActions: ["Show payroll cycle steps", "What anomalies to watch for?", "How does perf-link work?"],
    contextResponses: [
      {
        keywords: ["cycle", "steps", "process"],
        response: "Payroll cycle SOP:\n1. Select pay period (monthly)\n2. Verify data completeness (attendance + leave + OT)\n3. Link performance scores (3-tier perf wages)\n4. Trial calculation with comparison\n5. Anomaly detection (±15% variance)\n6. Approval → lock → payment file generation",
      },
    ],
  },
  "production-scheduling": {
    greeting: "Production Scheduling Agent active. I handle BOM work hours, resource planning, labor reporting, and project cost rollup.",
    quickActions: ["Show labor report flow", "How is cost calculated?", "What are the 13 processes?"],
    contextResponses: [
      {
        keywords: ["process", "工序", "13"],
        response: "GRT's 13 manufacturing processes (T1-T15):\n\n5.2 Cutting | 5.3 Welding | 5.4 Machining\n5.5 Assembly | 5.6 Wiring | 5.7 Piping\n5.8 Testing | 5.9 Painting | 6.1 Commissioning\n6.2 Packaging | 6.3 Installation | 6.5 Debugging\n7.2 Final Inspection\n\nEach has planned vs actual hours tracked in scheduling_bom_work_hours.",
      },
    ],
  },
};

// Generic fallback for unknown sandboxes
const FALLBACK_KNOWLEDGE = {
  greeting: "Sandbox Agent ready. I can help you navigate this workspace. Use the SOP steps on the left to progress through the workflow.",
  quickActions: ["What are the SOP steps?", "How do I save my work?", "What events does this sandbox emit?"],
  contextResponses: [] as Array<{ keywords: string[]; response: string }>,
};

function findBestResponse(input: string, sandboxId: string): string {
  const knowledge = SANDBOX_KNOWLEDGE[sandboxId] ?? FALLBACK_KNOWLEDGE;
  const lowerInput = input.toLowerCase();

  for (const cr of knowledge.contextResponses) {
    if (cr.keywords.some(kw => lowerInput.includes(kw))) {
      return cr.response;
    }
  }

  // Generic responses
  if (lowerInput.includes("help") || lowerInput.includes("what can")) {
    return knowledge.greeting;
  }
  if (lowerInput.includes("step") || lowerInput.includes("sop")) {
    return "Use the SOP panel on the left to navigate through each step. Click a step to jump to it. Completed steps show a checkmark.";
  }

  return `I understand your question about "${input.slice(0, 50)}${input.length > 50 ? '...' : ''}". This sandbox workspace supports:\n\n• SOP step navigation (left panel)\n• Data input with auto-save to database\n• AI analysis on submitted data\n• Event bus integration with other sandboxes\n\nTry asking about specific features like "save", "analysis", or "approval".`;
}

export default function AgentCopilotPanel({
  agentId,
  sandboxId,
}: AgentCopilotPanelProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [status, setStatus] = useState<"idle" | "thinking">("idle");
  const idCounter = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const knowledge = SANDBOX_KNOWLEDGE[sandboxId] ?? FALLBACK_KNOWLEDGE;

  // Show greeting on mount
  useEffect(() => {
    const greetingMsg: AgentMessage = {
      id: 0,
      role: "agent",
      text: knowledge.greeting,
      timestamp: new Date(),
    };
    setMessages([greetingMsg]);
  }, [sandboxId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    const userId = idCounter.current;
    const agentMsgId = idCounter.current + 1;
    idCounter.current += 2;

    const userMsg: AgentMessage = {
      id: userId,
      role: "user",
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStatus("thinking");

    // Generate context-aware response
    setTimeout(() => {
      const response = findBestResponse(text, sandboxId);
      const agentMsg: AgentMessage = {
        id: agentMsgId,
        role: "agent",
        text: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMsg]);
      setStatus("idle");
    }, 300 + Math.random() * 400);
  }, [input, sandboxId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleQuickAction = useCallback((text: string) => {
    setInput(text);
    // Trigger send on next tick
    setTimeout(() => {
      const userId = idCounter.current;
      const agentMsgId = idCounter.current + 1;
      idCounter.current += 2;

      setMessages((prev) => [...prev, {
        id: userId,
        role: "user" as const,
        text,
        timestamp: new Date(),
      }]);
      setStatus("thinking");

      setTimeout(() => {
        const response = findBestResponse(text, sandboxId);
        setMessages((prev) => [...prev, {
          id: agentMsgId,
          role: "agent" as const,
          text: response,
          timestamp: new Date(),
        }]);
        setStatus("idle");
      }, 300 + Math.random() * 400);
    }, 50);
    setInput("");
  }, [sandboxId]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Bot className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Agent Copilot</span>
        <span
          className={cn(
            "ml-auto h-2 w-2 rounded-full",
            status === "idle" ? "bg-green-500" : "bg-yellow-400 animate-pulse"
          )}
          title={status === "idle" ? "Ready" : "Thinking..."}
        />
      </div>

      {/* Agent info */}
      <div className="border-b px-3 py-1.5 text-xs text-muted-foreground">
        Agent: <span className="font-mono">{agentId}</span>
      </div>

      {/* Quick actions */}
      {messages.length <= 1 && knowledge.quickActions.length > 0 && (
        <div className="border-b px-3 py-2 space-y-1">
          <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            <Sparkles className="h-3 w-3" /> Quick actions
          </div>
          {knowledge.quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => handleQuickAction(action)}
              className="block w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted/50 text-primary/80 hover:text-primary transition-colors"
            >
              {action}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "rounded-lg px-3 py-2 text-sm",
              msg.role === "user"
                ? "ml-8 bg-primary/10 text-foreground"
                : "mr-4 bg-muted text-foreground"
            )}
          >
            <div className="mb-0.5 text-xs font-medium text-muted-foreground">
              {msg.role === "user" ? "You" : "Agent"}
            </div>
            <div className="whitespace-pre-wrap">{msg.text}</div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t p-2">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask agent..."
            rows={2}
            className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || status === "thinking"}
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
