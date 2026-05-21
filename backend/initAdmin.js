const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const initAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@lulc.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    // Check if the admin user exists
    let admin = await User.findOne({ email: adminEmail });

    if (!admin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      
      admin = new User({
        name: 'Super Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin'
      });
      await admin.save();
      console.log('Hardcoded Admin account created.');
    } else {
      // Ensure the role is admin in case it was changed
      if (admin.role !== 'admin') {
        admin.role = 'admin';
        await admin.save();
      }
      console.log('Hardcoded Admin account verified.');
    }

    // Enforce Singleton Admin: Demote any other users that have the 'admin' role
    const otherAdmins = await User.find({ email: { $ne: adminEmail }, role: 'admin' });
    if (otherAdmins.length > 0) {
      console.log(`Found ${otherAdmins.length} unauthorized admin(s). Demoting to user.`);
      for (const unauthorized of otherAdmins) {
        unauthorized.role = 'user';
        await unauthorized.save();
      }
    }
  } catch (err) {
    console.error('Error in initAdmin:', err);
  }
};

module.exports = initAdmin;
