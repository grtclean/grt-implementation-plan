/**
 * 发动机缸体行业大会 — CEO 25分钟主题演讲 数据配置
 *
 * ⚠️ 占位数据 — 等待实际行业资料填充
 * 更新方式: 直接修改本文件中的 slides 数组，无需改组件代码
 */

import type { ConferenceConfig, Slide } from "@/components/IndustryConference";

const slides: Slide[] = [
  {
    id: "cover", layout: "cover",
    title: "发动机缸体精密清洗\n智能化解决方案",
    subtitle: "杰瑞德自动化 · Global Robot Technology",
    speakerNote: "各位发动机制造行业的同仁，大家好。我是GRT杰瑞德自动化公司的CEO。今天和大家分享我们在发动机缸体清洗领域的技术实践。",
  },
  {
    id: "intro", layout: "intro",
    title: "关于 GRT · 杰瑞德自动化",
    subtitle: "20年工业清洗技术沉淀 · 全球交付网络",
    speakerNote: "GRT在发动机缸体清洗领域有深厚积累，TK6大众EA888项目是我们的标杆之作。",
    data: {
      facts: [
        { value: "20+", label: "年行业深耕", icon: "🏭" },
        { value: "500+", label: "套设备交付", icon: "⚙️" },
        { value: "313", label: "名团队成员", icon: "👥" },
        { value: "3", label: "大全球中心", icon: "🌍" },
      ],
      centers: [
        { name: "无锡总部", role: "研发·制造·交付", people: "313人" },
        { name: "斯图加特", role: "欧洲技术中心", people: "12人" },
        { name: "底特律", role: "北美服务中心", people: "5人" },
      ],
      certifications: ["IATF 16949", "ISO 14001", "CE", "UL", "VDA 19.1 认证实验室"],
    },
  },
  {
    id: "customers", layout: "customers",
    title: "GRT核心竞争力 — 发动机清洗方案",
    subtitle: "服务全球头部发动机制造商",
    speakerNote: "【待补充更多客户案例】",
    data: {
      groups: [
        {
          title: "欧系主机厂",
          customers: [
            { name: "大众汽车", tag: "TK6项目", projects: ["EA888缸体超声波清洗系统", "VDA 19.1 Class A达标", "OEE 96% · 45s节拍"], type: "超声+高压定点" },
          ],
        },
        {
          title: "日韩系主机厂",
          customers: [
            { name: "【待补充】", tag: "量产清洗线", projects: ["缸体·缸盖组合清洗", "高压油道清洗"], type: "通过式+定点清洗" },
          ],
        },
        {
          title: "自主品牌",
          customers: [
            { name: "【待补充】", tag: "国产替代", projects: ["混动发动机缸体清洗", "高效率量产线"], type: "自动化清洗岛" },
          ],
        },
      ],
    },
  },
  {
    id: "trends", layout: "stats",
    title: "发动机清洗 — 内燃机+混动的双线并行",
    subtitle: "三大趋势正在重新定义缸体清洁度标准",
    speakerNote: "虽然新能源快速发展，但混动和高效内燃机仍是主流。清洁度要求不降反升。",
    data: {
      stats: [
        { value: "混动", label: "增程·插混发动机\n热效率提升→公差收紧", color: "text-cyan-400", sub: "油道清洁度要求↑" },
        { value: "高效率", label: "涡轮增压+直喷\n喷油嘴孔径≤0.1mm", color: "text-emerald-400", sub: "颗粒≤200μm必须全检" },
        { value: "全球化", label: "VDA/ISO双标准\n出口必须达标", color: "text-amber-400", sub: "认证实验室+检测报告" },
      ],
    },
  },
  {
    id: "pain", layout: "stats",
    title: "发动机制造商的清洗挑战",
    subtitle: "缸体清洗的四大核心难题",
    speakerNote: "发动机缸体是所有零部件中清洗难度最高的之一。油道、水道、缸孔、曲轴孔——每个区域都有独特的清洗需求。",
    data: {
      stats: [
        { value: "油道", label: "深长油道清洗\n传统喷淋无法到达", color: "text-red-400", sub: "深径比>10:1" },
        { value: "缸孔", label: "珩磨纹路残屑\n影响活塞环密封", color: "text-orange-400", sub: "颗粒≤100μm" },
        { value: "节拍", label: "45-60秒高节拍\n清洗时间受限", color: "text-yellow-400", sub: "产能压力大" },
        { value: "追溯", label: "每件清洗数据\n必须可追溯", color: "text-gray-400", sub: "VDA 19.1要求" },
      ],
    },
  },
  {
    id: "tech", layout: "tech",
    title: "GRT 缸体清洗核心技术",
    subtitle: "专为发动机缸体几何特征设计的技术体系",
    speakerNote: "【待补充技术参数】",
    data: {
      techs: [
        { name: "高压定点油道清洗", value: "80~200bar", desc: "专用喷嘴对准每条油道，脉冲式高压冲洗，深径比>15:1无死角", highlight: true },
        { name: "多频超声波缸孔清洗", value: "28/40/68kHz", desc: "去除珩磨残屑和铸造砂芯，不破坏珩磨纹路" },
        { name: "真空干燥一体化", value: "-0.095MPa", desc: "油道、水道零残液，干燥时间比热风↓40%" },
        { name: "在线颗粒度全检", value: "ISO 16232", desc: "CCD视觉+激光双模，每件全检，数据实时上传MES" },
        { name: "AI工艺自优化", value: "Digital Twin", desc: "基于清洗大数据自学习，持续优化压力/频率/时间参数" },
      ],
    },
  },
  {
    id: "tk6", layout: "case-hero",
    title: "标杆案例 — 大众EA888缸体清洗系统",
    subtitle: "TK6项目 · 海外事业部 · VDA 19.1 Class A",
    speakerNote: "TK6是我们发动机缸体清洗的标杆项目。VDA 19.1 Class A，45秒节拍，96%实际OEE。",
    data: {
      customer: "Volkswagen AG",
      product: "EA888铝合金缸体超声波清洗系统",
      tagLabel: "FLAGSHIP CASE",
      tagCode: "TK6",
      specs: [
        { label: "清洁度标准", value: "VDA 19.1 Class A / ISO 16232" },
        { label: "节拍", value: "45秒/件" },
        { label: "产能", value: "80件/小时" },
        { label: "设备OEE目标", value: "≥92%" },
        { label: "实际OEE达成", value: "96%", highlight: true },
        { label: "清洁度达标率", value: "99.8%", highlight: true },
        { label: "连续运行", value: "24个月零重大故障", highlight: true },
      ],
      architecture: "6工位布局：超声清洗 → 高压定点 → 漂洗 → 真空干燥 → 在线检测 → 下料",
      configs: [
        { name: "标准版", price: "€280,000", features: "基础92%OEE保证 · 12个月质保" },
        { name: "Digital+版", price: "€350,000", features: "AI预测维护 · 数字孪生 · 24个月质保" },
        { name: "战略版", price: "€320,000", features: "3年框架协议 · 批量折扣" },
      ],
    },
  },
  {
    id: "scenarios", layout: "showcase",
    title: "四大应用场景",
    subtitle: "覆盖发动机全系列清洗需求",
    speakerNote: "【待补充】",
    data: {
      items: [
        { icon: "🔧", name: "传统内燃机缸体", desc: "铸铁/铝合金缸体·缸盖·曲轴箱", specs: "VDA 19.1 Class A · 油道全覆盖", cases: "大众 · 宝马 · 奔驰" },
        { icon: "⚡", name: "混动发动机", desc: "增程器·插混专用发动机·高热效率缸体", specs: "高精度公差 · 更严清洁度", cases: "理想 · 比亚迪 · 吉利" },
        { icon: "🏎️", name: "高性能发动机", desc: "涡轮增压·V6/V8/V12 · 赛车发动机", specs: "Class 100级 · 零缺陷", cases: "【待补充】" },
        { icon: "🏗️", name: "工程机械柴油机", desc: "大型柴油机缸体·缸套·连杆", specs: "NAS 1638 · 大型件≤1500mm", cases: "潍柴 · 玉柴 · 康明斯" },
      ],
    },
  },
  {
    id: "compare", layout: "comparison",
    title: "GRT vs 传统清洗方案",
    subtitle: "以铝合金缸体为例 — 全维度对比",
    speakerNote: "【待补充】",
    data: {
      headers: ["指标", "传统方案", "GRT 方案", "提升"],
      rows: [
        ["清洁度达标率", "85-90%", "99.8%", "↑ 10%"],
        ["油道覆盖率", "70-80%", "99.7%", "↑ 25%"],
        ["单件清洗成本", "¥4.0-6.0", "¥2.0-3.0", "↓ 50%"],
        ["节拍时间", "90-120s", "45-60s", "↓ 50%"],
        ["废水排放", "COD 600+", "COD <100", "↓ 85%"],
        ["人工需求", "3-4人/线", "0.5人/线", "↓ 85%"],
        ["设备OEE", "65-75%", "96%", "↑ 25%"],
      ],
    },
  },
  {
    id: "delivery", layout: "timeline",
    title: "M0→M12 标准交付流程",
    subtitle: "16周 · 6个里程碑 · 全数字化管理",
    speakerNote: "标准化交付流程。",
    data: {
      milestones: [
        { week: "W0-2", phase: "M0 需求锁定", items: ["缸体3D扫描", "油道图谱分析", "清洁度目标"], color: "border-blue-500/50" },
        { week: "W2-4", phase: "M1 方案设计", items: ["喷嘴布局仿真", "CFD流体分析", "报价·合同"], color: "border-cyan-500/50" },
        { week: "W4-8", phase: "M3 制造集成", items: ["机械制造", "电气集成", "HMI开发"], color: "border-teal-500/50" },
        { week: "W8-10", phase: "M6 FAT验收", items: ["客户来厂验收", "VDA19.1检测", "OEE验证"], color: "border-emerald-500/50" },
        { week: "W10-12", phase: "M9 现场安装", items: ["设备就位", "产线对接", "联调试运行"], color: "border-green-500/50" },
        { week: "W12-16", phase: "M12 量产达产", items: ["试生产验证", "参数精调", "培训移交"], color: "border-lime-500/50" },
      ],
    },
  },
  {
    id: "digital", layout: "digital",
    title: "数字化全链路能力",
    subtitle: "GRT Showcase Hub · Digital Twin · AI Agent",
    speakerNote: "数字化清洗解决方案。",
    data: {
      capabilities: [
        { name: "VIP客户数字展厅", desc: "每位客户专属页面，实时同步设备健康和清洁度数据", icon: "🖥️" },
        { name: "数字孪生 Digital Twin", desc: "设备3D模型+实时运行数据，远程诊断，预测性维护", icon: "🔮" },
        { name: "AI工艺Agent", desc: "智能Agent分析清洗数据、优化参数、生成报告", icon: "🤖" },
        { name: "MES/ERP集成", desc: "OPC UA / MQTT / RESTful 三通道对接", icon: "🔗" },
      ],
    },
  },
  {
    id: "quote", layout: "quote",
    title: "",
    speakerNote: "发动机是汽车的心脏，而清洁度是心脏的血液循环保障。",
    data: {
      quote: "发动机是汽车的心脏，\n每一条油道的洁净，\n都是可靠运行的保障。",
      author: "GRT · 杰瑞德自动化",
      tagline: "让每一台发动机，都值得信赖",
    },
  },
  {
    id: "closing", layout: "closing",
    title: "欢迎莅临 GRT 展台交流",
    subtitle: "扫码即可查阅产品资料 · 方案 · 报价 · 公司介绍",
    speakerNote: "谢谢大家！欢迎到展台交流。",
    data: {
      actions: [
        { icon: "📱", label: "扫码查阅", desc: "产品资料 · 技术方案 · 报价参考" },
        { icon: "🖥️", label: "展台体验", desc: "TK6模型 + 数字孪生演示" },
        { icon: "🌐", label: "线上展厅", desc: "VIP数字展厅 · 随时回看" },
      ],
      links: [
        { label: "📄 产品资料下载", url: "/showcase/new-energy" },
        { label: "💡 技术方案", url: "/grts3-demo" },
        { label: "💰 在线报价", url: "/showroom" },
        { label: "🏢 公司介绍", url: "/excellence-showcase" },
      ],
      website: "www.gerrytech.com",
      email: "sales@gerrytech.com",
    },
  },
];

export const engineBlockConfig: ConferenceConfig = {
  meta: {
    topBarLabel: "发动机缸体行业大会 2026 · CEO KEYNOTE",
    coverBadge: "2026 发动机缸体大会 · 25分钟主题演讲",
    totalMinutes: 25,
    coverStandards: ["VDA 19.1", "ISO 16232", "IATF 16949", "NAS 1638"],
  },
  slides,
};
