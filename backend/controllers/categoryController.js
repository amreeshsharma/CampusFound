/**
 * CampusFind 2.0 - Category Controller
 * Handles retrieval and administrative management of item classification categories
 */

const { db } = require('../config/db');

/**
 * @route   GET /api/categories
 * @desc    Get all item categories from MySQL with optional item counts
 * @access  Public
 */
const getAllCategories = async (req, res, next) => {
  try {
    const [categories] = await db.query(
      `SELECT c.id, c.category_name, c.description, c.created_at, COUNT(i.id) AS item_count
       FROM categories c
       LEFT JOIN items i ON c.id = i.category_id
       GROUP BY c.id
       ORDER BY c.id ASC`
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

/**
 * @route   POST /api/categories
 * @desc    Create a new item category (Admin only)
 * @access  Private (authMiddleware + adminMiddleware)
 */
const createCategory = async (req, res, next) => {
  try {
    const { category_name, description } = req.body;

    if (!category_name || category_name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Category name is required.'
      });
    }

    const trimmedName = category_name.trim();

    // Check duplicate
    const [existing] = await db.query(
      'SELECT id FROM categories WHERE category_name = ?',
      [trimmedName]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Category "${trimmedName}" already exists.`
      });
    }

    const [result] = await db.query(
      'INSERT INTO categories (category_name, description) VALUES (?, ?)',
      [trimmedName, description ? description.trim() : null]
    );

    res.status(201).json({
      success: true,
      message: `Category "${trimmedName}" created successfully.`,
      data: {
        id: result.insertId,
        category_name: trimmedName,
        description: description ? description.trim() : null,
        item_count: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCategories,
  createCategory
};
