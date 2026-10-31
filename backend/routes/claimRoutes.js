/**
 * CampusFind 2.0 - Claim Routes
 */

const express = require('express');
const router = express.Router();

const {
  createClaim,
  getMyClaims,
  getAllClaims,
  getClaimById,
  updateClaimStatus
} = require('../controllers/claimController');

const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Student Claim Operations
router.post('/', authMiddleware, createClaim);
router.get('/my-claims', authMiddleware, getMyClaims);
router.get('/:id', authMiddleware, getClaimById);

// Admin Claim Auditing Operations
router.get('/', authMiddleware, adminMiddleware, getAllClaims);
router.put('/:id/status', authMiddleware, adminMiddleware, updateClaimStatus);

module.exports = router;

