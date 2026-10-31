/**
 * CampusFind 2.0 - Dashboard & Analytics Routes
 */

const express = require('express');
const router = express.Router();

const {
  getStudentStats,
  getAdminStats,
  getAnalytics
} = require('../controllers/dashboardController');

const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Student Dashboard Statistics Endpoint
router.get('/student-stats', authMiddleware, getStudentStats);

// Administrative Dashboard Statistics & Visual Analytics Endpoints
router.get('/admin-stats', authMiddleware, adminMiddleware, getAdminStats);
router.get('/analytics', authMiddleware, adminMiddleware, getAnalytics);

module.exports = router;
