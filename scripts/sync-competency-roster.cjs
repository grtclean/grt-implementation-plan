/**
 * Sync employee_competence_assessments with canonical GRT roster
 * - Updates existing records to match correct names/depts
 * - Inserts missing employees with NULL scores (pending manual input)
 */
const { Client } = require("pg");

const ROSTER = [
  [1,"倪亚东","总裁办","董事长"],
  [80,"刘奥运","AI数智部","董事长助理"],
  [49,"胡杨","AI数智部","IT工程师"],
  [62,"朱宇浩","事业二部","生产工程师兼项目及IT工程师"],

  [83,"刘坤","AI数智部","市场主管"],
  [103,"朱文韬","AI数智部","市场专员"],
  [105,"倪微薇","AI数智部","AI数智&人事行政部经理"],
  [2,"黄晓兰","财务部","出纳/银行账户执行"],
  [54,"王秀萍","财务部","总账会计/财务复核"],
  [101,"王汝月","财务部","财务专员/报销初审"],
  [66,"李新正","财务部","仓库管理员"],
  [67,"沙建梅","人事行政部","人事行政主管"],
  [53,"段天珠","人事行政部","前法"],
  [100,"田炜钰","人事行政部","行政前台"],
  [95,"王爱云","人事行政部","后勤助理"],
  [4,"戴晓燕","事业一部","高级销售经理"],
  [5,"金晓锋","事业一部","制造质量经理"],
  [22,"李大鹏","事业一部","电气工程师"],
  [63,"刘健康","事业一部","销售与项目工程师"],
  [20,"张洵","事业一部","采购与项目工程师"],
  [57,"滕顺英","事业一部","采购与项目工程师"],
  [35,"王志强","事业一部","销售与项目工程师"],
  [104,"董纾雨","事业一部","销售与项目工程师"],
  [30,"匡凯旋","事业一部","售后服务主管"],
  [14,"廉龙海","事业一部","售后技工"],
  [28,"朱明华","事业一部","售后技工"],
  [40,"曾春贵","事业一部","售后技工"],
  [15,"杜显文","事业一部","电气班组副班长"],
  [46,"吕雪冬","事业一部","电气班组班长"],
  [87,"梅奥杰","事业一部","助理电气工程师"],
  [88,"高嘉义","事业一部","助理电气工程师"],
  [90,"陈加丽","事业一部","助理机械研发工程师"],
  [10,"吴卫成","事业一部","机械装配"],
  [16,"曹庆伟","事业一部","机械装配"],
  [39,"侯德朋","事业一部","机械装配"],
  [41,"张良","事业一部","机械装配"],
  [52,"赵强","事业一部","机械装配"],
  [59,"焦斌","事业一部","机械装配"],
  [79,"阎建华","事业一部","机械装配"],
  [31,"沈龙翔","事业一部","电气装配"],
  [36,"韩品来","事业一部","电气装配"],
  [51,"崔聪聪","事业一部","电气装配"],
  [71,"刘琛杨","事业一部","电气装配"],
  [72,"赵铖杰","事业一部","电气装配"],
  [17,"田坪珍","事业一部","焊工"],
  [82,"沈富高","事业一部","焊工"],
  [64,"强兵兵","事业一部","激光切割"],
  [61,"李明遂","事业一部","数控车工"],
  [47,"嵇国华","事业一部","协作辅助"],
  [94,"徐树奎","事业二部","事业二部经理"],
  [6,"洪香龙","事业二部","机械设计经理"],
  [44,"洪小东","事业二部","机械研发工程师"],
  [97,"钱佳奇","事业二部","电气工程师"],
  [65,"蔡瑞","事业二部","机械研发工程师"],
  [99,"殷金刚","事业二部","机械研发工程师"],
  [38,"马林山","事业二部","装配班组长"],
  [74,"王金涛","事业二部","机械装配"],
  [58,"周辉","事业三部","事业三部经理"],
  [7,"孙坚","事业三部","电气主管"],
  [55,"沈迎凤","事业三部","采购经理"],
  [3,"倪亚琴","事业三部","采购与项目工程师"],
  [19,"冯艳","事业三部","销售与项目工程师"],
  [43,"韩保程","事业三部","销售与项目工程师"],
  [93,"李柯瑶","事业三部","销售与项目工程师"],
  [89,"罗小玲","事业三部","助理机械研发工程师"],
  [13,"孙淼","事业三部","机械装配"],
  [21,"张松松","事业三部","机械装配"],
  [25,"肖博雅","事业三部","机械装配"],
  [32,"王犇","事业三部","机械装配"],
  [34,"王勇","事业三部","机械装配"],
  [42,"刘建年","事业三部","机械装配"],
  [50,"蕾翠林","事业三部","机械装配"],
  [60,"杨会龙","事业三部","机械装配"],
  [75,"胡绍杰","事业三部","机械装配"],
  [76,"王森","事业三部","机械装配"],
  [77,"吴阳洋","事业三部","机械装配"],
  [84,"蒋秋瑞","事业三部","机械装配"],
  [23,"杨之雲","事业三部","电气装配"],
  [29,"殷小勇","事业三部","电气装配"],
  [56,"陈成成","事业三部","焊工"],
  [37,"黄潇潇","事业三部","文员"],
  [18,"孙国祥","事业四部","电气工程师"],
  [24,"张腾飞","事业四部","机加工班组长"],
  [8,"马柯","事业十部","质量专员"],
  [9,"史龙昌","事业十部","激光切作班组长"],
  [11,"张超","事业十部","激光"],
  [12,"李兴伟","事业十部","冷作"],
  [68,"李亚超","事业十部","CNC操作工"],
  [69,"李鹏飞","事业十部","数控车工"],
  [73,"范威","事业十部","CNC操作工"],
  [102,"张飞","事业十部","机加工铣工"],
  [45,"杨勇","事业三部","生产工程师兼项目经理"],
  [81,"马康风","财务部","供应链助理工程师"],
];

