import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Square,
} from "lucide-react";

interface PtzControlsProps {
  cameraId: number | string;
  onMove?: (direction: string, speed: number) => void;
  onZoom?: (direction: string) => void;
  onPreset?: (presetId: number) => void;
  compact?: boolean;
  className?: string;
}

export function PtzControls({
  cameraId: _cameraId,
  onMove,
  onZoom,
  onPreset,
  compact = false,
  className = "",
}: PtzControlsProps) {
  const [speed, setSpeed] = useState(5);

  const move = (dir: string) => onMove?.(dir, speed);

  const btnSize = compact ? "h-7 w-7" : "h-8 w-8";
  const iconSize = compact ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <div className={`bg-gray-800 rounded-lg p-3 inline-flex flex-col items-center gap-2 ${className}`}>
      {/* Directional pad */}
      <div className="flex flex-col items-center gap-0.5">
        <Button
          size="icon"
          variant="ghost"
          className={`${btnSize} text-gray-300 hover:bg-gray-700`}
          onClick={() => move("up")}
        >
          <ChevronUp className={iconSize} />
        </Button>
        <div className="flex gap-0.5 items-center">
          <Button
            size="icon"
            variant="ghost"
            className={`${btnSize} text-gray-300 hover:bg-gray-700`}
            onClick={() => move("left")}
          >
            <ChevronLeft className={iconSize} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={`${btnSize} text-gray-300 hover:bg-gray-700 bg-gray-700/50`}
            onClick={() => onMove?.("stop", 0)}
          >
            <Square className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={`${btnSize} text-gray-300 hover:bg-gray-700`}
            onClick={() => move("right")}
          >
            <ChevronRight className={iconSize} />
          </Button>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className={`${btnSize} text-gray-300 hover:bg-gray-700`}
          onClick={() => move("down")}
        >
          <ChevronDown className={iconSize} />
        </Button>
      </div>

      {/* Zoom */}
      <div className="flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          className={`${btnSize} text-gray-300 hover:bg-gray-700`}
          onClick={() => onZoom?.("in")}
        >
          <ZoomIn className={iconSize} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className={`${btnSize} text-gray-300 hover:bg-gray-700`}
          onClick={() => onZoom?.("out")}
        >
          <ZoomOut className={iconSize} />
        </Button>
      </div>

      {/* Presets */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((id) => (
          <Button
            key={id}
            size="icon"
            variant="outline"
            className={`${btnSize} text-xs text-gray-300 border-gray-600 hover:bg-gray-700`}
            onClick={() => onPreset?.(id)}
          >
            {id}
          </Button>
        ))}
      </div>

      {/* Speed slider (non-compact only) */}
      {!compact && (
        <div className="w-full flex items-center gap-2 pt-1">
          <span className="text-[10px] text-gray-500">速度</span>
          <input
            type="range"
            min={1}
            max={10}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="flex-1 h-1 accent-blue-500"
          />
          <span className="text-[10px] text-gray-400 w-4 text-right">{speed}</span>
        </div>
      )}
    </div>
  );
}
