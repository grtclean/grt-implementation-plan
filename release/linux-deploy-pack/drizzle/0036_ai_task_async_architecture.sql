-- GRT开发第一定律: AI Task Async Architecture
-- Layer I — pgEnum status, submittedById, optimistic locking version

-- 1. Create the enum type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_task_status') THEN
    CREATE TYPE ai_task_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
  END IF;
END$$;

-- 2. Migrate status column from varchar to enum
ALTER TABLE ai_tasks
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE ai_tasks
  ALTER COLUMN status TYPE ai_task_status USING status::ai_task_status;

ALTER TABLE ai_tasks
  ALTER COLUMN status SET DEFAULT 'pending';

-- 3. Add submittedById (integer user FK) and version (optimistic lock)
ALTER TABLE ai_tasks
  ADD COLUMN IF NOT EXISTS submitted_by_id INTEGER;

ALTER TABLE ai_tasks
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