async function main() {
  const c = new Client({ connectionString: "postgresql://postgres:Gerry123456@localhost:5432/grt_system" });
  await c.connect();

  // 1. Update existing records to match canonical names/departments
  for (const [eid, name, dept, pos] of ROSTER) {
    await c.query(
      "UPDATE employee_competence_assessments SET employee_name=$1, department=$2, position=$3, updated_at=NOW() WHERE employee_id=$4",
      [name, dept, pos, eid]
    );
  }
  console.log("Updated existing records to match canonical roster");

  // 2. Get current employee IDs
  const { rows: existing } = await c.query("SELECT DISTINCT employee_id FROM employee_competence_assessments");
  const existingIds = new Set(existing.map(r => r.employee_id));

  // 3. Insert missing employees with NULL scores (pending manual input)
  let inserted = 0;
  for (const [eid, name, dept, pos] of ROSTER) {
    if (!existingIds.has(eid)) {
      await c.query(
        "INSERT INTO employee_competence_assessments (employee_id, employee_name, department, position) VALUES ($1, $2, $3, $4)",
        [eid, name, dept, pos]
      );
      inserted++;
    }
  }
  console.log("Inserted", inserted, "new employees (scores pending manual input)");

  // 4. Delete any employee_id NOT in canonical roster (orphans from old fake data)
  const rosterIds = ROSTER.map(r => r[0]);
  const { rowCount } = await c.query(
    "DELETE FROM employee_competence_assessments WHERE employee_id != ALL($1::int[])",
    [rosterIds]
  );
  if (rowCount > 0) console.log("Removed", rowCount, "orphan rows not in roster");

  // 5. Summary
  const { rows: summary } = await c.query(`
    SELECT COUNT(*) as total,
           COUNT(t_score) as scored,
           COUNT(*) - COUNT(t_score) as pending
    FROM (SELECT DISTINCT ON (employee_id) * FROM employee_competence_assessments ORDER BY employee_id, assessed_at DESC) t
  `);
  console.log("\nSummary:", summary[0]);

  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
