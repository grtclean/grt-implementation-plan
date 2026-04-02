import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Image, Eye } from "lucide-react";

interface Snapshot {
  id: number;
  thumbnailUrl?: string;
  capturedAt: string;
  triggerType: string;
}

interface SnapshotGalleryProps {
  snapshots: Snapshot[];
  columns?: number;
  onSelect?: (id: number) => void;
  className?: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  manual: "手动",
  alarm: "报警",
  motion: "运动",
  scheduled: "定时",
};

export function SnapshotGallery({
  snapshots,
  columns = 3,
  onSelect,
  className = "",
}: SnapshotGalleryProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (snapshots.length === 0) {
    return (
      <div className={`flex items-center justify-center h-40 text-gray-500 text-sm ${className}`}>
        <Image className="w-5 h-5 mr-2 text-gray-600" />
        暂无快照
      </div>
    );
  }

  const handleClick = (id: number) => {
    setSelectedId(id);
    onSelect?.(id);
  };

  return (
    <div
      className={`grid gap-2 ${className}`}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {snapshots.map((snap) => (
        <div
          key={snap.id}
          onClick={() => handleClick(snap.id)}
          className={`group relative bg-gray-900 rounded-lg overflow-hidden cursor-pointer border-2 transition-colors ${
            selectedId === snap.id ? "border-blue-500" : "border-transparent hover:border-gray-600"
          }`}
        >
          {/* Thumbnail */}
          <div className="aspect-video bg-gray-800 flex items-center justify-center relative">
            {snap.thumbnailUrl ? (
              <img
                src={snap.thumbnailUrl}
                alt={`Snapshot ${snap.id}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <Image className="w-8 h-8 text-gray-600" />
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="flex items-center gap-1 text-xs text-gray-200">
                <Eye className="w-3.5 h-3.5" />
                查看大图
              </span>
            </div>
          </div>
          {/* Info */}
          <div className="px-2 py-1.5 flex items-center justify-between">
            <span className="text-[10px] text-gray-400 truncate">{snap.capturedAt}</span>
            <Badge variant="outline" className="text-[10px] border-gray-600 text-gray-300 px-1 py-0">
              {TRIGGER_LABELS[snap.triggerType] ?? snap.triggerType}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
