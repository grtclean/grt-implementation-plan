/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║        GRT SYSTEM — REAL EMPLOYEE USER PROVISIONING             ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║                                                                ║
 * ║  Seeds ALL 96 GRT employees as system users:                   ║
 * ║  • Username = pinyin(name)       e.g. niyadong                 ║
 * ║  • Password = pinyin + employeeId  e.g. niyadongGRT001         ║
 * ║  • RBAC role assigned per position/department                  ║
 * ║  • grt_employees entry linked to users table                   ║
 * ║                                                                ║
 * ║  Idempotent: safe to run multiple times (skip-if-exists).      ║
 * ║  Run:  npx tsx server/seed/seed-real-users.ts                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { users } from "../../drizzle/schema";
import { roles, userRoles } from "../../drizzle/permission-schema";

// ── Employee Master Roster ──────────────────────────────────────
// Each entry: [employeeId, chineseName, pinyin, department, position, rbacRole, isAdmin]
// rbacRole maps to grt_roles.name from seed-rbac-permissions.ts

type EmpTuple = [
  id: string,
  name: string,
  pinyin: string,
  department: string,
  position: string,
  rbacRole: string,
  isAdmin: boolean,
];

const EMPLOYEES: EmpTuple[] = [
  // ── 总裁办 ──
  ["GRT001", "倪亚东", "niyadong", "总裁办", "董事长", "ceo", true],

  // ── AI数智部 ──
  ["GRT080", "刘奥运", "liuaoyun", "AI数智部", "董事长助理", "vp", true],
  ["GRT049", "胡杨", "huyang", "AI数智部", "IT工程师", "engineer", false],
  ["GRT062", "朱宇浩", "zhuyuhao", "事业二部", "生产工程师兼项目及IT工程师", "engineer", true],

  ["GRT083", "刘坤", "liukun", "AI数智部", "市场主管", "sales_rep", false],
  ["GRT103", "朱文韬", "zhuwentao", "AI数智部", "市场专员", "sales_rep", false],
  ["GRT105", "倪微薇", "niweiwei", "AI数智部", "AI数智&人事行政部经理", "vp", true],

  // ── 财务部 ──
  ["GRT002", "黄晓兰", "huangxiaolan", "财务部", "出纳/银行账户执行", "finance_specialist", false],
  ["GRT054", "王秀萍", "wangxiuping", "财务部", "总账会计/财务复核", "finance_manager", false],
  ["GRT101", "王汝月", "wangruyue", "财务部", "财务专员/报销初审", "finance_specialist", false],
  ["GRT066", "李新正", "lixinzheng", "财务部", "仓库管理员", "floor_operator", false],
  ["GRT079_2", "马鹏风", "mapengfeng", "财务部", "供应链工程师", "engineer", false],

  // ── 人事行政部 ──
  ["GRT067", "沙建梅", "shajianmei", "人事行政部", "人事行政主管", "hr_director", true],
  ["GRT053", "段天珠", "duantianzhu", "人事行政部", "前法", "engineer", false],
  ["GRT100", "田炜钰", "tianweiyu", "人事行政部", "行政前台", "floor_operator", false],
  ["GRT095", "王爱云", "wangaiyun", "人事行政部", "后勤助理", "floor_operator", false],

  // ── 事业一部 (BU1 海外) ──
  ["GRT004", "戴晓燕", "daixiaoyan", "事业一部", "高级销售经理", "sales_director", true],
  ["GRT005", "金晓锋", "jinxiaofeng", "事业一部", "制造质量经理", "qc_manager", true],
  ["GRT022", "李大鹏", "lidapeng", "事业一部", "电气工程师", "engineer", false],
  ["GRT063", "刘健康", "liujiankang", "事业一部", "销售与项目工程师", "sales_rep", false],
  ["GRT020", "张洵", "zhangxun", "事业一部", "采购与项目工程师", "engineer", false],
  ["GRT057", "滕顺英", "tengshunying", "事业一部", "采购与项目工程师", "engineer", false],
  ["GRT035", "王志强", "wangzhiqiang", "事业一部", "销售与项目工程师", "sales_rep", false],
  ["GRT104", "董纾雨", "dongshuyu", "事业一部", "销售与项目工程师", "sales_rep", false],
  ["GRT030", "匡凯旋", "kuangkaixuan", "事业一部", "售后服务主管", "production_supervisor", true],
  ["GRT014", "廉龙海", "lianlonghai", "事业一部", "售后技工", "engineer", false],
  ["GRT028", "朱明华", "zhuminghua", "事业一部", "售后技工", "engineer", false],
  ["GRT040", "曾春贵", "zengchungui", "事业一部", "售后技工", "engineer", false],
  ["GRT015", "杜显文", "duxianwen", "事业一部", "电气班组副班长", "production_supervisor", false],
  ["GRT046", "吕雪冬", "lvxuedong", "事业一部", "电气班组班长", "production_supervisor", false],
  ["GRT087", "梅奥杰", "meiaojie", "事业一部", "助理电气工程师", "engineer", false],
  ["GRT088", "高嘉义", "gaojiayi", "事业一部", "助理电气工程师", "engineer", false],
  ["GRT090", "陈加丽", "chenjiali", "事业一部", "助理机械研发工程师", "engineer", false],
  ["GRT010", "吴卫成", "wuweicheng", "事业一部", "机械装配", "floor_operator", false],
  ["GRT016", "曹庆伟", "caoqingwei", "事业一部", "机械装配", "floor_operator", false],

  ["GRT039", "侯德朋", "houdepeng", "事业一部", "机械装配", "floor_operator", false],
  ["GRT041", "张良", "zhangliang", "事业一部", "机械装配", "floor_operator", false],
  ["GRT052", "赵强", "zhaoqiang", "事业一部", "机械装配", "floor_operator", false],
  ["GRT059", "焦斌", "jiaobin", "事业一部", "机械装配", "floor_operator", false],
  ["GRT079", "阎建华", "yanjianhua", "事业一部", "机械装配", "floor_operator", false],
  ["GRT031", "沈龙翔", "shenlongxiang", "事业一部", "电气装配", "floor_operator", false],
  ["GRT036", "韩品来", "hanpinlai", "事业一部", "电气装配", "floor_operator", false],
  ["GRT051", "崔聪聪", "cuicongcong", "事业一部", "电气装配", "floor_operator", false],
  ["GRT071", "刘琛杨", "liuchenyang", "事业一部", "电气装配", "floor_operator", false],
  ["GRT072", "赵铖杰", "zhaochengjie", "事业一部", "电气装配", "floor_operator", false],
  ["GRT017", "田坪珍", "tianpingzhen", "事业一部", "焊工", "floor_operator", false],
  ["GRT082", "沈富高", "shenfugao", "事业一部", "焊工", "floor_operator", false],
  ["GRT064", "强兵兵", "qiangbingbing", "事业一部", "激光切割", "floor_operator", false],
  ["GRT061", "李明遂", "limingsui", "事业一部", "数控车工", "floor_operator", false],
  ["GRT047", "嵇国华", "jiguohua", "事业一部", "协作辅助", "floor_operator", false],

  // ── 事业二部 (BU2 商用车) ──
  ["GRT094", "徐树奎", "xushukui", "事业二部", "事业二部经理", "director", true],
  ["GRT006", "洪香龙", "hongxianglong", "事业二部", "机械设计经理", "production_supervisor", true],
  ["GRT044", "洪小东", "hongxiaodong", "事业二部", "机械研发工程师", "engineer", false],
  ["GRT097", "钱佳奇", "qianjiaqi", "事业二部", "电气工程师", "engineer", false],
  ["GRT065", "蔡瑞", "cairui", "事业二部", "机械研发工程师", "engineer", false],
  ["GRT099", "殷金刚", "yinjingang", "事业二部", "机械研发工程师", "engineer", false],
  ["GRT038", "马林山", "malinshan", "事业二部", "装配班组长", "production_supervisor", false],
  ["GRT074", "王金涛", "wangjintao", "事业二部", "机械装配", "floor_operator", false],

  // ── 事业三部 (BU3 乘用车) ──
  ["GRT058", "周辉", "zhouhui", "事业三部", "事业三部经理", "director", true],
  ["GRT007", "孙坚", "sunjian", "事业三部", "电气主管", "production_supervisor", true],
  ["GRT055", "沈迎凤", "shenyingfeng", "事业三部", "采购经理", "project_manager", true],
  ["GRT003", "倪亚琴", "niyaqin", "事业三部", "采购与项目工程师", "engineer", false],
  ["GRT019", "冯艳", "fengyan", "事业三部", "销售与项目工程师", "sales_rep", false],
  ["GRT043", "韩保程", "hanbaocheng", "事业三部", "销售与项目工程师", "sales_rep", false],
  ["GRT093", "李柯瑶", "likeyao", "事业三部", "销售与项目工程师", "sales_rep", false],
  ["GRT089", "罗小玲", "luoxiaoling", "事业三部", "助理机械研发工程师", "engineer", false],
  ["GRT013", "孙淼", "sunmiao", "事业三部", "机械装配", "floor_operator", false],
  ["GRT021", "张松松", "zhangsongsong", "事业三部", "机械装配", "floor_operator", false],
  ["GRT025", "肖博雅", "xiaoboya", "事业三部", "机械装配", "floor_operator", false],
  ["GRT032", "王犇", "wangben", "事业三部", "机械装配", "floor_operator", false],
  ["GRT034", "王勇", "wangyong", "事业三部", "机械装配", "floor_operator", false],
  ["GRT042", "刘建年", "liujiannian", "事业三部", "机械装配", "floor_operator", false],
  ["GRT050", "蕾翠林", "leicuilin", "事业三部", "机械装配", "floor_operator", false],
  ["GRT060", "杨会龙", "yanghuilong", "事业三部", "机械装配", "floor_operator", false],
  ["GRT075", "胡绍杰", "hushaojie", "事业三部", "机械装配", "floor_operator", false],
  ["GRT076", "王森", "wangsen", "事业三部", "机械装配", "floor_operator", false],
  ["GRT077", "吴阳洋", "wuyangyang", "事业三部", "机械装配", "floor_operator", false],
  ["GRT084", "蒋秋瑞", "jiangqiurui", "事业三部", "机械装配", "floor_operator", false],
  ["GRT023", "杨之雲", "yangzhiyun", "事业三部", "电气装配", "floor_operator", false],
  ["GRT029", "殷小勇", "yinxiaoyong", "事业三部", "电气装配", "floor_operator", false],
  ["GRT056", "陈成成", "chenchengcheng", "事业三部", "焊工", "floor_operator", false],
  ["GRT037", "黄潇潇", "huangxiaoxiao", "事业三部", "文员", "floor_operator", false],

  // ── 事业四部 (BU4 半导体) ──
  ["GRT018", "孙国祥", "sunguoxiang", "事业四部", "电气工程师", "engineer", false],
  ["GRT024", "张腾飞", "zhangtengfei", "事业四部", "机加工班组长", "production_supervisor", false],

  // ── 事业十部 (BU5 工业通用) ──
  ["GRT008", "马柯", "make", "事业十部", "质量专员", "engineer", false],
  ["GRT009", "史龙昌", "shilongchang", "事业十部", "激光切作班组长", "production_supervisor", false],
  ["GRT011", "张超", "zhangchao", "事业十部", "激光", "floor_operator", false],
  ["GRT012", "李兴伟", "lixingwei", "事业十部", "冷作", "floor_operator", false],
  ["GRT068", "李亚超", "liyachao", "事业十部", "CNC操作工", "floor_operator", false],
  ["GRT069", "李鹏飞", "lipengfei", "事业十部", "数控车工", "floor_operator", false],
  ["GRT073", "范威", "fanwei", "事业十部", "CNC操作工", "floor_operator", false],
  ["GRT102", "张飞", "zhangfei", "事业十部", "机加工铣工", "floor_operator", false],

  // ── 事业三部（杨勇调岗） ──
  ["GRT045", "杨勇", "yangyong", "事业三部", "生产工程师兼项目经理", "project_manager", true],

  // ── 未分配 ──
  ["GRT081", "马康风", "makangfeng", "财务部", "供应链助理工程师", "engineer", false],

  // ── 事业三部（新入职） ──
  ["GRT112", "谢伟", "xiewei", "事业三部", "机械工程师", "engineer", false],
];

