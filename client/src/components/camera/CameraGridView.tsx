import { CameraFeedView } from "./CameraFeedView";
import { Plus } from "lucide-react";

interface CameraInfo {
  id: number;
  name: string;
  status: string;
}

interface CameraGridViewProps {
  cameraIds?: (number | string)[];
  layout?: "1x1" | "2x2" | "3x3" | "1+5";
  cameras?: CameraInfo[];
  className?: string;
  onCameraClick?: (id: number | string) => void;
}

function gridCols(layout: string): string {
  switch (layout) {
    case "1x1":
      return "grid-cols-1";
    case "2x2":
      return "grid-cols-2";
    case "3x3":
      return "grid-cols-3";
    default:
      return "grid-cols-2";
  }
}

function totalSlots(layout: string): number {
  switch (layout) {
    case "1x1":
      return 1;
    case "2x2":
      return 4;
    case "3x3":
      return 9;
    case "1+5":
      return 6;
    default:
      return 4;
  }
}

export function CameraGridView({
  cameraIds,
  layout = "2x2",
  cameras,
  className = "",
  onCameraClick,
}: CameraGridViewProps) {
  const ids = cameraIds ?? cameras?.map((c) => c.id) ?? [];
  const nameMap = new Map<number | string, string>();
  cameras?.forEach((c) => nameMap.set(c.id, c.name));

  const slots = totalSlots(layout);
  const items = Array.from({ length: slots }, (_, i) => (i < ids.length ? ids[i] : null));

  if (layout === "1+5") {
    // 1 large on left, 5 small on right (2 rows x 3 cols, first cell spans 2 rows / 2 cols)
    return (
      <div className={`grid grid-cols-3 grid-rows-2 gap-2 ${className}`}>
        {items.map((id, idx) => {
          if (id !== null) {
            return (
              <div
                key={id}
                className={`cursor-pointer ${idx === 0 ? "col-span-2 row-span-2" : ""}`}
                onClick={() => onCameraClick?.(id)}
              >
                <CameraFeedView
                  cameraId={id}
                  cameraName={nameMap.get(id)}
                  showControls={idx === 0}
                  className="h-full"
                />
              </div>
            );
          }
          return (
            <div
              key={`empty-${idx}`}
              className="border-2 border-dashed border-gray-700 rounded-lg flex items-center justify-center min-h-[120px] text-gray-500 text-sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              添加摄像头
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`grid ${gridCols(layout)} gap-2 ${className}`}>
      {items.map((id, idx) => {
        if (id !== null) {
          return (
            <div key={id} className="cursor-pointer" onClick={() => onCameraClick?.(id)}>
              <CameraFeedView cameraId={id} cameraName={nameMap.get(id)} className="min-h-[160px]" />
            </div>
          );
        }
        return (
          <div
            key={`empty-${idx}`}
            className="border-2 border-dashed border-gray-700 rounded-lg flex items-center justify-center min-h-[160px] text-gray-500 text-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            添加摄像头
          </div>
        );
      })}
    </div>
  );
}
