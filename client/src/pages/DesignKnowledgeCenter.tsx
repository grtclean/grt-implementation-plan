import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BookOpen, Search, Cpu, Zap, Droplets, Wind, Cog, Shield, PipetteIcon, Wrench, Waves, ChevronDown, ChevronUp, MessageSquare, Send, ArrowRight, CircleDot } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// ─── Static Data ───────────────────────────────────────────────

interface DesignModule {
  id: string;
  name: string;
  category: string;
  description: string;
  applicableProducts: string[];
  keySpecs: Record<string, string>;
  bomItemCount: number;
  drawingCount: number;
  designer: string;
  maturityLevel: number;
  reusableScore: number;
}

const CATEGORIES = ["全部", "清洗腔体", "超声波系统", "高压系统", "干燥系统", "传动系统", "电气控制", "管路系统", "工件夹具", "水处理", "安全防护"] as const;

const DESIGN_MODULES: DesignModule[] = [
  { id: "M01", name: "USC-TANK-600x400 标准清洗槽", category: "清洗腔体", description: "SUS304不锈钢标准清洗槽体，含溢流口、排液阀、加热管座", applicableProducts: ["USC-06", "USC-08", "USC-10"], keySpecs: { 材质: "SUS304/2B", 尺寸: "600×400×400mm", 壁厚: "3mm", 容积: "96L" }, bomItemCount: 34, drawingCount: 8, designer: "洪小东", maturityLevel: 95, reusableScore: 92 },
  { id: "M02", name: "USC-VIBPLATE-28K 超声波振板组件", category: "超声波系统", description: "28kHz投入式超声波振板，含换能器阵列、密封法兰", applicableProducts: ["USC-06", "USC-08", "USC-10", "USC-12"], keySpecs: { 频率: "28kHz", 功率: "1200W", 面积: "600×400mm", 换能器数: "12pcs" }, bomItemCount: 22, drawingCount: 5, designer: "洪香龙", maturityLevel: 90, reusableScore: 88 },
  { id: "M03", name: "USC-GEN-3KW 超声波发生器", category: "超声波系统", description: "3kW数字式超声波发生器，支持扫频/脉冲模式", applicableProducts: ["USC-06", "USC-08", "USC-10"], keySpecs: { 功率: "3kW", 频率: "28/40kHz可切换", 控制: "PLC通讯", 效率: ">92%" }, bomItemCount: 15, drawingCount: 3, designer: "洪香龙", maturityLevel: 88, reusableScore: 85 },
  { id: "M04", name: "HPD-NOZZLE-6AXIS 6轴喷嘴组件", category: "高压系统", description: "6轴可编程高压喷嘴，用于定点去毛刺和清洗", applicableProducts: ["HPD-20", "HPD-30", "HPD-40"], keySpecs: { 轴数: "6轴", 压力: "50-800bar", 流量: "8-25L/min", 喷嘴孔径: "0.8-1.5mm" }, bomItemCount: 48, drawingCount: 12, designer: "蔡瑞", maturityLevel: 82, reusableScore: 75 },
  { id: "M05", name: "HPD-PUMP-800BAR 高压柱塞泵组", category: "高压系统", description: "800bar高压柱塞泵组件，含电机、联轴器、安全阀", applicableProducts: ["HPD-20", "HPD-30", "HPD-40"], keySpecs: { 压力: "800bar", 流量: "25L/min", 电机: "22kW", 品牌: "KAMAT" }, bomItemCount: 28, drawingCount: 6, designer: "蔡瑞", maturityLevel: 85, reusableScore: 80 },
  { id: "M06", name: "VDR-CHAMBER-STD 标准真空腔体", category: "干燥系统", description: "标准真空干燥腔体，含密封门、真空管路接口", applicableProducts: ["VDR-10", "VDR-15", "USC-10"], keySpecs: { 真空度: "50mbar", 材质: "SUS304", 尺寸: "800×600×500mm", 密封: "氟橡胶" }, bomItemCount: 42, drawingCount: 10, designer: "殷金刚", maturityLevel: 87, reusableScore: 83 },
  { id: "M07", name: "VDR-PUMP-SET 真空泵组", category: "干燥系统", description: "罗茨+旋片复合真空泵组，含管路和阀门", applicableProducts: ["VDR-10", "VDR-15"], keySpecs: { 极限真空: "5mbar", 抽速: "300m³/h", 品牌: "Busch", 功率: "7.5kW" }, bomItemCount: 18, drawingCount: 4, designer: "殷金刚", maturityLevel: 90, reusableScore: 86 },
  { id: "M08", name: "CONV-CHAIN-08B 链条输送模块", category: "传动系统", description: "08B双排链条输送线模块，含张紧、导向、驱动", applicableProducts: ["USC-06", "USC-08", "USC-10", "HPD-20"], keySpecs: { 链条: "Renold 08B", 速度: "2-10m/min", 载重: "200kg", 驱动: "SEW 1.5kW" }, bomItemCount: 56, drawingCount: 14, designer: "李大鹏", maturityLevel: 93, reusableScore: 90 },
  { id: "M09", name: "CONV-ROLLER-STD 辊道输送模块", category: "传动系统", description: "标准辊道输送线，含积放功能和定位机构", applicableProducts: ["USC-10", "USC-12", "HPD-30"], keySpecs: { 辊径: "Φ60mm", 间距: "120mm", 载重: "500kg", 驱动: "多段独立" }, bomItemCount: 38, drawingCount: 9, designer: "李大鹏", maturityLevel: 91, reusableScore: 88 },
  { id: "M10", name: "ELEC-S7-1500-KIT S7-1500控制柜套件", category: "电气控制", description: "西门子S7-1500标准控制柜，含DI/DO/AI模块、HMI、变频器", applicableProducts: ["USC-06", "USC-08", "USC-10", "HPD-20", "HPD-30", "VDR-10"], keySpecs: { PLC: "S7-1516", HMI: "TP1200 Comfort", DI: "64点", DO: "32点" }, bomItemCount: 85, drawingCount: 20, designer: "钱佳奇", maturityLevel: 96, reusableScore: 94 },
  { id: "M11", name: "ELEC-SAFETY-KIT 安全回路套件", category: "电气控制", description: "安全继电器+急停+安全门锁+光栅组合套件", applicableProducts: ["USC-06", "USC-08", "USC-10", "HPD-20", "HPD-30", "VDR-10"], keySpecs: { 安全继电器: "Pilz PNOZ", 安全等级: "SIL3/PLe", 急停: "4组", 光栅: "2组" }, bomItemCount: 32, drawingCount: 6, designer: "钱佳奇", maturityLevel: 94, reusableScore: 91 },
  { id: "M12", name: "PIPE-DI-SYSTEM DI水循环模块", category: "水处理", description: "EDI+UV+过滤三级DI水处理循环系统", applicableProducts: ["USC-08", "USC-10", "USC-12"], keySpecs: { 产水量: "500L/h", 电阻率: ">15MΩ·cm", UV: "254nm", 过滤: "0.2μm" }, bomItemCount: 45, drawingCount: 11, designer: "朱宇浩", maturityLevel: 86, reusableScore: 82 },
  { id: "M13", name: "PIPE-OIL-SKIM 油水分离模块", category: "水处理", description: "带式撇油器+聚结分离器组合", applicableProducts: ["USC-06", "USC-08", "USC-10"], keySpecs: { 处理量: "200L/h", 出水含油: "<5mg/L", 带宽: "200mm", 功率: "0.37kW" }, bomItemCount: 20, drawingCount: 5, designer: "朱宇浩", maturityLevel: 89, reusableScore: 85 },
  { id: "M14", name: "FIX-BASKET-STD 标准清洗篮", category: "工件夹具", description: "标准网格清洗篮，SUS316L，含定位销", applicableProducts: ["USC-06", "USC-08", "USC-10"], keySpecs: { 材质: "SUS316L", 网格: "3×3mm", 尺寸: "550×350×200mm", 载重: "50kg" }, bomItemCount: 12, drawingCount: 4, designer: "洪小东", maturityLevel: 92, reusableScore: 78 },
  { id: "M15", name: "FIX-ROTARY-JIG 旋转清洗夹具", category: "工件夹具", description: "伺服旋转清洗夹具，适用于缸体/变速箱壳", applicableProducts: ["HPD-20", "HPD-30"], keySpecs: { 旋转: "0-60rpm", 承重: "80kg", 驱动: "伺服电机", 定位: "气动夹紧" }, bomItemCount: 35, drawingCount: 8, designer: "洪小东", maturityLevel: 78, reusableScore: 65 },
  { id: "M16", name: "PIPE-MANIFOLD-8W 8路分配器", category: "管路系统", description: "8路不锈钢分配器组件，含流量调节阀", applicableProducts: ["USC-08", "USC-10", "HPD-30"], keySpecs: { 路数: "8路", 材质: "SUS316L", 接口: "G1/2", 压力: "10bar" }, bomItemCount: 16, drawingCount: 3, designer: "朱宇浩", maturityLevel: 91, reusableScore: 87 },
  { id: "M17", name: "SAFE-ENCL-STD 标准防护围栏", category: "安全防护", description: "铝型材+安全玻璃围栏模块，含安全门锁", applicableProducts: ["USC-06", "USC-08", "USC-10", "HPD-20"], keySpecs: { 型材: "45×45mm", 高度: "2000mm", 玻璃: "6mm钢化", 门锁: "Schmersal" }, bomItemCount: 28, drawingCount: 7, designer: "李大鹏", maturityLevel: 94, reusableScore: 92 },
  { id: "M18", name: "USC-TANK-800x600 大型清洗槽", category: "清洗腔体", description: "大型SUS304清洗槽，双层保温，适用于变速箱壳", applicableProducts: ["USC-10", "USC-12"], keySpecs: { 材质: "SUS304/2B", 尺寸: "800×600×500mm", 壁厚: "4mm", 容积: "240L" }, bomItemCount: 42, drawingCount: 10, designer: "洪小东", maturityLevel: 88, reusableScore: 84 },
  { id: "M19", name: "SPRAY-RING-360 360°喷淋环", category: "清洗腔体", description: "360°环形喷淋管组件，用于预清洗和漂洗", applicableProducts: ["USC-06", "USC-08", "USC-10"], keySpecs: { 材质: "SUS316L", 喷嘴数: "12pcs", 压力: "3-6bar", 流量: "60L/min" }, bomItemCount: 14, drawingCount: 3, designer: "朱宇浩", maturityLevel: 90, reusableScore: 88 },
  { id: "M20", name: "HOT-AIR-DRYER 热风干燥模块", category: "干燥系统", description: "循环热风干燥系统，含加热器、风机、HEPA过滤", applicableProducts: ["USC-08", "USC-10", "USC-12"], keySpecs: { 温度: "80-120°C", 风量: "2000m³/h", 加热: "12kW", 过滤: "HEPA H13" }, bomItemCount: 25, drawingCount: 6, designer: "殷金刚", maturityLevel: 87, reusableScore: 84 },
];

