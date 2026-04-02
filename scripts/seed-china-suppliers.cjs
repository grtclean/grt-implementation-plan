/**
 * GRT 中国供应商对标产品库
 * 3套对标: 国产替代进口 (性价比/交期优势)
 * Run: node scripts/seed-china-suppliers.cjs
 */
const http=require("http"),BASE="http://127.0.0.1:3000";let COOKIE="";
function req(m,p,b){return new Promise((ok,no)=>{const u=new URL(p,BASE),d=b?JSON.stringify(b):null,o={hostname:u.hostname,port:u.port,path:u.pathname+u.search,method:m,headers:{"Content-Type":"application/json",...(COOKIE?{Cookie:COOKIE}:{}),...(d?{"Content-Length":Buffer.byteLength(d,"utf8")}:{})}};const r=http.request(o,res=>{if(res.headers["set-cookie"])COOKIE=res.headers["set-cookie"][0].split(";")[0];let c=[];res.on("data",x=>c.push(x));res.on("end",()=>{try{ok(JSON.parse(Buffer.concat(c).toString("utf8")))}catch{ok(null)}})});r.on("error",no);if(d)r.write(d,"utf8");r.end()})}
async function createBom(code,name,items){const m=await req("POST","/api/trpc/bom.createBomMaster",{json:{productCode:code,productName:name,bomType:"manufacturing",currentVersion:"1.0"}});if(!m?.result)return null;const id=m.result.data.json.id;let n=0;for(const it of items){await req("POST","/api/trpc/bom.addBomItem",{json:{bomMasterId:id,...it}});n++}return{id,count:n}}

