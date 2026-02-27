/**
 * SpeakerRadarTab — Voice-print diarization & identity matching UI
 *
 * Features:
 *   - Run voice-print analysis → shows 4 speakers (2 matched, 2 unknown)
 *   - Play synthetic voice snippet (Web Audio 440/520Hz tone)
 *   - Bind unknown speakers to employee/customer profiles
 *   - Fluent Design tokens matching MeetingHub.tsx
 */
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Fingerprint,
  Play,
  UserCheck,
  Loader2,
  CheckCircle2,
  HelpCircle,
  Volume2,
} from "lucide-react";

// ── Fluent tokens (same as MeetingHub.tsx) ──────────────────
const FLUENT_CARD = "#ffffff";
const FLUENT_BORDER = "#e1dfdd";
const FLUENT_ACCENT = "#0078d4";
const FLUENT_SUCCESS = "#107c10";
const FLUENT_WARN = "#ffaa44";
const FLUENT_SUBTLE = "#605e5c";

// ── Types ───────────────────────────────────────────────────
interface Speaker {
  id: number;
  meetingId: number;
  speakerLabel: string;
  matchedProfileId: number | null;
  matchedProfileType: string | null;
  matchedProfileName: string | null;
  voiceSnippetUrl: string | null;
  matchConfidence: string | null;
  firstSpokenAt: string | null;
  speakingDurationSec: number;
}

interface Props {
  meetingId: number;
}

// ── Mock profile options for binding ────────────────────────
const PROFILE_OPTIONS = [
  { id: 10, type: "EMPLOYEE", name: "王经理 (研发部)" },
  { id: 11, type: "EMPLOYEE", name: "刘主管 (生产部)" },
  { id: 12, type: "EMPLOYEE", name: "赵工程师 (质量部)" },
  { id: 301, type: "CUSTOMER", name: "李总 (比亚迪)" },
  { id: 302, type: "CUSTOMER", name: "吴经理 (宁德时代)" },
  { id: 501, type: "EXTERNAL", name: "陈顾问 (麦肯锡)" },
];

