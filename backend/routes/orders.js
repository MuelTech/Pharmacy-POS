const express = require('express');
const { pool } = require('../config/database');
const { verifyToken, requireStaffOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Create new order (Staff/Admin access)
router.post('/', verifyToken, requireStaffOrAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { orderItems, discount = false, paymentData } = req.body;
    const accountId = req.user.account_id;
    
    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order items are required'
      });
    }
    
    // Calculate totals and validate stock
    let subtotal = 0;
    for (const item of orderItems) {
      // Verify product exists and has sufficient stock
      const [productCheck] = await connection.execute(`
        SELECT m.drug_id, m.drug_name, m.base_price, i.inventory_id, i.stock_level 
        FROM medicines m 
        LEFT JOIN inventory i ON m.drug_id = i.drug_id 
        WHERE m.drug_id = ? AND i.stock_level > 0
        ORDER BY i.expiry_date ASC
        LIMIT 1
      `, [item.drug_id]);
      
      if (productCheck.length === 0) {
        throw new Error(`Product with ID ${item.drug_id} not found or out of stock`);
      }
      
      if (productCheck[0].stock_level < item.quantity) {
        throw new Error(`Insufficient stock for ${productCheck[0].drug_name}. Available: ${productCheck[0].stock_level}`);
      }
      
      subtotal += productCheck[0].base_price * item.quantity;
    }
    
    // Apply discount logic (20% if applicable)
    const discountAmount = discount ? subtotal * 0.20 : 0;
    const discountedSubtotal = subtotal - discountAmount;
    
    // Apply tax (12%)
    const taxRate = 0.12;
    const totalAmount = discountedSubtotal * (1 + taxRate);
    
    // Create order
    const [orderResult] = await connection.execute(`
      INSERT INTO orders (account_id, order_date, discount, total_amount) 
      VALUES (?, NOW(), ?, ?)
    `, [accountId, discountAmount, totalAmount]);
    
    const orderId = orderResult.insertId;
    
    // Create order details and update inventory
    for (const item of orderItems) {
      // Get the best inventory item (earliest expiry) for this drug
      const [inventoryData] = await connection.execute(`
        SELECT i.inventory_id, i.stock_level, m.base_price, m.drug_name
        FROM inventory i 
        JOIN medicines m ON i.drug_id = m.drug_id 
        WHERE m.drug_id = ? AND i.stock_level >= ?
        ORDER BY i.expiry_date ASC
        LIMIT 1
      `, [item.drug_id, item.quantity]);
      
      if (inventoryData.length === 0) {
        throw new Error(`Unable to allocate inventory for ${item.drug_name || 'product'}`);
      }
      
      const inventoryId = inventoryData[0].inventory_id;
      const unitPrice = inventoryData[0].base_price;
      
      // Validate all parameters before insertion
      if (!inventoryId || !item.quantity || !orderId || !unitPrice) {
        throw new Error(`Invalid parameters for order detail: inventory_id=${inventoryId}, quantity=${item.quantity}, order_id=${orderId}, unit_price=${unitPrice}`);
      }
      
      // Add order detail to order_details table
      await connection.execute(`
        INSERT INTO order_details (inventory_id, quantity, order_id, unit_price) 
        VALUES (?, ?, ?, ?)
      `, [inventoryId, parseInt(item.quantity), orderId, parseFloat(unitPrice)]);
      
      // Update inventory stock
      await connection.execute(`
        UPDATE inventory 
        SET stock_level = stock_level - ? 
        WHERE inventory_id = ?
      `, [parseInt(item.quantity), inventoryId]);
    }
    
    // Insert payment record if payment data is provided
    if (paymentData) {
      // Validate payment data
      const paidAmount = parseFloat(paymentData.paid || paymentData.total || totalAmount);
      const changeAmount = parseFloat(paymentData.change || 0);
      
      if (isNaN(paidAmount) || paidAmount < 0) {
        throw new Error('Invalid payment amount');
      }
      
      if (isNaN(changeAmount) || changeAmount < 0) {
        throw new Error('Invalid change amount');
      }
      
      // Get or create payment type
      let paymentTypeId = 1; // Default to Cash (ID 1)
      
      if (paymentData.paymentType) {
        // First, try to find existing payment type
        const [paymentTypeResult] = await connection.execute(`
          SELECT payment_type_id FROM payment_types WHERE payment_type = ?
        `, [paymentData.paymentType]);
        
        if (paymentTypeResult.length > 0) {
          paymentTypeId = paymentTypeResult[0].payment_type_id;
        } else {
          // If payment type doesn't exist, create it
          const [insertResult] = await connection.execute(`
            INSERT INTO payment_types (payment_type) VALUES (?)
          `, [paymentData.paymentType]);
          paymentTypeId = insertResult.insertId;
        }
      }
      
      // Insert payment record
      await connection.execute(`
        INSERT INTO payments (order_id, payment_type_id, amount_paid, change_amount) 
        VALUES (?, ?, ?, ?)
      `, [orderId, paymentTypeId, paidAmount, changeAmount]);
      
      console.log(`Payment recorded: Order ${orderId}, Amount ${paidAmount}, Change ${changeAmount}, Type ${paymentData.paymentType}`);
    }
    
    await connection.commit();
    
    // Get pharmacist name for receipt
    const [pharmacistData] = await connection.execute(`
      SELECT CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) as pharmacist_name
      FROM accounts a
      LEFT JOIN pharmacists p ON a.pharmacist_id = p.pharmacist_id
      WHERE a.account_id = ?
    `, [accountId]);
    
    const cashierName = (pharmacistData.length > 0 && pharmacistData[0].pharmacist_name.trim()) 
      ? pharmacistData[0].pharmacist_name.trim() 
      : (req.user.username || 'Staff');
    
    // Generate receipt data
    const receiptData = {
      orderId,
      invoiceNumber: `1703${orderId.toString().padStart(6, '0')}`,
      orderDate: new Date().toISOString(),
      cashier: cashierName,
      items: orderItems,
      subtotal,
      discountAmount,
      totalAmount,
      paymentData: paymentData || {}
    };
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: receiptData
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Order creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create order'
    });
  } finally {
    connection.release();
  }
});

