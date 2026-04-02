/**
 * GRT招聘宣传落地页 — 手机友好·可分享·可嵌入公司网页·微信推广
 *
 * 设计原则：
 * - 单页滚动式（无Tab切换，适合微信浏览器和手机）
 * - 首屏3秒抓人（大标题+数字+CTA）
 * - 每屏一个信息点，滚动引导
 * - 底部固定CTA按钮（申请面试/了解更多）
 * - 图片占位用渐变色块（无需外部图片依赖）
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Factory, Globe, Users, TrendingUp, Award, Shield,
  Sparkles, MapPin, DollarSign, BookOpen, ChevronDown,
  ExternalLink, MessageSquare, Phone, Mail, Star,
  Rocket, Heart, Target, Zap, CheckCircle2,
} from "lucide-react";

export default function GrtRecruitLanding() {
  const [lang, setLang] = useState<"zh" | "en">("zh");
  const isZh = lang === "zh";

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* ═══ 首屏 Hero ═══ */}
      <section className="relative min-h-[100vh] flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white overflow-hidden">
        {/* 装饰 */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-40 h-40 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-60 h-60 rounded-full bg-white/20 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-2xl">
          {/* 语言切换 */}
          <div className="absolute top-0 right-0">
            <button onClick={() => setLang(lang === "zh" ? "en" : "zh")} className="text-xs bg-white/20 px-3 py-1 rounded-full">{lang === "zh" ? "EN" : "中文"}</button>
          </div>

          <Badge className="bg-white/20 text-white border-white/30 text-sm mb-4">🏭 {isZh ? "全球工业清洗设备领导者" : "Global Industrial Cleaning Leader"}</Badge>

          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-4">
            {isZh ? (
              <>加入<span className="text-amber-300">GRT</span><br/>共创全球制造未来</>
            ) : (
              <>Join <span className="text-amber-300">GRT</span><br/>Shape Global Manufacturing</>
            )}
          </h1>

          <p className="text-lg md:text-xl opacity-90 mb-8 leading-relaxed">
            {isZh
              ? "杰瑞德自动化科技 — 为博世、伊顿、比亚迪、宁德时代等全球客户提供超精密清洗解决方案"
              : "Providing ultra-precision cleaning solutions to Bosch, Eaton, BYD, CATL and global clients"}
          </p>

          {/* 核心数字 */}
          <div className="grid grid-cols-4 gap-3 mb-8 max-w-lg mx-auto">
            {[
              { v: "96+", l: isZh ? "精英团队" : "Team" },
              { v: "5", l: isZh ? "事业部" : "BUs" },
              { v: "3", l: isZh ? "大洲覆盖" : "Continents" },
              { v: "5" + (isZh ? "亿" : "00M"), l: isZh ? "2030目标" : "2030 Goal" },
            ].map((s, i) => (
              <div key={i} className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <p className="text-2xl md:text-3xl font-black text-amber-300">{s.v}</p>
                <p className="text-[10px] opacity-80">{s.l}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/online-interview" className="inline-flex items-center justify-center gap-2 bg-amber-400 text-slate-900 font-bold px-8 py-4 rounded-full text-lg hover:bg-amber-300 transition-colors">
              <Rocket className="w-5 h-5" />{isZh ? "立即申请面试" : "Apply Now"}
            </a>
            <a href="/talent-portal" className="inline-flex items-center justify-center gap-2 bg-white/20 text-white font-semibold px-8 py-4 rounded-full text-lg hover:bg-white/30 transition-colors border border-white/30">
              <BookOpen className="w-5 h-5" />{isZh ? "了解GRT" : "Learn More"}
            </a>
          </div>
        </div>

        <ChevronDown className="absolute bottom-8 w-6 h-6 animate-bounce opacity-60" />
      </section>

      {/* ═══ 为什么选择GRT ═══ */}
      <section className="py-16 px-6 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-2">{isZh ? "为什么选择 GRT？" : "Why GRT?"}</h2>
          <p className="text-muted-foreground mb-10">{isZh ? "不只是一份工作，而是全球制造业的前沿阵地" : "Not just a job — the frontier of global manufacturing"}</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: Globe, titleZh: "全球项目", titleEn: "Global Projects", descZh: "中美欧三地交付\n参与博世/伊顿等项目", descEn: "CN/NA/EU delivery\nBosch, Eaton projects" },
              { icon: TrendingUp, titleZh: "快速成长", titleEn: "Fast Growth", descZh: "3条发展路线\n清晰的晋升通道", descEn: "3 growth paths\nClear promotion track" },
              { icon: Sparkles, titleZh: "AI赋能", titleEn: "AI Empowered", descZh: "GRT System数字化平台\nAI Copilot助力效率", descEn: "GRT System platform\nAI Copilot for efficiency" },
              { icon: DollarSign, titleZh: "有竞争力薪资", titleEn: "Competitive Pay", descZh: "A档最高6个月奖金\n技能等级+绩效双驱", descEn: "Up to 6-month bonus\nSkill+Performance driven" },
              { icon: Heart, titleZh: "导师文化", titleEn: "Mentor Culture", descZh: "赋能引擎每天陪你\nTSDCKL能力雷达", descEn: "Daily empowerment engine\nTSDCKL capability radar" },
              { icon: Shield, titleZh: "IATF质量", titleEn: "IATF Quality", descZh: "汽车行业最高标准\nFAT>95%一次通过", descEn: "Highest auto standard\nFAT>95% first pass" },
            ].map((item, i) => (
              <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 text-center">
                  <item.icon className="w-8 h-8 mx-auto text-blue-600 mb-3" />
                  <h3 className="font-bold text-sm mb-1">{isZh ? item.titleZh : item.titleEn}</h3>
                  <p className="text-xs text-muted-foreground whitespace-pre-line">{isZh ? item.descZh : item.descEn}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 热招岗位 ═══ */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-2">{isZh ? "热招岗位" : "Open Positions"}</h2>
          <p className="text-muted-foreground text-center mb-10">{isZh ? "10大岗位族·67个岗位·覆盖全产业链" : "10 role families · 67 positions"}</p>

          {[
            { title: isZh ? "🔧 机械/电气工程师" : "🔧 Mechanical/Electrical Engineer", salary: "8K-22K", hot: true, desc: isZh ? "超声清洗线设计·BOM·FAT交付·全球项目" : "Ultrasonic line design, BOM, FAT delivery" },
            { title: isZh ? "📈 销售工程师/市场" : "📈 Sales Engineer / Marketing", salary: "8K-25K+提成", hot: true, desc: isZh ? "开拓战略客户·管理销售团队·北美欧洲市场" : "Strategic clients, team management, NA/EU" },
            { title: isZh ? "📋 项目经理" : "📋 Project Manager", salary: "10K-20K", hot: false, desc: isZh ? "M0-M12全流程管理·成本控制·客户满意度" : "M0-M12 lifecycle, cost control, CSAT" },
            { title: isZh ? "🏭 CNC/装配/焊工" : "🏭 CNC / Assembly / Welder", salary: "5K-13K", hot: false, desc: isZh ? "精密加工·机械装配·技能等级晋升·稳定" : "Precision machining, assembly, skill levels" },
            { title: isZh ? "🔧 售后服务工程师" : "🔧 Service Engineer", salary: "7K-16K", hot: true, desc: isZh ? "全球客户现场支持·远程诊断·设备维护" : "Global on-site support, remote diagnostics" },
            { title: isZh ? "💰 财务/HR/行政" : "💰 Finance / HR / Admin", salary: "5K-15K", hot: false, desc: isZh ? "金蝶+GRT System·绩效体系·招聘培训" : "Kingdee+GRT System, KPI, recruitment" },
          ].map((job, i) => (
            <a key={i} href="/online-interview" className="block mb-3">
              <div className="flex items-center gap-3 p-4 rounded-xl border hover:border-blue-300 hover:shadow-md transition-all">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm">{job.title}</h3>
                    {job.hot && <Badge className="bg-red-100 text-red-700 text-[10px]">HOT</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{job.desc}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-blue-600 text-sm">{job.salary}</p>
                  <p className="text-[10px] text-muted-foreground">{isZh ? "无锡" : "Wuxi"}</p>
                </div>
                <ChevronDown className="w-4 h-4 -rotate-90 text-muted-foreground" />
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ═══ 岗位工作特色 — 有趣·有难·有挑战 ═══ */}
      <section className="py-16 px-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-2">{isZh ? "每个岗位都不平凡" : "Every Role Matters"}</h2>
          <p className="text-muted-foreground text-center mb-8">{isZh ? "有趣 · 有难度 · 有挑战 · 有成就感" : "Interesting · Challenging · Rewarding"}</p>
          <div className="space-y-4">
            {[
              { role: isZh ? "🔧 机械设计工程师" : "🔧 Mechanical Engineer",
                fun: isZh ? "你设计的设备会运到德国博世、美国伊顿的工厂——你的图纸变成真实的钢铁巨兽" : "Your designs ship to Bosch Germany, Eaton USA — blueprints become steel reality",
                challenge: isZh ? "每台设备都是定制化的，没有两台完全相同。超声频率、清洗工艺、工件尺寸都不同" : "Every machine is custom. Different ultrasonic frequencies, processes, workpiece dimensions",
                growth: isZh ? "从单一零件设计→整机架构→多工位产线→全球标准化平台，能力阶梯清晰" : "From parts → full machine → multi-station lines → global platform design" },
              { role: isZh ? "⚡ 电气工程师" : "⚡ Electrical Engineer",
                fun: isZh ? "PLC+HMI+MES+IoT四位一体，你写的程序控制着价值百万的清洗产线" : "PLC+HMI+MES+IoT — your code controls million-dollar cleaning lines",
                challenge: isZh ? "超声波功率匹配、多轴机械手协同、视觉检测集成——每个项目都是新课题" : "Ultrasonic power matching, multi-axis robot sync, vision integration — new challenges every project",
                growth: isZh ? "电气工程师→自动化架构师→IoT平台负责人→CTO方向，技术天花板极高" : "EE → Automation Architect → IoT Platform Lead → CTO track" },
              { role: isZh ? "📈 销售工程师" : "📈 Sales Engineer",
                fun: isZh ? "面对的客户都是行业巨头：博世、采埃孚、比亚迪、宁德时代——每次签约都是里程碑" : "Clients are industry giants: Bosch, ZF, BYD, CATL — every deal is a milestone",
                challenge: isZh ? "技术型销售：你需要懂清洗工艺、读懂客户图纸、计算TCO、谈判百万级合同" : "Technical selling: understand cleaning processes, read drawings, calculate TCO, negotiate million-dollar contracts",
                growth: isZh ? "2028-2030年海外营收占比从20%→60%，大量北美欧洲客户等你开拓" : "Overseas revenue from 20%→60% by 2030 — massive NA/EU opportunities" },
              { role: isZh ? "🏭 产线技术工" : "🏭 Production Technician",
                fun: isZh ? "每台设备都是独一无二的组装挑战，从零件到整机到客户验收，全程参与" : "Every machine is a unique assembly challenge — from parts to customer acceptance",
                challenge: isZh ? "精度要求高：超声清洗线的密封性、管路连接、电气布线都需要极致细心" : "High precision: sealing, plumbing, wiring all require extreme attention to detail",
                growth: isZh ? "技能等级(L1-L7)逐级晋升，班组长→生产主管→车间经理，管理通道畅通" : "Skill levels L1-L7, Lead → Supervisor → Manager, clear management path" },
              { role: isZh ? "🌍 售后服务工程师" : "🌍 Service Engineer",
                fun: isZh ? "飞往全球客户现场：德国慕尼黑、美国底特律、重庆——见识不同国家的工厂文化" : "Fly to global sites: Munich, Detroit, Chongqing — experience diverse factory cultures",
                challenge: isZh ? "客户设备停机=每小时损失数万元。你需要在最短时间内远程诊断或现场解决" : "Equipment downtime costs thousands per hour. You must diagnose and fix ASAP",
                growth: isZh ? "积累全球设备保有量经验，未来可转型为技术培训师或区域服务总监" : "Build global installed base expertise → trainer or regional service director" },
            ].map((item, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <h3 className="font-bold mb-2">{item.role}</h3>
                  <div className="space-y-1.5 text-xs">
                    <p><span className="font-semibold text-amber-600">{isZh ? "🎯 有趣：" : "🎯 Fun: "}</span>{item.fun}</p>
                    <p><span className="font-semibold text-red-600">{isZh ? "🔥 挑战：" : "🔥 Challenge: "}</span>{item.challenge}</p>
                    <p><span className="font-semibold text-green-600">{isZh ? "📈 成长：" : "📈 Growth: "}</span>{item.growth}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ GRT十大核心技术 ═══ */}
      <section className="py-16 px-6 bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-2">{isZh ? "GRT 十大核心技术" : "GRT 10 Core Technologies"}</h2>
          <p className="text-slate-400 mb-8">{isZh ? "技术领先性是我们吸引人才的底气" : "Technical leadership is our talent magnet"}</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { icon: "🔊", titleZh: "超声波清洗", titleEn: "Ultrasonic", descZh: "28-120kHz多频\n兆声波精密清洗", descEn: "28-120kHz multi-freq\nMegasonic precision" },
              { icon: "🤖", titleZh: "工业机器人", titleEn: "Industrial Robot", descZh: "多轴协同\n自动上下料", descEn: "Multi-axis coordination\nAuto loading/unloading" },
              { icon: "🦾", titleZh: "人型机器人", titleEn: "Humanoid Robot", descZh: "训练与工业化\n落地技术", descEn: "Training & industrialization\nDeployment tech" },
              { icon: "👁️", titleZh: "机器视觉", titleEn: "Machine Vision", descZh: "CCD清洁度检测\n在线质量判定", descEn: "CCD cleanliness inspection\nOnline quality check" },
              { icon: "🧠", titleZh: "AI体系", titleEn: "AI System", descZh: "Copilot+Agent\n智能决策平台", descEn: "Copilot+Agent\nSmart decision platform" },
              { icon: "🌐", titleZh: "IoT物联网", titleEn: "IoT Platform", descZh: "设备远程监控\n预测性维护", descEn: "Remote monitoring\nPredictive maintenance" },
              { icon: "🔬", titleZh: "清洗工艺", titleEn: "Process Tech", descZh: "碳氢/水基/真空\n多工艺集成", descEn: "Hydrocarbon/aqueous/vacuum\nMulti-process integration" },
              { icon: "📊", titleZh: "数字孪生", titleEn: "Digital Twin", descZh: "3D可视化\n虚拟调试", descEn: "3D visualization\nVirtual commissioning" },
              { icon: "🏗️", titleZh: "模块化设计", titleEn: "Modular Design", descZh: "标准化平台\n快速定制", descEn: "Standardized platform\nRapid customization" },
              { icon: "📱", titleZh: "GRT System", titleEn: "GRT System", descZh: "400+页面\n全流程数字化", descEn: "400+ pages\nFull-process digitalization" },
            ].map((tech, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors">
                <span className="text-2xl">{tech.icon}</span>
                <p className="font-bold text-xs mt-1">{isZh ? tech.titleZh : tech.titleEn}</p>
                <p className="text-[10px] text-slate-400 whitespace-pre-line mt-0.5">{isZh ? tech.descZh : tech.descEn}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 人才培养体系 ═══ */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-2">{isZh ? "GRT人才培养生态" : "GRT Talent Development"}</h2>
          <p className="text-muted-foreground text-center mb-8">{isZh ? "不只是培训，而是一个完整的成长生态系统" : "Not just training — a complete growth ecosystem"}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: "🎓", titleZh: "5阶段入职成长", titleEn: "5-Phase Onboarding", items: isZh ? ["公司认知(1周)", "角色认知(2周)", "系统操作(实战)", "业务演练(沙盘模拟)", "能力考核(TSDCKL)"] : ["Company(1w)", "Role(2w)", "System(Practice)", "Business(Sandbox)", "Assessment(TSDCKL)"] },
              { icon: "🌍", titleZh: "跨国培训与交流", titleEn: "Global Training", items: isZh ? ["北美客户现场实习(3-6月)", "欧洲工厂参观交流", "全球行业展会参与", "海外项目驻场经验"] : ["NA on-site internship(3-6mo)", "EU factory visits", "Global exhibitions", "Overseas project deployment"] },
              { icon: "🔄", titleZh: "灵活转岗机制", titleEn: "Job Rotation", items: isZh ? ["设计→项目管理(技术型PM)", "销售→售后(全流程理解)", "生产→质量(IATF专家)", "国内→海外(全球化人才)"] : ["Design→PM(Tech PM)", "Sales→Service(Full cycle)", "Production→Quality(IATF)", "Domestic→Global"] },
              { icon: "🏆", titleZh: "能力可见化体系", titleEn: "Visible Growth", items: isZh ? ["TSDCKL六维能力雷达", "每日积分(+10/天)", "季度能力复评", "职业灯塔3条路线选择"] : ["TSDCKL 6D Radar", "Daily Points(+10/day)", "Quarterly Assessment", "3 Career Paths"] },
              { icon: "🤖", titleZh: "AI导师陪伴", titleEn: "AI Mentor", items: isZh ? ["赋能引擎每日赋能", "AI个性化改进建议", "工作顾问智能对话", "KPI学习中心21门课程"] : ["Daily Empowerment Engine", "AI Personalized Tips", "Work Consultant Chat", "KPI Learning 21 Courses"] },
              { icon: "💰", titleZh: "多维激励机制", titleEn: "Multi-Incentive", items: isZh ? ["ABCD绩效档(最高6月奖金)", "技能等级薪资阶梯", "月度评优(1500/800/500)", "项目提成+海外补贴"] : ["ABCD Tiers(up to 6mo bonus)", "Skill-level salary ladder", "Monthly awards", "Project bonus+overseas allowance"] },
            ].map((block, i) => (
              <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{block.icon}</span>
                    <h3 className="font-bold text-sm">{isZh ? block.titleZh : block.titleEn}</h3>
                  </div>
                  <ul className="space-y-1">
                    {block.items.map((item, j) => (
                      <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />{item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 产品的丰富性与多样性 ═══ */}
      <section className="py-16 px-6 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-2">{isZh ? "产品世界的丰富多彩" : "Rich & Diverse Products"}</h2>
          <p className="text-muted-foreground mb-8">{isZh ? "每个行业都有独特的清洗挑战——你永远不会觉得无聊" : "Every industry has unique cleaning challenges — you'll never be bored"}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: "⚙️", titleZh: "齿轴清洗线", titleEn: "Gear/Shaft", descZh: "汽车变速箱核心零件\n精度≤50μm", descEn: "Transmission core parts\nPrecision ≤50μm" },
              { icon: "🔩", titleZh: "缸体清洗线", titleEn: "Engine Block", descZh: "发动机缸体/缸盖\n大型8工位", descEn: "Engine block/head\n8-station large line" },
              { icon: "🏗️", titleZh: "铝压铸清洗", titleEn: "Die Casting", descZh: "新能源电池壳体\n高压喷淋+超声", descEn: "EV battery housing\nHigh-pressure + ultrasonic" },
              { icon: "💎", titleZh: "半导体清洗", titleEn: "Semiconductor", descZh: "精密电子元件\n百级洁净室", descEn: "Precision electronics\nClass 100 cleanroom" },
              { icon: "🔋", titleZh: "新能源电池", titleEn: "EV Battery", descZh: "电芯/模组清洗\nCATL合作", descEn: "Cell/module cleaning\nCATL partnership" },
              { icon: "🚗", titleZh: "汽车零部件", titleEn: "Automotive", descZh: "博世/伊顿/ZF\nIATF 16949", descEn: "Bosch/Eaton/ZF\nIATF 16949" },
              { icon: "✈️", titleZh: "航空航天", titleEn: "Aerospace", descZh: "精密轴承/叶片\n超高洁净度", descEn: "Precision bearings/blades\nUltra-high cleanliness" },
              { icon: "🏥", titleZh: "医疗器械", titleEn: "Medical", descZh: "手术器械清洗\nGMP合规", descEn: "Surgical instrument cleaning\nGMP compliant" },
            ].map((prod, i) => (
              <div key={i} className="p-4 rounded-xl bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow text-center">
                <span className="text-3xl">{prod.icon}</span>
                <p className="font-bold text-xs mt-2">{isZh ? prod.titleZh : prod.titleEn}</p>
                <p className="text-[10px] text-muted-foreground whitespace-pre-line mt-1">{isZh ? prod.descZh : prod.descEn}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 员工说 ═══ */}
      <section className="py-16 px-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">{isZh ? "GRT人说" : "Our People Say"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: isZh ? "李大鹏·高级机械工程师" : "Li Dapeng · Sr ME", quote: isZh ? "在GRT参与了10+台设备的从设计到交付，每个项目都让我成长。赋能引擎的每日复盘帮我养成了好习惯。" : "Worked on 10+ machines from design to delivery. Daily reviews built great habits." },
              { name: isZh ? "匡凯旋·售后工程师" : "Kuang Kaixuan · Service Eng", quote: isZh ? "去年在美国驻场3个月，独立完成SAT调试。GRT给了我全球视野的机会，这是别的公司给不了的。" : "3 months on-site in US for SAT. GRT offers global exposure others can't." },
              { name: isZh ? "王秀萍·财务主管" : "Wang Xiuping · Finance", quote: isZh ? "金蝶+GRT System双系统让财务工作效率提升了50%。月结从5天缩到了2天，有更多时间做分析。" : "Kingdee+GRT System boosted efficiency 50%. Monthly close from 5 days to 2." },
            ].map((t, i) => (
              <Card key={i} className="border-0 shadow-sm"><CardContent className="p-5">
                <MessageSquare className="w-6 h-6 text-blue-400 mb-2" />
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed italic">"{t.quote}"</p>
                <p className="text-xs font-semibold">{t.name}</p>
              </CardContent></Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 面试流程 ═══ */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">{isZh ? "极简面试流程" : "Simple Interview Process"}</h2>
          <div className="space-y-4 text-left">
            {[
              { step: "1", titleZh: "在线答题 (15分钟)", titleEn: "Online Assessment (15min)", descZh: "AI智能出题，按岗位匹配，即时评分", descEn: "AI-powered, role-matched, instant scoring" },
              { step: "2", titleZh: "提交个人资料", titleEn: "Submit Profile", descZh: "简历、业绩、案例一键提交", descEn: "Resume, achievements, cases in one step" },
              { step: "3", titleZh: "正式面试 (45分钟)", titleEn: "Formal Interview (45min)", descZh: "技术+HR面试，当天出结果", descEn: "Tech+HR interview, same-day result" },
              { step: "4", titleZh: "入职赋能", titleEn: "Onboarding", descZh: "5阶段成长计划+导师陪伴+能力雷达", descEn: "5-phase growth plan + mentor + radar" },
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">{s.step}</div>
                <div>
                  <h3 className="font-bold text-sm">{isZh ? s.titleZh : s.titleEn}</h3>
                  <p className="text-xs text-muted-foreground">{isZh ? s.descZh : s.descEn}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 底部CTA ═══ */}
      <section className="py-16 px-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-center">
        <h2 className="text-3xl font-bold mb-3">{isZh ? "准备好了吗？" : "Ready?"}</h2>
        <p className="text-lg opacity-90 mb-8">{isZh ? "你的下一步，可能就是全球制造业的未来" : "Your next step could shape the future of manufacturing"}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="/online-interview" className="inline-flex items-center justify-center gap-2 bg-amber-400 text-slate-900 font-bold px-8 py-4 rounded-full text-lg hover:bg-amber-300 transition-colors">
            <Rocket className="w-5 h-5" />{isZh ? "15分钟在线面试" : "15min Online Interview"}
          </a>
          <a href="/talent-portal" className="inline-flex items-center justify-center gap-2 bg-white/20 text-white font-semibold px-8 py-4 rounded-full text-lg hover:bg-white/30 transition-colors border border-white/30">
            {isZh ? "了解薪资与岗位" : "Salary & Positions"}
          </a>
        </div>
      </section>

      {/* ═══ 底部信息 ═══ */}
      <footer className="py-8 px-6 bg-slate-900 text-slate-400 text-center text-xs">
        <p className="mb-2">杰瑞德自动化科技有限公司 · GRT Automation Technology Co., Ltd.</p>
        <p>📍 {isZh ? "江苏省无锡市" : "Wuxi, Jiangsu, China"} · 📧 hr@gerrytech.com · 🌐 grtclean.ai</p>
        <p className="mt-2 opacity-60">Powered by GRT System · {new Date().getFullYear()}</p>
      </footer>

      {/* ═══ 手机底部固定CTA ═══ */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white dark:bg-slate-900 border-t p-3 flex gap-2 safe-area-pb z-50">
        <a href="/online-interview" className="flex-1 inline-flex items-center justify-center gap-1 bg-blue-600 text-white font-bold py-3 rounded-full text-sm">
          <Rocket className="w-4 h-4" />{isZh ? "申请面试" : "Apply"}
        </a>
        <a href="/talent-portal" className="flex-1 inline-flex items-center justify-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold py-3 rounded-full text-sm">
          {isZh ? "了解更多" : "Learn More"}
        </a>
      </div>
    </div>
  );
}
