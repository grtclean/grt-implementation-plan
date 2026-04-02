/**
 * 喷射系统行业大会 — CEO 25分钟主题演讲 数据配置
 *
 * ⚠️ 占位数据 — 等待实际行业资料填充
 * 更新方式: 直接修改本文件中的 slides 数组，无需改组件代码
 */

import type { ConferenceConfig, Slide } from "@/components/IndustryConference";

const slides: Slide[] = [
  {
    id: "cover", layout: "cover",
    title: "喷射系统精密清洗\n智能化解决方案",
    subtitle: "杰瑞德自动化 · Global Robot Technology",
    speakerNote: "各位喷射系统行业的同仁，大家好。我是GRT杰瑞德自动化公司的CEO。今天和大家分享我们在燃油喷射系统精密清洗领域的技术实践。",
  },
  {
    id: "intro", layout: "intro",
    title: "关于 GRT · 杰瑞德自动化",
    subtitle: "20年工业清洗技术沉淀 · 全球交付网络",
    speakerNote: "GRT在精密零部件清洗领域积累深厚。喷射系统对清洁度的要求是所有汽车零部件中最高的。",
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
    title: "GRT核心竞争力 — 喷射系统清洗方案",
    subtitle: "服务全球头部燃油系统制造商",
    speakerNote: "【待补充具体客户案例】",
    data: {
      groups: [
        {
          title: "燃油系统巨头",
          customers: [
            { name: "【待补充】", tag: "全球TOP3", projects: ["喷油嘴精密清洗线", "高压油轨清洗系统"], type: "超精密超声清洗" },
          ],
        },
        {
          title: "国产替代新势力",
          customers: [
            { name: "【待补充】", tag: "国产喷油嘴", projects: ["GDI喷油嘴清洗线", "共轨喷油器清洗"], type: "多频超声+真空干燥" },
          ],
        },
        {
          title: "氢能/替代燃料",
          customers: [
            { name: "【待补充】", tag: "氢喷射系统", projects: ["氢气喷嘴清洗", "高压储氢阀清洗"], type: "洁净室级超精密" },
          ],
        },
      ],
    },
  },
  {
    id: "trends", layout: "stats",
    title: "喷射系统清洗 — 微米级的精密战场",
    subtitle: "三大趋势推动清洁度标准持续升级",
    speakerNote: "喷射系统是汽车零部件中清洁度要求最高的领域。GDI直喷技术、共轨高压化、氢能新赛道——每一个趋势都在拉高清洁度标准。",
    data: {
      stats: [
        { value: "GDI", label: "缸内直喷普及\n喷孔径≤0.1mm\n颗粒容忍度极低", color: "text-cyan-400", sub: "颗粒≤50μm · 残油≤0.1mg" },
        { value: "2500bar", label: "共轨压力持续升高\n对清洁度极端敏感", color: "text-emerald-400", sub: "单颗粒即可导致卡滞" },
        { value: "氢能", label: "氢喷射系统\n全新清洁度标准制定中", color: "text-amber-400", sub: "洁净室+无油清洗" },
      ],
    },
  },
  {
    id: "pain", layout: "stats",
    title: "喷射系统制造商的清洗挑战",
    subtitle: "这是汽车零部件清洗金字塔的顶端",
    speakerNote: "喷油嘴的清洗要求远超一般零部件。一颗50μm的颗粒就可能导致喷嘴卡滞、发动机失火。",
    data: {
      stats: [
        { value: "50μm", label: "颗粒度要求极端\n单颗粒即可致命", color: "text-red-400", sub: "相当于一根头发丝直径" },
        { value: "0.1mg", label: "残油量近乎为零\n需多级精密清洗", color: "text-orange-400", sub: "碳氢→改性醇→纯水三步" },
        { value: "微孔", label: "喷孔内壁清洗\n传统方法无法到达", color: "text-yellow-400", sub: "需超声+微流体组合" },
        { value: "洁净室", label: "Class 100环境\n从清洗到封装全程", color: "text-gray-400", sub: "环境颗粒控制是核心" },
      ],
    },
  },
  {
    id: "tech", layout: "tech",
    title: "GRT 喷射系统清洗核心技术",
    subtitle: "微米级精密清洗的专有技术体系",
    speakerNote: "【待补充技术参数】",
    data: {
      techs: [
        { name: "高频超声微孔清洗", value: "68/120/170kHz", desc: "高频超声波深入微孔内壁，去除亚微米级颗粒，不损伤喷孔几何精度", highlight: true },
        { name: "碳氢蒸馏循环系统", value: "纯度≥99.5%", desc: "碳氢清洗剂在线蒸馏回收，保持恒定清洗力，液寿命延长5倍" },
        { name: "改性醇精密漂洗", value: "残油≤0.05mg", desc: "改性醇兼顾水基和溶剂优势，替代传统氟利昂，环保合规" },
        { name: "Class 100洁净室集成", value: "ISO 5", desc: "从清洗到干燥到封装全程洁净室环境，杜绝二次污染" },
        { name: "AI微粒分析引擎", value: "SEM级", desc: "AI辅助分析颗粒成分(金属/纤维/有机)，溯源污染来源，指导工艺优化" },
      ],
    },
  },
  {
    id: "flagship", layout: "case-hero",
    title: "标杆案例 — 【待补充客户/项目】",
    subtitle: "【待补充项目信息】",
    speakerNote: "【待补充演讲稿】",
    data: {
      customer: "【待补充】",
      product: "GDI喷油嘴精密清洗系统",
      tagLabel: "FLAGSHIP CASE",
      tagCode: "INJ",
      specs: [
        { label: "清洁度标准", value: "ISO 16232 最高等级" },
        { label: "颗粒度", value: "≤50μm" },
        { label: "残油量", value: "≤0.1mg", highlight: true },
        { label: "环境等级", value: "Class 100 (ISO 5)" },
        { label: "节拍", value: "【待补充】秒/件" },
        { label: "检测方式", value: "100%全检 + SEM抽检", highlight: true },
      ],
      architecture: "【待补充工位布局：碳氢清洗→改性醇漂洗→纯水精洗→真空干燥→洁净封装】",
      configs: [
        { name: "标准版", price: "【待报价】", features: "碳氢清洗+真空干燥" },
        { name: "专业版", price: "【待报价】", features: "三步清洗+全检+洁净室" },
        { name: "旗舰版", price: "【待报价】", features: "AI分析+SEM级+数字孪生" },
      ],
    },
  },
  {
    id: "scenarios", layout: "showcase",
    title: "四大应用场景",
    subtitle: "覆盖喷射系统全产业链精密清洗需求",
    speakerNote: "【待补充】",
    data: {
      items: [
        { icon: "⛽", name: "GDI缸内直喷系统", desc: "喷油嘴·高压油轨·油泵壳体", specs: "颗粒≤50μm · 残油≤0.1mg · 全检100%", cases: "【待补充客户】" },
        { icon: "🚛", name: "柴油共轨系统", desc: "共轨喷油器·高压共轨管·计量阀", specs: "2500bar系统 · 颗粒≤100μm", cases: "【待补充客户】" },
        { icon: "🔋", name: "氢能喷射系统", desc: "氢气喷嘴·高压储氢阀·减压阀", specs: "无油清洗 · 洁净室 · 新标准", cases: "【待补充客户】" },
        { icon: "🏎️", name: "赛车/高性能喷射", desc: "多孔喷嘴·可变几何喷射·涡流阀", specs: "零缺陷 · 定制化清洗工艺", cases: "【待补充客户】" },
      ],
    },
  },
  {
    id: "compare", layout: "comparison",
    title: "GRT vs 传统清洗方案",
    subtitle: "以GDI喷油嘴为例 — 全维度对比",
    speakerNote: "【待补充对比数据】",
    data: {
      headers: ["指标", "传统方案", "GRT 方案", "提升"],
      rows: [
        ["颗粒度达标率", "90-95%", "99.9%", "↑ 5%"],
        ["残油量", "0.3-0.5mg", "≤0.1mg", "↓ 70%"],
        ["微孔覆盖率", "<70%", "99%+", "↑ 30%"],
        ["清洗介质成本", "高(频繁更换)", "低(蒸馏回收)", "↓ 60%"],
        ["环保合规", "含氟利昂", "碳氢/改性醇", "100%合规"],
        ["人工需求", "2人/线", "0.3人/线", "↓ 85%"],
        ["设备OEE", "70-80%", "95%+", "↑ 20%"],
      ],
    },
  },
  {
    id: "delivery", layout: "timeline",
    title: "M0→M12 标准交付流程",
    subtitle: "18周 · 6个里程碑 · 精密级交付管理",
    speakerNote: "喷射系统的清洗设备交付周期略长，因为需要更多的工艺验证环节。",
    data: {
      milestones: [
        { week: "W0-3", phase: "M0 需求锁定", items: ["工件SEM分析", "污染源鉴定", "清洁度目标"], color: "border-blue-500/50" },
        { week: "W3-5", phase: "M1 方案设计", items: ["工艺路线验证", "介质选型试验", "报价·合同"], color: "border-cyan-500/50" },
        { week: "W5-10", phase: "M3 制造集成", items: ["精密制造", "洁净室集成", "软件开发"], color: "border-teal-500/50" },
        { week: "W10-13", phase: "M6 FAT验收", items: ["清洁度达标测试", "SEM验证", "客户来厂验收"], color: "border-emerald-500/50" },
        { week: "W13-15", phase: "M9 现场安装", items: ["洁净室对接", "设备就位", "联调试运行"], color: "border-green-500/50" },
        { week: "W15-18", phase: "M12 量产达产", items: ["GR&R验证", "参数冻结", "培训移交"], color: "border-lime-500/50" },
      ],
    },
  },
  {
    id: "digital", layout: "digital",
    title: "数字化全链路能力",
    subtitle: "GRT Showcase Hub · Digital Twin · AI Agent",
    speakerNote: "在喷射系统领域，数字化追溯尤为重要。每一件产品的清洗数据都必须完整保存。",
    data: {
      capabilities: [
        { name: "VIP客户数字展厅", desc: "实时同步设备健康、清洁度数据、颗粒度报告", icon: "🖥️" },
        { name: "数字孪生 Digital Twin", desc: "设备3D模型+实时运行数据，远程诊断，预测性维护", icon: "🔮" },
        { name: "AI微粒分析Agent", desc: "自动分析SEM图片，识别颗粒成分，溯源污染来源", icon: "🤖" },
        { name: "全链路追溯", desc: "每件产品从清洗到封装的完整数据链，满足审计要求", icon: "🔗" },
      ],
    },
  },
  {
    id: "quote", layout: "quote",
    title: "",
    speakerNote: "在喷射系统领域，清洁度不是一个参数，它就是产品本身。",
    data: {
      quote: "在微米的世界里，\n洁净就是精度，\n精度就是可靠性。",
      author: "GRT · 杰瑞德自动化",
      tagline: "让每一支喷嘴，都精准可靠",
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
        { icon: "🖥️", label: "展台体验", desc: "精密清洗演示 + 颗粒度检测" },
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

export const injectionSystemConfig: ConferenceConfig = {
  meta: {
    topBarLabel: "喷射系统行业大会 2026 · CEO KEYNOTE",
    coverBadge: "2026 喷射系统大会 · 25分钟主题演讲",
    totalMinutes: 25,
    coverStandards: ["ISO 16232", "VDA 19.1", "ISO 5 (Class 100)", "IATF 16949"],
  },
  slides,
};
