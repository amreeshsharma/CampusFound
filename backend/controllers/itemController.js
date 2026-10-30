/**
 * CampusFind 2.0 - Items Controller
 * Complete CRUD, Multer image upload handling, QR token generation, search & filter engine
 */

const path = require('path');
const fs = require('fs');
const { db } = require('../config/db');

/**
 * Valid Status Transitions
 */
const VALID_STATUSES = ['open', 'claim_pending', 'recovered', 'closed'];

/**
 * @route   POST /api/items
 * @desc    Report a new lost or found item with optional photo upload
 * @access  Private (authMiddleware)
 */
const createItem = async (req, res, next) => {
  try {
    const {
      title,
      category_id,
      description,
      item_type,
      color,
      location,
      item_date
    } = req.body;

    // 1. Validation: Required fields
    if (!title || !description || !item_type || !color || !location || !item_date) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, type (lost/found), color, location, and date are required fields.'
      });
    }

    if (item_type !== 'lost' && item_type !== 'found') {
      return res.status(400).json({
        success: false,
        message: 'Item type must be either "lost" or "found".'
      });
    }

    // 2. Resolve category ID
    let finalCategoryId = null;
    if (category_id && !isNaN(parseInt(category_id, 10))) {
      finalCategoryId = parseInt(category_id, 10);
    } else if (req.body.category) {
      // Lookup category by name if name was provided
      const [catRows] = await db.query(
        'SELECT id FROM categories WHERE category_name LIKE ? LIMIT 1',
        [`%${req.body.category.trim()}%`]
      );
      if (catRows.length > 0) {
        finalCategoryId = catRows[0].id;
      }
    }

    // 3. Image path if uploaded via Multer
    const image_path = req.file ? `/uploads/${req.file.filename}` : null;

    // 4. Generate unique QR Token for found items
    let qr_token = null;
    if (item_type === 'found') {
      const randomCode = Math.floor(Math.random() * 90000 + 10000);
      qr_token = `QR-FND-${Date.now().toString(36).toUpperCase()}-${randomCode}`;
    }

    // 5. Insert item into MySQL using parameterized SQL
    const [result] = await db.query(
      `INSERT INTO items 
       (user_id, category_id, title, description, item_type, color, location, item_date, image_path, status, qr_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
      [
        req.user.id,
        finalCategoryId,
        title.trim(),
        description.trim(),
        item_type,
        color.trim(),
        location.trim(),
        item_date,
        image_path,
        qr_token
      ]
    );

    // 6. Fetch created item with joined category details
    const [createdRows] = await db.query(
      `SELECT 
        i.*,
        c.category_name,
        u.name AS reporter_name,
        u.email AS reporter_email,
        u.department AS reporter_department
       FROM items i
       LEFT JOIN categories c ON i.category_id = c.id
       LEFT JOIN users u ON i.user_id = u.id
       WHERE i.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: `${item_type === 'lost' ? 'Lost' : 'Found'} item reported successfully.`,
      data: createdRows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/items
 * @desc    Get all items with comprehensive backend filtering & search
 * @access  Public
 */
const getAllItems = async (req, res, next) => {
  try {
    const { type, category_id, category, color, location, status, search } = req.query;

    let sql = `
      SELECT 
        i.id,
        i.user_id,
        i.category_id,
        c.category_name,
        i.title,
        i.description,
        i.item_type,
        i.color,
        i.location,
        i.item_date,
        i.image_path,
        i.status,
        i.qr_token,
        i.created_at,
        u.name AS reporter_name,
        u.department AS reporter_department
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN users u ON i.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    // Filter: Item type (lost / found)
    if (type && (type === 'lost' || type === 'found')) {
      sql += ` AND i.item_type = ?`;
      params.push(type);
    }

    // Filter: Category ID
    if (category_id && !isNaN(parseInt(category_id, 10))) {
      sql += ` AND i.category_id = ?`;
      params.push(parseInt(category_id, 10));
    }

    // Filter: Category Name
    if (category && category.trim() !== '') {
      sql += ` AND c.category_name LIKE ?`;
      params.push(`%${category.trim()}%`);
    }

    // Filter: Color
    if (color && color.trim() !== '') {
      sql += ` AND i.color LIKE ?`;
      params.push(`%${color.trim()}%`);
    }

    // Filter: Location
    if (location && location.trim() !== '') {
      sql += ` AND i.location LIKE ?`;
      params.push(`%${location.trim()}%`);
    }

    // Filter: Status
    if (status && VALID_STATUSES.includes(status)) {
      sql += ` AND i.status = ?`;
      params.push(status);
    }

    // Keyword Search across title, description, location, color, category
    if (search && search.trim() !== '') {
      const searchTerm = `%${search.trim()}%`;
      sql += ` AND (
        i.title LIKE ? OR 
        i.description LIKE ? OR 
        i.location LIKE ? OR 
        i.color LIKE ? OR
        c.category_name LIKE ?
      )`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sql += ` ORDER BY i.created_at DESC`;

    const [items] = await db.query(sql, params);

    res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/items/:id
 * @desc    Get single item by ID with joined category and reporter details
 * @access  Public
 */
const getItemById = async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.id, 10);

    if (isNaN(itemId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID parameter. Must be an integer.'
      });
    }

    const sql = `
      SELECT 
        i.id,
        i.user_id,
        i.category_id,
        c.category_name,
        i.title,
        i.description,
        i.item_type,
        i.color,
        i.location,
        i.item_date,
        i.image_path,
        i.status,
        i.qr_token,
        i.created_at,
        u.name AS reporter_name,
        u.email AS reporter_email,
        u.department AS reporter_department,
        u.phone AS reporter_phone
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.id = ?
    `;

    const [rows] = await db.query(sql, [itemId]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Item with ID #${itemId} was not found in the database.`
      });
    }

    res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/items/:id
 * @desc    Update an item report (Owner or Admin only)
 * @access  Private (authMiddleware)
 */
