import { useState, useRef, useCallback } from "react";
import { Upload, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { uploadChunked } from "../../lib/chunkedUploader";
import StorageRecommendationCard from "../doc-intelligence/StorageRecommendationCard";

interface FileUploadZoneProps {
  folderId: number | null;
  projectId?: number;
  stageCode?: string;
  onUploadComplete?: () => void;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip "data:...;base64," prefix
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function FileUploadZone({ folderId, projectId, stageCode, onUploadComplete }: FileUploadZoneProps) {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState({ done: 0, total: 0 });
  const [recommendation, setRecommendation] = useState<any>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [chunkProgress, setChunkProgress] = useState<number>(0);
  const [isChunking, setIsChunking] = useState(false);
  const [chunkingFileName, setChunkingFileName] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = trpc.collaborationDocs.uploadFile.useMutation();
  const recommendMutation = trpc.ido.storageRecommend.useMutation();
  const initUploadMutation = trpc.fileUpload.initiateUpload.useMutation();
  const completeUploadMutation = trpc.fileUpload.completeUpload.useMutation();

  // Fetch storage recommendation for the first file
  const fetchRecommendation = useCallback(async (file: File) => {
    try {
      setRecLoading(true);
      const ext = file.name.includes(".") ? file.name.split(".").pop() ?? "" : "";
      const result = await recommendMutation.mutateAsync({
        fileName: file.name,
        fileExtension: ext,
        projectId: projectId ?? undefined,
        stageCode: stageCode ?? undefined,
      });
      if (result && result.confidence > 0) {
        setRecommendation(result);
      }
    } catch {
      // Recommendation is non-critical — don't block upload
    } finally {
      setRecLoading(false);
    }
  }, [recommendMutation, projectId, stageCode]);

  const CHUNKED_THRESHOLD = 5 * 1024 * 1024; // 5MB

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;
    // Trigger recommendation for first file (non-blocking)
    if (fileArr[0]) fetchRecommendation(fileArr[0]);
    setUploading(true);
    setUploadCount({ done: 0, total: fileArr.length });
    for (let i = 0; i < fileArr.length; i++) {
      const file = fileArr[i];
      try {
        if (file.size > CHUNKED_THRESHOLD) {
          // ── Large file: chunked binary upload ──────────────────────────
          setIsChunking(true);
          setChunkProgress(0);
          setChunkingFileName(file.name);

          // 1. Initiate session via tRPC
          const session = await initUploadMutation.mutateAsync({
            fileName: file.name,
            fileSizeBytes: file.size,
            chunkSizeBytes: CHUNKED_THRESHOLD,
            mimeType: file.type || "application/octet-stream",
            projectId: projectId,
          });

          // 2. Upload chunks via binary PUT endpoint
          await uploadChunked({
            file,
            sessionId: session.sessionId,
            totalChunks: session.totalChunks,
            onProgress: (pct) => setChunkProgress(pct),
          });

          // 3. Finalize session via tRPC
          await completeUploadMutation.mutateAsync({
            sessionId: session.sessionId,
          });

          setIsChunking(false);
          setChunkProgress(100);
        } else {
          // ── Small file: existing base64 path ──────────────────────────
          const base64 = await readFileAsBase64(file);
          await uploadMutation.mutateAsync({
            fileName: file.name,
            fileData: base64,
            contentType: file.type || "application/octet-stream",
            folderId: folderId,
          });
        }
      } catch {
        // continue with remaining files
        setIsChunking(false);
      }
      setUploadCount({ done: i + 1, total: fileArr.length });
    }
    setUploading(false);
    setIsChunking(false);
    setChunkingFileName("");
    onUploadComplete?.();
    if (inputRef.current) inputRef.current.value = "";
  }, [folderId, projectId, uploadMutation, initUploadMutation, completeUploadMutation, onUploadComplete, fetchRecommendation]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  return (
    <div
      className="relative"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {/* Upload button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            {uploadCount.done}/{uploadCount.total}
          </>
        ) : (
          <>
            <Upload className="w-3.5 h-3.5 mr-1" />
            {t("workspace.upload") || "上传"}
          </>
        )}
      </Button>

      {/* Chunked upload progress */}
      {isChunking && (
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate max-w-[180px]" title={chunkingFileName}>
              {chunkingFileName}
            </span>
            <span>{chunkProgress}%</span>
          </div>
          <Progress value={chunkProgress} className="h-1.5" />
        </div>
      )}

      {/* Storage recommendation */}
      {(recommendation || recLoading) && (
        <StorageRecommendationCard
          recommendation={recommendation}
          loading={recLoading}
          onAccept={() => setRecommendation(null)}
          onReject={() => setRecommendation(null)}
          onSkip={() => setRecommendation(null)}
        />
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-[#0078d4]/10 border-2 border-dashed border-[#0078d4] rounded-lg flex items-center justify-center">
          <div className="text-center">
            <Upload className="w-8 h-8 mx-auto text-[#0078d4] mb-2" />
            <p className="text-sm text-[#0078d4] font-medium">
              {t("workspace.dropHere") || "拖放文件到此处上传"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
