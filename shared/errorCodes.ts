/**
 * GRT智能系统错误码定义
 * v2.7.0 - i18n: multi-language error messages (zh/en/de/fr)
 */

type SupportedLanguage = 'zh' | 'en' | 'de' | 'fr';

export const ErrorCodes = {
  // 通用错误 (1xxx)
  GENERAL_ERROR: { code: 'ERR_001', message: { zh: '系统错误', en: 'System error', de: 'Systemfehler', fr: 'Erreur système' }, httpStatus: 500 },
  VALIDATION_ERROR: { code: 'ERR_002', message: { zh: '数据验证失败', en: 'Validation failed', de: 'Validierung fehlgeschlagen', fr: 'Échec de la validation' }, httpStatus: 400 },
  NOT_FOUND: { code: 'ERR_003', message: { zh: '资源未找到', en: 'Resource not found', de: 'Ressource nicht gefunden', fr: 'Ressource non trouvée' }, httpStatus: 404 },
  UNAUTHORIZED: { code: 'ERR_004', message: { zh: '未授权访问', en: 'Unauthorized access', de: 'Nicht autorisierter Zugriff', fr: 'Accès non autorisé' }, httpStatus: 401 },
  FORBIDDEN: { code: 'ERR_005', message: { zh: '禁止访问', en: 'Access forbidden', de: 'Zugriff verboten', fr: 'Accès interdit' }, httpStatus: 403 },

  // AI助手错误 (AI_xxx)
  AI_001: { code: 'AI_001', message: { zh: 'AI服务不可用', en: 'AI service unavailable', de: 'KI-Dienst nicht verfügbar', fr: 'Service IA indisponible' }, httpStatus: 503 },
  AI_002: { code: 'AI_002', message: { zh: 'AI响应超时', en: 'AI response timeout', de: 'KI-Antwort-Timeout', fr: "Délai d'attente de la réponse IA" }, httpStatus: 504 },
  AI_003: { code: 'AI_003', message: { zh: '数据验证失败 - AI建议参数超出安全阈值', en: 'Validation failed - AI suggestion parameters exceed safety threshold', de: 'Validierung fehlgeschlagen - KI-Vorschlagsparameter überschreiten Sicherheitsschwelle', fr: 'Validation échouée - Les paramètres de suggestion IA dépassent le seuil de sécurité' }, httpStatus: 400 },
  AI_004: { code: 'AI_004', message: { zh: 'AI建议置信度过低', en: 'AI suggestion confidence too low', de: 'KI-Vorschlagsvertrauen zu niedrig', fr: 'Confiance de la suggestion IA trop faible' }, httpStatus: 400 },
  AI_005: { code: 'AI_005', message: { zh: 'AI模型加载失败', en: 'AI model loading failed', de: 'KI-Modell konnte nicht geladen werden', fr: "Échec du chargement du modèle IA" }, httpStatus: 500 },
  AI_006: { code: 'AI_006', message: { zh: 'AI上下文长度超限', en: 'AI context length exceeded', de: 'KI-Kontextlänge überschritten', fr: 'Longueur du contexte IA dépassée' }, httpStatus: 400 },
  AI_007: { code: 'AI_007', message: { zh: 'AI执行模式不支持', en: 'AI execution mode not supported', de: 'KI-Ausführungsmodus nicht unterstützt', fr: "Mode d'exécution IA non pris en charge" }, httpStatus: 400 },
  AI_008: { code: 'AI_008', message: { zh: 'AI学习记录保存失败', en: 'AI learning record save failed', de: 'KI-Lernprotokoll konnte nicht gespeichert werden', fr: "Échec de l'enregistrement du journal d'apprentissage IA" }, httpStatus: 500 },
  AI_009: { code: 'AI_009', message: { zh: '安全规则冲突 - AI建议与工业安全规则冲突', en: 'Safety rule conflict - AI suggestion conflicts with industrial safety rules', de: 'Sicherheitsregelkonflikt - KI-Vorschlag steht im Widerspruch zu Industriesicherheitsregeln', fr: 'Conflit de règles de sécurité - La suggestion IA est en conflit avec les règles de sécurité industrielle' }, httpStatus: 400 },
  AI_010: { code: 'AI_010', message: { zh: '物联网指令超时 - IoT设备响应超时', en: 'IoT command timeout - IoT device response timeout', de: 'IoT-Befehl-Timeout - IoT-Geräteantwort-Timeout', fr: "Délai d'attente de commande IoT - Délai de réponse du dispositif IoT" }, httpStatus: 504 },
  AI_011: { code: 'AI_011', message: { zh: '物理超限警告 - 参数接近安全边界', en: 'Physical limit warning - parameters approaching safety boundary', de: 'Physikalische Grenzwertwarnung - Parameter nähern sich der Sicherheitsgrenze', fr: 'Avertissement de limite physique - Paramètres approchant la limite de sécurité' }, httpStatus: 400 },
  AI_012: { code: 'AI_012', message: { zh: '资质不足 - 操作员资质不满足要求', en: 'Insufficient qualification - operator qualification does not meet requirements', de: 'Unzureichende Qualifikation - Bedienerqualifikation erfüllt nicht die Anforderungen', fr: "Qualification insuffisante - La qualification de l'opérateur ne répond pas aux exigences" }, httpStatus: 403 },

  // 工业安全错误 (SAFETY_xxx)
  SAFETY_001: { code: 'SAFETY_001', message: { zh: '温度参数超出安全范围', en: 'Temperature parameter out of safe range', de: 'Temperaturparameter außerhalb des sicheren Bereichs', fr: 'Paramètre de température hors de la plage de sécurité' }, httpStatus: 400 },
  SAFETY_002: { code: 'SAFETY_002', message: { zh: '压力参数超出安全范围', en: 'Pressure parameter out of safe range', de: 'Druckparameter außerhalb des sicheren Bereichs', fr: 'Paramètre de pression hors de la plage de sécurité' }, httpStatus: 400 },
  SAFETY_003: { code: 'SAFETY_003', message: { zh: '材质-参数组合不兼容', en: 'Material-parameter combination incompatible', de: 'Material-Parameter-Kombination inkompatibel', fr: 'Combinaison matériau-paramètre incompatible' }, httpStatus: 400 },
  SAFETY_004: { code: 'SAFETY_004', message: { zh: '安全规则库查询失败', en: 'Safety rule database query failed', de: 'Sicherheitsregeldatenbank-Abfrage fehlgeschlagen', fr: 'Échec de la requête de la base de règles de sécurité' }, httpStatus: 500 },
  SAFETY_005: { code: 'SAFETY_005', message: { zh: '安全阈值未配置', en: 'Safety threshold not configured', de: 'Sicherheitsschwelle nicht konfiguriert', fr: 'Seuil de sécurité non configuré' }, httpStatus: 400 },
  SAFETY_006: { code: 'SAFETY_006', message: { zh: '安全校验被绕过', en: 'Safety check bypassed', de: 'Sicherheitsprüfung umgangen', fr: 'Vérification de sécurité contournée' }, httpStatus: 403 },

  // 物联网错误 (IOT_xxx)
  IOT_001: { code: 'IOT_001', message: { zh: 'IoT设备连接失败', en: 'IoT device connection failed', de: 'IoT-Geräteverbindung fehlgeschlagen', fr: 'Échec de la connexion du dispositif IoT' }, httpStatus: 503 },
  IOT_002: { code: 'IOT_002', message: { zh: 'PLC寄存器地址无效', en: 'PLC register address invalid', de: 'PLC-Registeradresse ungültig', fr: 'Adresse de registre PLC invalide' }, httpStatus: 400 },
  IOT_003: { code: 'IOT_003', message: { zh: 'IoT数据类型转换失败', en: 'IoT data type conversion failed', de: 'IoT-Datentypkonvertierung fehlgeschlagen', fr: 'Échec de la conversion de type de données IoT' }, httpStatus: 400 },
  IOT_004: { code: 'IOT_004', message: { zh: 'IoT设备写入失败', en: 'IoT device write failed', de: 'IoT-Gerät-Schreibvorgang fehlgeschlagen', fr: "Échec de l'écriture sur le dispositif IoT" }, httpStatus: 500 },
  IOT_005: { code: 'IOT_005', message: { zh: 'IoT设备映射未配置', en: 'IoT device mapping not configured', de: 'IoT-Gerätezuordnung nicht konfiguriert', fr: 'Mappage du dispositif IoT non configuré' }, httpStatus: 400 },

  // 流程笔记错误 (NOTEBOOK_xxx)
  NOTEBOOK_001: { code: 'NOTEBOOK_001', message: { zh: '笔记创建失败', en: 'Note creation failed', de: 'Notizerstellung fehlgeschlagen', fr: 'Échec de la création de la note' }, httpStatus: 500 },
  NOTEBOOK_002: { code: 'NOTEBOOK_002', message: { zh: '附件上传失败', en: 'Attachment upload failed', de: 'Anhang-Upload fehlgeschlagen', fr: "Échec du téléchargement de la pièce jointe" }, httpStatus: 500 },
  NOTEBOOK_003: { code: 'NOTEBOOK_003', message: { zh: 'OCR识别失败', en: 'OCR recognition failed', de: 'OCR-Erkennung fehlgeschlagen', fr: "Échec de la reconnaissance OCR" }, httpStatus: 500 },
  NOTEBOOK_004: { code: 'NOTEBOOK_004', message: { zh: '语音转文字失败', en: 'Speech-to-text failed', de: 'Sprache-zu-Text fehlgeschlagen', fr: 'Échec de la conversion parole-texte' }, httpStatus: 500 },
  NOTEBOOK_005: { code: 'NOTEBOOK_005', message: { zh: '跨流程溯源失败', en: 'Cross-process traceability failed', de: 'Prozessübergreifende Rückverfolgung fehlgeschlagen', fr: 'Échec de la traçabilité inter-processus' }, httpStatus: 500 },
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

/**
 * 创建标准化错误响应 (i18n-aware)
 */
export function createErrorResponse(errorCode: ErrorCode, details?: string, language: SupportedLanguage = 'zh') {
  const error = ErrorCodes[errorCode];
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message[language],
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

  constructor(errorCode: ErrorCode, details?: string, language: SupportedLanguage = 'zh') {
    const error = ErrorCodes[errorCode];
    super(error.message[language]);
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

  constructor(errorCode: ErrorCode, details?: string, language: SupportedLanguage = 'zh') {
    const error = ErrorCodes[errorCode];
    super(error.message[language]);
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

  constructor(errorCode: ErrorCode, details?: string, language: SupportedLanguage = 'zh') {
    const error = ErrorCodes[errorCode];
    super(error.message[language]);
    this.name = 'IoTCommunicationError';
    this.code = error.code;
    this.httpStatus = error.httpStatus;
    this.details = details;
  }
}
