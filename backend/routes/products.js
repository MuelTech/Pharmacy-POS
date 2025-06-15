const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { verifyToken, requireStaffOrAdmin, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all medicines with inventory information (Staff/Admin access)
router.get('/', verifyToken, requireStaffOrAdmin, async (req, res) => {
  try {
    const { category, search, in_stock } = req.query;
    
    let query = `
      SELECT 
        m.drug_id,
        m.drug_name,
        m.dosage,
        m.form,
        m.manufacturer,
        m.base_price,
        m.category_id,
        m.image_path,
        c.category_name,
        i.inventory_id,
        i.stock_level,
        i.expiry_date,
        i.reorder_level,
        i.date_received
      FROM medicines m
      LEFT JOIN inventory i ON m.drug_id = i.drug_id
      LEFT JOIN categories c ON m.category_id = c.category_id
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    // Filter by stock level if requested (for POS vs Admin)
    if (in_stock === 'true') {
      query += ' AND i.stock_level > 0';
    }
    
    if (category) {
      query += ' AND m.category_id = ?';
      queryParams.push(category);
    }
    
    if (search) {
      query += ' AND m.drug_name LIKE ?';
      queryParams.push(`%${search}%`);
    }
    
    query += ' ORDER BY m.drug_name ASC';
    
    const [rows] = await pool.execute(query, queryParams);
    
    res.json({
      success: true,
      data: rows
    });
    
  } catch (error) {
    console.error('Products fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
});

// Get product categories (Staff/Admin access)
router.get('/categories', verifyToken, requireStaffOrAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM categories ORDER BY category_name ASC');
    
    res.json({
      success: true,
      data: rows
    });
    
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// Get product by ID (Staff/Admin access)
router.get('/:id', verifyToken, requireStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        m.drug_id,
        m.drug_name,
        m.dosage,
        m.form,
        m.manufacturer,
        m.base_price,
        m.category_id,
        m.image_path,
        c.category_name,
        i.inventory_id,
        i.stock_level,
        i.expiry_date,
        i.reorder_level,
        i.date_received
      FROM medicines m
      LEFT JOIN inventory i ON m.drug_id = i.drug_id
      LEFT JOIN categories c ON m.category_id = c.category_id
      WHERE m.drug_id = ?
    `;
    
    const [rows] = await pool.execute(query, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
    
  } catch (error) {
    console.error('Product fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product'
    });
  }
});

// Create new medicine (Admin only)
router.post('/', 
  verifyToken, 
  requireAdmin,
  [
    body('drug_name')
      .trim()
      .notEmpty()
      .withMessage('Drug name is required'),
    body('dosage')
      .trim()
      .notEmpty()
      .withMessage('Dosage is required'),
    body('form')
      .trim()
      .notEmpty()
      .withMessage('Form is required'),
    body('manufacturer')
      .trim()
      .notEmpty()
      .withMessage('Manufacturer is required'),
    body('base_price')
      .isFloat({ min: 0 })
      .withMessage('Base price must be a positive number'),
    body('category_id')
      .isInt({ min: 1 })
      .withMessage('Valid category is required'),
    body('image_path')
      .optional()
      .trim()
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
        drug_name,
        dosage,
        form,
        manufacturer,
        base_price,
        category_id,
        image_path = ''
      } = req.body;

      // Check if category exists
      const [categoryExists] = await pool.execute(
        'SELECT category_id FROM categories WHERE category_id = ?',
        [category_id]
      );

      if (categoryExists.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Insert new medicine
      const [result] = await pool.execute(
        'INSERT INTO medicines (drug_name, dosage, form, manufacturer, base_price, category_id, image_path) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [drug_name, dosage, form, manufacturer, base_price, category_id, image_path]
      );

      res.status(201).json({
        success: true,
        message: 'Medicine created successfully',
        data: {
          drug_id: result.insertId,
          drug_name,
          dosage,
          form,
          manufacturer,
          base_price,
          category_id,
          image_path
        }
      });

    } catch (error) {
      console.error('Medicine creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create medicine'
      });
    }
  }
);

// Update medicine (Admin only)
router.put('/:id',
  verifyToken,
  requireAdmin,
  [
    body('drug_name')
      .trim()
      .notEmpty()
      .withMessage('Drug name is required'),
    body('dosage')
      .trim()
      .notEmpty()
      .withMessage('Dosage is required'),
    body('form')
      .trim()
      .notEmpty()
      .withMessage('Form is required'),
    body('manufacturer')
      .trim()
      .notEmpty()
      .withMessage('Manufacturer is required'),
    body('base_price')
      .isFloat({ min: 0 })
      .withMessage('Base price must be a positive number'),
    body('category_id')
      .isInt({ min: 1 })
      .withMessage('Valid category is required'),
    body('image_path')
      .optional()
      .trim()
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
        drug_name,
        dosage,
        form,
        manufacturer,
        base_price,
        category_id,
        image_path = ''
      } = req.body;

      // Check if medicine exists
      const [medicineExists] = await pool.execute(
        'SELECT drug_id FROM medicines WHERE drug_id = ?',
        [id]
      );

      if (medicineExists.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Medicine not found'
        });
      }

      // Check if category exists
      const [categoryExists] = await pool.execute(
        'SELECT category_id FROM categories WHERE category_id = ?',
        [category_id]
      );

      if (categoryExists.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Update medicine
      await pool.execute(
        'UPDATE medicines SET drug_name = ?, dosage = ?, form = ?, manufacturer = ?, base_price = ?, category_id = ?, image_path = ? WHERE drug_id = ?',
        [drug_name, dosage, form, manufacturer, base_price, category_id, image_path, id]
      );

      res.json({
        success: true,
        message: 'Medicine updated successfully',
        data: {
          drug_id: parseInt(id),
          drug_name,
          dosage,
          form,
          manufacturer,
          base_price,
          category_id,
          image_path
        }
      });

    } catch (error) {
      console.error('Medicine update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update medicine'
      });
    }
  }
);

// Delete medicine (Admin only)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if medicine exists
    const [medicineExists] = await pool.execute(
      'SELECT drug_id FROM medicines WHERE drug_id = ?',
      [id]
    );

    if (medicineExists.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found'
      });
    }

    // Check if medicine has inventory records
    const [inventoryExists] = await pool.execute(
      'SELECT inventory_id FROM inventory WHERE drug_id = ?',
      [id]
    );

    if (inventoryExists.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete medicine with existing inventory records. Please remove inventory first.'
      });
    }

    // Delete medicine
    await pool.execute('DELETE FROM medicines WHERE drug_id = ?', [id]);

    res.json({
      success: true,
      message: 'Medicine deleted successfully'
    });

  } catch (error) {
    console.error('Medicine deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete medicine'
    });
  }
});

module.exports = router; 