/**
 * GRT Employee Account Provisioning Script
 *
 * Creates/resets ALL employee accounts:
 * - Username: Employee ID (e.g. GRT001)
 * - Password: {pinyin}100 (e.g. niyadong100)
 * - First login forces password change
 * - Self-registration disabled
 *
 * Run: node scripts/provision-all-employees.cjs
 */
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

// Full employee roster: [numericId, employeeId, name, pinyin, department, position, rbacRole, isAdmin]
const EMPLOYEES = [
  [1,"GRT001","倪亚东","niyadong","总裁办","董事长","ceo",true],
  [80,"GRT080","刘奥运","liuaoyun","AI数智部","董事长助理","vp",true],
  [49,"GRT049","胡杨","huyang","AI数智部","IT工程师","engineer",false],
  [62,"GRT062","朱宇浩","zhuyuhao","事业二部","生产工程师兼项目及IT工程师","engineer",true],
  [83,"GRT083","刘坤","liukun","AI数智部","市场主管","sales_rep",false],
  [103,"GRT103","朱文韬","zhuwentao","AI数智部","市场专员","sales_rep",false],
  [105,"GRT105","倪微薇","niweiwei","AI数智部","AI数智&人事行政部经理","vp",true],
  [2,"GRT002","黄晓兰","huangxiaolan","财务部","出纳/银行账户执行","finance_specialist",false],
  [54,"GRT054","王秀萍","wangxiuping","财务部","总账会计/财务复核","finance_manager",false],
  [101,"GRT101","王汝月","wangruyue","财务部","财务专员/报销初审","finance_specialist",false],
  [66,"GRT066","李新正","lixinzheng","财务部","仓库管理员","floor_operator",false],
  [81,"GRT081","马康风","makangfeng","财务部","供应链助理工程师","engineer",false],
  [67,"GRT067","沙建梅","shajianmei","人事行政部","人事行政主管","hr_director",true],
  [53,"GRT053","段天珠","duantianzhu","人事行政部","前法","engineer",false],
  [100,"GRT100","田炜钰","tianweiyu","人事行政部","行政前台","floor_operator",false],
  [95,"GRT095","王爱云","wangaiyun","人事行政部","后勤助理","floor_operator",false],
  [4,"GRT004","戴晓燕","daixiaoyan","事业一部","高级销售经理","sales_director",true],
  [5,"GRT005","金晓锋","jinxiaofeng","事业一部","制造质量经理","qc_manager",true],
  [22,"GRT022","李大鹏","lidapeng","事业一部","电气工程师","engineer",false],
  [63,"GRT063","刘健康","liujiankang","事业一部","销售与项目工程师","sales_rep",false],
  [20,"GRT020","张洵","zhangxun","事业一部","采购与项目工程师","engineer",false],
  [57,"GRT057","滕顺英","tengshunying","事业一部","采购与项目工程师","engineer",false],
  [35,"GRT035","王志强","wangzhiqiang","事业一部","销售与项目工程师","sales_rep",false],
  [104,"GRT104","董纾雨","dongshuyu","事业一部","销售与项目工程师","sales_rep",false],
  [30,"GRT030","匡凯旋","kuangkaixuan","事业一部","售后服务主管","production_supervisor",true],
  [14,"GRT014","廉龙海","lianlonghai","事业一部","售后技工","engineer",false],
  [28,"GRT028","朱明华","zhuminghua","事业一部","售后技工","engineer",false],
  [40,"GRT040","曾春贵","zengchungui","事业一部","售后技工","engineer",false],
  [15,"GRT015","杜显文","duxianwen","事业一部","电气班组副班长","production_supervisor",false],
  [46,"GRT046","吕雪冬","lvxuedong","事业一部","电气班组班长","production_supervisor",false],
  [87,"GRT087","梅奥杰","meiaojie","事业一部","助理电气工程师","engineer",false],
  [88,"GRT088","高嘉义","gaojiayi","事业一部","助理电气工程师","engineer",false],
  [90,"GRT090","陈加丽","chenjiali","事业一部","助理机械研发工程师","engineer",false],
  [10,"GRT010","吴卫成","wuweicheng","事业一部","机械装配","floor_operator",false],
  [16,"GRT016","曹庆伟","caoqingwei","事业一部","机械装配","floor_operator",false],
  [39,"GRT039","侯德朋","houdepeng","事业一部","机械装配","floor_operator",false],
  [41,"GRT041","张良","zhangliang","事业一部","机械装配","floor_operator",false],
  [52,"GRT052","赵强","zhaoqiang","事业一部","机械装配","floor_operator",false],
  [59,"GRT059","焦斌","jiaobin","事业一部","机械装配","floor_operator",false],
  [79,"GRT079","阎建华","yanjianhua","事业一部","机械装配","floor_operator",false],
  [31,"GRT031","沈龙翔","shenlongxiang","事业一部","电气装配","floor_operator",false],
  [36,"GRT036","韩品来","hanpinlai","事业一部","电气装配","floor_operator",false],
  [51,"GRT051","崔聪聪","cuicongcong","事业一部","电气装配","floor_operator",false],
  [71,"GRT071","刘琛杨","liuchenyang","事业一部","电气装配","floor_operator",false],
  [72,"GRT072","赵铖杰","zhaochengjie","事业一部","电气装配","floor_operator",false],
  [17,"GRT017","田坪珍","tianpingzhen","事业一部","焊工","floor_operator",false],
  [82,"GRT082","沈富高","shenfugao","事业一部","焊工","floor_operator",false],
  [64,"GRT064","强兵兵","qiangbingbing","事业一部","激光切割","floor_operator",false],
  [61,"GRT061","李明遂","limingsui","事业一部","数控车工","floor_operator",false],
  [47,"GRT047","嵇国华","jiguohua","事业一部","协作辅助","floor_operator",false],
  [94,"GRT094","徐树奎","xushukui","事业二部","事业二部经理","director",true],
  [6,"GRT006","洪香龙","hongxianglong","事业二部","机械设计经理","production_supervisor",true],
  [44,"GRT044","洪小东","hongxiaodong","事业二部","机械研发工程师","engineer",false],
  [97,"GRT097","钱佳奇","qianjiaqi","事业二部","电气工程师","engineer",false],
  [65,"GRT065","蔡瑞","cairui","事业二部","机械研发工程师","engineer",false],
  [99,"GRT099","殷金刚","yinjingang","事业二部","机械研发工程师","engineer",false],
  [38,"GRT038","马林山","malinshan","事业二部","装配班组长","production_supervisor",false],
  [74,"GRT074","王金涛","wangjintao","事业二部","机械装配","floor_operator",false],
  [58,"GRT058","周辉","zhouhui","事业三部","事业三部经理","director",true],
  [7,"GRT007","孙坚","sunjian","事业三部","电气主管","production_supervisor",true],
  [55,"GRT055","沈迎凤","shenyingfeng","事业三部","采购经理","project_manager",true],
  [3,"GRT003","倪亚琴","niyaqin","事业三部","采购与项目工程师","engineer",false],
  [19,"GRT019","冯艳","fengyan","事业三部","销售与项目工程师","sales_rep",false],
  [43,"GRT043","韩保程","hanbaocheng","事业三部","销售与项目工程师","sales_rep",false],
  [93,"GRT093","李柯瑶","likeyao","事业三部","销售与项目工程师","sales_rep",false],
  [89,"GRT089","罗小玲","luoxiaoling","事业三部","助理机械研发工程师","engineer",false],
  [13,"GRT013","孙淼","sunmiao","事业三部","机械装配","floor_operator",false],
  [21,"GRT021","张松松","zhangsongsong","事业三部","机械装配","floor_operator",false],
  [25,"GRT025","肖博雅","xiaoboya","事业三部","机械装配","floor_operator",false],
  [32,"GRT032","王犇","wangben","事业三部","机械装配","floor_operator",false],
  [34,"GRT034","王勇","wangyong","事业三部","机械装配","floor_operator",false],
  [42,"GRT042","刘建年","liujiannian","事业三部","机械装配","floor_operator",false],
  [50,"GRT050","蕾翠林","leicuilin","事业三部","机械装配","floor_operator",false],
  [60,"GRT060","杨会龙","yanghuilong","事业三部","机械装配","floor_operator",false],
  [75,"GRT075","胡绍杰","hushaojie","事业三部","机械装配","floor_operator",false],
  [76,"GRT076","王森","wangsen","事业三部","机械装配","floor_operator",false],
  [77,"GRT077","吴阳洋","wuyangyang","事业三部","机械装配","floor_operator",false],
  [84,"GRT084","蒋秋瑞","jiangqiurui","事业三部","机械装配","floor_operator",false],
  [23,"GRT023","杨之雲","yangzhiyun","事业三部","电气装配","floor_operator",false],
  [29,"GRT029","殷小勇","yinxiaoyong","事业三部","电气装配","floor_operator",false],
  [56,"GRT056","陈成成","chenchengcheng","事业三部","焊工","floor_operator",false],
  [37,"GRT037","黄潇潇","huangxiaoxiao","事业三部","文员","floor_operator",false],
  [18,"GRT018","孙国祥","sunguoxiang","事业四部","电气工程师","engineer",false],
  [24,"GRT024","张腾飞","zhangtengfei","事业四部","机加工班组长","production_supervisor",false],
  [8,"GRT008","马柯","make","事业十部","质量专员","engineer",false],
  [9,"GRT009","史龙昌","shilongchang","事业十部","激光切作班组长","production_supervisor",false],
  [11,"GRT011","张超","zhangchao","事业十部","激光","floor_operator",false],
  [12,"GRT012","李兴伟","lixingwei","事业十部","冷作","floor_operator",false],
  [68,"GRT068","李亚超","liyachao","事业十部","CNC操作工","floor_operator",false],
  [69,"GRT069","李鹏飞","lipengfei","事业十部","数控车工","floor_operator",false],
  [73,"GRT073","范威","fanwei","事业十部","CNC操作工","floor_operator",false],
  [102,"GRT102","张飞","zhangfei","事业十部","机加工铣工","floor_operator",false],
  [45,"GRT045","杨勇","yangyong","事业三部","生产工程师兼项目经理","project_manager",true],
];

