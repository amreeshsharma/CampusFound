/**
 * CampusFind 2.0 - Ownership Claim Controller
 * Manages claim submissions, fraud checks, admin audits, and automated notifications
 */

const { db } = require('../config/db');
const { createNotification } = require('../services/notificationService');

const VALID_CLAIM_STATUSES = ['pending', 'verified', 'approved', 'rejected'];

/**
 * @route   POST /api/claims
 * @desc    Submit an ownership claim for a found item
 * @access  Private (authMiddleware)
 */
const createClaim = async (req, res, next) => {
  try {
    const { item_id, verification_details } = req.body;

    // 1. Validate required fields
    if (!item_id || !verification_details || verification_details.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Item ID and detailed ownership verification statements are required.'
      });
    }

    const itemIdInt = parseInt(item_id, 10);
    if (isNaN(itemIdInt)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item ID format.'
      });
    }

    // 2. Fetch target item
    const [itemRows] = await db.query(
      'SELECT id, user_id, title, item_type, status FROM items WHERE id = ?',
      [itemIdInt]
    );

    if (itemRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Found item #${itemIdInt} does not exist in the campus registry.`
      });
    }

    const item = itemRows[0];

    // 3. Validate item eligibility
    if (item.item_type !== 'found') {
      return res.status(400).json({
        success: false,
        message: 'Ownership claims can only be submitted for found items.'
      });
    }

    if (item.status === 'recovered' || item.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'This item has already been recovered by its owner and closed.'
      });
    }

    if (item.user_id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot submit an ownership claim on an item that you reported finding.'
      });
    }

    // 4. Duplicate Claim Check
    const [existingClaims] = await db.query(
      `SELECT id, status FROM claims 
       WHERE item_id = ? AND claimant_id = ? AND status IN ('pending', 'verified', 'approved')`,
      [itemIdInt, req.user.id]
    );

    if (existingClaims.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted an active ownership claim for this item. Check "My Claims".'
      });
    }

    // 5. Store claim in MySQL
    const [result] = await db.query(
      `INSERT INTO claims (item_id, claimant_id, verification_details, status) 
       VALUES (?, ?, ?, 'pending')`,
      [itemIdInt, req.user.id, verification_details.trim()]
    );

    const claimId = result.insertId;

    // 6. Update item status to 'claim_pending' if it was 'open'
    await db.query(
      `UPDATE items SET status = 'claim_pending' WHERE id = ? AND status = 'open'`,
      [itemIdInt]
    );

    // 7. Dispatch Notification to Claimant
    await createNotification(
      req.user.id,
      `Your ownership claim for "${item.title}" has been recorded. Campus Security Admin will review your verification details.`,
      'claim_submitted'
    );

    res.status(201).json({
      success: true,
      message: 'Ownership claim submitted successfully. Monitor status under "My Claims".',
      data: {
        id: claimId,
        item_id: itemIdInt,
        item_title: item.title,
        status: 'pending',
        verification_details: verification_details.trim(),
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/claims/my-claims
 * @desc    Get all claims submitted by the authenticated student
 * @access  Private (authMiddleware)
 */
const getMyClaims = async (req, res, next) => {
  try {
    const [claims] = await db.query(
      `SELECT 
        c.id,
        c.item_id,
        c.claimant_id,
        c.verification_details,
        c.status,
        c.admin_remarks,
        c.created_at,
        c.updated_at,
        i.title AS item_title,
        i.item_type,
        i.color,
        i.location,
        i.item_date,
        i.image_path,
        i.status AS item_status,
        i.qr_token,
        cat.category_name
       FROM claims c
       JOIN items i ON c.item_id = i.id
       LEFT JOIN categories cat ON i.category_id = cat.id
       WHERE c.claimant_id = ?
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    res.status(200).json({
      success: true,
      count: claims.length,
      data: claims
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/claims
 * @desc    Get all claims across the campus platform (Admin only)
 * @access  Private (authMiddleware + adminMiddleware)
 */
const getAllClaims = async (req, res, next) => {
  try {
    const [claims] = await db.query(
      `SELECT 
        c.id,
        c.item_id,
        c.claimant_id,
        c.verification_details,
        c.status,
        c.admin_remarks,
        c.created_at,
        c.updated_at,
        u.name AS claimant_name,
        u.email AS claimant_email,
        u.student_id AS claimant_student_id,
        u.department AS claimant_department,
        u.phone AS claimant_phone,
        i.title AS item_title,
        i.item_type,
        i.color,
        i.location,
        i.image_path,
        i.status AS item_status,
        i.qr_token,
        cat.category_name
       FROM claims c
       JOIN users u ON c.claimant_id = u.id
       JOIN items i ON c.item_id = i.id
       LEFT JOIN categories cat ON i.category_id = cat.id
       ORDER BY c.created_at DESC`
    );

    res.status(200).json({
      success: true,
      count: claims.length,
      data: claims
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/claims/:id
 * @desc    Get detailed claim by ID (Claimant or Admin only)
 * @access  Private (authMiddleware)
 */
const getClaimById = async (req, res, next) => {
  try {
    const claimId = parseInt(req.params.id, 10);
    if (isNaN(claimId)) {
      return res.status(400).json({ success: false, message: 'Invalid claim ID.' });
    }

    const [rows] = await db.query(
      `SELECT 
        c.*,
        u.name AS claimant_name,
        u.email AS claimant_email,
        u.student_id AS claimant_student_id,
        u.department AS claimant_department,
        i.title AS item_title,
        i.color,
        i.location,
        i.item_date,
        i.status AS item_status,
        i.qr_token,
        cat.category_name
       FROM claims c
       JOIN users u ON c.claimant_id = u.id
       JOIN items i ON c.item_id = i.id
       LEFT JOIN categories cat ON i.category_id = cat.id
       WHERE c.id = ?`,
      [claimId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: `Claim #${claimId} not found.` });
    }

    const claim = rows[0];

    // Authorization: Must be the claimant or an administrator
    if (req.user.id !== claim.claimant_id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. You can only view your own ownership claims.'
      });
    }

    res.status(200).json({
      success: true,
      data: claim
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/claims/:id/status
 * @desc    Approve or reject claim, add remarks, update item status (Admin only)
 * @access  Private (authMiddleware + adminMiddleware)
 */
const updateClaimStatus = async (req, res, next) => {
  try {
    const claimId = parseInt(req.params.id, 10);
    const { status, admin_remarks } = req.body;

    if (isNaN(claimId)) {
      return res.status(400).json({ success: false, message: 'Invalid claim ID.' });
    }

    if (!status || !VALID_CLAIM_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_CLAIM_STATUSES.join(', ')}`
      });
    }

    // 1. Fetch target claim
    const [claimRows] = await db.query(
      `SELECT c.*, i.title AS item_title 
       FROM claims c 
       JOIN items i ON c.item_id = i.id 
       WHERE c.id = ?`,
      [claimId]
    );

    if (claimRows.length === 0) {
      return res.status(404).json({ success: false, message: `Claim #${claimId} not found.` });
    }

    const claim = claimRows[0];
    const remarks = admin_remarks ? admin_remarks.trim() : null;

    // 2. Update claim status & remarks
    await db.query(
      `UPDATE claims 
       SET status = ?, admin_remarks = ? 
       WHERE id = ?`,
      [status, remarks, claimId]
    );

    // 3. Handle Status Outcomes
    if (status === 'approved') {
      // Mark item as 'recovered'
      await db.query(`UPDATE items SET status = 'recovered' WHERE id = ?`, [claim.item_id]);

      // Notify claimant of approval
      await createNotification(
        claim.claimant_id,
        `Your claim for "${claim.item_title}" has been APPROVED! Visit Security Desk (Gate 1) with your Student ID for collection. Remarks: ${remarks || 'Verified ownership match.'}`,
        'claim_approved'
      );

      // Notify of item recovery
      await createNotification(
        claim.claimant_id,
        `Item "${claim.item_title}" marked as RECOVERED. Case resolved.`,
        'item_recovered'
      );

      // Automatically reject any other pending claims for this item
      await db.query(
        `UPDATE claims 
         SET status = 'rejected', admin_remarks = 'Item recovered by another verified owner.' 
         WHERE item_id = ? AND id != ? AND status = 'pending'`,
        [claim.item_id, claimId]
      );
    } else if (status === 'rejected') {
      // Notify claimant of rejection
      await createNotification(
        claim.claimant_id,
        `Your claim for "${claim.item_title}" was REJECTED. Remarks: ${remarks || 'Identifying details did not match.'}`,
        'claim_rejected'
      );

      // Check if there are other pending claims on this item
      const [remainingPending] = await db.query(
        `SELECT COUNT(*) AS pending_count FROM claims WHERE item_id = ? AND status = 'pending'`,
        [claim.item_id]
      );

      if (remainingPending[0].pending_count === 0) {
        // Reset item status back to 'open'
        await db.query(`UPDATE items SET status = 'open' WHERE id = ?`, [claim.item_id]);
      }
    }

    // 4. Return updated claim
    const [updatedRows] = await db.query(
      `SELECT c.*, i.title AS item_title 
       FROM claims c 
       JOIN items i ON c.item_id = i.id 
       WHERE c.id = ?`,
      [claimId]
    );

    res.status(200).json({
      success: true,
      message: `Claim #${claimId} status updated to "${status}".`,
      data: updatedRows[0]
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createClaim,
  getMyClaims,
  getAllClaims,
  getClaimById,
  updateClaimStatus
};

