/**
 * CampusFind 2.0 - Category Routes
 */

const express = require('express');
const router = express.Router();
const { getAllCategories } = require('../controllers/categoryController');

// GET /api/categories - List all categories
router.get('/', getAllCategories);

module.exports = router;

