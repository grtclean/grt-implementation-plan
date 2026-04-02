/**
 * Seed annual goal agreements for ALL GRT employees
 * Uses the real roster from seed-real-users.ts + position templates
 */
const pg = require("pg");
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:Gerry123456@localhost:5432/grt_system";

// Complete roster: [code, name, pinyin, department, position, rbacRole, isAdmin]
const ROSTER = [
  ["GRT001","倪亚东","niyadong","总裁办","董事长","ceo",true],
  ["GRT080","刘奥运","liuaoyun","AI数智部","董事长助理","vp",true],
  ["GRT105","倪微薇","niweiwei","AI数智部","AI数智&人事行政部经理","vp",true],
  ["GRT049","胡杨","huyang","AI数智部","IT工程师","engineer",false],
  ["GRT083","刘坤","liukun","AI数智部","市场主管","sales_rep",false],
  ["GRT103","朱文韬","zhuwentao","AI数智部","市场专员","sales_rep",false],
  ["GRT002","黄晓兰","huangxiaolan","财务部","出纳/银行账户执行","finance_specialist",false],
  ["GRT054","王秀萍","wangxiuping","财务部","总账会计/财务复核","finance_manager",false],
  ["GRT101","王汝月","wangruyue","财务部","财务专员/报销初审","finance_specialist",false],
  ["GRT066","李新正","lixinzheng","财务部","仓库管理员","floor_operator",false],
  ["GRT079_2","马鹏风","mapengfeng2","财务部","供应链工程师","engineer",false],
  ["GRT081","马康风","makangfeng","财务部","供应链助理工程师","engineer",false],
  ["GRT067","沙建梅","shajianmei","人事行政部","人事行政主管","hr_director",true],
  ["GRT053","段天珠","duantianzhu","人事行政部","前法","engineer",false],
  ["GRT100","田炜钰","tianweiyu","人事行政部","行政前台","floor_operator",false],
  ["GRT095","王爱云","wangaiyun","人事行政部","后勤助理","floor_operator",false],
  ["GRT004","戴晓燕","daixiaoyan","事业一部","高级销售经理","sales_director",true],
  ["GRT005","金晓锋","jinxiaofeng","事业一部","制造质量经理","qc_manager",true],
  ["GRT022","李大鹏","lidapeng","事业一部","电气工程师","engineer",false],
  ["GRT063","刘健康","liujiankang","事业一部","销售与项目工程师","sales_rep",false],
  ["GRT020","张洵","zhangxun","事业一部","采购与项目工程师","engineer",false],
  ["GRT057","滕顺英","tengshunying","事业一部","采购与项目工程师","engineer",false],
  ["GRT035","王志强","wangzhiqiang","事业一部","销售与项目工程师","sales_rep",false],
  ["GRT104","董纾雨","dongshuyu","事业一部","销售与项目工程师","sales_rep",false],
  ["GRT030","匡凯旋","kuangkaixuan","事业一部","售后服务主管","production_supervisor",true],
  ["GRT014","廉龙海","lianlonghai","事业一部","售后技工","engineer",false],
  ["GRT028","朱明华","zhuminghua","事业一部","售后技工","engineer",false],
  ["GRT040","曾春贵","zengchungui","事业一部","售后技工","engineer",false],
  ["GRT015","杜显文","duxianwen","事业一部","电气班组副班长","production_supervisor",false],
  ["GRT046","吕雪冬","lvxuedong","事业一部","电气班组班长","production_supervisor",false],
  ["GRT087","梅奥杰","meiaojie","事业一部","助理电气工程师","engineer",false],
  ["GRT088","高嘉义","gaojiayi","事业一部","助理电气工程师","engineer",false],
  ["GRT090","陈加丽","chenjiali","事业一部","助理机械研发工程师","engineer",false],
  ["GRT010","吴卫成","wuweicheng","事业一部","机械装配","floor_operator",false],
  ["GRT016","曹庆伟","caoqingwei","事业一部","机械装配","floor_operator",false],
  ["GRT039","侯德朋","houdepeng","事业一部","机械装配","floor_operator",false],
  ["GRT041","张良","zhangliang","事业一部","机械装配","floor_operator",false],
  ["GRT052","赵强","zhaoqiang","事业一部","机械装配","floor_operator",false],
  ["GRT059","焦斌","jiaobin","事业一部","机械装配","floor_operator",false],
  ["GRT079","阎建华","yanjianhua","事业一部","机械装配","floor_operator",false],
  ["GRT031","沈龙翔","shenlongxiang","事业一部","电气装配","floor_operator",false],
  ["GRT036","韩品来","hanpinlai","事业一部","电气装配","floor_operator",false],
  ["GRT051","崔聪聪","cuicongcong","事业一部","电气装配","floor_operator",false],
  ["GRT071","刘琛杨","liuchenyang","事业一部","电气装配","floor_operator",false],
  ["GRT072","赵铖杰","zhaochengjie","事业一部","电气装配","floor_operator",false],
  ["GRT017","田坪珍","tianpingzhen","事业一部","焊工","floor_operator",false],
  ["GRT082","沈富高","shenfugao","事业一部","焊工","floor_operator",false],
  ["GRT064","强兵兵","qiangbingbing","事业一部","激光切割","floor_operator",false],
  ["GRT061","李明遂","limingsui","事业一部","数控车工","floor_operator",false],
  ["GRT047","嵇国华","jiguohua","事业一部","协作辅助","floor_operator",false],
  ["GRT093","李柯瑶","likeyao","事业一部","销售与项目工程师","sales_rep",false],
  ["GRT094","徐树奎","xushukui","事业二部","事业二部经理","director",true],
  ["GRT006","洪香龙","hongxianglong","事业二部","机械设计经理","production_supervisor",true],
  ["GRT062","朱宇浩","zhuyuhao","事业二部","生产工程师兼项目及IT工程师","engineer",true],
  ["GRT044","洪小东","hongxiaodong","事业二部","机械研发工程师","engineer",false],
  ["GRT097","钱佳奇","qianjiaqi","事业二部","电气工程师","engineer",false],
  ["GRT065","蔡瑞","cairui","事业二部","机械研发工程师","engineer",false],
  ["GRT099","殷金刚","yinjingang","事业二部","机械研发工程师","engineer",false],
  ["GRT038","马林山","malinshan","事业二部","装配班组长","production_supervisor",false],
  ["GRT074","王金涛","wangjintao","事业二部","机械装配","floor_operator",false],
  ["GRT058","周辉","zhouhui","事业三部","事业三部经理","director",true],
  ["GRT007","孙坚","sunjian","事业三部","电气主管","production_supervisor",true],
  ["GRT055","沈迎凤","shenyingfeng","事业三部","采购经理","project_manager",true],
  ["GRT003","倪亚琴","niyaqin","事业三部","采购与项目工程师","engineer",false],
  ["GRT019","冯艳","fengyan","事业三部","销售与项目工程师","sales_rep",false],
  ["GRT043","韩保程","hanbaocheng","事业三部","销售与项目工程师","sales_rep",false],
  ["GRT045","杨勇","yangyong","事业三部","生产工程师兼项目经理","project_manager",true],
  ["GRT089","罗小玲","luoxiaoling","事业三部","助理机械研发工程师","engineer",false],
  ["GRT013","孙淼","sunmiao","事业三部","机械装配","floor_operator",false],
  ["GRT021","张松松","zhangsongsong","事业三部","机械装配","floor_operator",false],
  ["GRT025","肖博雅","xiaoboya","事业三部","机械装配","floor_operator",false],
  ["GRT032","王犇","wangben","事业三部","机械装配","floor_operator",false],
  ["GRT034","王勇","wangyong","事业三部","机械装配","floor_operator",false],
  ["GRT042","刘建年","liujiannian","事业三部","机械装配","floor_operator",false],
  ["GRT050","蕾翠林","leicuilin","事业三部","机械装配","floor_operator",false],
  ["GRT060","杨会龙","yanghuilong","事业三部","机械装配","floor_operator",false],
  ["GRT075","胡绍杰","hushaojie","事业三部","机械装配","floor_operator",false],
  ["GRT076","王森","wangsen","事业三部","机械装配","floor_operator",false],
  ["GRT077","吴阳洋","wuyangyang","事业三部","机械装配","floor_operator",false],
  ["GRT084","蒋秋瑞","jiangqiurui","事业三部","机械装配","floor_operator",false],
  ["GRT023","杨之雲","yangzhiyun","事业三部","电气装配","floor_operator",false],
  ["GRT029","殷小勇","yinxiaoyong","事业三部","电气装配","floor_operator",false],
  ["GRT056","陈成成","chenchengcheng","事业三部","焊工","floor_operator",false],
  ["GRT037","黄潇潇","huangxiaoxiao","事业三部","文员","floor_operator",false],
  ["GRT018","孙国祥","sunguoxiang","事业四部","电气工程师","engineer",false],
  ["GRT024","张腾飞","zhangtengfei","事业四部","机加工班组长","production_supervisor",false],
  ["GRT008","马柯","make","事业十部","质量专员","engineer",false],
  ["GRT009","史龙昌","shilongchang","事业十部","激光切作班组长","production_supervisor",false],
  ["GRT011","张超","zhangchao","事业十部","激光","floor_operator",false],
  ["GRT012","李兴伟","lixingwei","事业十部","冷作","floor_operator",false],
  ["GRT068","李亚超","liyachao","事业十部","CNC操作工","floor_operator",false],
  ["GRT069","李鹏飞","lipengfei","事业十部","数控车工","floor_operator",false],
  ["GRT073","范威","fanwei","事业十部","CNC操作工","floor_operator",false],
  ["GRT102","张飞","zhangfei","事业十部","机加工铣工","floor_operator",false],
  ["GRT112","谢伟","xiewei","事业三部","机械工程师","engineer",false],
];