// Get order by ID (Staff/Admin access)
router.get('/:id', verifyToken, requireStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }
    
    // Get order with pharmacist name
    const [orderRows] = await pool.execute(`
      SELECT o.*, CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) as cashier_name,
             pay.amount_paid, pay.change_amount, pt.payment_type
      FROM orders o
      LEFT JOIN accounts a ON o.account_id = a.account_id
      LEFT JOIN pharmacists p ON a.pharmacist_id = p.pharmacist_id
      LEFT JOIN payments pay ON o.order_id = pay.order_id
      LEFT JOIN payment_types pt ON pay.payment_type_id = pt.payment_type_id
      WHERE o.order_id = ?
    `, [parseInt(id)]);
    
    if (orderRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Get order details
    const [itemRows] = await pool.execute(`
      SELECT od.*, m.drug_name, m.dosage, m.form, i.batch_id
      FROM order_details od
      LEFT JOIN inventory i ON od.inventory_id = i.inventory_id
      LEFT JOIN medicines m ON i.drug_id = m.drug_id
      WHERE od.order_id = ?
    `, [parseInt(id)]);
    
    const order = {
      ...orderRows[0],
      items: itemRows,
      cashier_name: orderRows[0].cashier_name.trim() || 'Staff',
      payment_info: {
        amount_paid: orderRows[0].amount_paid,
        change_amount: orderRows[0].change_amount,
        payment_type: orderRows[0].payment_type
      }
    };
    
    res.json({
      success: true,
      data: order
    });
    
  } catch (error) {
    console.error('Order fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
});

// Get orders list (Staff/Admin access)
router.get('/', verifyToken, requireStaffOrAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
      SELECT o.order_id, o.order_date, o.discount, o.total_amount, 
             CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) as cashier_name,
             pay.amount_paid, pay.change_amount, pt.payment_type
      FROM orders o
      LEFT JOIN accounts a ON o.account_id = a.account_id
      LEFT JOIN pharmacists p ON a.pharmacist_id = p.pharmacist_id
      LEFT JOIN payments pay ON o.order_id = pay.order_id
      LEFT JOIN payment_types pt ON pay.payment_type_id = pt.payment_type_id
      WHERE 1=1
    `;
    const queryParams = [];
    
    if (startDate) {
      query += ' AND DATE(o.order_date) >= ?';
      queryParams.push(startDate);
    }
    
    if (endDate) {
      query += ' AND DATE(o.order_date) <= ?';
      queryParams.push(endDate);
    }
    
    query += ' ORDER BY o.order_date DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), parseInt(offset));
    
    const [rows] = await pool.execute(query, queryParams);
    
    // Clean up cashier names and add payment info
    const cleanedRows = rows.map(row => ({
      ...row,
      cashier_name: row.cashier_name.trim() || 'Staff',
      payment_info: {
        amount_paid: row.amount_paid,
        change_amount: row.change_amount,
        payment_type: row.payment_type
      }
    }));
    
    res.json({
      success: true,
      data: cleanedRows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Orders fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// Get payment types (Staff/Admin access)
router.get('/payment-types/all', verifyToken, requireStaffOrAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT payment_type_id, payment_type 
      FROM payment_types 
      ORDER BY payment_type_id ASC
    `);
    
    res.json({
      success: true,
      data: rows
    });
    
  } catch (error) {
    console.error('Payment types fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment types'
    });
  }
});

module.exports = router; 