// ─── Knowledge Graph Data ──────────────────────────────────────

const KNOWLEDGE_NODES = [
  { category: "清洗原理", items: ["超声波空化", "高压冲击", "化学浸泡", "喷淋覆盖"], color: "bg-blue-100 border-blue-400 text-blue-800" },
  { category: "工件类型", items: ["缸体", "变速箱壳", "齿轴", "电池壳", "阀体", "涡轮叶轮"], color: "bg-green-100 border-green-400 text-green-800" },
  { category: "清洁度标准", items: ["VDA 19.1", "ISO 16232", "VW PV 3347", "MBN 10545"], color: "bg-purple-100 border-purple-400 text-purple-800" },
  { category: "关键工艺参数", items: ["频率", "压力", "温度", "时间", "浓度"], color: "bg-orange-100 border-orange-400 text-orange-800" },
  { category: "典型故障", items: ["清洗不达标", "工件损伤", "干燥残留", "设备漏液"], color: "bg-red-100 border-red-400 text-red-800" },
];

const NODE_DETAILS: Record<string, { modules: string[]; standards: string[]; tips: string }> = {
  "超声波空化": { modules: ["M02", "M03", "M01"], standards: ["VDA 19.1 §6.3", "ISO 16232 Annex B"], tips: "28kHz适用于大面积粗洗，40kHz适用于精密零件" },
  "高压冲击": { modules: ["M04", "M05"], standards: ["VDA 19.1 §6.4", "VW PV 3347"], tips: "缸体内腔去毛刺推荐600-800bar" },
  "化学浸泡": { modules: ["M01", "M18"], standards: ["VDA 19.1 §6.2"], tips: "碱性清洗液浓度3-5%，温度50-60°C" },
  "喷淋覆盖": { modules: ["M19", "M16"], standards: ["ISO 16232 Annex A"], tips: "喷淋压力3-6bar，确保360°覆盖" },
  "缸体": { modules: ["M04", "M05", "M15"], standards: ["VW PV 3347", "VDA 19.1 Class A"], tips: "油道、水道需定向高压清洗" },
  "变速箱壳": { modules: ["M18", "M15", "M02"], standards: ["VDA 19.1 Class B", "MBN 10545"], tips: "注意轴承孔和油道清洁度" },
  "VDA 19.1": { modules: ["M01", "M02", "M04", "M12"], standards: ["VDA 19.1:2015", "VDA Band 19.2"], tips: "粒度分析需用膜过滤+显微镜" },
  "频率": { modules: ["M02", "M03"], standards: ["VDA 19.1 §6.3.2"], tips: "28kHz→强空化除油; 40kHz→精密清洗; 80kHz→半导体级" },
  "清洗不达标": { modules: ["M02", "M03", "M12"], standards: ["VDA 19.1 §8 Troubleshooting"], tips: "检查：浓度→温度→时间→超声功率→过滤精度" },
};

