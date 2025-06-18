const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all accounts with pharmacist information (Admin only)
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT 
        a.account_id,
        a.username,
        a.role,
        a.is_active,
        a.created_at,
        a.updated_at,
        a.last_login,
        p.pharmacist_id,
        p.first_name,
        p.last_name,
        p.phone_number,
        p.email,
        p.license_number,
        CONCAT(p.first_name, ' ', p.last_name) as full_name
      FROM accounts a
      LEFT JOIN pharmacists p ON a.pharmacist_id = p.pharmacist_id
      ORDER BY a.created_at DESC
    `;
    
    const [rows] = await pool.execute(query);
    
    // Format the response data
    const accounts = rows.map(account => ({
      id: account.account_id,
      username: account.username,
      role: account.role,
      isActive: Boolean(account.is_active),
      createdAt: account.created_at,
      updatedAt: account.updated_at,
      lastLogin: account.last_login || 'Never',
      firstName: account.first_name || '',
      lastName: account.last_name || '',
      phoneNumber: account.phone_number || '',
      email: account.email || '',
      licenseNumber: account.license_number || '',
      fullName: account.full_name || '',
      pharmacistId: account.pharmacist_id
    }));
    
    res.json({
      success: true,
      data: accounts
    });
    
  } catch (error) {
    console.error('Accounts fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch accounts'
    });
  }
});

// Get single account by ID (Admin only)
router.get('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        a.account_id,
        a.username,
        a.role,
        a.is_active,
        a.created_at,
        a.updated_at,
        a.last_login,
        p.pharmacist_id,
        p.first_name,
        p.last_name,
        p.phone_number,
        p.email,
        p.license_number
      FROM accounts a
      LEFT JOIN pharmacists p ON a.pharmacist_id = p.pharmacist_id
      WHERE a.account_id = ?
    `;
    
    const [rows] = await pool.execute(query, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    const account = rows[0];
    
    res.json({
      success: true,
      data: {
        id: account.account_id,
        username: account.username,
        role: account.role,
        isActive: Boolean(account.is_active),
        createdAt: account.created_at,
        updatedAt: account.updated_at,
        lastLogin: account.last_login || 'Never',
        firstName: account.first_name || '',
        lastName: account.last_name || '',
        phoneNumber: account.phone_number || '',
        email: account.email || '',
        licenseNumber: account.license_number || ''
      }
    });
    
  } catch (error) {
    console.error('Account fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch account'
    });
  }
});

// Create new account with pharmacist information (Admin only)
router.post('/', 
  verifyToken, 
  requireAdmin,
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
    body('role')
      .isIn(['Admin', 'Staff'])
      .withMessage('Role must be either Admin or Staff'),
    body('firstName')
      .trim()
      .notEmpty()
      .withMessage('First name is required'),
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Last name is required'),
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email address'),
    body('phoneNumber')
      .matches(/^\d{3}-\d{3}-\d{4}$/)
      .withMessage('Phone number must be in format: 123-456-7890'),
    body('licenseNumber')
      .trim()
      .isLength({ min: 5 })
      .withMessage('License number must be at least 5 characters long')
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

      const {
        username,
        password,
        role,
        isActive = true,
        firstName,
        lastName,
        phoneNumber,
        email,
        licenseNumber
      } = req.body;

      // Start transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Check if username already exists
        const [existingUsername] = await connection.execute(
          'SELECT account_id FROM accounts WHERE username = ?',
          [username]
        );

        if (existingUsername.length > 0) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({
            success: false,
            message: 'Username already exists'
          });
        }

        // Check if email already exists
        const [existingEmail] = await connection.execute(
          'SELECT pharmacist_id FROM pharmacists WHERE email = ?',
          [email]
        );

        if (existingEmail.length > 0) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({
            success: false,
            message: 'Email already exists'
          });
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert pharmacist first
        const [pharmacistResult] = await connection.execute(
          'INSERT INTO pharmacists (first_name, last_name, phone_number, email, license_number) VALUES (?, ?, ?, ?, ?)',
          [firstName, lastName, phoneNumber, email, licenseNumber]
        );

        // Insert account with pharmacist_id foreign key
        const [accountResult] = await connection.execute(
          'INSERT INTO accounts (username, password, pharmacist_id, is_active, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
          [username, hashedPassword, pharmacistResult.insertId, isActive ? 1 : 0, role]
        );

        await connection.commit();
        connection.release();

        res.status(201).json({
          success: true,
          message: 'Account created successfully',
          data: {
            id: accountResult.insertId,
            username,
            role,
            isActive,
            pharmacistId: pharmacistResult.insertId
          }
        });

      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }

    } catch (error) {
      console.error('Account creation error:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          success: false,
          message: 'Username or email already exists'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create account'
      });
    }
  }
);

