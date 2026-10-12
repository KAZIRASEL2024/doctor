const express = require('express');
const router = express.Router();
const { mockData, query, isMock } = require('../config/db');

// List cattle (optionally filter by farm_id)
router.get('/', async (req, res) => {
  const { farm_id } = req.query;
  try {
    if (!isMock()) {
      let sql = 'SELECT * FROM cattle';
      const params = [];
      if (farm_id) {
        sql += ' WHERE farm_id = $1';
        params.push(farm_id);
      }
      sql += ' ORDER BY created_at DESC';
      const result = await query(sql, params);
      if (result.rows.length > 0) return res.json({ cattle: result.rows });
    }

    let cattleList = mockData.cattle;
    if (farm_id) {
      cattleList = cattleList.filter(c => c.farm_id === farm_id);
    }
    res.json({ cattle: cattleList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register new cow
router.post('/', async (req, res) => {
  const { farm_id, tag_number, name, breed, gender, age_months, weight_kg, size_category, health_notes } = req.body;

  if (!farm_id || !tag_number || !breed || !weight_kg || !size_category) {
    return res.status(400).json({ error: 'farm_id, tag_number, breed, weight_kg, and size_category are required' });
  }

  const newCow = {
    id: 'cat-' + Date.now(),
    farm_id,
    tag_number,
    name: name || `Cow-${tag_number}`,
    breed,
    gender: gender || 'COW',
    age_months: parseInt(age_months) || 24,
    weight_kg: parseFloat(weight_kg),
    size_category,
    health_notes: health_notes || 'Registered into farm herd.',
    created_at: new Date().toISOString()
  };

  mockData.cattle.push(newCow);

  // Update farm cattle count
  const farm = mockData.farms.find(f => f.id === farm_id);
  if (farm) {
    farm.total_cattle_count = (farm.total_cattle_count || 0) + 1;
  }

  res.status(201).json({
    success: true,
    message: 'Cattle registered successfully',
    cattle: newCow
  });
});

module.exports = router;
