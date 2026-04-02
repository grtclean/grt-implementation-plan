-- Seed data: Testing & Template Engine starter templates
-- Run after migration to populate initial templates and test cases

-- Template 1: Software Go-Live UAT
INSERT INTO test_templates (name, domain, status, version, description, scope, applicable_phases, required_roles, tags, estimated_total_hours, passing_score_percent, created_at, updated_at)
VALUES (
  'Software Go-Live UAT',
  'software_uat',
  'active',
  1,
  'Comprehensive UAT template for software go-live readiness. Covers login, CRUD operations, reporting, permissions, performance, i18n, backup, and rollback procedures.',
  'Full system UAT before production deployment',
  '["M5","M6","M7"]',
  '["qa_engineer","test_lead","developer"]',
  '["go-live","uat","software","critical"]',
  '24.00',
  85,
  NOW(),
  NOW()
);

-- Get the template ID for software_uat (assumes auto-increment starts at 1)
-- Test cases for Template 1
INSERT INTO test_cases (template_id, sort_order, code, title, description, phase, category, priority, preconditions, steps, expected_result, required_role, skill_level, estimated_hours, automatable, is_active, created_at, updated_at)
VALUES
  ((SELECT id FROM test_templates WHERE name = 'Software Go-Live UAT' LIMIT 1), 1, 'UAT-001', 'User Login & Authentication',
   'Verify all login methods (password, SSO, WeChat QR) work correctly with proper session management',
   'execution', 'functional', 'critical',
   'Test accounts provisioned for each auth method',
   '[{"step":1,"action":"Navigate to login page","expected":"Login form displayed"},{"step":2,"action":"Enter valid credentials","expected":"Successful login, redirect to dashboard"},{"step":3,"action":"Verify session token","expected":"JWT token stored correctly"},{"step":4,"action":"Test invalid credentials","expected":"Error message displayed, no session created"}]',
   'All login methods authenticate correctly; sessions are created and destroyed properly',
   'qa_engineer', 'mid', '2.00', true, true, NOW(), NOW()),

  ((SELECT id FROM test_templates WHERE name = 'Software Go-Live UAT' LIMIT 1), 2, 'UAT-002', 'Core CRUD Operations',
   'Verify create, read, update, delete for all primary entities (projects, tasks, users)',
   'execution', 'functional', 'critical',
   'At least one entity of each type exists in test DB',
   '[{"step":1,"action":"Create a new project","expected":"Project created with correct fields"},{"step":2,"action":"Read project details","expected":"All fields displayed correctly"},{"step":3,"action":"Update project name and status","expected":"Changes persisted"},{"step":4,"action":"Delete/archive project","expected":"Project removed from active list"}]',
   'All CRUD operations succeed with proper validation and data integrity',
   'qa_engineer', 'mid', '4.00', true, true, NOW(), NOW()),

  ((SELECT id FROM test_templates WHERE name = 'Software Go-Live UAT' LIMIT 1), 3, 'UAT-003', 'Report Generation & Export',
   'Verify all report types generate correctly and export to PDF/Excel',
   'execution', 'functional', 'high',
   'Sample data loaded for report generation',
   '[{"step":1,"action":"Generate project status report","expected":"Report renders with correct data"},{"step":2,"action":"Export to PDF","expected":"PDF downloaded with proper formatting"},{"step":3,"action":"Export to Excel","expected":"Excel file contains all data columns"},{"step":4,"action":"Test date range filters","expected":"Reports filter correctly by date"}]',
   'All reports generate accurately with correct data and export formats',
   'qa_engineer', 'mid', '3.00', true, true, NOW(), NOW()),

  ((SELECT id FROM test_templates WHERE name = 'Software Go-Live UAT' LIMIT 1), 4, 'UAT-004', 'Role-Based Access Control',
   'Verify each role sees only permitted menu items and data',
   'execution', 'safety', 'critical',
   'Test accounts for each of the 18 roles',
   '[{"step":1,"action":"Login as employee role","expected":"See only employee-level menus"},{"step":2,"action":"Login as manager role","expected":"See manager + employee menus"},{"step":3,"action":"Attempt unauthorized API call","expected":"403 Forbidden returned"},{"step":4,"action":"Verify BU-scoped data isolation","expected":"User sees only their BU data"}]',
   'All 18 roles have correct menu visibility and data access scoping',
   'qa_engineer', 'senior', '4.00', false, true, NOW(), NOW()),

  ((SELECT id FROM test_templates WHERE name = 'Software Go-Live UAT' LIMIT 1), 5, 'UAT-005', 'Performance Under Load',
   'Verify response times under expected concurrent user load',
   'execution', 'performance', 'high',
   'Load testing tool configured; baseline metrics established',
   '[{"step":1,"action":"Simulate 50 concurrent users","expected":"Average response < 500ms"},{"step":2,"action":"Simulate 200 concurrent users","expected":"Average response < 2000ms"},{"step":3,"action":"Monitor DB connection pool","expected":"No connection exhaustion"},{"step":4,"action":"Check memory usage","expected":"No memory leaks after 30min sustained load"}]',
   'System handles expected load without degradation; no errors under 200 concurrent users',
   'qa_engineer', 'senior', '3.00', true, true, NOW(), NOW()),

  ((SELECT id FROM test_templates WHERE name = 'Software Go-Live UAT' LIMIT 1), 6, 'UAT-006', 'Internationalization (i18n)',
   'Verify Chinese/English locale switching and content display',
   'execution', 'functional', 'medium',
   'Both zh-CN and en locale files loaded',
   '[{"step":1,"action":"Switch locale to Chinese","expected":"All UI labels display in Chinese"},{"step":2,"action":"Switch locale to English","expected":"All UI labels display in English"},{"step":3,"action":"Check date/number formatting","expected":"Formats follow locale conventions"},{"step":4,"action":"Test special characters in forms","expected":"Unicode input handled correctly"}]',
   'Full locale switching works; no untranslated strings; proper formatting',
   'qa_engineer', 'junior', '2.00', true, true, NOW(), NOW()),

  ((SELECT id FROM test_templates WHERE name = 'Software Go-Live UAT' LIMIT 1), 7, 'UAT-007', 'Database Backup & Restore',
   'Verify backup procedures work and data can be restored from backup',
   'verification', 'safety', 'critical',
   'Backup scripts available; test environment with sample data',
   '[{"step":1,"action":"Execute full DB backup","expected":"Backup file created successfully"},{"step":2,"action":"Verify backup integrity","expected":"Checksum validation passes"},{"step":3,"action":"Restore to staging env","expected":"All data restored correctly"},{"step":4,"action":"Compare row counts","expected":"Source and restore match exactly"}]',
   'Backup and restore procedures verified; data integrity confirmed',
   'qa_engineer', 'senior', '3.00', false, true, NOW(), NOW()),

  ((SELECT id FROM test_templates WHERE name = 'Software Go-Live UAT' LIMIT 1), 8, 'UAT-008', 'Rollback Procedure',
   'Verify the system can be rolled back to previous version if go-live fails',
   'teardown', 'safety', 'critical',
   'Previous version deployment artifacts available',
   '[{"step":1,"action":"Deploy new version","expected":"New version running"},{"step":2,"action":"Trigger rollback procedure","expected":"Previous version restored"},{"step":3,"action":"Verify data consistency","expected":"No data loss from rollback"},{"step":4,"action":"Verify all services recovered","expected":"All endpoints responding correctly"}]',
   'Rollback completes within 15 minutes; no data loss; all services restored',
   'qa_engineer', 'expert', '3.00', false, true, NOW(), NOW());


