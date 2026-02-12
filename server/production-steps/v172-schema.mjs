/**
 * v1.7.2 薪酬审批工作流数据库迁移
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log('[v1.7.2] Creating salary approval tables...');
  
  // 薪酬审批工作流定义表
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS salary_approval_workflows (
      id INT AUTO_INCREMENT PRIMARY KEY,
      workflow_name VARCHAR(200) NOT NULL COMMENT '工作流名称',
      workflow_code VARCHAR(50) NOT NULL COMMENT '工作流编码',
      description TEXT COMMENT '描述',
      
      -- 审批步骤定义（JSON数组）
      -- [{step: 1, role: "supervisor", title: "主管审核", required: true},
      --  {step: 2, role: "hr", title: "HR确认", required: true},
      --  {step: 3, role: "finance", title: "财务发放", required: true}]
      steps JSON NOT NULL COMMENT '审批步骤定义',
      
      -- 触发条件
      auto_trigger TINYINT(1) DEFAULT 0 COMMENT '是否自动触发',
      trigger_condition VARCHAR(200) COMMENT '触发条件描述',
      
      is_active TINYINT(1) DEFAULT 1 COMMENT '是否启用',
      created_by VARCHAR(100) COMMENT '创建人',
      created_at BIGINT NOT NULL COMMENT '创建时间',
      updated_at BIGINT COMMENT '更新时间',
      
      UNIQUE KEY uk_workflow_code (workflow_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='薪酬审批工作流定义'
  `);
  console.log('  ✓ salary_approval_workflows');
  
  // 薪酬审批记录表
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS salary_approval_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      workflow_id INT NOT NULL COMMENT '关联工作流ID',
      bonus_record_id INT COMMENT '关联薪酬奖金记录ID',
      
      -- 审批批次信息
      batch_code VARCHAR(50) NOT NULL COMMENT '审批批次号',
      batch_title VARCHAR(200) NOT NULL COMMENT '审批标题',
      period_start BIGINT COMMENT '薪酬周期开始',
      period_end BIGINT COMMENT '薪酬周期结束',
      
      -- 审批金额汇总
      total_amount DECIMAL(12,2) DEFAULT 0 COMMENT '总金额',
      worker_count INT DEFAULT 0 COMMENT '涉及工人数',
      
      -- 当前审批状态
      current_step INT DEFAULT 1 COMMENT '当前审批步骤',
      status ENUM('pending', 'in_progress', 'approved', 'rejected', 'cancelled') DEFAULT 'pending' COMMENT '审批状态',
      
      -- 审批历史（JSON数组）
      -- [{step: 1, role: "supervisor", approver: "张三", action: "approve", 
      --   comment: "同意", timestamp: 1234567890}]
      approval_history JSON COMMENT '审批历史记录',
      
      -- 拒绝/取消原因
      reject_reason TEXT COMMENT '拒绝原因',
      cancel_reason TEXT COMMENT '取消原因',
      
      -- 提交人
      submitted_by VARCHAR(100) COMMENT '提交人ID',
      submitted_by_name VARCHAR(100) COMMENT '提交人姓名',
      submitted_at BIGINT COMMENT '提交时间',
      
      -- 完成信息
      completed_at BIGINT COMMENT '完成时间',
      completed_by VARCHAR(100) COMMENT '完成人',
      
      created_at BIGINT NOT NULL COMMENT '创建时间',
      updated_at BIGINT COMMENT '更新时间',
      
      INDEX idx_workflow (workflow_id),
      INDEX idx_status (status),
      INDEX idx_batch (batch_code),
      INDEX idx_submitted (submitted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='薪酬审批记录'
  `);
  console.log('  ✓ salary_approval_records');
  
  // 插入默认审批工作流
  const now = Date.now();
  await conn.execute(`
    INSERT IGNORE INTO salary_approval_workflows 
    (workflow_name, workflow_code, description, steps, auto_trigger, is_active, created_by, created_at)
    VALUES (
      '标准薪酬审批流程',
      'SALARY_STD_APPROVAL',
      '计算→主管审核→HR确认→财务发放',
      '${JSON.stringify([
        { step: 1, role: "supervisor", title: "主管审核", required: true, description: "审核绩效计算结果是否合理" },
        { step: 2, role: "hr", title: "HR确认", required: true, description: "确认薪酬数据符合公司政策" },
        { step: 3, role: "finance", title: "财务发放", required: true, description: "确认并执行薪酬发放" }
      ])}',
      1,
      1,
      'system',
      ${now}
    )
  `);
  console.log('  ✓ Default workflow inserted');
  
  await conn.end();
  console.log('[v1.7.2] Migration completed successfully!');
}

migrate().catch(err => {
  console.error('[v1.7.2] Migration failed:', err);
  process.exit(1);
});
