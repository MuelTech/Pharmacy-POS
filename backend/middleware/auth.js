const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists and is active
    const [rows] = await pool.execute(
      'SELECT account_id, username, role, is_active FROM accounts WHERE account_id = ? AND is_active = 1',
      [decoded.account_id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token or user not found.' 
      });
    }

    // Keep role as stored in database (Admin/Staff)
    const user = {
      ...rows[0],
      role: rows[0].role
    };

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token.' 
    });
  }
};

// Check if user is Admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin privileges required.' 
    });
  }
  next();
};

// Check if user is Staff or Admin
const requireStaffOrAdmin = (req, res, next) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'Staff') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Staff or Admin privileges required.' 
    });
  }
  next();
};

module.exports = {
  verifyToken,
  requireAdmin,
  requireStaffOrAdmin
}; 