import { useState, useEffect, useRef } from "react";
import {
  Radio,
  Square,
  Clock,
  Sparkles,
  Send,
  Mic,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLiveMeeting } from "@/hooks/useLiveMeeting";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function LiveAssistantTab() {
  const { t } = useLanguage();
  const [meetingId, setMeetingId] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [speakerInput, setSpeakerInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const suggestionsEndRef = useRef<HTMLDivElement>(null);

  const startMutation = trpc.ime.startLiveSession.useMutation();
  const endMutation = trpc.ime.endLiveSession.useMutation();

  const live = useLiveMeeting();

  // Timer
  useEffect(() => {
    if (sessionId && live.isConnected) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionId, live.isConnected]);

  // Auto-scroll suggestions
  useEffect(() => {
    suggestionsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [live.suggestions]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleStart = async () => {
    if (!meetingId) return;
    try {
      const result = await startMutation.mutateAsync({ meetingId });
      const sid = (result as any).sessionId;
      setSessionId(sid);
      setElapsedSeconds(0);
      live.connect(sid, "user", "User");
    } catch (e) {
      console.error("Failed to start live session:", e);
    }
  };

  const handleEnd = async () => {
    if (!sessionId) return;
    live.disconnect();
    try {
      await endMutation.mutateAsync({ sessionId });
    } catch (e) {
      console.error("Failed to end live session:", e);
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setSessionId(null);
  };

  const handleSendSegment = () => {
    if (!textInput.trim()) return;
    live.sendSegment({
      speaker: speakerInput || "Unknown",
      text: textInput,
      start: elapsedSeconds - 5,
      end: elapsedSeconds,
    });
    setTextInput("");
  };

  // Prepare contribution chart data
  const contributionData = Object.entries(live.contributions).map(([speaker, data]) => ({
    speaker,
    segments: data.segments,
    speakingTime: Math.round(data.speakingTime),
  }));

  const isActive = sessionId !== null && live.isConnected;

  return (
    <div className="space-y-6">
      {/* Session Control */}
      <Card>
        <CardContent className="pt-6">
          {!isActive ? (
            <div className="flex gap-3 items-end">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("meeting.live.meetingId")}</label>
                <Input
                  value={meetingId}
                  onChange={(e) => setMeetingId(e.target.value)}
                  placeholder="meeting-id"
                  className="w-[300px]"
                />
              </div>
              <Button
                onClick={handleStart}
                disabled={startMutation.isPending || !meetingId}
                className="bg-green-600 hover:bg-green-700"
              >
                <Radio className="h-4 w-4 mr-2" />
                {t("meeting.live.startSession")}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="default" className="bg-red-500 animate-pulse">
                  <Radio className="h-3 w-3 mr-1" /> LIVE
                </Badge>
                <div className="flex items-center gap-2 text-sm font-mono">
                  <Clock className="h-4 w-4" />
                  {formatTime(elapsedSeconds)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Session #{sessionId} · {live.totalSegments} segments
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={handleEnd}
                disabled={endMutation.isPending}
              >
                <Square className="h-4 w-4 mr-2" />
                {t("meeting.live.endSession")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Input segment (only when active) */}
      {isActive && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3 items-end">
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Mic className="h-3.5 w-3.5" /> {t("meeting.live.speaker")}
                </label>
                <Input
                  value={speakerInput}
                  onChange={(e) => setSpeakerInput(e.target.value)}
                  placeholder="Speaker name"
                  className="w-[140px]"
                />
              </div>
              <div className="space-y-1.5 flex-1">
                <label className="text-sm font-medium">{t("meeting.live.content")}</label>
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={t("meeting.live.transcriptPlaceholder")}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSendSegment(); }}
                />
              </div>
              <Button onClick={handleSendSegment} disabled={!textInput.trim()}>
                <Send className="h-4 w-4 mr-2" />
                {t("meeting.live.send")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Contribution Bars + AI Suggestions */}
      {(isActive || contributionData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t("meeting.live.liveContribution")}
              </CardTitle>
              <CardDescription>Live contribution by speaker</CardDescription>
            </CardHeader>
            <CardContent>
              {contributionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(200, contributionData.length * 50)}>
                  <BarChart data={contributionData} layout="vertical">
                    <XAxis type="number" />
                    <YAxis dataKey="speaker" type="category" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="segments" fill="#6366f1" name={t("meeting.live.segmentCount")} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-8 text-muted-foreground text-sm">{t("meeting.live.waitingData")}</p>
              )}
            </CardContent>
          </Card>

          {/* AI Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                {t("meeting.live.aiSuggestions")}
              </CardTitle>
              <CardDescription>Real-time AI suggestions (every 10 segments)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {live.suggestions.length > 0 ? (
                  live.suggestions.map((suggestion, i) => (
                    <div
                      key={i}
                      className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm"
                    >
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <span>{suggestion}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-8 text-muted-foreground text-sm">
                    {isActive ? t("meeting.live.suggestionsAfter10") : t("meeting.live.noSuggestions")}
                  </p>
                )}
                <div ref={suggestionsEndRef} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* End session result */}
      {endMutation.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("meeting.live.analysisResult")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>{t("meeting.live.sessionEnded")} {(endMutation.data as any).totalSegments} {t("meeting.live.segmentsProcessed")}</p>
              {(endMutation.data as any).analysis?.contributions && (
                <p className="text-green-600">{t("meeting.live.contributionComplete")}: {(endMutation.data as any).analysis.contributions.length} {t("meeting.live.participants")}</p>
              )}
              {(endMutation.data as any).analysis?.effectiveness && (
                <p className="text-green-600">{t("meeting.live.effectivenessScore")}: {(endMutation.data as any).analysis.effectiveness.overallScore}</p>
              )}
              {(endMutation.data as any).analysis?.error && (
                <p className="text-red-500">{t("meeting.live.analysisError")}: {(endMutation.data as any).analysis.error}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection error */}
      {live.error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-sm text-red-600">
            {t("meeting.live.connectionError")}: {live.error}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
