/**
 * GRT设备型号种子数据脚本
 * 根据GRT全球战略布局及设备介绍202601.pdf资料更新设备型号主数据
 * 版本: V1.1
 * 生效日期: 2026-01-17
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { equipmentModels } from "../drizzle/schema";
import dotenv from "dotenv";

dotenv.config();

interface EquipmentModelData {
  numericCode: string;
  functionCode: string;
  categoryCode: string;
  fullName: string;
  chineseName: string;
  displayName: string;
  chamberCount: number | null;
  processType: string;
  configLevel: string;
  applicableIndustry: string;
  namingVersion: string;
  status: "active" | "deprecated" | "obsolete";
  remark: string;
}

const GRT_EQUIPMENT_MODELS: EquipmentModelData[] = [
  // 旋转索流超声波清洗系列 (SC系列)
  {
    numericCode: "SC800W",
    functionCode: "SC",
    categoryCode: "8",
    fullName: "GRT-SC800W",
    chineseName: "旋转索流超声波清洗机",
    displayName: "GRT-SC800W 旋转索流超声波清洗机",
    chamberCount: 1,
    processType: "ultrasonic",
    configLevel: "standard",
    applicableIndustry: "automotive",
    namingVersion: "V1.1",
    status: "active",
    remark: "尺寸:5000×2400×2800mm, 储液槽:1500L, 超声频率:25/28/40kHz, 温度:50-70℃, 压力:3-6/6-20bar, 功率:≈50KW, 工件:缸体/齿轮/轴承/电机壳体",
  },
  {
    numericCode: "SC800W-SF",
    functionCode: "SC",
    categoryCode: "8",
    fullName: "GRT-SC800W-SF",
    chineseName: "超洁净旋转索流清洗机",
    displayName: "GRT-SC800W-SF 超洁净旋转索流清洗机",
    chamberCount: 1,
    processType: "ultrasonic",
    configLevel: "premium",
    applicableIndustry: "precision",
    namingVersion: "V1.1",
    status: "active",
    remark: "尺寸:5000×2400×2800mm, 储液槽:1000L, 超声频率:25/28/40kHz, 温度:50-70℃, 压力:3-6bar, 功率:≈40KW, 工件:电机轴/喷油器/燃油泵泵体",
  },
  {
    numericCode: "SC800W-II",
    functionCode: "SC",
    categoryCode: "8",
    fullName: "GRT-SC800W-II",
    chineseName: "旋转索流超声波清洗机II型",
    displayName: "GRT-SC800W-II 旋转索流超声波清洗机II型",
    chamberCount: 1,
    processType: "ultrasonic",
    configLevel: "standard",
    applicableIndustry: "automotive",
    namingVersion: "V1.1",
    status: "active",
    remark: "尺寸:4000×2000×2800mm, 储液槽:1000L, 超声频率:25/28/40kHz, 温度:50-70℃, 压力:3-6/6-20bar, 功率:≈45KW, 工件:齿轴/小零件",
  },
  {
    numericCode: "SC800C",
    functionCode: "SC",
    categoryCode: "8",
    fullName: "GRT-SC800C",
    chineseName: "真空溶剂清洗机",
    displayName: "GRT-SC800C 真空溶剂清洗机",
    chamberCount: 1,
    processType: "solvent",
    configLevel: "premium",
    applicableIndustry: "precision",
    namingVersion: "V1.1",
    status: "active",
    remark: "尺寸:5000×2500×3200mm, 储液槽:1450L, 超声频率:20kHz, 温度:45-60℃, 压力:100-4mbar, 功率:≈60KW, 工件:冲压件/刀片/喷油器",
  },
  // 双腔/多腔清洗系列 (DC/MC系列)
  {
    numericCode: "DC880W",
    functionCode: "DC",
    categoryCode: "8",
    fullName: "GRT-DC880W",
    chineseName: "双腔旋转索流超声波清洗机",
    displayName: "GRT-DC880W 双腔旋转索流超声波清洗机",
    chamberCount: 2,
    processType: "ultrasonic",
    configLevel: "standard",
    applicableIndustry: "automotive",
    namingVersion: "V1.1",
    status: "active",
    remark: "尺寸:7000×2400×2800mm, 储液槽:1500L, 超声频率:25/28/40kHz, 温度:50-70℃, 压力:3-6/6-20bar, 功率:≈55KW, 工件:缸体/筏板/齿轮/轴承",
  },
  {
    numericCode: "DC880W-SF",
    functionCode: "DC",
    categoryCode: "8",
    fullName: "GRT-DC880W-SF",
    chineseName: "双腔超洁净清洗机",
    displayName: "GRT-DC880W-SF 双腔超洁净清洗机",
    chamberCount: 2,
    processType: "ultrasonic",
    configLevel: "premium",
    applicableIndustry: "precision",
    namingVersion: "V1.1",
    status: "active",
    remark: "尺寸:7000×2400×2800mm, 储液槽:1000L, 超声频率:25/28/40kHz, 温度:50-70℃, 压力:3-6bar, 功率:≈55KW, 工件:电机轴/高压油管/喷油器",
  },
  {
    numericCode: "DC880C-B",
    functionCode: "DC",
    categoryCode: "8",
    fullName: "GRT-DC880C-B",
    chineseName: "双腔真空溶剂清洗机",
    displayName: "GRT-DC880C-B 双腔真空溶剂清洗机",
    chamberCount: 2,
    processType: "solvent",
    configLevel: "premium",
    applicableIndustry: "precision",
    namingVersion: "V1.1",
    status: "active",
    remark: "尺寸:8200×4800×3628mm, 储液槽:4500L, 温度:45-60℃, 压力:100-4mbar, 工件:复杂零件/温控阀壳体",
  },
  {
    numericCode: "MC888W",
    functionCode: "MC",
    categoryCode: "8",
    fullName: "GRT-MC888W",
    chineseName: "多腔旋转索流超声波清洗机",
    displayName: "GRT-MC888W 多腔旋转索流超声波清洗机",
    chamberCount: 3,
    processType: "ultrasonic",
    configLevel: "premium",
    applicableIndustry: "automotive",
    namingVersion: "V1.1",
    status: "active",
    remark: "尺寸:9000×2400×2800mm, 储液槽:2000L, 超声频率:25/28/40kHz, 温度:50-70℃, 压力:3-6/6-20bar, 功率:≈65KW, 工件:阀芯/小零件/齿轴",
  },
  // 通过式清洗系列 (TC系列)
  {
    numericCode: "TC2100",
    functionCode: "TC",
    categoryCode: "5",
    fullName: "GRT-TC2100",
    chineseName: "通过式清洗机",
    displayName: "GRT-TC2100 通过式清洗机",
    chamberCount: null,
    processType: "spray",
    configLevel: "standard",
    applicableIndustry: "automotive",
    namingVersion: "V1.1",
    status: "active",
    remark: "温度:50-70℃, 压力:4-10bar, 工件:电机壳/变速箱壳体",
  },
  {
    numericCode: "TC2100-D",
    functionCode: "TC",
    categoryCode: "5",
    fullName: "GRT-TC2100-D",
    chineseName: "通过式清洗机(双线)",
    displayName: "GRT-TC2100-D 通过式清洗机(双线)",
    chamberCount: null,
    processType: "spray",
    configLevel: "standard",
    applicableIndustry: "automotive",
    namingVersion: "V1.1",
    status: "active",
    remark: "温度:50-70℃, 压力:4-10bar, 工件:电机壳/变速箱壳体",
  },
  {
    numericCode: "TC2100W",
    functionCode: "TC",
    categoryCode: "5",
    fullName: "GRT-TC2100W",
    chineseName: "大型通过式清洗机",
    displayName: "GRT-TC2100W 大型通过式清洗机",
    chamberCount: null,
    processType: "spray",
    configLevel: "premium",
    applicableIndustry: "nev",
    namingVersion: "V1.1",
    status: "active",
    remark: "尺寸:15880×3000×4100mm, 储液槽:1500L×2+1300L, 温度:50-70℃, 压力:4-10bar, 功率:≈70KW, 工件:控制器壳体/电机壳/组合壳",
  },
  // 机器人清洗系列 (RW系列)
  {
    numericCode: "RW2000",
    functionCode: "RW",
    categoryCode: "7",
    fullName: "GRT-RW2000",
    chineseName: "机器人清洗机",
    displayName: "GRT-RW2000 机器人清洗机",
    chamberCount: null,
    processType: "high_pressure",
    configLevel: "premium",
    applicableIndustry: "automotive",
    namingVersion: "V1.1",
    status: "active",
    remark: "尺寸:3580×5800×4190mm, 储液槽:1500L×2, 温度:50-70℃, 压力:HP:300-600bar/LP:3-12bar, 功率:≈136KW, 工件:变速箱壳体/大缸体/电机壳体",
  },
  {
    numericCode: "RW3000",
    functionCode: "RW",
    categoryCode: "7",
    fullName: "GRT-RW3000",
    chineseName: "机器人清洗机(增强型)",
    displayName: "GRT-RW3000 机器人清洗机(增强型)",
    chamberCount: null,
    processType: "high_pressure",
    configLevel: "premium",
    applicableIndustry: "automotive",
    namingVersion: "V1.1",
    status: "active",
    remark: "尺寸:5700×5800×4190mm, 储液槽:1500L×2, 温度:50-70℃, 压力:HP:300-600bar/LP:3-12bar, 功率:≈150KW, 工件:缸体/行星架壳体/中壳",
  },
  {
    numericCode: "RW3000-L",
    functionCode: "RW",
    categoryCode: "7",
    fullName: "GRT-RW3000-L",
    chineseName: "大型机器人清洗机",
    displayName: "GRT-RW3000-L 大型机器人清洗机",
    chamberCount: null,
    processType: "high_pressure",
    configLevel: "premium",
    applicableIndustry: "commercial_vehicle",
    namingVersion: "V1.1",
    status: "active",
    remark: "尺寸:8000×3550×4190mm, 储液槽:1500L×2, 温度:50-70℃, 压力:HP:300-600bar/LP:3-12bar, 功率:≈150KW, 工件:大型壳体/复杂结构件",
  },
  // 高压清洗系列 (HP系列)
  {
    numericCode: "HP1200",
    functionCode: "HP",
    categoryCode: "2",
    fullName: "GRT-HP1200",
    chineseName: "点对点高压清洗机",
    displayName: "GRT-HP1200 点对点高压清洗机",
    chamberCount: null,
    processType: "high_pressure",
    configLevel: "standard",
    applicableIndustry: "precision",
    namingVersion: "V1.1",
    status: "active",
    remark: "尺寸:2640×1460×2800mm, 储液槽:800L, 温度:50-70℃, 压力:HP:60-100bar/LP:3-10bar, 功率:≈34.5KW, 工件:燃油泵泵体/真空泵壳体/电机轴",
  },
  {
    numericCode: "HP1200-1",
    functionCode: "HP",
    categoryCode: "2",
    fullName: "GRT-HP1200-1",
    chineseName: "紧凑型高压清洗机",
    displayName: "GRT-HP1200-1 紧凑型高压清洗机",
    chamberCount: null,
    processType: "high_pressure",
    configLevel: "economy",
    applicableIndustry: "nev",
    namingVersion: "V1.1",
    status: "active",
    remark: "尺寸:1300×1200×2150mm, 储液槽:100L, 温度:50-70℃, 压力:5-150bar, 功率:≈20KW, 工件:电机定子总成/油嘴/新能源齿轴",
  },
  // 超洁净清洗系列 (Eco系列)
  {
    numericCode: "Eco-SF",
    functionCode: "Eco",
    categoryCode: "2",
    fullName: "GRT-Eco-SF",
    chineseName: "经济型超洁净清洗机",
    displayName: "GRT-Eco-SF 经济型超洁净清洗机",
    chamberCount: 1,
    processType: "ultrasonic",
    configLevel: "economy",
    applicableIndustry: "precision",
    namingVersion: "V1.1",
    status: "active",
    remark: "尺寸:4500×2000×2700mm, 储液槽:400L, 超声频率:25/28/40kHz, 温度:50-70℃, 压力:HP:60-100bar/LP:3-10bar, 功率:≈36.5KW, 工件:电机轴/高压油管/喷油器",
  },
];

async function seedGRTEquipment() {
  console.log("🚀 开始更新GRT设备型号数据...");
  console.log("📋 版本: V1.1");
  console.log("📅 生效日期: 2026-01-17");
  console.log("📚 数据来源: GRT全球战略布局及设备介绍202601.pdf\n");

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
  const db = drizzle(pool);

  try {
    // 清空现有数据
    console.log("🗑️ 清空现有设备型号数据...");
    await db.delete(equipmentModels);

    // 插入新数据
    console.log(`📥 插入 ${GRT_EQUIPMENT_MODELS.length} 个设备型号...\n`);

    const now = new Date().toISOString();
    for (const model of GRT_EQUIPMENT_MODELS) {
      await db.insert(equipmentModels).values({
        numericCode: model.numericCode,
        functionCode: model.functionCode,
        categoryCode: model.categoryCode,
        fullName: model.fullName,
        chineseName: model.chineseName,
        displayName: model.displayName,
        chamberCount: model.chamberCount,
        processType: model.processType,
        configLevel: model.configLevel,
        applicableIndustry: model.applicableIndustry,
        namingVersion: model.namingVersion,
        effectiveDate: now,
        status: model.status as any,
        remark: model.remark,
      } as any);
      console.log(`  ✅ ${model.fullName} - ${model.chineseName}`);
    }

    console.log("\n✅ GRT设备型号数据更新完成！");
    console.log(`📊 共更新 ${GRT_EQUIPMENT_MODELS.length} 个设备型号`);

    // 按系列统计
    const seriesCounts: Record<string, number> = {};
    for (const model of GRT_EQUIPMENT_MODELS) {
      seriesCounts[model.functionCode] =
        (seriesCounts[model.functionCode] || 0) + 1;
    }
    console.log("\n📈 按系列统计:");
    for (const [series, count] of Object.entries(seriesCounts)) {
      console.log(`  ${series}系列: ${count}个型号`);
    }
  } catch (error) {
    console.error("❌ 更新失败:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedGRTEquipment().catch(console.error);
