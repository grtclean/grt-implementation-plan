-- 0039: Attendance Excursion Tracking + Break Window Configuration
-- Adds: break_windows on attendance_groups, attendance_excursions table,
--        unauthorized_excursions on attendance_records

-- 1. Break window configuration on attendance groups
ALTER TABLE attendance_groups
  ADD COLUMN IF NOT EXISTS break_windows JSONB NOT NULL DEFAULT '[{"label":"午休","start":"11:30","end":"13:00"}]'::jsonb;

-- 2. Excursion tracking table
CREATE TABLE IF NOT EXISTS attendance_excursions (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  excursion_date VARCHAR(10) NOT NULL,

  -- Departure
  timestamp_out TIMESTAMP NOT NULL,
  gps_lat_out DECIMAL(10,7) NOT NULL,
  gps_lng_out DECIMAL(10,7) NOT NULL,
  distance_meters_out DECIMAL(8,1),

  -- Return
  timestamp_in TIMESTAMP,
  gps_lat_in DECIMAL(10,7),
  gps_lng_in DECIMAL(10,7),

  -- Classification
  is_during_break BOOLEAN NOT NULL DEFAULT FALSE,
  break_label VARCHAR(50),
  duration_minutes INTEGER,

  remarks TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS excursions_employee_date_idx ON attendance_excursions (employee_id, excursion_date);
CREATE INDEX IF NOT EXISTS excursions_date_idx ON attendance_excursions (excursion_date);

-- 3. Add unauthorized_excursions counter to attendance_records
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS unauthorized_excursions INTEGER NOT NULL DEFAULT 0;