// Update account (Admin only)
router.put('/:id',
  verifyToken,
  requireAdmin,
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('role')
      .isIn(['Admin', 'Staff'])
      .withMessage('Role must be either Admin or Staff'),
    body('firstName')
      .trim()
      .notEmpty()
      .withMessage('First name is required'),
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Last name is required'),
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email address'),
    body('phoneNumber')
      .matches(/^\d{3}-\d{3}-\d{4}$/)
      .withMessage('Phone number must be in format: 123-456-7890'),
    body('licenseNumber')
      .trim()
      .isLength({ min: 5 })
      .withMessage('License number must be at least 5 characters long'),
    body('password')
      .optional()
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long if provided')
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

      const { id } = req.params;
      const {
        username,
        password,
        role,
        isActive,
        firstName,
        lastName,
        phoneNumber,
        email,
        licenseNumber
      } = req.body;

      // Start transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Check if account exists and get pharmacist_id
        const [existingAccount] = await connection.execute(
          'SELECT account_id, pharmacist_id, username FROM accounts WHERE account_id = ?',
          [id]
        );

        if (existingAccount.length === 0) {
          await connection.rollback();
          connection.release();
          return res.status(404).json({
            success: false,
            message: 'Account not found'
          });
        }

        const currentAccount = existingAccount[0];
        const pharmacistId = currentAccount.pharmacist_id;
        
        if (!pharmacistId) {
          await connection.rollback();
          connection.release();
          return res.status(404).json({
            success: false,
            message: 'Associated pharmacist not found'
          });
        }

        // Check if username is being changed and if new username already exists
        if (username !== currentAccount.username) {
          const [usernameCheck] = await connection.execute(
            'SELECT account_id FROM accounts WHERE username = ? AND account_id != ?',
            [username, id]
          );

          if (usernameCheck.length > 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
              success: false,
              message: 'Username already exists'
            });
          }
        }

        // Check if email is being changed and if new email already exists
        const [emailCheck] = await connection.execute(
          'SELECT pharmacist_id FROM pharmacists WHERE email = ? AND pharmacist_id != ?',
          [email, pharmacistId]
        );

        if (emailCheck.length > 0) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({
            success: false,
            message: 'Email already exists'
          });
        }

        // Update pharmacist information
        await connection.execute(
          'UPDATE pharmacists SET first_name = ?, last_name = ?, phone_number = ?, email = ?, license_number = ? WHERE pharmacist_id = ?',
          [firstName, lastName, phoneNumber, email, licenseNumber, pharmacistId]
        );

        // Prepare account update query
        let accountUpdateQuery = 'UPDATE accounts SET username = ?, role = ?, is_active = ?, updated_at = NOW()';
        let accountUpdateParams = [username, role, isActive ? 1 : 0];

        // Add password to update if provided
        if (password && password.trim() !== '') {
          const saltRounds = 12;
          const hashedPassword = await bcrypt.hash(password, saltRounds);
          accountUpdateQuery += ', password = ?';
          accountUpdateParams.push(hashedPassword);
        }

        accountUpdateQuery += ' WHERE account_id = ?';
        accountUpdateParams.push(id);

        // Update account
        await connection.execute(accountUpdateQuery, accountUpdateParams);

        await connection.commit();
        connection.release();

        res.json({
          success: true,
          message: 'Account updated successfully'
        });

      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }

    } catch (error) {
      console.error('Account update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update account'
      });
    }
  }
);

// Toggle account status (Admin only)
router.patch('/:id/status', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if account exists
    const [existingAccount] = await pool.execute(
      'SELECT account_id, is_active FROM accounts WHERE account_id = ?',
      [id]
    );

    if (existingAccount.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    const currentStatus = existingAccount[0].is_active;
    const newStatus = currentStatus ? 0 : 1;

    // Update account status
    await pool.execute(
      'UPDATE accounts SET is_active = ?, updated_at = NOW() WHERE account_id = ?',
      [newStatus, id]
    );

    res.json({
      success: true,
      message: `Account ${newStatus ? 'activated' : 'deactivated'} successfully`,
      data: {
        isActive: Boolean(newStatus)
      }
    });

  } catch (error) {
    console.error('Account status toggle error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update account status'
    });
  }
});

// Delete account (Admin only) - Soft delete by deactivating
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if account exists
    const [existingAccount] = await pool.execute(
      'SELECT account_id FROM accounts WHERE account_id = ?',
      [id]
    );

    if (existingAccount.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Prevent admin from deleting their own account
    if (parseInt(id) === req.user.account_id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Soft delete by deactivating the account
    await pool.execute(
      'UPDATE accounts SET is_active = 0, updated_at = NOW() WHERE account_id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account'
    });
  }
});

module.exports = router; 