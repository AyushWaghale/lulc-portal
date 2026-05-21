const express = require('express');
const router = express.Router();
const User = require('../models/User');
const mongoose = require('mongoose');

// Helper Admin Auth Middleware
const adminAuth = (req, res, next) => {
  const jwt = require('jsonwebtoken');
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_key_123');
    if (decoded.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied. Admins only.' });
    }
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// GET System Statistics
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const db = mongoose.connection.db;

    const userCount = await User.countDocuments();
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select('-password');
    
    // Aggregation pipeline to get approximate counts of GeoJSON collections if they exist
    const collections = ['districts', 'talukas', 'villages', 'roads', 'lulcs'];
    const layerStats = {};

    for (const col of collections) {
      try {
        const count = await db.collection(col).countDocuments();
        layerStats[col] = count;
      } catch (e) {
        layerStats[col] = 0;
      }
    }

    res.json({
      userCount,
      recentUsers,
      layerStats
    });
  } catch (err) {
    console.error('Admin Stats Error:', err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
