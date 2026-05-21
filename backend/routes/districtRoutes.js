const express = require("express");
const router = express.Router();
const District = require("../models/District");

router.get("/", async (req, res) => {
  try {
    const districts = await District.find();
    res.json({
      type: "FeatureCollection",
      features: districts
    });
  } catch (error) {
    console.error("Error fetching districts:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
