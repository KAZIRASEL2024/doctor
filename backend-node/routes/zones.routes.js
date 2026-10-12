const express = require('express');
const router = express.Router();
const { mockData, query, isMock } = require('../config/db');

// Get all Zones (E-Zones)
router.get('/', async (req, res) => {
  try {
    if (!isMock()) {
      const result = await query('SELECT * FROM zones ORDER BY name ASC');
      if (result.rows.length > 0) return res.json({ zones: result.rows });
    }
    res.json({ zones: mockData.zones });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Sub-Zones for a specific Zone
router.get('/:zoneId/sub-zones', async (req, res) => {
  const { zoneId } = req.params;
  try {
    if (!isMock()) {
      const result = await query('SELECT * FROM sub_zones WHERE zone_id = $1 ORDER BY name ASC', [zoneId]);
      if (result.rows.length > 0) return res.json({ sub_zones: result.rows });
    }
    const filtered = mockData.sub_zones.filter(sz => sz.zone_id === zoneId);
    res.json({ sub_zones: filtered });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Farms under a specific Sub-Zone
router.get('/sub-zones/:subZoneId/farms', async (req, res) => {
  const { subZoneId } = req.params;
  try {
    if (!isMock()) {
      const result = await query('SELECT * FROM farms WHERE sub_zone_id = $1 ORDER BY name ASC', [subZoneId]);
      if (result.rows.length > 0) return res.json({ farms: result.rows });
    }
    const filtered = mockData.farms.filter(f => f.sub_zone_id === subZoneId);
    res.json({ farms: filtered });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Complete Hierarchy Tree (Zone -> Sub-Zone -> Farm)
router.get('/tree/full', (req, res) => {
  const tree = mockData.zones.map(zone => {
    const subZones = mockData.sub_zones
      .filter(sz => sz.zone_id === zone.id)
      .map(sz => {
        const farms = mockData.farms.filter(f => f.sub_zone_id === sz.id);
        return {
          ...sz,
          farms
        };
      });
    return {
      ...zone,
      sub_zones: subZones
    };
  });

  res.json({ hierarchy: tree });
});

module.exports = router;
