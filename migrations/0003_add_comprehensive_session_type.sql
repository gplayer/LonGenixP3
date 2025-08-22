-- Add 'comprehensive' session type to existing schema
-- This migration adds support for comprehensive functional medicine assessments

-- Drop the existing constraint and add new one with 'comprehensive' type
-- Note: SQLite doesn't support ALTER TABLE ... DROP CONSTRAINT directly,
-- so we need to recreate the table with the new constraint

-- Step 1: Create new table with updated constraint
CREATE TABLE IF NOT EXISTS assessment_sessions_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  session_type TEXT CHECK(session_type IN ('manual', 'upload', 'demo', 'existing', 'comprehensive')) NOT NULL,
  status TEXT CHECK(status IN ('in_progress', 'completed', 'abandoned')) DEFAULT 'in_progress',
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Step 2: Copy data from old table to new table
INSERT INTO assessment_sessions_new (id, patient_id, session_type, status, started_at, completed_at)
SELECT id, patient_id, session_type, status, started_at, completed_at
FROM assessment_sessions;

-- Step 3: Drop old table
DROP TABLE assessment_sessions;

-- Step 4: Rename new table to original name
ALTER TABLE assessment_sessions_new RENAME TO assessment_sessions;

-- Step 5: Recreate the index
CREATE INDEX IF NOT EXISTS idx_sessions_patient ON assessment_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON assessment_sessions(status);