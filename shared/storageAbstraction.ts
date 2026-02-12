/**
 * GRT智能系统 - S3兼容存储抽象层
 * 版本: v2.6.2
 * 
 * 规范：
 * - 支持AWS S3、阿里云OSS、MinIO、本地文件系统
 * - 无状态服务设计，不依赖本地特定物理路径
 * - 便于本地存储与云端对象存储的平滑切换
 */

// 存储提供商类型
export const STORAGE_PROVIDERS = ['aws_s3', 'aliyun_oss', 'minio', 'local_fs'] as const;
export type StorageProvider = typeof STORAGE_PROVIDERS[number];

// 存储配置接口
export interface StorageConfig {
  provider: StorageProvider;
  endpoint?: string;
  bucket: string;
  accessKey?: string;
  secretKey?: string;
  region?: string;
  localPath?: string;  // 仅local_fs使用
  publicUrl?: string;  // 公开访问URL前缀
}

// 上传选项
export interface PutOptions {
  contentType?: string;
  contentDisposition?: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
  acl?: 'private' | 'public-read';
  organizationId?: string;  // 多租户隔离
}

// 上传结果
export interface PutResult {
  key: string;
  url: string;
  etag?: string;
  size: number;
}

// 获取选项
export interface GetOptions {
  expiresIn?: number;  // 预签名URL过期时间（秒）
  responseContentType?: string;
  responseContentDisposition?: string;
}

// 获取结果
export interface GetResult {
  key: string;
  url: string;
  expiresAt?: Date;
}

// 列表选项
export interface ListOptions {
  prefix?: string;
  maxKeys?: number;
  continuationToken?: string;
  organizationId?: string;
}

// 列表结果
export interface ListResult {
  keys: string[];
  isTruncated: boolean;
  nextContinuationToken?: string;
  totalCount: number;
}

// 同步结果
export interface SyncResult {
  copied: number;
  skipped: number;
  failed: number;
  errors: string[];
}

/**
 * S3兼容存储接口
 */
export interface S3CompatibleStorage {
  /**
   * 上传文件
   */
  put(key: string, data: Buffer | Uint8Array | string, options?: PutOptions): Promise<PutResult>;
  
  /**
   * 获取预签名URL
   */
  get(key: string, options?: GetOptions): Promise<GetResult>;
  
  /**
   * 删除文件
   */
  delete(key: string): Promise<void>;
  
  /**
   * 批量删除
   */
  deleteMany(keys: string[]): Promise<{ deleted: string[]; failed: string[] }>;
  
  /**
   * 列出文件
   */
  list(options?: ListOptions): Promise<ListResult>;
  
  /**
   * 检查文件是否存在
   */
  exists(key: string): Promise<boolean>;
  
  /**
   * 获取文件元数据
   */
  head(key: string): Promise<{ size: number; contentType: string; lastModified: Date } | null>;
  
  /**
   * 复制文件
   */
  copy(sourceKey: string, targetKey: string): Promise<void>;
  
  /**
   * 跨提供商同步
   */
  syncTo(targetStorage: S3CompatibleStorage, options?: ListOptions): Promise<SyncResult>;
}

/**
 * 生成带租户隔离的存储键
 */
export function generateStorageKey(
  organizationId: string,
  category: string,
  filename: string,
  addRandomSuffix: boolean = true
): string {
  const timestamp = Date.now().toString(36);
  const randomSuffix = addRandomSuffix ? `-${Math.random().toString(36).substring(2, 8)}` : '';
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  return `${organizationId}/${category}/${timestamp}${randomSuffix}-${sanitizedFilename}`;
}

/**
 * 解析存储键获取组织ID
 */
export function parseStorageKey(key: string): { organizationId: string; category: string; filename: string } | null {
  const parts = key.split('/');
  if (parts.length < 3) {
    return null;
  }
  
  return {
    organizationId: parts[0],
    category: parts[1],
    filename: parts.slice(2).join('/')
  };
}

/**
 * 验证存储键格式
 */
export function isValidStorageKey(key: string): boolean {
  // 不允许以/开头或结尾，不允许连续的/
  if (key.startsWith('/') || key.endsWith('/') || key.includes('//')) {
    return false;
  }
  
  // 不允许特殊字符
  const invalidChars = /[<>:"|?*\\]/;
  if (invalidChars.test(key)) {
    return false;
  }
  
  // 长度限制
  if (key.length > 1024) {
    return false;
  }
  
  return true;
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return '';
  }
  return filename.substring(lastDot + 1).toLowerCase();
}

/**
 * 根据扩展名获取MIME类型
 */
export function getMimeType(filename: string): string {
  const ext = getFileExtension(filename);
  const mimeTypes: Record<string, string> = {
    // 图片
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    // 文档
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // 文本
    'txt': 'text/plain',
    'csv': 'text/csv',
    'json': 'application/json',
    'xml': 'application/xml',
    // 压缩
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    // 视频
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'avi': 'video/x-msvideo',
    // 音频
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 存储配额检查
 */
export interface StorageQuota {
  organizationId: string;
  quotaGb: number;
  usedGb: number;
  fileCount: number;
  maxFileCount: number;
}

/**
 * 检查存储配额
 */
export function checkStorageQuota(
  quota: StorageQuota,
  additionalSizeBytes: number
): { allowed: boolean; reason?: string } {
  const additionalSizeGb = additionalSizeBytes / (1024 * 1024 * 1024);
  
  if (quota.usedGb + additionalSizeGb > quota.quotaGb) {
    return {
      allowed: false,
      reason: `Storage quota exceeded. Used: ${quota.usedGb.toFixed(2)}GB, Quota: ${quota.quotaGb}GB`
    };
  }
  
  if (quota.fileCount >= quota.maxFileCount) {
    return {
      allowed: false,
      reason: `File count limit reached. Current: ${quota.fileCount}, Max: ${quota.maxFileCount}`
    };
  }
  
  return { allowed: true };
}

/**
 * 迁移任务配置
 */
export interface MigrationConfig {
  sourceStorage: S3CompatibleStorage;
  targetStorage: S3CompatibleStorage;
  batchSize: number;
  concurrency: number;
  retryAttempts: number;
  dryRun: boolean;
  onProgress?: (progress: MigrationProgress) => void;
}

/**
 * 迁移进度
 */
export interface MigrationProgress {
  totalFiles: number;
  processedFiles: number;
  copiedFiles: number;
  skippedFiles: number;
  failedFiles: number;
  currentFile: string;
  bytesTransferred: number;
  estimatedTimeRemaining: number;
}
