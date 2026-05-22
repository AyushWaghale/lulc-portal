const mongoose = require("mongoose");

// Temporary OTP store — auto-deleted from MongoDB after expiry (TTL index)
const TempOTPSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } }
});

module.exports = mongoose.model("TempOTP", TempOTPSchema);
