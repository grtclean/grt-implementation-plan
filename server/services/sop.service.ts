/**
 * SOP Template Library Service
 *
 * Provides CRUD operations for Standard Operating Procedures (SOPs)
 * used in GRT industrial cleaning equipment manufacturing.
 */

// ============================================================
// Type Definitions
// ============================================================

export interface SOPRecord {
  id: number;
  code: string;
  title: string;
  category: SOPCategory;
  version: string;
  status: SOPStatus;
  content: string;
  equipmentModels: string[];
  stages: string[];
  author: string;
  approver: string;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
}

export type SOPCategory =
  | "清洗工艺"
  | "质量检测"
  | "设备维护"
  | "安全操作"
  | "客户验收"
  | "包装运输";

export type SOPStatus = "draft" | "review" | "approved" | "archived";

export interface SOPFilters {
  category?: SOPCategory;
  status?: SOPStatus;
  stage?: string;
  equipmentModel?: string;
}

export interface CreateSOPInput {
  title: string;
  category: SOPCategory;
  content: string;
  equipmentModels: string[];
  stages: string[];
  author: string;
}

export interface UpdateSOPInput {
  title?: string;
  category?: SOPCategory;
  content?: string;
  equipmentModels?: string[];
  stages?: string[];
  status?: SOPStatus;
  approver?: string;
}

// ============================================================
// Mock Data
// ============================================================

const SOP_CATEGORIES: SOPCategory[] = [
  "清洗工艺",
  "质量检测",
  "设备维护",
  "安全操作",
  "客户验收",
  "包装运输",
];

let nextId = 11;

const mockSOPs: SOPRecord[] = [
  {
    id: 1, code: "SOP-CL-001", title: "超声波清洗标准操作流程", category: "清洗工艺",
    version: "3.2", status: "approved", content: "1. 准备清洗液，配比浓度3-5%\n2. 设定超声波频率40kHz\n3. 预热至55-60C\n4. 放置工件，清洗时间5-10分钟\n5. 取出工件漂洗\n6. 真空干燥",
    equipmentModels: ["USC-3000", "USC-2000"], stages: ["M7", "M8"], author: "张工", approver: "李主管",
    effectiveDate: "2025-06-01", createdAt: "2025-05-15", updatedAt: "2025-12-01",
  },
  {
    id: 2, code: "SOP-CL-002", title: "喷淋清洗工艺规范", category: "清洗工艺",
    version: "2.1", status: "approved", content: "1. 检查喷嘴状态\n2. 调节喷淋压力至12MPa\n3. 设定清洗温度50C\n4. 启动传送带速度2m/min\n5. 执行多级喷淋清洗\n6. 风刀吹干",
    equipmentModels: ["SPR-5000", "SPR-3000"], stages: ["M7", "M8", "M10"], author: "王工", approver: "李主管",
    effectiveDate: "2025-08-01", createdAt: "2025-07-10", updatedAt: "2025-11-20",
  },
  {
    id: 3, code: "SOP-QC-001", title: "清洁度检测标准流程", category: "质量检测",
    version: "4.0", status: "approved", content: "1. 采用重量法检测残留物\n2. 使用颗粒计数器检测颗粒度\n3. 荧光检测表面残留\n4. 记录检测数据\n5. 与客户标准对比\n6. 出具检测报告",
    equipmentModels: ["USC-3000", "SPR-5000", "ASC-5000"], stages: ["M8", "M11"], author: "陈工", approver: "赵总监",
    effectiveDate: "2025-04-01", createdAt: "2025-03-01", updatedAt: "2025-10-15",
  },
  {
    id: 4, code: "SOP-MT-001", title: "设备日常维护保养规程", category: "设备维护",
    version: "2.0", status: "approved", content: "1. 每日检查清洗液浓度\n2. 每周清洁过滤器\n3. 每月校准传感器\n4. 每季度更换密封件\n5. 每半年大保养\n6. 记录维护日志",
    equipmentModels: ["USC-3000", "USC-2000", "SPR-5000", "SPR-3000"], stages: ["M10", "M11", "M12"], author: "刘工", approver: "李主管",
    effectiveDate: "2025-01-01", createdAt: "2024-12-01", updatedAt: "2025-09-30",
  },
  {
    id: 5, code: "SOP-SF-001", title: "清洗设备安全操作规程", category: "安全操作",
    version: "3.0", status: "approved", content: "1. 操作前检查急停按钮功能\n2. 确认安全门联锁正常\n3. 穿戴防护装备\n4. 遵循LOTO上锁挂牌流程\n5. 化学品安全使用\n6. 紧急情况处理",
    equipmentModels: ["USC-3000", "USC-2000", "SPR-5000", "ASC-5000"], stages: ["M7", "M8", "M10", "M11"], author: "安全员周", approver: "安全总监",
    effectiveDate: "2025-03-01", createdAt: "2025-02-01", updatedAt: "2025-08-15",
  },
  {
    id: 6, code: "SOP-AC-001", title: "FAT工厂验收测试流程", category: "客户验收",
    version: "2.5", status: "approved", content: "1. 准备FAT测试计划\n2. 通知客户到场时间\n3. 按检查清单逐项测试\n4. 记录测试数据\n5. 客户签字确认\n6. 整改闭环跟踪",
    equipmentModels: ["USC-3000", "SPR-5000", "ASC-5000"], stages: ["M8"], author: "项目经理孙", approver: "品质总监",
    effectiveDate: "2025-05-01", createdAt: "2025-04-01", updatedAt: "2025-11-01",
  },
  {
    id: 7, code: "SOP-AC-002", title: "SAT现场验收测试流程", category: "客户验收",
    version: "2.0", status: "approved", content: "1. 现场环境确认\n2. 设备安装到位检查\n3. 调试参数设定\n4. 性能测试执行\n5. 客户见证测试\n6. 验收报告签署",
    equipmentModels: ["USC-3000", "SPR-5000", "ASC-5000"], stages: ["M11"], author: "项目经理孙", approver: "品质总监",
    effectiveDate: "2025-06-01", createdAt: "2025-05-10", updatedAt: "2025-10-20",
  },
  {
    id: 8, code: "SOP-PK-001", title: "设备包装运输规范", category: "包装运输",
    version: "1.5", status: "approved", content: "1. 拆卸可拆件并标记\n2. 保护敏感部件\n3. 固定运动件\n4. 防锈处理\n5. 木箱包装加固\n6. 装箱清单核对",
    equipmentModels: ["USC-3000", "USC-2000", "SPR-5000", "ASC-5000"], stages: ["M9"], author: "物流主管钱", approver: "生产总监",
    effectiveDate: "2025-02-01", createdAt: "2025-01-15", updatedAt: "2025-07-20",
  },
  {
    id: 9, code: "SOP-CL-003", title: "真空干燥工艺操作规范", category: "清洗工艺",
    version: "1.0", status: "review", content: "1. 检查真空泵运行状态\n2. 将工件放入干燥腔\n3. 关闭腔门并密封\n4. 启动抽真空至-0.09MPa\n5. 加热至80C保持30min\n6. 缓慢释压取件",
    equipmentModels: ["USC-3000", "ASC-5000"], stages: ["M7", "M8"], author: "张工", approver: "",
    effectiveDate: "", createdAt: "2025-12-01", updatedAt: "2025-12-01",
  },
  {
    id: 10, code: "SOP-QC-002", title: "在线检测系统操作手册", category: "质量检测",
    version: "0.1", status: "draft", content: "1. 初始化CCD视觉系统\n2. 校准检测参数\n3. 设定合格判定阈值\n4. 启动在线检测模式\n5. 数据自动记录\n6. 异常报警处理",
    equipmentModels: ["ASC-5000"], stages: ["M7", "M8", "M10"], author: "陈工", approver: "",
    effectiveDate: "", createdAt: "2025-12-10", updatedAt: "2025-12-10",
  },
];

