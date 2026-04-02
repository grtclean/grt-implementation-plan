/**
 * GRT 标准件库补充
 * 1. 米思米(MISUMI)标准件通道
 * 2. 管道连接件(Swagelok/Parker/Victaulic)
 * Run: node scripts/seed-misumi-pipe-fittings.cjs
 */
const http = require("http");
const BASE = "http://127.0.0.1:3000";
let COOKIE = "";
function req(m,p,b){return new Promise((ok,no)=>{const u=new URL(p,BASE);const d=b?JSON.stringify(b):null;const o={hostname:u.hostname,port:u.port,path:u.pathname+u.search,method:m,headers:{"Content-Type":"application/json",...(COOKIE?{Cookie:COOKIE}:{}),...(d?{"Content-Length":Buffer.byteLength(d,"utf8")}:{})}};const r=http.request(o,res=>{if(res.headers["set-cookie"])COOKIE=res.headers["set-cookie"][0].split(";")[0];let c=[];res.on("data",x=>c.push(x));res.on("end",()=>{try{ok(JSON.parse(Buffer.concat(c).toString("utf8")))}catch{ok(null)}})});r.on("error",no);if(d)r.write(d,"utf8");r.end()})}

(async()=>{
  await req("POST","/api/auth/login",{username:"admin",password:"Gerry123"});
  const bomId = 48;
  const items = [
    // ═══════════════════════════════════════
    // 米思米 MISUMI 标准件
    // ═══════════════════════════════════════
    // 直线运动
    { level:1, materialCode:"MISUMI-LHFS-20", materialName:"米思米 LHFS20 线性滑轨 20mm(1m)", quantity:1, unit:"套", unitCost:380, sourceType:"purchase", category:"MISUMI-直线运动", supplier:"MISUMI米思米" },
    { level:1, materialCode:"MISUMI-LHFS-25", materialName:"米思米 LHFS25 线性滑轨 25mm(1m)", quantity:1, unit:"套", unitCost:520, sourceType:"purchase", category:"MISUMI-直线运动", supplier:"MISUMI米思米" },
    { level:1, materialCode:"MISUMI-BGLF-20", materialName:"米思米 BGLF20 滑块(法兰型)", quantity:1, unit:"只", unitCost:180, sourceType:"purchase", category:"MISUMI-直线运动", supplier:"MISUMI米思米" },
    { level:1, materialCode:"MISUMI-MTSS-12", materialName:"米思米 MTSS12 丝杆支撑座(固定端)", quantity:1, unit:"只", unitCost:120, sourceType:"purchase", category:"MISUMI-直线运动", supplier:"MISUMI米思米" },
    { level:1, materialCode:"MISUMI-BSSC-1205", materialName:"米思米 BSSC1205 滚珠丝杆 C5 12x5(500mm)", quantity:1, unit:"根", unitCost:650, sourceType:"purchase", category:"MISUMI-直线运动", supplier:"MISUMI米思米" },
    { level:1, materialCode:"MISUMI-BSSC-1610", materialName:"米思米 BSSC1610 滚珠丝杆 C5 16x10(1000mm)", quantity:1, unit:"根", unitCost:1200, sourceType:"purchase", category:"MISUMI-直线运动", supplier:"MISUMI米思米" },
    // 轴/联轴器
    { level:1, materialCode:"MISUMI-PSFJ-10-100", materialName:"米思米 PSFJ 不锈钢光轴 10x100mm", quantity:1, unit:"根", unitCost:25, sourceType:"purchase", category:"MISUMI-轴", supplier:"MISUMI米思米" },
    { level:1, materialCode:"MISUMI-PSFJ-12-200", materialName:"米思米 PSFJ 不锈钢光轴 12x200mm", quantity:1, unit:"根", unitCost:35, sourceType:"purchase", category:"MISUMI-轴", supplier:"MISUMI米思米" },
    { level:1, materialCode:"MISUMI-CPJF-20-8-10", materialName:"米思米 CPJF 梅花联轴器 20mm(8-10孔)", quantity:1, unit:"只", unitCost:85, sourceType:"purchase", category:"MISUMI-联轴器", supplier:"MISUMI米思米" },
    { level:1, materialCode:"MISUMI-CPJF-25-10-12", materialName:"米思米 CPJF 梅花联轴器 25mm(10-12孔)", quantity:1, unit:"只", unitCost:120, sourceType:"purchase", category:"MISUMI-联轴器", supplier:"MISUMI米思米" },
    // 铝型材
    { level:1, materialCode:"MISUMI-HFS5-4040", materialName:"米思米 HFS5-4040 铝型材 40x40(1m)", quantity:1, unit:"根", unitCost:45, sourceType:"purchase", category:"MISUMI-铝型材", supplier:"MISUMI米思米" },
    { level:1, materialCode:"MISUMI-HFS5-4080", materialName:"米思米 HFS5-4080 铝型材 40x80(1m)", quantity:1, unit:"根", unitCost:85, sourceType:"purchase", category:"MISUMI-铝型材", supplier:"MISUMI米思米" },
    { level:1, materialCode:"MISUMI-HFS5-2020", materialName:"米思米 HFS5-2020 铝型材 20x20(1m)", quantity:1, unit:"根", unitCost:22, sourceType:"purchase", category:"MISUMI-铝型材", supplier:"MISUMI米思米" },
    { level:1, materialCode:"MISUMI-HBLFSN5", materialName:"米思米 HBLFSN5 角件(内连接)", quantity:10, unit:"只", unitCost:3.5, sourceType:"purchase", category:"MISUMI-铝型材", supplier:"MISUMI米思米" },
    // 弹簧/缓冲
    { level:1, materialCode:"MISUMI-SWF-10-30", materialName:"米思米 SWF 轻载弹簧 10x30(蓝色)", quantity:1, unit:"只", unitCost:8, sourceType:"purchase", category:"MISUMI-弹簧", supplier:"MISUMI米思米" },
    { level:1, materialCode:"MISUMI-SWH-12-40", materialName:"米思米 SWH 重载弹簧 12x40(红色)", quantity:1, unit:"只", unitCost:12, sourceType:"purchase", category:"MISUMI-弹簧", supplier:"MISUMI米思米" },
    { level:1, materialCode:"MISUMI-RB1412", materialName:"米思米 RB1412 液压缓冲器 M14", quantity:1, unit:"只", unitCost:85, sourceType:"purchase", category:"MISUMI-缓冲", supplier:"MISUMI米思米" },
    { level:1, materialCode:"MISUMI-RB2015", materialName:"米思米 RB2015 液压缓冲器 M20", quantity:1, unit:"只", unitCost:120, sourceType:"purchase", category:"MISUMI-缓冲", supplier:"MISUMI米思米" },
    // 定位/夹紧
    { level:1, materialCode:"MISUMI-PJXC-6-10", materialName:"米思米 PJXC 定位销(阶梯型) 6x10", quantity:10, unit:"只", unitCost:5, sourceType:"purchase", category:"MISUMI-定位", supplier:"MISUMI米思米" },
    { level:1, materialCode:"MISUMI-FJXL-20", materialName:"米思米 FJXL 快速夹钳(水平型)", quantity:1, unit:"只", unitCost:65, sourceType:"purchase", category:"MISUMI-夹紧", supplier:"MISUMI米思米" },
    { level:1, materialCode:"MISUMI-FJXS-25", materialName:"米思米 FJXS 快速夹钳(垂直型)", quantity:1, unit:"只", unitCost:75, sourceType:"purchase", category:"MISUMI-夹紧", supplier:"MISUMI米思米" },
    // 防护罩/拖链
    { level:1, materialCode:"MISUMI-IGUS-E2-10", materialName:"米思米/igus E2 拖链 内宽25mm(1m)", quantity:1, unit:"米", unitCost:65, sourceType:"purchase", category:"MISUMI-拖链", supplier:"MISUMI/igus" },
    { level:1, materialCode:"MISUMI-IGUS-E4-15", materialName:"米思米/igus E4 拖链 内宽38mm(1m)", quantity:1, unit:"米", unitCost:95, sourceType:"purchase", category:"MISUMI-拖链", supplier:"MISUMI/igus" },

    // ═══════════════════════════════════════
    // Swagelok 世伟洛克 — 管道连接件
    // ═══════════════════════════════════════
    { level:1, materialCode:"SWG-SS-600-1-4", materialName:"Swagelok 卡套接头 1/4\" OD 316L", quantity:10, unit:"只", unitCost:45, sourceType:"purchase", category:"Swagelok-卡套", supplier:"Swagelok世伟洛克" },
    { level:1, materialCode:"SWG-SS-600-3-8", materialName:"Swagelok 卡套接头 3/8\" OD 316L", quantity:10, unit:"只", unitCost:55, sourceType:"purchase", category:"Swagelok-卡套", supplier:"Swagelok世伟洛克" },
    { level:1, materialCode:"SWG-SS-600-1-2", materialName:"Swagelok 卡套接头 1/2\" OD 316L", quantity:10, unit:"只", unitCost:68, sourceType:"purchase", category:"Swagelok-卡套", supplier:"Swagelok世伟洛克" },
    { level:1, materialCode:"SWG-SS-400-R1-4", materialName:"Swagelok 卡套转NPT 1/4\"OD-R1/4", quantity:5, unit:"只", unitCost:52, sourceType:"purchase", category:"Swagelok-转接", supplier:"Swagelok世伟洛克" },
    { level:1, materialCode:"SWG-SS-810-R3-8", materialName:"Swagelok 卡套转NPT 1/2\"OD-R3/8", quantity:5, unit:"只", unitCost:65, sourceType:"purchase", category:"Swagelok-转接", supplier:"Swagelok世伟洛克" },
    { level:1, materialCode:"SWG-SS-T-400", materialName:"Swagelok 三通接头 1/4\" 316L", quantity:5, unit:"只", unitCost:85, sourceType:"purchase", category:"Swagelok-三通", supplier:"Swagelok世伟洛克" },
    { level:1, materialCode:"SWG-SS-T-810", materialName:"Swagelok 三通接头 1/2\" 316L", quantity:5, unit:"只", unitCost:120, sourceType:"purchase", category:"Swagelok-三通", supplier:"Swagelok世伟洛克" },
    { level:1, materialCode:"SWG-SS-ELBOW-400", materialName:"Swagelok 90度弯头 1/4\" 316L", quantity:5, unit:"只", unitCost:55, sourceType:"purchase", category:"Swagelok-弯头", supplier:"Swagelok世伟洛克" },
    { level:1, materialCode:"SWG-SS-4P4T", materialName:"Swagelok 针阀 1/4\"OD 316L", quantity:2, unit:"只", unitCost:350, sourceType:"purchase", category:"Swagelok-阀", supplier:"Swagelok世伟洛克" },
    { level:1, materialCode:"SWG-SS-43GS4", materialName:"Swagelok 球阀 1/4\" 316L", quantity:2, unit:"只", unitCost:280, sourceType:"purchase", category:"Swagelok-阀", supplier:"Swagelok世伟洛克" },
    { level:1, materialCode:"SWG-TUBE-SS-1-4", materialName:"Swagelok 精密不锈钢管 1/4\"OD(6m)", quantity:1, unit:"根", unitCost:180, sourceType:"purchase", category:"Swagelok-管", supplier:"Swagelok世伟洛克" },

    // ═══════════════════════════════════════
    // Parker 派克 — 液压/管道连接件
    // ═══════════════════════════════════════
    { level:1, materialCode:"PARKER-JIC-6-4", materialName:"Parker JIC 37度扩口接头 #6 x 1/4\"", quantity:10, unit:"只", unitCost:25, sourceType:"purchase", category:"Parker-JIC", supplier:"Parker派克" },
    { level:1, materialCode:"PARKER-JIC-8-6", materialName:"Parker JIC 37度扩口接头 #8 x 3/8\"", quantity:10, unit:"只", unitCost:32, sourceType:"purchase", category:"Parker-JIC", supplier:"Parker派克" },
    { level:1, materialCode:"PARKER-JIC-12-8", materialName:"Parker JIC 37度扩口接头 #12 x 1/2\"", quantity:10, unit:"只", unitCost:42, sourceType:"purchase", category:"Parker-JIC", supplier:"Parker派克" },
    { level:1, materialCode:"PARKER-ORFS-6-4", materialName:"Parker ORFS O型圈平面接头 #6", quantity:5, unit:"只", unitCost:38, sourceType:"purchase", category:"Parker-ORFS", supplier:"Parker派克" },
    { level:1, materialCode:"PARKER-CPI-6-1-4", materialName:"Parker CPI 卡套接头 6mm-R1/4", quantity:10, unit:"只", unitCost:28, sourceType:"purchase", category:"Parker-CPI", supplier:"Parker派克" },
    { level:1, materialCode:"PARKER-CPI-10-3-8", materialName:"Parker CPI 卡套接头 10mm-R3/8", quantity:10, unit:"只", unitCost:35, sourceType:"purchase", category:"Parker-CPI", supplier:"Parker派克" },
    { level:1, materialCode:"PARKER-LEGRIS-3175-06", materialName:"Parker Legris 快插接头 6mm L型", quantity:10, unit:"只", unitCost:12, sourceType:"purchase", category:"Parker-快插", supplier:"Parker派克" },
    { level:1, materialCode:"PARKER-LEGRIS-3175-08", materialName:"Parker Legris 快插接头 8mm L型", quantity:10, unit:"只", unitCost:15, sourceType:"purchase", category:"Parker-快插", supplier:"Parker派克" },
    { level:1, materialCode:"PARKER-HOSE-301-6", materialName:"Parker 301 中压液压软管 3/8\"(1m)", quantity:1, unit:"米", unitCost:65, sourceType:"purchase", category:"Parker-软管", supplier:"Parker派克" },
    { level:1, materialCode:"PARKER-HOSE-301-8", materialName:"Parker 301 中压液压软管 1/2\"(1m)", quantity:1, unit:"米", unitCost:85, sourceType:"purchase", category:"Parker-软管", supplier:"Parker派克" },
    { level:1, materialCode:"PARKER-D1VW-4C", materialName:"Parker D1VW 电磁换向阀 4/3中位关", quantity:1, unit:"只", unitCost:850, sourceType:"purchase", category:"Parker-液压阀", supplier:"Parker派克" },

    // ═══════════════════════════════════════
    // Victaulic 唯特利 — 管道快速连接
    // ═══════════════════════════════════════
    { level:1, materialCode:"VICT-STYLE77-DN50", materialName:"Victaulic Style 77 沟槽卡箍 DN50", quantity:5, unit:"只", unitCost:65, sourceType:"purchase", category:"Victaulic-卡箍", supplier:"Victaulic唯特利" },
    { level:1, materialCode:"VICT-STYLE77-DN80", materialName:"Victaulic Style 77 沟槽卡箍 DN80", quantity:5, unit:"只", unitCost:85, sourceType:"purchase", category:"Victaulic-卡箍", supplier:"Victaulic唯特利" },
    { level:1, materialCode:"VICT-STYLE77-DN100", materialName:"Victaulic Style 77 沟槽卡箍 DN100", quantity:5, unit:"只", unitCost:120, sourceType:"purchase", category:"Victaulic-卡箍", supplier:"Victaulic唯特利" },
    { level:1, materialCode:"VICT-TEE-DN50", materialName:"Victaulic 沟槽三通 DN50", quantity:2, unit:"只", unitCost:95, sourceType:"purchase", category:"Victaulic-配件", supplier:"Victaulic唯特利" },
    { level:1, materialCode:"VICT-ELBOW90-DN50", materialName:"Victaulic 沟槽90度弯头 DN50", quantity:5, unit:"只", unitCost:75, sourceType:"purchase", category:"Victaulic-配件", supplier:"Victaulic唯特利" },
    { level:1, materialCode:"VICT-REDUCER-DN80-50", materialName:"Victaulic 沟槽异径接头 DN80-50", quantity:2, unit:"只", unitCost:85, sourceType:"purchase", category:"Victaulic-配件", supplier:"Victaulic唯特利" },
    { level:1, materialCode:"VICT-GASKET-DN50-E", materialName:"Victaulic E型垫圈 DN50 (EPDM)", quantity:10, unit:"只", unitCost:8, sourceType:"purchase", category:"Victaulic-垫圈", supplier:"Victaulic唯特利" },
  ];

  let n=0;
  for(const it of items){await req("POST","/api/trpc/bom.addBomItem",{json:{bomMasterId:bomId,...it}});n++;process.stdout.write(".")}
  console.log(`\n导入完成: ${n} 项`);
  console.log("═══════════════════════════════════════════");
  console.log("  MISUMI米思米 (23项):");
  console.log("  ├─ 直线运动: 线性滑轨/滑块/丝杆支撑/滚珠丝杆");
  console.log("  ├─ 轴/联轴器: 不锈钢光轴/梅花联轴器");
  console.log("  ├─ 铝型材: HFS5系列(20/40/80) + 角件");
  console.log("  ├─ 弹簧/缓冲: 轻载/重载弹簧 + 液压缓冲器");
  console.log("  ├─ 定位/夹紧: 阶梯销/快速夹钳");
  console.log("  └─ 拖链: igus E2/E4系列");
  console.log("  Swagelok世伟洛克 (11项):");
  console.log("  ├─ 卡套接头: 1/4~1/2\" 316L");
  console.log("  ├─ 转接/三通/弯头: NPT转接 + 分支");
  console.log("  ├─ 阀: 针阀 + 球阀");
  console.log("  └─ 精密管: 1/4\"OD 316L");
  console.log("  Parker派克 (11项):");
  console.log("  ├─ JIC接头: 37度扩口 #6~#12");
  console.log("  ├─ CPI卡套: 6~10mm");
  console.log("  ├─ Legris快插: 6~8mm");
  console.log("  ├─ 液压软管: 301系列 3/8~1/2\"");
  console.log("  └─ 液压阀: D1VW换向阀");
  console.log("  Victaulic唯特利 (7项):");
  console.log("  ├─ 沟槽卡箍: DN50~DN100");
  console.log("  ├─ 配件: 三通/弯头/异径");
  console.log("  └─ 垫圈: EPDM E型");
  console.log("═══════════════════════════════════════════");
})();