// Same POSITION_TEMPLATES as before (abbreviated — using matchTemplate function)
function matchTemplate(position) {
  if (["董事长","董事长助理","运营总监","总经理","副总经理"].some(p=>position.includes(p))) return "executive";
  if (["事业二部经理","事业三部经理","事业部经理"].some(p=>position.includes(p))) return "bu_manager";
  if (["销售","市场"].some(k=>position.includes(k))) return "sales";
  if (["项目经理","采购经理","采购与项目","PMC"].some(k=>position.includes(k))) return "project_manager";
  if (["质量经理","质量专员"].some(k=>position.includes(k))) return "quality";
  if (["班组长","班长","副班长","主管","电气主管"].some(k=>position.includes(k))) return "supervisor";
  if (["售后技工"].some(k=>position.includes(k))) return "aftersales";
  if (["仓库"].some(k=>position.includes(k))) return "warehouse";
  if (["工程师"].some(k=>position.includes(k))) return "engineer";
  if (["出纳","会计","财务","总账"].some(k=>position.includes(k))) return "finance";
  if (["人事","行政","前台","后勤","前法","文员"].some(k=>position.includes(k))) return "hr_admin";
  if (["装配","焊","车工","切割","CNC","加工","冷作","激光","协作"].some(k=>position.includes(k))) return "operator";
  return "operator";
}

