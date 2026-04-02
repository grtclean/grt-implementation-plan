/**
 * 齿轴行业大会 — CEO 25分钟主题演讲 数据配置
 *
 * 更新方式: 直接修改本文件中的 slides 数组内容即可，
 * 无需修改任何组件代码。支持的 layout 类型见 IndustryConference.tsx
 */

import type { ConferenceConfig, Slide } from "@/components/IndustryConference";

const slides: Slide[] = [
  {
    id: "cover", layout: "cover",
    title: "齿轴零部件精密清洗\n智能化解决方案",
    subtitle: "杰瑞德自动化 · Global Robot Technology",
    speakerNote: "各位齿轮行业的同仁，大家好。我是GRT杰瑞德自动化公司的CEO。今天很荣幸有25分钟时间，和大家分享我们在齿轴零部件清洗领域的技术实践和思考。会后欢迎到外面我们的小展台交流。",
  },
  {
    id: "intro", layout: "intro",
    title: "关于 GRT · 杰瑞德自动化",
    subtitle: "20年工业清洗技术沉淀 · 全球交付网络",
    speakerNote: "GRT成立20年来，专注于非标自动化清洗设备的研发制造。我们服务全球头部车企和零部件供应商，累计交付超过500套清洗系统。接下来我先介绍几个在座同行熟悉的标杆案例。",
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
    title: "GRT核心竞争力 — 行业高端方案",
    subtitle: "服务全球头部齿轮制造商与整车厂",
    speakerNote: "这里展示的是我们在齿轴清洗领域的核心客户。双环传动是国内齿轮行业的龙头，我们为他们交付了411、418、424等多条线，涵盖多种齿轮规格。利纳马是全球前五的动力总成供应商，我们为他们做了众多通过式清洗线。此外还有吉利、长城、大众等整车厂的配套清洗系统。",
    data: {
      groups: [
        {
          title: "齿轮行业龙头",
          customers: [
            { name: "双环传动", tag: "国内齿轮冠军", projects: ["411线 — 差速器齿轮", "418线 — 从动齿轮", "424线 — 主减齿轮"], type: "定制超声+通过式" },
          ],
        },
        {
          title: "全球Tier 1",
          customers: [
            { name: "利纳马 Linamar", tag: "全球动力总成TOP5", projects: ["众多通过式清洗线", "齿轴+壳体组合清洗", "高节拍在线生产配套"], type: "通过式连续清洗" },
          ],
        },
        {
          title: "整车厂 OEM",
          customers: [
            { name: "吉利汽车", tag: "通过式清洗", projects: ["变速箱齿轮清洗线"], type: "通过式" },
            { name: "长城汽车", tag: "通过式清洗", projects: ["电驱齿轮清洗线"], type: "通过式" },
            { name: "大众汽车", tag: "TK6项目", projects: ["EA888缸体清洗系统"], type: "超声+高压" },
          ],
        },
      ],
    },
  },
  {
    id: "equipment", layout: "equipment",
    title: "高洁净设备方案展示",
    subtitle: "从通过式量产线到高精密清洗岛",
    speakerNote: "这是我们与重庆伊洛美客合作的双枪高洁净清洗机，专门解决高清洁度要求的齿轮清洗。另外TSL系列是我们为威孚等高精密零部件客户设计的方案。在座如果有类似需求，可以会后到展台看实物模型。",
    data: {
      machines: [
        {
          name: "双枪高洁净清洗机",
          partner: "重庆伊洛美客联合方案",
          specs: ["双枪同步清洗，节拍提升40%", "ISO 16232 Class A 全检达标", "适用齿轮/齿轴/壳体多品种切换", "集成在线颗粒度检测CCD"],
          highlight: "特别适合新能源电驱减速器齿轮",
          imageNote: "📷 设备实拍照片请见展台",
        },
        {
          name: "TSL系列 精密清洗系统",
          partner: "威孚等高精密客户验证",
          specs: ["多槽浸没超声 (28/40/68kHz)", "真空干燥 + 洁净室出料", "颗粒≤50μm · 残油≤0.5mg", "兼容碳氢/改性醇/水基多介质"],
          highlight: "适用于喷油嘴、液压阀芯、精密齿轮",
          imageNote: "📷 设备实拍照片请见展台",
        },
      ],
    },
  },
  {
    id: "addons", layout: "addons",
    title: "附加功能模块 — 一站式解决方案",
    subtitle: "清洗不只是清洗 · 完整的前后道工艺集成",
    speakerNote: "GRT的设备不只是清洗机。我们提供完整的前后道工艺集成。去磁、脱水、碳氢改性醇清洗介质选择、防锈油涂覆——这些在齿轮制造中都是不可或缺的环节。一站式交付，减少客户的集成风险和沟通成本。",
    data: {
      addons: [
        {
          name: "在线去磁", icon: "🧲",
          desc: "齿轮热处理后残磁去除",
          details: ["穿越式退磁线圈", "残磁≤0.3mT (满足VDA要求)", "与清洗工位无缝衔接", "自动检测+报警"],
          why: "防止磁性颗粒吸附，确保清洁度达标",
        },
        {
          name: "真空脱水干燥", icon: "💨",
          desc: "内孔/盲孔零残留快速干燥",
          details: ["真空度 -0.095MPa", "热风+真空组合干燥", "盲孔深度>5D无残留", "干燥时间比传统↓40%"],
          why: "解决齿轮内孔、键槽积液难题",
        },
        {
          name: "碳氢/改性醇介质", icon: "🧪",
          desc: "多介质适配，满足不同工艺要求",
          details: ["碳氢清洗剂: 高脱脂力，蒸馏回收", "改性醇: 兼顾水基+溶剂优势", "水基清洗: 环保低成本", "可在同一设备切换介质类型"],
          why: "根据客户工件材质和后道工艺选择最优介质",
        },
        {
          name: "防锈油涂覆", icon: "🛡️",
          desc: "清洗后即时防锈处理",
          details: ["喷淋式/浸油式可选", "油膜厚度可控 (1-5μm)", "兼容水基防锈液/油基防锈油", "与清洗线一体化节拍同步"],
          why: "工序间/成品存储防锈，避免二次污染",
        },
      ],
    },
  },
  {
    id: "trends", layout: "stats",
    title: "齿轴清洗 — 从辅助工序到核心工艺",
    subtitle: "三大行业趋势正在重新定义清洁度的价值",
    speakerNote: "过去清洗被视为辅助工序，如今在新能源和高精度制造驱动下，清洁度已经成为齿轮品质的核心指标。",
    data: {
      stats: [
        { value: "新能源", label: "电驱NVH对清洁度要求\n提升至 ISO 16232 Class A", color: "text-cyan-400", sub: "颗粒≤200μm · 残油≤1mg" },
        { value: "智能化", label: "从抽检5%到全检100%\n在线CCD+激光实时检测", color: "text-emerald-400", sub: "数字孪生·工艺自优化" },
        { value: "可持续", label: "环保法规趋严\n废水COD限值持续下降", color: "text-amber-400", sub: "零排放·循环利用" },
      ],
    },
  },
  {
    id: "pain", layout: "stats",
    title: "齿轮制造商的清洗困境",
    subtitle: "这些问题是否也困扰着您？",
    speakerNote: "我和很多在座的工程师、质量经理交流过，发现四个共性痛点。",
    data: {
      stats: [
        { value: "68%", label: "齿轮早期失效\n与清洁度直接相关", color: "text-red-400", sub: "——德国FZG研究院数据" },
        { value: "NVH", label: "电驱噪音投诉\n首要根因是颗粒残留", color: "text-orange-400", sub: "——某头部新能源车企反馈" },
        { value: "3-4人", label: "每条清洗线人工需求\n成本占比高达35%", color: "text-yellow-400", sub: "——行业平均水平" },
        { value: "纸质", label: "工艺参数靠经验\n无法追溯·无法优化", color: "text-gray-400", sub: "——80%中小齿轮厂现状" },
      ],
    },
  },
  {
    id: "tech", layout: "tech",
    title: "GRT 五大核心技术",
    subtitle: "针对齿轴清洗的专有技术体系",
    speakerNote: "针对这些痛点，GRT构建了五大核心技术。这不是通用清洗方案的简单堆砌，而是专门为齿轮、齿轴几何特征设计的技术体系。",
    data: {
      techs: [
        { name: "自适应多频超声清洗", value: "28/40/68/120kHz", desc: "根据齿面、齿根、键槽不同区域自动切换最优频率，清洗效率提升40%", highlight: true },
        { name: "六轴联动高压定点清洗", value: "80~150bar", desc: "喷嘴追踪齿廓轮廓，死角覆盖率99.7%，解决传统喷淋无法到达的齿根区域" },
        { name: "真空干燥一体化", value: "-0.095MPa", desc: "齿轮内孔、盲孔零残留，干燥时间比热风缩短40%，能耗降低30%" },
        { name: "在线颗粒度全检", value: "ISO 16232", desc: "CCD视觉+激光计数双模检测，100%全检替代抽检，数据实时上传MES" },
        { name: "AI工艺自优化引擎", value: "Digital Twin", desc: "基于每批次清洗数据自学习，自动调节频率/压力/时间参数，良率持续提升2-5%" },
      ],
    },
  },
  {
    id: "tk6", layout: "case-hero",
    title: "标杆案例 — 大众EA888缸体清洗系统",
    subtitle: "TK6项目 · 海外事业部 · VDA 19.1 Class A",
    speakerNote: "现在给大家看一个我们正在交付的标杆项目。大众汽车EA888发动机缸体清洗系统，代号TK6。这个项目的要求极其严格——VDA 19.1 Class A，45秒节拍，92%设备综合效率。",
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
    subtitle: "TK6技术平台延伸 — 覆盖齿轴全产业链",
    speakerNote: "TK6是我们技术平台的一个典型应用。同样的核心技术，延伸到齿轴全产业链的四大场景。在座的各位，无论是做新能源电驱、工程机械、还是齿轮精加工，都能找到对应的解决方案。",
    data: {
      items: [
        { icon: "⚡", name: "新能源电驱系统", desc: "减速器齿轮/齿轴 · 差速器壳体 · 电机转子", specs: "ISO 16232 Class A · 颗粒≤200μm · 残油≤1mg/件", cases: "比亚迪 · 蔚来 · 汇川 · 麦格纳" },
        { icon: "🏗️", name: "工程机械传动", desc: "行星齿轮箱 · 回转支承 · 液压泵齿轮", specs: "NAS 1638 Class 6 · 大型件≤2000mm · 批量清洗", cases: "三一 · 中联 · 徐工 · 柳工" },
        { icon: "⚙️", name: "齿轮精密加工", desc: "滚齿/插齿后清洗 · 热处理前后 · 磨齿精加工", specs: "VDA 19.1 · 纤维≤500μm · 在线检测100%", cases: "双环传动 · 精锻科技 · 宁波东力" },
        { icon: "🔬", name: "半导体/谐波减速器", desc: "微型齿轮 · 谐波减速器 · 精密轴承", specs: "Class 100洁净室 · 颗粒≤25μm · 残油≤0.1mg", cases: "绿的谐波 · 日本电产 · NSK" },
      ],
    },
  },
  {
    id: "pricing", layout: "comparison",
    title: "标准产品配置方案",
    subtitle: "三个层次 · 满足不同生产规模和清洁度需求",
    speakerNote: "我们把20年的经验沉淀为三个标准配置层次。标准版覆盖80%的齿轮清洗需求，专业版增加了全检和去磁脱水，旗舰版则是完全数字化的智能清洗岛。客户可以根据自己的清洁度要求和预算灵活选择。",
    data: {
      headers: ["功能模块", "标准版 S", "专业版 P", "旗舰版 F"],
      rows: [
        ["超声波清洗", "单频 40kHz", "双频 28/40kHz", "四频自适应"],
        ["高压喷淋", "固定喷嘴 80bar", "可调 80-120bar", "六轴联动 150bar"],
        ["干燥方式", "热风干燥", "热风+真空组合", "真空脱水一体化"],
        ["在线检测", "—", "抽检CCD", "100%全检 CCD+激光"],
        ["去磁功能", "—", "✓ 穿越退磁", "✓ 闭环退磁+检测"],
        ["防锈涂覆", "—", "喷淋防锈液", "精密油膜控制1-5μm"],
        ["清洗介质", "水基", "水基/碳氢可选", "碳氢/改性醇/水基全兼容"],
        ["MES集成", "—", "OPC UA基础", "OPC UA+MQTT+数字孪生"],
        ["AI工艺优化", "—", "—", "✓ Digital Twin自学习"],
        ["参考价格", "¥80-120万", "¥150-220万", "¥280-400万"],
        ["适用场景", "中小批量·通用齿轮", "批量·高清洁度要求", "高端·全自动·可追溯"],
        ["交付周期", "8-10周", "12-14周", "14-16周"],
      ],
    },
  },
  {
    id: "compare", layout: "comparison",
    title: "GRT vs 传统清洗方案",
    subtitle: "以新能源电驱减速器齿轮为例 — 全维度对比",
    speakerNote: "这张对比表是我们和客户一起验证的真实数据。最让客户惊喜的往往不是某一项指标，而是全链条的综合提升。",
    data: {
      headers: ["指标", "传统方案", "GRT 方案", "提升"],
      rows: [
        ["清洁度达标率", "85-90%", "99.5%+", "↑ 10%"],
        ["颗粒度检测", "抽检 5%", "全检 100%", "20× 覆盖"],
        ["单件清洗成本", "¥3.5-5.0", "¥1.8-2.5", "↓ 45%"],
        ["节拍时间", "90-120s", "45-60s", "↓ 50%"],
        ["废水排放", "COD 500+", "COD <100", "↓ 80%"],
        ["人工需求", "3-4人/线", "0.5人/线", "↓ 85%"],
        ["工艺可追溯", "纸质记录", "数字孪生", "全链路"],
        ["设备OEE", "65-75%", "92%+", "↑ 20%"],
      ],
    },
  },
  {
    id: "delivery", layout: "timeline",
    title: "M0→M12 标准交付流程",
    subtitle: "16周 · 6个里程碑 · 全数字化管理",
    speakerNote: "我们的交付流程已经标准化为M0到M12六个里程碑。每个节点有明确的交付物和验收标准，客户在我们的数字展厅中可以实时跟踪项目进度。",
    data: {
      milestones: [
        { week: "W0-2", phase: "M0 需求锁定", items: ["工件3D扫描", "清洁度目标确认", "产能·节拍规划"], color: "border-blue-500/50" },
        { week: "W2-4", phase: "M1 方案设计", items: ["3D工厂布局", "CFD流体仿真", "选型·报价·合同"], color: "border-cyan-500/50" },
        { week: "W4-8", phase: "M3 制造集成", items: ["机械制造", "电气集成", "软件·HMI开发"], color: "border-teal-500/50" },
        { week: "W8-10", phase: "M6 FAT验收", items: ["客户来厂验收", "清洁度达标测试", "节拍·OEE验证"], color: "border-emerald-500/50" },
        { week: "W10-12", phase: "M9 现场安装", items: ["设备就位", "管路·电气接驳", "联调·试运行"], color: "border-green-500/50" },
        { week: "W12-16", phase: "M12 量产达产", items: ["试生产验证", "参数精调优化", "操作培训·移交"], color: "border-lime-500/50" },
      ],
    },
  },
  {
    id: "digital", layout: "digital",
    title: "数字化全链路能力",
    subtitle: "GRT Showcase Hub · Digital Twin · AI Agent",
    speakerNote: "这是GRT区别于传统设备商的核心差异——我们不只卖设备，我们交付的是数字化清洗解决方案。客户可以在VIP数字展厅中实时看到设备运行状态、清洁度数据和AI优化建议。",
    data: {
      capabilities: [
        { name: "VIP客户数字展厅", desc: "每位客户拥有专属展示页面，实时同步设备健康、项目进度、清洁度数据", icon: "🖥️" },
        { name: "数字孪生 Digital Twin", desc: "设备3D模型+实时运行数据，远程诊断，预测性维护，减少非计划停机80%", icon: "🔮" },
        { name: "AI工艺Agent", desc: "17个智能Agent自动分析清洗数据、优化参数、生成报告，7×24无人值守", icon: "🤖" },
        { name: "MES/ERP无缝集成", desc: "OPC UA / MQTT / RESTful 三通道对接，清洗数据自动回传客户MES系统", icon: "🔗" },
      ],
    },
  },
  {
    id: "cases", layout: "cases",
    title: "更多行业标杆",
    speakerNote: "除了TK6，再快速看几个不同行业的案例。",
    data: {
      cases: [
        { customer: "某头部新能源车企", project: "电驱减速器齿轮清洗线", result: "清洁度99.8% · NVH投诉↓92% · ROI 14个月" },
        { customer: "某工程机械龙头", project: "行星齿轮箱总成清洗中心", result: "产能↑120% · 人工↓75% · 废水零排放" },
        { customer: "某齿轮行业隐形冠军", project: "滚齿→热处理→磨齿 三段清洗岛", result: "CPK 1.67→2.0 · 废品率↓60%" },
      ],
    },
  },
  {
    id: "quote", layout: "quote",
    title: "",
    speakerNote: "最后，我想用一句话总结今天的分享。在齿轮行业，我们常说精度是生命线。而我认为——清洁度是精度的起点。",
    data: {
      quote: "清洁度不是成本，是竞争力。\n每一个齿面的洁净，\n都是产品品质的起点。",
      author: "GRT · 杰瑞德自动化",
      tagline: "让每一颗齿轮，都值得信赖",
    },
  },
  {
    id: "closing", layout: "closing",
    title: "欢迎莅临 GRT 展台交流",
    subtitle: "扫码即可查阅产品资料 · 方案 · 报价 · 公司介绍",
    speakerNote: "今天的演讲到这里。大家扫屏幕上的二维码，可以直接进入我们的线上展厅，里面有完整的产品资料、技术方案和报价参考。不用记笔记，所有内容都在里面。我们在外面有个小展台，TK6的3D模型和数字孪生演示也在那里。欢迎交流，谢谢大家！",
    data: {
      actions: [
        { icon: "📱", label: "扫码查阅", desc: "产品资料 · 技术方案 · 报价参考" },
        { icon: "🖥️", label: "展台体验", desc: "TK6实物模型 + 数字孪生演示" },
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

export const gearShaftConfig: ConferenceConfig = {
  meta: {
    topBarLabel: "齿轴行业大会 2026 · CEO KEYNOTE",
    coverBadge: "2026 齿轴行业大会 · 25分钟主题演讲",
    totalMinutes: 25,
    coverStandards: ["ISO 16232", "VDA 19.1", "NAS 1638", "IATF 16949"],
  },
  slides,
};
