/**
 * CampusFind 2.0 - Category Routes
 */

const express = require('express');
const router = express.Router();
const { getAllCategories, createCategory } = require('../controllers/categoryController');

const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public Category Listing
router.get('/', getAllCategories);

// Admin Category Management
router.post('/', authMiddleware, adminMiddleware, createCategory);

module.exports = router;