(async()=>{
  await req("POST","/api/auth/login",{username:"admin",password:"Gerry123"});
  console.log("Logged in\n");

  // 创建产品
  for(const p of[
    {productCode:"CN-USC08-ECO",productName:"国产替代方案 8工位超声波(经济型)",productFamily:"USC",stationCount:8,lifecycleStatus:"production"},
    {productCode:"CN-HPD500-ECO",productName:"国产替代方案 500bar高压去毛刺(经济型)",productFamily:"HPD",stationCount:2,lifecycleStatus:"production"},
    {productCode:"CN-VDR01-ECO",productName:"国产替代方案 真空干燥(经济型)",productFamily:"VDR",stationCount:1,lifecycleStatus:"production"},
  ]){await req("POST","/api/trpc/pdm.product.create",{json:p})}
  console.log("3个国产替代产品创建完成\n");

  // ═══════════════════════════════════════
  // 套1: 国产超声波清洗机 (对标USC-08-A)
  // ═══════════════════════════════════════
  console.log("【套1】国产超声波清洗机(对标USC-08-A)");
  const bom1=await createBom("CN-USC08-ECO","国产8工位超声波清洗机",[
    {level:1,materialCode:"SYS-CN-TANK-8",materialName:"超声波清洗槽体组件(8槽 国产焊接)",quantity:1,unit:"套",unitCost:55000,sourceType:"manufacture",category:"结构件"},
    {level:1,materialCode:"SYS-CN-TRANS",materialName:"传动系统(国产链条+升降)",quantity:1,unit:"套",unitCost:28000,sourceType:"manufacture",category:"传动"},
    // 电机: 汇川替代西门子
    {level:2,materialCode:"MOT-INOVANCE-MS1-0.75",materialName:"汇川 MS1 三相异步电机 0.75kW B5",quantity:2,unit:"台",unitCost:450,sourceType:"purchase",category:"电机",supplier:"汇川(Inovance)"},
    {level:2,materialCode:"MOT-INOVANCE-MS1-1.5",materialName:"汇川 MS1 三相异步电机 1.5kW B5",quantity:2,unit:"台",unitCost:650,sourceType:"purchase",category:"电机",supplier:"汇川(Inovance)"},
    {level:2,materialCode:"MOT-INOVANCE-MS1-3.0",materialName:"汇川 MS1 三相异步电机 3.0kW B3",quantity:2,unit:"台",unitCost:980,sourceType:"purchase",category:"电机",supplier:"汇川(Inovance)"},
    {level:2,materialCode:"MOT-INOVANCE-MS1-5.5",materialName:"汇川 MS1 三相异步电机 5.5kW B3",quantity:1,unit:"台",unitCost:1500,sourceType:"purchase",category:"电机",supplier:"汇川(Inovance)"},
    // 变频器: 汇川替代施耐德/西门子
    {level:2,materialCode:"VFD-INOVANCE-MD500-5K5",materialName:"汇川 MD500 变频器 5.5kW",quantity:2,unit:"台",unitCost:1800,sourceType:"purchase",category:"变频器",supplier:"汇川(Inovance)"},
    {level:2,materialCode:"VFD-INOVANCE-MD500-7K5",materialName:"汇川 MD500 变频器 7.5kW",quantity:2,unit:"台",unitCost:2200,sourceType:"purchase",category:"变频器",supplier:"汇川(Inovance)"},
    // 伺服: 汇川
    {level:2,materialCode:"SERVO-INOVANCE-IS620N-400",materialName:"汇川 IS620N 伺服驱动器+电机 400W",quantity:2,unit:"套",unitCost:1500,sourceType:"purchase",category:"伺服",supplier:"汇川(Inovance)"},
    // 水泵: 南方替代格兰富
    {level:2,materialCode:"PUMP-CNP-CDL8-8",materialName:"南方 CDL8-8 立式多级离心泵",quantity:2,unit:"台",unitCost:2800,sourceType:"purchase",category:"水泵",supplier:"南方泵业(CNP)"},
    {level:2,materialCode:"PUMP-CNP-CDL4-5",materialName:"南方 CDL4-5 轻型多级泵",quantity:4,unit:"台",unitCost:1500,sourceType:"purchase",category:"水泵",supplier:"南方泵业(CNP)"},
    {level:2,materialCode:"PUMP-NY-50QW-15",materialName:"南元 50QW-15 潜水排污泵",quantity:1,unit:"台",unitCost:980,sourceType:"purchase",category:"水泵",supplier:"南元泵业"},
    {level:2,materialCode:"PUMP-KAIQUAN-KQL-50",materialName:"凯泉 KQL50-125 卧式离心泵",quantity:2,unit:"台",unitCost:2200,sourceType:"purchase",category:"水泵",supplier:"凯泉(KAIQUAN)"},
    // PLC: 汇川/信捷替代西门子
    {level:2,materialCode:"PLC-INOVANCE-AM600",materialName:"汇川 AM600 中型PLC(替代S7-1500)",quantity:1,unit:"台",unitCost:5800,sourceType:"purchase",category:"PLC",supplier:"汇川(Inovance)"},
    {level:2,materialCode:"PLC-INOVANCE-IO-DI16",materialName:"汇川 GL20 DI16 数字量输入模块",quantity:2,unit:"块",unitCost:680,sourceType:"purchase",category:"PLC",supplier:"汇川(Inovance)"},
    {level:2,materialCode:"PLC-INOVANCE-IO-DO16",materialName:"汇川 GL20 DO16 数字量输出模块",quantity:2,unit:"块",unitCost:780,sourceType:"purchase",category:"PLC",supplier:"汇川(Inovance)"},
    {level:2,materialCode:"HMI-INOVANCE-IT7100",materialName:"汇川 IT7100 触摸屏 10寸",quantity:1,unit:"台",unitCost:2800,sourceType:"purchase",category:"HMI",supplier:"汇川(Inovance)"},
    {level:2,materialCode:"PLC-XINJE-XD5-32T",materialName:"信捷 XD5 PLC 32点(经济型备选)",quantity:1,unit:"台",unitCost:1200,sourceType:"purchase",category:"PLC",supplier:"信捷(XINJE)"},
    // 低压电气: 正泰/德力西替代施耐德
    {level:2,materialCode:"CB-CHINT-NM8-250",materialName:"正泰 NM8 塑壳断路器 250A 3P",quantity:1,unit:"台",unitCost:580,sourceType:"purchase",category:"低压电气",supplier:"正泰(CHINT)"},
    {level:2,materialCode:"CB-CHINT-NXB-32",materialName:"正泰 NXB 微型断路器 C32A",quantity:12,unit:"台",unitCost:18,sourceType:"purchase",category:"低压电气",supplier:"正泰(CHINT)"},
    {level:2,materialCode:"MC-CHINT-CJX2-25",materialName:"正泰 CJX2-25 交流接触器 25A",quantity:8,unit:"台",unitCost:35,sourceType:"purchase",category:"低压电气",supplier:"正泰(CHINT)"},
    {level:2,materialCode:"MC-DELIXI-CJX2-18",materialName:"德力西 CJX2-18 交流接触器 18A",quantity:4,unit:"台",unitCost:28,sourceType:"purchase",category:"低压电气",supplier:"德力西(DELIXI)"},
    {level:2,materialCode:"RLY-CHINT-JZX-22F",materialName:"正泰 JZX-22F 中间继电器",quantity:16,unit:"只",unitCost:12,sourceType:"purchase",category:"低压电气",supplier:"正泰(CHINT)"},
    // 超声波: 国产
    {level:2,materialCode:"USG-KEYUAN-28K-3KW",materialName:"科源 超声波发生器 28kHz/3kW",quantity:4,unit:"台",unitCost:4500,sourceType:"purchase",category:"超声波",supplier:"济南科源超声"},
    {level:2,materialCode:"USG-KEYUAN-40K-2KW",materialName:"科源 超声波发生器 40kHz/2kW",quantity:4,unit:"台",unitCost:3800,sourceType:"purchase",category:"超声波",supplier:"济南科源超声"},
    {level:2,materialCode:"UST-CN-28K-PLATE",materialName:"国产超声波振板 28kHz(600x400)",quantity:8,unit:"片",unitCost:1200,sourceType:"purchase",category:"超声波"},
    // 传感器: 国产替代
    {level:2,materialCode:"SNS-MEOKON-MD-S270",materialName:"铭控 MD-S270 压力传感器 0-10bar",quantity:4,unit:"只",unitCost:180,sourceType:"purchase",category:"传感器",supplier:"铭控(MEOKON)"},
    {level:2,materialCode:"SNS-MEOKON-MD-S560",materialName:"铭控 MD-S560 温度传感器 Pt100",quantity:8,unit:"只",unitCost:120,sourceType:"purchase",category:"传感器",supplier:"铭控(MEOKON)"},
    {level:2,materialCode:"SNS-RJCN-LVL-80",materialName:"瑞佳辰 液位传感器(电容式)",quantity:8,unit:"只",unitCost:150,sourceType:"purchase",category:"传感器",supplier:"瑞佳辰"},
    // 气动: 亚德客替代SMC
    {level:2,materialCode:"CYL-AIRTAC-SC50X200",materialName:"亚德客 SC50x200 标准气缸",quantity:4,unit:"只",unitCost:95,sourceType:"purchase",category:"气缸",supplier:"AirTAC亚德客"},
    {level:2,materialCode:"VLV-AIRTAC-4V210-08",materialName:"亚德客 4V210-08 电磁阀 1/4",quantity:8,unit:"只",unitCost:45,sourceType:"purchase",category:"电磁阀",supplier:"AirTAC亚德客"},
    {level:2,materialCode:"FRL-AIRTAC-GFC300",materialName:"亚德客 GFC300 气源三联件",quantity:1,unit:"套",unitCost:65,sourceType:"purchase",category:"气源处理",supplier:"AirTAC亚德客"},
    // 减速机: 中大替代SEW
    {level:2,materialCode:"GBX-ZD-ZDE-1.5",materialName:"中大 ZDE 斜齿轮减速机 1.5kW i=28",quantity:2,unit:"台",unitCost:1200,sourceType:"purchase",category:"减速机",supplier:"中大(ZD)"},
    // 管道连接: 国产
    {level:2,materialCode:"FIT-CN-BALL-DN25-304",materialName:"国标不锈钢球阀 DN25 304",quantity:6,unit:"只",unitCost:35,sourceType:"purchase",category:"阀门"},
    {level:2,materialCode:"FIT-CN-BALL-DN40-304",materialName:"国标不锈钢球阀 DN40 304",quantity:4,unit:"只",unitCost:55,sourceType:"purchase",category:"阀门"},
    {level:2,materialCode:"PIPE-CN-SUS304-DN25",materialName:"国标SUS304不锈钢管 DN25x2(6m)",quantity:6,unit:"根",unitCost:180,sourceType:"purchase",category:"管件"},
    // 加热: 国产
    {level:2,materialCode:"HTR-CN-SUS-6KW",materialName:"国产不锈钢加热管 6kW/380V",quantity:8,unit:"根",unitCost:120,sourceType:"purchase",category:"加热"},
  ]);
  if(bom1)console.log(`  BOM #${bom1.id}: ${bom1.count} 项`);

  // ═══════════════════════════════════════
  // 套2: 国产高压去毛刺(对标HPD-500-A)
  // ═══════════════════════════════════════
  console.log("【套2】国产高压去毛刺(对标HPD-500-A)");
  const bom2=await createBom("CN-HPD500-ECO","国产500bar高压去毛刺",[
    {level:1,materialCode:"CN-HPD-CHAMBER",materialName:"高压清洗腔体(国产焊接)",quantity:1,unit:"套",unitCost:25000,sourceType:"manufacture",category:"结构件"},
    {level:2,materialCode:"PUMP-WUXI-HP500",materialName:"无锡沃达 高压柱塞泵 500bar/25L",quantity:1,unit:"台",unitCost:22000,sourceType:"purchase",category:"高压泵",supplier:"无锡沃达"},
    {level:2,materialCode:"PUMP-DANAI-HP500",materialName:"丹耐 高压柱塞泵 500bar/20L(备选)",quantity:1,unit:"台",unitCost:18000,sourceType:"purchase",category:"高压泵",supplier:"丹耐尔(DANAI)"},
    {level:2,materialCode:"PLC-INOVANCE-H5U-1614",materialName:"汇川 H5U 小型PLC 16入14出",quantity:1,unit:"台",unitCost:2800,sourceType:"purchase",category:"PLC",supplier:"汇川(Inovance)"},
    {level:2,materialCode:"HMI-WEINVIEW-MT8102IE",materialName:"威纶通 MT8102iE 触摸屏 10寸",quantity:1,unit:"台",unitCost:1800,sourceType:"purchase",category:"HMI",supplier:"威纶通(WEINVIEW)"},
    {level:2,materialCode:"VFD-INOVANCE-MD290-22K",materialName:"汇川 MD290 变频器 22kW",quantity:1,unit:"台",unitCost:4500,sourceType:"purchase",category:"变频器",supplier:"汇川(Inovance)"},
    {level:2,materialCode:"CB-CHINT-NM8-400",materialName:"正泰 NM8 塑壳断路器 400A",quantity:1,unit:"台",unitCost:850,sourceType:"purchase",category:"低压电气",supplier:"正泰(CHINT)"},
    {level:2,materialCode:"NZL-CN-HP-1.0MM",materialName:"国产高压喷嘴 1.0mm(硬质合金)",quantity:6,unit:"只",unitCost:180,sourceType:"purchase",category:"喷嘴"},
    {level:2,materialCode:"FILTER-XINXIANG-HP",materialName:"新乡德蒙 高压过滤器 10μm",quantity:2,unit:"只",unitCost:850,sourceType:"purchase",category:"过滤",supplier:"新乡德蒙"},
    {level:2,materialCode:"SAFE-KEYENCE-GL-S",materialName:"基恩士 GL-S 安全光幕(国产同等)",quantity:2,unit:"套",unitCost:1200,sourceType:"purchase",category:"安全"},
  ]);
  if(bom2)console.log(`  BOM #${bom2.id}: ${bom2.count} 项`);

  // ═══════════════════════════════════════
  // 套3: 国产真空干燥(对标VDR-01-A)
  // ═══════════════════════════════════════
  console.log("【套3】国产真空干燥(对标VDR-01-A)");
  const bom3=await createBom("CN-VDR01-ECO","国产真空干燥单元",[
    {level:1,materialCode:"CN-VDR-CHAMBER",materialName:"真空干燥腔体(国产焊接)",quantity:1,unit:"套",unitCost:22000,sourceType:"manufacture",category:"结构件"},
    {level:2,materialCode:"VAC-EVP-SV063",materialName:"爱发科 SV063 旋片真空泵",quantity:1,unit:"台",unitCost:8500,sourceType:"purchase",category:"真空泵",supplier:"爱发科(EVP)"},
    {level:2,materialCode:"VAC-HANBELL-PD150",materialName:"汉钟 PD150 干式螺杆真空泵(备选)",quantity:1,unit:"台",unitCost:15000,sourceType:"purchase",category:"真空泵",supplier:"汉钟(HANBELL)"},
    {level:2,materialCode:"VAC-CN-GAUGE-ZJ54",materialName:"成都正华 ZJ-54 热偶真空计",quantity:2,unit:"只",unitCost:650,sourceType:"purchase",category:"真空计",supplier:"成都正华"},
    {level:2,materialCode:"PLC-INOVANCE-H3U-1616",materialName:"汇川 H3U 经济型PLC 16入16出",quantity:1,unit:"台",unitCost:1200,sourceType:"purchase",category:"PLC",supplier:"汇川(Inovance)"},
    {level:2,materialCode:"HMI-INOVANCE-IT5070E",materialName:"汇川 IT5070E 触摸屏 7寸",quantity:1,unit:"台",unitCost:1500,sourceType:"purchase",category:"HMI",supplier:"汇川(Inovance)"},
    {level:2,materialCode:"VFD-INOVANCE-MD290-5K5",materialName:"汇川 MD290 变频器 5.5kW",quantity:1,unit:"台",unitCost:1500,sourceType:"purchase",category:"变频器",supplier:"汇川(Inovance)"},
    {level:2,materialCode:"CB-DELIXI-DZ47-63",materialName:"德力西 DZ47 微断套件(6只)",quantity:1,unit:"套",unitCost:85,sourceType:"purchase",category:"低压电气",supplier:"德力西(DELIXI)"},
    {level:2,materialCode:"SEAL-CN-VITON-350",materialName:"国产氟胶O型圈 350x5.7",quantity:4,unit:"只",unitCost:25,sourceType:"purchase",category:"密封件"},
    {level:2,materialCode:"HTR-CN-IR-3KW",materialName:"国产红外加热管 3kW(替代贺利氏)",quantity:4,unit:"只",unitCost:450,sourceType:"purchase",category:"加热"},
    {level:2,materialCode:"VLV-CN-VAC-DN100",materialName:"国产真空蝶阀 DN100 手/气动",quantity:1,unit:"只",unitCost:1200,sourceType:"purchase",category:"真空阀"},
  ]);
  if(bom3)console.log(`  BOM #${bom3.id}: ${bom3.count} 项`);

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  中国供应商替代方案导入完成");
  console.log("═══════════════════════════════════════════════════");
  console.log("  进口→国产对标:");
  console.log("  ┌──────────────┬────────────────────┬──────────────────┬───────┐");
  console.log("  │ 品类         │ 进口品牌           │ 国产替代         │ 降幅  │");
  console.log("  ├──────────────┼────────────────────┼──────────────────┼───────┤");
  console.log("  │ 电机         │ 西门子 1LE0        │ 汇川 MS1         │ ~50%  │");
  console.log("  │ 变频器       │ 施耐德ATV/西门子G120│ 汇川 MD500/MD290 │ ~45%  │");
  console.log("  │ 伺服         │ 安川/三菱          │ 汇川 IS620N      │ ~40%  │");
  console.log("  │ PLC          │ 西门子 S7-1500     │ 汇川 AM600       │ ~65%  │");
  console.log("  │ HMI          │ 西门子 TP1500      │ 汇川 IT7100      │ ~70%  │");
  console.log("  │ 水泵         │ 格兰富 CR/CRN      │ 南方 CDL/凯泉KQL │ ~55%  │");
  console.log("  │ 真空泵       │ 莱宝/普旭          │ 爱发科/汉钟      │ ~45%  │");
  console.log("  │ 高压泵       │ KAMAT/Hauhinco     │ 无锡沃达/丹耐尔  │ ~60%  │");
  console.log("  │ 低压电气     │ 施耐德/西门子      │ 正泰/德力西      │ ~75%  │");
  console.log("  │ 气动         │ SMC/Festo          │ 亚德客 AirTAC    │ ~60%  │");
  console.log("  │ 减速机       │ SEW/NORD           │ 中大 ZD          │ ~55%  │");
  console.log("  │ 传感器       │ IFM/E+H            │ 铭控/瑞佳辰      │ ~70%  │");
  console.log("  │ 超声波       │ Weber Ultrasonics  │ 科源超声         │ ~50%  │");
  console.log("  └──────────────┴────────────────────┴──────────────────┴───────┘");
  console.log("═══════════════════════════════════════════════════");
})();
