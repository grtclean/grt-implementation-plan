-- 0055: Pre-set customer portal users for 美利信 + 明新旭腾
-- SHA-256 hashed passwords (initial setup, admin can reset later)

-- 美利信 portal users (V0 战略合作 = 2 accounts)
-- Password: Millison@2026 → SHA-256
INSERT INTO customer_portal_users (portal_user_id, account_id, email, name, role, password_hash, status)
VALUES
  ('millison_admin', 'MILLISON_301307', 'tech@millison.com.cn', '张工 (美利信技术负责人)', 'admin',
   '6d0af5141897607b9b0c0a26e075a2607a031c7700441ed763de14248bf0b772', 'active'),
  ('millison_eng01', 'MILLISON_301307', 'engineering@millison.com.cn', '李工 (美利信现场工程师)', 'engineer',
   '6d0af5141897607b9b0c0a26e075a2607a031c7700441ed763de14248bf0b772', 'active')
ON CONFLICT DO NOTHING;

-- Fix: update hash if rows already exist with wrong hash
UPDATE customer_portal_users SET password_hash = '6d0af5141897607b9b0c0a26e075a2607a031c7700441ed763de14248bf0b772'
WHERE portal_user_id IN ('millison_admin', 'millison_eng01');

-- 明新旭腾 portal users (V1 大客户 = 2 accounts)
-- Password: MXXT@2026 → SHA-256
INSERT INTO customer_portal_users (portal_user_id, account_id, email, name, role, password_hash, status)
VALUES
  ('mxxt_admin', 'MXXT_320300', 'wang@mingxinxuteng.com', '王经理 (明新旭腾项目负责人)', 'admin',
   '14bfabad16f1b46f19081c2a8911db64546c4b8c850aa90436b5c53941d9b653', 'active'),
  ('mxxt_tech01', 'MXXT_320300', 'tech@mingxinxuteng.com', '陈工 (明新旭腾设备维护)', 'viewer',
   '14bfabad16f1b46f19081c2a8911db64546c4b8c850aa90436b5c53941d9b653', 'active')
ON CONFLICT DO NOTHING;

-- Fix: update hash if rows already exist with wrong hash
UPDATE customer_portal_users SET password_hash = '14bfabad16f1b46f19081c2a8911db64546c4b8c850aa90436b5c53941d9b653'
WHERE portal_user_id IN ('mxxt_admin', 'mxxt_tech01');
