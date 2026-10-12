const express = require('express');
const router = express.Router();
const path = require('path');
const upload = require('../middleware/upload.middleware');
const FastApiClient = require('../services/fastapiClient');
const { mockData, query, isMock } = require('../config/db');

// Multi-file upload config: accept 1 picture and 1 audio file
const consultationUpload = upload.fields([
  { name: 'picture', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]);

/**
 * 1. POST /api/consultations
 * Policy: Sub-zone farmer sends cow problem, picture, audio, text symptoms, size, and weight to the doctor
 */
router.post('/', consultationUpload, async (req, res) => {
  try {
    const {
      cattle_id,
      farm_id,
      sub_zone_id,
      zone_id,
      cow_weight_kg,
      cow_size,
      symptoms_text,
      problem_duration_days,
      farmer_id
    } = req.body;

    if (!symptoms_text || !cow_weight_kg || !cow_size) {
      return res.status(400).json({
        error: 'symptoms_text, cow_weight_kg, and cow_size are required fields.'
      });
    }

    // Determine Farmer & Farm context
    const effectiveFarmerId = farmer_id || (req.user ? req.user.id : 'usr-farmer-1');
    const effectiveFarmId = farm_id || (req.user ? req.user.farm_id : 'frm-001');

    // Resolve Sub-Zone & Zone from Farm if not explicitly provided
    let effectiveSubZoneId = sub_zone_id;
    let effectiveZoneId = zone_id;

    const farm = mockData.farms.find(f => f.id === effectiveFarmId);
    if (farm) {
      if (!effectiveSubZoneId) effectiveSubZoneId = farm.sub_zone_id;
    }

    const subZone = mockData.sub_zones.find(sz => sz.id === effectiveSubZoneId);
    if (subZone && !effectiveZoneId) {
      effectiveZoneId = subZone.zone_id;
    }

    // Route to appropriate Doctor for this Sub-Zone or Zone
    let assignedDoctor = mockData.doctors.find(d => d.assigned_sub_zone_id === effectiveSubZoneId && d.is_available);
    if (!assignedDoctor) {
      assignedDoctor = mockData.doctors.find(d => d.assigned_zone_id === effectiveZoneId && d.is_available);
    }
    if (!assignedDoctor && mockData.doctors.length > 0) {
      assignedDoctor = mockData.doctors[0];
    }

    // Process Files
    const pictureFile = req.files && req.files['picture'] ? req.files['picture'][0] : null;
    const audioFile = req.files && req.files['audio'] ? req.files['audio'][0] : null;

    const mediaList = [];
    let imageDiskPath = null;
    let audioDiskPath = null;

    if (pictureFile) {
      imageDiskPath = pictureFile.path;
      mediaList.push({
        id: 'med-' + Date.now() + '-pic',
        media_type: 'PICTURE',
        file_path: `/uploads/${pictureFile.filename}`,
        original_filename: pictureFile.originalname,
        file_size_bytes: pictureFile.size,
        mime_type: pictureFile.mimetype,
        created_at: new Date().toISOString()
      });
    }

    if (audioFile) {
      audioDiskPath = audioFile.path;
      mediaList.push({
        id: 'med-' + Date.now() + '-aud',
        media_type: 'AUDIO',
        file_path: `/uploads/${audioFile.filename}`,
        original_filename: audioFile.originalname,
        file_size_bytes: audioFile.size,
        mime_type: audioFile.mimetype,
        created_at: new Date().toISOString()
      });
    }

    // 3. Call FastAPI Microservice for Acoustic & Visual Triage Analysis
    console.log('[Consultation] Forwarding to FastAPI microservice for AI acoustic & visual triage...');
    const aiAnalysisResult = await FastApiClient.analyzeCase({
      symptomsText: symptoms_text,
      cowWeightKg: parseFloat(cow_weight_kg),
      cowSize: cow_size,
      durationDays: parseInt(problem_duration_days) || 1,
      imageFilePath: imageDiskPath,
      audioFilePath: audioDiskPath
    });

    const aiData = aiAnalysisResult.data || {};

    // 4. Create Consultation Record
    const newConsultation = {
      id: 'cons-' + Date.now(),
      cattle_id: cattle_id || 'cat-101',
      farmer_id: effectiveFarmerId,
      doctor_id: assignedDoctor ? assignedDoctor.id : null,
      zone_id: effectiveZoneId || 'zone-north',
      sub_zone_id: effectiveSubZoneId || 'subz-n1',
      farm_id: effectiveFarmId || 'frm-001',
      cow_weight_kg: parseFloat(cow_weight_kg),
      cow_size,
      symptoms_text,
      problem_duration_days: parseInt(problem_duration_days) || 1,
      priority: aiData.recommended_priority || 'NORMAL',
      status: 'PENDING',
      fastapi_triage_score: aiData.composite_risk_score || 0.25,
      fastapi_triage_summary: aiData.summary || 'Consultation submitted. Awaiting veterinary doctor review.',
      ai_details: aiData,
      media: mediaList,
      prescription: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Store in mock/db
    mockData.consultations.unshift(newConsultation);

    return res.status(201).json({
      success: true,
      message: 'Consultation request submitted to assigned doctor successfully!',
      consultation: newConsultation,
      assigned_doctor: assignedDoctor
    });

  } catch (error) {
    console.error('Error submitting consultation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 2. GET /api/consultations
 * List consultations filtered by status, zone_id, sub_zone_id, doctor_id
 */
router.get('/', (req, res) => {
  const { status, zone_id, sub_zone_id, doctor_id, farmer_id } = req.query;

  let list = [...mockData.consultations];

  if (status) {
    list = list.filter(c => c.status.toLowerCase() === status.toLowerCase());
  }
  if (zone_id) {
    list = list.filter(c => c.zone_id === zone_id);
  }
  if (sub_zone_id) {
    list = list.filter(c => c.sub_zone_id === sub_zone_id);
  }
  if (doctor_id) {
    list = list.filter(c => c.doctor_id === doctor_id);
  }
  if (farmer_id) {
    list = list.filter(c => c.farmer_id === farmer_id);
  }

  // Populate references (cattle info, farm name, doctor name)
  const populated = list.map(c => {
    const cattle = mockData.cattle.find(cat => cat.id === c.cattle_id) || {};
    const farm = mockData.farms.find(f => f.id === c.farm_id) || {};
    const subZone = mockData.sub_zones.find(sz => sz.id === c.sub_zone_id) || {};
    const zone = mockData.zones.find(z => z.id === c.zone_id) || {};
    const doctor = mockData.doctors.find(d => d.id === c.doctor_id) || {};
    const farmer = mockData.users.find(u => u.id === c.farmer_id) || {};

    return {
      ...c,
      cattle_tag: cattle.tag_number || 'N/A',
      cattle_breed: cattle.breed || 'Unknown',
      cattle_name: cattle.name || 'Cow',
      farm_name: farm.name || 'Farm',
      sub_zone_name: subZone.name || 'Sub-Zone',
      zone_name: zone.name || 'Zone',
      doctor_name: doctor.full_name || 'Assigned Vet',
      farmer_name: farmer.full_name || 'Farmer'
    };
  });

  res.json({ consultations: populated, count: populated.length });
});

/**
 * 3. GET /api/consultations/:id
 * Retrieve full consultation ticket
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const c = mockData.consultations.find(item => item.id === id);

  if (!c) {
    return res.status(404).json({ error: 'Consultation ticket not found' });
  }

  const cattle = mockData.cattle.find(cat => cat.id === c.cattle_id) || {};
  const farm = mockData.farms.find(f => f.id === c.farm_id) || {};
  const subZone = mockData.sub_zones.find(sz => sz.id === c.sub_zone_id) || {};
  const zone = mockData.zones.find(z => z.id === c.zone_id) || {};
  const doctor = mockData.doctors.find(d => d.id === c.doctor_id) || {};
  const farmer = mockData.users.find(u => u.id === c.farmer_id) || {};

  res.json({
    consultation: {
      ...c,
      cattle,
      farm,
      sub_zone: subZone,
      zone,
      doctor,
      farmer
    }
  });
});

/**
 * 4. POST /api/consultations/:id/prescribe
 * Doctor prescribes diagnosis, medication regimen, and advice
 */
router.post('/:id/prescribe', (req, res) => {
  const { id } = req.params;
  const { diagnosis, clinical_findings, medications, dietary_advice, follow_up_date, doctor_id } = req.body;

  const consultation = mockData.consultations.find(c => c.id === id);
  if (!consultation) {
    return res.status(404).json({ error: 'Consultation not found' });
  }

  if (!diagnosis) {
    return res.status(400).json({ error: 'Diagnosis is required' });
  }

  const prescriptionRecord = {
    id: 'presc-' + Date.now(),
    consultation_id: id,
    doctor_id: doctor_id || consultation.doctor_id || 'doc-001',
    diagnosis,
    clinical_findings: clinical_findings || 'Reviewed audio auscultation patterns and visual symptoms.',
    medications: Array.isArray(medications) ? medications : [
      { name: 'Oxytetracycline LA 200mg/ml', dose: '20 mg/kg IM', frequency: 'Single dose', duration: 'Repeat in 72h if needed' },
      { name: 'Flunixin Meglumine (Anti-inflammatory/Antipyretic)', dose: '2.2 mg/kg IV', frequency: 'Once daily', duration: '3 days' },
      { name: 'Electrolyte & Ruminal Buffer Drench', dose: '500g in 5L warm water', frequency: 'Twice daily', duration: '2 days' }
    ],
    dietary_advice: dietary_advice || 'Isolate from herd in well-ventilated dry barn. Provide high-quality green fodder and free access to clean water.',
    follow_up_date: follow_up_date || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    created_at: new Date().toISOString()
  };

  consultation.prescription = prescriptionRecord;
  consultation.status = 'DIAGNOSED';
  consultation.updated_at = new Date().toISOString();

  mockData.prescriptions.push(prescriptionRecord);

  res.json({
    success: true,
    message: 'Prescription issued and case status updated to DIAGNOSED',
    consultation,
    prescription: prescriptionRecord
  });
});

module.exports = router;
