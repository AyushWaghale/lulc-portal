const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123';

// Auth Middleware
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token invalid' });
  }
};

// GET /api/analysis/lulc-summary - Real LULC data aggregation
router.get('/lulc-summary', auth, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const lulcCollection = db.collection('lulcs');

    // Aggregate LULC types by DISCR field
    const lulcAgg = await lulcCollection.aggregate([
      {
        $group: {
          _id: '$properties.DISCR',
          count: { $sum: 1 },
          totalArea: { $sum: '$properties.AREA' }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    // Map known LULC categories with proper labels
    const lulcMap = {
      'reservoir': { label: 'Reservoir', color: '#3b82f6' },
      'river': { label: 'River', color: '#06b6d4' },
      'tanks': { label: 'Tanks/Ponds', color: '#0ea5e9' },
      'unknown': { label: 'Other', color: '#94a3b8' }
    };

    const labels = [];
    const counts = [];
    const areas = [];
    const colors = [];

    lulcAgg.forEach(item => {
      const key = (item._id || 'unknown').toLowerCase();
      const mapped = lulcMap[key] || { label: item._id || 'Unknown', color: '#94a3b8' };
      labels.push(mapped.label);
      counts.push(item.count);
      areas.push(Math.round(item.totalArea || 0));
      colors.push(mapped.color);
    });

    res.json({ labels, counts, areas, colors, raw: lulcAgg });
  } catch (err) {
    console.error('LULC analysis error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/analysis/road-summary - Real Road data aggregation
router.get('/road-summary', auth, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const roadCollection = db.collection('roads');

    // Aggregate by ROAD_TYPE
    const roadAgg = await roadCollection.aggregate([
      {
        $group: {
          _id: '$properties.ROAD_TYPE',
          count: { $sum: 1 },
          totalLength: { $sum: '$properties.LENGTH' }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    const roadColors = {
      'National Highway': '#dc2626',
      'Major State Highway': '#ea580c',
      'State Highway': '#f59e0b',
      'Major District Road': '#8b5cf6',
      'Other District Road': '#6366f1',
      'City MDR': '#ec4899',
      'City ODR': '#f472b6',
      'Village Road': '#22c55e'
    };

    const labels = [];
    const counts = [];
    const lengths = [];
    const colors = [];

    roadAgg.forEach(item => {
      labels.push(item._id || 'Unknown');
      counts.push(item.count);
      lengths.push(Math.round(item.totalLength || 0));
      colors.push(roadColors[item._id] || '#94a3b8');
    });

    res.json({ labels, counts, lengths, colors, raw: roadAgg });
  } catch (err) {
    console.error('Road analysis error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/analysis/overview - Combined overview stats
router.get('/overview', auth, async (req, res) => {
  try {
    const db = mongoose.connection.db;

    const [districtCount, talukaCount, villageCount, roadCount, lulcCount] = await Promise.all([
      db.collection('districts').countDocuments(),
      db.collection('talukas').countDocuments(),
      db.collection('villages').countDocuments(),
      db.collection('roads').countDocuments(),
      db.collection('lulcs').countDocuments()
    ]);

    // Get taluka-wise village distribution
    const talukaVillages = await db.collection('villages').aggregate([
      {
        $group: {
          _id: '$properties.Tahasil',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    // Get road type distribution by taluka
    const roadByTaluka = await db.collection('roads').aggregate([
      {
        $group: {
          _id: '$properties.TALUK',
          count: { $sum: 1 },
          totalLength: { $sum: '$properties.LENGTH' }
        }
      },
      { $sort: { totalLength: -1 } },
      { $limit: 10 }
    ]).toArray();

    res.json({
      counts: { districts: districtCount, talukas: talukaCount, villages: villageCount, roads: roadCount, lulc: lulcCount },
      talukaVillages,
      roadByTaluka
    });
  } catch (err) {
    console.error('Overview analysis error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
