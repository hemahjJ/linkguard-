-- ============================================================================
-- AegisLoom Security Lab — PostgreSQL Database Migration 001
-- Strict Privacy Charter: Zero credential harvesting. Minimum metadata only.
-- ============================================================================

-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Admin Users Table (For authorized training administrators ONLY)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'analyst' CHECK (role IN ('super_admin', 'training_manager', 'analyst')),
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret VARCHAR(64),
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for admin lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- 2. Training Modules Table
CREATE TABLE IF NOT EXISTS training_modules (
    id VARCHAR(64) PRIMARY KEY,
    slug VARCHAR(128) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(64) NOT NULL,
    difficulty VARCHAR(32) NOT NULL CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
    estimated_minutes INT NOT NULL DEFAULT 15,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Fictional Training Scenarios Table (Strictly Fictional Entities)
CREATE TABLE IF NOT EXISTS scenarios (
    id VARCHAR(64) PRIMARY KEY,
    module_id VARCHAR(64) NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    fictional_sender_name VARCHAR(255) NOT NULL,
    fictional_sender_email VARCHAR(255) NOT NULL,
    fictional_recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    warning_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
    educational_takeaways JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scenarios_module_id ON scenarios(module_id);

-- 4. Safe Quiz Questions Table
CREATE TABLE IF NOT EXISTS quiz_questions (
    id VARCHAR(64) PRIMARY KEY,
    module_id VARCHAR(64) NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
    scenario_text TEXT NOT NULL,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of { id, text, is_correct, explanation }
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_module_id ON quiz_questions(module_id);

-- 5. Learner Completions Table (MINIMUM ANONYMOUS METADATA ONLY)
-- Strict requirement: NEVER store names, passwords, or personal credentials.
CREATE TABLE IF NOT EXISTS learner_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anonymous_learner_id VARCHAR(128) NOT NULL,
    module_id VARCHAR(64) NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
    scenario_id VARCHAR(64) REFERENCES scenarios(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'phish_reported')),
    quiz_score INT NOT NULL DEFAULT 0,
    total_questions INT NOT NULL DEFAULT 0,
    certificate_id VARCHAR(64) UNIQUE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learner_completions_learner ON learner_completions(anonymous_learner_id);
CREATE INDEX IF NOT EXISTS idx_learner_completions_cert ON learner_completions(certificate_id);

-- 6. Simulation Interception Telemetry (COUNTER / EVENT TYPE ONLY)
-- No form-field data, passwords, or PII are EVER accepted or recorded.
CREATE TABLE IF NOT EXISTS simulation_interceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id VARCHAR(64) REFERENCES scenarios(id) ON DELETE SET NULL,
    interaction_type VARCHAR(64) NOT NULL CHECK (interaction_type IN (
        'form_interception',
        'keystroke_blocked',
        'fake_link_clicked',
        'attachment_inspect',
        'phish_reported'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulation_interceptions_type ON simulation_interceptions(interaction_type);

-- 7. Administrator Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    admin_username VARCHAR(64) NOT NULL,
    action VARCHAR(128) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(128),
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