const TEMPLATES = {
  executive: { dims: [{n:"战略规划",e:"Strategy",c:"strategy",w:30},{n:"组织管理",e:"Organization",c:"organization",w:25},{n:"业务增长",e:"Growth",c:"growth",w:25},{n:"创新变革",e:"Innovation",c:"innovation",w:20}], pl:[{l:"差",c:"D",m:0},{l:"中",c:"C",m:2},{l:"良",c:"B",m:4},{l:"优",c:"A",m:6}] },
  bu_manager: { dims: [{n:"业务目标",e:"Business Target",c:"biz_target",w:35},{n:"团队管理",e:"Team Mgmt",c:"team",w:25},{n:"客户关系",e:"Client",c:"client",w:25},{n:"质量交付",e:"Quality",c:"quality",w:15}], pl:[{l:"差",c:"D",m:0},{l:"中",c:"C",m:1.5},{l:"良",c:"B",m:3},{l:"优",c:"A",m:5}] },
  sales: { dims: [{n:"营销",e:"Marketing",c:"marketing",w:40},{n:"销售",e:"Sales",c:"sales",w:40},{n:"客户管理",e:"Client Mgmt",c:"client_mgmt",w:20}], pl:[{l:"差",c:"D",m:0},{l:"中",c:"C",m:1},{l:"良",c:"B",m:2},{l:"优",c:"A",m:3}] },
  engineer: { dims: [{n:"技术能力",e:"Technical",c:"technical",w:40},{n:"项目交付",e:"Delivery",c:"delivery",w:30},{n:"协作创新",e:"Collaboration",c:"collab",w:20},{n:"学习成长",e:"Learning",c:"learning",w:10}], pl:[{l:"差",c:"D",m:0},{l:"中",c:"C",m:1},{l:"良",c:"B",m:2},{l:"优",c:"A",m:3}] },
  project_manager: { dims: [{n:"项目管理",e:"PM",c:"pm",w:35},{n:"客户交付",e:"Delivery",c:"delivery",w:30},{n:"资源协调",e:"Resource",c:"resource",w:20},{n:"团队协作",e:"Team",c:"team",w:15}], pl:[{l:"差",c:"D",m:0},{l:"中",c:"C",m:1},{l:"良",c:"B",m:2},{l:"优",c:"A",m:3}] },
  quality: { dims: [{n:"质量控制",e:"QC",c:"qc",w:40},{n:"过程改善",e:"Improvement",c:"improve",w:30},{n:"供应商质量",e:"Supplier QC",c:"sqc",w:20},{n:"培训",e:"Training",c:"training",w:10}], pl:[{l:"差",c:"D",m:0},{l:"中",c:"C",m:1},{l:"良",c:"B",m:2},{l:"优",c:"A",m:3}] },
  supervisor: { dims: [{n:"生产达成",e:"Output",c:"output",w:35},{n:"质量管理",e:"Quality",c:"quality",w:25},{n:"团队管理",e:"Team",c:"team",w:25},{n:"成本控制",e:"Cost",c:"cost",w:15}], pl:[{l:"差",c:"D",m:0},{l:"中",c:"C",m:0.5},{l:"良",c:"B",m:1},{l:"优",c:"A",m:2}] },
  operator: { dims: [{n:"产量达成",e:"Output",c:"output",w:35},{n:"质量合格",e:"Quality",c:"quality",w:30},{n:"技能提升",e:"Skill",c:"skill",w:20},{n:"安全规范",e:"Safety",c:"safety",w:15}], pl:[{l:"差",c:"D",m:0},{l:"中",c:"C",m:0.5},{l:"良",c:"B",m:1},{l:"优",c:"A",m:1.5}] },
  finance: { dims: [{n:"账务准确",e:"Accuracy",c:"accuracy",w:35},{n:"合规风控",e:"Compliance",c:"compliance",w:30},{n:"效率提升",e:"Efficiency",c:"efficiency",w:20},{n:"业务支持",e:"Biz Support",c:"biz",w:15}], pl:[{l:"差",c:"D",m:0},{l:"中",c:"C",m:1},{l:"良",c:"B",m:2},{l:"优",c:"A",m:3}] },
  hr_admin: { dims: [{n:"人事管理",e:"HR",c:"hr",w:30},{n:"行政服务",e:"Admin",c:"admin",w:25},{n:"制度执行",e:"Policy",c:"policy",w:25},{n:"协调沟通",e:"Coord",c:"coord",w:20}], pl:[{l:"差",c:"D",m:0},{l:"中",c:"C",m:1},{l:"良",c:"B",m:2},{l:"优",c:"A",m:2.5}] },
  aftersales: { dims: [{n:"服务响应",e:"Response",c:"response",w:30},{n:"问题解决",e:"Fix",c:"fix",w:35},{n:"客户满意",e:"CSAT",c:"csat",w:20},{n:"知识积累",e:"Knowledge",c:"knowledge",w:15}], pl:[{l:"差",c:"D",m:0},{l:"中",c:"C",m:0.5},{l:"良",c:"B",m:1},{l:"优",c:"A",m:2}] },
  warehouse: { dims: [{n:"库存准确",e:"Inventory",c:"inventory",w:35},{n:"收发效率",e:"Logistics",c:"logistics",w:30},{n:"计划管理",e:"Planning",c:"planning",w:20},{n:"6S管理",e:"6S",c:"6s",w:15}], pl:[{l:"差",c:"D",m:0},{l:"中",c:"C",m:0.5},{l:"良",c:"B",m:1},{l:"优",c:"A",m:1.5}] },
};

