-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Migration 0046: Remote Access Governance                   ║
-- ║  CEO mandate after PLC overwrite incident                   ║
-- ║  Time-bound VPN tokens with full audit trail                ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Enums
DO $$ BEGIN
  CREATE TYPE remote_access_status AS ENUM ('PENDING','APPROVED','REJECTED','ACTIVE','EXPIRED','REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE access_urgency AS ENUM ('NORMAL','URGENT','CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Main requests table
CREATE TABLE IF NOT EXISTS remote_access_requests (
  id              SERIAL PRIMARY KEY,
  project_id      INTEGER,
  project_name    VARCHAR(300),
  engineer_id     INTEGER NOT NULL,
  engineer_name   VARCHAR(100) NOT NULL,
  customer_name   VARCHAR(200) NOT NULL,
  equipment_id    VARCHAR(100) NOT NULL,
  equipment_model VARCHAR(200),
  target_ip       VARCHAR(50),
  reason_for_access TEXT NOT NULL,
  urgency         access_urgency NOT NULL DEFAULT 'NORMAL',
  requested_duration_hours INTEGER NOT NULL,
  status          remote_access_status NOT NULL DEFAULT 'PENDING',
  temp_vpn_token  VARCHAR(50),
  approved_by     INTEGER,
  approver_name   VARCHAR(100),
  rejection_reason TEXT,
  approved_at     TIMESTAMP,
  expires_at      TIMESTAMP,
  revoked_at      TIMESTAMP,
  revoked_by      INTEGER,
  revoke_reason   TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rar_status   ON remote_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_rar_engineer ON remote_access_requests(engineer_id);
CREATE INDEX IF NOT EXISTS idx_rar_expires  ON remote_access_requests(expires_at);

-- Audit log for every action on a request
CREATE TABLE IF NOT EXISTS remote_access_audit_logs (
  id             SERIAL PRIMARY KEY,
  request_id     INTEGER NOT NULL REFERENCES remote_access_requests(id) ON DELETE CASCADE,
  action         VARCHAR(50) NOT NULL,
  performed_by   INTEGER NOT NULL,
  performer_name VARCHAR(100) NOT NULL,
  details        TEXT,
  ip_address     VARCHAR(50),
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raal_request ON remote_access_audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_raal_action  ON remote_access_audit_logs(action);

-- Seed: 3 sample requests for demo
INSERT INTO remote_access_requests (project_id, project_name, engineer_id, engineer_name, customer_name, equipment_id, equipment_model, target_ip, reason_for_access, urgency, requested_duration_hours, status, created_at)
VALUES
  (1, 'GRT-401 上海大众缸体清洗线', 6, '洪香龙', '上海大众', 'PLC-S7-1500-01', 'Siemens S7-1500', '192.168.100.10', '修复泵联锁逻辑Bug — M7阶段FAT测试急停延迟3秒', 'URGENT', 2, 'PENDING', NOW() - INTERVAL '30 minutes'),
  (2, 'GRT-402 宝马变速箱清洗方案', 22, '李大鹏', '宝马慕尼黑', 'PLC-S7-1200-03', 'Siemens S7-1200', '10.0.50.22', '调试干燥循环定时器参数 — 客户现场反馈温度偏差', 'NORMAL', 1, 'PENDING', NOW() - INTERVAL '2 hours'),
  (3, 'GRT-403 潍柴柴油机清洗系统', 18, '孙国祥', '潍柴动力', 'PLC-FX5U-01', 'Mitsubishi FX5U', '172.16.10.5', '升级清洗液浓度监测模块固件 — 周期性维护', 'NORMAL', 4, 'PENDING', NOW() - INTERVAL '1 hour');
