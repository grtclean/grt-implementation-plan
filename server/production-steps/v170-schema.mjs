/**
 * v1.7.0 数据库Schema迁移脚本
 * 新增6个表：
 * 1. quality_process_locks - 质量检查工序锁定
 * 2. quality_alert_notifications - 质量预警通知
 * 3. bom_verification_records - BOM校验记录
 * 4. bom_checklist_items - BOM校验清单项
 * 5. salary_bonus_records - 薪酬奖金记录
 * 6. salary_calculation_rules - 薪酬计算规则
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function migrate() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  console.log('[v1.7.0 Migration] Starting...');

  // 1. 质量检查工序锁定表
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS quality_process_locks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_id VARCHAR(100) NOT NULL,
      locked_process_code VARCHAR(20) NOT NULL COMMENT '被锁定的工序代码(T1-T15)',
      trigger_process_code VARCHAR(20) NOT NULL COMMENT '触发锁定的工序代码',
      trigger_check_result_id INT COMMENT '触发锁定的检查结果ID',
      trigger_defect_id INT COMMENT '触发锁定的缺陷ID',
      lock_reason TEXT NOT NULL COMMENT '锁定原因',
      severity ENUM('critical','major','minor') NOT NULL DEFAULT 'critical',
      status ENUM('locked','unlock_requested','approved','rejected','auto_released') NOT NULL DEFAULT 'locked',
      locked_by VARCHAR(100) COMMENT '锁定操作人',
      locked_at BIGINT NOT NULL COMMENT '锁定时间戳',
      unlock_requested_by VARCHAR(100) COMMENT '申请解锁人',
      unlock_requested_at BIGINT COMMENT '申请解锁时间',
      unlock_reason TEXT COMMENT '解锁原因',
      approved_by VARCHAR(100) COMMENT '审批人',
      approved_at BIGINT COMMENT '审批时间',
      approval_comments TEXT COMMENT '审批意见',
      auto_release_at BIGINT COMMENT '自动释放时间(可选)',
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      INDEX idx_qpl_project (project_id),
      INDEX idx_qpl_locked_process (locked_process_code),
      INDEX idx_qpl_status (status),
      INDEX idx_qpl_severity (severity)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('[v1.7.0] Created quality_process_locks table');

  // 2. 质量预警通知表
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS quality_alert_notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_id VARCHAR(100) NOT NULL,
      process_code VARCHAR(20) NOT NULL,
      alert_type ENUM('defect_critical','defect_major','process_locked','unlock_request','unlock_approved','unlock_rejected','quality_trend_warning') NOT NULL,
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      severity ENUM('critical','high','medium','low') NOT NULL DEFAULT 'medium',
      recipient_role ENUM('quality_engineer','project_manager','production_supervisor','all') NOT NULL DEFAULT 'quality_engineer',
      recipient_id VARCHAR(100) COMMENT '指定接收人ID',
      recipient_name VARCHAR(100) COMMENT '指定接收人名称',
      related_lock_id INT COMMENT '关联的工序锁定ID',
      related_defect_id INT COMMENT '关联的缺陷ID',
      related_check_result_id INT COMMENT '关联的检查结果ID',
      is_read TINYINT NOT NULL DEFAULT 0,
      read_at BIGINT,
      is_actioned TINYINT NOT NULL DEFAULT 0,
      actioned_at BIGINT,
      action_taken TEXT COMMENT '采取的行动',
      created_at BIGINT NOT NULL,
      INDEX idx_qan_project (project_id),
      INDEX idx_qan_process (process_code),
      INDEX idx_qan_type (alert_type),
      INDEX idx_qan_recipient (recipient_id),
      INDEX idx_qan_read (is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('[v1.7.0] Created quality_alert_notifications table');

  // 3. BOM校验记录表
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS bom_verification_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_id VARCHAR(100) NOT NULL,
      from_process VARCHAR(20) NOT NULL COMMENT '来源工序',
      to_process VARCHAR(20) NOT NULL COMMENT '目标工序',
      material_flow_id INT COMMENT '关联的物料流转记录ID',
      verification_status ENUM('pending','passed','failed','waived') NOT NULL DEFAULT 'pending',
      total_items INT NOT NULL DEFAULT 0 COMMENT 'BOM清单总项数',
      verified_items INT NOT NULL DEFAULT 0 COMMENT '已验证项数',
      missing_items INT NOT NULL DEFAULT 0 COMMENT '缺失项数',
      extra_items INT NOT NULL DEFAULT 0 COMMENT '多余项数',
      pass_rate DECIMAL(5,2) DEFAULT 0 COMMENT '通过率百分比',
      verified_by VARCHAR(100) COMMENT '校验人',
      verified_by_name VARCHAR(100) COMMENT '校验人名称',
      verified_at BIGINT COMMENT '校验时间',
      waived_by VARCHAR(100) COMMENT '放行审批人',
      waived_reason TEXT COMMENT '放行原因',
      waived_at BIGINT COMMENT '放行时间',
      notes TEXT COMMENT '备注',
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      INDEX idx_bvr_project (project_id),
      INDEX idx_bvr_process (from_process, to_process),
      INDEX idx_bvr_status (verification_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('[v1.7.0] Created bom_verification_records table');

  // 4. BOM校验清单项表
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS bom_checklist_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      verification_id INT NOT NULL COMMENT '关联校验记录ID',
      project_id VARCHAR(100) NOT NULL,
      process_code VARCHAR(20) NOT NULL COMMENT '工序代码',
      material_code VARCHAR(100) NOT NULL COMMENT '物料编号',
      material_name VARCHAR(200) NOT NULL COMMENT '物料名称',
      material_spec VARCHAR(200) COMMENT '物料规格',
      required_qty DECIMAL(10,2) NOT NULL DEFAULT 1 COMMENT '需求数量',
      actual_qty DECIMAL(10,2) DEFAULT 0 COMMENT '实际数量',
      check_status ENUM('pending','present','missing','excess','wrong_spec') NOT NULL DEFAULT 'pending',
      is_critical TINYINT NOT NULL DEFAULT 0 COMMENT '是否关键物料',
      remarks TEXT COMMENT '备注',
      checked_by VARCHAR(100) COMMENT '检查人',
      checked_at BIGINT COMMENT '检查时间',
      created_at BIGINT NOT NULL,
      INDEX idx_bci_verification (verification_id),
      INDEX idx_bci_project (project_id),
      INDEX idx_bci_material (material_code),
      INDEX idx_bci_status (check_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('[v1.7.0] Created bom_checklist_items table');

  // 5. 薪酬奖金记录表
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS salary_bonus_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      worker_id VARCHAR(100) NOT NULL,
      worker_name VARCHAR(100) NOT NULL,
      period_type ENUM('weekly','monthly','quarterly','annual') NOT NULL DEFAULT 'monthly',
      period_start BIGINT NOT NULL,
      period_end BIGINT NOT NULL,
      base_salary DECIMAL(12,2) DEFAULT 0 COMMENT '基本工资',
      efficiency_bonus DECIMAL(12,2) DEFAULT 0 COMMENT '效率奖金',
      quality_bonus DECIMAL(12,2) DEFAULT 0 COMMENT '质量奖金',
      attendance_bonus DECIMAL(12,2) DEFAULT 0 COMMENT '出勤奖金',
      special_bonus DECIMAL(12,2) DEFAULT 0 COMMENT '特别奖金',
      penalty_deduction DECIMAL(12,2) DEFAULT 0 COMMENT '处罚扣款',
      total_bonus DECIMAL(12,2) DEFAULT 0 COMMENT '奖金合计',
      efficiency_rate DECIMAL(5,2) DEFAULT 0 COMMENT '效率系数',
      quality_pass_rate DECIMAL(5,2) DEFAULT 0 COMMENT '质量合格率',
      overall_score DECIMAL(5,2) DEFAULT 0 COMMENT '综合评分',
      performance_rank INT COMMENT '绩效排名',
      calculation_rule_id INT COMMENT '使用的计算规则ID',
      calculation_details TEXT COMMENT 'JSON格式的详细计算过程',
      status ENUM('draft','calculated','reviewed','approved','paid') NOT NULL DEFAULT 'draft',
      reviewed_by VARCHAR(100) COMMENT '审核人',
      reviewed_at BIGINT COMMENT '审核时间',
      approved_by VARCHAR(100) COMMENT '批准人',
      approved_at BIGINT COMMENT '批准时间',
      notes TEXT COMMENT '备注',
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      INDEX idx_sbr_worker (worker_id),
      INDEX idx_sbr_period (period_type, period_start, period_end),
      INDEX idx_sbr_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('[v1.7.0] Created salary_bonus_records table');

  // 6. 薪酬计算规则表
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS salary_calculation_rules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      rule_name VARCHAR(100) NOT NULL COMMENT '规则名称',
      rule_code VARCHAR(50) NOT NULL COMMENT '规则编码',
      description TEXT COMMENT '规则描述',
      is_active TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用',
      
      -- 效率奖金规则
      efficiency_base_amount DECIMAL(12,2) DEFAULT 500 COMMENT '效率奖金基数',
      efficiency_threshold DECIMAL(5,2) DEFAULT 100 COMMENT '效率达标线(%)',
      efficiency_max_multiplier DECIMAL(5,2) DEFAULT 2.0 COMMENT '效率最高倍数',
      efficiency_weight DECIMAL(3,2) DEFAULT 0.40 COMMENT '效率权重',
      
      -- 质量奖金规则
      quality_base_amount DECIMAL(12,2) DEFAULT 400 COMMENT '质量奖金基数',
      quality_threshold DECIMAL(5,2) DEFAULT 95 COMMENT '质量达标线(%)',
      quality_max_multiplier DECIMAL(5,2) DEFAULT 1.5 COMMENT '质量最高倍数',
      quality_weight DECIMAL(3,2) DEFAULT 0.35 COMMENT '质量权重',
      
      -- 出勤奖金规则
      attendance_base_amount DECIMAL(12,2) DEFAULT 300 COMMENT '出勤奖金基数',
      attendance_threshold DECIMAL(5,2) DEFAULT 90 COMMENT '出勤达标线(%)',
      attendance_weight DECIMAL(3,2) DEFAULT 0.25 COMMENT '出勤权重',
      
      -- 排名奖金
      rank_top1_bonus DECIMAL(12,2) DEFAULT 1000 COMMENT '第1名额外奖金',
      rank_top3_bonus DECIMAL(12,2) DEFAULT 500 COMMENT '前3名额外奖金',
      rank_top5_bonus DECIMAL(12,2) DEFAULT 200 COMMENT '前5名额外奖金',
      
      -- 处罚规则
      defect_penalty_per_count DECIMAL(12,2) DEFAULT 50 COMMENT '每个缺陷扣款',
      critical_defect_penalty DECIMAL(12,2) DEFAULT 500 COMMENT '严重缺陷扣款',
      
      created_by VARCHAR(100),
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      INDEX idx_scr_code (rule_code),
      INDEX idx_scr_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('[v1.7.0] Created salary_calculation_rules table');

  // 插入默认薪酬计算规则
  await connection.execute(`
    INSERT IGNORE INTO salary_calculation_rules 
    (rule_name, rule_code, description, is_active,
     efficiency_base_amount, efficiency_threshold, efficiency_max_multiplier, efficiency_weight,
     quality_base_amount, quality_threshold, quality_max_multiplier, quality_weight,
     attendance_base_amount, attendance_threshold, attendance_weight,
     rank_top1_bonus, rank_top3_bonus, rank_top5_bonus,
     defect_penalty_per_count, critical_defect_penalty,
     created_by, created_at, updated_at)
    VALUES 
    ('标准绩效奖金规则', 'STANDARD_BONUS', '适用于产线员工的标准绩效奖金计算规则', 1,
     500, 100, 2.0, 0.40,
     400, 95, 1.5, 0.35,
     300, 90, 0.25,
     1000, 500, 200,
     50, 500,
     'system', ${Date.now()}, ${Date.now()})
  `);
  console.log('[v1.7.0] Inserted default salary calculation rule');

  await connection.end();
  console.log('[v1.7.0 Migration] Complete!');
}

migrate().catch(err => {
  console.error('[v1.7.0 Migration] Error:', err);
  process.exit(1);
});
