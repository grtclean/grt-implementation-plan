import { useState, useRef, useCallback, useEffect } from "react";
import { Download, Maximize2, Minimize2, FileCode, FileSpreadsheet, FileText, Image, Box, FileType } from "lucide-react";
import { Button } from "@/components/ui/button";

// Lazy-load Monaco to avoid bundling it on pages that don't need it
import Editor from "@monaco-editor/react";

export type ViewerFileType = "excel" | "word" | "ppt" | "code" | "cad" | "pdf" | "image" | "markdown";

/** CAD viewer keyframe animations — defined once to avoid duplicate <style> injections */
const CAD_STYLES = `
@keyframes cadGridMove {
  0% { transform: translate(0, 0); }
  100% { transform: translate(40px, 40px); }
}
@keyframes cadSpin {
  0% { transform: rotateY(0deg) rotateX(15deg); }
  100% { transform: rotateY(360deg) rotateX(15deg); }
}
@keyframes cadPulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1.2); }
}`;

interface UniversalViewerProps {
  fileUrl: string;
  fileType: ViewerFileType;
  fileName: string;
}

const FILE_TYPE_ICONS: Record<ViewerFileType, typeof FileText> = {
  excel: FileSpreadsheet,
  word: FileText,
  ppt: FileType,
  code: FileCode,
  cad: Box,
  pdf: FileText,
  image: Image,
  markdown: FileText,
};

/** Map file extension to Monaco language */
function detectLanguage(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    xml: "xml",
    html: "html",
    css: "css",
    py: "python",
    sql: "sql",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    st: "pascal",      // Structured Text (IEC 61131-3) — closest match
    scl: "pascal",     // SCL uses Pascal-like syntax
    gcode: "plaintext",
    nc: "plaintext",
    cfg: "ini",
    ini: "ini",
    sh: "shell",
    bat: "bat",
  };
  return map[ext] || "plaintext";
}

/** Mock code content for demo */
function getMockCode(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "st") {
    return `PROGRAM PLC_Main
VAR
  bStart       : BOOL := FALSE;
  bStop        : BOOL := FALSE;
  nCycleCount  : INT  := 0;
  rTemperature : REAL := 23.5;
  sStatus      : STRING := 'IDLE';
END_VAR

(* Main cleaning cycle control *)
IF bStart AND NOT bStop THEN
  nCycleCount := nCycleCount + 1;
  sStatus := 'RUNNING';

  (* Temperature monitoring *)
  IF rTemperature > 85.0 THEN
    bStop := TRUE;
    sStatus := 'OVERHEAT_STOP';
  END_IF;
ELSIF bStop THEN
  sStatus := 'STOPPED';
END_IF;

END_PROGRAM`;
  }
  if (ext === "json") {
    return JSON.stringify({
      machine: "GRT-CL2000",
      firmware: "3.2.1",
      parameters: {
        pressure: { value: 6.5, unit: "bar", min: 2, max: 10 },
        temperature: { value: 65, unit: "°C", min: 20, max: 90 },
        cycle_time: { value: 120, unit: "s" },
      },
      last_calibration: "2026-01-15T08:30:00Z",
    }, null, 2);
  }
  if (ext === "xml") {
    return `<?xml version="1.0" encoding="UTF-8"?>
<RobotPath name="cleaning_trajectory_01" version="2.1">
  <Metadata>
    <Machine>GRT-ARM-600</Machine>
    <Created>2026-02-20</Created>
    <Author>R&amp;D Engineering</Author>
  </Metadata>
  <Waypoints>
    <Point id="1" x="0.000" y="0.000" z="150.0" speed="80" />
    <Point id="2" x="120.5" y="45.2" z="150.0" speed="60" />
    <Point id="3" x="120.5" y="45.2" z="50.0"  speed="40" />
    <Point id="4" x="250.0" y="90.0" z="50.0"  speed="40" />
    <Point id="5" x="250.0" y="90.0" z="150.0" speed="80" />
  </Waypoints>
</RobotPath>`;
  }
  return `// ${fileName}\n// File preview not available in demo mode`;
}

