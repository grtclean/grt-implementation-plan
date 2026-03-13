/**
 * useWorkspaceActions — reusable hook for workspace file operations.
 *
 * Any page can import this hook to upload, download, save, delete,
 * rename, or move workspace files without rendering the full workspace UI.
 */
import { useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { withRetry } from "@/lib/withRetry";

/** Read a File object as base64 (without the data-uri prefix). */
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Download a file as a Blob via fetch with streaming support.
 * Falls back from tRPC URL-based download when the URL open fails.
 */
async function downloadBlobFallback(url: string, fileName: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

/** CAD file extensions that may cause ECONNRESET due to large size */
const LARGE_BINARY_EXTS = new Set([
  "sldprt", "sldasm", "slddrw", "step", "stp", "iges", "igs",
  "dwg", "dxf", "catpart", "catproduct", "prt", "asm", "3dm",
]);

export interface WorkspaceActions {
  /** Upload a browser File to the workspace. Returns the new file id. */
  uploadFile: (file: File, folderId?: number | null) => Promise<number>;
  /** Download a workspace file (opens URL in new tab, with retry for large CAD files). */
  downloadFile: (fileId: number, fileName?: string) => Promise<void>;
  /** Save spreadsheet content (2D string array). */
  saveSpreadsheet: (fileId: number, data: string[][]) => Promise<void>;
  /** Save code/text content. */
  saveCode: (fileId: number, text: string) => Promise<void>;
  /** Save rich-text content (HTML string). */
  saveRichText: (fileId: number, html: string) => Promise<void>;
  /** Soft-delete a file. */
  deleteFile: (fileId: number) => Promise<void>;
  /** Rename a file. */
  renameFile: (fileId: number, newName: string) => Promise<void>;
  /** Move a file to a different folder. */
  moveFile: (fileId: number, targetFolderId: number | null) => Promise<void>;
  /** Create a new folder. Returns the folder id. */
  createFolder: (name: string) => Promise<number>;
  /** Delete a folder and its files. */
  deleteFolder: (folderId: number) => Promise<void>;
  /** Rename a folder. */
  renameFolder: (folderId: number, newName: string) => Promise<void>;
  /** Invalidate workspace queries so other components refresh. */
  invalidate: () => void;
  /** Whether any mutation is currently pending. */
  isPending: boolean;
}

export function useWorkspaceActions(): WorkspaceActions {
  const utils = trpc.useUtils();

  const uploadMut = trpc.collaborationDocs.uploadFile.useMutation();
  const deleteMut = trpc.collaborationDocs.deleteFile.useMutation();
  const renameMut = trpc.collaborationDocs.renameFile.useMutation();
  const moveMut = trpc.collaborationDocs.moveFile.useMutation();
  const saveMut = trpc.collaborationDocs.saveFile.useMutation();
  const createFolderMut = trpc.collaborationDocs.createFolder.useMutation();
  const deleteFolderMut = trpc.collaborationDocs.deleteFolder.useMutation();
  const renameFolderMut = trpc.collaborationDocs.renameFolder.useMutation();

  const invalidate = useCallback(() => {
    utils.collaborationDocs.listFiles.invalidate();
    utils.collaborationDocs.listFolders.invalidate();
  }, [utils]);

  const uploadFile = useCallback(async (file: File, folderId?: number | null) => {
    const base64 = await readFileAsBase64(file);
    const result = await uploadMut.mutateAsync({
      fileName: file.name,
      fileData: base64,
      contentType: file.type || "application/octet-stream",
      folderId: folderId ?? null,
    });
    invalidate();
    return (result as any)?.id ?? 0;
  }, [uploadMut, invalidate]);

  const downloadFile = useCallback(async (fileId: number, fileName?: string) => {
    const ext = fileName?.split(".").pop()?.toLowerCase() ?? "";
    const isLargeBinary = LARGE_BINARY_EXTS.has(ext);

    try {
      const result = await withRetry(
        () => utils.collaborationDocs.downloadFile.fetch({ id: fileId }),
        isLargeBinary ? 3 : 1,
      );
      if (result?.url) {
        if (isLargeBinary) {
          // For large CAD files, use blob download to avoid browser timeout
          await downloadBlobFallback(result.url, fileName || `file-${fileId}`);
        } else {
          window.open(result.url, "_blank");
        }
      }
    } catch {
      // Last-resort fallback: try direct API fetch
      try {
        const fallbackResult = await utils.collaborationDocs.downloadFile.fetch({ id: fileId });
        if (fallbackResult?.url) {
          await downloadBlobFallback(fallbackResult.url, fileName || `file-${fileId}`);
        }
      } catch {
        // silent — nothing more we can do
      }
    }
  }, [utils]);

  const saveSpreadsheet = useCallback(async (fileId: number, data: string[][]) => {
    await saveMut.mutateAsync({ id: fileId, parsedContent: data });
    invalidate();
  }, [saveMut, invalidate]);

  const saveCode = useCallback(async (fileId: number, text: string) => {
    await saveMut.mutateAsync({ id: fileId, textContent: text, contentType: "code" });
    invalidate();
  }, [saveMut, invalidate]);

  const saveRichText = useCallback(async (fileId: number, html: string) => {
    await saveMut.mutateAsync({ id: fileId, richContent: html, contentType: "richtext" });
    invalidate();
  }, [saveMut, invalidate]);

  const deleteFile = useCallback(async (fileId: number) => {
    await deleteMut.mutateAsync({ id: fileId });
    invalidate();
  }, [deleteMut, invalidate]);

  const renameFile = useCallback(async (fileId: number, newName: string) => {
    await renameMut.mutateAsync({ id: fileId, newName });
    invalidate();
  }, [renameMut, invalidate]);

  const moveFile = useCallback(async (fileId: number, targetFolderId: number | null) => {
    await moveMut.mutateAsync({ id: fileId, targetFolderId });
    invalidate();
  }, [moveMut, invalidate]);

  const createFolder = useCallback(async (name: string) => {
    const result = await createFolderMut.mutateAsync({ name });
    invalidate();
    return (result as any)?.id ?? 0;
  }, [createFolderMut, invalidate]);

  const deleteFolder = useCallback(async (folderId: number) => {
    await deleteFolderMut.mutateAsync({ id: folderId });
    invalidate();
  }, [deleteFolderMut, invalidate]);

  const renameFolder = useCallback(async (folderId: number, newName: string) => {
    await renameFolderMut.mutateAsync({ id: folderId, newName });
    invalidate();
  }, [renameFolderMut, invalidate]);

  const isPending =
    uploadMut.isPending || deleteMut.isPending || renameMut.isPending ||
    moveMut.isPending || saveMut.isPending || createFolderMut.isPending ||
    deleteFolderMut.isPending || renameFolderMut.isPending;

  return {
    uploadFile, downloadFile,
    saveSpreadsheet, saveCode, saveRichText,
    deleteFile, renameFile, moveFile,
    createFolder, deleteFolder, renameFolder,
    invalidate, isPending,
  };
}
