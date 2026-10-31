/**
 * CampusFind - JWT Authentication Middleware
 * Protects private routes by verifying tokens from Authorization headers or HTTP-only cookies
 */

const jwt = require('jsonwebtoken');
const { db } = require('../config/db');

const authMiddleware = async (req, res, next) => {
  try {
    const candidateTokens = [];

    // 1. Explicit Authorization Bearer header (sent by modern client via authFetch)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      const headerToken = req.headers.authorization.split(' ')[1];
      if (headerToken && headerToken !== 'null' && headerToken !== 'undefined') {
        candidateTokens.push(headerToken);
      }
    }

    // 2. HTTP-only cookie
    if (req.cookies && req.cookies.token) {
      if (!candidateTokens.includes(req.cookies.token)) {
        candidateTokens.push(req.cookies.token);
      }
    }

    if (candidateTokens.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authentication token provided. Please sign in.'
      });
    }

    let decoded = null;
    let lastError = null;

    // Verify token candidates
    for (const token of candidateTokens) {
      try {
        decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'campusfind_super_secure_jwt_secret_key_change_in_production_2026'
        );
        if (decoded && decoded.id) {
          break;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!decoded || !decoded.id) {
      if (lastError && lastError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Authentication session expired. Please sign in again.'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.'
      });
    }

    // Fetch user from MySQL database (omitting password hash)
    const [users] = await db.query(
      'SELECT id, name, email, role, student_id, department, phone, created_at FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'The user account associated with this token no longer exists.'
      });
    }

    // Attach authenticated user to request object
    req.user = users[0];
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication verification.'
    });
  }
};

module.exports = authMiddleware;

