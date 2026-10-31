/**
 * CampusFind 2.0 - Dashboard & Analytics Controller
 * Serves real MySQL metrics, aggregate statistics, and Chart.js datasets
 */

const { db } = require('../config/db');
const { findMatchesForUser } = require('../services/matchingService');

/**
 * @route   GET /api/dashboard/student-stats
 * @desc    Get comprehensive metrics and activity for the authenticated student
 * @access  Private (authMiddleware)
 */
const getStudentStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Parallel queries for student report metrics
    const [
      [totalReportsRows],
      [lostRows],
      [foundRows],
      [pendingClaimsRows],
      [approvedClaimsRows],
      [recentReports],
      [recentNotifications]
    ] = await Promise.all([
      db.query('SELECT COUNT(*) AS count FROM items WHERE user_id = ?', [userId]),
      db.query("SELECT COUNT(*) AS count FROM items WHERE user_id = ? AND item_type = 'lost'", [userId]),
      db.query("SELECT COUNT(*) AS count FROM items WHERE user_id = ? AND item_type = 'found'", [userId]),
      db.query("SELECT COUNT(*) AS count FROM claims WHERE claimant_id = ? AND status = 'pending'", [userId]),
      db.query("SELECT COUNT(*) AS count FROM claims WHERE claimant_id = ? AND status = 'approved'", [userId]),
      db.query(
        `SELECT i.id, i.title, i.item_type, i.status, i.location, i.item_date, i.created_at, c.category_name, i.qr_token
         FROM items i
         LEFT JOIN categories c ON i.category_id = c.id
         WHERE i.user_id = ?
         ORDER BY i.created_at DESC
         LIMIT 5`,
        [userId]
      ),
      db.query(
        `SELECT id, message, notification_type, is_read, created_at
         FROM notifications
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 5`,
        [userId]
      )
    ]);

    // 2. Fetch real rule-based match suggestions for this student
    let possibleMatches = [];
    try {
      possibleMatches = await findMatchesForUser(userId);
    } catch (err) {
      console.warn('Match calculation notice:', err.message);
    }

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          total_reports: totalReportsRows[0].count,
          lost_items: lostRows[0].count,
          found_items: foundRows[0].count,
          possible_matches: possibleMatches.length,
          pending_claims: pendingClaimsRows[0].count,
          approved_claims: approvedClaimsRows[0].count
        },
        possible_matches: possibleMatches.slice(0, 3), // top 3 matches
        recent_reports: recentReports,
        recent_notifications: recentNotifications
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/dashboard/admin-stats
 * @desc    Get campus-wide platform statistics and recent activities for administrators
 * @access  Private (authMiddleware + adminMiddleware)
 */
