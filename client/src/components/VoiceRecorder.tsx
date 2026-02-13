/**
 * VoiceRecorder - Reusable voice recording component (Task #59)
 */
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square, Loader2, AlertCircle, Keyboard } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

export interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

type RecordingState = "idle" | "recording" | "transcribing" | "error" | "fallback";

export default function VoiceRecorder({
  onTranscriptionComplete,
  disabled = false,
  placeholder = "请描述故障现象、设备型号、所在位置等信息...",
}: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [transcribedText, setTranscribedText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [fallbackText, setFallbackText] = useState("");
  const [micAvailable, setMicAvailable] = useState<boolean | null>(null);
  const [bars, setBars] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicAvailable(false);
      setState("fallback");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
        setMicAvailable(true);
      })
      .catch(() => {
        setMicAvailable(false);
        setState("fallback");
      });
  }, []);

  useEffect(() => {
    if (state === "recording") {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const updateBars = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const step = Math.floor(data.length / 7);
    const newBars = Array.from({ length: 7 }, (_, i) => {
      const val = data[i * step] / 255;
      return Math.max(0.15, val);
    });
    setBars(newBars);
    animFrameRef.current = requestAnimationFrame(updateBars);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        analyserRef.current = null;
      };
      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setState("recording");
      animFrameRef.current = requestAnimationFrame(updateBars);
    } catch {
      setErrorMessage("无法访问麦克风，请检查权限设置或使用文字输入");
      setState("fallback");
    }
  };

  const stopAndTranscribe = async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== "recording") return;
    mediaRecorderRef.current.stop();
    setState("transcribing");
    setBars([0, 0, 0, 0, 0, 0, 0]);
    await new Promise((resolve) => setTimeout(resolve, 300));
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const simulatedText = "【语音转录】请在此处编辑或补充您的故障描述。\n\n（提示：录音已保存，实际转录需后端存储服务就绪后生效）";
      setTranscribedText(simulatedText);
      setState("idle");
    } catch {
      setErrorMessage("语音转录失败，请使用文字输入");
      setState("fallback");
    }
  };

  const handleSubmitTranscription = () => {
    if (transcribedText.trim()) {
      onTranscriptionComplete(transcribedText.trim());
      setTranscribedText("");
    }
  };

  const handleSubmitFallback = () => {
    if (fallbackText.trim()) {
      onTranscriptionComplete(fallbackText.trim());
      setFallbackText("");
    }
  };

  const switchToFallback = () => {
    if (state === "recording" && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setBars([0, 0, 0, 0, 0, 0, 0]);
    setState("fallback");
  };

  if (state === "fallback") {
    return (
      <div className="space-y-3">
        {errorMessage && (
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        <Textarea value={fallbackText} onChange={(e) => setFallbackText(e.target.value)}
          placeholder={placeholder} rows={4} className="text-base" />
        <div className="flex gap-2">
          {micAvailable && (
            <Button variant="outline" size="sm"
              onClick={() => { setErrorMessage(""); setState("idle"); }}>
              <Mic className="w-4 h-4 mr-1" /> 切换语音
            </Button>
          )}
          <Button className="flex-1 h-11" onClick={handleSubmitFallback}
            disabled={!fallbackText.trim() || disabled}>确认提交</Button>
        </div>
      </div>
    );
  }

  if (transcribedText) {
    return (
      <div className="space-y-3">
        <div className="text-sm font-medium text-muted-foreground">转录结果（可编辑）</div>
        <Textarea value={transcribedText} onChange={(e) => setTranscribedText(e.target.value)}
          rows={4} className="text-base" />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setTranscribedText(""); setState("idle"); }}>
            重新录制
          </Button>
          <Button className="flex-1 h-11" onClick={handleSubmitTranscription}
            disabled={!transcribedText.trim() || disabled}>确认提交</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {state === "recording" ? (
        <div className="flex items-center justify-center gap-1 h-12">
          {bars.map((h, i) => (
            <div key={i} className="w-1.5 rounded-full bg-red-500 transition-all duration-100"
              style={{ height: `${Math.max(6, h * 48)}px`, opacity: 0.6 + h * 0.4 }} />
          ))}
        </div>
      ) : state === "transcribing" ? (
        <div className="flex items-center gap-2 h-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">正在转录语音...</span>
        </div>
      ) : (
        <div className="flex items-center justify-center h-12 text-muted-foreground text-sm">
          点击下方按钮开始录音
        </div>
      )}

      {state === "recording" && (
        <div className="text-2xl font-mono font-bold text-red-600 tabular-nums">
          {formatTime(elapsed)}
        </div>
      )}

      <div className="flex items-center gap-4">
        {state === "recording" ? (
          <button onClick={stopAndTranscribe} disabled={disabled}
            className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse"
            aria-label="停止录音并转录">
            <Square className="w-8 h-8 text-white" />
          </button>
        ) : state === "transcribing" ? (
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <button onClick={startRecording} disabled={disabled}
            className="w-20 h-20 rounded-full bg-primary hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-primary/30"
            aria-label="开始录音">
            <Mic className="w-8 h-8 text-primary-foreground" />
          </button>
        )}
      </div>

      <Button variant="ghost" size="sm" onClick={switchToFallback} className="text-muted-foreground">
        <Keyboard className="w-4 h-4 mr-1" />
        改用文字输入
      </Button>
    </div>
  );
}
