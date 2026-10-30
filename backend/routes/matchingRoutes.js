/**
 * CampusFind 2.0 - Matching Routes
 */

const express = require('express');
const router = express.Router();
const { getMyMatches } = require('../controllers/matchingController');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/matches/my-matches - Smart matches for logged-in user
router.get('/my-matches', authMiddleware, getMyMatches);

module.exports = router;

