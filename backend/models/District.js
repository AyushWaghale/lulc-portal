const mongoose = require("mongoose");

const DistrictSchema = new mongoose.Schema({
  type: String,
  properties: Object,
  geometry: Object
});

module.exports = mongoose.model("District", DistrictSchema);
