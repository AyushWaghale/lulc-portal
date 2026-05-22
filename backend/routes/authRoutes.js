const express = require('express');
const router = express.Router();
const User = require('../models/User');
const TempOTP = require('../models/TempOTP');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const dns = require('dns').promises;

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

// Common email domain typos → correct domain
const DOMAIN_TYPOS = {
  'gmaul.com': 'gmail.com', 'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com',
  'gamil.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmali.com': 'gmail.com',
  'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.cm': 'gmail.com',
  'gmai.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmaol.com': 'gmail.com',
  'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yhoo.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com', 'yahoo.con': 'yahoo.com',
  'outlok.com': 'outlook.com', 'outloook.com': 'outlook.com', 'otlook.com': 'outlook.com',
  'hotmial.com': 'hotmail.com', 'hotmil.com': 'hotmail.com', 'hotnail.com': 'hotmail.com',
};

// STEP 1 — Send OTP: verify email exists in real world, then send OTP
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: 'Email is required.' });

    // 0. Catch obvious domain typos immediately
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return res.status(400).json({ msg: 'Invalid email address.' });
    if (DOMAIN_TYPOS[domain]) {
      return res.status(400).json({
        msg: `Did you mean ${email.split('@')[0]}@${DOMAIN_TYPOS[domain]}? The domain "${domain}" looks like a typo.`
      });
    }

    // 1a. Verify the email actually exists using Abstract API
    //     abstractapi.com/api/email-validation  — free tier: 100 checks/month
    const EMAIL_VERIFY_KEY = process.env.EMAIL_VERIFY_KEY;
    let apiCheckPassed = false;

    if (EMAIL_VERIFY_KEY) {
      try {
        const apiUrl = `https://emailvalidation.abstractapi.com/v1/?api_key=${EMAIL_VERIFY_KEY}&email=${encodeURIComponent(email)}`;
        const apiRes = await fetch(apiUrl);
        const data = await apiRes.json();

        // Log full response for debugging
        console.log(`Email validation response for ${email}:`, JSON.stringify(data));

        // If API returned an error (bad key, rate limit etc.), data.deliverability will be undefined
        if (data.error) {
          console.error('Abstract API error:', data.error);
          // Fall through to DNS check below
        } else if (data.deliverability !== undefined) {
          apiCheckPassed = true;

          // Block if definitely not deliverable
          if (data.deliverability === 'UNDELIVERABLE') {
            return res.status(400).json({
              msg: 'This email address does not exist. Please enter a real, active email address.'
            });
          }

          // Block if domain has no mail servers
          if (data.is_mx_found?.value === false) {
            return res.status(400).json({
              msg: `The domain "${domain}" cannot receive emails. Please use a valid email address.`
            });
          }

          // Block if SMTP check explicitly failed (mailbox rejected)
          if (data.is_smtp_valid?.value === false) {
            return res.status(400).json({
              msg: 'This email address does not exist or cannot receive emails. Please use a valid email address.'
            });
          }
        }
      } catch (apiErr) {
        console.error('Email verification API request failed:', apiErr.message);
        // Fall through to DNS check
      }
    }

    // Fallback: DNS MX check (runs if no API key OR if API failed/returned no data)
    if (!apiCheckPassed) {
      try {
        const mxRecords = await dns.resolveMx(domain);
        if (!mxRecords || mxRecords.length === 0) {
          return res.status(400).json({ msg: `The email domain "${domain}" cannot receive emails.` });
        }
      } catch {
        return res.status(400).json({ msg: `The email domain "${domain}" does not exist. Please enter a valid email address.` });
      }
    }

    // 1b. Check if already registered in our system
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: 'An account with this email already exists. Please log in.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Upsert TempOTP record
    await TempOTP.findOneAndUpdate(
      { email },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

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
              <p style="color: #64748b; line-height: 1.6;">We received a request to create an account with this email. Enter the OTP below to confirm it's you.</p>
              <div style="text-align: center; margin: 30px 0;">
                <div style="display: inline-block; background: #f1f5f9; border: 2px dashed #6366f1; border-radius: 12px; padding: 20px 40px;">
                  <p style="margin: 0; font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #4f46e5;">${otp}</p>
                </div>
              </div>
              <p style="color: #94a3b8; font-size: 14px; text-align: center;">This OTP expires in <strong>10 minutes</strong>. If you didn't request this, ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
              <p style="color: #94a3b8; font-size: 12px; text-align: center;">Maharashtra LULC GIS Portal &copy; 2026</p>
            </div>
          </div>
        `
      });
      console.log(`OTP sent to ${email}: ${otp}`);
    } catch (emailErr) {
      console.error('Failed to send OTP email:', emailErr.message);
      // Clean up the temp OTP
      await TempOTP.deleteOne({ email });
      return res.status(500).json({ msg: 'Failed to send OTP email. Please check the email address and try again.' });
    }

    res.json({ msg: 'OTP sent! Check your inbox.' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// STEP 2 — Verify OTP, return a short-lived emailToken proving ownership
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const tempRecord = await TempOTP.findOne({ email });
    if (!tempRecord) {
      return res.status(400).json({ msg: 'No OTP found for this email. Please request a new one.' });
    }
    if (tempRecord.otp !== otp) {
      return res.status(400).json({ msg: 'Invalid OTP. Please check and try again.' });
    }
    if (new Date() > tempRecord.expiresAt) {
      await TempOTP.deleteOne({ email });
      return res.status(400).json({ msg: 'OTP has expired. Please request a new one.' });
    }

    // OTP is valid — delete it and return a signed proof token (30 min)
    await TempOTP.deleteOne({ email });
    const emailToken = jwt.sign({ verifiedEmail: email }, JWT_SECRET, { expiresIn: '30m' });

    res.json({ msg: 'Email verified! Please complete your registration.', emailToken });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// STEP 3 — Complete registration using the emailToken + name + password
router.post('/register', async (req, res) => {
  try {
    const { emailToken, name, password } = req.body;

    // Decode and validate the emailToken issued after OTP verification
    let verifiedEmail;
    try {
      const decoded = jwt.verify(emailToken, JWT_SECRET);
      verifiedEmail = decoded.verifiedEmail;
    } catch (err) {
      return res.status(400).json({ msg: 'Email verification expired or invalid. Please start over.' });
    }

    // Double-check no account was created in the meantime
    const existingUser = await User.findOne({ email: verifiedEmail });
    if (existingUser) {
      return res.status(400).json({ msg: 'An account with this email already exists. Please log in.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email: verifiedEmail,
      password: hashedPassword,
      role: 'user',
      isVerified: true, // Already verified via OTP
    });
    await user.save();

    // Send welcome email
    try {
      await transporter.sendMail({
        to: verifiedEmail,
        subject: 'Welcome to Maharashtra LULC Portal! 🎉',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0;">🗺️ Maharashtra LULC Portal</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #1e293b;">Welcome aboard, ${name}! 🎉</h2>
              <p style="color: #64748b;">Your account has been created and your email verified. You can now log in and explore the GIS portal.</p>
            </div>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('Welcome email failed:', emailErr.message);
    }

    res.json({ msg: 'Registration successful! You can now log in.' });
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
