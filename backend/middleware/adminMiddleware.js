/**
 * CampusFind 2.0 - Admin Authorization Middleware
 * Restricts sensitive administrative operations to verified campus admins
 */

const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required before verifying role permissions.'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access forbidden. This resource requires administrative privileges.'
    });
  }

  next();
};

module.exports = adminMiddleware;

