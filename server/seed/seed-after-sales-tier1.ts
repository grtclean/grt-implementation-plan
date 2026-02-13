/**
 * Tier1 After-Sales Seed Data
 * Clients, equipments, and service logs for Tier1 customers
 */

export interface Tier1Client {
  name: string;
  tier: "Strategic" | "Key" | "Standard";
  slaLevel: "Platinum" | "Gold" | "Silver" | "Bronze";
  responseTimeHours: number;
  region: string;
  industry: string;
}

export interface Tier1Equipment {
  serialNumber: string;
  modelName: string;
  equipmentType: string;
  maintenanceCycleMonths: number;
  technicalSpecs: string;
  nextDueDate?: string;
}

export interface Tier1ServiceLog {
  equipmentSerialNumber: string;
  serviceType: "Installation" | "Maintenance" | "Repair" | "Inspection" | "Upgrade" | "Training";
  status: "Completed";
  satisfactionRating: number;
  priority: string;
  issueDescription: string;
  workPerformed: string;
  laborCost: string;
  partsCost: string;
  totalCost: string;
}

export const TIER1_CLIENTS: Tier1Client[] = [
  {
    name: "博世汽车部件（苏州）",
    tier: "Strategic",
    slaLevel: "Platinum",
    responseTimeHours: 4,
    region: "华东",
    industry: "汽车零部件",
  },
  {
    name: "采埃孚传动技术（中国）",
    tier: "Strategic",
    slaLevel: "Platinum",
    responseTimeHours: 4,
    region: "华东",
    industry: "变速箱",
  },
  {
    name: "大陆集团电子（芜湖）",
    tier: "Strategic",
    slaLevel: "Platinum",
    responseTimeHours: 4,
    region: "华东",
    industry: "汽车电子",
  },
  {
    name: "舍弗勒精密技术（太仓）",
    tier: "Key",
    slaLevel: "Gold",
    responseTimeHours: 8,
    region: "华东",
    industry: "轴承与传动",
  },
  {
    name: "博格华纳动力系统（宁波）",
    tier: "Key",
    slaLevel: "Gold",
    responseTimeHours: 8,
    region: "华东",
    industry: "动力总成",
  },
];

