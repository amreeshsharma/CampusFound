/**
 * CampusFind 2.0 - Notification Controller
 * Manages notification retrieval, unread counters, and mark-as-read toggles
 */

const { db } = require('../config/db');

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for the authenticated user
 * @access  Private (authMiddleware)
 */
const getNotifications = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const [notifications] = await db.query(
      `SELECT id, user_id, message, notification_type, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [req.user.id, limit]
    );

    const [unreadResult] = await db.query(
      `SELECT COUNT(*) AS unread_count 
       FROM notifications 
       WHERE user_id = ? AND is_read = FALSE`,
      [req.user.id]
    );

    res.status(200).json({
      success: true,
      count: notifications.length,
      unread_count: unreadResult[0].unread_count || 0,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get count of unread notifications for badge display
 * @access  Private (authMiddleware)
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS unread_count 
       FROM notifications 
       WHERE user_id = ? AND is_read = FALSE`,
      [req.user.id]
    );

    res.status(200).json({
      success: true,
      unread_count: rows[0].unread_count || 0
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark a single notification as read
 * @access  Private (authMiddleware)
 */
const markAsRead = async (req, res, next) => {
  try {
    const notificationId = parseInt(req.params.id, 10);
    if (isNaN(notificationId)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID.' });
    }

    const [notifRows] = await db.query(
      `SELECT id, user_id FROM notifications WHERE id = ?`,
      [notificationId]
    );

    if (notifRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    if (notifRows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify this notification.' });
    }

    await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE id = ?`,
      [notificationId]
    );

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications for the user as read
 * @access  Private (authMiddleware)
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const [result] = await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE`,
      [req.user.id]
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      updated_count: result.affectedRows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private (authMiddleware)
 */
const deleteNotification = async (req, res, next) => {
  try {
    const notificationId = parseInt(req.params.id, 10);
    if (isNaN(notificationId)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID.' });
    }

    const [rows] = await db.query(
      `SELECT id, user_id FROM notifications WHERE id = ?`,
      [notificationId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this notification.' });
    }

    await db.query(`DELETE FROM notifications WHERE id = ?`, [notificationId]);

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
