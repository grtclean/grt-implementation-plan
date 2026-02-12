/**
 * GRT智能系统错误码定义
 * v2.6.0 - 扩展工业安全和物联网错误码
 */

export const ErrorCodes = {
  // 通用错误 (1xxx)
  GENERAL_ERROR: { code: 'ERR_001', message: '系统错误', httpStatus: 500 },
  VALIDATION_ERROR: { code: 'ERR_002', message: '数据验证失败', httpStatus: 400 },
  NOT_FOUND: { code: 'ERR_003', message: '资源未找到', httpStatus: 404 },
  UNAUTHORIZED: { code: 'ERR_004', message: '未授权访问', httpStatus: 401 },
  FORBIDDEN: { code: 'ERR_005', message: '禁止访问', httpStatus: 403 },
  
  // AI助手错误 (AI_xxx)
  AI_001: { code: 'AI_001', message: 'AI服务不可用', httpStatus: 503 },
  AI_002: { code: 'AI_002', message: 'AI响应超时', httpStatus: 504 },
  AI_003: { code: 'AI_003', message: '数据验证失败 - AI建议参数超出安全阈值', httpStatus: 400 },
  AI_004: { code: 'AI_004', message: 'AI建议置信度过低', httpStatus: 400 },
  AI_005: { code: 'AI_005', message: 'AI模型加载失败', httpStatus: 500 },
  AI_006: { code: 'AI_006', message: 'AI上下文长度超限', httpStatus: 400 },
  AI_007: { code: 'AI_007', message: 'AI执行模式不支持', httpStatus: 400 },
  AI_008: { code: 'AI_008', message: 'AI学习记录保存失败', httpStatus: 500 },
  AI_009: { code: 'AI_009', message: '安全规则冲突 - AI建议与工业安全规则冲突', httpStatus: 400 },
  AI_010: { code: 'AI_010', message: '物联网指令超时 - IoT设备响应超时', httpStatus: 504 },
  AI_011: { code: 'AI_011', message: '物理超限警告 - 参数接近安全边界', httpStatus: 400 },
  AI_012: { code: 'AI_012', message: '资质不足 - 操作员资质不满足要求', httpStatus: 403 },
  
  // 工业安全错误 (SAFETY_xxx)
  SAFETY_001: { code: 'SAFETY_001', message: '温度参数超出安全范围', httpStatus: 400 },
  SAFETY_002: { code: 'SAFETY_002', message: '压力参数超出安全范围', httpStatus: 400 },
  SAFETY_003: { code: 'SAFETY_003', message: '材质-参数组合不兼容', httpStatus: 400 },
  SAFETY_004: { code: 'SAFETY_004', message: '安全规则库查询失败', httpStatus: 500 },
  SAFETY_005: { code: 'SAFETY_005', message: '安全阈值未配置', httpStatus: 400 },
  SAFETY_006: { code: 'SAFETY_006', message: '安全校验被绕过', httpStatus: 403 },
  
  // 物联网错误 (IOT_xxx)
  IOT_001: { code: 'IOT_001', message: 'IoT设备连接失败', httpStatus: 503 },
  IOT_002: { code: 'IOT_002', message: 'PLC寄存器地址无效', httpStatus: 400 },
  IOT_003: { code: 'IOT_003', message: 'IoT数据类型转换失败', httpStatus: 400 },
  IOT_004: { code: 'IOT_004', message: 'IoT设备写入失败', httpStatus: 500 },
  IOT_005: { code: 'IOT_005', message: 'IoT设备映射未配置', httpStatus: 400 },
  
  // 流程笔记错误 (NOTEBOOK_xxx)
  NOTEBOOK_001: { code: 'NOTEBOOK_001', message: '笔记创建失败', httpStatus: 500 },
  NOTEBOOK_002: { code: 'NOTEBOOK_002', message: '附件上传失败', httpStatus: 500 },
  NOTEBOOK_003: { code: 'NOTEBOOK_003', message: 'OCR识别失败', httpStatus: 500 },
  NOTEBOOK_004: { code: 'NOTEBOOK_004', message: '语音转文字失败', httpStatus: 500 },
  NOTEBOOK_005: { code: 'NOTEBOOK_005', message: '跨流程溯源失败', httpStatus: 500 },
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

/**
 * 创建标准化错误响应
 */
export function createErrorResponse(errorCode: ErrorCode, details?: string) {
  const error = ErrorCodes[errorCode];
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: details || null,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * 工业安全错误类
 */
export class IndustrialSafetyError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly details?: string;
  
  constructor(errorCode: ErrorCode, details?: string) {
    const error = ErrorCodes[errorCode];
    super(error.message);
    this.name = 'IndustrialSafetyError';
    this.code = error.code;
    this.httpStatus = error.httpStatus;
    this.details = details;
  }
}

/**
 * AI执行错误类
 */
export class AiExecutionError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly details?: string;
  
  constructor(errorCode: ErrorCode, details?: string) {
    const error = ErrorCodes[errorCode];
    super(error.message);
    this.name = 'AiExecutionError';
    this.code = error.code;
    this.httpStatus = error.httpStatus;
    this.details = details;
  }
}

/**
 * IoT通信错误类
 */
export class IoTCommunicationError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly details?: string;
  
  constructor(errorCode: ErrorCode, details?: string) {
    const error = ErrorCodes[errorCode];
    super(error.message);
    this.name = 'IoTCommunicationError';
    this.code = error.code;
    this.httpStatus = error.httpStatus;
    this.details = details;
  }
}
