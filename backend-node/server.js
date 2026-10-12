const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const zonesRoutes = require('./routes/zones.routes');
const cattleRoutes = require('./routes/cattle.routes');
const doctorsRoutes = require('./routes/doctors.routes');
const consultationsRoutes = require('./routes/consultations.routes');
const { pool, isMock } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/zones', zonesRoutes);
app.use('/api/cattle', cattleRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/consultations', consultationsRoutes);

// System Health Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Cattle Doctor Management Node.js Primary API',
    database_mode: isMock() ? 'in-memory-mock' : 'postgresql',
    timestamp: new Date().toISOString()
  });
});

// Fallback to Web UI
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log('================================================================');
  console.log(`🐮 Cattle Doctor Management System (Node.js API + Web Dashboard)`);
  console.log(`🚀 Running at: http://localhost:${PORT}`);
  console.log(`🩺 Role Policy: Sub-zone Farmer sends cow problem, picture, audio,`);
  console.log(`               text symptoms, size & weight -> Assigned Doctor reviews & prescribes.`);
  console.log(`🐍 FastAPI Microservice expected at: ${process.env.FASTAPI_URL || 'http://localhost:8000'}`);
  console.log(`🐘 Database mode: ${isMock() ? 'In-Memory Fallback (PostgreSQL Ready)' : 'PostgreSQL'}`);
  console.log('================================================================');
});
