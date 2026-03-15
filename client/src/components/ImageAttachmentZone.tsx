/**
 * ImageAttachmentZone — 图片附件上传/预览/标注区域
 *
 * 用于售后客户服务场景:
 * - 拖拽/点击上传现场故障照片
 * - 缩略图预览 + 全屏查看
 * - 删除已上传图片
 * - AI辅助分析按钮 (触发回调)
 *
 * 图片存储为 base64 DataURL (适配无对象存储环境)
 */
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ImagePlus,
  X,
  ZoomIn,
  Sparkles,
  Upload,
  Camera,
  Trash2,
  Maximize2,
} from "lucide-react";

export interface AttachedImage {
  id: string;
  name: string;
  dataUrl: string;
  size: number;
  uploadedAt: string;
}

interface ImageAttachmentZoneProps {
  /** 已上传的图片列表 */
  images: AttachedImage[];
  /** 图片变更回调 */
  onChange: (images: AttachedImage[]) => void;
  /** AI分析回调 (传入选中图片的dataUrl列表) */
  onAiAnalyze?: (imageDataUrls: string[]) => void;
  /** 最大图片数 */
  maxImages?: number;
  /** 最大单图大小 (bytes) */
  maxSizeBytes?: number;
  /** 额外样式 */
  className?: string;
  /** 是否只读 */
  readOnly?: boolean;
  /** 标签文字 */
  label?: string;
}

const MAX_DEFAULT_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"];

export default function ImageAttachmentZone({
  images,
  onChange,
  onAiAnalyze,
  maxImages = 10,
  maxSizeBytes = MAX_DEFAULT_SIZE,
  className = "",
  readOnly = false,
  label = "现场照片",
}: ImageAttachmentZoneProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<AttachedImage | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArr = Array.from(files);
      const remaining = maxImages - images.length;

      if (remaining <= 0) {
        toast({ title: "已达上限", description: `最多上传${maxImages}张图片`, variant: "destructive" });
        return;
      }

      const toProcess = fileArr.slice(0, remaining);
      let skipped = 0;

      for (const file of toProcess) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          skipped++;
          continue;
        }
        if (file.size > maxSizeBytes) {
          toast({
            title: "文件过大",
            description: `${file.name} 超过 ${Math.round(maxSizeBytes / 1024 / 1024)}MB 限制`,
            variant: "destructive",
          });
          skipped++;
          continue;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          const newImage: AttachedImage = {
            id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            dataUrl,
            size: file.size,
            uploadedAt: new Date().toISOString(),
          };
          onChange([...images, newImage]);
        };
        reader.readAsDataURL(file);
      }

      if (skipped > 0) {
        toast({
          title: "部分文件跳过",
          description: `${skipped}个文件格式不支持或超过大小限制`,
        });
      }
    },
    [images, maxImages, maxSizeBytes, onChange, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (readOnly) return;
      processFiles(e.dataTransfer.files);
    },
    [processFiles, readOnly]
  );

  const handleRemove = (id: string) => {
    onChange(images.filter((img) => img.id !== id));
  };

  const handleAiAnalyze = () => {
    if (onAiAnalyze && images.length > 0) {
      onAiAnalyze(images.map((img) => img.dataUrl));
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
          <Badge variant="outline" className="text-xs">
            {images.length}/{maxImages}
          </Badge>
        </div>
        {onAiAnalyze && images.length > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleAiAnalyze}>
            <Sparkles className="h-3 w-3" /> AI分析图片
          </Button>
        )}
      </div>

      {/* Drop Zone */}
      {!readOnly && images.length < maxImages && (
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/20 hover:border-muted-foreground/40"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            拖拽图片到此处，或 <span className="text-primary font-medium">点击上传</span>
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            支持 JPG/PNG/GIF/WebP，最大 {Math.round(maxSizeBytes / 1024 / 1024)}MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) processFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 mt-3">
          {images.map((img) => (
            <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
              <img
                src={img.dataUrl}
                alt={img.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                <button
                  className="p-1 rounded bg-white/80 hover:bg-white text-gray-800"
                  onClick={() => setPreviewImage(img)}
                  title="预览"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                {!readOnly && (
                  <button
                    className="p-1 rounded bg-red-500/80 hover:bg-red-500 text-white"
                    onClick={() => handleRemove(img.id)}
                    title="删除"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                <p className="text-[9px] text-white truncate">{img.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full-size Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Maximize2 className="h-4 w-4" />
              {previewImage?.name}
            </DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="flex items-center justify-center max-h-[70vh]">
              <img
                src={previewImage.dataUrl}
                alt={previewImage.name}
                className="max-w-full max-h-[65vh] object-contain rounded"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
