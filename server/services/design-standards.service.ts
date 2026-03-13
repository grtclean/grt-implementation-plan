/**
 * Design Standards Reference Service
 *
 * Comprehensive standards database covering:
 * - ISO / IEC international standards
 * - GB/T (China national) and VDA/VDI (Germany automotive)
 * - CE / EU harmonized (Machinery, LVD, EMC, ATEX)
 * - UL / NFPA / NEC / ASME (North America)
 * - SEMI (Semiconductor industry)
 * - GRT Enterprise Standards (internal design guidelines)
 *
 * Pure functions — no DB, no side effects.
 */

// ── Standard Reference Types ────────────────────────────────────────────

export interface StandardReference {
  code: string;        // e.g. "ISO 16232", "UL 508A", "GRT-ES-001"
  titleZh: string;     // Chinese title
  titleEn: string;     // English title
  clause?: string;     // specific clause
  requirement: string; // what the standard says for this context
  parameterKeys: string[]; // which params this standard applies to
  region: "international" | "china" | "eu" | "us" | "germany" | "grt"; // applicability region
  category: "cleanliness" | "tank" | "pump" | "ultrasonic" | "heater" | "spray" | "drying" | "conveyor" | "electrical" | "safety" | "environmental" | "material" | "enterprise";
}

export interface StationStandardsResult {
  stationType: string;
  applicableStandards: StandardReference[];
  parameterStandards: Record<string, StandardReference[]>; // paramKey → applicable standards
}

// ══════════════════════════════════════════════════════════════════════════
// STANDARDS DATABASE
// ══════════════════════════════════════════════════════════════════════════

// ── 1. Cleanliness Standards ────────────────────────────────────────────

const CLEANLINESS_STANDARDS: StandardReference[] = [
  {
    code: "ISO 16232",
    titleZh: "道路车辆 — 零部件和系统清洁度",
    titleEn: "Road vehicles — Cleanliness of components and systems",
    clause: "Parts 1-10 (2018 edition)",
    requirement: "定义CCC颗粒度等级(A-H)、标准清洗验证流程（压力冲洗/超声波萃取/摇动法）。Part 3:喷淋萃取2-10bar; Part 4:超声波萃取25-40kHz。最大允许颗粒尺寸与数量限值由OEM定义",
    parameterKeys: ["filtrationMicron", "ultrasonicFrequency", "ultrasonicPower", "sprayPressure"],
    region: "international",
    category: "cleanliness",
  },
  {
    code: "VDA 19.1",
    titleZh: "汽车工业技术清洁度检验",
    titleEn: "Technical cleanliness inspection in the automotive industry",
    clause: "3rd Edition 2015",
    requirement: "压力冲洗法1-10bar(标准萃取)、超声波法25-40kHz(精密萃取)。萃取衰减曲线验证:连续3次萃取颗粒递减≥90%。精密清洗要求多级超声+DI水漂洗+颗粒度在线监测",
    parameterKeys: ["sprayPressure", "ultrasonicFrequency", "nozzleType", "filtrationMicron"],
    region: "germany",
    category: "cleanliness",
  },
  {
    code: "VDA 19.2",
    titleZh: "汽车工业装配环境技术清洁度",
    titleEn: "Technical cleanliness in assembly — Environment, logistics, personnel",
    requirement: "装配区洁净等级: SA5(≤500μm) / SA3(≤300μm) / SA1(≤100μm)。清洗线出口洁净度需≤装配区1/2。物料传递窗口需负压差(≥5Pa)",
    parameterKeys: ["dryingTemp", "dryingAirflow", "filtrationMicron"],
    region: "germany",
    category: "cleanliness",
  },
  {
    code: "ISO 4406",
    titleZh: "液压传动 — 油液固体颗粒污染等级代号",
    titleEn: "Hydraulic fluid power — Fluids — Method for coding contamination level",
    requirement: "清洗液污染度监控: 循环系统需在线颗粒计数器。目标NAS 6级(精密) / NAS 8级(标准)。过滤器需有压差报警(ΔP>0.5bar)",
    parameterKeys: ["filtrationMicron"],
    region: "international",
    category: "cleanliness",
  },
  {
    code: "SEMI F57",
    titleZh: "半导体设备清洁度要求",
    titleEn: "Test method for determination of non-volatile residue (NVR) in ultrapure water",
    requirement: "半导体级清洗:DI水电阻率≥18MΩ·cm, TOC<5ppb。末段漂洗用超纯水(UPW)。干燥需Class 100洁净环境。喷嘴材质PVDF/PFA",
    parameterKeys: ["filtrationMicron", "tankMaterial", "dryingTemp"],
    region: "international",
    category: "cleanliness",
  },
];

// ── 2. Tank / Vessel Standards ──────────────────────────────────────────

const TANK_STANDARDS: StandardReference[] = [
  {
    code: "GB/T 150",
    titleZh: "压力容器",
    titleEn: "Pressure vessels",
    clause: "GB/T 150.1-150.4 (2011)",
    requirement: "常压清洗槽壁厚: ≤200L→min 3mm, 200-500L→4mm, >500L→5mm(SUS304)。焊缝需符合NB/T 47015。液面以上需加强肋(间距≤300mm)。底部坡度≥1%利排液",
    parameterKeys: ["tankLength", "tankWidth", "tankHeight", "tankVolume"],
    region: "china",
    category: "tank",
  },
  {
    code: "DIN 6601",
    titleZh: "用于腐蚀性液体的不锈钢容器",
    titleEn: "Stainless steel vessels for corrosive liquids",
    requirement: "材质选择: pH<2或含Cl⁻→SUS316L(Mo≥2%); pH2-12碱性→SUS304; 有机溶剂→PP/PVDF(≤80°C)或SUS316L; 氢氟酸→Hastelloy C276。壁厚附加腐蚀裕量0.5-1mm/year",
    parameterKeys: ["tankMaterial"],
    region: "germany",
    category: "tank",
  },
  {
    code: "GB/T 25198",
    titleZh: "压力容器封头",
    titleEn: "Heads for pressure vessels",
    requirement: "清洗槽常用平底+折边: 折边半径≥3t(壁厚)。方槽转角R≥2t。底板加强筋间距≤250mm(>500L)。溢流口距槽顶≥50mm",
    parameterKeys: ["tankLength", "tankWidth", "tankHeight"],
    region: "china",
    category: "tank",
  },
  {
    code: "ASME Section VIII",
    titleZh: "ASME压力容器建造规范",
    titleEn: "ASME Boiler and Pressure Vessel Code — Division 1",
    clause: "Div. 1, UG-16 to UG-35",
    requirement: "北美出口需ASME U-Stamp(有压)或National Board注册。壁厚计算: t = PR/(SE-0.6P) + corrosion allowance。材料需SA-240(304/316L)。焊接需AWS D1.6",
    parameterKeys: ["tankLength", "tankWidth", "tankHeight", "tankVolume", "tankMaterial"],
    region: "us",
    category: "tank",
  },
  {
    code: "EN 13445",
    titleZh: "非受火压力容器",
    titleEn: "Unfired pressure vessels",
    clause: "Parts 1-8",
    requirement: "欧洲出口压力容器需PED 2014/68/EU认证(>0.5bar)。常压清洗槽按EN 1993-4-2(钢制储罐)设计。材料需EN 10088-2(不锈钢板)证书",
    parameterKeys: ["tankVolume", "tankMaterial"],
    region: "eu",
    category: "tank",
  },
  {
    code: "GRT-ES-001",
    titleZh: "GRT清洗槽设计规范",
    titleEn: "GRT Enterprise Standard — Tank Design Specification",
    clause: "v3.2 (2025-09)",
    requirement: "内槽尺寸=工件尺寸×1.5(min每侧100mm间隙)。液面余量≥80mm防溢出。槽底坡度1.5%向排液口。标配: 排液阀DN40/50、溢流口DN同排液、液位传感器×2(高/低)、温度传感器PT100×1。支腿高度150mm(标准)/200mm(带接液盘)",
    parameterKeys: ["tankLength", "tankWidth", "tankHeight", "tankVolume", "tankMaterial"],
    region: "grt",
    category: "enterprise",
  },
];

