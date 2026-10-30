/**
 * CampusFind 2.0 - Category Controller
 * Handles retrieval of item classification categories
 */

const { db } = require('../config/db');

/**
 * @route   GET /api/categories
 * @desc    Get all item categories from MySQL
 * @access  Public
 */
const getAllCategories = async (req, res, next) => {
  try {
    const [categories] = await db.query(
      'SELECT id, category_name, description, created_at FROM categories ORDER BY id ASC'
    );

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCategories
};

