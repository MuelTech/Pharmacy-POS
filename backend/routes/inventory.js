const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { verifyToken, requireStaffOrAdmin, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all inventory items with medicine details (Staff/Admin access)
router.get('/', verifyToken, requireStaffOrAdmin, async (req, res) => {
  try {
    const { search, low_stock, expired } = req.query;
    
    // First, let's test if the tables exist and have data
    console.log('Testing inventory table...');
    
    // Check what columns exist in inventory table
    const [inventoryStructure] = await pool.execute('DESCRIBE inventory');
    console.log('Inventory table structure:', inventoryStructure);
    
    // Check if inventory table exists and count records
    const [inventoryCount] = await pool.execute('SELECT COUNT(*) as count FROM inventory');
    console.log('Inventory table record count:', inventoryCount[0].count);
    
    // Check if medicines table exists and count records  
    const [medicinesCount] = await pool.execute('SELECT COUNT(*) as count FROM medicines');
    console.log('Medicines table record count:', medicinesCount[0].count);
    
    let query = `
      SELECT 
        i.inventory_id,
        i.batch_number,
        i.drug_id,
        i.stock_level,
        i.expiry_date,
        i.reorder_level,
        i.date_received,
        m.drug_name,
        m.dosage,
        m.form,
        m.manufacturer,
        m.base_price,
        c.category_name
      FROM inventory i
      INNER JOIN medicines m ON i.drug_id = m.drug_id
      LEFT JOIN categories c ON m.category_id = c.category_id
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    // Filter by search term (medicine name or batch number)
    if (search) {
      query += ' AND (m.drug_name LIKE ? OR i.batch_number LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }
    
    // Filter by low stock (stock level <= reorder level)
    if (low_stock === 'true') {
      query += ' AND i.stock_level <= i.reorder_level';
    }
    
    // Filter by expired items
    if (expired === 'true') {
      query += ' AND i.expiry_date < CURDATE()';
    }
    
    query += ' ORDER BY i.date_received DESC';
    
    console.log('Executing query:', query);
    console.log('Query params:', queryParams);
    
    const [rows] = await pool.execute(query, queryParams);
    
    console.log('Query result count:', rows.length);
    
    res.json({
      success: true,
      data: rows,
      debug: {
        inventoryCount: inventoryCount[0].count,
        medicinesCount: medicinesCount[0].count,
        resultCount: rows.length
      }
    });
    
  } catch (error) {
    console.error('Inventory fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory items',
      error: error.message
    });
  }
});

// Get inventory item by ID (Staff/Admin access)
router.get('/:id', verifyToken, requireStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        i.inventory_id,
        i.batch_number,
        i.drug_id,
        i.stock_level,
        i.expiry_date,
        i.reorder_level,
        i.date_received,
        m.drug_name,
        m.dosage,
        m.form,
        m.manufacturer,
        m.base_price,
        c.category_name
      FROM inventory i
      INNER JOIN medicines m ON i.drug_id = m.drug_id
      LEFT JOIN categories c ON m.category_id = c.category_id
      WHERE i.inventory_id = ?
    `;
    
    const [rows] = await pool.execute(query, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
    
  } catch (error) {
    console.error('Inventory item fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory item'
    });
  }
});

// Create new inventory item (Admin only)
router.post('/', 
  verifyToken, 
  requireAdmin,
  [
    body('batch_number')
      .trim()
      .notEmpty()
      .withMessage('Batch number is required'),
    body('drug_id')
      .isInt({ min: 1 })
      .withMessage('Valid medicine is required'),
    body('stock_level')
      .isInt({ min: 0 })
      .withMessage('Stock level must be a non-negative number'),
    body('expiry_date')
      .isISO8601()
      .withMessage('Valid expiry date is required'),
    body('reorder_level')
      .isInt({ min: 0 })
      .withMessage('Reorder level must be a non-negative number'),
    body('date_received')
      .isISO8601()
      .withMessage('Valid date received is required')
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
        batch_number,
        drug_id,
        stock_level,
        expiry_date,
        reorder_level,
        date_received
      } = req.body;

      // Check if medicine exists
      const [medicineExists] = await pool.execute(
        'SELECT drug_id FROM medicines WHERE drug_id = ?',
        [drug_id]
      );

      if (medicineExists.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Medicine not found'
        });
      }

      // Check if batch_number already exists (batch numbers should be globally unique)
      const [batchExists] = await pool.execute(
        'SELECT inventory_id FROM inventory WHERE batch_number = ?',
        [batch_number]
      );

      if (batchExists.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Batch number already exists. Please use a unique batch number.'
        });
      }

      // Insert new inventory item
      const [result] = await pool.execute(
        'INSERT INTO inventory (batch_number, drug_id, stock_level, expiry_date, reorder_level, date_received) VALUES (?, ?, ?, ?, ?, ?)',
        [batch_number, drug_id, stock_level, expiry_date, reorder_level, date_received]
      );

      // Fetch the created inventory item with medicine details
      const [newItem] = await pool.execute(`
        SELECT 
          i.inventory_id,
          i.batch_number,
          i.drug_id,
          i.stock_level,
          i.expiry_date,
          i.reorder_level,
          i.date_received,
          m.drug_name,
          m.dosage,
          m.form,
          m.manufacturer,
          m.base_price,
          c.category_name
        FROM inventory i
        INNER JOIN medicines m ON i.drug_id = m.drug_id
        LEFT JOIN categories c ON m.category_id = c.category_id
        WHERE i.inventory_id = ?
      `, [result.insertId]);

      res.status(201).json({
        success: true,
        message: 'Inventory item created successfully',
        data: newItem[0]
      });

    } catch (error) {
      console.error('Inventory creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create inventory item'
      });
    }
  }
);

