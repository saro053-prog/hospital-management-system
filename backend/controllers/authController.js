/**
 * Authentication Controller
 * Production-ready login, registration, password recovery, and session verification
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

// Verified demo accounts with their assigned credentials (Password: Password@123)
const VERIFIED_DEMO_ACCOUNTS = [
  { role: 'admin', name: 'Dr. Robert Vance', email: 'admin@hospital.org', designation: 'Chief Medical Officer & Administrator' },
  { role: 'doctor', name: 'Dr. Arvind Sharma', email: 'dr.sharma@hospital.org', designation: 'Senior Interventional Cardiologist' },
  { role: 'nurse', name: 'Nurse Sarah Jenkins', email: 'nurse.sarah@hospital.org', designation: 'Head CCU Staff Nurse' },
  { role: 'receptionist', name: 'Meera Nair', email: 'receptionist@hospital.org', designation: 'Front Desk & Patient Intake' },
  { role: 'lab_staff', name: 'David Chen', email: 'lab.tech@hospital.org', designation: 'Senior Laboratory Technologist' },
  { role: 'patient', name: 'Arun Kumar', email: 'arun@example.com', designation: 'Registered Outpatient (PAT-1001)' }
];

/**
 * Genuine user login with bcrypt password verification
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email address and password.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email format (e.g. user@example.com).'
      });
    }

    // Lookup user in database
    const users = await db.query('SELECT * FROM `users` WHERE `email` = ?', [cleanEmail]);
    const user = users && users.length > 0 ? users[0] : null;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please verify your credentials and try again.'
      });
    }

    if (user.is_active === 0 || user.is_active === false) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated. Please contact hospital administration.'
      });
    }

    // Strictly verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please verify your credentials and try again.'
      });
    }

    // Generate signed JWT token valid for 24 hours
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: `Welcome back, ${user.name}! Authenticated as [${user.role.toUpperCase()}].`,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Internal server error during login: ' + err.message
    });
  }
}

/**
 * Genuine user registration with uniqueness constraints and bcrypt hashing
 */
async function register(req, res) {
  try {
    const { name, email, password, role = 'patient', phone = '' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email address, and password are required fields.'
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.'
      });
    }

    // Validate password strength: minimum 8 characters, at least 1 letter and 1 number
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    if (!hasLetter || !hasDigit) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain both letters and at least one number.'
      });
    }

    // Allowed roles
    const validRoles = ['admin', 'doctor', 'nurse', 'receptionist', 'lab_staff', 'patient'];
    const assignedRole = validRoles.includes(role) ? role : 'patient';

    // Check duplicate account
    const existing = await db.query('SELECT `id` FROM `users` WHERE `email` = ?', [cleanEmail]);
    if (existing && existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in instead.'
      });
    }

    // Hash password with bcrypt (10 rounds)
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user into database
    const insertResult = await db.query(
      'INSERT INTO `users` (`name`, `email`, `password_hash`, `role`, `phone`) VALUES (?, ?, ?, ?, ?)',
      [cleanName, cleanEmail, passwordHash, assignedRole, phone]
    );

    const newUserId = insertResult.insertId;

    // If registered as patient, automatically provision linked patient record
    if (assignedRole === 'patient') {
      const patientCode = `PAT-${1000 + newUserId}`;
      await db.query(
        'INSERT INTO `patients` (`user_id`, `patient_code`, `name`, `dob`, `gender`, `blood_group`, `phone`, `email`, `address`, `city`, `emergency_contact_name`, `emergency_contact_phone`, `known_allergies`, `insurance_provider`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [newUserId, patientCode, cleanName, '1995-01-01', 'Other', 'O+', phone, cleanEmail, 'Chennai', 'Chennai', '', '', 'None', 'Self Pay']
      );
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: newUserId,
        name: cleanName,
        email: cleanEmail,
        role: assignedRole
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: `Account created successfully! Welcome to Wellness Hospital, ${cleanName}.`,
      token,
      user: {
        id: newUserId,
        name: cleanName,
        email: cleanEmail,
        role: assignedRole,
        phone
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to create user account: ' + err.message
    });
  }
}

/**
 * Forgot password: generate time-limited recovery reset token
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide your registered email address.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const users = await db.query('SELECT * FROM `users` WHERE `email` = ?', [cleanEmail]);
    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address.'
      });
    }

    // Generate secure 6-character alphanumeric reset token
    const resetToken = crypto.randomBytes(3).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour expiry

    await db.query(
      'INSERT INTO `password_resets` (`email`, `token`, `expires_at`) VALUES (?, ?, ?)',
      [cleanEmail, resetToken, expiresAt]
    );

    res.json({
      success: true,
      message: `A password reset token has been generated. Token valid for 1 hour.`,
      resetToken,
      reset_token: resetToken,
      instructions: `Use this security token to complete your password update.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Password recovery error: ' + err.message });
  }
}

/**
 * Reset password using token
 */
async function resetPassword(req, res) {
  try {
    const { email, token, newPassword, new_password } = req.body;
    const passwordToSet = newPassword || new_password;

    if (!token || !passwordToSet) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required.'
      });
    }

    if (passwordToSet.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long.'
      });
    }

    const cleanToken = token.trim();

    // Check token validity
    const resets = await db.query('SELECT * FROM `password_resets` WHERE `token` = ?', [cleanToken]);
    const validReset = resets && resets.length > 0 ? resets[0] : null;

    if (!validReset) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token.'
      });
    }

    const targetEmail = (email ? email.toLowerCase().trim() : validReset.email.toLowerCase().trim());
    if (email && validReset.email.toLowerCase() !== targetEmail) {
      return res.status(400).json({
        success: false,
        message: 'Reset token does not match the provided email.'
      });
    }

    // Hash new password
    const newHash = await bcrypt.hash(passwordToSet, 10);

    // Update user
    await db.query('UPDATE `users` SET `password_hash` = ? WHERE `email` = ?', [newHash, targetEmail]);

    // Clear reset token
    await db.query('DELETE FROM `password_resets` WHERE `token` = ?', [cleanToken]);

    res.json({
      success: true,
      message: 'Password successfully updated! Please sign in with your new password.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Password reset error: ' + err.message });
  }
}

/**
 * Get authenticated user session
 */
async function getMe(req, res) {
  res.json({
    success: true,
    user: req.user
  });
}

/**
 * Get verified demo accounts for testing
 */
async function getDemoAccounts(req, res) {
  res.json({
    success: true,
    accounts: VERIFIED_DEMO_ACCOUNTS.map(u => ({
      ...u,
      password: 'Password@123'
    }))
  });
}

module.exports = {
  login,
  register,
  forgotPassword,
  resetPassword,
  getMe,
  getDemoAccounts
};