// ── 3. Pump Standards ───────────────────────────────────────────────────

const PUMP_STANDARDS: StandardReference[] = [
  {
    code: "ISO 2858",
    titleZh: "端吸式离心泵尺寸规范",
    titleEn: "End-suction centrifugal pumps (16 bar) — Designation, nominal duty point and dimensions",
    requirement: "标准泵选型: Q-H曲线匹配工况点。效率η≥0.55(小泵Q<50Lpm)~0.80(大泵Q>200Lpm)。选型安全裕量: Q+10%, H+15%。NPSH available > NPSH required + 0.5m",
    parameterKeys: ["pumpFlowRate", "pumpHead", "pumpType"],
    region: "international",
    category: "pump",
  },
  {
    code: "GB/T 5657",
    titleZh: "离心泵技术条件(III类)",
    titleEn: "Technical specifications for centrifugal pumps (Class III)",
    requirement: "清洗循环泵换水率: 浸泡清洗3次/h、漂洗6次/h、喷淋8次/h。磁力泵用于强腐蚀(<30L/min推荐)、隔膜泵用于高粘度或含颗粒介质。泵出口需止回阀+球阀",
    parameterKeys: ["pumpFlowRate", "pumpHead"],
    region: "china",
    category: "pump",
  },
  {
    code: "ANSI/ASME B73.1",
    titleZh: "水平端吸式化工离心泵规范",
    titleEn: "Specification for Horizontal End Suction Chemical Centrifugal Pumps",
    requirement: "北美化工泵标准尺寸。密封: 单端面机械密封(标准)、双端面+冲洗(有毒/易燃)、磁力驱动(零泄漏)。轴承寿命L10≥17500h。法兰ANSI 150#(≤20bar)",
    parameterKeys: ["pumpFlowRate", "pumpHead", "pumpType"],
    region: "us",
    category: "pump",
  },
  {
    code: "EN 809",
    titleZh: "泵和泵机组 — 安全要求",
    titleEn: "Pumps and pump units for liquids — Common safety requirements",
    requirement: "CE认证泵需符合EN 809。防干运保护(液位联锁)。泄漏检测(磁力泵需温度监测)。压力释放装置(出口>10bar系统)",
    parameterKeys: ["pumpFlowRate", "pumpHead"],
    region: "eu",
    category: "pump",
  },
  {
    code: "GRT-ES-002",
    titleZh: "GRT循环泵选型矩阵",
    titleEn: "GRT Enterprise Standard — Pump Selection Matrix",
    clause: "v2.1 (2025-06)",
    requirement: "标准选型: Q<30Lpm→磁力泵(防泄漏); Q30-200Lpm→离心泵+机械密封; Q>200Lpm→离心泵(SUS316L叶轮)。泵底座需防振垫(橡胶减振)。吸入管DN≥出口管DN+1级。必配: 入口Y型过滤器+出口压力表+出口球阀",
    parameterKeys: ["pumpFlowRate", "pumpHead", "pumpType"],
    region: "grt",
    category: "enterprise",
  },
];

// ── 4. Ultrasonic Standards ─────────────────────────────────────────────

const ULTRASONIC_STANDARDS: StandardReference[] = [
  {
    code: "IEC 63218",
    titleZh: "超声波清洗设备 — 性能测试方法",
    titleEn: "Ultrasonics — Ultrasonic cleaning equipment — Performance testing",
    requirement: "功率密度: 标准10W/L、精密20W/L、超精密30W/L。频率选择: >500μm→25/28kHz, 100-500μm→40kHz, 50-100μm→68kHz, <50μm→120/170kHz。铝箔穿孔测试验证功率均匀性",
    parameterKeys: ["ultrasonicFrequency", "ultrasonicPower", "transducerCount"],
    region: "international",
    category: "ultrasonic",
  },
  {
    code: "GB/T 32580",
    titleZh: "超声波清洗机",
    titleEn: "Ultrasonic cleaning machines",
    requirement: "振子间距: ≤100mm(25kHz)、≤70mm(40kHz)、≤50mm(68kHz)。发生器单台≤1200W(安全)。温度控制±2°C(精密)/±5°C(标准)。不锈钢振板厚≥2mm(25kHz)/≥1.5mm(40kHz)",
    parameterKeys: ["ultrasonicFrequency", "ultrasonicPower", "transducerCount"],
    region: "china",
    category: "ultrasonic",
  },
  {
    code: "GRT-ES-003",
    titleZh: "GRT超声波清洗系统配置规范",
    titleEn: "GRT Enterprise Standard — Ultrasonic System Configuration",
    clause: "v2.5 (2025-08)",
    requirement: "标准配置: 底部振(标准), 侧振+底振(精密), 多频切换(超精密)。振子布局: 底面均布, 边缘距槽壁≥30mm。功率可调范围50-100%。扫频宽度±1kHz(25/40kHz), ±2kHz(68kHz)。脱气时间: 新液≥10min, 换液后≥5min",
    parameterKeys: ["ultrasonicFrequency", "ultrasonicPower", "transducerCount"],
    region: "grt",
    category: "enterprise",
  },
];

// ── 5. Heater Standards ─────────────────────────────────────────────────

