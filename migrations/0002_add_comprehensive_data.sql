-- Add table for comprehensive assessment data storage
CREATE TABLE IF NOT EXISTS assessment_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  data_type TEXT NOT NULL, -- 'comprehensive_lifestyle', 'functional_medicine', etc.
  json_data TEXT NOT NULL, -- JSON storage for complex assessment data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES assessment_sessions(id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_assessment_data_session_type ON assessment_data(session_id, data_type);