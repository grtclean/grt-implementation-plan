/**
 * GRT 紧固件标准库 — 螺栓/螺母/垫片/销钉/卡簧
 * DIN/ISO标准 + 不锈钢(SUS304/316)
 * Run: node scripts/seed-fasteners.cjs
 */
const http = require("http");
const BASE = "http://127.0.0.1:3000";
let COOKIE = "";
function req(m,p,b){return new Promise((ok,no)=>{const u=new URL(p,BASE);const d=b?JSON.stringify(b):null;const o={hostname:u.hostname,port:u.port,path:u.pathname+u.search,method:m,headers:{"Content-Type":"application/json",...(COOKIE?{Cookie:COOKIE}:{}),...(d?{"Content-Length":Buffer.byteLength(d,"utf8")}:{})}};const r=http.request(o,res=>{if(res.headers["set-cookie"])COOKIE=res.headers["set-cookie"][0].split(";")[0];let c=[];res.on("data",x=>c.push(x));res.on("end",()=>{try{ok(JSON.parse(Buffer.concat(c).toString("utf8")))}catch{ok(null)}})});r.on("error",no);if(d)r.write(d,"utf8");r.end()})}

(async()=>{
  await req("POST","/api/auth/login",{username:"admin",password:"Gerry123"});
  const bomId = 48;
  const items = [
    // ══ 内六角螺栓 DIN912 (SUS304) ══
    { level:1, materialCode:"BOLT-DIN912-M4X12-304", materialName:"内六角螺栓 DIN912 M4x12 SUS304", quantity:100, unit:"只", unitCost:0.15, sourceType:"purchase", category:"螺栓-内六角" },
    { level:1, materialCode:"BOLT-DIN912-M5X16-304", materialName:"内六角螺栓 DIN912 M5x16 SUS304", quantity:100, unit:"只", unitCost:0.2, sourceType:"purchase", category:"螺栓-内六角" },
    { level:1, materialCode:"BOLT-DIN912-M6X20-304", materialName:"内六角螺栓 DIN912 M6x20 SUS304", quantity:100, unit:"只", unitCost:0.25, sourceType:"purchase", category:"螺栓-内六角" },
    { level:1, materialCode:"BOLT-DIN912-M6X30-304", materialName:"内六角螺栓 DIN912 M6x30 SUS304", quantity:100, unit:"只", unitCost:0.3, sourceType:"purchase", category:"螺栓-内六角" },
    { level:1, materialCode:"BOLT-DIN912-M8X25-304", materialName:"内六角螺栓 DIN912 M8x25 SUS304", quantity:100, unit:"只", unitCost:0.45, sourceType:"purchase", category:"螺栓-内六角" },
    { level:1, materialCode:"BOLT-DIN912-M8X40-304", materialName:"内六角螺栓 DIN912 M8x40 SUS304", quantity:100, unit:"只", unitCost:0.55, sourceType:"purchase", category:"螺栓-内六角" },
    { level:1, materialCode:"BOLT-DIN912-M10X30-304", materialName:"内六角螺栓 DIN912 M10x30 SUS304", quantity:50, unit:"只", unitCost:0.8, sourceType:"purchase", category:"螺栓-内六角" },
    { level:1, materialCode:"BOLT-DIN912-M10X50-304", materialName:"内六角螺栓 DIN912 M10x50 SUS304", quantity:50, unit:"只", unitCost:1.0, sourceType:"purchase", category:"螺栓-内六角" },
    { level:1, materialCode:"BOLT-DIN912-M12X40-304", materialName:"内六角螺栓 DIN912 M12x40 SUS304", quantity:50, unit:"只", unitCost:1.2, sourceType:"purchase", category:"螺栓-内六角" },
    // ══ 外六角螺栓 DIN933 ══
    { level:1, materialCode:"BOLT-DIN933-M8X25-88", materialName:"外六角螺栓 DIN933 M8x25 8.8级", quantity:100, unit:"只", unitCost:0.25, sourceType:"purchase", category:"螺栓-外六角" },
    { level:1, materialCode:"BOLT-DIN933-M10X30-88", materialName:"外六角螺栓 DIN933 M10x30 8.8级", quantity:100, unit:"只", unitCost:0.4, sourceType:"purchase", category:"螺栓-外六角" },
    { level:1, materialCode:"BOLT-DIN933-M12X40-88", materialName:"外六角螺栓 DIN933 M12x40 8.8级", quantity:50, unit:"只", unitCost:0.65, sourceType:"purchase", category:"螺栓-外六角" },
    { level:1, materialCode:"BOLT-DIN933-M16X50-88", materialName:"外六角螺栓 DIN933 M16x50 8.8级", quantity:50, unit:"只", unitCost:1.2, sourceType:"purchase", category:"螺栓-外六角" },
    // ══ 六角螺母 DIN934 ══
    { level:1, materialCode:"NUT-DIN934-M4-304", materialName:"六角螺母 DIN934 M4 SUS304", quantity:100, unit:"只", unitCost:0.05, sourceType:"purchase", category:"螺母" },
    { level:1, materialCode:"NUT-DIN934-M5-304", materialName:"六角螺母 DIN934 M5 SUS304", quantity:100, unit:"只", unitCost:0.06, sourceType:"purchase", category:"螺母" },
    { level:1, materialCode:"NUT-DIN934-M6-304", materialName:"六角螺母 DIN934 M6 SUS304", quantity:100, unit:"只", unitCost:0.08, sourceType:"purchase", category:"螺母" },
    { level:1, materialCode:"NUT-DIN934-M8-304", materialName:"六角螺母 DIN934 M8 SUS304", quantity:100, unit:"只", unitCost:0.12, sourceType:"purchase", category:"螺母" },
    { level:1, materialCode:"NUT-DIN934-M10-304", materialName:"六角螺母 DIN934 M10 SUS304", quantity:100, unit:"只", unitCost:0.18, sourceType:"purchase", category:"螺母" },
    { level:1, materialCode:"NUT-DIN934-M12-304", materialName:"六角螺母 DIN934 M12 SUS304", quantity:50, unit:"只", unitCost:0.25, sourceType:"purchase", category:"螺母" },
    { level:1, materialCode:"NUT-DIN985-M8-304", materialName:"尼龙锁紧螺母 DIN985 M8 SUS304", quantity:100, unit:"只", unitCost:0.2, sourceType:"purchase", category:"螺母-锁紧" },
    { level:1, materialCode:"NUT-DIN985-M10-304", materialName:"尼龙锁紧螺母 DIN985 M10 SUS304", quantity:100, unit:"只", unitCost:0.3, sourceType:"purchase", category:"螺母-锁紧" },
    { level:1, materialCode:"NUT-FLANGE-M8-304", materialName:"法兰螺母 M8 SUS304(带齿)", quantity:100, unit:"只", unitCost:0.2, sourceType:"purchase", category:"螺母-法兰" },
    // ══ 平垫/弹垫 ══
    { level:1, materialCode:"WASH-DIN125-M6-304", materialName:"平垫圈 DIN125 M6 SUS304", quantity:200, unit:"只", unitCost:0.02, sourceType:"purchase", category:"垫圈-平垫" },
    { level:1, materialCode:"WASH-DIN125-M8-304", materialName:"平垫圈 DIN125 M8 SUS304", quantity:200, unit:"只", unitCost:0.03, sourceType:"purchase", category:"垫圈-平垫" },
    { level:1, materialCode:"WASH-DIN125-M10-304", materialName:"平垫圈 DIN125 M10 SUS304", quantity:200, unit:"只", unitCost:0.04, sourceType:"purchase", category:"垫圈-平垫" },
    { level:1, materialCode:"WASH-DIN125-M12-304", materialName:"平垫圈 DIN125 M12 SUS304", quantity:100, unit:"只", unitCost:0.05, sourceType:"purchase", category:"垫圈-平垫" },
    { level:1, materialCode:"WASH-DIN127-M6-304", materialName:"弹簧垫圈 DIN127 M6 SUS304", quantity:200, unit:"只", unitCost:0.03, sourceType:"purchase", category:"垫圈-弹垫" },
    { level:1, materialCode:"WASH-DIN127-M8-304", materialName:"弹簧垫圈 DIN127 M8 SUS304", quantity:200, unit:"只", unitCost:0.04, sourceType:"purchase", category:"垫圈-弹垫" },
    { level:1, materialCode:"WASH-DIN127-M10-304", materialName:"弹簧垫圈 DIN127 M10 SUS304", quantity:200, unit:"只", unitCost:0.05, sourceType:"purchase", category:"垫圈-弹垫" },
    // ══ 沉头螺钉 ══
    { level:1, materialCode:"BOLT-DIN7991-M4X12-304", materialName:"沉头内六角螺钉 DIN7991 M4x12 SUS304", quantity:100, unit:"只", unitCost:0.18, sourceType:"purchase", category:"螺钉-沉头" },
    { level:1, materialCode:"BOLT-DIN7991-M5X16-304", materialName:"沉头内六角螺钉 DIN7991 M5x16 SUS304", quantity:100, unit:"只", unitCost:0.22, sourceType:"purchase", category:"螺钉-沉头" },
    { level:1, materialCode:"BOLT-DIN7991-M6X20-304", materialName:"沉头内六角螺钉 DIN7991 M6x20 SUS304", quantity:100, unit:"只", unitCost:0.28, sourceType:"purchase", category:"螺钉-沉头" },
    // ══ 紧定螺钉/机米螺丝 ══
    { level:1, materialCode:"SETSCREW-DIN916-M6X8", materialName:"紧定螺钉 DIN916 M6x8 (内六角平端)", quantity:50, unit:"只", unitCost:0.1, sourceType:"purchase", category:"紧定螺钉" },
    { level:1, materialCode:"SETSCREW-DIN916-M8X10", materialName:"紧定螺钉 DIN916 M8x10 (内六角平端)", quantity:50, unit:"只", unitCost:0.15, sourceType:"purchase", category:"紧定螺钉" },
    // ══ 销钉/卡簧 ══
    { level:1, materialCode:"PIN-DIN7-6X30", materialName:"圆柱销 DIN7 6x30 SUS304", quantity:50, unit:"只", unitCost:0.3, sourceType:"purchase", category:"销钉" },
    { level:1, materialCode:"PIN-DIN7-8X40", materialName:"圆柱销 DIN7 8x40 SUS304", quantity:50, unit:"只", unitCost:0.5, sourceType:"purchase", category:"销钉" },
    { level:1, materialCode:"PIN-DIN7-10X50", materialName:"圆柱销 DIN7 10x50 SUS304", quantity:50, unit:"只", unitCost:0.8, sourceType:"purchase", category:"销钉" },
    { level:1, materialCode:"PIN-SPLIT-3X30", materialName:"开口销 3x30 SUS304", quantity:50, unit:"只", unitCost:0.08, sourceType:"purchase", category:"销钉" },
    { level:1, materialCode:"CLIP-DIN471-15", materialName:"轴用卡簧 DIN471 15mm", quantity:50, unit:"只", unitCost:0.12, sourceType:"purchase", category:"卡簧" },
    { level:1, materialCode:"CLIP-DIN471-20", materialName:"轴用卡簧 DIN471 20mm", quantity:50, unit:"只", unitCost:0.15, sourceType:"purchase", category:"卡簧" },
    { level:1, materialCode:"CLIP-DIN472-25", materialName:"孔用卡簧 DIN472 25mm", quantity:50, unit:"只", unitCost:0.18, sourceType:"purchase", category:"卡簧" },
    // ══ 自攻螺钉 ══
    { level:1, materialCode:"SCREW-ST4X16-304", materialName:"十字盘头自攻螺钉 ST4.2x16 SUS304", quantity:200, unit:"只", unitCost:0.05, sourceType:"purchase", category:"自攻螺钉" },
    { level:1, materialCode:"SCREW-ST5X25-304", materialName:"十字盘头自攻螺钉 ST4.8x25 SUS304", quantity:200, unit:"只", unitCost:0.08, sourceType:"purchase", category:"自攻螺钉" },
    // ══ T型螺栓(铝型材用) ══
    { level:1, materialCode:"BOLT-T-M6X20-8", materialName:"T型螺栓 M6x20 (40系列铝型材)", quantity:100, unit:"只", unitCost:0.35, sourceType:"purchase", category:"铝型材配件" },
    { level:1, materialCode:"BOLT-T-M8X25-8", materialName:"T型螺栓 M8x25 (40系列铝型材)", quantity:100, unit:"只", unitCost:0.45, sourceType:"purchase", category:"铝型材配件" },
    { level:1, materialCode:"NUT-T-M6-40", materialName:"T型螺母 M6 (40系列铝型材滑块)", quantity:100, unit:"只", unitCost:0.2, sourceType:"purchase", category:"铝型材配件" },
    { level:1, materialCode:"BRACKET-90-4040", materialName:"铝型材角件 90度 4040", quantity:50, unit:"只", unitCost:1.5, sourceType:"purchase", category:"铝型材配件" },
  ];

  let n=0;
  for(const it of items){await req("POST","/api/trpc/bom.addBomItem",{json:{bomMasterId:bomId,...it}});n++;process.stdout.write(".")}
  console.log(`\n紧固件: ${n} 项导入完成`);
  console.log("├─ 内六角螺栓 DIN912: M4-M12 SUS304 (9规格)");
  console.log("├─ 外六角螺栓 DIN933: M8-M16 8.8级 (4规格)");
  console.log("├─ 沉头螺钉 DIN7991: M4-M6 SUS304 (3规格)");
  console.log("├─ 六角螺母 DIN934: M4-M12 SUS304 (6规格)");
  console.log("├─ 锁紧螺母 DIN985: M8-M10 (2规格)");
  console.log("├─ 法兰螺母: M8 (1规格)");
  console.log("├─ 平垫圈 DIN125: M6-M12 (4规格)");
  console.log("├─ 弹簧垫圈 DIN127: M6-M10 (3规格)");
  console.log("├─ 紧定螺钉 DIN916: M6-M8 (2规格)");
  console.log("├─ 圆柱销 DIN7: 6-10mm (3规格)");
  console.log("├─ 卡簧 DIN471/472: 15-25mm (3规格)");
  console.log("├─ 自攻螺钉: ST4-5 SUS304 (2规格)");
  console.log("└─ 铝型材配件: T型螺栓/螺母/角件 (4规格)");
})();