// ─── AI Q&A Data ───────────────────────────────────────────────

const AI_QA: { question: string; answer: string }[] = [
  { question: "如何选择超声波频率？", answer: "超声波频率选择取决于工件精密度和污染物类型：\n\n• 28kHz — 强空化效应，适用于重油污、切屑的粗洗，如缸体、变速箱壳\n• 40kHz — 中等空化，适用于一般精密零件清洗，如齿轮、阀体\n• 80kHz — 微空化，适用于半导体、光学元件等精密清洗\n• 120kHz — 兆声波，适用于晶圆等超精密清洗\n\n经验法则：工件越精密，频率越高；污染越重，频率越低。可采用双频(28/40kHz)设计覆盖更广范围。功率密度建议10-20W/L。" },
  { question: "VDA 19.1 Class A要求什么工艺？", answer: "VDA 19.1 Class A是最严格的清洁度等级，通常要求：\n\n• 残留颗粒：≤200μm（最大单颗粒），总重量≤mg级\n• 推荐工艺流程：预喷淋→碱性超声波清洗→漂洗→高压定点清洗→DI水漂洗→真空干燥\n• 工位数：通常6-8个工位\n• 关键参数：超声波28kHz/40kHz双频，高压600-800bar，DI水电阻率>15MΩ·cm\n• 检测方法：压力冲洗萃取法 + 重量法 + 显微镜粒度分析\n• 环境要求：洁净间操作，HEPA过滤送风" },
  { question: "缸体清洗推荐几个工位？", answer: "缸体清洗工位数取决于清洁度要求：\n\n• VDA 19.1 Class C（基本）：4工位\n  预洗→超声波清洗→漂洗→热风干燥\n\n• VDA 19.1 Class B（标准）：6工位\n  预喷淋→超声波粗洗→超声波精洗→漂洗→DI水终漂→真空干燥\n\n• VDA 19.1 Class A（严格）：8工位\n  高压预洗→超声波粗洗(28kHz)→超声波精洗(40kHz)→高压定点清洗→漂洗→DI水终漂→真空干燥→洁净室存放\n\n节拍时间通常60-120秒/工位，年产能10-30万件。" },
  { question: "高压去毛刺压力如何选择？", answer: "高压去毛刺压力选择指南：\n\n• 200-400bar — 一般清洗，去除松散切屑和油污\n• 400-600bar — 中等去毛刺，铝合金交叉孔毛刺\n• 600-800bar — 强力去毛刺，铸铁缸体油道/水道\n• 800-1000bar — 超高压，钢件硬毛刺（需评估工件变形风险）\n\n喷嘴选择：\n• 孔径0.8mm — 高压低流量，精确定点\n• 孔径1.2mm — 平衡型\n• 孔径1.5mm — 高流量冲洗\n\n注意事项：铝件避免超过600bar防止冲蚀，进刀速度控制在5-15mm/s。" },
  { question: "真空干燥到50mbar需要什么泵？", answer: "达到50mbar真空度的泵组方案：\n\n方案一（经济型）：旋片式真空泵\n• 品牌：Busch R5 / Becker VTLF\n• 极限真空：2-5mbar（余量充足）\n• 抽速：100-300m³/h（根据腔体体积选型）\n• 优点：成本低，维护简单\n• 缺点：需油雾过滤，有油污染风险\n\n方案二（推荐型）：罗茨泵+旋片泵\n• 罗茨泵提速，旋片泵做前级\n• 抽速提升3-5倍，达标时间缩短50%\n• 适用于大腔体或节拍要求高的场景\n\n选型计算：\n泵抽速 ≥ V(腔体) × ln(P0/Pf) / t(要求时间)\n例：200L腔体，60s内从1013mbar到50mbar → 需≥100m³/h" },
];

