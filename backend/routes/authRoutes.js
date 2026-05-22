const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123';
const EMAIL_USER = process.env.EMAIL_USER || 'dummy@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'dummy_password';

// Configure Nodemailer Transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

// Auth Middleware (reusable)
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// Middleware for Admin Protection
const adminAuth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied. Admins only.' });
    }
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// Register User — saves as unverified, sends OTP
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if a verified user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ msg: 'An account with this email already exists.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (existingUser && !existingUser.isVerified) {
      // Resend OTP to existing unverified account
      existingUser.name = name;
      existingUser.password = hashedPassword;
      existingUser.verifyOTP = otp;
      existingUser.verifyOTPExpiry = otpExpiry;
      await existingUser.save();
    } else {
      // Create new unverified user
      const user = new User({
        name,
        email,
        password: hashedPassword,
        role: 'user',
        isVerified: false,
        verifyOTP: otp,
        verifyOTPExpiry: otpExpiry,
      });
      await user.save();
    }

    // Send OTP email
    try {
      await transporter.sendMail({
        to: email,
        subject: 'Verify your email — Maharashtra LULC Portal',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🗺️ Maharashtra LULC Portal</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #1e293b; margin-top: 0;">Verify Your Email Address</h2>
              <p style="color: #64748b; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
              <p style="color: #64748b; line-height: 1.6;">Use the OTP below to verify your email. It expires in <strong>10 minutes</strong>.</p>
              <div style="text-align: center; margin: 30px 0;">
                <div style="display: inline-block; background: #f1f5f9; border: 2px dashed #6366f1; border-radius: 12px; padding: 20px 40px;">
                  <p style="margin: 0; font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #4f46e5;">${otp}</p>
                </div>
              </div>
              <p style="color: #94a3b8; font-size: 14px; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
              <p style="color: #94a3b8; font-size: 12px; text-align: center;">Maharashtra LULC GIS Portal &copy; 2026</p>
            </div>
          </div>
        `
      });
      console.log(`OTP sent to ${email}: ${otp}`);
    } catch (emailErr) {
      console.error('Failed to send OTP email:', emailErr.message);
      return res.status(500).json({ msg: 'Failed to send OTP email. Please try again.' });
    }

    res.json({ msg: 'OTP sent to your email. Please verify to complete registration.' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Verify OTP — complete registration
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'No registration found for this email.' });
    if (user.isVerified) return res.status(400).json({ msg: 'Email is already verified. Please log in.' });

    if (!user.verifyOTP || user.verifyOTP !== otp) {
      return res.status(400).json({ msg: 'Invalid OTP. Please check and try again.' });
    }
    if (new Date() > user.verifyOTPExpiry) {
      return res.status(400).json({ msg: 'OTP has expired. Please register again to get a new OTP.' });
    }

    user.isVerified = true;
    user.verifyOTP = null;
    user.verifyOTPExpiry = null;
    await user.save();

    // Send welcome email
    try {
      await transporter.sendMail({
        to: email,
        subject: 'Welcome to Maharashtra LULC Portal! 🎉',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0;">🗺️ Maharashtra LULC Portal</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #1e293b;">You're verified! Welcome aboard 🎉</h2>
              <p style="color: #64748b;">Hi <strong>${user.name}</strong>, your email has been verified successfully.</p>
              <p style="color: #64748b;">You can now log in and explore the GIS portal.</p>
            </div>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('Welcome email failed:', emailErr.message);
    }

    res.json({ msg: 'Email verified successfully! You can now log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Login User
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`Login attempt for: ${email}`);
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found');
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Block unverified users
    if (!user.isVerified) {
      return res.status(403).json({ msg: 'Please verify your email before logging in. Check your inbox for the OTP.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch');
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const payload = { user: { id: user.id, role: user.role, name: user.name } };
    jwt.sign(payload, JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
      if (err) throw err;
      console.log('Login successful');
      res.json({ token, user: payload.user });
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Server Error');
  }
});

// Forgot Password - Send Reset Email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists for security, but still return success-like message
      return res.json({ msg: 'If an account with this email exists, a reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // Send reset email
    const FRONTEND = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const resetUrl = `${FRONTEND}/reset-password/${resetToken}`;
    
    try {
      await transporter.sendMail({
        to: email,
        subject: 'Password Reset - Maharashtra LULC Portal',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🗺️ Maharashtra LULC Portal</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #1e293b; margin-top: 0;">Password Reset Request</h2>
              <p style="color: #64748b; line-height: 1.6;">Hi <strong>${user.name}</strong>,</p>
              <p style="color: #64748b; line-height: 1.6;">We received a request to reset your password. Click the button below to create a new password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background: #4f46e5; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Reset Password</a>
              </div>
              <p style="color: #94a3b8; font-size: 14px;">This link will expire in 1 hour. If you didn't request this reset, please ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
              <p style="color: #94a3b8; font-size: 12px; text-align: center;">Maharashtra LULC GIS Portal &copy; 2026</p>
            </div>
          </div>
        `
      });
      console.log(`Password reset email sent to ${email}`);
    } catch (emailErr) {
      console.error("Failed to send reset email:", emailErr.message);
    }

    res.json({ msg: 'If an account with this email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).send('Server Error');
  }
});

// Reset Password - Verify Token & Update Password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ msg: 'Invalid or expired reset token. Please request a new reset link.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    // Send confirmation email
    try {
      await transporter.sendMail({
        to: user.email,
        subject: 'Password Changed - Maharashtra LULC Portal',
        html: `
          <h2>Password Updated Successfully</h2>
          <p>Hi ${user.name}, your password has been changed. If you didn't make this change, contact us immediately.</p>
        `
      });
    } catch (emailErr) {
      console.error("Failed to send confirmation email:", emailErr.message);
    }

    res.json({ msg: 'Password has been reset successfully! You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).send('Server Error');
  }
});

// Get User Profile (Authenticated)
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -resetToken -resetTokenExpiry');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).send('Server Error');
  }
});

// Update User Profile (Authenticated)
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone, bio, address, city, state, pincode, organization, profilePic } = req.body;
    
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (phone !== undefined) updateFields.phone = phone;
    if (bio !== undefined) updateFields.bio = bio;
    if (address !== undefined) updateFields.address = address;
    if (city !== undefined) updateFields.city = city;
    if (state !== undefined) updateFields.state = state;
    if (pincode !== undefined) updateFields.pincode = pincode;
    if (organization !== undefined) updateFields.organization = organization;
    if (profilePic !== undefined) updateFields.profilePic = profilePic;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { returnDocument: 'after' }
    ).select('-password -resetToken -resetTokenExpiry');

    res.json(user);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).send('Server Error');
  }
});

// Change Password (Authenticated)
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ msg: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).send('Server Error');
  }
});

// Get all users (Admin only)
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Delete user (Admin only)
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ msg: 'User removed' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;
