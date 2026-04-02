/**
 * Create annual goal + consultant agent tables + seed Liu Kun data
 */
const pg = require("pg");

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:Gerry123456@localhost:5432/grt_system";

async function main() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    // ── Create annual goal tables ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS annual_goal_agreements (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        employee_name VARCHAR(100) NOT NULL,
        employee_open_id VARCHAR(50),
        manager_id INTEGER NOT NULL,
        manager_name VARCHAR(100) NOT NULL,
        year INTEGER NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'draft',
        version INTEGER NOT NULL DEFAULT 1,
        base_salary_grade VARCHAR(20),
        base_salary_snapshot DECIMAL(14,2),
        career_path_option_json JSON,
        career_path_accepted BOOLEAN DEFAULT false,
        performance_levels_json JSON NOT NULL DEFAULT '[{"level":"D","code":"D","bonusMonths":0},{"level":"C","code":"C","bonusMonths":1},{"level":"B","code":"B","bonusMonths":2},{"level":"A","code":"A","bonusMonths":3}]',
        bonus_cap_months DECIMAL(4,1) DEFAULT 3.0,
        projected_bonus_months DECIMAL(4,1) DEFAULT 0.0,
        total_weight_validation DECIMAL(5,2) DEFAULT 0.00,
        deliverable_deadline TIMESTAMP,
        deliverable_description TEXT,
        communication_channel VARCHAR(30) DEFAULT 'email',
        signed_by_employee BOOLEAN DEFAULT false,
        signed_by_manager BOOLEAN DEFAULT false,
        employee_signed_at TIMESTAMP,
        manager_signed_at TIMESTAMP,
        document_url TEXT,
        department VARCHAR(100),
        bu_code VARCHAR(50),
        notes TEXT,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(employee_id, year)
      )
    `);
    console.log("[OK] annual_goal_agreements");

    await client.query(`
      CREATE TABLE IF NOT EXISTS annual_goal_dimensions (
        id SERIAL PRIMARY KEY,
        agreement_id INTEGER NOT NULL,
        dimension_name VARCHAR(200) NOT NULL,
        dimension_name_en VARCHAR(200),
        dimension_code VARCHAR(50) NOT NULL,
        weight DECIMAL(5,2) NOT NULL,
        description TEXT,
        kpi_targets_json JSON,
        current_score DECIMAL(5,2) DEFAULT 0.00,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(agreement_id, dimension_code)
      )
    `);
    console.log("[OK] annual_goal_dimensions");

    await client.query(`
      CREATE TABLE IF NOT EXISTS annual_goal_checkpoints (
        id SERIAL PRIMARY KEY,
        agreement_id INTEGER NOT NULL,
        checkpoint_type VARCHAR(20) NOT NULL,
        scheduled_date TIMESTAMP NOT NULL,
        actual_date TIMESTAMP,
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        overall_score DECIMAL(5,2),
        performance_level_code VARCHAR(5),
        dimension_scores_json JSON,
        manager_comments TEXT,
        employee_self_assessment TEXT,
        projected_bonus_months DECIMAL(4,1),
        reviewed_by INTEGER,
        reviewed_by_name VARCHAR(100),
        attachments JSON,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(agreement_id, checkpoint_type)
      )
    `);
    console.log("[OK] annual_goal_checkpoints");

    await client.query(`
      CREATE TABLE IF NOT EXISTS annual_goal_adjustments (
        id SERIAL PRIMARY KEY, agreement_id INTEGER NOT NULL,
        adjustment_type VARCHAR(30) NOT NULL, reason TEXT NOT NULL,
        trigger_event VARCHAR(200), status VARCHAR(30) DEFAULT 'draft',
        previous_state_json JSON NOT NULL, proposed_state_json JSON NOT NULL,
        requested_by INTEGER NOT NULL, requested_by_name VARCHAR(100),
        approved_by INTEGER, approved_by_name VARCHAR(100), approved_at TIMESTAMP,
        rejection_reason TEXT, effective_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("[OK] annual_goal_adjustments");

    await client.query(`
      CREATE TABLE IF NOT EXISTS annual_goal_audit_log (
        id SERIAL PRIMARY KEY, agreement_id INTEGER NOT NULL,
        action VARCHAR(50) NOT NULL, previous_value JSON, new_value JSON,
        changed_by INTEGER NOT NULL, changed_by_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("[OK] annual_goal_audit_log");

    await client.query(`
      CREATE TABLE IF NOT EXISTS annual_goal_messages (
        id SERIAL PRIMARY KEY, agreement_id INTEGER NOT NULL,
        thread_id VARCHAR(50), sender_id INTEGER NOT NULL, sender_name VARCHAR(100),
        message_type VARCHAR(30) DEFAULT 'text', content TEXT NOT NULL,
        attachments JSON, is_read BOOLEAN DEFAULT false, read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("[OK] annual_goal_messages");

    await client.query(`
      CREATE TABLE IF NOT EXISTS annual_incentive_projections (
        id SERIAL PRIMARY KEY, agreement_id INTEGER NOT NULL,
        calculated_at TIMESTAMP DEFAULT NOW(), trigger_type VARCHAR(30) NOT NULL,
        base_salary DECIMAL(14,2), composite_score DECIMAL(5,2),
        performance_level_code VARCHAR(5), bonus_months DECIMAL(4,1),
        career_multiplier DECIMAL(4,2) DEFAULT 1.00,
        salary_adjustment_pct DECIMAL(5,2) DEFAULT 0.00,
        projected_bonus_amount DECIMAL(14,2), projected_new_salary DECIMAL(14,2),
        dimension_breakdown_json JSON, calculation_details_json JSON,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("[OK] annual_incentive_projections");

    // ── Create consultant agent tables ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_persona_profiles (
        id SERIAL PRIMARY KEY, employee_id INTEGER NOT NULL,
        employee_name VARCHAR(100) NOT NULL, employee_code VARCHAR(30),
        department VARCHAR(100), position VARCHAR(100), year INTEGER NOT NULL,
        interview_commitments_json JSON, hire_date TIMESTAMP, interview_notes TEXT,
        persona_score DECIMAL(5,2) DEFAULT 50.00,
        persona_tier VARCHAR(10) DEFAULT 'mid',
        motivation_score DECIMAL(5,2) DEFAULT 50.00,
        team_interaction_score DECIMAL(5,2) DEFAULT 50.00,
        client_recognition_score DECIMAL(5,2) DEFAULT 50.00,
        peer_approval_score DECIMAL(5,2) DEFAULT 50.00,
        manager_confidence_score DECIMAL(5,2) DEFAULT 50.00,
        personality_traits_json JSON,
        communication_style VARCHAR(30) DEFAULT 'balanced',
        preferred_feedback_mode VARCHAR(30) DEFAULT 'mixed',
        emotional_resilience VARCHAR(20) DEFAULT 'moderate',
        yearly_performance_summary_json JSON, career_aspirations TEXT, long_term_goal TEXT,
        updated_by INTEGER, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(employee_id, year)
      )
    `);
    console.log("[OK] employee_persona_profiles");

    await client.query(`
      CREATE TABLE IF NOT EXISTS consultant_agent_outputs (
        id SERIAL PRIMARY KEY, employee_id INTEGER NOT NULL,
        output_type VARCHAR(30) NOT NULL, channel VARCHAR(20) DEFAULT 'in_system',
        title VARCHAR(200), content TEXT NOT NULL, content_structured_json JSON,
        context_sources_json JSON, related_goal_agreement_id INTEGER, related_checkpoint_id INTEGER,
        persona_tier_at_time VARCHAR(10), strategy_applied VARCHAR(50), tone_profile VARCHAR(30),
        is_read BOOLEAN DEFAULT false, read_at TIMESTAMP,
        feedback_rating INTEGER, feedback_note TEXT, is_action_taken BOOLEAN DEFAULT false,
        scheduled_for TIMESTAMP, delivered_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("[OK] consultant_agent_outputs");

    await client.query(`
      CREATE TABLE IF NOT EXISTS consultant_strategy_configs (
        id SERIAL PRIMARY KEY, persona_tier VARCHAR(10) NOT NULL UNIQUE,
        strategy_name VARCHAR(100) NOT NULL, description TEXT,
        daily_digest_enabled BOOLEAN DEFAULT true, weekly_plan_enabled BOOLEAN DEFAULT true,
        emotional_support_frequency VARCHAR(20) DEFAULT 'as_needed',
        proactive_guidance_level VARCHAR(20) DEFAULT 'moderate',
        tone_default VARCHAR(30), content_mix_json JSON, system_prompt_override TEXT,
        example_outputs_json JSON, is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("[OK] consultant_strategy_configs");

    await client.query(`
      CREATE TABLE IF NOT EXISTS consultant_agent_sessions (
        id SERIAL PRIMARY KEY, session_id VARCHAR(60) NOT NULL UNIQUE,
        employee_id INTEGER NOT NULL, topic VARCHAR(200),
        message_count INTEGER DEFAULT 0, status VARCHAR(20) DEFAULT 'active',
        last_message_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("[OK] consultant_agent_sessions");

    await client.query(`
      CREATE TABLE IF NOT EXISTS consultant_agent_messages (
        id SERIAL PRIMARY KEY, session_id VARCHAR(60) NOT NULL,
        role VARCHAR(20) NOT NULL, content TEXT NOT NULL, metadata JSON,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("[OK] consultant_agent_messages");

    // ══════════════════════════════════════════════════════
    // SEED: Liu Kun Annual Goal Agreement + Persona Profile
    // ══════════════════════════════════════════════════════

    const LK_EMPLOYEE_ID = 166;
    const LK_NAME = "刘坤";
    const CEO_ID = 12;
    const CEO_NAME = "倪亚东";
    const YEAR = 2026;

    // ── 1. Annual Goal Agreement ──
    const perfLevels = JSON.stringify([
      { level: "差", code: "D", bonusMonths: 0, thresholdMin: 0 },
      { level: "中", code: "C", bonusMonths: 1, thresholdMin: 40 },
      { level: "良", code: "B", bonusMonths: 2, thresholdMin: 60 },
      { level: "优", code: "A", bonusMonths: 3, thresholdMin: 80 },
    ]);
    const careerPath = JSON.stringify({
      currentRole: "销售与项目工程师",
      upgradeRole: "销售与市场主管",
      upgradeTitle: "Sales & Marketing Supervisor",
      salaryDeltaPct: 20,
      bonusCapMultiplier: 2,
      requirements: "完成年度营销+销售双维度目标，获得客户高度认同",
    });

    // Delete old if exists
    await client.query(`DELETE FROM annual_goal_agreements WHERE employee_id = $1 AND year = $2`, [LK_EMPLOYEE_ID, YEAR]);

    const agRes = await client.query(`
      INSERT INTO annual_goal_agreements (
        employee_id, employee_name, employee_open_id, manager_id, manager_name, year,
        status, base_salary_grade, base_salary_snapshot,
        career_path_option_json, career_path_accepted,
        performance_levels_json, bonus_cap_months, projected_bonus_months,
        total_weight_validation,
        deliverable_deadline, deliverable_description, communication_channel,
        signed_by_employee, signed_by_manager, employee_signed_at, manager_signed_at,
        department, bu_code, notes, created_by
      ) VALUES (
        $1, $2, 'GRT083', $3, $4, $5,
        'active', '8', 8000.00,
        $6::json, false,
        $7::json, 3.0, 0.0,
        100.00,
        '2026-04-01', '工作规划与工作思路报告', 'email',
        true, true, NOW(), NOW(),
        'AI数智部', 'BU_OS', '重庆之行觉得有成为销售与市场主管、经理以至于高级经理、总监的潜力。目前维度70%营销+30%销售，差中良优对应0/1/2/3个月年度package。如按销售与市场主管目标定位，可翻倍最高6个月，基数有20%提高。', $3
      ) RETURNING id
    `, [LK_EMPLOYEE_ID, LK_NAME, CEO_ID, CEO_NAME, YEAR, careerPath, perfLevels]);

    const agreementId = agRes.rows[0].id;
    console.log(`[OK] Agreement created: id=${agreementId}`);

    // ── 2. Dimensions: 70% Marketing + 30% Sales ──
    await client.query(`DELETE FROM annual_goal_dimensions WHERE agreement_id = $1`, [agreementId]);

    await client.query(`
      INSERT INTO annual_goal_dimensions (agreement_id, dimension_name, dimension_name_en, dimension_code, weight, description, current_score, sort_order)
      VALUES
        ($1, '营销', 'Marketing', 'marketing', 70.00, '市场推广、品牌建设、客户开拓、展会参与、行业洞察', 65.00, 0),
        ($1, '销售', 'Sales', 'sales', 30.00, '订单转化、客户关系维护、报价跟进、合同签署', 55.00, 1)
    `, [agreementId]);
    console.log("[OK] Dimensions: 70% Marketing + 30% Sales");

    // ── 3. Checkpoints (Q1 already scored, rest scheduled) ──
    await client.query(`DELETE FROM annual_goal_checkpoints WHERE agreement_id = $1`, [agreementId]);

    await client.query(`
      INSERT INTO annual_goal_checkpoints (agreement_id, checkpoint_type, scheduled_date, status, overall_score, performance_level_code, actual_date, dimension_scores_json, manager_comments, reviewed_by, reviewed_by_name)
      VALUES ($1, 'Q1', '2026-03-31', 'completed', 62.00, 'B', '2026-03-28',
        $2::json,
        '重庆之行表现积极，客户沟通能力强，市场洞察有深度。销售转化需加强，建议多参与报价流程。',
        $3, $4)
    `, [agreementId,
      JSON.stringify([
        { dimensionName: "营销", weight: 70, score: 65, evidence: "重庆客户拜访4家，展会筹备2场，市场报告3份" },
        { dimensionName: "销售", weight: 30, score: 55, evidence: "报价跟进5个，成交1个，转化率需提升" },
      ]),
      CEO_ID, CEO_NAME]);

    // Scheduled future checkpoints
    await client.query(`
      INSERT INTO annual_goal_checkpoints (agreement_id, checkpoint_type, scheduled_date, status) VALUES
        ($1, 'Q2', '2026-06-30', 'scheduled'),
        ($1, 'mid_year', '2026-06-30', 'scheduled'),
        ($1, 'Q3', '2026-09-30', 'scheduled'),
        ($1, 'Q4', '2026-12-31', 'scheduled'),
        ($1, 'year_end', '2027-01-15', 'scheduled')
    `, [agreementId]);
    console.log("[OK] Checkpoints: Q1 completed + 5 scheduled");

    // ── 4. Incentive Projection (based on Q1 score) ──
    const compositeScore = 65 * 0.7 + 55 * 0.3; // = 62
    await client.query(`
      INSERT INTO annual_incentive_projections (
        agreement_id, trigger_type, base_salary, composite_score, performance_level_code,
        bonus_months, career_multiplier, salary_adjustment_pct,
        projected_bonus_amount, projected_new_salary, dimension_breakdown_json
      ) VALUES ($1, 'checkpoint', 8000.00, $2, 'B', 2.0, 1.0, 0.0, 16000.00, 8000.00,
        $3::json)
    `, [agreementId, compositeScore,
      JSON.stringify([
        { dimension: "营销", weight: "70.00", score: "65.00", weightedScore: "45.50" },
        { dimension: "销售", weight: "30.00", score: "55.00", weightedScore: "16.50" },
      ])]);
    console.log("[OK] Incentive projection: B级 2个月 (如接受升级路径→4个月)");

    // ── 5. Audit Log ──
    await client.query(`
      INSERT INTO annual_goal_audit_log (agreement_id, action, new_value, changed_by, changed_by_name) VALUES
        ($1, 'created', '{"status":"draft"}', $2, $3),
        ($1, 'signed', '{"status":"signed","signedByEmployee":true,"signedByManager":true}', $2, $3),
        ($1, 'status_changed', '{"status":"active","checkpointsScheduled":6}', $2, $3),
        ($1, 'checkpoint_completed', '{"checkpoint":"Q1","score":62,"level":"B"}', $2, $3)
    `, [agreementId, CEO_ID, CEO_NAME]);
    console.log("[OK] Audit log: 4 entries");

    // ══════════════════════════════════════════════════════
    // SEED: Liu Kun Persona Profile
    // ══════════════════════════════════════════════════════

    await client.query(`DELETE FROM employee_persona_profiles WHERE employee_id = $1 AND year = $2`, [LK_EMPLOYEE_ID, YEAR]);

    const traits = JSON.stringify({
      disc: "I",
      mbti: "ENFP",
      strengths: ["客户沟通能力强", "市场洞察敏锐", "学习能力快", "重庆之行表现突出"],
      growthAreas: ["销售转化率", "报价流程熟练度", "数据分析能力"],
    });
    const commitments = JSON.stringify([
      { commitment: "掌握完整的清洗设备销售流程", deadline: "2026-06", category: "skill", status: "进行中" },
      { commitment: "独立完成3个客户从线索到签约", deadline: "2026-12", category: "output", status: "进行中" },
      { commitment: "参与至少2场行业展会并产出市场报告", deadline: "2026-09", category: "output", status: "已完成1场" },
      { commitment: "建立华东区5家新客户关系", deadline: "2026-12", category: "output", status: "进行中" },
    ]);
    const yearlyPerf = JSON.stringify([
      {
        year: 2025,
        overallGrade: "B+",
        bonusMonths: 1.5,
        keyAchievements: ["快速学习产品知识", "参与重庆客户拜访获得好评", "市场报告质量提升"],
        keyGaps: ["销售闭环经验不足", "报价能力需加强"],
        managerComment: "有潜力，需要更多实战锻炼"
      }
    ]);

    // Persona scores: motivation 75, team 65, client 70, peer 60, manager 75
    // Weighted: 75*0.25 + 65*0.20 + 70*0.25 + 60*0.15 + 75*0.15 = 18.75+13+17.5+9+11.25 = 69.5
    await client.query(`
      INSERT INTO employee_persona_profiles (
        employee_id, employee_name, employee_code, department, position, year,
        interview_commitments_json, hire_date, interview_notes,
        persona_score, persona_tier,
        motivation_score, team_interaction_score, client_recognition_score,
        peer_approval_score, manager_confidence_score,
        personality_traits_json, communication_style, preferred_feedback_mode, emotional_resilience,
        yearly_performance_summary_json, career_aspirations, long_term_goal
      ) VALUES (
        $1, $2, 'GRT083', 'AI数智部', '销售与项目工程师', $3,
        $4::json, '2024-08-15', '面试表现积极，沟通能力强，对工业清洗行业有浓厚兴趣。承诺在1年内掌握完整销售流程。',
        69.50, 'mid',
        75.00, 65.00, 70.00, 60.00, 75.00,
        $5::json, 'direct', 'praise_first', 'moderate',
        $6::json,
        '成为销售与市场主管，逐步发展为经理、高级经理、总监',
        '在工业精密清洗领域成为资深销售与市场专家，带领团队开拓国内外市场'
      )
    `, [LK_EMPLOYEE_ID, LK_NAME, YEAR, commitments, traits, yearlyPerf]);
    console.log("[OK] Persona profile: score=69.5 tier=mid (接近high)");

    // ── 6. Seed daily digests (last 3 days) ──
    const digests = [
      {
        title: "3月27日 周四 — 每日简报",
        content: "🌅 刘坤，新的一天开始了！\n\n你最近在重庆的客户拜访获得了很好的反馈，这是非常棒的起步。今天建议：\n\n📋 整理重庆之行的客户跟进清单，优先级排序\n🤝 找戴晓燕或王志强交流一下他们的报价经验\n📝 开始准备下周二要交的工作规划报告\n\n你的营销维度得分65/100，继续保持这个势头！",
        tier: "mid", strategy: "gentle_guidance", tone: "professional_supportive",
      },
      {
        title: "3月28日 周五 — 每日简报",
        content: "🌅 刘坤，周五了！\n\nQ1季度评审已完成，你的综合得分62分（良），对应2个月奖金。继续努力冲向「优」！\n\n📌 今天重点：完善工作规划报告的框架\n💡 建议：报告中加入重庆之行的市场洞察，这是你的亮点\n🎯 周末可以思考下半年的销售转化策略\n\n加油，你离「销售与市场主管」的目标越来越近了！",
        tier: "mid", strategy: "gentle_guidance", tone: "professional_supportive",
      },
      {
        title: "3月29日 周六 — 每日简报",
        content: "☀️ 刘坤，周末好！\n\n不用加班，但如果有空可以想想这些：\n\n💭 下周二的报告，你想从哪个角度切入？\n📖 推荐看一下系统里的「展示中枢」模块，里面有新能源清洗方案的展示\n🤖 试试「工作顾问」的对话功能，问它关于报价流程的建议\n\n好好休息，下周继续冲！",
        tier: "mid", strategy: "gentle_guidance", tone: "warm_encouraging",
      },
    ];

    for (let i = 0; i < digests.length; i++) {
      const d = digests[i];
      const date = new Date();
      date.setDate(date.getDate() - (2 - i));
      await client.query(`
        INSERT INTO consultant_agent_outputs (
          employee_id, output_type, channel, title, content,
          persona_tier_at_time, strategy_applied, tone_profile,
          delivered_at, created_at, is_read
        ) VALUES ($1, 'daily_digest', 'in_system', $2, $3, $4, $5, $6, $7, $7, $8)
      `, [LK_EMPLOYEE_ID, d.title, d.content, d.tier, d.strategy, d.tone, date, i < 2]);
    }
    console.log("[OK] Daily digests: 3 days seeded");

    // ── 7. Seed a consultant session with sample conversation ──
    const sessionId = `consultant-${LK_EMPLOYEE_ID}-${Date.now()}`;
    await client.query(`
      INSERT INTO consultant_agent_sessions (session_id, employee_id, topic, message_count, last_message_at)
      VALUES ($1, $2, 'goal_planning', 4, NOW())
    `, [sessionId, LK_EMPLOYEE_ID]);

    const msgs = [
      { role: "user", content: "我下周二要交工作规划报告，但不知道怎么写，有点焦虑" },
      { role: "consultant", content: "刘坤，完全理解你的感受！第一次写这种报告确实有挑战。不过你有很好的素材——重庆之行的经验就是最好的起点。\n\n建议这样组织报告：\n\n**1. 开头**：你对市场的观察和判断（重庆客户的痛点是什么？）\n**2. 目标**：营销70%+销售30%的具体拆解（Q2-Q4各做什么）\n**3. 方法**：怎么拓客、怎么转化、需要什么支持\n**4. 时间线**：按月份的关键里程碑\n\n先写个大纲，不用一次完美。要不要我帮你列一个框架？" },
      { role: "user", content: "好的，帮我列个框架吧，重点是营销方面" },
      { role: "consultant", content: "好的！基于你70%营销的权重，这是建议框架：\n\n📋 **《2026年度工作规划 — 刘坤》**\n\n**一、市场现状与机会洞察**\n- 新能源清洗市场增长趋势\n- 重庆之行客户反馈总结\n- 竞争对手分析\n\n**二、营销目标（70%权重）**\n- Q2：参加1场行业展会 + 产出市场分析报告\n- Q3：建立3家新客户触达渠道\n- Q4：完成品牌内容输出（案例集/白皮书）\n\n**三、销售目标（30%权重）**\n- Q2-Q3：跟进重庆客户报价\n- Q4：争取独立完成1个签约\n\n**四、能力提升计划**\n- 报价流程学习（找戴晓燕带教）\n- ISO 16232清洁度标准深入\n\n**五、需要的支持**\n- 参展预算\n- 技术团队配合客户拜访\n\n你可以把重庆的具体客户名单和反馈填进去，会非常有说服力！💪" },
    ];

    for (const m of msgs) {
      await client.query(`
        INSERT INTO consultant_agent_messages (session_id, role, content) VALUES ($1, $2, $3)
      `, [sessionId, m.role, m.content]);
    }
    console.log("[OK] Sample conversation: 4 messages");

    // ── 8. Seed strategy configs ──
    const strategies = [
      { tier: "high", name: "赋能型教练", desc: "高人设：肯定、赋能、授权", tone: "warm_encouraging", level: "minimal", freq: "rarely" },
      { tier: "mid", name: "引导型伙伴", desc: "中人设：7:3肯定与建议", tone: "professional_supportive", level: "moderate", freq: "twice_weekly" },
      { tier: "low", name: "安抚型守护者", desc: "低人设：情绪安抚、小步前进", tone: "empathetic_calming", level: "aggressive", freq: "daily" },
    ];
    for (const s of strategies) {
      await client.query(`
        INSERT INTO consultant_strategy_configs (persona_tier, strategy_name, description, tone_default, proactive_guidance_level, emotional_support_frequency)
        VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (persona_tier) DO NOTHING
      `, [s.tier, s.name, s.desc, s.tone, s.level, s.freq]);
    }
    console.log("[OK] Strategy configs: 3 tiers");

    // Update agreement projected bonus
    await client.query(`UPDATE annual_goal_agreements SET projected_bonus_months = 2.0 WHERE id = $1`, [agreementId]);

    console.log("\n════════════════════════════════════════");
    console.log("  ALL DONE — Liu Kun data seeded!");
    console.log("════════════════════════════════════════");
    console.log(`  Agreement ID: ${agreementId}`);
    console.log("  Status: active (signed + activated)");
    console.log("  Dimensions: 70% Marketing + 30% Sales");
    console.log("  Q1 Score: 62 (B级 = 2个月)");
    console.log("  Persona: 69.5 (mid, approaching high)");
    console.log("  Digests: 3 days");
    console.log("  Conversation: 4 messages");
    console.log("════════════════════════════════════════");

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
