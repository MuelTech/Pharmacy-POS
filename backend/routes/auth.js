const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { pool } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login endpoint
router.post('/login', 
  loginLimiter,
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { username, password } = req.body;

      // Query user from database
      const [rows] = await pool.execute(
        'SELECT account_id, username, password, role, is_active, pharmacist_id FROM accounts WHERE username = ?',
        [username]
      );

      const user = rows[0];

      // Check if account exists and is active, and verify password
      const isValidUser = user && user.is_active;
      const isPasswordValid = isValidUser ? await bcrypt.compare(password, user.password) : false;

      if (!isValidUser || !isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password'
        });
      }

      // Update last login timestamp
      await pool.execute(
        'UPDATE accounts SET last_login = CURRENT_TIMESTAMP WHERE account_id = ?',
        [user.account_id]
      );

      // Generate JWT token
      const token = jwt.sign(
        { 
          account_id: user.account_id,
          username: user.username,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Return success response (without password)
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            account_id: user.account_id,
            username: user.username,
            role: user.role.toLowerCase(),
            pharmacist_id: user.pharmacist_id
          }
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Verify token endpoint
router.get('/verify', verifyToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: {
          account_id: req.user.account_id,
          username: req.user.username,
          role: req.user.role
        }
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Logout endpoint (client-side token removal, but server can track if needed)
router.post('/logout', verifyToken, async (req, res) => {
  try {
    // You could implement token blacklisting here if needed
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT account_id, username, role, pharmacist_id, created_at, last_login FROM accounts WHERE account_id = ?',
      [req.user.account_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userProfile = {
      ...rows[0],
      role: rows[0].role.toLowerCase()
    };

    res.json({
      success: true,
      data: {
        user: userProfile
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get pharmacist information for authenticated user
router.get('/pharmacist', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT a.account_id, a.username, a.role, 
             p.pharmacist_id, p.first_name, p.last_name, 
             p.phone_number, p.email, p.license_number,
             CONCAT(p.first_name, ' ', p.last_name) as full_name
      FROM accounts a
      LEFT JOIN pharmacists p ON a.pharmacist_id = p.pharmacist_id
      WHERE a.account_id = ?
    `, [req.user.account_id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const pharmacistInfo = rows[0];

    res.json({
      success: true,
      data: {
        user: {
          account_id: pharmacistInfo.account_id,
          username: pharmacistInfo.username,
          role: pharmacistInfo.role.toLowerCase(),
          pharmacist_id: pharmacistInfo.pharmacist_id,
          first_name: pharmacistInfo.first_name,
          last_name: pharmacistInfo.last_name,
          full_name: pharmacistInfo.full_name,
          phone_number: pharmacistInfo.phone_number,
          email: pharmacistInfo.email,
          license_number: pharmacistInfo.license_number
        }
      }
    });
  } catch (error) {
    console.error('Pharmacist info fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 