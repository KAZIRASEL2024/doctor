const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { mockData, query, isMock } = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth.middleware');

// User Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    let user = null;

    if (!isMock()) {
      const dbRes = await query('SELECT * FROM users WHERE email = $1', [email]);
      if (dbRes.rows.length > 0) user = dbRes.rows[0];
    }

    if (!user) {
      user = mockData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found with this email' });
    }

    // Demo password bypass or bcrypt comparison
    const validPassword = password === 'Password123!' || (user.password_hash && bcrypt.compareSync(password, user.password_hash));
    if (!validPassword && password !== 'admin123') {
      // For ease of demo, if password is password123 or matches, let through
      if (password !== 'password123' && password !== 'Password123!') {
        return res.status(401).json({ error: 'Invalid password. (Demo password is: Password123!)' });
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, full_name: user.full_name, farm_id: user.farm_id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // If doctor, fetch doctor profile details
    let doctorProfile = null;
    if (user.role === 'DOCTOR') {
      doctorProfile = mockData.doctors.find(d => d.user_id === user.id) || null;
    }

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        farm_id: user.farm_id,
        doctor_profile: doctorProfile
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal login error' });
  }
});

// Current User Profile
router.get('/me', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.json({ user: mockData.users[3] }); // Rahim Khan
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: decoded });
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// List all demo accounts for one-click switching in the UI
router.get('/demo-accounts', (req, res) => {
  res.json({
    accounts: mockData.users.map(u => ({
      id: u.id,
      name: u.full_name,
      email: u.email,
      role: u.role,
      farm_id: u.farm_id,
      assigned_doctor: mockData.doctors.find(d => d.user_id === u.id) || null
    }))
  });
});

module.exports = router;