async function main() {
  const c = new Client({ connectionString: "postgresql://postgres:Gerry123456@localhost:5432/grt_system" });
  await c.connect();

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  GRT Employee Account Provisioning — V3                      ║");
  console.log("║  Username: Employee ID (GRT001)                              ║");
  console.log("║  Password: {pinyin}100 → must change on first login          ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  let created = 0, reset = 0, skipped = 0;

  for (const [, empId, name, pinyin, dept, position, rbacRole, isAdmin] of EMPLOYEES) {
    const username = empId;
    const password = `${pinyin}100`;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const role = isAdmin ? "admin" : "user";

    // Check if user exists
    const { rows } = await c.query('SELECT id, "openId" FROM users WHERE "openId" = $1', [username]);

    if (rows.length > 0) {
      // Reset password to initial + force change via "local:init:" prefix
      await c.query(
        'UPDATE users SET name = $1, "loginMethod" = $2, role = $3, "updatedAt" = NOW() WHERE "openId" = $4',
        [name, `local:init:${hash}`, role, username]
      );
      reset++;
    } else {
      // Create new user with "local:init:" prefix → forces password change on first login
      await c.query(
        `INSERT INTO users ("openId", name, email, "loginMethod", role, "lastSignedIn", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())`,
        [username, name, `${pinyin}@grt-group.com`, `local:init:${hash}`, role]
      );
      created++;
    }
  }

  // Also keep admin/Gerry123 as system admin (don't force change)
  const { rows: adminCheck } = await c.query('SELECT id FROM users WHERE "openId" = $1', ["admin"]);
  if (adminCheck.length === 0) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash("Gerry123", salt);
    await c.query(
      `INSERT INTO users ("openId", name, email, "loginMethod", role, "lastSignedIn", "createdAt", "updatedAt")
       VALUES ('admin', '系统管理员', 'admin@grt.com', $1, 'admin', NOW(), NOW(), NOW())`,
      [`local:${hash}`]
    );
    console.log("  [+] admin (系统管理员) — system admin preserved\n");
  }

  // Summary
  const { rows: summary } = await c.query(`
    SELECT COUNT(*) as total,
           COUNT(CASE WHEN "loginMethod" LIKE 'local:init:%' THEN 1 END) as pending_change,
           COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins
    FROM users
  `);

  console.log(`\n  Created: ${created} new accounts`);
  console.log(`  Reset:   ${reset} existing accounts (password reset to {pinyin}100)`);
  console.log(`  Total:   ${summary[0].total} users (${summary[0].admins} admins, ${summary[0].pending_change} pending password change)`);
  console.log(`\n  Login example: GRT001 / niyadong100 → forced to change password`);

  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
