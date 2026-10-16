/**
 * Notifications Controller
 * Manages in-app clinical, operational, and billing notification alerts
 */

const db = require('../config/db');

async function getNotifications(req, res) {
  try {
    const userRole = req.user ? req.user.role : null;
    let notifs = await db.query('SELECT * FROM `notifications` ORDER BY `id` DESC');

    if (userRole) {
      notifs = notifs.filter(n => !n.role || n.role === userRole || userRole === 'admin');
    }

    res.json({
      success: true,
      unreadCount: notifs.filter(n => !n.is_read).length,
      data: notifs,
      notifications: notifs
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve notifications: ' + err.message });
  }
}

async function markAllAsRead(req, res) {
  try {
    await db.query('UPDATE `notifications` SET `is_read` = 1');
    res.json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update notifications: ' + err.message });
  }
}

async function markOneAsRead(req, res) {
  try {
    const { id } = req.params;
    await db.query('UPDATE `notifications` SET `is_read` = 1 WHERE `id` = ?', [id]);
    res.json({
      success: true,
      message: 'Notification marked as read.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update notification: ' + err.message });
  }
}

module.exports = {
  getNotifications,
  markAllAsRead,
  markOneAsRead
};