const HEATER_STANDARDS: StandardReference[] = [
  {
    code: "GB/T 23150",
    titleZh: "工业电加热设备",
    titleEn: "Industrial electric heating equipment",
    requirement: "浸入式加热器: 功率密度≤3W/cm²(水系)、≤2W/cm²(油/溶剂)、≤1.5W/cm²(高粘度)。每回路≤6kW(安全限值)。温控: PT100精度±0.5°C、K型±2.5°C。过温保护: 双重(控制器+独立温控器)。加热管材质≥SUS316L(碱性/酸性)",
    parameterKeys: ["heaterPower"],
    region: "china",
    category: "heater",
  },
  {
    code: "VDI 2035",
    titleZh: "暖通水系统水质防结垢防腐蚀",
    titleEn: "Prevention of damage in water heating installations — Scale and corrosion",
    requirement: "水温>60°C→每月检查水垢。DI水系统加热管必须SUS316L(去离子水腐蚀性强)。碱液>10%浓度+温度>70°C→应力腐蚀风险(SUS316L或Inconel)。加热管表面功率密度随介质腐蚀性降低",
    parameterKeys: ["heaterPower", "dryingTemp", "tankMaterial"],
    region: "germany",
    category: "heater",
  },
  {
    code: "UL 499",
    titleZh: "电加热器安全标准",
    titleEn: "UL Standard for Electric Heating Appliances",
    requirement: "北美出口加热器需UL认证。过温保护: 主控+独立高温cutoff(手动复位)。接地连续性<0.1Ω。绝缘电阻>2MΩ@500VDC。管壳温升≤300°C(干烧保护)",
    parameterKeys: ["heaterPower"],
    region: "us",
    category: "heater",
  },
  {
    code: "EN 60519-1",
    titleZh: "工业电热装置安全",
    titleEn: "Safety in installations for electroheating and electromagnetic processing",
    requirement: "EU加热系统需符合EN 60519-1(通则)+EN 60519-2(电阻加热)。温度限值保护SIL1以上。加热功率>12kW需SCR调功器(避免接触器频繁开关)",
    parameterKeys: ["heaterPower"],
    region: "eu",
    category: "heater",
  },
  {
    code: "GRT-ES-005",
    titleZh: "GRT加热系统设计规范",
    titleEn: "GRT Enterprise Standard — Heating System Design",
    clause: "v2.0 (2025-07)",
    requirement: "加热功率P(kW)=V(L)×ΔT/(860×t(h)×η), η=0.85。每回路≤6kW, SCR调功(>12kW总功率)。双重过温: PLC控温(PT100)+独立温控器(±3°C偏移报警)。加热管距槽底≥50mm, 距工件≥80mm。出厂前: 绝缘测试2000V/1min, 接地<0.1Ω",
    parameterKeys: ["heaterPower", "dryingTemp"],
    region: "grt",
    category: "enterprise",
  },
];

// ── 6. Spray Standards ──────────────────────────────────────────────────

const SPRAY_STANDARDS: StandardReference[] = [
  {
    code: "ISO 16232-3",
    titleZh: "道路车辆清洁度 — 压力冲洗萃取法",
    titleEn: "Road vehicles — Cleanliness — Part 3: Extraction by pressure rinsing",
    requirement: "喷淋萃取: 标准2-4bar、精密5-8bar、超精密10-15bar。喷嘴覆盖重叠20-30%。扇形(flat-fan)用于平面/凹槽件, 锥形(full-cone)用于盲孔/深腔。喷嘴-工件距离100-200mm",
    parameterKeys: ["sprayPressure", "nozzleType", "nozzleCount"],
    region: "international",
    category: "spray",
  },
  {
    code: "GRT-ES-004",
    titleZh: "GRT喷淋系统设计规范",
    titleEn: "GRT Enterprise Standard — Spray System Design",
    clause: "v2.3 (2025-08)",
    requirement: "管路布局: 两侧+顶部(标准), +底部(超精密)。喷嘴间距=有效覆盖宽度×(1-overlap)。歧管DN比支管大2级(减压损)。系统压力=喷嘴压力+管路损失(估1-2bar)。必配: 入口球阀+压力表+流量计+回液过滤器。喷嘴材质: 碱性→SUS316L, 酸性→PVDF, 超纯水→PFA",
    parameterKeys: ["sprayPressure", "nozzleType", "nozzleCount"],
    region: "grt",
    category: "enterprise",
  },
];

// ── 7. Drying Standards ─────────────────────────────────────────────────

const DRYING_STANDARDS: StandardReference[] = [
  {
    code: "DIN 12880",
    titleZh: "电热干燥箱",
    titleEn: "Electrically heated drying ovens",
    requirement: "热风干燥: 60-80°C(标准), 80-120°C(快速)。温度均匀性≤±5°C(Class A)/±10°C(Class B)。真空干燥: 残压<10mbar(标准), <1mbar(精密), <0.01mbar(半导体)。升温速率≤5°C/min(防热冲击)",
    parameterKeys: ["dryingTemp", "dryingAirflow", "vacuumLevel"],
    region: "germany",
    category: "drying",
  },
  {
    code: "ISO 3746",
    titleZh: "声学 — 噪声测定",
    titleEn: "Acoustics — Determination of sound power levels using sound pressure",
    requirement: "风刀/鼓风机噪声: 出口风速≤30m/s(≈80dB(A))。车间限值85dB(A)(8h TWA, OSHA)。>80dB(A)需加装消声器或隔音罩",
    parameterKeys: ["dryingAirflow"],
    region: "international",
    category: "drying",
  },
  {
    code: "NFPA 86",
    titleZh: "烘箱和熔炉",
    titleEn: "Standard for Ovens and Furnaces",
    clause: "Chapter 7: Class A Ovens",
    requirement: "北美热风/真空干燥系统需符合NFPA 86。可燃溶剂蒸气浓度<LEL 25%。强制通风换气≥4次/h。溶剂型清洗后干燥需防爆配置(Class I Div 1/2)",
    parameterKeys: ["dryingTemp", "dryingAirflow"],
    region: "us",
    category: "drying",
  },
  {
    code: "EN 1539",
    titleZh: "干燥设备和烘箱安全",
    titleEn: "Dryers and ovens in which flammable substances are released — Safety requirements",
    requirement: "EU干燥设备: 可燃物料需LEL监测(报警50%LEL, 联锁75%LEL)。温度限值器SIL2。门联锁(开门→停加热)。真空系统: 泄漏率测试<1mbar/min",
    parameterKeys: ["dryingTemp", "dryingAirflow", "vacuumLevel"],
    region: "eu",
    category: "drying",
  },
  {
    code: "GRT-ES-009",
    titleZh: "GRT干燥系统设计规范",
    titleEn: "GRT Enterprise Standard — Drying System Design",
    clause: "v1.8 (2025-07)",
    requirement: "风刀: 不锈钢风刀(SUS304), 缝隙宽0.5-1mm, 风速30-50m/s。热风: 循环风机+电加热器, HEPA过滤(精密级)。真空: 旋片泵(标准)/罗茨+旋片(精密)。出口工件表面残留水膜<0.1g/cm²(标准), <0.01g/cm²(精密)",
    parameterKeys: ["dryingTemp", "dryingAirflow", "vacuumLevel"],
    region: "grt",
    category: "enterprise",
  },
];

// ── 8. Conveyor / Handling Standards ────────────────────────────────────

