/**
 * GRT智能系统 - 区域假期日历与工作日计算
 * 覆盖: CN (含调休) / DE (联邦+柏林) / US (联邦)
 */

export interface Holiday {
  date: string;       // YYYY-MM-DD
  name: string;
  nameEn: string;
  type: "public" | "company" | "swap";
  /** swap=调休上班日 (CN specific, isWorkday=true means this holiday date is actually a workday) */
  isWorkday?: boolean;
}

// ============================================================
// 中国 2026 法定节假日 + 调休
// ============================================================
export const CN_HOLIDAYS_2026: Holiday[] = [
  // 元旦
  { date: "2026-01-01", name: "元旦", nameEn: "New Year", type: "public" },
  // 春节 (1/28 除夕 ~ 2/3)
  { date: "2026-01-28", name: "春节(除夕)", nameEn: "Spring Festival Eve", type: "public" },
  { date: "2026-01-29", name: "春节", nameEn: "Spring Festival", type: "public" },
  { date: "2026-01-30", name: "春节", nameEn: "Spring Festival", type: "public" },
  { date: "2026-01-31", name: "春节", nameEn: "Spring Festival", type: "public" },
  { date: "2026-02-01", name: "春节", nameEn: "Spring Festival", type: "public" },
  { date: "2026-02-02", name: "春节", nameEn: "Spring Festival", type: "public" },
  { date: "2026-02-03", name: "春节", nameEn: "Spring Festival", type: "public" },
  // 春节调休上班
  { date: "2026-01-25", name: "春节调休上班", nameEn: "Spring Swap Work", type: "swap", isWorkday: true },
  { date: "2026-02-08", name: "春节调休上班", nameEn: "Spring Swap Work", type: "swap", isWorkday: true },
  // 清明节 (4/4~4/6)
  { date: "2026-04-04", name: "清明节", nameEn: "Qingming Festival", type: "public" },
  { date: "2026-04-05", name: "清明节", nameEn: "Qingming Festival", type: "public" },
  { date: "2026-04-06", name: "清明节", nameEn: "Qingming Festival", type: "public" },
  // 劳动节 (5/1~5/5)
  { date: "2026-05-01", name: "劳动节", nameEn: "Labor Day", type: "public" },
  { date: "2026-05-02", name: "劳动节", nameEn: "Labor Day", type: "public" },
  { date: "2026-05-03", name: "劳动节", nameEn: "Labor Day", type: "public" },
  { date: "2026-05-04", name: "劳动节", nameEn: "Labor Day", type: "public" },
  { date: "2026-05-05", name: "劳动节", nameEn: "Labor Day", type: "public" },
  // 端午节 (5/31~6/2)
  { date: "2026-05-31", name: "端午节", nameEn: "Dragon Boat Festival", type: "public" },
  { date: "2026-06-01", name: "端午节", nameEn: "Dragon Boat Festival", type: "public" },
  { date: "2026-06-02", name: "端午节", nameEn: "Dragon Boat Festival", type: "public" },
  // 中秋节 (9/25~9/27)
  { date: "2026-09-25", name: "中秋节", nameEn: "Mid-Autumn Festival", type: "public" },
  { date: "2026-09-26", name: "中秋节", nameEn: "Mid-Autumn Festival", type: "public" },
  { date: "2026-09-27", name: "中秋节", nameEn: "Mid-Autumn Festival", type: "public" },
  // 国庆节 (10/1~10/7)
  { date: "2026-10-01", name: "国庆节", nameEn: "National Day", type: "public" },
  { date: "2026-10-02", name: "国庆节", nameEn: "National Day", type: "public" },
  { date: "2026-10-03", name: "国庆节", nameEn: "National Day", type: "public" },
  { date: "2026-10-04", name: "国庆节", nameEn: "National Day", type: "public" },
  { date: "2026-10-05", name: "国庆节", nameEn: "National Day", type: "public" },
  { date: "2026-10-06", name: "国庆节", nameEn: "National Day", type: "public" },
  { date: "2026-10-07", name: "国庆节", nameEn: "National Day", type: "public" },
  // 国庆调休上班
  { date: "2026-09-28", name: "国庆调休上班", nameEn: "National Day Swap", type: "swap", isWorkday: true },
  { date: "2026-10-11", name: "国庆调休上班", nameEn: "National Day Swap", type: "swap", isWorkday: true },
  // GRT年末停工
  { date: "2026-12-28", name: "年末停工", nameEn: "Year-end Shutdown", type: "company" },
  { date: "2026-12-29", name: "年末停工", nameEn: "Year-end Shutdown", type: "company" },
  { date: "2026-12-30", name: "年末停工", nameEn: "Year-end Shutdown", type: "company" },
  { date: "2026-12-31", name: "年末停工", nameEn: "Year-end Shutdown", type: "company" },
];

