-- 0038: GPS Attendance Clock-In System
-- Creates tables for daily clock-in/out with GPS geofence validation

-- Enums
DO $$ BEGIN
  CREATE TYPE clock_method_enum AS ENUM ('gps', 'wifi', 'manual', 'dingtalk_import');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE clock_status_enum AS ENUM ('normal', 'late', 'early_leave', 'absent', 'leave', 'offsite');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. Attendance Groups (考勤组)
CREATE TABLE IF NOT EXISTS attendance_groups (
  id SERIAL PRIMARY KEY,
  group_name VARCHAR(100) NOT NULL,
  work_days_per_week INTEGER NOT NULL DEFAULT 6,
  daily_hours DECIMAL(4,1) NOT NULL DEFAULT 8.0,
  shift_start VARCHAR(5) NOT NULL DEFAULT '08:00',
  shift_end VARCHAR(5) NOT NULL DEFAULT '17:00',
  late_grace_minutes INTEGER NOT NULL DEFAULT 5,
  office_lat DECIMAL(10,7) NOT NULL DEFAULT 31.4913000,
  office_lng DECIMAL(10,7) NOT NULL DEFAULT 120.3119000,
  geofence_radius INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 2. Attendance Clock Records (每日打卡)
CREATE TABLE IF NOT EXISTS attendance_clock_records (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  clock_date VARCHAR(10) NOT NULL,
  clock_in_time TIMESTAMP,
  clock_in_lat DECIMAL(10,7),
  clock_in_lng DECIMAL(10,7),
  clock_in_distance_meters DECIMAL(8,1),
  clock_in_method clock_method_enum,
  clock_in_photo VARCHAR(500),
  clock_out_time TIMESTAMP,
  clock_out_lat DECIMAL(10,7),
  clock_out_lng DECIMAL(10,7),
  clock_out_distance_meters DECIMAL(8,1),
  clock_out_method clock_method_enum,
  is_offsite BOOLEAN NOT NULL DEFAULT false,
  offsite_customer_name VARCHAR(200),
  clock_status clock_status_enum NOT NULL DEFAULT 'normal',
  late_minutes INTEGER NOT NULL DEFAULT 0,
  early_leave_minutes INTEGER NOT NULL DEFAULT 0,
  work_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS clock_records_employee_date_idx ON attendance_clock_records(employee_id, clock_date);
CREATE INDEX IF NOT EXISTS clock_records_date_idx ON attendance_clock_records(clock_date);

-- 3. Attendance Group Members (考勤组成员)
CREATE TABLE IF NOT EXISTS attendance_group_members (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS group_members_group_idx ON attendance_group_members(group_id);
CREATE INDEX IF NOT EXISTS group_members_employee_idx ON attendance_group_members(employee_id);

-- Seed default attendance groups
INSERT INTO attendance_groups (group_name, work_days_per_week, daily_hours, shift_start, shift_end) VALUES
  ('6天生产工人', 6, 8.0, '07:30', '16:30'),
  ('5天办公室', 5, 8.0, '08:30', '17:30'),
  ('后勤保洁', 6, 6.0, '07:00', '13:00')
ON CONFLICT DO NOTHING;