export default function SpeakerRadarTab({ meetingId }: Props) {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [bindSelections, setBindSelections] = useState<Record<number, string>>(
    {}
  );
  const [bindingId, setBindingId] = useState<number | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);

  // ── Fetch speakers from backend ─────────────────────────
  const loadSpeakers = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/trpc/smartMeeting.speaker.listByMeeting?input=${encodeURIComponent(
          JSON.stringify({ json: { meetingId } })
        )}`
      );
      const data = await res.json();
      const list = data?.result?.data?.json;
      if (Array.isArray(list)) setSpeakers(list);
    } catch {
      // backend unavailable
    }
  }, [meetingId]);

  // ── Load existing speakers on mount ────────────────────
  useEffect(() => {
    loadSpeakers();
  }, [loadSpeakers]);

  // ── Run analysis ────────────────────────────────────────
  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch(
        "/api/trpc/smartMeeting.speaker.analyze",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ json: { meetingId } }),
        }
      );
      const data = await res.json();
      if (data?.result?.data?.json) {
        // Reload from DB for consistent IDs
        await loadSpeakers();
      }
    } catch {
      // Fallback: use mock data client-side
      const base = new Date();
      base.setHours(14, 0, 0, 0);
      setSpeakers([
        {
          id: -1, meetingId, speakerLabel: "Speaker 1",
          matchedProfileId: 1, matchedProfileType: "EMPLOYEE",
          matchedProfileName: "CEO (张总)", voiceSnippetUrl: null,
          matchConfidence: "0.96", firstSpokenAt: base.toISOString(),
          speakingDurationSec: 1800,
        },
        {
          id: -2, meetingId, speakerLabel: "Speaker 2",
          matchedProfileId: 201, matchedProfileType: "CUSTOMER",
          matchedProfileName: "张总 (华为)", voiceSnippetUrl: null,
          matchConfidence: "0.89",
          firstSpokenAt: new Date(base.getTime() + 2 * 60_000).toISOString(),
          speakingDurationSec: 600,
        },
        {
          id: -3, meetingId, speakerLabel: "Speaker 12",
          matchedProfileId: null, matchedProfileType: null,
          matchedProfileName: null,
          voiceSnippetUrl: `/api/voice-snippets/meeting-${meetingId}-speaker-12.wav`,
          matchConfidence: null,
          firstSpokenAt: new Date(base.getTime() + 5 * 60_000).toISOString(),
          speakingDurationSec: 240,
        },
        {
          id: -4, meetingId, speakerLabel: "Speaker 13",
          matchedProfileId: null, matchedProfileType: null,
          matchedProfileName: null,
          voiceSnippetUrl: `/api/voice-snippets/meeting-${meetingId}-speaker-13.wav`,
          matchConfidence: null,
          firstSpokenAt: new Date(base.getTime() + 8 * 60_000).toISOString(),
          speakingDurationSec: 180,
        },
      ]);
    }
    setAnalyzing(false);
  };

  // ── Play synthetic voice snippet (Web Audio API) ────────
  const playSnippet = (speakerId: number, freq: number) => {
    setPlayingId(speakerId);
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
      setTimeout(() => {
        setPlayingId(null);
        ctx.close();
      }, 600);
    } catch {
      setPlayingId(null);
    }
  };

  // ── Bind profile ────────────────────────────────────────
  const bindProfile = async (speakerId: number) => {
    const selection = bindSelections[speakerId];
    if (!selection) return;
    const profile = PROFILE_OPTIONS.find(
      (p) => `${p.type}:${p.id}` === selection
    );
    if (!profile) return;

    setBindingId(speakerId);
    try {
      await fetch("/api/trpc/smartMeeting.speaker.bindProfile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          json: {
            speakerId,
            profileId: profile.id,
            profileType: profile.type,
            profileName: profile.name,
          },
        }),
      });
    } catch {
      // local-only fallback
    }

    // Optimistic update
    setSpeakers((prev) =>
      prev.map((s) =>
        s.id === speakerId
          ? {
              ...s,
              matchedProfileId: profile.id,
              matchedProfileType: profile.type,
              matchedProfileName: profile.name,
              matchConfidence: "1.00",
              voiceSnippetUrl: null,
            }
          : s
      )
    );
    setBindSelections((prev) => {
      const next = { ...prev };
      delete next[speakerId];
      return next;
    });
    setBindingId(null);
  };

  // ── Derived stats ───────────────────────────────────────
  const matchedCount = speakers.filter((s) => s.matchedProfileId !== null).length;
  const unknownCount = speakers.length - matchedCount;

  const formatDuration = (sec: number) => {
    if (sec >= 3600) return `${Math.floor(sec / 3600)}小时${Math.floor((sec % 3600) / 60)}分钟`;
    return `${Math.floor(sec / 60)}分钟`;
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "--:--";
    return new Date(iso).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const profileTypeBadge = (type: string | null) => {
    if (type === "EMPLOYEE") return { label: "员工", color: FLUENT_ACCENT };
    if (type === "CUSTOMER") return { label: "客户", color: "#8764b8" };
    if (type === "EXTERNAL") return { label: "外部", color: FLUENT_WARN };
    return { label: "未知", color: FLUENT_SUBTLE };
  };

  // ── Empty state ─────────────────────────────────────────
  if (speakers.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: `${FLUENT_ACCENT}10` }}
        >
          <Fingerprint className="w-10 h-10" style={{ color: FLUENT_ACCENT, opacity: 0.5 }} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: FLUENT_SUBTLE }}>
            点击运行声纹分析开始识别
          </p>
          <p className="text-xs mt-1" style={{ color: FLUENT_BORDER }}>
            系统将自动检测发言者并匹配已知档案
          </p>
        </div>
        <Button
          onClick={runAnalysis}
          disabled={analyzing}
          style={{ background: FLUENT_ACCENT, color: "#fff" }}
        >
          {analyzing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Fingerprint className="w-4 h-4 mr-2" />
          )}
          运行声纹分析
        </Button>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Fingerprint className="w-4 h-4" style={{ color: FLUENT_ACCENT }} />
          声纹雷达与身份识别
        </h3>
        <Button
          size="sm"
          onClick={runAnalysis}
          disabled={analyzing}
          style={{ background: FLUENT_ACCENT, color: "#fff" }}
        >
          {analyzing ? (
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
          ) : (
            <Fingerprint className="w-3.5 h-3.5 mr-1" />
          )}
          运行声纹分析
        </Button>
      </div>

      {/* Stats badges */}
      <div className="flex gap-2">
        <Badge variant="outline" className="text-xs" style={{ borderColor: FLUENT_BORDER }}>
          {speakers.length}位发言者
        </Badge>
        <Badge
          variant="outline"
          className="text-xs"
          style={{ borderColor: FLUENT_SUCCESS, color: FLUENT_SUCCESS }}
        >
          {matchedCount}已识别 ✓
        </Badge>
        {unknownCount > 0 && (
          <Badge
            variant="outline"
            className="text-xs"
            style={{ borderColor: FLUENT_WARN, color: FLUENT_WARN }}
          >
            {unknownCount}待识别 ?
          </Badge>
        )}
      </div>

      {/* Speaker cards */}
      <div className="space-y-2">
        {speakers.map((speaker) => {
          const isMatched = speaker.matchedProfileId !== null;
          const badge = profileTypeBadge(speaker.matchedProfileType);
          const freq = speaker.speakerLabel.includes("12") ? 440 : 520;

          return (
            <div
              key={speaker.id}
              className="p-3 rounded-lg"
              style={{
                background: isMatched ? `${FLUENT_SUCCESS}08` : `${FLUENT_WARN}08`,
                border: `1px solid ${isMatched ? `${FLUENT_SUCCESS}40` : `${FLUENT_WARN}40`}`,
              }}
            >
              {/* Row 1: Label + status */}
              <div className="flex items-center gap-2 mb-1.5">
                {isMatched ? (
                  <UserCheck className="w-4 h-4 shrink-0" style={{ color: FLUENT_SUCCESS }} />
                ) : (
                  <HelpCircle className="w-4 h-4 shrink-0" style={{ color: FLUENT_WARN }} />
                )}
                <span className="text-sm font-semibold">{speaker.speakerLabel}</span>
                <span className="text-sm" style={{ color: FLUENT_SUBTLE }}>
                  — {isMatched ? speaker.matchedProfileName : "未识别"}
                </span>
              </div>

              {/* Row 2: Metadata badges */}
              <div className="flex items-center gap-2 ml-6 text-xs flex-wrap">
                {isMatched && (
                  <>
                    <span
                      className="px-1.5 py-0.5 rounded"
                      style={{ background: `${badge.color}15`, color: badge.color }}
                    >
                      {badge.label}
                    </span>
                    <span style={{ color: FLUENT_SUBTLE }}>
                      {speaker.matchConfidence
                        ? `${Math.round(parseFloat(speaker.matchConfidence) * 100)}%`
                        : "—"}
                    </span>
                  </>
                )}
                <span style={{ color: FLUENT_SUBTLE }}>
                  {formatDuration(speaker.speakingDurationSec)}
                </span>
                <span style={{ color: FLUENT_SUBTLE }}>
                  {formatTime(speaker.firstSpokenAt)}
                </span>
              </div>

              {/* Row 3: Actions for unknown speakers */}
              {!isMatched && (
                <div className="mt-2 ml-6 flex flex-col gap-2">
                  {/* Play snippet button */}
                  {speaker.voiceSnippetUrl && (
                    <button
                      onClick={() => playSnippet(speaker.id, freq)}
                      disabled={playingId === speaker.id}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded w-fit transition-colors"
                      style={{
                        background: playingId === speaker.id ? `${FLUENT_ACCENT}20` : `${FLUENT_ACCENT}10`,
                        color: FLUENT_ACCENT,
                        border: `1px solid ${FLUENT_ACCENT}30`,
                      }}
                    >
                      {playingId === speaker.id ? (
                        <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      {playingId === speaker.id ? "播放中..." : "播放声纹片段"}
                    </button>
                  )}

                  {/* Bind controls */}
                  <div className="flex items-center gap-2">
                    <select
                      value={bindSelections[speaker.id] ?? ""}
                      onChange={(e) =>
                        setBindSelections((prev) => ({
                          ...prev,
                          [speaker.id]: e.target.value,
                        }))
                      }
                      className="text-xs px-2 py-1.5 rounded flex-1"
                      style={{
                        border: `1px solid ${FLUENT_BORDER}`,
                        background: FLUENT_CARD,
                        maxWidth: 200,
                      }}
                    >
                      <option value="">绑定到...</option>
                      {PROFILE_OPTIONS.map((p) => (
                        <option key={`${p.type}:${p.id}`} value={`${p.type}:${p.id}`}>
                          [{p.type === "EMPLOYEE" ? "员工" : p.type === "CUSTOMER" ? "客户" : "外部"}] {p.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      disabled={
                        !bindSelections[speaker.id] || bindingId === speaker.id
                      }
                      onClick={() => bindProfile(speaker.id)}
                      className="text-xs h-7"
                      style={{
                        background: bindSelections[speaker.id] ? FLUENT_SUCCESS : FLUENT_BORDER,
                        color: "#fff",
                      }}
                    >
                      {bindingId === speaker.id ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                      )}
                      确认绑定
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