const CONVEYOR_STANDARDS: StandardReference[] = [
  {
    code: "ISO 5048",
    titleZh: "连续搬运设备 — 带式输送机",
    titleEn: "Continuous mechanical handling equipment — Belt conveyors with carrying idlers — Calculation",
    requirement: "辊道输送: 辊间距≤工件最短边1/3。辊筒材质SUS304(湿区)。承重安全系数1.5倍。防滑速度≤5m/min(湿件)。导向板间隙<工件宽度10mm",
    parameterKeys: ["conveyorType", "conveyorSpeed", "weightCapacity"],
    region: "international",
    category: "conveyor",
  },
  {
    code: "GB/T 10595",
    titleZh: "带式输送机技术条件",
    titleEn: "Technical specifications for belt conveyors",
    requirement: "链条输送: 节距匹配工件尺寸(间距≤工件长1/2)。提升行车: 起升速度≤8m/min, 运行速度≤20m/min, 超载保护1.25×额定。翻转机构: 定位精度±2°, 翻转时间≤5s",
    parameterKeys: ["conveyorType", "conveyorSpeed", "weightCapacity"],
    region: "china",
    category: "conveyor",
  },
  {
    code: "ASME B20.1",
    titleZh: "输送机安全标准",
    titleEn: "Safety Standard for Conveyors and Related Equipment",
    requirement: "北美输送机安全: 夹点防护(≤6mm间隙处加guard)。急停拉绳(≤30m间距)。启动前警报(声光3s)。电动辊筒防护IP55(湿区)。最大运行速度需限速保护",
    parameterKeys: ["conveyorType", "conveyorSpeed"],
    region: "us",
    category: "conveyor",
  },
  {
    code: "EN 619",
    titleZh: "连续搬运设备安全和EMC要求",
    titleEn: "Continuous handling equipment and systems — Safety and EMC requirements for equipment for mechanical handling of unit loads",
    requirement: "CE认证输送系统: 防护等级IP54(湿区IP65)。安全距离EN ISO 13857。夹点防护EN ISO 14120。能量隔离LOTO(EN 1037)。手动操作力≤250N",
    parameterKeys: ["conveyorType", "conveyorSpeed", "weightCapacity"],
    region: "eu",
    category: "conveyor",
  },
];

// ── 9. Electrical Standards ─────────────────────────────────────────────

const ELECTRICAL_STANDARDS: StandardReference[] = [
  // --- International ---
  {
    code: "IEC 61131-3",
    titleZh: "PLC编程语言",
    titleEn: "Programmable controllers — Programming languages",
    requirement: "IO模块: DI/DO 16点/模块(S7-1515/1516), 32点/模块(S7-1517/1518)。AI 8通道/模块(4-20mA/0-10V)。AO 4通道/模块。预留IO: 设计总量+15%备用",
    parameterKeys: ["plcDI", "plcDO", "plcAI", "plcAO"],
    region: "international",
    category: "electrical",
  },
  {
    code: "IEC 60204-1",
    titleZh: "机械电气安全 — 机械的电气设备",
    titleEn: "Safety of machinery — Electrical equipment of machines — Part 1: General requirements",
    clause: "Edition 6.0 (2016)",
    requirement: "急停: 每操作面≥1个(IEC 60947-5-5)。EMO回路SIL2/PLd。电机过载保护: 热继+断路器。接线端子标记IEC 81346。控制电压24VDC(PELV)。电缆标号每端。接地端子≥主电缆截面50%",
    parameterKeys: ["emergencyStopCount", "motorCount", "voltageSystem"],
    region: "international",
    category: "electrical",
  },
  // --- China ---
  {
    code: "GB/T 5226.1",
    titleZh: "机械电气安全",
    titleEn: "Safety of machinery — Electrical equipment of machines — Part 1 (China)",
    requirement: "等同采用IEC 60204-1。控制柜防护IP54(室内)/IP65(户外/湿区)。主回路380V/3P/50Hz。控制变压器隔离。铜排载流量按GB/T 5585。柜体颜色RAL 7035(标准灰)",
    parameterKeys: ["voltageSystem", "communicationProtocol"],
    region: "china",
    category: "electrical",
  },
  // --- North America (UL/NFPA) ---
  {
    code: "UL 508A",
    titleZh: "工业控制柜安全标准",
    titleEn: "UL Standard for Industrial Control Panels",
    clause: "4th Edition + SB 4.0",
    requirement: "北美出口控制柜必须UL 508A认证。SCCR(短路电流额定值)计算。功率器件间距(Supplement SB)。铜线AWG规格(非mm²)。线槽填充率≤40%。UL认证元器件(断路器/接触器/端子)。柜体NEMA 12(室内)/NEMA 4X(冲洗)。标牌英文+法文(加拿大)",
    parameterKeys: ["voltageSystem", "motorCount", "plcDI", "plcDO"],
    region: "us",
    category: "electrical",
  },
  {
    code: "NFPA 79",
    titleZh: "工业机械电气标准",
    titleEn: "Electrical Standard for Industrial Machinery",
    clause: "2024 Edition",
    requirement: "北美机械电气设计主标准(对标IEC 60204-1)。电源断开装置(主断路器)可锁定。控制电路120VAC(北美标准)或24VDC。电机分支电路保护(NEC Art. 430)。接地: 绿色或绿/黄线。导体标识每300mm",
    parameterKeys: ["voltageSystem", "motorCount", "emergencyStopCount"],
    region: "us",
    category: "electrical",
  },
  {
    code: "NEC/NFPA 70",
    titleZh: "美国国家电气规程",
    titleEn: "National Electrical Code",
    clause: "Article 430 (Motors), Article 670 (Industrial Machinery)",
    requirement: "电机电路: 分支保护≤250%FLC(熔断器)或≤175%FLC(断路器)。导线容量≥125%FLC。接地导体(EGC)尺寸按NEC 250.122。特殊区域: Class I Div 2(溶剂干燥区)",
    parameterKeys: ["motorCount", "voltageSystem"],
    region: "us",
    category: "electrical",
  },
  // --- EU ---
  {
    code: "EN 60439-1 / EN 61439-2",
    titleZh: "低压成套开关设备和控制设备",
    titleEn: "Low-voltage switchgear and controlgear assemblies",
    requirement: "CE认证控制柜需EN 61439-2。温升测试(≤70K端子)。电气间隙/爬电距离(≥8mm/380V)。EMC屏蔽(门框导电垫)。IP防护测试报告。柜内温升计算(或强制通风)",
    parameterKeys: ["voltageSystem", "motorCount"],
    region: "eu",
    category: "electrical",
  },
  {
    code: "GRT-ES-006",
    titleZh: "GRT电气控制柜设计规范",
    titleEn: "GRT Enterprise Standard — Electrical Cabinet Design",
    clause: "v3.0 (2025-09)",
    requirement: "标准柜体: 800×600×2200mm(≤60IO), 1000×800×2200mm(60-150IO), 1200×800×2200mm(>150IO)。PLC: 西门子S7-1500(标准)/S7-1200(简单线)。通讯PROFINET(主)+Modbus TCP(三方设备)。线号打印(每端+中间)。24VDC电源N+1冗余。触摸屏: TP900(12工位以下)/TP1200(12+)。出厂前: 绝缘测试+功能测试+IO点检",
    parameterKeys: ["plcDI", "plcDO", "plcAI", "plcAO", "voltageSystem", "communicationProtocol"],
    region: "grt",
    category: "enterprise",
  },
];

// ── 10. Safety Standards ────────────────────────────────────────────────

