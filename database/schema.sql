-- ============================================================================
-- Cattle Doctor Management System: Database Schema (PostgreSQL)
-- Supports Zone -> Sub-zone -> Farm Hierarchy and Cattle Consultations
-- ============================================================================

-- Create Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('FARMER', 'DOCTOR', 'ZONE_ADMIN', 'SUPER_ADMIN');
CREATE TYPE consultation_status AS ENUM ('PENDING', 'ASSIGNED', 'UNDER_REVIEW', 'DIAGNOSED', 'CLOSED');
CREATE TYPE priority_level AS ENUM ('NORMAL', 'HIGH', 'EMERGENCY');
CREATE TYPE media_type_enum AS ENUM ('PICTURE', 'AUDIO');
CREATE TYPE cattle_gender AS ENUM ('COW', 'BULL', 'CALF', 'HEIFER');

-- 1. ZONES (E-Zones: Regions / Districts)
CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. SUB-ZONES (Areas under each Zone)
CREATE TABLE IF NOT EXISTS sub_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_sub_zone_code_per_zone UNIQUE (zone_id, code)
);

-- 3. FARMS (Firms located within each Sub-zone)
CREATE TABLE IF NOT EXISTS farms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sub_zone_id UUID NOT NULL REFERENCES sub_zones(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    registration_no VARCHAR(50),
    contact_phone VARCHAR(30) NOT NULL,
    contact_email VARCHAR(100),
    address TEXT NOT NULL,
    total_cattle_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. USERS (Farmers, Doctors, Admins)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(30) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'FARMER',
    farm_id UUID REFERENCES farms(id) ON DELETE SET NULL, -- Null for Doctors & Admins
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. DOCTORS (Veterinary Doctors assigned to Zones / Sub-zones)
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    specialization VARCHAR(100) DEFAULT 'General Cattle & Livestock Health',
    experience_years INT DEFAULT 1,
    assigned_zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
    assigned_sub_zone_id UUID REFERENCES sub_zones(id) ON DELETE SET NULL, -- Null if covers whole zone
    is_available BOOLEAN DEFAULT TRUE,
    total_consultations INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. CATTLE (Cow Registry per Farm)
CREATE TABLE IF NOT EXISTS cattle (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    tag_number VARCHAR(50) NOT NULL,
    name VARCHAR(100),
    breed VARCHAR(100) NOT NULL,
    gender cattle_gender DEFAULT 'COW',
    age_months INT NOT NULL,
    weight_kg NUMERIC(6, 2) NOT NULL,   -- e.g. 420.50 kg
    size_category VARCHAR(50) NOT NULL,  -- e.g. "Medium (Height: 135cm, Girth: 180cm)"
    health_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_tag_per_farm UNIQUE (farm_id, tag_number)
);

-- 7. CONSULTATIONS (Cattle Problem tickets submitted by Sub-zone Farmers)
CREATE TABLE IF NOT EXISTS consultations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cattle_id UUID NOT NULL REFERENCES cattle(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
    sub_zone_id UUID NOT NULL REFERENCES sub_zones(id) ON DELETE RESTRICT,
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE RESTRICT,
    
    -- Cow Condition details at time of problem report
    cow_weight_kg NUMERIC(6, 2) NOT NULL,
    cow_size VARCHAR(100) NOT NULL,
    symptoms_text TEXT NOT NULL,
    problem_duration_days INT DEFAULT 1,
    priority priority_level DEFAULT 'NORMAL',
    status consultation_status DEFAULT 'PENDING',

    -- AI / FastAPI Microservice Preliminary Triage Insight
    fastapi_triage_score NUMERIC(4, 2),
    fastapi_triage_summary TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. CONSULTATION MEDIA (Cow Pictures & Audio Recordings)
CREATE TABLE IF NOT EXISTS consultation_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    media_type media_type_enum NOT NULL, -- PICTURE or AUDIO
    file_path VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    
    -- Metadata extracted by FastAPI Microservice (duration, image dimensions, noise/frequency metrics)
    analysis_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. PRESCRIPTIONS & DIAGNOSES (Doctor's diagnosis & medical plan)
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID UNIQUE NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    diagnosis TEXT NOT NULL,
    clinical_findings TEXT,
    medications JSONB NOT NULL, -- Array of: [{"name": "Amoxicillin", "dose": "15mg/kg", "frequency": "BID", "duration": "5 days"}]
    dietary_advice TEXT,
    follow_up_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_sub_zones_zone ON sub_zones(zone_id);
CREATE INDEX IF NOT EXISTS idx_farms_sub_zone ON farms(sub_zone_id);
CREATE INDEX IF NOT EXISTS idx_users_farm ON users(farm_id);
CREATE INDEX IF NOT EXISTS idx_doctors_zone ON doctors(assigned_zone_id, assigned_sub_zone_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_zone ON consultations(zone_id, sub_zone_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor ON consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultation_media_consultation ON consultation_media(consultation_id);