-- Template 2: Siemens PLC Standard Test
INSERT INTO test_templates (name, domain, status, version, description, scope, applicable_phases, required_roles, tags, estimated_total_hours, passing_score_percent, created_at, updated_at)
VALUES (
  'Siemens PLC Standard Test',
  'plc_test',
  'active',
  1,
  'Standard PLC test template for Siemens S7-series controllers. Covers I/O verification, safety relay, communication protocols, cycle time, and emergency stop procedures.',
  'PLC commissioning and periodic validation',
  '["M4","M5","M6"]',
  '["ee_engineer","safety_officer","test_lead"]',
  '["plc","siemens","commissioning","safety"]',
  '16.00',
  100,
  NOW(),
  NOW()
);

-- Test cases for Template 2
INSERT INTO test_cases (template_id, sort_order, code, title, description, phase, category, priority, preconditions, steps, expected_result, required_role, skill_level, estimated_hours, automatable, is_active, created_at, updated_at)
VALUES
  ((SELECT id FROM test_templates WHERE name = 'Siemens PLC Standard Test' LIMIT 1), 1, 'PLC-001', 'Digital I/O Point Check',
   'Verify all digital inputs and outputs respond correctly to simulated signals',
   'execution', 'functional', 'critical',
   'PLC powered on; I/O modules connected; signal simulator available',
   '[{"step":1,"action":"Force each DI point HIGH","expected":"PLC reads TRUE for the point"},{"step":2,"action":"Force each DI point LOW","expected":"PLC reads FALSE for the point"},{"step":3,"action":"Command each DO point ON","expected":"Output measured HIGH at terminal"},{"step":4,"action":"Command each DO point OFF","expected":"Output measured LOW at terminal"}]',
   'All digital I/O points verified; 100% match between commanded and measured state',
   'ee_engineer', 'mid', '4.00', false, true, NOW(), NOW()),

  ((SELECT id FROM test_templates WHERE name = 'Siemens PLC Standard Test' LIMIT 1), 2, 'PLC-002', 'Safety Relay Verification',
   'Verify safety relay chain opens correctly under fault conditions and resets properly',
   'execution', 'safety', 'critical',
   'Safety relay circuit wired per design; fault simulation prepared',
   '[{"step":1,"action":"Trigger E-stop button","expected":"Safety relay opens within 50ms"},{"step":2,"action":"Verify all safety outputs de-energized","expected":"All safety outputs OFF"},{"step":3,"action":"Reset E-stop and press reset button","expected":"Safety relay re-engages"},{"step":4,"action":"Simulate wire-break fault","expected":"Safety relay opens, fault logged"}]',
   'Safety relay responds within spec; all fault conditions properly detected and logged',
   'safety_officer', 'senior', '3.00', false, true, NOW(), NOW()),

  ((SELECT id FROM test_templates WHERE name = 'Siemens PLC Standard Test' LIMIT 1), 3, 'PLC-003', 'PROFINET Communication Test',
   'Verify PROFINET communication between PLC and all IO devices is stable',
   'execution', 'integration', 'high',
   'Network topology configured; all PROFINET devices assigned GSD files',
   '[{"step":1,"action":"Check device status in HW Config","expected":"All devices show green (online)"},{"step":2,"action":"Monitor for 30 minutes","expected":"Zero communication errors"},{"step":3,"action":"Disconnect one device cable","expected":"Diagnostic alarm raised within 1s"},{"step":4,"action":"Reconnect device","expected":"Auto-recovery within 5s"}]',
   'PROFINET ring stable; zero packet loss; proper alarm handling for cable faults',
   'ee_engineer', 'mid', '3.00', false, true, NOW(), NOW()),

  ((SELECT id FROM test_templates WHERE name = 'Siemens PLC Standard Test' LIMIT 1), 4, 'PLC-004', 'Cycle Time Measurement',
   'Verify PLC scan cycle time is within acceptable range under full program load',
   'execution', 'performance', 'high',
   'Full application program loaded; all I/O active',
   '[{"step":1,"action":"Read OB1 cycle time from diagnostics","expected":"Cycle time < 20ms"},{"step":2,"action":"Enable all optional function blocks","expected":"Cycle time < 50ms"},{"step":3,"action":"Monitor max cycle over 1 hour","expected":"No watchdog trigger"},{"step":4,"action":"Record min/avg/max values","expected":"Values within design specification"}]',
   'Cycle time stays within spec under full load; no watchdog violations',
   'ee_engineer', 'senior', '2.00', false, true, NOW(), NOW()),

  ((SELECT id FROM test_templates WHERE name = 'Siemens PLC Standard Test' LIMIT 1), 5, 'PLC-005', 'Emergency Stop Full Chain Test',
   'End-to-end emergency stop test from button press to machine standstill',
   'verification', 'safety', 'critical',
   'Machine fully operational; all safety devices connected; measurement tools ready',
   '[{"step":1,"action":"Press E-stop during machine operation","expected":"Machine stops within 500ms"},{"step":2,"action":"Verify all drives disabled","expected":"All VFDs show fault/stopped"},{"step":3,"action":"Check pneumatic valves exhausted","expected":"Pneumatic pressure vented"},{"step":4,"action":"Verify HMI shows E-stop alarm","expected":"Red alarm banner displayed with timestamp"}]',
   'Full E-stop chain verified: button → safety relay → PLC → drives/valves → HMI within 500ms',
   'safety_officer', 'expert', '4.00', false, true, NOW(), NOW());
