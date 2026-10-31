/**
 * CampusFind 2.0 - Notification Service
 * Dispatches and stores notifications in MySQL for students and staff
 */

const { db } = require('../config/db');

/**
 * Creates and logs a user notification in MySQL
 * @param {number} userId - Recipient user ID
 * @param {string} message - Notification text
 * @param {string} notificationType - 'match', 'claim_submitted', 'claim_approved', 'claim_rejected', 'item_recovered', 'general'
 */
async function createNotification(userId, message, notificationType = 'general') {
  try {
    const [result] = await db.query(
      `INSERT INTO notifications (user_id, message, notification_type, is_read) 
       VALUES (?, ?, ?, FALSE)`,
      [userId, message, notificationType]
    );
    return result.insertId;
  } catch (error) {
    console.error('[NotificationService Error]: Failed to create notification:', error.message);
    return null;
  }
}

/**
 * Fetches notifications for a specific user
 */
async function getUserNotifications(userId) {
  const [rows] = await db.query(
    `SELECT * FROM notifications 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT 50`,
    [userId]
  );
  return rows;
}

/**
 * Marks all notifications as read for a user
 */
async function markNotificationsAsRead(userId) {
  await db.query(
    `UPDATE notifications 
     SET is_read = TRUE 
     WHERE user_id = ?`,
    [userId]
  );
  return true;
}

module.exports = {
  createNotification,
  getUserNotifications,
  markNotificationsAsRead
};

