const express = require('express');
const { pool } = require('../config/database');
const { verifyToken, requireStaffOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all products with inventory information (Staff/Admin access)
router.get('/', verifyToken, requireStaffOrAdmin, async (req, res) => {
  try {
    const { category, search } = req.query;
    
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
      WHERE i.stock_level > 0
    `;
    
    const queryParams = [];
    
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

module.exports = router; 