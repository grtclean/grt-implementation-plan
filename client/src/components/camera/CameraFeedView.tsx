import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Camera,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Download,
} from "lucide-react";

interface CameraFeedViewProps {
  cameraId: number | string;
  cameraName?: string;
  refreshMs?: number;
  showPtz?: boolean;
  showControls?: boolean;
  className?: string;
}

export function CameraFeedView({
  cameraId,
  cameraName,
  refreshMs = 2000,
  showPtz = false,
  showControls = false,
  className = "",
}: CameraFeedViewProps) {
  const [online, setOnline] = useState(true);
  const [timestamp, setTimestamp] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimestamp(new Date().toLocaleTimeString());
      // simulate occasional offline blip (2% chance)
      setOnline(Math.random() > 0.02);
    }, refreshMs);
    return () => clearInterval(timer);
  }, [refreshMs]);

  const displayName = cameraName ?? `CAM-${cameraId}`;

  return (
    <div className={`bg-gray-900 rounded-lg overflow-hidden relative group ${className}`}>
      {/* Feed area */}
      <div className="relative w-full aspect-video bg-gray-950 flex items-center justify-center">
        <Camera className="w-10 h-10 text-gray-700" />

        {/* Camera name overlay */}
        <div className="absolute top-2 left-2 text-xs bg-black/60 px-2 py-0.5 rounded text-gray-200">
          {displayName}
        </div>

        {/* Status dot */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              online ? "bg-green-500 animate-pulse" : "bg-red-500"
            }`}
          />
        </div>

        {/* Timestamp */}
        <div className="absolute bottom-2 left-2 text-[10px] text-gray-400 bg-black/50 px-1.5 py-0.5 rounded">
          {timestamp}
        </div>

        {/* PTZ overlay */}
        {showPtz && (
          <div className="absolute bottom-2 right-2 flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" className="h-6 w-6 bg-black/40 text-gray-300">
              <ChevronUp className="w-3.5 h-3.5" />
            </Button>
            <div className="flex gap-0.5">
              <Button size="icon" variant="ghost" className="h-6 w-6 bg-black/40 text-gray-300">
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6 bg-black/40 text-gray-300">
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
            <Button size="icon" variant="ghost" className="h-6 w-6 bg-black/40 text-gray-300">
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
            <div className="flex gap-0.5 mt-1">
              <Button size="icon" variant="ghost" className="h-6 w-6 bg-black/40 text-gray-300">
                <ZoomIn className="w-3 h-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6 bg-black/40 text-gray-300">
                <ZoomOut className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Controls bar */}
      {showControls && (
        <div className="flex items-center gap-1 px-2 py-1 bg-gray-900 border-t border-gray-800">
          <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-gray-200">
            <Download className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-gray-200">
            <Maximize className="w-3.5 h-3.5" />
          </Button>
          <div className="flex-1" />
          <span className="text-[10px] text-gray-500">{displayName}</span>
        </div>
      )}
    </div>
  );
}
