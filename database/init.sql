-- SIF Precursor Detection Database Schema
-- Run on PostgreSQL startup via docker-entrypoint-initdb.d

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Reports table: stores uploaded safety reports
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id VARCHAR(100) UNIQUE NOT NULL,
    report_date DATE,
    site VARCHAR(200),
    activity VARCHAR(300),
    report_type VARCHAR(50), -- UA, UC, NearMiss, Incident
    narrative TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    batch_id UUID
);

-- Classifications table: SIF detection results
CREATE TABLE IF NOT EXISTS classifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    sif_probability FLOAT NOT NULL,
    sif_flag BOOLEAN NOT NULL,
    confidence_level VARCHAR(20), -- high, medium, low
    model_version VARCHAR(50),
    explanation_snippets JSONB, -- highlighted trigger phrases
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LSR tags table: IOGP Life-Saving Rule mappings
CREATE TABLE IF NOT EXISTS lsr_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    rule_name VARCHAR(100) NOT NULL, -- one of 9 IOGP LSRs
    confidence FLOAT,
    matched_keywords JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Entities table: extracted entities (activity, location, equipment)
CREATE TABLE IF NOT EXISTS entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    entity_type VARCHAR(50), -- activity, location, equipment, barrier_failure
    entity_value VARCHAR(300) NOT NULL,
    confidence FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clusters table: recurring precursor pattern groups
CREATE TABLE IF NOT EXISTS clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_label VARCHAR(200),
    description TEXT,
    report_count INT DEFAULT 0,
    sif_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report-cluster mapping
CREATE TABLE IF NOT EXISTS report_clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    cluster_id UUID REFERENCES clusters(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Batches table: track upload batches
CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(300),
    total_reports INT,
    sif_count INT,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (for post-prototype auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(200),
    role VARCHAR(50), -- hse_manager, safety_officer, admin
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_reports_site ON reports(site);
CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(report_date);
CREATE INDEX IF NOT EXISTS idx_reports_batch ON reports(batch_id);
CREATE INDEX IF NOT EXISTS idx_classifications_sif_flag ON classifications(sif_flag);
CREATE INDEX IF NOT EXISTS idx_lsr_tags_rule ON lsr_tags(rule_name);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);