// ── Department → BU Code Mapping ──────────────────────────────
const DEPT_BU_MAP: Record<string, string> = {
  "总裁办": "HQ",
  "AI数智部": "IT",
  "财务部": "FIN",
  "人事行政部": "HR",
  "事业一部": "BU1",
  "事业二部": "BU2",
  "事业三部": "BU3",
  "事业四部": "BU4",
  "事业十部": "BU5",
  "事业部支持部": "SUP",
  "未分配": "HQ",
};

// ── Seed Execution ──────────────────────────────────────────────

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("[Seed] DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool);

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║   GRT Real Employee Provisioning — 96 Employees             ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  try {
    // ── Step 1: Verify roles exist ──
    console.log("[1/3] Verifying RBAC roles exist...");
    const existingRoles = await db.select().from(roles).limit(100);
    const roleMap = new Map(existingRoles.map(r => [r.name, r.id]));

    const neededRoles = [...new Set(EMPLOYEES.map(e => e[5]))];
    const missingRoles = neededRoles.filter(r => !roleMap.has(r));
    if (missingRoles.length > 0) {
      console.warn(`  [!] Missing roles: ${missingRoles.join(", ")}`);
      console.warn("      Run seed-rbac-permissions.ts first, or roles will be skipped.");
    }
    console.log(`  => ${roleMap.size} roles available, ${neededRoles.length} needed.\n`);

    // ── Step 2: Create users ──
    console.log("[2/3] Provisioning employee user accounts...");
    let created = 0;
    let skipped = 0;
    let linked = 0;

    for (const [empId, name, pinyin, dept, position, rbacRole, isAdmin] of EMPLOYEES) {
      // V4: 用户名=员工号(如GRT001), 密码=拼音首字母大写+@100(如Niyadong@100)
      // 不触发首次登录强制改密（不匹配 /^[a-z]+100$/ 格式）
      const username = empId;
      const password = `${pinyin.charAt(0).toUpperCase()}${pinyin.slice(1)}@100`;

      // Check if user already exists (by employee ID or old pinyin username)
      const existing = await db.select().from(users).where(eq(users.openId, username)).limit(1);
      if (existing.length > 0) {
        skipped++;
        continue;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      // Insert user — role标记:must_change_pwd表示首次登录需改密
      const [newUser] = await db.insert(users).values({
        openId: username,
        name: name,
        email: `${pinyin}@grt-group.com`,
        loginMethod: `local:${hash}`,
        role: isAdmin ? "admin" : "user",
        lastSignedIn: new Date().toISOString(),
      }).returning();

      created++;
      console.log(`  [+] ${empId} ${name} → ${username} (${position}, role=${rbacRole})`);

      // ── Step 3: Assign RBAC role ──
      const roleId = roleMap.get(rbacRole);
      if (roleId) {
        const existingLink = await db.select().from(userRoles)
          .where(and(eq(userRoles.userId, username), eq(userRoles.roleId, roleId)));
        if (existingLink.length === 0) {
          await db.insert(userRoles).values({
            userId: username,
            roleId: roleId,
            isActive: true,
          });
          linked++;
        }
      }

      // Also assign super_admin for CEO
      if (rbacRole === "ceo") {
        const superAdminRoleId = roleMap.get("super_admin");
        if (superAdminRoleId) {
          await db.insert(userRoles).values({
            userId: username,
            roleId: superAdminRoleId,
            isActive: true,
          });
          linked++;
        }
      }
    }

    console.log(`\n  => ${created} users created, ${skipped} skipped (already exist).`);
    console.log(`  => ${linked} role assignments created.\n`);

    // ── Summary ──
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║                   PROVISIONING COMPLETE                     ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║  Total employees:     ${String(EMPLOYEES.length).padStart(3)}                                  ║`);
    console.log(`║  Users created:       ${String(created).padStart(3)}                                  ║`);
    console.log(`║  Users skipped:       ${String(skipped).padStart(3)}                                  ║`);
    console.log(`║  Role links created:  ${String(linked).padStart(3)}                                  ║`);
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log("║  Login Credentials:                                         ║");
    console.log("║  • Username: pinyin of name (e.g. niyadong)                 ║");
    console.log("║  • Password: pinyin + employeeId (e.g. niyadongGRT001)      ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log("║  Role Distribution:                                         ║");

    const roleDistrib = new Map<string, number>();
    for (const e of EMPLOYEES) {
      roleDistrib.set(e[5], (roleDistrib.get(e[5]) || 0) + 1);
    }
    for (const [role, count] of [...roleDistrib.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`║    ${role.padEnd(25)} ${String(count).padStart(3)} employees              ║`);
    }
    console.log("╚══════════════════════════════════════════════════════════════╝");

  } catch (error) {
    console.error("\n[Seed] FATAL ERROR:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// ── Exports for programmatic use ────────────────────────────────

export { EMPLOYEES, DEPT_BU_MAP };

/** Get all employee data as structured objects */
export function getEmployeeRoster() {
  return EMPLOYEES.map(([id, name, pinyin, department, position, rbacRole, isAdmin]) => ({
    id, name, pinyin, department, position, rbacRole, isAdmin,
    username: pinyin,
    defaultPassword: `${pinyin}${id}`,
    buCode: DEPT_BU_MAP[department] || "HQ",
  }));
}

// Run if executed directly
const isDirectRun = process.argv[1]?.includes("seed-real-users");
if (isDirectRun) {
  seed();
}
