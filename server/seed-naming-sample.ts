/**
 * 命名规则变更管理系统示例数据种子脚本
 * 用于创建第一个变更请求示例
 */

import { requireDb } from './utils/db-helpers';
import {
  namingVersions,
  namingRuleApprovers,
  namingChangeRequests,
  equipmentModels,
  projectNumberCounters,
} from "../drizzle/schema";

export async function seedNamingRulesData() {
  console.log("开始初始化命名规则示例数据...");

  const db = await requireDb();
  if (!db) {
    console.error("数据库连接失败");
    return;
  }

  // 1. 初始化命名规则版本
  const existingVersions = await db.select().from(namingVersions).limit(1);
  if (existingVersions.length === 0) {
    await db.insert(namingVersions).values([
      {
        versionCode: "EQ-V1.0",
        versionName: "设备命名规则初始版本",
        ruleType: "equipment",
        changeType: "major",
        effectiveDate: new Date("2026-01-01").toISOString(),
        isCurrent: 1,
        changeDescription: "建立设备命名规则体系，包含腔体式(8XX)、通过式(5XXX)、标准机(2XX)、专用机(3XX)等系列",
        createdBy: 1,
      },
      {
        versionCode: "PJ-V1.0",
        versionName: "项目编号规则初始版本",
        ruleType: "project",
        changeType: "major",
        effectiveDate: new Date("2026-01-01").toISOString(),
        isCurrent: 1,
        changeDescription: "建立项目编号规则：T临时编号(商务阶段) → GRT正式编号(执行阶段)，支持3位→4位自动升级",
        createdBy: 1,
      },
      {
        versionCode: "MT-V1.0",
        versionName: "物料编号规则初始版本",
        ruleType: "material",
        changeType: "major",
        effectiveDate: new Date("2026-01-01").toISOString(),
        isCurrent: 1,
        changeDescription: "建立15位混合编码法物料编号规则：AA-BB-CC-DDDD-EEE",
        createdBy: 1,
      },
    ]);
    console.log("✓ 命名规则版本已初始化");
  }

  // 2. 初始化项目编号计数器
  const existingCounters = await db.select().from(projectNumberCounters).limit(1);
  if (existingCounters.length === 0) {
    await db.insert(projectNumberCounters).values([
      {
        prefix: "T",
        currentMax: 550,
        nextAvailable: 551,
        formatDigits: 3,
        numberingVersion: "PJ-V1.0",
      },
      {
        prefix: "GRT",
        currentMax: 500,
        nextAvailable: 501,
        formatDigits: 3,
        numberingVersion: "PJ-V1.0",
      },
    ]);
    console.log("✓ 项目编号计数器已初始化 (T550, GRT500)");
  }

  // 3. 初始化设备型号主数据
  const existingModels = await db.select().from(equipmentModels).limit(1);
  if (existingModels.length === 0) {
    await db.insert(equipmentModels).values([
      // 腔体式系列 (8XX)
      {
        numericCode: "801",
        functionCode: "US",
        categoryCode: "8",
        fullName: "Ultrasonic 801",
        chineseName: "超声波单腔清洗机",
        processType: "超声波",
        configLevel: "标准",
        chamberCount: 1,
        status: "active",
        namingVersion: "EQ-V1.0",
        effectiveDate: new Date("2026-01-01").toISOString(),
      },
      {
        numericCode: "802",
        functionCode: "US",
        categoryCode: "8",
        fullName: "Ultrasonic 802",
        chineseName: "超声波双腔清洗机",
        processType: "超声波",
        configLevel: "标准",
        chamberCount: 2,
        status: "active",
        namingVersion: "EQ-V1.0",
        effectiveDate: new Date("2026-01-01").toISOString(),
      },
      {
        numericCode: "811",
        functionCode: "US",
        categoryCode: "8",
        fullName: "Ultrasonic 811",
        chineseName: "超声波高配单腔清洗机",
        processType: "超声波",
        configLevel: "高配",
        chamberCount: 1,
        status: "active",
        namingVersion: "EQ-V1.0",
        effectiveDate: new Date("2026-01-01").toISOString(),
      },
      {
        numericCode: "821",
        functionCode: "US",
        categoryCode: "8",
        fullName: "Ultrasonic 821",
        chineseName: "超声波高配双腔清洗机",
        processType: "超声波+真空干燥",
        configLevel: "高配",
        chamberCount: 2,
        status: "active",
        namingVersion: "EQ-V1.0",
        effectiveDate: new Date("2026-01-01").toISOString(),
      },
      {
        numericCode: "852",
        functionCode: "US",
        categoryCode: "8",
        fullName: "Ultrasonic 852",
        chineseName: "超声波大型双腔清洗机",
        processType: "超声波+喷淋",
        configLevel: "大型",
        chamberCount: 2,
        status: "active",
        namingVersion: "EQ-V1.0",
        effectiveDate: new Date("2026-01-01").toISOString(),
      },
      // 通过式系列 (5XXX)
      {
        numericCode: "5000",
        functionCode: "PL",
        categoryCode: "5",
        fullName: "Passline 5000",
        chineseName: "通过式基础清洗线",
        processType: "喷淋",
        configLevel: "基础",
        status: "active",
        namingVersion: "EQ-V1.0",
        effectiveDate: new Date("2026-01-01").toISOString(),
      },
      {
        numericCode: "5010",
        functionCode: "PL",
        categoryCode: "5",
        fullName: "Passline 5010",
        chineseName: "通过式标准清洗线",
        processType: "喷淋+风干",
        configLevel: "标准",
        status: "active",
        namingVersion: "EQ-V1.0",
        effectiveDate: new Date("2026-01-01").toISOString(),
      },
      {
        numericCode: "5100",
        functionCode: "PL",
        categoryCode: "5",
        fullName: "Passline 5100",
        chineseName: "通过式高配清洗线",
        processType: "超声波+喷淋+热风干燥",
        configLevel: "高配",
        status: "active",
        namingVersion: "EQ-V1.0",
        effectiveDate: new Date("2026-01-01").toISOString(),
      },
      // 标准机系列 (2XX)
      {
        numericCode: "200",
        functionCode: "ST",
        categoryCode: "2",
        fullName: "Standard 200",
        chineseName: "标准清洗机基础型",
        processType: "喷淋",
        configLevel: "基础",
        status: "active",
        namingVersion: "EQ-V1.0",
        effectiveDate: new Date("2026-01-01").toISOString(),
      },
      {
        numericCode: "201",
        functionCode: "ST",
        categoryCode: "2",
        fullName: "Standard 201",
        chineseName: "标准清洗机标准型",
        processType: "喷淋+超声波",
        configLevel: "标准",
        status: "active",
        namingVersion: "EQ-V1.0",
        effectiveDate: new Date("2026-01-01").toISOString(),
      },
      // 专用机系列 (3XX)
      {
        numericCode: "300",
        functionCode: "AU",
        categoryCode: "3",
        fullName: "Auto 300",
        chineseName: "汽车零部件专用清洗机",
        processType: "超声波+喷淋",
        configLevel: "行业专用",
        status: "active",
        namingVersion: "EQ-V1.0",
        effectiveDate: new Date("2026-01-01").toISOString(),
      },
      {
        numericCode: "310",
        functionCode: "NE",
        categoryCode: "3",
        fullName: "NEV 310",
        chineseName: "新能源电池专用清洗机",
        processType: "超声波+真空干燥",
        configLevel: "行业专用",
        status: "active",
        namingVersion: "EQ-V1.0",
        effectiveDate: new Date("2026-01-01").toISOString(),
      },
    ]);
    console.log("✓ 设备型号主数据已初始化 (12个型号)");
  }

  // 4. 创建第一个变更请求示例
  const existingRequests = await db.select().from(namingChangeRequests).limit(1);
  if (existingRequests.length === 0) {
    await db.insert(namingChangeRequests).values({
      requestCode: "CR-2026-001",
      requestType: "add",
      ruleType: "equipment",
      title: "新增医疗器械专用清洗机型号",
      description: "根据医疗器械行业客户需求，新增Medical系列专用清洗机型号：\n- Medical 320: 医疗器械标准清洗机\n- Medical 321: 医疗器械高配清洗机（含灭菌功能）",
      reason: "医疗器械行业对清洗设备有特殊要求，包括：\n1. 符合GMP规范\n2. 可追溯清洗记录\n3. 灭菌功能集成\n4. 不锈钢316L材质\n\n新增专用型号有助于开拓医疗器械市场。",
      impactScope: "影响范围：\n- 设备型号主数据表需新增2条记录\n- 销售报价系统需更新产品目录\n- 技术文档需补充Medical系列说明",
      status: "pending",
      requestorId: 1,
      requestorName: "系统管理员",
      requestDate: new Date().toISOString(),
    });
    console.log("✓ 第一个变更请求示例已创建 (CR-2026-001)");
  }

  console.log("命名规则示例数据初始化完成！");
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  seedNamingRulesData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("初始化失败:", err);
      process.exit(1);
    });
}