const SAFETY_STANDARDS: StandardReference[] = [
  {
    code: "ISO 13849-1",
    titleZh: "机械安全 — 控制系统安全相关部件",
    titleEn: "Safety of machinery — Safety-related parts of control systems — Part 1: General principles",
    clause: "Edition 4 (2023)",
    requirement: "清洗线安全等级: PLd/SIL2(标准), PLe/SIL3(机器人集成)。安全联锁: 液位低→断加热(Cat.3)、超温→断电(Cat.3)、门开→停机(Cat.4)。急停: 红色蘑菇头(IEC 60947-5-5), 自锁, 手动复位。安全继电器/安全PLC(F-CPU或Safety IO)",
    parameterKeys: ["emergencyStopCount"],
    region: "international",
    category: "safety",
  },
  {
    code: "ISO 12100",
    titleZh: "机械安全 — 通用设计原则 — 风险评估与降低",
    titleEn: "Safety of machinery — General principles for design — Risk assessment and risk reduction",
    requirement: "风险评估方法论: 危险辨识→风险估计→风险评价→保护措施。三级保护原则: 1)本质安全设计, 2)防护装置/安全装置, 3)使用信息(标识/手册)。残余风险必须记录在操作手册",
    parameterKeys: [],
    region: "international",
    category: "safety",
  },
  {
    code: "EN ISO 14120",
    titleZh: "机械安全 — 防护装置",
    titleEn: "Safety of machinery — Guards — General requirements for the design and construction",
    requirement: "固定防护: 需工具拆卸。活动防护: 联锁开关(门磁+安全开关)。透明防护板: 聚碳酸酯≥3mm。防护栏高度≥1400mm(EN ISO 13857)。检修门: 安全联锁+门锁",
    parameterKeys: ["emergencyStopCount"],
    region: "eu",
    category: "safety",
  },
  {
    code: "2006/42/EC",
    titleZh: "CE 机械指令",
    titleEn: "Machinery Directive 2006/42/EC",
    requirement: "出口欧洲/英国(UKCA)整机认证。需满足: EMC(EN 61326-1), LVD(EN 61010-1或EN 60204-1), 机械安全(EN ISO 12100), 噪声(EN ISO 3744)。技术文件TCF保存10年。CE铭牌+DoC符合性声明",
    parameterKeys: [],
    region: "eu",
    category: "safety",
  },
  {
    code: "2014/35/EU (LVD)",
    titleZh: "低电压指令",
    titleEn: "Low Voltage Directive",
    requirement: "50-1000VAC / 75-1500VDC设备适用。与机械指令互斥(机械优先)。独立电气柜/控制面板可能需LVD单独认证。测试标准EN 61010-1(实验室/工业设备)",
    parameterKeys: ["voltageSystem"],
    region: "eu",
    category: "safety",
  },
  {
    code: "2014/30/EU (EMC)",
    titleZh: "电磁兼容指令",
    titleEn: "Electromagnetic Compatibility Directive",
    requirement: "变频器+超声波发生器→EMC辐射源。需符合EN 61326-1(工业环境)。措施: 屏蔽电缆、EMC滤波器(VFD入口)、EMC接地(360°屏蔽层接地)。超声波发生器需EMC Class A",
    parameterKeys: ["ultrasonicPower", "motorCount"],
    region: "eu",
    category: "safety",
  },
  {
    code: "ATEX 2014/34/EU",
    titleZh: "防爆指令",
    titleEn: "Equipment for potentially explosive atmospheres (ATEX)",
    requirement: "溶剂型清洗(IPA/NMP/碳氢)需防爆评估。Zone 1内部→Ex d/Ex e电气。Zone 2外围→Ex nA。防爆电机+防爆接线盒。氮气惰化(O₂<8%)或强制通风(浓度<25%LEL)",
    parameterKeys: ["tankMaterial"],
    region: "eu",
    category: "safety",
  },
  {
    code: "OSHA 29 CFR 1910",
    titleZh: "美国职业安全与健康标准",
    titleEn: "OSHA General Industry Standards",
    clause: "Subpart S (Electrical), Subpart O (Machinery & Machine Guarding)",
    requirement: "LOTO能量隔离(1910.147): 每台设备独立主断路器可挂锁。机械防护(1910.212): 夹点、旋转部件需physical guard。化学品: SDS可及(1910.1200 HazCom)。噪声: TWA≤90dB(A)/8h或85dB(A)(hearing conservation)",
    parameterKeys: ["emergencyStopCount"],
    region: "us",
    category: "safety",
  },
  {
    code: "ANSI/RIA 15.06",
    titleZh: "工业机器人安全要求",
    titleEn: "Industrial Robots and Robot Systems — Safety Requirements",
    requirement: "机器人清洗工位(ROBOT_CLEAN): 安全围栏+光幕(Cat.4/PLe)。协作区域: 速度≤250mm/s, 力≤150N。ROBOT_CLEAN整合需进行额外风险评估。北美需ANSI/RIA, 欧洲需EN ISO 10218-2",
    parameterKeys: [],
    region: "us",
    category: "safety",
  },
  {
    code: "GRT-ES-007",
    titleZh: "GRT安全系统设计规范",
    titleEn: "GRT Enterprise Standard — Safety System Design",
    clause: "v2.8 (2025-09)",
    requirement: "最低安全等级PLd/SIL2。每台设备≥2个急停(操作侧+电柜侧)。安全门: 磁编码开关(Pilz PSENmag/SICK RE13)。光幕: 分辨率≤30mm(手指检测)。安全PLC: S7-1516F(标准)/S7-1518F(复杂线)。出厂前: 安全功能验证测试(每个急停+门联锁+光幕)、测试记录归档",
    parameterKeys: ["emergencyStopCount"],
    region: "grt",
    category: "enterprise",
  },
];

// ── 11. Environmental Standards ─────────────────────────────────────────

const ENVIRONMENTAL_STANDARDS: StandardReference[] = [
  {
    code: "ISO 14001",
    titleZh: "环境管理体系",
    titleEn: "Environmental management systems — Requirements with guidance for use",
    requirement: "清洗废液处理: 碱性废液需中和至pH 6-9后排放。含油废液→油水分离器→委托处理。废水COD/BOD需达标排放(GB 8978一级)。清洗线需配废液收集系统(接液盘+排液管路)",
    parameterKeys: ["tankMaterial"],
    region: "international",
    category: "environmental",
  },
  {
    code: "EU RoHS / REACH",
    titleZh: "有害物质限制 / 化学品注册评估",
    titleEn: "Restriction of Hazardous Substances / Registration, Evaluation, Authorisation and Restriction of Chemicals",
    requirement: "出口欧洲: 设备材料需RoHS符合性声明(Pb/Hg/Cd/Cr⁶⁺/PBB/PBDE)。清洗化学品需REACH注册(>1吨/年)。PFAS限制趋势: 含氟表面活性剂替代方案",
    parameterKeys: [],
    region: "eu",
    category: "environmental",
  },
  {
    code: "EPA 40 CFR",
    titleZh: "美国环境保护署法规",
    titleEn: "EPA Regulations — Clean Air Act / Clean Water Act",
    clause: "Part 63 (NESHAP), Part 433 (Metal Finishing)",
    requirement: "北美VOC排放: 溶剂清洗需密闭/活性炭吸附/冷凝回收。废水: 金属离子排放限值(Zn<2.61mg/L, Cr<2.77mg/L)。碳氢清洗剂需EPA登记。替代品推荐: 水基碱性清洗剂",
    parameterKeys: [],
    region: "us",
    category: "environmental",
  },
];

// ── 12. Material Compatibility Standards ────────────────────────────────

