-- LongenixHealth Dynamic Risk Assessment System
-- Initial Database Schema
-- Dr. Graham Player, Ph.D - Longenix Health

-- Patient Demographics and Basic Information
CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT CHECK(gender IN ('male', 'female', 'other')) NOT NULL,
  ethnicity TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  country TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Assessment Sessions
CREATE TABLE IF NOT EXISTS assessment_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  session_type TEXT CHECK(session_type IN ('manual', 'upload', 'demo', 'existing')) NOT NULL,
  status TEXT CHECK(status IN ('in_progress', 'completed', 'abandoned')) DEFAULT 'in_progress',
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Biometric Measurements
CREATE TABLE IF NOT EXISTS biometrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  height_cm REAL,
  weight_kg REAL,
  waist_circumference_cm REAL,
  hip_circumference_cm REAL,
  systolic_bp INTEGER,
  diastolic_bp INTEGER,
  resting_heart_rate INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE
);

-- Laboratory Biomarkers (60+ biomarkers)
CREATE TABLE IF NOT EXISTS lab_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  biomarker_name TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  reference_min REAL,
  reference_max REAL,
  interpretation TEXT CHECK(interpretation IN ('normal', 'low', 'high', 'critical')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE
);

-- Family Medical History
CREATE TABLE IF NOT EXISTS family_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  relationship TEXT NOT NULL, -- father, mother, sibling, grandparent, etc.
  condition_name TEXT NOT NULL,
  age_of_diagnosis INTEGER,
  notes TEXT,
  FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE
);

-- Lifestyle Assessment
CREATE TABLE IF NOT EXISTS lifestyle_assessment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  smoking_status TEXT CHECK(smoking_status IN ('never', 'former', 'current')),
  alcohol_consumption TEXT CHECK(alcohol_consumption IN ('none', 'light', 'moderate', 'heavy')),
  exercise_frequency INTEGER, -- days per week
  exercise_duration INTEGER, -- minutes per session
  sleep_hours REAL,
  stress_level INTEGER CHECK(stress_level BETWEEN 1 AND 10),
  diet_type TEXT,
  FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE
);

-- ATM Framework (Antecedents, Triggers, Mediators)
CREATE TABLE IF NOT EXISTS atm_timeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  event_type TEXT CHECK(event_type IN ('antecedent', 'trigger', 'mediator')) NOT NULL,
  event_description TEXT NOT NULL,
  age_occurred INTEGER,
  event_date DATE,
  severity INTEGER CHECK(severity BETWEEN 1 AND 10),
  impact_description TEXT,
  FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE
);

-- Mental Health Assessment
CREATE TABLE IF NOT EXISTS mental_health (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  depression_score INTEGER,
  anxiety_score INTEGER,
  stress_score INTEGER,
  cognitive_function_score INTEGER,
  social_support_score INTEGER,
  life_satisfaction_score INTEGER,
  assessment_tool TEXT, -- PHQ-9, GAD-7, etc.
  FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE
);

-- Calculated Risk Assessments (Results from algorithms)
CREATE TABLE IF NOT EXISTS risk_calculations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  risk_category TEXT NOT NULL, -- cardiovascular, diabetes, cancer, etc.
  risk_score REAL NOT NULL,
  risk_level TEXT CHECK(risk_level IN ('low', 'moderate', 'high', 'very_high')) NOT NULL,
  ten_year_risk REAL, -- 10-year risk percentage
  algorithm_used TEXT NOT NULL, -- Framingham, ASCVD, FINDRISC, etc.
  calculation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE
);

-- Biological Age Calculations
CREATE TABLE IF NOT EXISTS biological_age (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  chronological_age REAL NOT NULL,
  phenotypic_age REAL,
  klemera_doubal_age REAL,
  metabolic_age REAL,
  telomere_age REAL,
  average_biological_age REAL,
  age_advantage REAL, -- positive if younger, negative if older
  calculation_method TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE
);

