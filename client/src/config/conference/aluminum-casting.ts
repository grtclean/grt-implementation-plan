/**
 * 铝铸件行业大会 — CEO 25分钟主题演讲 数据配置
 *
 * ⚠️ 占位数据 — 等待实际行业资料填充
 * 更新方式: 直接修改本文件中的 slides 数组，无需改组件代码
 */

import type { ConferenceConfig, Slide } from "@/components/IndustryConference";

const slides: Slide[] = [
  // ━━━ 1. 封面 ━━━
  {
    id: "cover", layout: "cover",
    title: "铝铸件精密清洗\n智能化解决方案",
    subtitle: "杰瑞德自动化 · Global Robot Technology",
    speakerNote: "各位铝铸件行业的同仁，大家好。我是GRT杰瑞德自动化公司的CEO。今天和大家分享我们在铝铸件清洗领域的技术实践。",
  },
  // ━━━ 2. GRT公司介绍 ━━━
  {
    id: "intro", layout: "intro",
    title: "关于 GRT · 杰瑞德自动化",
    subtitle: "20年工业清洗技术沉淀 · 全球交付网络",
    speakerNote: "GRT成立20年来，专注于非标自动化清洗设备。在铝铸件领域，我们为众多压铸件、铸造件客户提供从毛坯到精加工全工序的清洗方案。",
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
  // ━━━ 3. 核心客户 ━━━
  {
    id: "customers", layout: "customers",
    title: "GRT核心竞争力 — 铝铸件清洗方案",
    subtitle: "服务全球头部压铸件制造商",
    speakerNote: "【待补充具体客户案例】",
    data: {
      groups: [
        {
          title: "压铸行业龙头",
          customers: [
            { name: "【待补充】", tag: "行业标杆", projects: ["压铸缸体清洗线", "压铸变速箱壳体清洗"], type: "高压+超声组合" },
          ],
        },
        {
          title: "全球Tier 1",
          customers: [
            { name: "【待补充】", tag: "全球供应商", projects: ["铝合金转向器壳体", "新能源电机壳体清洗线"], type: "通过式连续清洗" },
          ],
        },
        {
          title: "整车厂 OEM",
          customers: [
            { name: "【待补充】", tag: "OEM直供", projects: ["一体化压铸件清洗"], type: "定制超声清洗岛" },
          ],
        },
      ],
    },
  },
  // ━━━ 4. 行业趋势 ━━━
  {
    id: "trends", layout: "stats",
    title: "铝铸件清洗 — 一体化压铸时代的新挑战",
    subtitle: "三大趋势正在重新定义铝铸件清洁度标准",
    speakerNote: "一体化压铸、轻量化、新能源三大趋势下，铝铸件的清洁度要求急剧提升。",
    data: {
      stats: [
        { value: "一体化", label: "超大型压铸件\n清洗面积↑300%", color: "text-cyan-400", sub: "特斯拉Model Y · 小米SU7" },
        { value: "轻量化", label: "铝代替铸铁\n零部件数量减少70%", color: "text-emerald-400", sub: "清洗复杂度↑·精度要求↑" },
        { value: "电动化", label: "电机壳体·电控壳体\n散热通道清洁度关键", color: "text-amber-400", sub: "颗粒≤500μm · 残油≤2mg" },
      ],
    },
  },
  // ━━━ 5. 行业痛点 ━━━
  {
    id: "pain", layout: "stats",
    title: "铝铸件制造商的清洗困境",
    subtitle: "这些问题是否也困扰着您？",
    speakerNote: "【待补充具体行业调研数据】",
    data: {
      stats: [
        { value: "铝屑", label: "压铸飞边·加工铝屑\n难以彻底清除", color: "text-red-400", sub: "堵塞油道·影响密封" },
        { value: "油污", label: "脱模剂+切削液残留\n腐蚀·起泡·漏油", color: "text-orange-400", sub: "——涂装/装配不良根因" },
        { value: "大件", label: "一体化压铸件尺寸大\n传统清洗机放不下", color: "text-yellow-400", sub: "——需定制超大清洗腔体" },
        { value: "内腔", label: "复杂内腔·油道·水道\n清洗无法到达死角", color: "text-gray-400", sub: "——传统喷淋覆盖率<60%" },
      ],
    },
  },
  // ━━━ 6. GRT核心技术 ━━━
  {
    id: "tech", layout: "tech",
    title: "GRT 铝铸件清洗核心技术",
    subtitle: "针对压铸件几何特征的专有技术体系",
    speakerNote: "【待补充技术细节参数】",
    data: {
      techs: [
        { name: "超大腔体定制设计", value: "≤2500mm", desc: "适配一体化压铸件，内部空间灵活可调，满足不同工件尺寸", highlight: true },
        { name: "高压脉冲内腔清洗", value: "100~200bar", desc: "脉冲式水射流深入油道/水道，解决复杂内腔清洗死角问题" },
        { name: "多频超声波铝屑去除", value: "25/40/80kHz", desc: "低频去大颗粒铝屑，高频去微粒，不损伤铝合金表面" },
        { name: "碱性水基脱脂系统", value: "pH 9-11", desc: "高效去除脱模剂和切削液，配合循环过滤系统延长液寿命" },
        { name: "AI工艺自优化引擎", value: "Digital Twin", desc: "基于每批次清洗数据自学习，自动调节参数，良率持续提升", highlight: false },
      ],
    },
  },
  // ━━━ 7. 标杆案例 ━━━
  {
    id: "flagship", layout: "case-hero",
    title: "标杆案例 — 【待补充客户/项目】",
    subtitle: "【待补充项目代号·事业部·清洁度标准】",
    speakerNote: "【待补充演讲稿】",
    data: {
      customer: "【待补充】",
      product: "铝合金压铸件清洗系统",
      tagLabel: "FLAGSHIP CASE",
      tagCode: "AL-CAST",
      specs: [
        { label: "清洁度标准", value: "VDA 19.1 / ISO 16232" },
        { label: "节拍", value: "【待补充】秒/件" },
        { label: "产能", value: "【待补充】件/小时" },
        { label: "设备OEE目标", value: "≥90%" },
        { label: "清洁度达标率", value: "【待补充】", highlight: true },
      ],
      architecture: "【待补充工位布局】",
      configs: [
        { name: "标准版", price: "【待报价】", features: "基础清洗+干燥" },
        { name: "专业版", price: "【待报价】", features: "高压内腔+全检+去屑" },
        { name: "旗舰版", price: "【待报价】", features: "AI数字孪生+MES集成" },
      ],
    },
  },
  // ━━━ 8. 四大应用场景 ━━━
  {
    id: "scenarios", layout: "showcase",
    title: "四大应用场景",
    subtitle: "覆盖铝铸件全产业链清洗需求",
    speakerNote: "【待补充演讲稿】",
    data: {
      items: [
        { icon: "🚗", name: "汽车发动机/变速箱壳体", desc: "铝合金缸体·缸盖·变速箱壳体·油底壳", specs: "VDA 19.1 · 颗粒≤500μm · 残油≤2mg", cases: "【待补充客户】" },
        { icon: "⚡", name: "新能源三电壳体", desc: "电机壳体·电控壳体·电池托盘", specs: "散热通道清洁度关键 · 无铝屑残留", cases: "【待补充客户】" },
        { icon: "🏗️", name: "一体化压铸结构件", desc: "后地板·前机舱·电池盒 · 超大型件", specs: "工件尺寸≤2500mm · 定制超大腔体", cases: "【待补充客户】" },
        { icon: "🔧", name: "工业铝铸件", desc: "散热器·阀体·泵壳·液压元件", specs: "NAS 1638 · 内腔无残留", cases: "【待补充客户】" },
      ],
    },
  },
  // ━━━ 9. GRT vs 传统对比 ━━━
  {
    id: "compare", layout: "comparison",
    title: "GRT vs 传统清洗方案",
    subtitle: "以汽车铝合金缸体为例 — 全维度对比",
    speakerNote: "【待补充对比数据】",
    data: {
      headers: ["指标", "传统方案", "GRT 方案", "提升"],
      rows: [
        ["清洁度达标率", "80-85%", "99%+", "↑ 15%"],
        ["内腔覆盖率", "<60%", "99%+", "↑ 40%"],
        ["单件清洗成本", "【待补充】", "【待补充】", "↓ 40%"],
        ["节拍时间", "【待补充】", "【待补充】", "↓ 45%"],
        ["废水排放", "COD 800+", "COD <150", "↓ 80%"],
        ["人工需求", "3-4人/线", "0.5人/线", "↓ 85%"],
        ["设备OEE", "60-70%", "90%+", "↑ 25%"],
      ],
    },
  },
  // ━━━ 10. M0-M12交付流程 ━━━
  {
    id: "delivery", layout: "timeline",
    title: "M0→M12 标准交付流程",
    subtitle: "16周 · 6个里程碑 · 全数字化管理",
    speakerNote: "我们的交付流程已经标准化为M0到M12六个里程碑。",
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
  // ━━━ 11. 数字化能力 ━━━
  {
    id: "digital", layout: "digital",
    title: "数字化全链路能力",
    subtitle: "GRT Showcase Hub · Digital Twin · AI Agent",
    speakerNote: "GRT不只卖设备，我们交付的是数字化清洗解决方案。",
    data: {
      capabilities: [
        { name: "VIP客户数字展厅", desc: "每位客户拥有专属展示页面，实时同步设备健康、项目进度、清洁度数据", icon: "🖥️" },
        { name: "数字孪生 Digital Twin", desc: "设备3D模型+实时运行数据，远程诊断，预测性维护", icon: "🔮" },
        { name: "AI工艺Agent", desc: "智能Agent自动分析清洗数据、优化参数、生成报告", icon: "🤖" },
        { name: "MES/ERP无缝集成", desc: "OPC UA / MQTT / RESTful 三通道对接", icon: "🔗" },
      ],
    },
  },
  // ━━━ 12. 愿景金句 ━━━
  {
    id: "quote", layout: "quote",
    title: "",
    speakerNote: "铝铸件的未来是轻量化与高品质的完美结合，而清洁度是这一切的基础。",
    data: {
      quote: "一体化压铸时代，\n清洁度决定产品可靠性。\n每一个内腔的洁净，\n都是品质的底线。",
      author: "GRT · 杰瑞德自动化",
      tagline: "让每一件铝铸件，都值得信赖",
    },
  },
  // ━━━ 13. 结尾 ━━━
  {
    id: "closing", layout: "closing",
    title: "欢迎莅临 GRT 展台交流",
    subtitle: "扫码即可查阅产品资料 · 方案 · 报价 · 公司介绍",
    speakerNote: "今天的演讲到这里。欢迎到展台交流，谢谢大家！",
    data: {
      actions: [
        { icon: "📱", label: "扫码查阅", desc: "产品资料 · 技术方案 · 报价参考" },
        { icon: "🖥️", label: "展台体验", desc: "设备模型 + 数字孪生演示" },
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

export const aluminumCastingConfig: ConferenceConfig = {
  meta: {
    topBarLabel: "铝铸件行业大会 2026 · CEO KEYNOTE",
    coverBadge: "2026 铝铸件行业大会 · 25分钟主题演讲",
    totalMinutes: 25,
    coverStandards: ["VDA 19.1", "ISO 16232", "IATF 16949", "ISO 14001"],
  },
  slides,
};
