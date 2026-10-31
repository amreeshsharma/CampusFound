/**
 * CampusFind 2.0 - User Management Routes
 */

const express = require('express');
const router = express.Router();

const { getAllUsers } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Admin User Management Endpoints
router.get('/', authMiddleware, adminMiddleware, getAllUsers);

module.exports = router;