// Update inventory item (Admin only)
router.put('/:id', 
  verifyToken, 
  requireAdmin,
  [
    body('batch_number')
      .trim()
      .notEmpty()
      .withMessage('Batch number is required'),
    body('drug_id')
      .isInt({ min: 1 })
      .withMessage('Valid medicine is required'),
    body('stock_level')
      .isInt({ min: 0 })
      .withMessage('Stock level must be a non-negative number'),
    body('expiry_date')
      .isISO8601()
      .withMessage('Valid expiry date is required'),
    body('reorder_level')
      .isInt({ min: 0 })
      .withMessage('Reorder level must be a non-negative number'),
    body('date_received')
      .isISO8601()
      .withMessage('Valid date received is required')
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
        batch_number,
        drug_id,
        stock_level,
        expiry_date,
        reorder_level,
        date_received
      } = req.body;

      // Check if inventory item exists
      const [inventoryExists] = await pool.execute(
        'SELECT inventory_id FROM inventory WHERE inventory_id = ?',
        [id]
      );

      if (inventoryExists.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
      }

      // Check if medicine exists
      const [medicineExists] = await pool.execute(
        'SELECT drug_id FROM medicines WHERE drug_id = ?',
        [drug_id]
      );

      if (medicineExists.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Medicine not found'
        });
      }

      // Check if batch_number already exists (excluding current item)
      const [batchExists] = await pool.execute(
        'SELECT inventory_id FROM inventory WHERE batch_number = ? AND inventory_id != ?',
        [batch_number, id]
      );

      if (batchExists.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Batch number already exists. Please use a unique batch number.'
        });
      }

      // Update inventory item
      await pool.execute(
        'UPDATE inventory SET batch_number = ?, drug_id = ?, stock_level = ?, expiry_date = ?, reorder_level = ?, date_received = ? WHERE inventory_id = ?',
        [batch_number, drug_id, stock_level, expiry_date, reorder_level, date_received, id]
      );

      // Fetch the updated inventory item with medicine details
      const [updatedItem] = await pool.execute(`
        SELECT 
          i.inventory_id,
          i.batch_number,
          i.drug_id,
          i.stock_level,
          i.expiry_date,
          i.reorder_level,
          i.date_received,
          m.drug_name,
          m.dosage,
          m.form,
          m.manufacturer,
          m.base_price,
          c.category_name
        FROM inventory i
        INNER JOIN medicines m ON i.drug_id = m.drug_id
        LEFT JOIN categories c ON m.category_id = c.category_id
        WHERE i.inventory_id = ?
      `, [id]);

      res.json({
        success: true,
        message: 'Inventory item updated successfully',
        data: updatedItem[0]
      });

    } catch (error) {
      console.error('Inventory update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update inventory item'
      });
    }
  }
);

// Delete inventory item (Admin only)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if inventory item exists
    const [inventoryExists] = await pool.execute(
      'SELECT inventory_id FROM inventory WHERE inventory_id = ?',
      [id]
    );

    if (inventoryExists.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Check if inventory item is referenced in order_details
    const [orderReferences] = await pool.execute(
      'SELECT order_detail_id FROM order_details WHERE inventory_id = ?',
      [id]
    );

    if (orderReferences.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete inventory item that has been used in orders'
      });
    }

    // Delete inventory item
    await pool.execute('DELETE FROM inventory WHERE inventory_id = ?', [id]);

    res.json({
      success: true,
      message: 'Inventory item deleted successfully'
    });

  } catch (error) {
    console.error('Inventory deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete inventory item'
    });
  }
});

// Update stock level (Staff/Admin access - for sales/adjustments)
router.patch('/:id/stock', 
  verifyToken, 
  requireStaffOrAdmin,
  [
    body('stock_level')
      .isInt({ min: 0 })
      .withMessage('Stock level must be a non-negative number'),
    body('reason')
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
      const { stock_level, reason } = req.body;

      // Check if inventory item exists
      const [inventoryExists] = await pool.execute(
        'SELECT inventory_id, stock_level FROM inventory WHERE inventory_id = ?',
        [id]
      );

      if (inventoryExists.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
      }

      const currentStock = inventoryExists[0].stock_level;

      // Update stock level
      await pool.execute(
        'UPDATE inventory SET stock_level = ? WHERE inventory_id = ?',
        [stock_level, id]
      );

      // TODO: In a real system, you might want to log stock adjustments
      // This would require a separate stock_movements table

      res.json({
        success: true,
        message: 'Stock level updated successfully',
        data: {
          inventory_id: id,
          previous_stock: currentStock,
          new_stock: stock_level,
          adjustment: stock_level - currentStock,
          reason: reason || null
        }
      });

    } catch (error) {
      console.error('Stock update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update stock level'
      });
    }
  }
);

module.exports = router; 