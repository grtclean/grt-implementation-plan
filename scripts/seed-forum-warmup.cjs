/**
 * seed-forum-warmup.cjs — 技术论坛暖场帖子 (中英文)
 *
 * Usage: node scripts/seed-forum-warmup.cjs
 * Idempotent: checks title before inserting
 */
const { drizzle } = require("drizzle-orm/node-postgres");
const { Pool } = require("pg");
const { sql } = require("drizzle-orm");

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/grt_system";

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);

  console.log("Seeding forum warm-up posts...");

  // ── Ensure tables exist ──
  try {
    await db.execute(sql`SELECT 1 FROM community_posts LIMIT 1`);
    await db.execute(sql`SELECT 1 FROM community_comments LIMIT 1`);
  } catch {
    console.log("Tables not ready — run drizzle-kit push first.");
    await pool.end();
    return;
  }

  // ── Chinese posts ──
  const zhPosts = [
    {
      title: "激光焊接前的清洗质量如何控制？",
      content: `各位老师好！\n\n我们公司目前在做齿轮激光焊接的前处理工序，遇到了一些挑战：\n\n1. 焊接后出现气孔和飞溅，怀疑与焊前表面质量有关\n2. 目前使用传统溶剂清洗，残留物控制不稳定\n3. 客户（某德系OEM）要求提供ISO 16232清洁度报告\n\n请问各位专家，激光焊接前的零件表面质量应该从哪些维度控制？有没有成熟的工业解决方案可以参考？\n\n谢谢！`,
      postType: "product_qa",
      authorName: "张工",
      authorCompany: "某齿轮制造企业",
      authorType: "customer",
      reply: {
        authorName: "GRT 应用工程部",
        authorType: "employee",
        content: `张工您好！感谢您的提问，这是一个非常专业且在行业中普遍存在的问题。\n\n激光焊接前的表面质量控制，核心在于以下几个维度的持续稳定工艺控制：\n\n**1. 残留清洗剂控制**\n清洗剂如果未彻底去除，在激光高温作用下会气化产生气孔。需要在清洗后增加多级漂洗+真空干燥工序。\n\n**2. 油污残留控制**\n加工油、防锈油、冲压油等必须彻底去除。建议使用碳氢清洗介质或改性醇类清洗剂，清洗后残油量控制在 ≤0.5mg/件。\n\n**3. 水气含量控制**\n焊接面含水会导致氢致气孔。GRT方案采用热风+真空双重干燥，确保表面含水量 <0.1%。\n\n**4. 化学反应残留控制**\n酸洗、磷化等前处理残留物会影响焊缝质量。需要特定的中和漂洗工序。\n\n**5. 表面钝化处理**\n对于关键焊接面，清洗后建议增加表面钝化处理，形成稳定的氧化层保护。\n\n---\n\n**GRT 工业解决方案**\n\n针对齿轮焊接前清洗，GRT 的 **组合态清洗机 MA800 系列** 具备完善的去污能力：\n\n- 多介质组合清洗（碳氢+水基+改性醇）\n- 表面钝化集成工艺\n- ISO 16232 在线颗粒度检测\n- 真空干燥（含水 <0.1%）\n- MES产线集成，全程可追溯\n\n**实际应用案例：**\n- 🏭 **双环传动** — 齿轮焊接前清洗产线，服务于 BMW 变速箱齿轮\n- 🏭 **ZF 采埃孚** — 电驱动减速器齿轮清洗，多条产线运行\n- 🏭 **利纳马 Linamar** — 北美工厂齿轮清洗线，满足 GM 标准\n- 🏭 **新能源行业** — BYD、CATL等头部客户的电驱齿轮清洗\n\nMA800系列已在全球多个顶端客户的全系列产品中稳定运行，是经过验证的工业级激光焊接前清洗解决方案。\n\n如需进一步了解技术细节或安排现场参观，欢迎随时联系我们的应用工程团队。\n\n📧 info@grt-group.com | 📞 +86 510 834 83999`,
      },
    },
    {
      title: "新能源电驱壳体清洗有什么特殊要求？",
      content: `大家好，\n\n我们是一家新能源汽车零部件供应商，目前在评估电驱壳体（铝压铸件）的清洗方案。\n\n零件尺寸约 500×400×300mm，年产量预计 30 万件。客户要求颗粒度 ≤500μm、数量 ≤50个/件。\n\n请问：\n1. 这个洁净度等级用什么清洗工艺能达到？\n2. 压铸件内部油道如何清洗？\n3. 有没有一体化的解决方案推荐？`,
      postType: "tech_forum",
      authorName: "李总工",
      authorCompany: "某新能源零部件公司",
      authorType: "customer",
      reply: {
        authorName: "GRT 应用工程部",
        authorType: "employee",
        content: `李总工您好！\n\n电驱壳体的清洗确实有其特殊性，主要体现在以下几点：\n\n**1. 清洗工艺**\n您提到的洁净度要求（≤500μm, ≤50颗/件）属于ISO 16232 Class B级别。推荐采用"高压喷淋+定点冲洗+超声波"组合工艺：\n- 高压喷淋去除大颗粒（>200μm）\n- 定点冲洗覆盖油道内腔\n- 超声波处理微小颗粒和盲孔残留\n\n**2. 油道内腔清洗**\nGRT 独有的"靶向冲洗"技术，通过专用工装对每个油道口进行定点高压冲洗，确保内腔无死角。\n\n**3. 推荐方案**\n针对年产30万件的产能需求，推荐 **MCL-12000 一体化清洗岛**：\n- 全自动上下料（含翻转机构）\n- 4工位：粗洗→精洗→漂洗→干燥\n- 节拍 120s，满足产能需求\n- IoT远程监控 + MES集成\n\n该方案已在多家新能源头部客户量产验证，欢迎进一步交流！`,
      },
    },
  ];

  // ── English posts ──
  const enPosts = [
    {
      title: "How to control surface quality before laser welding?",
      content: `Hello everyone,\n\nWe're currently working on pre-treatment for gear laser welding and facing some challenges:\n\n1. Post-weld porosity and spatter — suspected surface quality issue\n2. Current solvent cleaning gives inconsistent residue control\n3. Customer (German OEM) requires ISO 16232 cleanliness reports\n\nWhat dimensions should we focus on for pre-laser-welding surface quality control? Are there proven industrial solutions?\n\nThanks!`,
      postType: "product_qa",
      authorName: "James W.",
      authorCompany: "Gear Manufacturing Inc.",
      authorType: "customer",
      reply: {
        authorName: "GRT Application Engineering",
        authorType: "employee",
        content: `Hi James, great question — this is a critical and common challenge across the industry.\n\nPre-laser-welding surface quality control requires stable process control across these key dimensions:\n\n**1. Cleaning Agent Residue**\nResidual cleaning agents vaporize under laser heat, causing porosity. Multi-stage rinsing + vacuum drying is essential.\n\n**2. Oil Contamination**\nMachining oils, rust preventives, and stamping oils must be completely removed. Recommended: hydrocarbon or modified alcohol cleaning agents, with residual oil ≤0.5mg/part.\n\n**3. Moisture Content**\nSurface moisture leads to hydrogen-induced porosity. GRT uses hot air + vacuum dual drying to achieve <0.1% surface moisture.\n\n**4. Chemical Reaction Residue**\nResidues from pickling or phosphating affect weld quality. Specific neutralization rinsing is required.\n\n**5. Surface Passivation**\nFor critical weld surfaces, post-cleaning passivation creates a stable oxide layer for protection.\n\n---\n\n**GRT Industrial Solution**\n\nFor pre-weld gear cleaning, GRT's **Combination Cleaning System MA800 Series** delivers comprehensive decontamination:\n\n- Multi-media cleaning (HC + aqueous + modified alcohol)\n- Integrated surface passivation\n- ISO 16232 inline particle detection\n- Vacuum drying (<0.1% moisture)\n- Full MES integration & traceability\n\n**Proven at Top-Tier Customers:**\n- 🏭 **Shuanghuan (双环传动)** — Gear pre-weld cleaning for BMW transmission gears\n- 🏭 **ZF Friedrichshafen** — E-drive reducer gear cleaning, multiple production lines\n- 🏭 **Linamar** — North America gear cleaning lines, meeting GM standards\n- 🏭 **NEV Industry** — BYD, CATL and other leading NEV e-drive gear cleaning\n\nThe MA800 series is a field-proven, industrial-grade solution running in production at global Tier-1 customers.\n\nFeel free to reach out for technical details or a factory visit.\n\n📧 info@grt-group.com | 📞 +86 510 834 83999`,
      },
    },
    {
      title: "NEV e-drive housing cleaning — what are the special requirements?",
      content: `Hello,\n\nWe're a NEV parts supplier evaluating cleaning solutions for aluminum die-cast e-drive housings.\n\nPart dimensions: ~500×400×300mm, annual volume: 300K pcs.\nCustomer spec: particle ≤500μm, count ≤50/part.\n\nQuestions:\n1. What cleaning process achieves this cleanliness level?\n2. How to clean internal oil channels in die-cast parts?\n3. Any integrated solution recommendations?`,
      postType: "tech_forum",
      authorName: "Sarah L.",
      authorCompany: "NEV Components Ltd.",
      authorType: "customer",
      reply: {
        authorName: "GRT Application Engineering",
        authorType: "employee",
        content: `Hi Sarah,\n\nE-drive housing cleaning has specific requirements:\n\n**1. Cleaning Process**\nYour cleanliness spec (≤500μm, ≤50 particles) is ISO 16232 Class B. Recommended: "High-pressure spray + targeted flush + ultrasonic" combination:\n- High-pressure spray removes large particles (>200μm)\n- Targeted flush covers internal oil channels\n- Ultrasonic handles micro-particles and blind hole residue\n\n**2. Internal Channel Cleaning**\nGRT's proprietary "Targeted Flush" technology uses custom tooling to deliver high-pressure cleaning to each oil port — ensuring zero dead zones.\n\n**3. Recommended Solution**\nFor 300K pcs/year capacity: **MCL-12000 Integrated Cleaning Island**\n- Fully automated load/unload (with flip mechanism)\n- 4 stations: rough wash → fine wash → rinse → dry\n- 120s takt time, meets capacity requirements\n- IoT remote monitoring + MES integration\n\nThis solution is production-proven at multiple leading NEV customers. Happy to discuss further!`,
      },
    },
  ];

  const allPosts = [...zhPosts, ...enPosts];

  for (const p of allPosts) {
    // Check if already exists
    const existing = await db.execute(
      sql`SELECT id FROM community_posts WHERE title = ${p.title} AND is_active = true LIMIT 1`
    );
    if (existing.rows?.length > 0) {
      console.log(`  ⏭ Already exists: "${p.title.slice(0, 40)}..."`);
      continue;
    }

    // Insert post
    const [post] = (await db.execute(
      sql`INSERT INTO community_posts (author_id, post_type, title, content, content_clean, scope, view_count, like_count, comment_count, is_pinned, is_active)
          VALUES (0, ${p.postType}, ${p.title}, ${p.content}, true, 'company_wide', ${Math.floor(Math.random() * 50) + 10}, ${Math.floor(Math.random() * 8) + 1}, 1, false, true)
          RETURNING id`
    )).rows;

    if (!post?.id) { console.log(`  ✗ Failed to insert: "${p.title.slice(0, 40)}..."`); continue; }

    // Insert comment with author info (denormalized in community_comments table)
    await db.execute(
      sql`INSERT INTO community_comments (post_id, author_id, author_type, author_name, author_company, content, content_clean, is_approved, is_active)
          VALUES (${post.id}, 0, ${p.reply.authorType}, ${p.reply.authorName}, 'GRT Group', ${p.reply.content}, true, true, true)`
    );

    console.log(`  ✓ Seeded: "${p.title.slice(0, 50)}..." + reply`);
  }

  console.log("Done!");
  await pool.end();
}

main().catch(console.error);
