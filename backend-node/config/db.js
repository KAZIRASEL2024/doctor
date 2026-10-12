const { Pool } = require('pg');
require('dotenv').config();

let pool = null;
let useMock = false;

// Initialize PostgreSQL Connection Pool if configured
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cattle_doc_db';

try {
  pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    console.warn('[PostgreSQL Pool Warning] Database connection error. Switching to in-memory fallback:', err.message);
    useMock = true;
  });
} catch (e) {
  useMock = true;
}

// In-Memory Fallback Dataset (Seed data mirror)
const mockData = {
  zones: [
    { id: 'zone-north', code: 'ZONE-NORTH', name: 'Northern Dairy & Livestock Zone', description: 'Covers northern dairy agricultural belt' },
    { id: 'zone-south', code: 'ZONE-SOUTH', name: 'Southern Pasture & Beef Zone', description: 'Covers southern grasslands and indigenous breeds' }
  ],
  sub_zones: [
    { id: 'subz-n1', zone_id: 'zone-north', code: 'SUBZ-N1', name: 'River Valley Sector', description: 'River basin sub-zone with 40+ dairy farms' },
    { id: 'subz-n2', zone_id: 'zone-north', code: 'SUBZ-N2', name: 'Highland Plains Sector', description: 'Elevated plateau sector with 25+ cattle farms' },
    { id: 'subz-s1', zone_id: 'zone-south', code: 'SUBZ-S1', name: 'Meadowland Sector', description: 'Commercial cattle operations' }
  ],
  farms: [
    { id: 'frm-001', sub_zone_id: 'subz-n1', name: 'Green Valley Dairy Firm', registration_no: 'FRM-2024-001', contact_phone: '+1-555-0101', contact_email: 'greenvalley@dairy.com', address: 'Plot 14, River Valley Road', total_cattle_count: 65 },
    { id: 'frm-002', sub_zone_id: 'subz-n1', name: 'Sunrise Cattle Ranch', registration_no: 'FRM-2024-002', contact_phone: '+1-555-0102', contact_email: 'sunrise@cattle.com', address: 'Sector 3, Riverside Way', total_cattle_count: 42 },
    { id: 'frm-003', sub_zone_id: 'subz-n2', name: 'Highland Breeze Pastures', registration_no: 'FRM-2024-003', contact_phone: '+1-555-0103', contact_email: 'highland@pastures.com', address: 'Highland Hill Road', total_cattle_count: 88 }
  ],
  users: [
    { id: 'usr-admin', full_name: 'Dr. Edward Stone (Zone Lead)', email: 'admin@cattledoc.org', phone: '+1-555-0001', role: 'ZONE_ADMIN', farm_id: null },
    { id: 'usr-doc-1', full_name: 'Dr. Sarah Connor (DVM)', email: 'doctor.sarah@cattledoc.org', phone: '+1-555-0002', role: 'DOCTOR', farm_id: null },
    { id: 'usr-doc-2', full_name: 'Dr. Marcus Vance (DVM)', email: 'doctor.marcus@cattledoc.org', phone: '+1-555-0003', role: 'DOCTOR', farm_id: null },
    { id: 'usr-farmer-1', full_name: 'Rahim Khan', email: 'rahim@greenvalley.com', phone: '+1-555-0004', role: 'FARMER', farm_id: 'frm-001' },
    { id: 'usr-farmer-2', full_name: 'Tariq Ahmed', email: 'tariq@sunriseranch.com', phone: '+1-555-0005', role: 'FARMER', farm_id: 'frm-002' }
  ],
  doctors: [
    { id: 'doc-001', user_id: 'usr-doc-1', full_name: 'Dr. Sarah Connor (DVM)', license_number: 'VET-LIC-98421', specialization: 'Bovine Respiratory Diseases & Ruminal Health', experience_years: 8, assigned_zone_id: 'zone-north', assigned_sub_zone_id: 'subz-n1', is_available: true },
    { id: 'doc-002', user_id: 'usr-doc-2', full_name: 'Dr. Marcus Vance (DVM)', license_number: 'VET-LIC-77142', specialization: 'Cattle Infectious Pathologies & Dermatology', experience_years: 11, assigned_zone_id: 'zone-north', assigned_sub_zone_id: 'subz-n2', is_available: true }
  ],
  cattle: [
    { id: 'cat-101', farm_id: 'frm-001', tag_number: 'TAG-COW-104', name: 'Daisy', breed: 'Holstein Friesian', gender: 'COW', age_months: 34, weight_kg: 465.00, size_category: 'Large (Height: 142cm, Heart Girth: 195cm)', health_notes: 'High-yield milker.' },
    { id: 'cat-102', farm_id: 'frm-001', tag_number: 'TAG-COW-108', name: 'Rosie', breed: 'Jersey Cross', gender: 'COW', age_months: 22, weight_kg: 380.00, size_category: 'Medium (Height: 130cm, Heart Girth: 178cm)', health_notes: 'First calving 3 months ago.' },
    { id: 'cat-103', farm_id: 'frm-002', tag_number: 'TAG-BULL-201', name: 'Thunder', breed: 'Red Sindhi', gender: 'BULL', age_months: 48, weight_kg: 560.00, size_category: 'Extra Large (Height: 152cm, Heart Girth: 210cm)', health_notes: 'Stud bull.' }
  ],
  consultations: [
    {
      id: 'cons-9001',
      cattle_id: 'cat-101',
      farmer_id: 'usr-farmer-1',
      doctor_id: 'doc-001',
      zone_id: 'zone-north',
      sub_zone_id: 'subz-n1',
      farm_id: 'frm-001',
      cow_weight_kg: 465.00,
      cow_size: 'Large (Height: 142cm, Heart Girth: 195cm)',
      symptoms_text: 'Cow stopped eating hay since yesterday morning. Showing heavy breathing, moist wheezing cough recorded in audio, nasal discharge, and elevated temperature (103.8 F). Milk yield dropped by 40%.',
      problem_duration_days: 2,
      priority: 'HIGH',
      status: 'UNDER_REVIEW',
      fastapi_triage_score: 0.85,
      fastapi_triage_summary: 'Acoustic signal exhibits repetitive wheezing and low-frequency crackles consistent with bovine respiratory illness. Visual image reveals clear mucoid nasal discharge.',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      media: [
        { id: 'med-01', media_type: 'PICTURE', file_path: '/uploads/sample_cow_nasal.jpg', original_filename: 'cow_nasal_discharge.jpg', file_size_bytes: 420000, mime_type: 'image/jpeg' },
        { id: 'med-02', media_type: 'AUDIO', file_path: '/uploads/sample_cow_cough.wav', original_filename: 'cow_breathing_cough.wav', file_size_bytes: 840000, mime_type: 'audio/wav' }
      ],
      prescription: null
    }
  ],
  prescriptions: []
};

// Database Query Wrapper
async function query(text, params = []) {
  if (pool && !useMock) {
    try {
      const client = await pool.connect();
      try {
        const res = await client.query(text, params);
        return res;
      } finally {
        client.release();
      }
    } catch (err) {
      console.warn('[PostgreSQL Query Error - Falling back to in-memory]', err.message);
      useMock = true;
    }
  }
  return { rows: [] };
}

module.exports = {
  pool,
  query,
  mockData,
  isMock: () => useMock,
  setMock: (val) => { useMock = val; }
};
