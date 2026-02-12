/**
 * GRT智能系统 - 多语言国际化支持
 * 版本: v2.6.2
 * 
 * 规范：
 * - 支持中文(zh-CN)、英文(en-US)、德文(de-DE)三种语言
 * - AI助手根据Client.location自动切换语种
 * - 支持实时翻译功能
 */

// 支持的语言列表
export const SUPPORTED_LANGUAGES = ['zh-CN', 'en-US', 'de-DE'] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// 语言信息
export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  region: string;
}

// 语言详细信息
export const LANGUAGE_INFO: Record<SupportedLanguage, LanguageInfo> = {
  'zh-CN': {
    code: 'zh-CN',
    name: 'Chinese (Simplified)',
    nativeName: '简体中文',
    direction: 'ltr',
    region: 'asia'
  },
  'en-US': {
    code: 'en-US',
    name: 'English (US)',
    nativeName: 'English',
    direction: 'ltr',
    region: 'americas'
  },
  'de-DE': {
    code: 'de-DE',
    name: 'German',
    nativeName: 'Deutsch',
    direction: 'ltr',
    region: 'europe'
  }
};

// 区域到语言映射
export const REGION_LANGUAGE_MAP: Record<string, SupportedLanguage> = {
  'CN': 'zh-CN',
  'TW': 'zh-CN',
  'HK': 'zh-CN',
  'US': 'en-US',
  'GB': 'en-US',
  'AU': 'en-US',
  'CA': 'en-US',
  'DE': 'de-DE',
  'AT': 'de-DE',
  'CH': 'de-DE'
};

// 语言检测优先级
export const LANGUAGE_DETECTION_PRIORITY = [
  'user_preference',
  'client_location',
  'browser_locale',
  'default'
] as const;

/**
 * AI多语言配置
 */
export interface AILanguageConfig {
  defaultLanguage: SupportedLanguage;
  supportedLanguages: SupportedLanguage[];
  autoDetect: boolean;
  translationEnabled: boolean;
  translationEngine: 'built-in' | 'google' | 'deepl';
}

// 默认AI语言配置
export const DEFAULT_AI_LANGUAGE_CONFIG: AILanguageConfig = {
  defaultLanguage: 'zh-CN',
  supportedLanguages: ['zh-CN', 'en-US', 'de-DE'],
  autoDetect: true,
  translationEnabled: true,
  translationEngine: 'built-in'
};

/**
 * 验证语言代码是否有效
 */
export function isValidLanguage(language: string): language is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage);
}

/**
 * 根据区域代码获取默认语言
 */
export function getLanguageForRegion(regionCode: string): SupportedLanguage {
  return REGION_LANGUAGE_MAP[regionCode.toUpperCase()] || 'zh-CN';
}

/**
 * 获取语言显示名称
 */
export function getLanguageDisplayName(
  language: SupportedLanguage,
  displayIn: SupportedLanguage = 'zh-CN'
): string {
  const names: Record<SupportedLanguage, Record<SupportedLanguage, string>> = {
    'zh-CN': {
      'zh-CN': '简体中文',
      'en-US': '英语',
      'de-DE': '德语'
    },
    'en-US': {
      'zh-CN': 'Chinese',
      'en-US': 'English',
      'de-DE': 'German'
    },
    'de-DE': {
      'zh-CN': 'Chinesisch',
      'en-US': 'Englisch',
      'de-DE': 'Deutsch'
    }
  };
  
  return names[displayIn]?.[language] || language;
}

/**
 * 检测文本语言（简单实现）
 */
export function detectLanguage(text: string): SupportedLanguage {
  // 检测中文字符
  const chineseRegex = /[\u4e00-\u9fa5]/;
  if (chineseRegex.test(text)) {
    return 'zh-CN';
  }
  
  // 检测德语特殊字符
  const germanRegex = /[äöüßÄÖÜ]/;
  if (germanRegex.test(text)) {
    return 'de-DE';
  }
  
  // 默认英语
  return 'en-US';
}

/**
 * AI响应语言选择器
 */
export function selectAIResponseLanguage(
  userPreference: SupportedLanguage | null,
  clientLocation: string | null,
  browserLocale: string | null
): SupportedLanguage {
  // 1. 用户偏好优先
  if (userPreference && isValidLanguage(userPreference)) {
    return userPreference;
  }
  
  // 2. 客户位置
  if (clientLocation) {
    const langFromLocation = getLanguageForRegion(clientLocation);
    if (langFromLocation) {
      return langFromLocation;
    }
  }
  
  // 3. 浏览器语言
  if (browserLocale) {
    const normalizedLocale = browserLocale.split('-')[0];
    if (normalizedLocale === 'zh') return 'zh-CN';
    if (normalizedLocale === 'de') return 'de-DE';
    if (normalizedLocale === 'en') return 'en-US';
  }
  
  // 4. 默认中文
  return 'zh-CN';
}

/**
 * 翻译请求接口
 */
export interface TranslationRequest {
  text: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  context?: string;
}

/**
 * 翻译结果接口
 */
export interface TranslationResult {
  translatedText: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  confidence: number;
  engine: string;
}

/**
 * 多语言文本模板
 */
export interface MultilingualText {
  'zh-CN': string;
  'en-US': string;
  'de-DE': string;
}

/**
 * 获取多语言文本
 */
export function getLocalizedText(
  texts: MultilingualText,
  language: SupportedLanguage
): string {
  return texts[language] || texts['zh-CN'];
}

/**
 * 创建多语言文本对象
 */
export function createMultilingualText(
  zhCN: string,
  enUS: string,
  deDE: string
): MultilingualText {
  return {
    'zh-CN': zhCN,
    'en-US': enUS,
    'de-DE': deDE
  };
}

// 常用系统消息的多语言文本
export const SYSTEM_MESSAGES = {
  welcome: createMultilingualText(
    '欢迎使用GRT智能系统',
    'Welcome to GRT Intelligent System',
    'Willkommen beim GRT Intelligenten System'
  ),
  loginRequired: createMultilingualText(
    '请先登录以继续操作',
    'Please log in to continue',
    'Bitte melden Sie sich an, um fortzufahren'
  ),
  operationSuccess: createMultilingualText(
    '操作成功',
    'Operation successful',
    'Vorgang erfolgreich'
  ),
  operationFailed: createMultilingualText(
    '操作失败，请重试',
    'Operation failed, please try again',
    'Vorgang fehlgeschlagen, bitte erneut versuchen'
  ),
  authenticationRequired: createMultilingualText(
    '需要认证才能访问此内容',
    'Authentication required to access this content',
    'Authentifizierung erforderlich für diesen Inhalt'
  ),
  noPermission: createMultilingualText(
    '您没有权限执行此操作',
    'You do not have permission to perform this action',
    'Sie haben keine Berechtigung für diese Aktion'
  )
};