const MATERIAL_STANDARDS: StandardReference[] = [
  {
    code: "ASTM A240",
    titleZh: "耐热不锈钢板材",
    titleEn: "Standard Specification for Chromium and Chromium-Nickel Stainless Steel Plate, Sheet, and Strip",
    requirement: "材质选型基准: SUS304(18Cr-8Ni通用), SUS316L(16Cr-10Ni-2Mo耐点蚀), SUS2205(双相不锈钢-高强度)。材质证书3.1(EN 10204)。表面光洁度: Ra≤0.8μm(精密清洗槽), Ra≤1.6μm(标准)",
    parameterKeys: ["tankMaterial"],
    region: "international",
    category: "material",
  },
  {
    code: "GRT-ES-008",
    titleZh: "GRT材料兼容性选型指南",
    titleEn: "GRT Enterprise Standard — Material Compatibility Guide",
    clause: "v2.2 (2025-08)",
    requirement: "选型矩阵: 碱性pH8-12→SUS304(标准)/SUS316L(含Cl⁻); 酸性pH<4→SUS316L/Hastelloy; 有机溶剂→PP(≤80°C)/PVDF(≤140°C)/SUS316L; HF→PP/Hastelloy C276; 纯水DI→SUS316L(EP电抛光)。焊接: 全自动TIG焊+背面充氩保护。钝化处理: 20%HNO₃ 60°C/30min",
    parameterKeys: ["tankMaterial"],
    region: "grt",
    category: "enterprise",
  },
];

// ── All Standards Combined ──────────────────────────────────────────────

const ALL_STANDARDS: StandardReference[] = [
  ...CLEANLINESS_STANDARDS,
  ...TANK_STANDARDS,
  ...PUMP_STANDARDS,
  ...ULTRASONIC_STANDARDS,
  ...HEATER_STANDARDS,
  ...SPRAY_STANDARDS,
  ...DRYING_STANDARDS,
  ...CONVEYOR_STANDARDS,
  ...ELECTRICAL_STANDARDS,
  ...SAFETY_STANDARDS,
  ...ENVIRONMENTAL_STANDARDS,
  ...MATERIAL_STANDARDS,
];

// ══════════════════════════════════════════════════════════════════════════
// LOOKUP FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════

/**
 * Get all applicable standards for a station type.
 */
export function getStationStandards(stationType: string): StationStandardsResult {
  const categoryMap: Record<string, StandardReference[][]> = {
    ULTRASONIC:   [CLEANLINESS_STANDARDS, TANK_STANDARDS, PUMP_STANDARDS, ULTRASONIC_STANDARDS, HEATER_STANDARDS, ELECTRICAL_STANDARDS, SAFETY_STANDARDS, ENVIRONMENTAL_STANDARDS, MATERIAL_STANDARDS],
    PRE_WASH:     [CLEANLINESS_STANDARDS, TANK_STANDARDS, PUMP_STANDARDS, HEATER_STANDARDS, ELECTRICAL_STANDARDS, SAFETY_STANDARDS, ENVIRONMENTAL_STANDARDS, MATERIAL_STANDARDS],
    DEGREASING:   [CLEANLINESS_STANDARDS, TANK_STANDARDS, PUMP_STANDARDS, HEATER_STANDARDS, ELECTRICAL_STANDARDS, SAFETY_STANDARDS, ENVIRONMENTAL_STANDARDS, MATERIAL_STANDARDS],
    RINSE:        [CLEANLINESS_STANDARDS, TANK_STANDARDS, PUMP_STANDARDS, ELECTRICAL_STANDARDS, SAFETY_STANDARDS, ENVIRONMENTAL_STANDARDS, MATERIAL_STANDARDS],
    DI_RINSE:     [CLEANLINESS_STANDARDS, TANK_STANDARDS, PUMP_STANDARDS, ELECTRICAL_STANDARDS, SAFETY_STANDARDS, ENVIRONMENTAL_STANDARDS, MATERIAL_STANDARDS],
    PASSIVATION:  [CLEANLINESS_STANDARDS, TANK_STANDARDS, HEATER_STANDARDS, ELECTRICAL_STANDARDS, SAFETY_STANDARDS, ENVIRONMENTAL_STANDARDS, MATERIAL_STANDARDS],
    TURBULENCE:   [CLEANLINESS_STANDARDS, TANK_STANDARDS, PUMP_STANDARDS, ELECTRICAL_STANDARDS, SAFETY_STANDARDS, ENVIRONMENTAL_STANDARDS, MATERIAL_STANDARDS],
    SPRAY:        [CLEANLINESS_STANDARDS, SPRAY_STANDARDS, PUMP_STANDARDS, ELECTRICAL_STANDARDS, SAFETY_STANDARDS, ENVIRONMENTAL_STANDARDS],
    ROBOT_CLEAN:  [CLEANLINESS_STANDARDS, SPRAY_STANDARDS, PUMP_STANDARDS, ELECTRICAL_STANDARDS, SAFETY_STANDARDS, ENVIRONMENTAL_STANDARDS],
    AIR_KNIFE:    [DRYING_STANDARDS, ELECTRICAL_STANDARDS, SAFETY_STANDARDS],
    HOT_AIR_DRY:  [DRYING_STANDARDS, HEATER_STANDARDS, ELECTRICAL_STANDARDS, SAFETY_STANDARDS],
    VACUUM_DRY:   [DRYING_STANDARDS, ELECTRICAL_STANDARDS, SAFETY_STANDARDS],
    COOLDOWN:     [DRYING_STANDARDS, ELECTRICAL_STANDARDS, SAFETY_STANDARDS],
    LOADING:      [CONVEYOR_STANDARDS, ELECTRICAL_STANDARDS, SAFETY_STANDARDS],
    UNLOADING:    [CONVEYOR_STANDARDS, ELECTRICAL_STANDARDS, SAFETY_STANDARDS],
    TRANSFER:     [CONVEYOR_STANDARDS, ELECTRICAL_STANDARDS, SAFETY_STANDARDS],
    INSPECTION:   [CLEANLINESS_STANDARDS, ELECTRICAL_STANDARDS, SAFETY_STANDARDS],
  };

  const standardGroups = categoryMap[stationType] || [ELECTRICAL_STANDARDS, SAFETY_STANDARDS];
  // Deduplicate by code (since same standard may appear in multiple groups)
  const seen = new Set<string>();
  const applicable: StandardReference[] = [];
  for (const std of standardGroups.flat()) {
    if (!seen.has(std.code)) {
      seen.add(std.code);
      applicable.push(std);
    }
  }

  // Build per-parameter index
  const parameterStandards: Record<string, StandardReference[]> = {};
  for (const std of applicable) {
    for (const key of std.parameterKeys) {
      if (!parameterStandards[key]) parameterStandards[key] = [];
      parameterStandards[key].push(std);
    }
  }

  return {
    stationType,
    applicableStandards: applicable,
    parameterStandards,
  };
}

/**
 * Get standards applicable to a specific parameter key.
 */
export function getParameterStandards(paramKey: string): StandardReference[] {
  return ALL_STANDARDS.filter(s => s.parameterKeys.includes(paramKey));
}

/**
 * Get standards filtered by region (for export-specific compliance).
 */
export function getStandardsByRegion(
  stationType: string,
  regions: Array<"international" | "china" | "eu" | "us" | "germany" | "grt">,
): StandardReference[] {
  const { applicableStandards } = getStationStandards(stationType);
  const regionSet = new Set(regions);
  return applicableStandards.filter(s => regionSet.has(s.region));
}