// ============================================================
// Service Functions
// ============================================================

export function listSOPs(filters?: SOPFilters): SOPRecord[] {
  let result = [...mockSOPs];

  if (filters?.category) {
    result = result.filter((s) => s.category === filters.category);
  }
  if (filters?.status) {
    result = result.filter((s) => s.status === filters.status);
  }
  if (filters?.stage) {
    result = result.filter((s) => s.stages.includes(filters.stage!));
  }
  if (filters?.equipmentModel) {
    result = result.filter((s) =>
      s.equipmentModels.includes(filters.equipmentModel!)
    );
  }

  return result;
}

export function getSOPById(id: number): SOPRecord | null {
  return mockSOPs.find((s) => s.id === id) ?? null;
}

export function createSOP(data: CreateSOPInput): SOPRecord {
  const id = nextId++;
  const code = `SOP-${data.category === "清洗工艺" ? "CL" : data.category === "质量检测" ? "QC" : data.category === "设备维护" ? "MT" : data.category === "安全操作" ? "SF" : data.category === "客户验收" ? "AC" : "PK"}-${String(id).padStart(3, "0")}`;
  const now = new Date().toISOString().slice(0, 10);
  const newSOP: SOPRecord = {
    id,
    code,
    title: data.title,
    category: data.category,
    version: "0.1",
    status: "draft",
    content: data.content,
    equipmentModels: data.equipmentModels,
    stages: data.stages,
    author: data.author,
    approver: "",
    effectiveDate: "",
    createdAt: now,
    updatedAt: now,
  };
  mockSOPs.push(newSOP);
  return newSOP;
}

export function updateSOP(id: number, data: UpdateSOPInput): SOPRecord | null {
  const idx = mockSOPs.findIndex((s) => s.id === id);
  if (idx === -1) return null;

  const existing = mockSOPs[idx];
  const updated: SOPRecord = {
    ...existing,
    title: data.title ?? existing.title,
    category: data.category ?? existing.category,
    content: data.content ?? existing.content,
    equipmentModels: data.equipmentModels ?? existing.equipmentModels,
    stages: data.stages ?? existing.stages,
    status: data.status ?? existing.status,
    approver: data.approver ?? existing.approver,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
  mockSOPs[idx] = updated;
  return updated;
}

export function searchSOPs(query: string): SOPRecord[] {
  const lower = query.toLowerCase();
  return mockSOPs.filter(
    (s) =>
      s.title.toLowerCase().includes(lower) ||
      s.code.toLowerCase().includes(lower) ||
      s.content.toLowerCase().includes(lower) ||
      s.category.includes(query)
  );
}

export function getSOPCategories(): SOPCategory[] {
  return [...SOP_CATEGORIES];
}

export function versionSOP(id: number): SOPRecord | null {
  const existing = getSOPById(id);
  if (!existing) return null;

  const parts = existing.version.split(".");
  const major = parseInt(parts[0], 10);
  const minor = parseInt(parts[1] ?? "0", 10);
  const newVersion = `${major}.${minor + 1}`;

  const newId = nextId++;
  const now = new Date().toISOString().slice(0, 10);
  const newSOP: SOPRecord = {
    ...existing,
    id: newId,
    version: newVersion,
    status: "draft",
    approver: "",
    effectiveDate: "",
    createdAt: now,
    updatedAt: now,
  };
  mockSOPs.push(newSOP);
  return newSOP;
}