const updateItem = async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    if (isNaN(itemId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID parameter.'
      });
    }

    // 1. Fetch existing item
    const [existing] = await db.query('SELECT * FROM items WHERE id = ?', [itemId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Item with ID #${itemId} was not found.`
      });
    }

    const item = existing[0];

    // 2. Authorization: Only the original reporter or an administrator can update
    if (req.user.id !== item.user_id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. You can only edit reports that you created.'
      });
    }

    // 3. Extract and validate update fields
    const {
      title,
      description,
      category_id,
      color,
      location,
      item_date,
      status
    } = req.body;

    const updatedTitle = title ? title.trim() : item.title;
    const updatedDescription = description ? description.trim() : item.description;
    const updatedCategoryId = category_id !== undefined ? (parseInt(category_id, 10) || null) : item.category_id;
    const updatedColor = color ? color.trim() : item.color;
    const updatedLocation = location ? location.trim() : item.location;
    const updatedItemDate = item_date || item.item_date;

    // Validate status transition
    let updatedStatus = item.status;
    if (status && VALID_STATUSES.includes(status)) {
      updatedStatus = status;
    }

    // Handle new photo replacement
    let updatedImagePath = item.image_path;
    if (req.file) {
      updatedImagePath = `/uploads/${req.file.filename}`;
      // Clean up previous file if stored locally
      if (item.image_path && item.image_path.startsWith('/uploads/item-')) {
        const oldFile = path.join(__dirname, '..', item.image_path);
        if (fs.existsSync(oldFile)) {
          try { fs.unlinkSync(oldFile); } catch (e) { /* ignore */ }
        }
      }
    }

    // 4. Update record in MySQL
    await db.query(
      `UPDATE items 
       SET title = ?, description = ?, category_id = ?, color = ?, 
           location = ?, item_date = ?, status = ?, image_path = ?
       WHERE id = ?`,
      [
        updatedTitle,
        updatedDescription,
        updatedCategoryId,
        updatedColor,
        updatedLocation,
        updatedItemDate,
        updatedStatus,
        updatedImagePath,
        itemId
      ]
    );

    // 5. Fetch and return updated item
    const [updatedRows] = await db.query(
      `SELECT i.*, c.category_name, u.name AS reporter_name 
       FROM items i
       LEFT JOIN categories c ON i.category_id = c.id
       LEFT JOIN users u ON i.user_id = u.id
       WHERE i.id = ?`,
      [itemId]
    );

    res.status(200).json({
      success: true,
      message: 'Item report updated successfully.',
      data: updatedRows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/items/:id
 * @desc    Delete an item report (Owner or Admin only)
 * @access  Private (authMiddleware)
 */
const deleteItem = async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    if (isNaN(itemId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID parameter.'
      });
    }

    // 1. Fetch existing item
    const [existing] = await db.query('SELECT * FROM items WHERE id = ?', [itemId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Item with ID #${itemId} was not found.`
      });
    }

    const item = existing[0];

    // 2. Authorization: Only owner or admin can delete
    if (req.user.id !== item.user_id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. You can only delete reports that you created.'
      });
    }

    // 3. Delete associated photo from uploads directory
    if (item.image_path && item.image_path.startsWith('/uploads/item-')) {
      const filePath = path.join(__dirname, '..', item.image_path);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
      }
    }

    // 4. Delete item record from MySQL (Cascade automatically cleans up claims)
    await db.query('DELETE FROM items WHERE id = ?', [itemId]);

    res.status(200).json({
      success: true,
      message: `Item #${itemId} was deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem
};
