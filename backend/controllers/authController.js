/**
 * CampusFind 2.0 - Authentication & User Controller
 * Handles student registration, credential validation, JWT issuance, and HTTP-only cookie management
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');

// Helper: Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET || 'campusfind_super_secure_jwt_secret_key_change_in_production_2026',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

// Helper: Configure Secure Cookie Options
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 Days
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new student account
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword, student_id, department, phone } = req.body;

    // 1. Validation: Required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, college email, and password are required fields.'
      });
    }

    // 2. Validation: Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    // 3. Validation: Password strength & match
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.'
      });
    }

    // 4. Check for duplicate email
    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this college email address already exists. Please sign in.'
      });
    }

    // 5. Hash password with bcryptjs
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 6. Insert new student into MySQL (Strictly enforce student role)
    const [result] = await db.query(
      `INSERT INTO users (name, email, password, role, student_id, department, phone) 
       VALUES (?, ?, ?, 'student', ?, ?, ?)`,
      [
        name.trim(),
        email.toLowerCase().trim(),
        hashedPassword,
        student_id ? student_id.trim() : null,
        department ? department.trim() : 'Computer Science & Engineering',
        phone ? phone.trim() : null
      ]
    );

    const newUser = {
      id: result.insertId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: 'student',
      student_id: student_id || null,
      department: department || 'Computer Science & Engineering',
      phone: phone || null
    };

    // 7. Generate JWT & Set HTTP-Only Cookie
    const token = generateToken(newUser);
    res.cookie('token', token, getCookieOptions());

    res.status(201).json({
      success: true,
      message: 'Student account registered successfully.',
      token,
      user: newUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user credentials and issue JWT
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both college email and password.'
      });
    }

    // Fetch user by email
    const [users] = await db.query(
      'SELECT id, name, email, password, role, student_id, department, phone FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid college email or password.'
      });
    }

    const user = users[0];

    // Secure password comparison
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid college email or password.'
      });
    }

    // Generate token
    const token = generateToken(user);

    // Set secure HTTP-only cookie
    res.cookie('token', token, getCookieOptions());

    res.status(200).json({
      success: true,
      message: 'Signed in successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        student_id: user.student_id,
        department: user.department,
        phone: user.phone
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Clear authentication cookie
 * @access  Public
 */
const logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });

  res.status(200).json({
    success: true,
    message: 'Signed out successfully.'
  });
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user profile
 * @access  Private (authMiddleware)
 */
const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user
  });
};

/**
 * @route   PUT /api/auth/profile
 * @desc    Update student profile details (role cannot be altered)
 * @access  Private (authMiddleware)
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, department, phone, student_id } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Name is a required field.'
      });
    }

    await db.query(
      `UPDATE users 
       SET name = ?, department = ?, phone = ?, student_id = ? 
       WHERE id = ?`,
      [
        name.trim(),
        department ? department.trim() : req.user.department,
        phone ? phone.trim() : req.user.phone,
        student_id ? student_id.trim() : req.user.student_id,
        req.user.id
      ]
    );

    const [updated] = await db.query(
      'SELECT id, name, email, role, student_id, department, phone FROM users WHERE id = ?',
      [req.user.id]
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: updated[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user account password
 * @access  Private (authMiddleware)
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match.'
      });
    }

    // Verify current password
    const [users] = await db.query(
      'SELECT password FROM users WHERE id = ?',
      [req.user.id]
    );

    const isMatch = await bcrypt.compare(currentPassword, users[0].password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password provided is incorrect.'
      });
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword
};

