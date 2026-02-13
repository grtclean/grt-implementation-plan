/**
 * 知识库服务 (Knowledge Base Service)
 *
 * 为GRT实施计划提供RAG（检索增强生成）知识库功能。
 * 支持全文搜索、相关性评分、知识条目管理和初始数据预填充。
 *
 * 核心能力:
 *   - listDocuments    分页列表，支持多维过滤
 *   - createDocument   创建知识条目
 *   - searchDocuments  全文搜索 + 关键词匹配 + 相关性评分（RAG核心）
 *   - getRelatedDocuments  根据阶段/工序/标签查找相关文档
 *   - incrementRelevance   使用后提升相关性分数
 *   - seedInitialKnowledge 预填充GRT技术知识
 */

import { requireDb } from "../db";
import { eq, and, desc, sql, or, ilike } from "drizzle-orm";

// ============================================================
// Types
// ============================================================

export type KnowledgeCategory =
  | "technical"
  | "process"
  | "material"
  | "standard"
  | "case_study"
  | "faq";

export type KnowledgeSource =
  | "manual"
  | "plm_import"
  | "erp_import"
  | "meeting_extract";

export interface CreateDocumentInput {
  title: string;
  category: KnowledgeCategory;
  content: string;
  tags?: string[];
  projectId?: number;
  stageCode?: string;
  processCode?: string;
  source?: KnowledgeSource;
  createdBy: number;
}

export interface SearchOptions {
  category?: KnowledgeCategory;
  stageCode?: string;
  processCode?: string;
  limit?: number;
}

export interface SearchResult {
  id: number;
  title: string;
  category: string;
  content: string;
  tags: string[];
  stageCode: string | null;
  processCode: string | null;
  relevanceScore: number;
  matchScore: number; // computed relevance for this search
  createdAt: string;
}

// ============================================================
// CRUD
// ============================================================

/**
 * 分页列表，支持 category、tags、stageCode、processCode、keyword 过滤
 */
