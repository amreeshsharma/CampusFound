/**
 * CampusFind 2.0 - Items Routes
 */

const express = require('express');
const router = express.Router();

const {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem
} = require('../controllers/itemController');

const { getItemMatches } = require('../controllers/matchingController');
const authMiddleware = require('../middleware/authMiddleware');
const { uploadItemImage } = require('../middleware/uploadMiddleware');

// Public Listing & Detail Endpoints
router.get('/', getAllItems);
router.get('/:id', getItemById);

// Rule-Based Smart Matching Endpoint for a specific item
router.get('/:id/matches', getItemMatches);

// Protected Reporting & Mutation Endpoints
router.post('/', authMiddleware, uploadItemImage, createItem);
router.put('/:id', authMiddleware, uploadItemImage, updateItem);
router.delete('/:id', authMiddleware, deleteItem);

module.exports = router;