// ══════════════════════════════════════════════════════════════════════════
// VALIDATION ENGINE
// ══════════════════════════════════════════════════════════════════════════

/**
 * Validate a parameter value against standard ranges.
 * Returns warnings if value falls outside typical standard-recommended ranges.
 */
export function validateAgainstStandards(
  stationType: string,
  paramKey: string,
  value: number | string,
): { valid: boolean; warnings: string[]; standardRefs: string[] } {
  const warnings: string[] = [];
  const standardRefs: string[] = [];
  const numValue = typeof value === "number" ? value : parseFloat(value as string);

  // ── Tank volume / dimensions ──
  if (paramKey === "tankVolume" && !isNaN(numValue)) {
    standardRefs.push("GB/T 150", "GRT-ES-001");
    if (numValue > 2000) warnings.push("槽体容积>2000L，需确认结构强度计算 (GB/T 150, ASME VIII)");
  }

  if (paramKey === "tankHeight" && !isNaN(numValue)) {
    if (numValue > 1500) warnings.push("槽高>1500mm，工件装卸需行车/提升机构 (ISO 5048)");
    standardRefs.push("GB/T 150", "GRT-ES-001");
  }

  // ── Tank material ──
  if (paramKey === "tankMaterial" && typeof value === "string") {
    standardRefs.push("DIN 6601", "ASTM A240", "GRT-ES-008");
    if (value === "PP" || value === "PVDF") {
      warnings.push("非金属材质(PP/PVDF)需确认使用温度限值: PP≤80°C, PVDF≤140°C (GRT-ES-008)");
    }
  }

  // ── Pump ──
  if (paramKey === "pumpFlowRate" && !isNaN(numValue)) {
    standardRefs.push("ISO 2858", "GRT-ES-002");
    if (numValue > 500) warnings.push("泵流量>500L/min，建议校核管路压损和NPSH (ANSI/ASME B73.1)");
    if (numValue < 5) warnings.push("泵流量<5L/min，建议使用计量泵或磁力泵 (GRT-ES-002)");
  }

  if (paramKey === "pumpHead" && !isNaN(numValue)) {
    standardRefs.push("ISO 2858");
    if (numValue > 40) warnings.push("扬程>40m，需确认多级泵或增压方案 (ISO 2858)");
  }

  // ── Ultrasonic ──
  if (paramKey === "ultrasonicPower" && !isNaN(numValue)) {
    standardRefs.push("IEC 63218", "GB/T 32580", "GRT-ES-003");
    if (numValue > 10000) warnings.push("超声功率>10kW，需分区控制+功率均匀性验证 (IEC 63218)");
  }

  if (paramKey === "ultrasonicFrequency" && !isNaN(numValue)) {
    standardRefs.push("IEC 63218", "GRT-ES-003");
    if (numValue > 120) warnings.push("频率>120kHz，属于兆声波范围，需确认振子供应商 (IEC 63218)");
  }

  if (paramKey === "transducerCount" && !isNaN(numValue)) {
    standardRefs.push("GB/T 32580", "GRT-ES-003");
    if (numValue > 100) warnings.push("振子数>100个，建议分组控制+功率均匀性检查 (GB/T 32580)");
  }

  // ── Spray pressure ──
  if (paramKey === "sprayPressure" && !isNaN(numValue)) {
    standardRefs.push("ISO 16232-3", "VDA 19.1", "GRT-ES-004");
    if (numValue < 1) warnings.push("喷淋压力<1bar，不满足ISO 16232最低萃取要求");
    if (numValue > 15) warnings.push("喷淋压力>15bar，需高压管路和安全防护 (VDA 19.1)，确认喷嘴额定压力");
    if (numValue > 8 && numValue <= 15) warnings.push("高压喷淋8-15bar，需不锈钢高压管+快速接头+安全阀 (GRT-ES-004)");
  }

  if (paramKey === "nozzleCount" && !isNaN(numValue)) {
    standardRefs.push("ISO 16232-3", "GRT-ES-004");
    if (numValue > 80) warnings.push("喷嘴数>80个，需校核泵流量是否匹配总喷嘴流量 (GRT-ES-004)");
  }

  // ── Heater power ──
  if (paramKey === "heaterPower" && !isNaN(numValue)) {
    standardRefs.push("GB/T 23150", "UL 499", "GRT-ES-005");
    if (numValue > 24) warnings.push("单工位加热>24kW，需SCR调功器+分区控温 (GB/T 23150, GRT-ES-005)");
    if (numValue > 48) warnings.push("加热功率>48kW，需独立加热柜+SCR+散热风扇 (UL 499)");
    if (numValue > 0 && numValue < 1) warnings.push("加热功率<1kW，温控精度可能不足 (GRT-ES-005)");
  }

  // ── Drying temperature ──
  if (paramKey === "dryingTemp" && !isNaN(numValue)) {
    standardRefs.push("DIN 12880", "GRT-ES-009");
    if (numValue > 120) warnings.push("干燥温度>120°C，需确认工件/夹具耐温性 (DIN 12880)");
    if (numValue > 200) warnings.push("温度>200°C，需NFPA 86合规评估(北美) (NFPA 86)");
    if (numValue > 80) warnings.push("温度>80°C，PP/PVDF材料零件需远离或隔热 (GRT-ES-009)");
  }

  // ── Vacuum level ──
  if (paramKey === "vacuumLevel" && !isNaN(numValue)) {
    standardRefs.push("DIN 12880", "GRT-ES-009");
    if (numValue < 0.1) warnings.push("真空度<0.1mbar，需涡轮分子泵或扩散泵 (DIN 12880)");
    if (numValue < 1) warnings.push("真空度<1mbar，需确认O圈/密封材质(Viton/EPDM) (GRT-ES-009)");
  }

  // ── Conveyor speed ──
  if (paramKey === "conveyorSpeed" && !isNaN(numValue)) {
    standardRefs.push("ISO 5048", "ASME B20.1", "GRT-ES-001");
    if (numValue > 10) warnings.push("输送速度>10m/min，湿工件可能液滴飞溅 (ISO 5048)");
    if (numValue > 20) warnings.push("速度>20m/min，需机械限速保护+安全围栏 (ASME B20.1, EN 619)");
  }

  // ── Weight capacity ──
  if (paramKey === "weightCapacity" && !isNaN(numValue)) {
    standardRefs.push("ISO 5048", "GB/T 10595");
    if (numValue > 1000) warnings.push("承重>1000kg，需结构FEA分析+地脚螺栓计算 (ISO 5048)");
    if (numValue > 2000) warnings.push("承重>2000kg，需独立基础/地坑 (GB/T 10595)");
  }

  // ── Filtration ──
  if (paramKey === "filtrationMicron" && !isNaN(numValue)) {
    standardRefs.push("ISO 16232", "ISO 4406", "GRT-ES-001");
    if (numValue < 1) warnings.push("过滤精度<1μm，需确认过滤器流量匹配(避免压损过大) (ISO 4406)");
    if (numValue > 100) warnings.push("过滤精度>100μm，仅适用于粗清洗/预清洗 (ISO 16232)");
  }

  // ── Motor count ──
  if (paramKey === "motorCount" && !isNaN(numValue)) {
    standardRefs.push("IEC 60204-1", "NFPA 79");
    if (numValue > 8) warnings.push("电机>8台/工位，需校核变压器容量和电缆截面 (NFPA 79, NEC Art. 430)");
  }

  // ── Emergency stops ──
  if (paramKey === "emergencyStopCount" && !isNaN(numValue)) {
    standardRefs.push("ISO 13849-1", "IEC 60204-1", "OSHA 1910", "GRT-ES-007");
    if (numValue < 2) warnings.push("急停数<2个，不满足GRT最低要求(操作侧+电柜侧) (GRT-ES-007)");
  }

  // ── IO points ──
  if (paramKey === "plcDI" && !isNaN(numValue)) {
    standardRefs.push("IEC 61131-3", "GRT-ES-006");
    if (numValue > 64) warnings.push("DI>64点/工位，建议远程IO站+PROFINET通讯 (GRT-ES-006)");
  }
  if (paramKey === "plcDO" && !isNaN(numValue)) {
    standardRefs.push("IEC 61131-3", "GRT-ES-006");
  }
  if (paramKey === "plcAI" && !isNaN(numValue)) {
    standardRefs.push("IEC 61131-3", "GRT-ES-006");
    if (numValue > 16) warnings.push("AI>16通道/工位，需确认信号类型一致性(4-20mA vs 0-10V) (IEC 61131-3)");
  }

  // ── Voltage system ──
  if (paramKey === "voltageSystem" && typeof value === "string") {
    standardRefs.push("IEC 60204-1", "GB/T 5226.1", "NFPA 79", "UL 508A");
    if (value.includes("480V")) warnings.push("480V系统为北美标准，需UL 508A控制柜+NFPA 79合规 (UL 508A)");
  }

  return {
    valid: warnings.length === 0,
    warnings,
    standardRefs: [...new Set(standardRefs)],
  };
}