export async function listDocuments(params: {
  category?: KnowledgeCategory;
  stageCode?: string;
  processCode?: string;
  keyword?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}) {
  const db = await requireDb();
  const { knowledgeDocuments } = await import("../../drizzle/schema");

  const {
    category,
    stageCode,
    processCode,
    keyword,
    tags,
    limit = 20,
    offset = 0,
  } = params;

  const conditions: any[] = [];
  if (category) conditions.push(eq(knowledgeDocuments.category, category));
  if (stageCode) conditions.push(eq(knowledgeDocuments.stageCode, stageCode));
  if (processCode)
    conditions.push(eq(knowledgeDocuments.processCode, processCode));
  if (keyword) {
    conditions.push(
      or(
        ilike(knowledgeDocuments.title, `%${keyword}%`),
        ilike(knowledgeDocuments.content, `%${keyword}%`),
        ilike(knowledgeDocuments.tags, `%${keyword}%`)
      )
    );
  }
  if (tags && tags.length > 0) {
    // Match any tag present in the JSON-encoded tags field
    const tagConditions = tags.map((tag) =>
      ilike(knowledgeDocuments.tags, `%${tag}%`)
    );
    conditions.push(or(...tagConditions));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select()
    .from(knowledgeDocuments)
    .where(where)
    .orderBy(desc(knowledgeDocuments.relevanceScore), desc(knowledgeDocuments.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(knowledgeDocuments)
    .where(where);

  return {
    items: items.map(parseTags),
    total: countResult[0]?.count ?? 0,
    limit,
    offset,
  };
}

/**
 * 创建新知识条目
 */
export async function createDocument(input: CreateDocumentInput) {
  const db = await requireDb();
  const { knowledgeDocuments } = await import("../../drizzle/schema");

  const now = new Date().toISOString();
  const inserted = await db
    .insert(knowledgeDocuments)
    .values({
      title: input.title,
      category: input.category,
      content: input.content,
      tags: input.tags ? JSON.stringify(input.tags) : null,
      projectId: input.projectId ?? null,
      stageCode: input.stageCode ?? null,
      processCode: input.processCode ?? null,
      source: input.source ?? "manual",
      relevanceScore: 0,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return parseTags(inserted[0]);
}

/**
 * **RAG核心**: 全文搜索 + 关键词匹配
 *
 * 评分规则:
 *   - 标题匹配: +10分/次
 *   - 标签匹配: +5分/次
 *   - 内容匹配: +1分/次出现
 *
 * 结果按 matchScore 降序排列，同分按 relevanceScore 排序。
 */
export async function searchDocuments(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const db = await requireDb();
  const { knowledgeDocuments } = await import("../../drizzle/schema");

  const { category, stageCode, processCode, limit = 5 } = options;

  // Build filter conditions (exclude the search keyword itself, which is scored below)
  const conditions: any[] = [];
  if (category) conditions.push(eq(knowledgeDocuments.category, category));
  if (stageCode) conditions.push(eq(knowledgeDocuments.stageCode, stageCode));
  if (processCode)
    conditions.push(eq(knowledgeDocuments.processCode, processCode));

  // At minimum, the document must match the query in title, content, or tags
  conditions.push(
    or(
      ilike(knowledgeDocuments.title, `%${query}%`),
      ilike(knowledgeDocuments.content, `%${query}%`),
      ilike(knowledgeDocuments.tags, `%${query}%`)
    )
  );

  const where = and(...conditions);

  const rows = await db
    .select()
    .from(knowledgeDocuments)
    .where(where)
    .orderBy(desc(knowledgeDocuments.relevanceScore))
    .limit(limit * 3); // fetch extra, we'll re-sort by matchScore

  // Score each result
  const queryLower = query.toLowerCase();
  const scored: SearchResult[] = rows.map((row) => {
    let matchScore = 0;
    const titleLower = (row.title || "").toLowerCase();
    const contentLower = (row.content || "").toLowerCase();
    const tagsLower = (row.tags || "").toLowerCase();

    // Title match: +10 per occurrence
    matchScore += countOccurrences(titleLower, queryLower) * 10;

    // Tags match: +5 per occurrence
    matchScore += countOccurrences(tagsLower, queryLower) * 5;

    // Content match: +1 per occurrence
    matchScore += countOccurrences(contentLower, queryLower) * 1;

    // Also try matching individual words for broader results
    const words = queryLower
      .split(/\s+/)
      .filter((w) => w.length >= 2);
    for (const word of words) {
      matchScore += countOccurrences(titleLower, word) * 5;
      matchScore += countOccurrences(tagsLower, word) * 3;
      matchScore += countOccurrences(contentLower, word) * 1;
    }

    return {
      id: row.id,
      title: row.title,
      category: row.category,
      content: row.content,
      tags: safeParseJSON(row.tags || "[]"),
      stageCode: row.stageCode,
      processCode: row.processCode,
      relevanceScore: row.relevanceScore ?? 0,
      matchScore,
      createdAt: row.createdAt,
    };
  });

  // Sort by matchScore desc, then by relevanceScore desc
  scored.sort(
    (a, b) =>
      b.matchScore - a.matchScore || b.relevanceScore - a.relevanceScore
  );

  return scored.slice(0, limit);
}

/**
 * 查找与指定阶段/工序/标签组合相关的文档
 */
export async function getRelatedDocuments(params: {
  stageCode?: string;
  processCode?: string;
  tags?: string[];
  limit?: number;
}) {
  const db = await requireDb();
  const { knowledgeDocuments } = await import("../../drizzle/schema");

  const { stageCode, processCode, tags, limit = 5 } = params;

  const conditions: any[] = [];
  if (stageCode) conditions.push(eq(knowledgeDocuments.stageCode, stageCode));
  if (processCode)
    conditions.push(eq(knowledgeDocuments.processCode, processCode));
  if (tags && tags.length > 0) {
    const tagConditions = tags.map((tag) =>
      ilike(knowledgeDocuments.tags, `%${tag}%`)
    );
    conditions.push(or(...tagConditions));
  }

  if (conditions.length === 0) {
    return [];
  }

  // Use OR to find any document matching at least one condition
  const where = or(...conditions);

  const rows = await db
    .select()
    .from(knowledgeDocuments)
    .where(where)
    .orderBy(desc(knowledgeDocuments.relevanceScore), desc(knowledgeDocuments.createdAt))
    .limit(limit);

  return rows.map(parseTags);
}

/**
 * 使用后提升相关性分数 (+1)
 */
export async function incrementRelevance(id: number) {
  const db = await requireDb();
  const { knowledgeDocuments } = await import("../../drizzle/schema");

  const updated = await db
    .update(knowledgeDocuments)
    .set({
      relevanceScore: sql`${knowledgeDocuments.relevanceScore} + 1`,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(knowledgeDocuments.id, id))
    .returning();

  if (updated.length === 0) return null;
  return parseTags(updated[0]);
}

/**
 * 预填充GRT技术知识条目（15-20条）
 *
 * 涵盖: 喷嘴选型、清洁度标准、材料兼容性、溶剂选型、
 * 真空干燥、BOM检查、设计陷阱、历史项目参考等。
 */
export async function seedInitialKnowledge(createdBy: number) {
  const db = await requireDb();
  const { knowledgeDocuments } = await import("../../drizzle/schema");

  // Check if already seeded
  const existing = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(knowledgeDocuments);

  if ((existing[0]?.count ?? 0) > 0) {
    return { seeded: false, message: "知识库已有数据，跳过预填充", count: existing[0]?.count ?? 0 };
  }

  const now = new Date().toISOString();

  const seedData: Array<{
    title: string;
    category: string;
    content: string;
    tags: string[];
    stageCode?: string;
    processCode?: string;
    source: string;
  }> = [
    // 1. 喷嘴选型指南 - 低压
    {
      title: "喷嘴选型指南 - 低压应用（0.5-3bar）",
      category: "technical",
      content:
        "低压清洗喷嘴选型要点：\n\n1. 压力范围：0.5-3bar，适用于精密零件预清洗和漂洗工位\n2. 推荐喷嘴类型：\n   - 扇形喷嘴（Flat Fan）: 覆盖面积大，适合传送带式清洗\n   - 全锥形喷嘴（Full Cone）: 均匀覆盖，适合浸泡搅拌辅助\n3. 材质选择：\n   - 不锈钢316L：通用清洗介质\n   - PEEK：强酸强碱环境\n   - 黄铜：纯水低压环境，成本最优\n4. 流量计算：Q = K × √P，其中K为喷嘴系数\n5. 布局间距：喷嘴间距 = 喷射距离 × tan(喷射角/2) × 1.2（重叠系数）\n\n注意：低压喷嘴堵塞风险较高，建议安装50μm过滤器。",
      tags: ["喷嘴", "选型", "低压", "清洗", "扇形喷嘴", "全锥形喷嘴"],
      stageCode: "M3",
      processCode: "T3",
      source: "manual",
    },
    // 2. 喷嘴选型指南 - 高压
    {
      title: "喷嘴选型指南 - 高压应用（10-150bar）",
      category: "technical",
      content:
        "高压清洗喷嘴选型要点：\n\n1. 压力范围：10-150bar，适用于去毛刺、去芯砂、高压定点冲洗\n2. 推荐喷嘴类型：\n   - 直射喷嘴（0°）: 最大冲击力，去毛刺首选\n   - 扇形喷嘴（15°-40°）: 线性清洗，适合通道和盲孔\n   - 旋转喷嘴: 自转增加覆盖，适合管道内壁\n3. 材质选择：\n   - 硬化不锈钢：标准应用\n   - 碳化钨：高磨损环境，寿命提升5-10倍\n   - 蓝宝石/红宝石：超高压精密应用\n4. 关键参数：\n   - 冲击力 F = 0.024 × Q × √P（N），Q为L/min，P为bar\n   - 去毛刺最小冲击力：铝合金 ≥ 3N，铸铁 ≥ 5N，钢 ≥ 8N\n5. 安全注意：高压喷嘴需定期检查磨损，磨损量>10%必须更换。",
      tags: ["喷嘴", "选型", "高压", "去毛刺", "冲击力"],
      stageCode: "M3",
      processCode: "T3",
      source: "manual",
    },
    // 3. ISO 16232 清洁度标准
    {
      title: "清洁度标准 ISO 16232 应用指南",
      category: "standard",
      content:
        "ISO 16232 道路车辆零部件和系统清洁度标准：\n\n1. 适用范围：汽车零部件（发动机、变速箱、液压系统等）的颗粒清洁度检测\n2. 颗粒提取方法：\n   - 压力冲洗法：最常用，适用于有内腔的零件\n   - 超声波清洗法：适用于复杂形状、盲孔零件\n   - 摇晃/搅拌法：适用于小型散装零件\n3. 分析方法：\n   - 光学显微镜计数：标准方法，可分辨金属/非金属颗粒\n   - 重量法：快速，但无法区分颗粒类型\n   - 自动颗粒计数器：高效，适合批量检测\n4. 清洁度等级表示：\n   - 组件代码如 A(D22/E16/F11/G8)，表示各粒径范围的允许颗粒数\n   - D: 100-150μm, E: 150-200μm, F: 200-400μm, G: 400-600μm\n5. GRT设备相关：清洗设备出厂前需验证清洁度达标，萃取液需保留备查。",
      tags: ["清洁度", "ISO16232", "颗粒", "检测", "汽车零部件"],
      stageCode: "M5",
      processCode: "T8",
      source: "manual",
    },
    // 4. VDA 19 清洁度标准
    {
      title: "VDA 19 技术清洁度检测标准详解",
      category: "standard",
      content:
        "VDA 19（德国汽车工业协会标准）清洁度检测：\n\n1. 与ISO 16232的关系：VDA 19是ISO 16232的基础，两者高度一致\n2. VDA 19.1 - 零部件清洁度：\n   - 规定了零件技术清洁度的检测流程\n   - 包含盲试验(Blank Test)确认检测环境清洁度\n   - 衰减试验确定最佳提取次数（通常3-5次提取，末次≤前次10%）\n3. VDA 19.2 - 生产环境清洁度：\n   - 关注生产过程中的清洁度控制\n   - 涵盖净化车间等级、人员管理、物流防护\n4. GRT清洗机验收标准：\n   - 清洗后零件清洁度需满足客户规定的VDA 19/ISO 16232等级\n   - 典型要求：最大颗粒≤500μm，总质量≤3mg/零件\n   - 设备FAT/SAT需提供清洁度检测报告\n5. 常见问题：\n   - 提取不充分导致假合格 → 需严格执行衰减试验\n   - 滤膜污染 → 操作需在洁净环境下进行",
      tags: ["清洁度", "VDA19", "检测", "验收", "FAT", "SAT"],
      stageCode: "M5",
      processCode: "T8",
      source: "manual",
    },
    // 5. ADC12 材料兼容性
    {
      title: "ADC12压铸铝合金材料兼容性指南",
      category: "material",
      content:
        "ADC12（JIS标准，等同于A383/美标）压铸铝合金清洗兼容性：\n\n1. 化学成分：Si 9.6-12%, Cu 1.5-3.5%, Fe ≤1.3%\n2. 清洗介质兼容性：\n   - 碳氢溶剂：✅ 完全兼容，推荐用于去油\n   - 碱性水基清洗剂（pH 9-11）：✅ 兼容，但浓度需控制\n   - 强碱（pH>12）：⚠️ 铝被腐蚀，产生氢气，严禁使用\n   - 酸性清洗剂（pH 2-4）：⚠️ 仅用于去氧化膜，时间需严格控制(<30s)\n   - 含氯溶剂：❌ 禁止，会产生点蚀\n3. 温度限制：\n   - 水基清洗：40-65°C，超过65°C表面易氧化发黑\n   - 碳氢清洗：常温-70°C\n4. 干燥要求：\n   - ADC12多孔结构易残留水分，建议真空干燥\n   - 真空度：≤50mbar，温度80-100°C，时间≥5min\n5. 特别注意：ADC12铸造后若有残留脱模剂(硅油基)，需先用碳氢预洗。",
      tags: ["ADC12", "铝合金", "压铸", "材料兼容性", "腐蚀"],
      stageCode: "M3",
      processCode: "T2",
      source: "manual",
    },
    // 6. 钢件材料兼容性
    {
      title: "碳钢与合金钢零件清洗材料兼容性",
      category: "material",
      content:
        "碳钢/合金钢零件清洗注意事项：\n\n1. 常见材质：45#钢、40Cr、20CrMnTi、GCr15\n2. 清洗介质兼容性：\n   - 碳氢溶剂：✅ 完全兼容，去油效果好\n   - 碱性水基（pH 9-12）：✅ 兼容，需加防锈剂\n   - 酸洗（pH 1-3）：✅ 去锈/去氧化皮，需中和处理\n   - 含氯溶剂：⚠️ 残留易导致应力腐蚀，慎用\n3. 防锈关键：\n   - 清洗后30分钟内必须干燥或涂防锈油\n   - 工序间防锈：使用VCI气相防锈包装或浸泡式防锈液\n   - 中性水基清洗剂可避免pH相关锈蚀\n4. 热处理件特殊要求：\n   - 淬火件表面硬度高，但应力大，避免强酸长时间浸泡\n   - 渗碳件表面碳层不均匀，清洗力度需一致\n5. 磁性问题：钢件清洗后可能残留铁屑（磁性吸附），建议增加退磁工位。",
      tags: ["碳钢", "合金钢", "防锈", "材料兼容性", "退磁"],
      stageCode: "M3",
      processCode: "T2",
      source: "manual",
    },
    // 7. 碳氢溶剂选型
    {
      title: "碳氢溶剂清洗选型指南",
      category: "technical",
      content:
        "碳氢(Hydrocarbon)溶剂选型：\n\n1. 溶剂分类：\n   - 轻质碳氢（闪点40-60°C）：去油速度快，挥发快，但安全风险高\n   - 中质碳氢（闪点60-80°C）：平衡型，工业清洗主流\n   - 重质碳氢（闪点>80°C）：安全性好，但干燥慢\n2. 选型原则：\n   - KB值(Kauri-Butanol值)：衡量溶解力，>30适合重油污\n   - 表面张力：<25mN/m有利于细缝渗透\n   - 蒸馏范围：窄馏程产品纯度高，回收效率好\n3. 常用品牌/型号：\n   - Dowclene 1601: 改性醇，适合精密清洗\n   - 正庚烷: 实验室级别，高纯度\n   - IPC系列: 国产替代，性价比高\n4. 设备匹配：\n   - 碳氢清洗必须配备真空系统（防爆）\n   - 蒸馏回收系统可将溶剂回收率提升至>95%\n   - 需安装活性炭尾气处理装置（VOC排放要求）\n5. 安全要求：\n   - 设备需防爆认证（ATEX/IECEx）\n   - 氧含量监测：工作腔O₂<8%（充氮保护）\n   - 静电接地：所有管路和容器必须接地。",
      tags: ["碳氢溶剂", "选型", "KB值", "防爆", "VOC", "真空清洗"],
      stageCode: "M3",
      processCode: "T3",
      source: "manual",
    },
    // 8. 真空干燥最佳实践
    {
      title: "真空干燥工艺最佳实践",
      category: "process",
      content:
        "工业零件清洗后真空干燥工艺：\n\n1. 原理：降低气压使水的沸点下降，加速蒸发，避免水渍残留\n2. 关键参数：\n   - 真空度：≤50mbar（水在50mbar下约33°C沸腾）\n   - 温度：60-120°C（根据工件材质和清洗介质选择）\n   - 时间：3-15分钟（取决于工件复杂度和含水量）\n   - 抽真空速率：<30秒达到目标真空度（需匹配真空泵能力）\n3. 工艺流程：\n   ① 工件进入干燥腔 → ② 关闭腔门密封 → ③ 加热至目标温度\n   → ④ 抽真空至目标压力 → ⑤ 保持真空干燥 → ⑥ 破真空进气\n   → ⑦ 取出工件\n4. 常见问题与对策：\n   - 盲孔/细缝残留水：增加脉冲真空（交替抽真空-破真空2-3次）\n   - 表面水渍/白斑：提高真空度或增加热风预吹\n   - 真空泵油乳化：定期更换泵油，加装油水分离器\n5. 碳氢溶剂干燥特殊要求：\n   - 真空度需更低（≤10mbar）以确保溶剂完全蒸发\n   - 冷凝回收系统温度：-15°C至-25°C\n   - 残留检测：使用红外光谱或重量法确认溶剂残留<1ppm。",
      tags: ["真空干燥", "干燥工艺", "脉冲真空", "盲孔", "冷凝回收"],
      stageCode: "M4",
      processCode: "T5",
      source: "manual",
    },
    // 9. BOM准确性检查清单
    {
      title: "BOM准确性检查清单（清洗设备专用）",
      category: "process",
      content:
        "GRT清洗设备BOM检查清单：\n\n1. 结构件检查：\n   □ 清洗腔体材质(304/316L)与图纸一致\n   □ 腔体尺寸容差±2mm\n   □ 焊接等级标注（食品级需抛光Ra≤0.8μm）\n2. 泵阀系统：\n   □ 清洗泵型号/流量/扬程与工艺计算匹配\n   □ 高压泵柱塞材质与介质兼容\n   □ 阀门耐压等级≥1.5倍工作压力\n   □ 密封件材质与溶剂兼容（碳氢用FKM，水基用EPDM）\n3. 电气控制：\n   □ PLC型号与程序版本匹配\n   □ 变频器功率匹配电机（余量≥20%）\n   □ 安全继电器和急停回路完整\n   □ 传感器数量和位置与PLC I/O表一致\n4. 管路系统：\n   □ 管径与流量匹配（流速：液体1-3m/s，气体5-15m/s）\n   □ 管材与介质兼容\n   □ 法兰/快接规格统一\n5. 常见BOM错误：\n   - 标准件规格写错（如M8写成M6）\n   - 遗漏密封件/紧固件\n   - 电气元件品牌替代未经确认\n   - 外购件交期未确认影响整机交期。",
      tags: ["BOM", "检查清单", "泵阀", "电气", "管路", "清洗设备"],
      stageCode: "M4",
      processCode: "T4",
      source: "manual",
    },
    // 10. 清洗机常见设计陷阱
    {
      title: "清洗机设计常见陷阱与规避方案",
      category: "faq",
      content:
        "GRT清洗设备设计中的常见陷阱：\n\n1. 清洗腔体排液不畅\n   ❌ 陷阱：腔体底部平面设计，残液无法完全排出\n   ✅ 方案：底部做3-5°倾斜，排液口设在最低点\n\n2. 喷嘴布局不合理\n   ❌ 陷阱：喷嘴间距过大，存在清洗盲区\n   ✅ 方案：进行喷淋覆盖仿真，确保重叠率≥20%\n\n3. 过滤系统容量不足\n   ❌ 陷阱：过滤器选型仅考虑流量，未考虑容尘量\n   ✅ 方案：容尘量按连续运行8小时计算，设双联过滤器\n\n4. 传输系统与清洗节拍不匹配\n   ❌ 陷阱：传送速度固定，无法适应不同工件\n   ✅ 方案：变频调速+编码器定位，支持配方化参数\n\n5. 油水分离能力不足\n   ❌ 陷阱：仅靠重力分离，乳化油无法分离\n   ✅ 方案：配置带式撇油器+聚结过滤器，处理乳化油\n\n6. 维护可达性差\n   ❌ 陷阱：内部泵阀更换需拆卸大量结构件\n   ✅ 方案：侧板快拆设计，关键部件留维修空间≥500mm\n\n7. 防腐设计不到位\n   ❌ 陷阱：碳钢底架在潮湿环境快速锈蚀\n   ✅ 方案：底架304不锈钢或热镀锌+环氧底漆。",
      tags: ["设计陷阱", "排液", "喷嘴布局", "过滤", "油水分离", "维护性"],
      stageCode: "M2",
      processCode: "T2",
      source: "manual",
    },
    // 11. IC-1800 项目参考
    {
      title: "历史项目参考 - IC-1800 发动机缸体清洗线",
      category: "case_study",
      content:
        "项目编号：IC-1800\n客户：某合资汽车主机厂\n产品：1.5T发动机铝合金缸体\n\n1. 项目概况：\n   - 清洗对象：ADC12压铸缸体，年产能18万件\n   - 清洁度要求：ISO 16232 A(D22/E16/F11/G6)，最大颗粒≤400μm\n   - 节拍：60秒/件\n2. 清洗工艺方案：\n   高压定点冲洗(80bar) → 全浸超声波清洗(40kHz) → 漂洗×2 → 真空干燥\n3. 关键技术决策：\n   - 选择40kHz超声波（vs 28kHz），避免缸体薄壁损伤\n   - 高压喷嘴采用碳化钨材质，寿命达12个月\n   - 真空干燥增加脉冲功能，解决油道盲孔残留\n4. 项目经验教训：\n   - 初期BOM中超声波振板功率计算偏低20%，M4阶段追加\n   - 过滤器选型未考虑铝屑特性（轻质漂浮），增加浮油撇除器\n   - 客户FAT清洁度测试用新品件（无油），与量产有差异，SAT补测\n5. 交付成果：\n   - 设备整体尺寸：12m×3m×2.5m\n   - 总功率：85kW\n   - 从M0到交付：7个月。",
      tags: ["IC-1800", "缸体", "清洗线", "超声波", "案例"],
      stageCode: "M0",
      source: "manual",
    },
    // 12. IC-1650 项目参考
    {
      title: "历史项目参考 - IC-1650 变速箱壳体碳氢清洗机",
      category: "case_study",
      content:
        "项目编号：IC-1650\n客户：国内自主品牌变速箱厂\n产品：DCT变速箱铝合金壳体\n\n1. 项目概况：\n   - 清洗对象：铝合金压铸壳体，年产能16.5万件\n   - 清洁度要求：VDA 19 等级，最大颗粒≤200μm，总质量≤1mg\n   - 节拍：45秒/件\n2. 清洗工艺方案：\n   碳氢真空浸洗 → 碳氢超声波清洗 → 碳氢蒸汽脱脂 → 真空干燥\n3. 关键技术决策：\n   - 选用改性醇溶剂（Dowclene 1601），兼顾去油和低毒性\n   - 全真空环境运行，氧含量<5%\n   - 蒸馏回收率达97%，溶剂年消耗仅200L\n4. 项目经验教训：\n   - 真空泵选型偏小，抽气时间超标 → M3阶段升级为旋片泵+罗茨泵组合\n   - 冷凝器面积不足，溶剂回收率仅90% → 增加二级冷凝\n   - 客户现场电源波动大(±15%)，增加稳压器保护变频器\n5. 交付成果：\n   - 设备占地：4m×2.5m×2.8m（紧凑型全封闭）\n   - 总功率：45kW\n   - 从M0到交付：6个月。",
      tags: ["IC-1650", "变速箱", "碳氢清洗", "真空", "案例"],
      stageCode: "M0",
      source: "manual",
    },
    // 13. IC-2000 项目参考
    {
      title: "历史项目参考 - IC-2000 新能源电驱壳体清洗线",
      category: "case_study",
      content:
        "项目编号：IC-2000\n客户：新能源汽车Tier1供应商\n产品：电驱动系统铝合金壳体（含电机壳+减速器壳）\n\n1. 项目概况：\n   - 清洗对象：铝合金压铸壳体，年产能20万套（40万件）\n   - 清洁度要求：最大颗粒≤300μm，纤维≤500μm，总质量≤2mg\n   - 节拍：30秒/件（双工位并行）\n2. 清洗工艺方案：\n   高压定点(120bar) → 全浸浸泡 → 超声波(40kHz) → 高压漂洗(50bar)\n   → DI水终漂 → 热风吹干 → 真空干燥\n3. 关键技术决策：\n   - 双工位设计满足高节拍，共用液路系统降低成本\n   - 采用机器人上下料（FANUC M-20iD），实现全自动化\n   - 在线颗粒计数器实时监控清洗液颗粒度\n4. 项目经验教训：\n   - 电驱壳体散热翅片间隙小(2mm)，标准喷嘴无法清洗到位 → 定制窄角喷嘴\n   - 机器人定位精度±0.1mm与清洗夹具配合需现场调试\n   - DI水系统产能力未留余量，高峰期水质不达标 → 增加EDI模块\n5. 交付成果：\n   - 设备整体尺寸：18m×4m×3m\n   - 总功率：150kW\n   - 从M0到交付：9个月。",
      tags: ["IC-2000", "电驱", "新能源", "双工位", "机器人", "案例"],
      stageCode: "M0",
      source: "manual",
    },
    // 14. 铝合金清洗通用指南
    {
      title: "铝合金零件清洗通用工艺指南",
      category: "material",
      content:
        "铝合金零件清洗通用指南：\n\n1. 常见铝合金：ADC12、A380、AlSi9Cu3、6061-T6、7075\n2. 清洗难点：\n   - 铝的两性金属特性：强酸强碱均会腐蚀\n   - 安全pH范围：5-10\n   - 铸造铝多孔结构容易嵌入颗粒\n3. 推荐清洗介质：\n   - 弱碱性水基(pH 8-10)：通用去油，添加铝缓蚀剂\n   - 碳氢溶剂：精密清洗首选，无腐蚀风险\n   - 超临界CO2：新兴技术，零残留\n4. 清洗温度控制：\n   - 水基：45-60°C（超过65°C铝表面氧化加剧）\n   - 碳氢：室温-60°C\n5. 干燥注意事项：\n   - 铸铝多孔性强，残留水分难干燥\n   - 建议采用真空干燥+脉冲模式\n   - 干燥后目测检查：无水渍、无白斑、无变色\n6. 质量控制：\n   - 清洗后2小时内完成清洁度检测\n   - 保存清洗液浓度记录和温度记录\n   - 每班首件需做清洁度抽检。",
      tags: ["铝合金", "清洗工艺", "pH控制", "腐蚀", "真空干燥"],
      stageCode: "M3",
      processCode: "T3",
      source: "manual",
    },
    // 15. M0阶段技术评审要点
    {
      title: "M0阶段（项目启动）技术评审要点",
      category: "process",
      content:
        "M0项目启动阶段技术评审检查要点：\n\n1. 客户需求确认：\n   □ 清洗工件明确（材质、尺寸、重量、年产量）\n   □ 清洁度要求明确（标准、等级、检测方法）\n   □ 节拍要求确认（件/分钟或秒/件）\n   □ 设备布局空间确认（场地图纸）\n2. 技术可行性评估：\n   □ 类似项目经验检索（知识库查询）\n   □ 关键工艺参数初步确定（压力、温度、时间）\n   □ 特殊难点识别（异形工件、高清洁度、超短节拍）\n   □ 初步工艺方案（至少2种方案对比）\n3. 风险评估：\n   □ 技术风险：是否涉及新工艺/新材料\n   □ 交期风险：长交期外购件识别（>6周）\n   □ 成本风险：初步成本估算 vs 客户预算\n4. M0评审输出物：\n   - 项目任务书（PTS）\n   - 初步工艺方案\n   - 风险登记表\n   - 初步项目计划（里程碑时间线）\n5. M0 → M1的门径条件：\n   - 客户需求已签字确认\n   - 技术方案可行性确认（总工签字）\n   - 项目预算初步审批。",
      tags: ["M0", "项目启动", "技术评审", "可行性", "风险评估"],
      stageCode: "M0",
      source: "manual",
    },
    // 16. M3阶段设计评审要点
    {
      title: "M3阶段（详细设计）评审检查清单",
      category: "process",
      content:
        "M3阶段详细设计评审要点：\n\n1. 机械设计评审：\n   □ 3D模型完整，所有零件均已建模\n   □ 干涉检查通过（运动部件全行程检查）\n   □ 关键尺寸公差标注完整\n   □ 焊接图纸含焊缝等级标注\n   □ 标准件选型表确认\n2. 工艺设计评审：\n   □ 清洗工艺参数表完整（压力、温度、时间、浓度）\n   □ 液路原理图与实际管路一致\n   □ 过滤精度与清洁度要求匹配\n   □ 工艺试验报告（客户样件清洗测试结果）\n3. 电气控制评审：\n   □ 电气原理图完整\n   □ PLC I/O分配表确认\n   □ HMI界面设计稿确认\n   □ 安全回路设计符合CE/机械安全指令\n4. BOM评审：\n   □ BOM与图纸一致性检查（运行BOM检查工具）\n   □ 外购件交期确认\n   □ 替代件方案标注\n5. M3评审输出物：\n   - 完整图纸包（PDF + 原始格式）\n   - 最终BOM（含成本）\n   - 电气原理图 + PLC程序框架\n   - 外购件清单及交期表\n6. M3 → M4的门径条件：\n   - 所有评审问题关闭或有明确计划\n   - BOM冻结（变更需走ECN流程）\n   - 长交期件已下单。",
      tags: ["M3", "详细设计", "评审", "BOM冻结", "ECN"],
      stageCode: "M3",
      source: "manual",
    },
    // 17. 超声波清洗频率选择
    {
      title: "超声波清洗频率选择指南",
      category: "technical",
      content:
        "超声波清洗频率选择：\n\n1. 频率与空化效应：\n   - 低频(25-28kHz)：空化泡大，冲击力强，适合重油污和颗粒去除\n   - 中频(40kHz)：平衡型，最常用工业频率\n   - 高频(80-120kHz)：空化泡小而密，适合精密清洗，表面损伤小\n   - 兆频(>1MHz)：仅用于半导体晶圆等超精密清洗\n2. 应用场景对应：\n   - 发动机缸体/缸盖：28-40kHz\n   - 变速箱壳体：40kHz\n   - 液压阀体：40-80kHz\n   - 燃油喷射器：80-120kHz\n   - 医疗器械：40-80kHz\n3. 功率密度：\n   - 一般清洗：10-20W/L\n   - 强力清洗：20-40W/L\n   - 精密清洗：5-15W/L\n4. 注意事项：\n   - 铝合金薄壁件用28kHz可能导致空化损伤（erosion），建议≥40kHz\n   - 超声波盲区：需配合工件旋转或多面振板\n   - 脱气处理：新配清洗液需超声波脱气15-30分钟后再清洗\n5. 双频/变频技术：\n   - 双频切换(28+40kHz)：先低频去粗颗粒，再高频精洗\n   - 扫频(sweep)：±2-5kHz范围内扫描，消除驻波死角。",
      tags: ["超声波", "频率", "空化", "功率密度", "kHz"],
      stageCode: "M3",
      processCode: "T3",
      source: "manual",
    },
    // 18. 水基清洗剂浓度管理
    {
      title: "水基清洗剂浓度监测与管理规范",
      category: "process",
      content:
        "水基清洗剂浓度管理：\n\n1. 浓度检测方法：\n   - 折光仪（Brix）：快速现场检测，精度±0.5%\n   - 滴定法：准确，适合碱性清洗剂（酸碱滴定）\n   - 电导率法：在线监测，需建立浓度-电导率对应曲线\n2. 日常管理：\n   - 每班至少检测1次浓度\n   - 浓度偏差超过±10%需调整\n   - 补液原则：少量多次，避免冲击\n3. 清洗液寿命管理：\n   - 监测指标：浓度、pH、油含量、菌落数、清洗效果\n   - 换液标准：\n     · 油含量>2%(重量) → 换液\n     · 细菌>10⁶CFU/mL → 换液或加杀菌剂\n     · 清洁度不达标且调整参数无效 → 换液\n4. 自动补液系统：\n   - 在线浓度传感器(电导率/折光) + 比例泵\n   - PLC自动计算补加量\n   - 报警设置：浓度超上下限±20%报警\n5. 记录要求：\n   - 每次检测结果记录（时间、操作员、数值）\n   - 换液记录（原因、旧液处置方式）\n   - 数据趋势分析，预测换液周期。",
      tags: ["水基清洗", "浓度", "折光仪", "滴定", "换液", "监测"],
      stageCode: "M6",
      processCode: "T8",
      source: "manual",
    },
    // 19. FAT/SAT验收流程
    {
      title: "清洗设备FAT/SAT验收流程与要点",
      category: "process",
      content:
        "清洗设备工厂验收(FAT)与现场验收(SAT)流程：\n\n1. FAT（工厂验收测试）：\n   地点：GRT工厂\n   内容：\n   □ 外观检查：焊缝质量、表面处理、铭牌标识\n   □ 尺寸检查：整机尺寸与图纸一致（±5mm）\n   □ 功能测试：所有工位运行正常，参数可调\n   □ 安全测试：急停、安全门联锁、漏电保护\n   □ 清洁度测试：使用客户提供的样件，达到规定清洁度等级\n   □ 节拍测试：连续运行≥30分钟，节拍偏差<±5%\n   □ 噪声测试：距设备1m处≤80dB(A)\n2. SAT（现场验收测试）：\n   地点：客户工厂\n   内容：\n   □ 安装检查：基础、定位、管路接口\n   □ 调试确认：参数与FAT一致\n   □ 量产件清洁度测试（≥5件）\n   □ 连续运行测试：≥4小时无故障\n   □ 操作培训：操作员、维护人员\n   □ 文档移交：操作手册、维护手册、电气图纸、备件清单\n3. 常见验收问题：\n   - FAT用新品测试与量产件(含油/屑)差异大 → 建议FAT阶段模拟实际工况\n   - 现场水质/电源与FAT条件不同 → SAT前确认现场条件\n   - 操作员培训不到位 → 提供视频教程+中文操作手册。",
      tags: ["FAT", "SAT", "验收", "清洁度测试", "节拍测试"],
      stageCode: "M8",
      processCode: "T12",
      source: "manual",
    },
    // 20. T1-T15生产流程总览
    {
      title: "T1-T15生产执行流程总览",
      category: "process",
      content:
        "GRT清洗设备T1-T15生产执行流程：\n\n T1  BOM确认与物料齐套\n   - 核对设计BOM与生产BOM一致性\n   - 长交期件到货确认\n   - 物料齐套率≥95%方可开工\n\n T2  下料与备料\n   - 板材/型材下料，激光切割/锯切\n   - 标准件领料\n\n T3  腔体焊接\n   - 清洗腔体/框架焊接\n   - 焊缝检测（目测+探伤）\n   - 关键尺寸检验\n\n T4  机加工\n   - 腔体/安装板机加工\n   - 密封面精度Ra≤1.6μm\n\n T5  表面处理\n   - 腔体内壁抛光（清洗液接触面）\n   - 外部喷涂/钝化\n\n T6  机械装配\n   - 腔体组装、管路安装\n   - 传动机构安装调试\n\n T7  电气安装\n   - 电柜接线、传感器安装\n   - PLC程序下载\n\n T8  管路安装\n   - 液路/气路安装\n   - 打压测试（1.5倍工作压力）\n\n T9  整机调试\n   - 单机运行测试\n   - 参数调优\n\n T10 工艺验证\n   - 使用样件进行清洗测试\n   - 清洁度检测\n\n T11 安全检查\n   - CE/安全合规检查\n   - 风险评估确认\n\n T12 FAT验收\n   - 客户到场验收\n   - 整改闭环\n\n T13 包装发运\n   - 防护包装、装箱清单\n   - 运输方案确认\n\n T14 现场安装\n   - 安装就位、管路对接\n   - 电气接入\n\n T15 SAT验收\n   - 现场调试\n   - 量产件验证\n   - 文档移交、培训。",
      tags: ["T1-T15", "生产流程", "装配", "调试", "验收"],
      source: "manual",
    },
  ];

  const values = seedData.map((item) => ({
    title: item.title,
    category: item.category,
    content: item.content,
    tags: JSON.stringify(item.tags),
    projectId: null,
    stageCode: item.stageCode ?? null,
    processCode: item.processCode ?? null,
    source: item.source,
    relevanceScore: 0,
    createdBy: createdBy,
    createdAt: now,
    updatedAt: now,
  }));

  await db.insert(knowledgeDocuments).values(values);

  return {
    seeded: true,
    message: `已预填充 ${values.length} 条GRT技术知识`,
    count: values.length,
  };
}

// ============================================================
// RAG Training Center – Parse & Ingest
// ============================================================

export interface ParsedSegment {
  title: string;
  content: string;
  suggestedCategory: string;
  suggestedTags: string[];
}

/**
 * 解析上传内容，按文件类型拆分为结构化段落
 */
export function parseUploadedContent(
  content: string,
  fileName: string,
  fileType: string
): { segments: ParsedSegment[] } {
  let rawSegments: string[] = [];

  const ext = fileType.toLowerCase().replace(/^\./, "");

  switch (ext) {
    case "csv":
    case "tsv": {
      const sep = ext === "tsv" ? "\t" : ",";
      const lines = content.split(/\r?\n/).filter((l) => l.trim());
      // first row as header
      const header = lines[0] ?? "";
      const rows = lines.slice(1);
      // batch rows into groups of ~10 rows per segment
      const batchSize = 10;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        rawSegments.push(header + "\n" + batch.join("\n"));
      }
      break;
    }
    case "json": {
      try {
        const parsed = JSON.parse(content);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          const textFields = extractTextFields(item);
          if (textFields.length > 0) {
            rawSegments.push(textFields.join("\n"));
          }
        }
      } catch {
        rawSegments = chunkText(content, 800);
      }
      break;
    }
    case "txt":
    case "md":
    case "markdown":
    default: {
      rawSegments = chunkText(content, 800);
      break;
    }
  }

  if (rawSegments.length === 0 && content.trim()) {
    rawSegments = chunkText(content, 800);
  }

  const baseName = fileName.replace(/\.[^.]+$/, "");
  const segments: ParsedSegment[] = rawSegments.map((seg, idx) => {
    const firstLine = seg.split(/\r?\n/)[0]?.trim().slice(0, 80) || "";
    const title =
      rawSegments.length === 1
        ? baseName
        : `${baseName} - 段落${idx + 1}${firstLine ? ": " + firstLine : ""}`;
    return {
      title,
      content: seg,
      suggestedCategory: guessCategory(seg),
      suggestedTags: guessTags(seg),
    };
  });

  return { segments };
}

/**
 * 批量入库确认后的段落
 */
export async function ingestConfirmedSegments(
  segments: Array<{
    title: string;
    content: string;
    category: string;
    tags: string[];
  }>,
  createdBy: number
): Promise<{ count: number }> {
  const db = await requireDb();
  const { knowledgeDocuments } = await import("../../drizzle/schema");
  const now = new Date().toISOString();

  const values = segments.map((seg) => ({
    title: seg.title,
    category: seg.category,
    content: seg.content,
    tags: JSON.stringify(seg.tags),
    projectId: null,
    stageCode: null,
    processCode: null,
    source: "manual",
    relevanceScore: 0,
    createdBy,
    createdAt: now,
    updatedAt: now,
  }));

  if (values.length > 0) {
    await db.insert(knowledgeDocuments).values(values);
  }

  return { count: values.length };
}

/**
 * 获取知识库训练统计数据
 */
export async function getTrainingStats() {
  const db = await requireDb();
  const { knowledgeDocuments } = await import("../../drizzle/schema");

  const totalResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(knowledgeDocuments);
  const total = totalResult[0]?.count ?? 0;

  const categoryResult = await db
    .select({
      category: knowledgeDocuments.category,
      count: sql<number>`count(*)::int`,
    })
    .from(knowledgeDocuments)
    .groupBy(knowledgeDocuments.category);

  const sourceResult = await db
    .select({
      source: knowledgeDocuments.source,
      count: sql<number>`count(*)::int`,
    })
    .from(knowledgeDocuments)
    .groupBy(knowledgeDocuments.source);

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const weekResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(knowledgeDocuments)
    .where(sql`${knowledgeDocuments.createdAt} >= ${oneWeekAgo}`);
  const thisWeek = weekResult[0]?.count ?? 0;

  const recentResult = await db
    .select()
    .from(knowledgeDocuments)
    .orderBy(desc(knowledgeDocuments.createdAt))
    .limit(5);

  return {
    total,
    thisWeek,
    byCategory: categoryResult.map((r) => ({
      category: r.category,
      count: r.count,
    })),
    bySource: sourceResult.map((r) => ({
      source: r.source,
      count: r.count,
    })),
    recentAdditions: recentResult.map(parseTags),
  };
}

// ============================================================
// RAG Training Helpers
// ============================================================

function chunkText(text: string, targetSize: number): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";
  for (const para of paragraphs) {
    if (current.length + para.length > targetSize && current.length > 0) {
      chunks.push(current.trim());
      current = "";
    }
    current += (current ? "\n\n" : "") + para;
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }
  // If any chunk is still too large, split by sentences
  const finalChunks: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length > targetSize * 1.5) {
      const sentences = chunk.split(/(?<=[。！？.!?\n])/);
      let sub = "";
      for (const s of sentences) {
        if (sub.length + s.length > targetSize && sub.length > 0) {
          finalChunks.push(sub.trim());
          sub = "";
        }
        sub += s;
      }
      if (sub.trim()) finalChunks.push(sub.trim());
    } else {
      finalChunks.push(chunk);
    }
  }
  return finalChunks.length > 0 ? finalChunks : [text.trim()];
}

function extractTextFields(obj: any, depth = 0): string[] {
  if (depth > 5) return [];
  const texts: string[] = [];
  if (typeof obj === "string" && obj.length > 10) {
    texts.push(obj);
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      texts.push(...extractTextFields(item, depth + 1));
    }
  } else if (typeof obj === "object" && obj !== null) {
    for (const val of Object.values(obj)) {
      texts.push(...extractTextFields(val, depth + 1));
    }
  }
  return texts;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  technical: ["技术", "参数", "设计", "原理", "规格", "specification", "technical", "喷嘴", "超声波", "频率", "压力"],
  process: ["工艺", "流程", "步骤", "操作", "SOP", "process", "BOM", "装配", "调试", "工序"],
  material: ["材料", "材质", "合金", "钢", "铝", "塑料", "material", "兼容性", "腐蚀"],
  standard: ["标准", "ISO", "VDA", "DIN", "GB", "standard", "规范", "法规", "认证"],
  case_study: ["项目", "案例", "IC-", "经验", "教训", "case", "project", "历史"],
  faq: ["常见问题", "FAQ", "问答", "陷阱", "注意事项", "tips", "故障"],
};

function guessCategory(text: string): string {
  const lower = text.toLowerCase();
  let best = "technical";
  let bestScore = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }
  return best;
}

const TAG_PATTERNS = [
  "清洗", "喷嘴", "超声波", "真空", "干燥", "BOM", "FAT", "SAT",
  "ISO", "VDA", "清洁度", "材料", "铝合金", "碳钢", "溶剂", "碳氢",
  "防锈", "压力", "温度", "浓度", "过滤", "工艺", "设计", "验收",
  "PLC", "电气", "机械", "液压", "管路", "密封", "安全", "质检",
];

function guessTags(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const tag of TAG_PATTERNS) {
    if (lower.includes(tag.toLowerCase()) && found.length < 6) {
      found.push(tag);
    }
  }
  return found;
}

// ============================================================
// Helpers
// ============================================================

function parseTags(row: any) {
  if (!row) return row;
  return {
    ...row,
    tags: row.tags ? safeParseJSON(row.tags) : [],
  };
}

function safeParseJSON(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return [];
  }
}

function countOccurrences(text: string, search: string): number {
  if (!search || search.length === 0) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(search, pos)) !== -1) {
    count++;
    pos += search.length;
  }
  return count;
}
