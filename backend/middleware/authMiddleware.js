/**
 * CampusFind 2.0 - JWT Authentication Middleware
 * Protects private routes by verifying tokens from HTTP-only cookies or Authorization headers
 */

const jwt = require('jsonwebtoken');
const { db } = require('../config/db');

const authMiddleware = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check HTTP-only cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // 2. Check Authorization Bearer header (for Postman / API clients)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authentication token provided. Please sign in.'
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'campusfind_super_secure_jwt_secret_key_change_in_production_2026');

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
    if (error.name === 'TokenExpiredError') {
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
};

module.exports = authMiddleware;

