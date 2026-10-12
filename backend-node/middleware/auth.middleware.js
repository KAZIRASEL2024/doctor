const jwt = require('jsonwebtoken');
const { mockData } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'cattle-doctor-secure-jwt-secret-2024';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // Optional query/header for quick UI role switcher in demo mode
  const demoRole = req.headers['x-demo-role'] || req.query.role;
  if (!token && demoRole) {
    const user = mockData.users.find(u => u.role.toLowerCase() === demoRole.toLowerCase()) || mockData.users[3];
    req.user = user;
    return next();
  }

  if (!token) {
    // Default to the first farmer in demo if no token passed
    req.user = mockData.users[3]; // Rahim Khan (FARMER)
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of the following roles: ${roles.join(', ')}`
      });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  JWT_SECRET
};