export default function UniversalViewer({ fileUrl, fileType, fileName }: UniversalViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const Icon = FILE_TYPE_ICONS[fileType];

  // Sync fullscreen state when user presses Escape or exits via browser chrome
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen not supported or denied
    }
  }, []);

  const handleDownload = useCallback(() => {
    // In production this would trigger a real download
    const a = document.createElement("a");
    a.href = fileUrl || "#";
    a.download = fileName;
    a.click();
  }, [fileUrl, fileName]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-[#faf9f8]"
    >
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#edebe9] bg-white">
        <div className="flex items-center gap-2 text-sm text-[#323130]">
          <Icon className="w-4 h-4 text-[#0078d4]" />
          <span className="font-medium truncate max-w-[300px]">{fileName}</span>
          <span className="text-[#a19f9d] text-xs uppercase">{fileType}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleDownload} className="h-8 px-3 text-xs">
            <Download className="w-3.5 h-3.5 mr-1" />
            Download
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="h-8 px-2">
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {/* Office documents */}
        {(fileType === "excel" || fileType === "word" || fileType === "ppt") && (
          fileUrl && fileUrl.startsWith("http") ? (
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`}
              className="w-full h-full border-0"
              title={fileName}
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-white">
              <div className="text-center space-y-3 p-8">
                <Icon className="w-16 h-16 mx-auto text-[#0078d4] opacity-60" />
                <p className="text-[#323130] font-medium text-lg">{fileName}</p>
                <p className="text-[#605e5c] text-sm">
                  Office Web Viewer — requires publicly accessible URL
                </p>
                <div className="bg-[#f3f2f1] rounded-lg p-4 text-xs text-[#605e5c] font-mono max-w-md mx-auto break-all">
                  view.officeapps.live.com/op/embed.aspx?src={encodeURIComponent(fileUrl || "...")}
                </div>
              </div>
            </div>
          )
        )}

        {/* Code files */}
        {fileType === "code" && (
          <Editor
            height="100%"
            language={detectLanguage(fileName)}
            value={getMockCode(fileName)}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: true },
              fontSize: 13,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              padding: { top: 12 },
            }}
          />
        )}

        {/* CAD files — styled placeholder */}
        {fileType === "cad" && (
          <div className="w-full h-full flex items-center justify-center relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
            }}
          >
            <style>{CAD_STYLES}</style>
            {/* Animated grid background */}
            <div className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(0,120,212,0.3) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,120,212,0.3) 1px, transparent 1px)
                `,
                backgroundSize: "40px 40px",
                animation: "cadGridMove 20s linear infinite",
              }}
            />
            <div className="text-center z-10 space-y-4">
              <div
                className="mx-auto w-32 h-32 border-2 border-[#0078d4] rounded-xl flex items-center justify-center"
                style={{
                  animation: "cadSpin 8s linear infinite",
                  transformStyle: "preserve-3d",
                  perspective: "800px",
                  boxShadow: "0 0 40px rgba(0,120,212,0.3), inset 0 0 40px rgba(0,120,212,0.1)",
                }}
              >
                <Box className="w-16 h-16 text-[#0078d4]" />
              </div>
              <p className="text-white font-medium text-lg">{fileName}</p>
              <p className="text-[#a0c4ff] text-sm">3D CAD Viewer Engine Loading...</p>
              <div className="flex items-center justify-center gap-1">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#0078d4]"
                    style={{
                      animation: `cadPulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PDF */}
        {fileType === "pdf" && (
          fileUrl ? (
            <iframe src={fileUrl} className="w-full h-full border-0" title={fileName} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center space-y-2">
                <FileText className="w-16 h-16 mx-auto text-[#605e5c] opacity-40" />
                <p className="text-[#605e5c]">PDF preview requires a valid URL</p>
              </div>
            </div>
          )
        )}

        {/* Images */}
        {fileType === "image" && (
          fileUrl ? (
            <div className="w-full h-full flex items-center justify-center p-4 bg-[#f3f2f1]">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-full object-contain rounded shadow-lg"
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center space-y-2">
                <Image className="w-16 h-16 mx-auto text-[#605e5c] opacity-40" />
                <p className="text-[#605e5c]">Image preview requires a valid URL</p>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
