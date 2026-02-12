/**
 * ZIP Generator Service
 * 用于生成和管理会议转录导出的ZIP压缩包
 */

import archiver from "archiver";
import { Readable, PassThrough } from "stream";
import { requireDb } from "../db";
// import { exportHistory } from "@/drizzle/schema";
// import { eq, inArray } from "drizzle-orm";

interface ExportFile {
  filename: string;
  content: string | Buffer;
  mimeType?: string;
}

interface ZipGenerationOptions {
  filename?: string;
  compressionLevel?: number; // 0-9, default 6
  includeMetadata?: boolean;
}

/**
 * 生成ZIP压缩包
 */
export async function generateZipArchive(
  files: ExportFile[],
  options: ZipGenerationOptions = {}
): Promise<PassThrough> {
  const {
    filename = `export-${Date.now()}.zip`,
    compressionLevel = 6,
    includeMetadata = true,
  } = options;

  const output = new PassThrough();
  const archive = archiver("zip", {
    zlib: { level: compressionLevel },
  });

  // 处理错误
  archive.on("error", (err) => {
    output.destroy(err);
  });

  output.on("error", (err) => {
    archive.destroy();
  });

  // 将archive连接到output流
  archive.pipe(output);

  // 添加文件到压缩包
  for (const file of files) {
    archive.append(file.content, {
      name: file.filename,
    });
  }

  // 如果需要添加元数据
  if (includeMetadata) {
    const metadata = {
      generatedAt: new Date().toISOString(),
      fileCount: files.length,
      totalSize: files.reduce((sum, f) => {
        const size = typeof f.content === "string" ? f.content.length : f.content.length;
        return sum + size;
      }, 0),
    };
    archive.append(JSON.stringify(metadata, null, 2), {
      name: "metadata.json",
    });
  }

  // 完成压缩
  await archive.finalize();

  return output;
}

/**
 * 生成会议批量导出ZIP包
 */
export async function generateMeetingBatchExportZip(
  meetingIds: number[],
  exportOptions: {
    format: "markdown" | "html";
    includeTranscript: boolean;
    includeDecisions: boolean;
    includeActionItems: boolean;
    includeSummary: boolean;
  },
  files: ExportFile[] = [],
  options: ZipGenerationOptions = {}
): Promise<PassThrough> {
  // 如果没有提供文件，创建占位符
  if (files.length === 0) {
    files.push({
      filename: "README.txt",
      content: `Batch export for ${meetingIds.length} meetings.`,
    });
  }

  return generateZipArchive(files, options);
}

/**
 * 计算ZIP文件的预估大小
 */
export function estimateZipSize(files: ExportFile[]): number {
  let totalSize = 0;

  // 计算文件内容大小
  for (const file of files) {
    const size = typeof file.content === "string" ? file.content.length : file.content.length;
    totalSize += size;
  }

  // 添加ZIP开销（通常为总大小的5-10%）
  const overhead = Math.ceil(totalSize * 0.1);

  return totalSize + overhead;
}

/**
 * 获取ZIP文件的MIME类型
 */
export function getZipMimeType(): string {
  return "application/zip";
}

/**
 * 生成ZIP文件名
 */
export function generateZipFilename(
  prefix: string = "export",
  timestamp: boolean = true
): string {
  let filename = prefix;

  if (timestamp) {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
    filename += `-${dateStr}-${timeStr}`;
  }

  filename += ".zip";
  return filename;
}

/**
 * 验证导出文件列表
 */
export function validateExportFiles(files: ExportFile[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!files || files.length === 0) {
    errors.push("Export files list is empty");
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (!file.filename) {
      errors.push(`File ${i} is missing filename`);
    }

    if (!file.content) {
      errors.push(`File ${i} is missing content`);
    }

    if (file.filename && file.filename.length > 255) {
      errors.push(`File ${i} filename exceeds 255 characters`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 创建单个文件的ZIP包
 */
export async function createSingleFileZip(
  filename: string,
  content: string | Buffer,
  options: ZipGenerationOptions = {}
): Promise<PassThrough> {
  return generateZipArchive(
    [
      {
        filename,
        content,
      },
    ],
    options
  );
}

/**
 * 创建目录结构的ZIP包
 */
export async function createDirectoryZip(
  files: Array<{
    path: string;
    content: string | Buffer;
  }>,
  options: ZipGenerationOptions = {}
): Promise<PassThrough> {
  const output = new PassThrough();
  const archive = archiver("zip", {
    zlib: { level: options.compressionLevel || 6 },
  });

  archive.on("error", (err) => {
    output.destroy(err);
  });

  output.on("error", (err) => {
    archive.destroy();
  });

  archive.pipe(output);

  for (const file of files) {
    archive.append(file.content, {
      name: file.path,
    });
  }

  await archive.finalize();
  return output;
}
