/**
 * GRT智能系统 - 多时区支持工具库
 * 版本: v2.6.2
 * 
 * 规范：
 * - 所有时间戳在数据库中以UTC格式存储
 * - 前端根据User.timezone自动转换显示
 * - 支持的时区: Asia/Shanghai, Europe/Berlin, America/New_York, Asia/Tokyo
 */

// 支持的时区列表
export const SUPPORTED_TIMEZONES = [
  'UTC',
  'Asia/Shanghai',      // 中国标准时间 (CST) UTC+8
  'Asia/Tokyo',         // 日本标准时间 (JST) UTC+9
  'Europe/Berlin',      // 中欧时间 (CET) UTC+1/+2
  'Europe/London',      // 格林威治时间 (GMT) UTC+0/+1
  'America/New_York',   // 美国东部时间 (EST) UTC-5/-4
  'America/Los_Angeles' // 美国太平洋时间 (PST) UTC-8/-7
] as const;

export type SupportedTimezone = typeof SUPPORTED_TIMEZONES[number];

// 时区显示名称映射
export const TIMEZONE_DISPLAY_NAMES: Record<SupportedTimezone, { zh: string; en: string; de: string }> = {
  'UTC': { zh: '协调世界时', en: 'Coordinated Universal Time', de: 'Koordinierte Weltzeit' },
  'Asia/Shanghai': { zh: '中国标准时间', en: 'China Standard Time', de: 'Chinesische Standardzeit' },
  'Asia/Tokyo': { zh: '日本标准时间', en: 'Japan Standard Time', de: 'Japanische Standardzeit' },
  'Europe/Berlin': { zh: '中欧时间', en: 'Central European Time', de: 'Mitteleuropäische Zeit' },
  'Europe/London': { zh: '格林威治时间', en: 'Greenwich Mean Time', de: 'Greenwich-Zeit' },
  'America/New_York': { zh: '美国东部时间', en: 'Eastern Time', de: 'Ostamerikanische Zeit' },
  'America/Los_Angeles': { zh: '美国太平洋时间', en: 'Pacific Time', de: 'Pazifische Zeit' }
};

// 区域到默认时区映射
export const REGION_TIMEZONE_MAP: Record<string, SupportedTimezone> = {
  'asia': 'Asia/Shanghai',
  'europe': 'Europe/Berlin',
  'americas': 'America/New_York'
};

/**
 * 将本地时间转换为UTC时间戳（毫秒）
 * @param localDate 本地日期对象或ISO字符串
 * @param timezone 用户时区
 * @returns UTC时间戳（毫秒）
 */
export function toUTCTimestamp(localDate: Date | string, timezone: SupportedTimezone): number {
  const date = typeof localDate === 'string' ? new Date(localDate) : localDate;
  
  // 使用Intl.DateTimeFormat获取时区偏移
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // 返回UTC时间戳
  return date.getTime();
}

/**
 * 将UTC时间戳转换为指定时区的本地时间字符串
 * @param utcTimestamp UTC时间戳（毫秒）
 * @param timezone 目标时区
 * @param format 输出格式
 * @returns 格式化的本地时间字符串
 */
export function toLocalTimeString(
  utcTimestamp: number,
  timezone: SupportedTimezone,
  format: 'date' | 'time' | 'datetime' | 'full' = 'datetime'
): string {
  const date = new Date(utcTimestamp);
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour12: false
  };
  
  switch (format) {
    case 'date':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      break;
    case 'time':
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      break;
    case 'datetime':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      break;
    case 'full':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      options.timeZoneName = 'short';
      break;
  }
  
  return new Intl.DateTimeFormat('zh-CN', options).format(date);
}

/**
 * 将UTC时间戳转换为ISO 8601格式字符串（带时区）
 * @param utcTimestamp UTC时间戳（毫秒）
 * @param timezone 目标时区
 * @returns ISO 8601格式字符串
 */
export function toISOStringWithTimezone(utcTimestamp: number, timezone: SupportedTimezone): string {
  const date = new Date(utcTimestamp);
  
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
  
  return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
}

/**
 * 获取两个时区之间的时差（小时）
 * @param fromTimezone 源时区
 * @param toTimezone 目标时区
 * @returns 时差（小时），正数表示目标时区更早
 */
export function getTimezoneOffset(fromTimezone: SupportedTimezone, toTimezone: SupportedTimezone): number {
  const now = new Date();
  
  const fromOffset = getTimezoneOffsetMinutes(now, fromTimezone);
  const toOffset = getTimezoneOffsetMinutes(now, toTimezone);
  
  return (toOffset - fromOffset) / 60;
}

/**
 * 获取指定时区相对于UTC的偏移（分钟）
 */
function getTimezoneOffsetMinutes(date: Date, timezone: SupportedTimezone): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return (utcDate.getTime() - tzDate.getTime()) / 60000;
}

/**
 * 验证时区是否有效
 * @param timezone 时区字符串
 * @returns 是否为支持的时区
 */
export function isValidTimezone(timezone: string): timezone is SupportedTimezone {
  return SUPPORTED_TIMEZONES.includes(timezone as SupportedTimezone);
}

/**
 * 获取当前UTC时间戳（毫秒）
 * @returns UTC时间戳
 */
export function getCurrentUTCTimestamp(): number {
  return Date.now();
}

/**
 * 格式化时区显示名称
 * @param timezone 时区
 * @param language 语言代码
 * @returns 显示名称
 */
export function getTimezoneDisplayName(
  timezone: SupportedTimezone,
  language: 'zh' | 'en' | 'de' = 'zh'
): string {
  return TIMEZONE_DISPLAY_NAMES[timezone]?.[language] || timezone;
}

/**
 * 根据区域获取默认时区
 * @param region 区域代码
 * @returns 默认时区
 */
export function getDefaultTimezoneForRegion(region: string): SupportedTimezone {
  return REGION_TIMEZONE_MAP[region.toLowerCase()] || 'UTC';
}