// ══════════════════════════════════════════════════════════════════════════
// SIZING EXPLANATIONS
// ══════════════════════════════════════════════════════════════════════════

/**
 * Get sizing formula explanation with standard references for a parameter.
 * Used in the UI to show engineers why a value was calculated.
 */
export function getSizingExplanation(paramKey: string, value: number | string): string {
  const explanations: Record<string, string> = {
    tankLength:           "槽内长 = 工件长 × 1.5 (min每侧100mm间隙) [GB/T 150, GRT-ES-001]",
    tankWidth:            "槽内宽 = 工件宽 × 1.5 (min每侧100mm间隙) [GB/T 150, GRT-ES-001]",
    tankHeight:           "槽内高 = 工件高 + 100mm浸没 + 80mm液面余量 [GB/T 150, GB/T 25198, GRT-ES-001]",
    tankVolume:           "容积 = L × W × H / 10⁶ (L); 壁厚按容积分档 [GB/T 150, ASME VIII]",
    tankMaterial:         "碱性/中性→SUS304, 酸性→SUS316L, 溶剂→PP/PVDF [DIN 6601, ASTM A240, GRT-ES-008]",
    pumpFlowRate:         "Q = 槽容积 × 换水率 / 60 (清洗3x/h, 漂洗6x/h, 喷淋8x/h); +10%裕量 [ISO 2858, GB/T 5657, GRT-ES-002]",
    pumpHead:             "H = 静压头1.5m + 管路损失3.5m + 喷嘴压降(5-15m); +15%裕量 [ISO 2858, ANSI/ASME B73.1]",
    ultrasonicFrequency:  ">500μm→25/28kHz, 100-500μm→40kHz, 50-100μm→68kHz, <50μm→120kHz [IEC 63218, GRT-ES-003]",
    ultrasonicPower:      "P = 容积(L) × 功率密度(标准10/精密20/超精密30 W/L) [IEC 63218, GB/T 32580, GRT-ES-003]",
    transducerCount:      "振子数 = 总功率 / 单振子功率(25-40kHz:60W, 68kHz:40W, 120kHz:25W); 底面均布 [GB/T 32580, GRT-ES-003]",
    heaterPower:          "P(kW) = V(L)×ΔT/(860×t(h)×η); η=0.85, 每回路≤6kW [GB/T 23150, VDI 2035, GRT-ES-005]",
    filtrationMicron:     "标准50μm, 精密25μm, 超精密5μm, 半导体级0.1μm — 匹配清洁度等级 [ISO 16232, ISO 4406]",
    sprayPressure:        "标准2-4bar, 精密5-8bar, 超精密10-15bar [ISO 16232-3, VDA 19.1, GRT-ES-004]",
    nozzleType:           "扇形(flat-fan):平面/凹槽件; 锥形(full-cone):盲孔/深腔; 距离100-200mm [VDA 19.1, GRT-ES-004]",
    nozzleCount:          "N = 管数 × 每管喷嘴数; 覆盖重叠20-30%; 管路DN需匹配总流量 [ISO 16232, GRT-ES-004]",
    dryingTemp:           "热风60-80°C(标准), 80-120°C(快速), 真空50°C; 升温≤5°C/min [DIN 12880, GRT-ES-009]",
    dryingAirflow:        "风量 = 表面积 × 5-8 m³/h/m²; 风刀每槽80m³/h [DIN 12880, GRT-ES-009]",
    vacuumLevel:          "标准10mbar, 精密1mbar, 半导体0.01mbar; 泄漏率<1mbar/min [DIN 12880, GRT-ES-009]",
    conveyorSpeed:        "湿件≤5m/min(防飞溅), 干件≤10m/min; 行车≤8m/min起升 [ISO 5048, ASME B20.1, GB/T 10595]",
    weightCapacity:       "承重 = 工件重量 × 1.5 (安全系数); >1000kg需FEA分析 [ISO 5048, GB/T 10595]",
    plcDI:                "DI = 基础4点 + 每电机2点(运行/故障) + 传感器 + 安全; 预留+15% [IEC 61131-3, GRT-ES-006]",
    plcDO:                "DO = 每电机1点(启动) + 加热2点(SSR+风扇) + 阀门 + 报警; 预留+15% [IEC 61131-3, GRT-ES-006]",
    plcAI:                "AI = 温度(1-2) + 液位(1) + 压力(0-1) + 功率(0-1); 4-20mA/0-10V [IEC 61131-3, GRT-ES-006]",
    plcAO:                "AO = VFD速度基准(0-1) + 调功器(0-1); 4-20mA输出 [IEC 61131-3]",
    emergencyStopCount:   "每操作面≥1个 + 电柜侧1个; GRT标准≥2个/台; 红色蘑菇头 [ISO 13849-1, IEC 60204-1, GRT-ES-007]",
    voltageSystem:        "中国380V/3P/50Hz, 北美480V/3P/60Hz, 欧洲400V/3P/50Hz [GB/T 5226.1, NFPA 79, EN 60204-1]",
    communicationProtocol:"西门子→PROFINET, 三方设备→Modbus TCP, 安全回路→PROFIsafe [IEC 61131-3, GRT-ES-006]",
    motorCount:           "每回路独立过载保护(热继+断路器); >8台需远程IO [IEC 60204-1, NFPA 79, NEC Art. 430]",
  };

  return explanations[paramKey] || "";
}
