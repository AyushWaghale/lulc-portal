const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  type: String,
  properties: Object,
  geometry: Object
});
module.exports = mongoose.model('Road', schema);