const getAdminStats = async (req, res, next) => {
  try {
    // 1. Parallel queries for platform KPIs
    const [
      [usersRows],
      [lostRows],
      [foundRows],
      [claimsRows],
      [pendingClaimsRows],
      [resolvedRows]
    ] = await Promise.all([
      db.query('SELECT COUNT(*) AS count FROM users'),
      db.query("SELECT COUNT(*) AS count FROM items WHERE item_type = 'lost'"),
      db.query("SELECT COUNT(*) AS count FROM items WHERE item_type = 'found'"),
      db.query('SELECT COUNT(*) AS count FROM claims'),
      db.query("SELECT COUNT(*) AS count FROM claims WHERE status = 'pending'"),
      db.query("SELECT COUNT(*) AS count FROM items WHERE status IN ('recovered', 'closed')")
    ]);

    // 2. Compile Recent Platform Activities (Reports, Claims, Approvals)
    const [recentItems] = await db.query(
      `SELECT i.id, i.title, i.item_type, i.status, i.created_at, u.name as user_name
       FROM items i
       JOIN users u ON i.user_id = u.id
       ORDER BY i.created_at DESC
       LIMIT 4`
    );

    const [recentClaims] = await db.query(
      `SELECT c.id, c.status, c.created_at, i.title as item_title, u.name as claimant_name
       FROM claims c
       JOIN items i ON c.item_id = i.id
       JOIN users u ON c.claimant_id = u.id
       ORDER BY c.created_at DESC
       LIMIT 4`
    );

    // Merge & sort activities chronologically
    const activities = [
      ...recentItems.map(item => ({
        id: `item-${item.id}`,
        type: item.item_type === 'lost' ? 'lost_report' : 'found_report',
        title: item.item_type === 'lost' ? 'Lost Item Logged' : 'Found Item Handed In',
        description: `"${item.title}" reported by ${item.user_name}`,
        created_at: item.created_at
      })),
      ...recentClaims.map(claim => ({
        id: `claim-${claim.id}`,
        type: 'claim_action',
        title: `Claim ${claim.status.toUpperCase()}`,
        description: `${claim.claimant_name} filed claim for "${claim.item_title}"`,
        created_at: claim.created_at
      }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8);

    res.status(200).json({
      success: true,
      data: {
        kpis: {
          total_users: usersRows[0].count,
          total_lost: lostRows[0].count,
          total_found: foundRows[0].count,
          total_claims: claimsRows[0].count,
          pending_claims: pendingClaimsRows[0].count,
          resolved_cases: resolvedRows[0].count
        },
        recent_activities: activities
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/dashboard/analytics
 * @desc    Get real aggregation datasets for Chart.js analytics visualizations
 * @access  Private (authMiddleware + adminMiddleware)
 */
const getAnalytics = async (req, res, next) => {
  try {
    // 1. Lost vs Found Distribution
    const [lostFoundRows] = await db.query(
      `SELECT item_type, COUNT(*) as count 
       FROM items 
       GROUP BY item_type`
    );
    let lostCount = 0;
    let foundCount = 0;
    lostFoundRows.forEach(r => {
      if (r.item_type === 'lost') lostCount = parseInt(r.count, 10);
      if (r.item_type === 'found') foundCount = parseInt(r.count, 10);
    });

    // 2. Monthly Lost & Found Item Reports (Past 6 Months)
    const [monthlyRows] = await db.query(
      `SELECT 
        DATE_FORMAT(item_date, '%b %Y') as month_label,
        DATE_FORMAT(item_date, '%Y-%m') as sort_key,
        SUM(CASE WHEN item_type = 'lost' THEN 1 ELSE 0 END) as lost_count,
        SUM(CASE WHEN item_type = 'found' THEN 1 ELSE 0 END) as found_count
       FROM items
       GROUP BY sort_key, month_label
       ORDER BY sort_key ASC
       LIMIT 6`
    );

    // Fallback if low volume in dev
    const monthlyLabels = monthlyRows.length > 0
      ? monthlyRows.map(r => r.month_label)
      : ['Aug 2026', 'Sep 2026', 'Oct 2026'];
    const monthlyLost = monthlyRows.length > 0
      ? monthlyRows.map(r => parseInt(r.lost_count, 10))
      : [lostCount, 0, 0];
    const monthlyFound = monthlyRows.length > 0
      ? monthlyRows.map(r => parseInt(r.found_count, 10))
      : [foundCount, 0, 0];

    // 3. Claim Status Distribution
    const [claimStatusRows] = await db.query(
      `SELECT status, COUNT(*) as count 
       FROM claims 
       GROUP BY status`
    );
    const claimDistribution = {
      pending: 0,
      approved: 0,
      rejected: 0,
      verified: 0
    };
    claimStatusRows.forEach(r => {
      if (claimDistribution[r.status] !== undefined) {
        claimDistribution[r.status] = parseInt(r.count, 10);
      }
    });

    // 4. Most Frequently Reported Categories
    const [categoryRows] = await db.query(
      `SELECT c.category_name, COUNT(i.id) as count
       FROM categories c
       LEFT JOIN items i ON c.id = i.category_id
       GROUP BY c.id, c.category_name
       ORDER BY count DESC
       LIMIT 6`
    );

    const categoryLabels = categoryRows.map(r => r.category_name);
    const categoryCounts = categoryRows.map(r => parseInt(r.count, 10));

    res.status(200).json({
      success: true,
      data: {
        lostVsFound: {
          labels: ['Reported Lost', 'Found in Custody'],
          counts: [lostCount, foundCount]
        },
        monthlyReports: {
          labels: monthlyLabels,
          lost: monthlyLost,
          found: monthlyFound
        },
        claimStatus: {
          labels: ['Pending', 'Approved', 'Rejected', 'Verified'],
          counts: [
            claimDistribution.pending,
            claimDistribution.approved,
            claimDistribution.rejected,
            claimDistribution.verified
          ]
        },
        categoriesDistribution: {
          labels: categoryLabels,
          counts: categoryCounts
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudentStats,
  getAdminStats,
  getAnalytics
};

