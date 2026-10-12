const express = require('express');
const router = express.Router();
const { mockData, query, isMock } = require('../config/db');

// List all registered veterinary doctors
router.get('/', async (req, res) => {
  const { zone_id, sub_zone_id } = req.query;
  try {
    let doctors = mockData.doctors;
    if (zone_id) {
      doctors = doctors.filter(d => d.assigned_zone_id === zone_id);
    }
    if (sub_zone_id) {
      doctors = doctors.filter(d => !d.assigned_sub_zone_id || d.assigned_sub_zone_id === sub_zone_id);
    }

    res.json({ doctors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get doctor assigned to a specific sub-zone
router.get('/assigned-for-sub-zone/:subZoneId', (req, res) => {
  const { subZoneId } = req.params;
  const subZone = mockData.sub_zones.find(sz => sz.id === subZoneId);

  // First try to find a doctor assigned directly to this sub-zone
  let doc = mockData.doctors.find(d => d.assigned_sub_zone_id === subZoneId && d.is_available);

  // If not, find a doctor assigned to the parent zone
  if (!doc && subZone) {
    doc = mockData.doctors.find(d => d.assigned_zone_id === subZone.zone_id && d.is_available);
  }

  // Fallback to first doctor
  if (!doc && mockData.doctors.length > 0) {
    doc = mockData.doctors[0];
  }

  res.json({
    doctor: doc || null,
    matched_by: doc && doc.assigned_sub_zone_id === subZoneId ? 'DIRECT_SUBZONE' : 'PARENT_ZONE'
  });
});

module.exports = router;
