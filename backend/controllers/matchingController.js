/**
 * CampusFind 2.0 - Matching Controller
 * Exposes rule-based smart match suggestions and explanations
 */

const { findMatchesForItem, findMatchesForUser } = require('../services/matchingService');

/**
 * @route   GET /api/items/:id/matches
 * @desc    Get possible smart matches for a specific item
 * @access  Public
 */
const getItemMatches = async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    const threshold = req.query.threshold ? parseInt(req.query.threshold, 10) : 40;

    if (isNaN(itemId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID parameter.'
      });
    }

    const matches = await findMatchesForItem(itemId, threshold);

    res.status(200).json({
      success: true,
      count: matches.length,
      threshold,
      data: matches
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/matches/my-matches
 * @desc    Get possible smart matches for all active lost items reported by the logged-in student
 * @access  Private (authMiddleware)
 */
const getMyMatches = async (req, res, next) => {
  try {
    const threshold = req.query.threshold ? parseInt(req.query.threshold, 10) : 40;
    const matches = await findMatchesForUser(req.user.id, threshold);

    res.status(200).json({
      success: true,
      count: matches.length,
      data: matches
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getItemMatches,
  getMyMatches
};