export const TIER1_EQUIPMENTS: Record<string, Tier1Equipment[]> = {
  "博世汽车部件（苏州）": [
    {
      serialNumber: "GRT-BSH-SZ-001",
      modelName: "GRT-5000-PRO",
      equipmentType: "超声波清洗机",
      maintenanceCycleMonths: 3,
      technicalSpecs: JSON.stringify({ power: "15kW", frequency: "28kHz", tankVolume: "500L", cleaningCapacity: "200pcs/h" }),
      nextDueDate: "2025-04-15",
    },
    {
      serialNumber: "GRT-BSH-SZ-002",
      modelName: "GRT-3000-STD",
      equipmentType: "喷淋清洗机",
      maintenanceCycleMonths: 6,
      technicalSpecs: JSON.stringify({ power: "8kW", pressure: "15bar", flowRate: "120L/min" }),
      nextDueDate: "2025-06-20",
    },
  ],
  "采埃孚传动技术（中国）": [
    {
      serialNumber: "GRT-ZF-SH-001",
      modelName: "GRT-8000-AUTO",
      equipmentType: "全自动清洗线",
      maintenanceCycleMonths: 3,
      technicalSpecs: JSON.stringify({ power: "35kW", stations: 6, throughput: "60pcs/h", cleanlinessLevel: "VDA 19.1" }),
      nextDueDate: "2025-03-10",
    },
    {
      serialNumber: "GRT-ZF-SH-002",
      modelName: "GRT-6000-HD",
      equipmentType: "重型零件清洗机",
      maintenanceCycleMonths: 4,
      technicalSpecs: JSON.stringify({ power: "20kW", maxWeight: "200kg", tankVolume: "800L" }),
      nextDueDate: "2025-05-01",
    },
  ],
  "大陆集团电子（芜湖）": [
    {
      serialNumber: "GRT-CONTI-WH-001",
      modelName: "GRT-2000-ESD",
      equipmentType: "ESD防护清洗机",
      maintenanceCycleMonths: 3,
      technicalSpecs: JSON.stringify({ power: "5kW", cleanRoom: "Class100", esdProtection: true }),
      nextDueDate: "2025-04-01",
    },
    {
      serialNumber: "GRT-CONTI-WH-002",
      modelName: "GRT-1500-SENSOR",
      equipmentType: "传感器清洗机",
      maintenanceCycleMonths: 6,
      technicalSpecs: JSON.stringify({ power: "3kW", precision: "0.1um", ultrasonicFreq: "40kHz" }),
      nextDueDate: "2025-07-15",
    },
  ],
  "舍弗勒精密技术（太仓）": [
    {
      serialNumber: "GRT-SCH-TC-001",
      modelName: "GRT-4000-GEAR",
      equipmentType: "齿轮清洗机",
      maintenanceCycleMonths: 4,
      technicalSpecs: JSON.stringify({ power: "12kW", gearSize: "50-300mm", cleaningMethod: "immersion+spray" }),
      nextDueDate: "2025-05-20",
    },
  ],
  "博格华纳动力系统（宁波）": [
    {
      serialNumber: "GRT-BW-NB-001",
      modelName: "GRT-7000-MOTOR",
      equipmentType: "电机零件清洗机",
      maintenanceCycleMonths: 3,
      technicalSpecs: JSON.stringify({ power: "18kW", throughput: "80pcs/h", dryingMethod: "vacuum" }),
      nextDueDate: "2025-03-25",
    },
    {
      serialNumber: "GRT-BW-NB-002",
      modelName: "GRT-5500-CV",
      equipmentType: "商用车零件清洗机",
      maintenanceCycleMonths: 6,
      technicalSpecs: JSON.stringify({ power: "22kW", maxPartSize: "600x400x300mm", tankVolume: "1000L" }),
      nextDueDate: "2025-08-10",
    },
  ],
};

export const TIER1_SERVICE_LOGS: Tier1ServiceLog[] = [
  {
    equipmentSerialNumber: "GRT-BSH-SZ-001",
    serviceType: "Maintenance",
    status: "Completed",
    satisfactionRating: 5,
    priority: "Medium",
    issueDescription: "定期维护保养",
    workPerformed: "更换滤芯，清洗超声波换能器，校准温度传感器",
    laborCost: "2000",
    partsCost: "800",
    totalCost: "2800",
  },
  {
    equipmentSerialNumber: "GRT-ZF-SH-001",
    serviceType: "Repair",
    status: "Completed",
    satisfactionRating: 4,
    priority: "High",
    issueDescription: "3号工位喷淋压力不稳定",
    workPerformed: "更换高压泵密封件，调整压力阀，测试运行",
    laborCost: "3500",
    partsCost: "1200",
    totalCost: "4700",
  },
  {
    equipmentSerialNumber: "GRT-CONTI-WH-001",
    serviceType: "Inspection",
    status: "Completed",
    satisfactionRating: 5,
    priority: "Low",
    issueDescription: "年度设备状态检查",
    workPerformed: "全面检查ESD防护系统，测试洁净度，校准传感器",
    laborCost: "1500",
    partsCost: "0",
    totalCost: "1500",
  },
  {
    equipmentSerialNumber: "GRT-BSH-SZ-002",
    serviceType: "Upgrade",
    status: "Completed",
    satisfactionRating: 5,
    priority: "Medium",
    issueDescription: "喷淋系统升级改造",
    workPerformed: "升级喷嘴为高效型，增加压力监控传感器",
    laborCost: "4000",
    partsCost: "3500",
    totalCost: "7500",
  },
  {
    equipmentSerialNumber: "GRT-BW-NB-001",
    serviceType: "Training",
    status: "Completed",
    satisfactionRating: 4,
    priority: "Low",
    issueDescription: "新操作员培训",
    workPerformed: "设备操作培训，安全注意事项讲解，维护要点培训",
    laborCost: "1000",
    partsCost: "0",
    totalCost: "1000",
  },
];
