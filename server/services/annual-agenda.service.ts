/**
 * Annual Corporate Agenda Service
 * Based on Gemini Design: GRT System Architect
 * Task: Initialize Annual Corporate Agenda based on Strategy 2026-2030
 */

// 全球假期数据
const GLOBAL_HOLIDAYS: Record<string, { name: string; nameEn: string; date: string }[]> = {
  CN: [
    { name: '春节', nameEn: 'Chinese New Year', date: '01-28' }, // 2026年春节
    { name: '清明节', nameEn: 'Qingming Festival', date: '04-05' },
    { name: '劳动节', nameEn: 'Labor Day', date: '05-01' },
    { name: '端午节', nameEn: 'Dragon Boat Festival', date: '06-14' },
    { name: '中秋节', nameEn: 'Mid-Autumn Festival', date: '09-21' },
    { name: '国庆节', nameEn: 'National Day', date: '10-01' },
  ],
  US: [
    { name: '新年', nameEn: 'New Year', date: '01-01' },
    { name: '马丁路德金日', nameEn: 'MLK Day', date: '01-19' },
    { name: '总统日', nameEn: 'Presidents Day', date: '02-16' },
    { name: '阵亡将士纪念日', nameEn: 'Memorial Day', date: '05-25' },
    { name: '独立日', nameEn: 'Independence Day', date: '07-04' },
    { name: '劳动节', nameEn: 'Labor Day', date: '09-07' },
    { name: '感恩节', nameEn: 'Thanksgiving', date: '11-26' },
    { name: '圣诞节', nameEn: 'Christmas', date: '12-25' },
  ],
  EU: [
    { name: '新年', nameEn: 'New Year', date: '01-01' },
    { name: '复活节', nameEn: 'Easter', date: '04-05' },
    { name: '劳动节', nameEn: 'Labor Day', date: '05-01' },
    { name: '圣诞节', nameEn: 'Christmas', date: '12-25' },
    { name: '节礼日', nameEn: 'Boxing Day', date: '12-26' },
  ],
};

// 部门列表
const DEPARTMENTS = [
  'Sales',
  'Engineering',
  'Production',
  'Service',
  'Finance',
  'HR',
  'R&D',
  'Quality',
] as const;

type Department = (typeof DEPARTMENTS)[number];

// 里程碑类型
interface Milestone {
  id: string;
  name: string;
  nameEn: string;
  type: 'Q4_Strategy' | 'Q1_Kickoff' | 'Monthly_Review' | 'Weekly_Check' | 'Custom';
  schedule: string;
  description: string;
  descriptionEn: string;
}

// 日程项类型
interface AgendaItem {
  id: string;
  department: Department;
  milestoneId: string;
  milestoneName: string;
  scheduledDate: Date;
  originalDate: Date;
  isShifted: boolean;
  shiftReason?: string;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
}

// 年度日程类型
interface AnnualAgenda {
  year: number;
  generatedAt: Date;
  milestones: Milestone[];
  departmentAgendas: Record<Department, AgendaItem[]>;
  holidays: { region: string; holidays: typeof GLOBAL_HOLIDAYS.CN }[];
}

/**
 * 获取全球假期
 */
export function getGlobalHolidays(
  year: number,
  regions: string[] = ['CN', 'US', 'EU']
): { region: string; holidays: typeof GLOBAL_HOLIDAYS.CN }[] {
  return regions.map((region) => ({
    region,
    holidays: GLOBAL_HOLIDAYS[region] || [],
  }));
}

/**
 * 获取指定月份的最后一个周五
 */
function getLastFridayOfMonth(year: number, month: number): Date {
  const lastDay = new Date(year, month + 1, 0);
  const dayOfWeek = lastDay.getDay();
  const diff = dayOfWeek >= 5 ? dayOfWeek - 5 : dayOfWeek + 2;
  return new Date(year, month, lastDay.getDate() - diff);
}

/**
 * 获取指定日期所在周的周一
 */
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * 检查日期是否为假期
 */
function isHoliday(
  date: Date,
  holidays: { region: string; holidays: typeof GLOBAL_HOLIDAYS.CN }[]
): { isHoliday: boolean; holidayName?: string } {
  const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  for (const regionHolidays of holidays) {
    for (const holiday of regionHolidays.holidays) {
      if (holiday.date === dateStr) {
        return { isHoliday: true, holidayName: holiday.name };
      }
    }
  }

  return { isHoliday: false };
}

/**
 * 优化日程 - 避开假期
 */
function optimizeSchedule(
  agenda: AgendaItem[],
  holidays: { region: string; holidays: typeof GLOBAL_HOLIDAYS.CN }[]
): AgendaItem[] {
  return agenda.map((item) => {
    const holidayCheck = isHoliday(item.scheduledDate, holidays);

    if (holidayCheck.isHoliday) {
      // 将会议推迟到下一个工作日
      let newDate = new Date(item.scheduledDate);
      let attempts = 0;

      while (isHoliday(newDate, holidays).isHoliday && attempts < 7) {
        newDate.setDate(newDate.getDate() + 1);
        // 跳过周末
        if (newDate.getDay() === 0) newDate.setDate(newDate.getDate() + 1);
        if (newDate.getDay() === 6) newDate.setDate(newDate.getDate() + 2);
        attempts++;
      }

      return {
        ...item,
        scheduledDate: newDate,
        isShifted: true,
        shiftReason: `避开假期: ${holidayCheck.holidayName}`,
      };
    }

    return item;
  });
}

/**
 * 将里程碑映射到部门日程
 */
