const express = require('express');
const router = express.Router();
const Model = require('../models/Village');

router.get('/', async (req, res) => {
  try {
    const data = await Model.find().lean();
    res.json({
      type: 'FeatureCollection',
      features: data
    });
  } catch (error) {
    console.error('Error fetching ' + 'Village' + ':', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