async function main() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();
  try {
    const CEO_ID = 12, CEO_NAME = "\u502A\u4E9A\u4E1C", YEAR = 2026;

    // Build userId map from users table
    const usersRes = await client.query(`SELECT id, "openId", name FROM users WHERE "openId" LIKE 'GRT%'`);
    const userMap = {};
    for (const u of usersRes.rows) userMap[u.openId] = u;

    let created = 0, skipped = 0;

    for (const [code, name, _pinyin, dept, position] of ROSTER) {
      const user = userMap[code];
      if (!user) { skipped++; continue; }

      // Skip if already exists
      const ex = await client.query(`SELECT id FROM annual_goal_agreements WHERE employee_id=$1 AND year=$2`, [user.id, YEAR]);
      if (ex.rows.length > 0) { skipped++; continue; }

      const tplKey = matchTemplate(position);
      const tpl = TEMPLATES[tplKey];

      const agRes = await client.query(`
        INSERT INTO annual_goal_agreements (
          employee_id, employee_name, employee_open_id, manager_id, manager_name, year,
          status, performance_levels_json, bonus_cap_months, projected_bonus_months,
          total_weight_validation, communication_channel,
          signed_by_employee, signed_by_manager, employee_signed_at, manager_signed_at,
          department, notes, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,'active',$7::json,3.0,0.0,100.00,'email',true,true,NOW(),NOW(),$8,$9,$4)
        RETURNING id
      `, [user.id, name, code, CEO_ID, CEO_NAME, YEAR,
          JSON.stringify(tpl.pl), dept,
          `\u5C97\u4F4D\u6A21\u677F:${tplKey} | \u5F85\u4E3B\u7BA1\u4E0E\u5458\u5DE5\u786E\u8BA4\u8C03\u6574`]);

      const agId = agRes.rows[0].id;

      // Dimensions
      for (let i = 0; i < tpl.dims.length; i++) {
        const d = tpl.dims[i];
        await client.query(`INSERT INTO annual_goal_dimensions (agreement_id,dimension_name,dimension_name_en,dimension_code,weight,current_score,sort_order) VALUES ($1,$2,$3,$4,$5,0.00,$6)`,
          [agId, d.n, d.e, d.c, d.w, i]);
      }

      // Checkpoints
      await client.query(`INSERT INTO annual_goal_checkpoints (agreement_id,checkpoint_type,scheduled_date,status) VALUES
        ($1,'Q1','2026-03-31','scheduled'),($1,'Q2','2026-06-30','scheduled'),($1,'mid_year','2026-06-30','scheduled'),
        ($1,'Q3','2026-09-30','scheduled'),($1,'Q4','2026-12-31','scheduled'),($1,'year_end','2027-01-15','scheduled')`, [agId]);

      // Persona profile
      await client.query(`INSERT INTO employee_persona_profiles (employee_id,employee_name,employee_code,department,position,year,persona_score,persona_tier)
        VALUES ($1,$2,$3,$4,$5,$6,50.00,'mid') ON CONFLICT (employee_id,year) DO NOTHING`,
        [user.id, name, code, dept, position, YEAR]);

      created++;
    }

    console.log(`\n${"=".repeat(50)}`);
    console.log(`  ALL EMPLOYEES SEEDED`);
    console.log(`${"=".repeat(50)}`);
    console.log(`  Created: ${created}`);
    console.log(`  Skipped: ${skipped} (existing or no user)`);
    console.log(`  Year: ${YEAR}`);
    console.log(`${"=".repeat(50)}`);
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(console.error);