function mapMilestonesToDept(
  milestones: Milestone[],
  department: Department,
  year: number,
  holidays: { region: string; holidays: typeof GLOBAL_HOLIDAYS.CN }[]
): AgendaItem[] {
  const agenda: AgendaItem[] = [];

  for (const milestone of milestones) {
    let dates: Date[] = [];

    switch (milestone.type) {
      case 'Q4_Strategy':
        // Q4战略会议 - 12月第一周
        dates = [new Date(year, 11, 1)];
        break;

      case 'Q1_Kickoff':
        // Q1启动会议 - 1月第一周
        dates = [new Date(year, 0, 5)];
        break;

      case 'Monthly_Review':
        // 月度评审 - 每月最后一个周五
        for (let month = 0; month < 12; month++) {
          dates.push(getLastFridayOfMonth(year, month));
        }
        break;

      case 'Weekly_Check':
        // 周检查 - 每周一上午9点
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);
        let currentDate = getMondayOfWeek(startDate);

        while (currentDate <= endDate) {
          if (currentDate.getFullYear() === year) {
            dates.push(new Date(currentDate));
          }
          currentDate.setDate(currentDate.getDate() + 7);
        }
        break;

      default:
        break;
    }

    for (const date of dates) {
      agenda.push({
        id: `${department}-${milestone.id}-${date.toISOString().split('T')[0]}`,
        department,
        milestoneId: milestone.id,
        milestoneName: milestone.name,
        scheduledDate: date,
        originalDate: date,
        isShifted: false,
        status: 'pending',
      });
    }
  }

  return optimizeSchedule(agenda, holidays);
}

/**
 * 生成年度企业日程
 */
export function generateAnnualAgenda(
  year: number,
  targets?: { revenue?: string; headcount?: number }
): AnnualAgenda {
  // 1. 定义宏观里程碑
  const milestones: Milestone[] = [
    {
      id: 'q4-strategy',
      name: 'Q4战略规划会议',
      nameEn: 'Q4 Strategy Planning',
      type: 'Q4_Strategy',
      schedule: '12月第一周',
      description: '制定下一年度战略目标和预算',
      descriptionEn: 'Define next year strategy targets and budget',
    },
    {
      id: 'q1-kickoff',
      name: 'Q1启动会议',
      nameEn: 'Q1 Kickoff Meeting',
      type: 'Q1_Kickoff',
      schedule: '1月第一周',
      description: '启动新年度工作，分解目标到各部门',
      descriptionEn: 'Launch new year work, break down targets to departments',
    },
    {
      id: 'monthly-review',
      name: '月度经营评审',
      nameEn: 'Monthly Business Review',
      type: 'Monthly_Review',
      schedule: '每月最后一个周五',
      description: '回顾月度业绩，调整执行策略',
      descriptionEn: 'Review monthly performance, adjust execution strategy',
    },
    {
      id: 'weekly-check',
      name: '周例会',
      nameEn: 'Weekly Check-in',
      type: 'Weekly_Check',
      schedule: '每周一上午9:00',
      description: '检查周计划执行情况，协调资源',
      descriptionEn: 'Check weekly plan execution, coordinate resources',
    },
  ];

  // 2. 获取全球假期
  const holidays = getGlobalHolidays(year, ['CN', 'US', 'EU']);

  // 3. 为每个部门创建日程
  const departmentAgendas: Record<Department, AgendaItem[]> = {} as Record<Department, AgendaItem[]>;

  for (const dept of DEPARTMENTS) {
    const agenda = mapMilestonesToDept(milestones, dept, year, holidays);
    departmentAgendas[dept] = agenda;
  }

  return {
    year,
    generatedAt: new Date(),
    milestones,
    departmentAgendas,
    holidays,
  };
}

/**
 * 获取部门日程摘要
 */
export function getDepartmentAgendaSummary(
  agenda: AnnualAgenda,
  department: Department
): {
  totalMeetings: number;
  shiftedMeetings: number;
  upcomingMeetings: AgendaItem[];
} {
  const deptAgenda = agenda.departmentAgendas[department] || [];
  const now = new Date();

  return {
    totalMeetings: deptAgenda.length,
    shiftedMeetings: deptAgenda.filter((item) => item.isShifted).length,
    upcomingMeetings: deptAgenda
      .filter((item) => item.scheduledDate > now)
      .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())
      .slice(0, 5),
  };
}

/**
 * 获取个人日程（基于部门和角色）
 */
export function getPersonalAgenda(
  agenda: AnnualAgenda,
  department: Department,
  role: string
): AgendaItem[] {
  const deptAgenda = agenda.departmentAgendas[department] || [];

  // 根据角色过滤日程
  // 例如：普通员工只参加周例会，经理参加月度评审，总监参加战略会议
  const roleLevel = getRoleLevel(role);

  return deptAgenda.filter((item) => {
    const milestone = agenda.milestones.find((m) => m.id === item.milestoneId);
    if (!milestone) return false;

    switch (milestone.type) {
      case 'Weekly_Check':
        return true; // 所有人参加
      case 'Monthly_Review':
        return roleLevel >= 2; // 经理及以上
      case 'Q4_Strategy':
      case 'Q1_Kickoff':
        return roleLevel >= 3; // 总监及以上
      default:
        return true;
    }
  });
}

/**
 * 获取角色级别
 */
function getRoleLevel(role: string): number {
  const roleLevels: Record<string, number> = {
    staff: 1,
    engineer: 1,
    senior_engineer: 2,
    manager: 2,
    senior_manager: 3,
    director: 3,
    vp: 4,
    cxo: 5,
  };

  return roleLevels[role.toLowerCase()] || 1;
}

export type { AnnualAgenda, AgendaItem, Milestone, Department };