// ─── Quick Config Logic ────────────────────────────────────────

function generateConfig(cleanType: string, workpiece: string, standard: string, takt: number, oem: string) {
  const stationMap: Record<string, number> = { "Class A": 8, "Class B": 6, "Class C": 4, "ISO 16232": 6 };
  const baseStations = stationMap[standard] || 5;
  const extraStation = cleanType === "混合" ? 2 : 0;
  const stations = baseStations + extraStation;

  const modules: string[] = [];
  if (cleanType === "超声波" || cleanType === "混合") modules.push("M01", "M02", "M03");
  if (cleanType === "高压去毛刺" || cleanType === "混合") modules.push("M04", "M05");
  if (cleanType === "真空干燥" || cleanType === "混合") modules.push("M06", "M07");
  if (cleanType === "喷淋" || cleanType === "混合") modules.push("M19");
  modules.push("M08", "M10", "M11", "M17");
  if (standard === "Class A" || standard === "ISO 16232") modules.push("M12");

  const baseCost = stations * 15;
  const costMin = baseCost * 0.8;
  const costMax = baseCost * 1.3;
  const throughput = takt > 0 ? Math.floor(3600 / takt) : 0;

  const plc = oem === "VW" || oem === "Mercedes" ? "Siemens S7-1516" : "Siemens S7-1215C";
  const pump = cleanType === "高压去毛刺" || cleanType === "混合" ? "KAMAT K40036" : "Grundfos CRN";
  const usType = cleanType === "超声波" || cleanType === "混合" ? "28/40kHz 双频" : "N/A";

  return { stations, modules, costMin, costMax, throughput, plc, pump, usType };
}

