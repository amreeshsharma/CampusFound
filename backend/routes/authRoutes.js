/**
 * CampusFind 2.0 - Authentication & Role-Based Routes
 */

const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword
} = require('../controllers/authController');

const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public Authentication Endpoints
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Protected Student / User Endpoints
router.get('/me', authMiddleware, getMe);
router.put('/profile', authMiddleware, updateProfile);
router.put('/change-password', authMiddleware, changePassword);

// Administrative Protected Endpoint (Demonstration & Verification)
router.get('/admin-only', authMiddleware, adminMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authorized: Access granted to Administrative Console API.',
    user: req.user
  });
});

module.exports = router;

