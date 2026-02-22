-- Seed: 5 initial task prerequisite rules for Smart Cockpit QMS enforcement
-- Run after migration creates the task_prerequisites table.

INSERT INTO task_prerequisites (task_type, phase_code, description, check_type, required_gate_stage, required_check_item, required_task_type, required_task_status, required_table_name, required_column_name, error_message, severity, is_active)
VALUES
  ('procurement', 'M5', '采购任务需BOM在M4门禁审批通过', 'gate_checklist', 'M4', 'BOM审批', NULL, NULL, NULL, NULL, '无法采购：BOM尚未在M4门禁中审批通过', 'hard', true),
  ('field_service', 'M10', '现场服务需安全检查清单完成', 'field_value', NULL, NULL, NULL, NULL, 'project_tasks', 'safety_checklist_completed', '现场服务任务需先完成安全检查清单', 'hard', true),
  ('field_service', 'M11', 'SAT验收需安全检查清单完成', 'field_value', NULL, NULL, NULL, NULL, 'project_tasks', 'safety_checklist_completed', 'SAT验收需先完成安全检查清单', 'hard', true),
  ('production', 'M5', '生产启动需设计评审任务已完成', 'task_status', NULL, NULL, 'milestone', 'done', NULL, NULL, '生产启动需设计评审任务已完成', 'hard', true),
  ('shipping', 'M8', '发货前需FAT验收门禁通过', 'gate_checklist', 'M7', 'FAT验收', NULL, NULL, NULL, NULL, '发货前需FAT验收(M7)门禁通过', 'hard', true);