-- Functional Medicine Body Systems Assessment
CREATE TABLE IF NOT EXISTS functional_systems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  system_name TEXT NOT NULL, -- immune, detoxification, hormonal, etc.
  system_score INTEGER CHECK(system_score BETWEEN 0 AND 100),
  dysfunction_level TEXT CHECK(dysfunction_level IN ('optimal', 'mild', 'moderate', 'severe')),
  key_markers TEXT, -- JSON array of key biomarkers for this system
  FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE
);

-- Hallmarks of Aging Assessment
CREATE TABLE IF NOT EXISTS hallmarks_aging (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  hallmark_category TEXT CHECK(hallmark_category IN ('primary', 'antagonistic', 'integrative')) NOT NULL,
  hallmark_name TEXT NOT NULL,
  severity_score INTEGER CHECK(severity_score BETWEEN 0 AND 100),
  biomarkers_assessed TEXT, -- JSON array of relevant biomarkers
  intervention_priority INTEGER CHECK(intervention_priority BETWEEN 1 AND 5),
  FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE
);

-- Hallmarks of Health Assessment
CREATE TABLE IF NOT EXISTS hallmarks_health (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  health_domain TEXT NOT NULL, -- metabolic flexibility, resilience, etc.
  optimization_score INTEGER CHECK(optimization_score BETWEEN 0 AND 100),
  current_status TEXT CHECK(current_status IN ('excellent', 'good', 'needs_improvement', 'poor')),
  improvement_potential INTEGER CHECK(improvement_potential BETWEEN 0 AND 100),
  FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE
);

-- Personalized Recommendations
CREATE TABLE IF NOT EXISTS recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  category TEXT NOT NULL, -- nutrition, exercise, supplements, lifestyle, medical
  priority TEXT CHECK(priority IN ('high', 'medium', 'low')) NOT NULL,
  recommendation_text TEXT NOT NULL,
  scientific_basis TEXT, -- Reference to studies/guidelines
  expected_benefit TEXT,
  implementation_difficulty INTEGER CHECK(implementation_difficulty BETWEEN 1 AND 5),
  FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE
);

-- Generated Reports
CREATE TABLE IF NOT EXISTS generated_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  report_sections TEXT NOT NULL, -- JSON array of included sections
  report_html TEXT, -- Full HTML content of the report
  report_pdf_url TEXT, -- URL to PDF version if generated
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE
);

-- Reference Ranges and Clinical Guidelines
CREATE TABLE IF NOT EXISTS reference_ranges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  biomarker_name TEXT NOT NULL UNIQUE,
  unit TEXT NOT NULL,
  normal_min REAL,
  normal_max REAL,
  optimal_min REAL,
  optimal_max REAL,
  gender_specific BOOLEAN DEFAULT FALSE,
  age_dependent BOOLEAN DEFAULT FALSE,
  population TEXT DEFAULT 'general', -- general, male, female, pediatric, geriatric
  source TEXT NOT NULL, -- Clinical guidelines source
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Clinical Risk Algorithms and Formulas
CREATE TABLE IF NOT EXISTS risk_algorithms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  algorithm_name TEXT NOT NULL UNIQUE,
  risk_category TEXT NOT NULL,
  formula_description TEXT NOT NULL,
  required_parameters TEXT NOT NULL, -- JSON array of required biomarkers/data
  validation_study TEXT, -- Reference to validation study
  population_applicability TEXT,
  accuracy_metrics TEXT, -- Sensitivity, specificity, etc.
  implementation_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
CREATE INDEX IF NOT EXISTS idx_sessions_patient ON assessment_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON assessment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_lab_results_session ON lab_results(session_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_biomarker ON lab_results(biomarker_name);
CREATE INDEX IF NOT EXISTS idx_risk_calculations_session ON risk_calculations(session_id);
CREATE INDEX IF NOT EXISTS idx_risk_calculations_category ON risk_calculations(risk_category);
CREATE INDEX IF NOT EXISTS idx_recommendations_session ON recommendations(session_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_priority ON recommendations(priority);