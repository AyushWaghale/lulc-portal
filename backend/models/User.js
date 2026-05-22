const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  // Profile fields
  phone: { type: String, default: '' },
  bio: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  pincode: { type: String, default: '' },
  organization: { type: String, default: '' },
  profilePic: { type: String, default: '' }, // base64 or URL
  // Email verification
  isVerified: { type: Boolean, default: false },
  verifyOTP: { type: String, default: null },
  verifyOTPExpiry: { type: Date, default: null },
  // Password reset
  resetToken: { type: String, default: null },
  resetTokenExpiry: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
