-- ============================================================================
-- Seed Data for Cattle Doctor Management System
-- Creates sample Zones, Sub-Zones, Farms, Users, Doctors, Cattle & Consultations
-- Default Password for all seed users: Password123!
-- (BCrypt hash for Password123! : $2a$10$w09Zz1X1K59M.h2EwR/c1.F7nN9m8bMqv1m42M5W/u7W5P0gZ1vye)
-- ============================================================================

-- 1. Insert Zones (E-Zones)
INSERT INTO zones (id, code, name, description) VALUES
('11111111-1111-1111-1111-111111111111', 'ZONE-NORTH', 'Northern Dairy & Livestock Zone', 'Covers northern agricultural belt with high concentration of dairy farms'),
('22222222-2222-2222-2222-222222222222', 'ZONE-SOUTH', 'Southern Pasture & Beef Zone', 'Covers southern grasslands specializing in beef and indigenous cattle breeds')
ON CONFLICT (code) DO NOTHING;

-- 2. Insert Sub-Zones (Areas under Zone)
INSERT INTO sub_zones (id, zone_id, code, name, description) VALUES
('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'SUBZ-N1', 'River Valley Sector', 'River basin sub-zone with 40+ dairy farms'),
('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'SUBZ-N2', 'Highland Plains Sector', 'Elevated plateau sector with 25+ cattle farms'),
('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'SUBZ-S1', 'Meadowland Sector', 'Lush meadow sub-zone with commercial cattle operations')
ON CONFLICT DO NOTHING;

-- 3. Insert Farms (Firms under Sub-Zones)
INSERT INTO farms (id, sub_zone_id, name, registration_no, contact_phone, contact_email, address, total_cattle_count) VALUES
('44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333331', 'Green Valley Dairy Firm', 'FRM-2024-001', '+1-555-0101', 'greenvalley@dairy.com', 'Plot 14, River Valley Road, North Zone', 65),
('44444444-4444-4444-4444-444444444442', '33333333-3333-3333-3333-333333333331', 'Sunrise Cattle Ranch', 'FRM-2024-002', '+1-555-0102', 'sunrise@cattle.com', 'Sector 3, Riverside Way, North Zone', 42),
('44444444-4444-4444-4444-444444444443', '33333333-3333-3333-3333-333333333332', 'Highland Breeze Pastures', 'FRM-2024-003', '+1-555-0103', 'highland@pastures.com', 'Highland Hill Road, Sector N2', 88),
('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'Golden Meadow Agro Firm', 'FRM-2024-004', '+1-555-0104', 'golden@meadowagro.com', 'Meadow Expressway 8, South Zone', 120)
ON CONFLICT DO NOTHING;

-- 4. Insert Users (Farmers & Doctors)
INSERT INTO users (id, full_name, email, phone, password_hash, role, farm_id) VALUES
-- Admin
('55555555-5555-5555-5555-555555555551', 'Dr. Edward Stone (Zone Lead)', 'admin@cattledoc.org', '+1-555-0001', '$2a$10$w09Zz1X1K59M.h2EwR/c1.F7nN9m8bMqv1m42M5W/u7W5P0gZ1vye', 'ZONE_ADMIN', NULL),
-- Doctors
('55555555-5555-5555-5555-555555555552', 'Dr. Sarah Connor (DVM)', 'doctor.sarah@cattledoc.org', '+1-555-0002', '$2a$10$w09Zz1X1K59M.h2EwR/c1.F7nN9m8bMqv1m42M5W/u7W5P0gZ1vye', 'DOCTOR', NULL),
('55555555-5555-5555-5555-555555555553', 'Dr. Marcus Vance (DVM)', 'doctor.marcus@cattledoc.org', '+1-555-0003', '$2a$10$w09Zz1X1K59M.h2EwR/c1.F7nN9m8bMqv1m42M5W/u7W5P0gZ1vye', 'DOCTOR', NULL),
-- Sub-zone Farmers
('55555555-5555-5555-5555-555555555554', 'Rahim Khan (Green Valley Farm)', 'rahim@greenvalley.com', '+1-555-0004', '$2a$10$w09Zz1X1K59M.h2EwR/c1.F7nN9m8bMqv1m42M5W/u7W5P0gZ1vye', 'FARMER', '44444444-4444-4444-4444-444444444441'),
('55555555-5555-5555-5555-555555555555', 'Tariq Ahmed (Sunrise Ranch)', 'tariq@sunriseranch.com', '+1-555-0005', '$2a$10$w09Zz1X1K59M.h2EwR/c1.F7nN9m8bMqv1m42M5W/u7W5P0gZ1vye', 'FARMER', '44444444-4444-4444-4444-444444444442')
ON CONFLICT (email) DO NOTHING;

-- 5. Insert Doctor Profiles
INSERT INTO doctors (id, user_id, license_number, specialization, experience_years, assigned_zone_id, assigned_sub_zone_id, is_available) VALUES
('66666666-6666-6666-6666-666666666661', '55555555-5555-5555-5555-555555555552', 'VET-LIC-98421', 'Bovine Respiratory Diseases & Ruminal Health', 8, '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', TRUE),
('66666666-6666-6666-6666-666666666662', '55555555-5555-5555-5555-555555555553', 'VET-LIC-77142', 'Cattle Infectious Pathologies & Dermatology', 11, '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333332', TRUE)
ON CONFLICT (license_number) DO NOTHING;

-- 6. Insert Cattle
INSERT INTO cattle (id, farm_id, tag_number, name, breed, gender, age_months, weight_kg, size_category, health_notes) VALUES
('77777777-7777-7777-7777-777777777771', '44444444-4444-4444-4444-444444444441', 'TAG-COW-104', 'Daisy', 'Holstein Friesian', 'COW', 34, 465.00, 'Large (Height: 142cm, Heart Girth: 195cm)', 'High-yield milker. Vaccinated last quarter.'),
('77777777-7777-7777-7777-777777777772', '44444444-4444-4444-4444-444444444441', 'TAG-COW-108', 'Rosie', 'Jersey Cross', 'COW', 22, 380.00, 'Medium (Height: 130cm, Heart Girth: 178cm)', 'First calving 3 months ago.'),
('77777777-7777-7777-7777-777777777773', '44444444-4444-4444-4444-444444444442', 'TAG-BULL-201', 'Thunder', 'Red Sindhi', 'BULL', 48, 560.00, 'Extra Large (Height: 152cm, Heart Girth: 210cm)', 'Stud bull.')
ON CONFLICT DO NOTHING;

-- 7. Insert Sample Consultation
INSERT INTO consultations (
    id, cattle_id, farmer_id, doctor_id, zone_id, sub_zone_id, farm_id,
    cow_weight_kg, cow_size, symptoms_text, problem_duration_days, priority, status,
    fastapi_triage_score, fastapi_triage_summary
) VALUES (
    '88888888-8888-8888-8888-888888888881',
    '77777777-7777-7777-7777-777777777771',
    '55555555-5555-5555-5555-555555555554',
    '66666666-6666-6666-6666-666666666661',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333331',
    '44444444-4444-4444-4444-444444444441',
    465.00,
    'Large (Height: 142cm, Heart Girth: 195cm)',
    'Cow stopped eating hay since yesterday morning. Showing heavy breathing, moist wheezing cough recorded in audio, nasal discharge, and elevated temperature (103.8 F). Milk yield dropped by 40%.',
    2,
    'HIGH',
    'UNDER_REVIEW',
    0.85,
    'Acoustic signal exhibits repetitive wheezing and low-frequency crackles consistent with bovine respiratory illness. Visual image reveals clear mucoid nasal discharge.'
) ON CONFLICT DO NOTHING;