// ─── Component ─────────────────────────────────────────────────

export default function DesignKnowledgeCenter() {
  const [activeTab, setActiveTab] = useState("modules");

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3">
        <BookOpen className="w-7 h-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold">设计知识中心</h1>
          <p className="text-sm text-muted-foreground">模块借用 · 快速方案 · 知识图谱 · AI助手</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="modules">模块借用</TabsTrigger>
          <TabsTrigger value="config">快速方案</TabsTrigger>
          <TabsTrigger value="graph">知识图谱</TabsTrigger>
          <TabsTrigger value="ai">AI设计助手</TabsTrigger>
        </TabsList>

        <TabsContent value="modules"><ModuleReuse /></TabsContent>
        <TabsContent value="config"><QuickConfig /></TabsContent>
        <TabsContent value="graph"><KnowledgeGraph /></TabsContent>
        <TabsContent value="ai"><AIAssistant /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Tab 1: Module Reuse ───────────────────────────────────────

function ModuleReuse() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("全部");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return DESIGN_MODULES.filter((m) => {
      const matchCat = category === "全部" || m.category === category;
      const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.description.includes(search) || m.category.includes(search);
      return matchCat && matchSearch;
    });
  }, [search, category]);

  const scoreColor = (s: number) => (s >= 80 ? "text-green-600" : s >= 60 ? "text-yellow-600" : "text-red-600");
  const scoreBg = (s: number) => (s >= 80 ? "bg-green-500" : s >= 60 ? "bg-yellow-500" : "bg-red-500");

  return (
    <div className="space-y-4 mt-2">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索模块名称、描述..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-muted-foreground">共 {filtered.length} 个模块</div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((m) => (
          <Card key={m.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setExpanded(expanded === m.id ? null : m.id)}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-semibold leading-tight">{m.name}</CardTitle>
                  <Badge variant="outline" className="text-xs">{m.category}</Badge>
                </div>
                <div className={`text-lg font-bold ${scoreColor(m.reusableScore)}`}>{m.reusableScore}%</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">{m.description}</p>
              <div className="flex flex-wrap gap-1">
                {m.applicableProducts.map((p) => <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>)}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {Object.entries(m.keySpecs).slice(0, 4).map(([k, v]) => (
                  <div key={k}><span className="text-muted-foreground">{k}:</span> {v}</div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>成熟度</span>
                  <span>{m.maturityLevel}%</span>
                </div>
                <Progress value={m.maturityLevel} className="h-1.5" />
              </div>

              {expanded === m.id && (
                <div className="pt-3 border-t space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>BOM项数: <strong>{m.bomItemCount}</strong></div>
                    <div>图纸数: <strong>{m.drawingCount}</strong></div>
                    <div>设计人: <strong>{m.designer}</strong></div>
                    <div>可借用分: <span className={`font-bold ${scoreColor(m.reusableScore)}`}>{m.reusableScore}%</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {Object.entries(m.keySpecs).map(([k, v]) => (
                      <div key={k}><span className="text-muted-foreground">{k}:</span> {v}</div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="text-xs">复用到新项目</Button>
                    <Button size="sm" variant="outline" className="text-xs">查看图纸</Button>
                    <Button size="sm" variant="outline" className="text-xs">查看BOM</Button>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                {expanded === m.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Tab 2: Quick Config ───────────────────────────────────────

function QuickConfig() {
  const [cleanType, setCleanType] = useState("");
  const [workpiece, setWorkpiece] = useState("");
  const [standard, setStandard] = useState("");
  const [takt, setTakt] = useState("90");
  const [oem, setOem] = useState("");

  const ready = cleanType && workpiece && standard && takt && oem;
  const config = ready ? generateConfig(cleanType, workpiece, standard, Number(takt), oem) : null;

  return (
    <div className="space-y-6 mt-2">
      <Card>
        <CardHeader><CardTitle className="text-base">清洗方案快速配置</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>清洗类型</Label>
              <Select value={cleanType} onValueChange={setCleanType}>
                <SelectTrigger><SelectValue placeholder="选择清洗类型" /></SelectTrigger>
                <SelectContent>
                  {["超声波", "高压去毛刺", "真空干燥", "喷淋", "混合"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>工件类型</Label>
              <Select value={workpiece} onValueChange={setWorkpiece}>
                <SelectTrigger><SelectValue placeholder="选择工件" /></SelectTrigger>
                <SelectContent>
                  {["缸体", "变速箱壳", "齿轴", "电池壳", "阀体", "涡轮", "通用"].map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>清洁度标准</Label>
              <Select value={standard} onValueChange={setStandard}>
                <SelectTrigger><SelectValue placeholder="选择标准" /></SelectTrigger>
                <SelectContent>
                  {["Class A", "Class B", "Class C", "ISO 16232"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>节拍时间 (秒)</Label>
              <Input type="number" value={takt} onChange={(e) => setTakt(e.target.value)} min={10} max={600} />
            </div>
            <div className="space-y-2">
              <Label>OEM标准</Label>
              <Select value={oem} onValueChange={setOem}>
                <SelectTrigger><SelectValue placeholder="选择OEM" /></SelectTrigger>
                <SelectContent>
                  {["VW", "Mercedes", "BMW", "GM", "通用"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {config && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Cpu className="w-5 h-5" /> 推荐方案</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white rounded-lg border">
                <div className="text-2xl font-bold text-blue-600">{config.stations}</div>
                <div className="text-xs text-muted-foreground">推荐工位数</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border">
                <div className="text-2xl font-bold text-green-600">{config.throughput}</div>
                <div className="text-xs text-muted-foreground">预计产能 (件/小时)</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border">
                <div className="text-lg font-bold text-orange-600">¥{config.costMin}-{config.costMax}万</div>
                <div className="text-xs text-muted-foreground">估算成本范围</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border">
                <div className="text-sm font-semibold">{oem}</div>
                <div className="text-xs text-muted-foreground">OEM标准</div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">关键组件</h4>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><span className="text-muted-foreground">PLC:</span> {config.plc}</div>
                <div><span className="text-muted-foreground">泵组:</span> {config.pump}</div>
                <div><span className="text-muted-foreground">超声波:</span> {config.usType}</div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">推荐模块清单</h4>
              <div className="flex flex-wrap gap-2">
                {config.modules.map((mid) => {
                  const mod = DESIGN_MODULES.find((m) => m.id === mid);
                  return mod ? (
                    <Badge key={mid} variant="secondary" className="text-xs py-1">{mod.name.split(" ")[0]}</Badge>
                  ) : null;
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab 3: Knowledge Graph ────────────────────────────────────

function KnowledgeGraph() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const detail = selectedNode ? NODE_DETAILS[selectedNode] : null;

  return (
    <div className="space-y-4 mt-2">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {KNOWLEDGE_NODES.map((group) => (
          <div key={group.category} className="space-y-2">
            <div className={`rounded-lg border-2 p-3 text-center font-semibold text-sm ${group.color}`}>
              {group.category}
            </div>
            <div className="flex flex-col items-center">
              <div className="w-0.5 h-3 bg-gray-300" />
            </div>
            <div className="space-y-1.5">
              {group.items.map((item) => (
                <button
                  key={item}
                  onClick={() => setSelectedNode(selectedNode === item ? null : item)}
                  className={`w-full text-left text-xs px-3 py-2 rounded border transition-colors ${
                    selectedNode === item
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white hover:bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <CircleDot className="w-3 h-3 flex-shrink-0" />
                    {item}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Cross connections hint */}
      <div className="flex flex-wrap gap-3 justify-center text-xs text-muted-foreground">
        <span>超声波空化 → 缸体 → VDA 19.1 → 频率 → 清洗不达标</span>
        <span>|</span>
        <span>高压冲击 → 齿轴 → VW PV 3347 → 压力 → 工件损伤</span>
      </div>

      {detail && selectedNode && (
        <Card className="border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{selectedNode} — 知识详情</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold mb-1">相关模块</h4>
              <div className="flex flex-wrap gap-2">
                {detail.modules.map((mid) => {
                  const mod = DESIGN_MODULES.find((m) => m.id === mid);
                  return mod ? <Badge key={mid} variant="secondary" className="text-xs">{mod.name.split(" ")[0]} {mod.name.split(" ").slice(1).join(" ")}</Badge> : null;
                })}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-1">参考标准</h4>
              <div className="flex flex-wrap gap-2">
                {detail.standards.map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-1">工程经验</h4>
              <p className="text-sm text-muted-foreground">{detail.tips}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab 4: AI Assistant ───────────────────────────────────────

function AIAssistant() {
  const [activeQ, setActiveQ] = useState<number | null>(null);

  return (
    <div className="space-y-4 mt-2">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="w-5 h-5" /> 快速问答</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">点击下方问题获取专家解答：</p>
          <div className="flex flex-wrap gap-2">
            {AI_QA.map((qa, i) => (
              <Button
                key={i}
                size="sm"
                variant={activeQ === i ? "default" : "outline"}
                className="text-xs"
                onClick={() => setActiveQ(activeQ === i ? null : i)}
              >
                {qa.question}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {activeQ !== null && (
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-green-700">{AI_QA[activeQ].question}</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{AI_QA[activeQ].answer}</pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">自由提问</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input placeholder="AI助手开发中，请使用快速问答" disabled className="flex-1" />
            <Button disabled size="icon" variant="outline"><Send className="w-4 h-4" /></Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">AI助手将在后续版本中接入大语言模型，支持自由对话。</p>
        </CardContent>
      </Card>
    </div>
  );
}