// ============================================================
// 德国 2026 联邦 + 柏林州假日
// ============================================================
export const DE_HOLIDAYS_2026: Holiday[] = [
  { date: "2026-01-01", name: "Neujahr", nameEn: "New Year", type: "public" },
  { date: "2026-04-03", name: "Karfreitag", nameEn: "Good Friday", type: "public" },
  { date: "2026-04-06", name: "Ostermontag", nameEn: "Easter Monday", type: "public" },
  { date: "2026-05-01", name: "Tag der Arbeit", nameEn: "Labour Day", type: "public" },
  { date: "2026-05-14", name: "Christi Himmelfahrt", nameEn: "Ascension Day", type: "public" },
  { date: "2026-05-25", name: "Pfingstmontag", nameEn: "Whit Monday", type: "public" },
  { date: "2026-10-03", name: "Tag der Deutschen Einheit", nameEn: "German Unity Day", type: "public" },
  { date: "2026-12-25", name: "1. Weihnachtstag", nameEn: "Christmas Day", type: "public" },
  { date: "2026-12-26", name: "2. Weihnachtstag", nameEn: "Boxing Day", type: "public" },
  // GRT year-end shutdown (DE office)
  { date: "2026-12-28", name: "Betriebsferien", nameEn: "Company Shutdown", type: "company" },
  { date: "2026-12-29", name: "Betriebsferien", nameEn: "Company Shutdown", type: "company" },
  { date: "2026-12-30", name: "Betriebsferien", nameEn: "Company Shutdown", type: "company" },
  { date: "2026-12-31", name: "Betriebsferien", nameEn: "Company Shutdown", type: "company" },
];

// ============================================================
// 美国 2026 联邦假日
// ============================================================
export const US_HOLIDAYS_2026: Holiday[] = [
  { date: "2026-01-01", name: "New Year's Day", nameEn: "New Year's Day", type: "public" },
  { date: "2026-01-19", name: "Martin Luther King Jr. Day", nameEn: "MLK Day", type: "public" },
  { date: "2026-02-16", name: "Presidents' Day", nameEn: "Presidents' Day", type: "public" },
  { date: "2026-05-25", name: "Memorial Day", nameEn: "Memorial Day", type: "public" },
  { date: "2026-07-03", name: "Independence Day (observed)", nameEn: "Independence Day", type: "public" },
  { date: "2026-09-07", name: "Labor Day", nameEn: "Labor Day", type: "public" },
  { date: "2026-10-12", name: "Columbus Day", nameEn: "Columbus Day", type: "public" },
  { date: "2026-11-11", name: "Veterans Day", nameEn: "Veterans Day", type: "public" },
  { date: "2026-11-26", name: "Thanksgiving Day", nameEn: "Thanksgiving", type: "public" },
  { date: "2026-12-25", name: "Christmas Day", nameEn: "Christmas Day", type: "public" },
  // GRT US year-end
  { date: "2026-12-28", name: "Company Shutdown", nameEn: "Company Shutdown", type: "company" },
  { date: "2026-12-29", name: "Company Shutdown", nameEn: "Company Shutdown", type: "company" },
  { date: "2026-12-30", name: "Company Shutdown", nameEn: "Company Shutdown", type: "company" },
  { date: "2026-12-31", name: "Company Shutdown", nameEn: "Company Shutdown", type: "company" },
];

export type Region = "CN" | "DE" | "US";

const HOLIDAY_MAP: Record<Region, Holiday[]> = {
  CN: CN_HOLIDAYS_2026,
  DE: DE_HOLIDAYS_2026,
  US: US_HOLIDAYS_2026,
};

/**
 * 获取指定区域的假日列表
 */
export function getHolidaysForRegion(region: Region): Holiday[] {
  return HOLIDAY_MAP[region] ?? [];
}

/**
 * 判断某日期是否为指定区域的非工作日
 */
export function isNonWorkingDay(dateStr: string, region: Region): boolean {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
  const holidays = getHolidaysForRegion(region);

  // CN调休: swap+isWorkday means this date IS a workday despite being weekend
  const swapWorkday = holidays.find((h) => h.date === dateStr && h.type === "swap" && h.isWorkday);
  if (swapWorkday) return false;

  // Weekend
  if (dayOfWeek === 0 || dayOfWeek === 6) return true;

  // Public/company holiday
  const isHoliday = holidays.some((h) => h.date === dateStr && !h.isWorkday);
  return isHoliday;
}

/**
 * 计算工作日结束日期
 */
export function calculateWorkingDays(
  startDate: string,
  workingDays: number,
  region: Region
): { endDate: string; calendarDays: number; holidaysEncountered: Holiday[] } {
  let current = new Date(startDate);
  let remaining = workingDays;
  const encountered: Holiday[] = [];
  let calendarDays = 0;

  while (remaining > 0) {
    const dateStr = current.toISOString().split("T")[0];
    if (!isNonWorkingDay(dateStr, region)) {
      remaining--;
    } else {
      const holiday = getHolidaysForRegion(region).find((h) => h.date === dateStr);
      if (holiday && !holiday.isWorkday) encountered.push(holiday);
    }
    if (remaining > 0) {
      current.setDate(current.getDate() + 1);
      calendarDays++;
    }
  }

  return {
    endDate: current.toISOString().split("T")[0],
    calendarDays: calendarDays + 1,
    holidaysEncountered: encountered,
  };
}

/**
 * 获取日期范围内的假日
 */
export function getHolidaysInRange(startDate: string, endDate: string, region: Region): Holiday[] {
  const holidays = getHolidaysForRegion(region);
  return holidays.filter((h) => !h.isWorkday && h.date >= startDate && h.date <= endDate);
}
