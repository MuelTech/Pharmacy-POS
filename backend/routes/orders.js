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
    
    console.log('Order creation request:', { orderItems, discount, paymentData, accountId });
    
    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order items are required'
      });
    }
    
    // Validate account exists
    const [accountCheck] = await connection.execute(`
      SELECT account_id FROM accounts WHERE account_id = ?
    `, [accountId]);
    
    if (accountCheck.length === 0) {
      throw new Error('Invalid account ID');
    }
    
    // Calculate totals and validate stock
    let subtotal = 0;
    const validatedItems = [];
    
    for (const item of orderItems) {
      // Verify product exists and has sufficient stock
      const [productCheck] = await connection.execute(`
        SELECT m.drug_id, m.drug_name, m.base_price, i.inventory_id, i.stock_level 
        FROM medicines m 
        LEFT JOIN inventory i ON m.drug_id = i.drug_id 
        WHERE m.drug_id = ? AND i.stock_level > 0
        ORDER BY i.stock_level ASC, i.expiry_date ASC, i.inventory_id ASC
        LIMIT 1
      `, [item.drug_id]);
      
      if (productCheck.length === 0) {
        throw new Error(`Product with ID ${item.drug_id} not found or out of stock`);
      }
      
      if (productCheck[0].stock_level < item.quantity) {
        throw new Error(`Insufficient stock for ${productCheck[0].drug_name}. Available: ${productCheck[0].stock_level}`);
      }
      
      const itemSubtotal = productCheck[0].base_price * item.quantity;
      subtotal += itemSubtotal;
      
      validatedItems.push({
        ...item,
        inventory_id: productCheck[0].inventory_id,
        unit_price: productCheck[0].base_price,
        drug_name: productCheck[0].drug_name
      });
    }
    
    // Apply discount logic (20% if applicable)
    const discountAmount = discount ? subtotal * 0.20 : 0;
    const discountedSubtotal = subtotal - discountAmount;
    
    // Apply tax (12%)
    const taxRate = 0.12;
    const totalAmount = discountedSubtotal * (1 + taxRate);
    
    console.log('Calculated totals:', { subtotal, discountAmount, totalAmount });
    
    // Create order - ensure proper data types
    const [orderResult] = await connection.execute(`
      INSERT INTO orders (account_id, order_date, discount, total_amount) 
      VALUES (?, NOW(), ?, ?)
    `, [
      parseInt(accountId), 
      parseFloat(discountAmount.toFixed(2)), 
      parseFloat(totalAmount.toFixed(2))
    ]);
    
    const orderId = orderResult.insertId;
    console.log('Order created with ID:', orderId);
    
    if (!orderId) {
      throw new Error('Failed to create order - no order ID returned');
    }
    
    // Create order details and update inventory
    for (const item of validatedItems) {
      // Validate all parameters before insertion
      const inventoryId = parseInt(item.inventory_id);
      const quantity = parseInt(item.quantity);
      const unitPrice = parseFloat(item.unit_price);
      
      if (!inventoryId || !quantity || !orderId || !unitPrice || quantity <= 0 || unitPrice <= 0) {
        throw new Error(`Invalid parameters for order detail: inventory_id=${inventoryId}, quantity=${quantity}, order_id=${orderId}, unit_price=${unitPrice}`);
      }
      
      console.log('Inserting order detail:', { inventoryId, quantity, orderId, unitPrice });
      
      // Add order detail to order_details table
      const [orderDetailResult] = await connection.execute(`
        INSERT INTO order_details (inventory_id, quantity, order_id, unit_price) 
        VALUES (?, ?, ?, ?)
      `, [inventoryId, quantity, orderId, unitPrice]);
      
      if (!orderDetailResult.insertId) {
        throw new Error(`Failed to insert order detail for inventory ID ${inventoryId}`);
      }
      
      console.log('Order detail created with ID:', orderDetailResult.insertId);
      
      // Update inventory stock
      const [updateResult] = await connection.execute(`
        UPDATE inventory 
        SET stock_level = stock_level - ? 
        WHERE inventory_id = ?
      `, [quantity, inventoryId]);
      
      if (updateResult.affectedRows === 0) {
        throw new Error(`Failed to update inventory for inventory ID ${inventoryId}`);
      }
      
      console.log(`Updated inventory ${inventoryId}, reduced stock by ${quantity}`);
    }
    
    // Insert payment record if payment data is provided
    if (paymentData) {
      console.log('Processing payment data:', paymentData);
      
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
          console.log('Created new payment type:', paymentData.paymentType, 'with ID:', paymentTypeId);
        }
      }
      
      console.log('Inserting payment:', { orderId, paymentTypeId, paidAmount, changeAmount });
      
      // Insert payment record
      const [paymentResult] = await connection.execute(`
        INSERT INTO payments (order_id, payment_type_id, amount_paid, change_amount) 
        VALUES (?, ?, ?, ?)
      `, [orderId, paymentTypeId, parseFloat(paidAmount.toFixed(2)), parseFloat(changeAmount.toFixed(2))]);
      
      if (!paymentResult.insertId && paymentResult.affectedRows === 0) {
        throw new Error('Failed to insert payment record');
      }
      
      console.log(`Payment recorded: Order ${orderId}, Amount ${paidAmount}, Change ${changeAmount}, Type ${paymentData.paymentType}`);
    }
    
    await connection.commit();
    console.log('Transaction committed successfully');
    
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
      invoiceNumber: orderId, // Use simple order_id as invoice number
      orderDate: new Date().toISOString(),
      cashier: cashierName,
      items: orderItems,
      subtotal,
      discountAmount,
      totalAmount,
      paymentData: paymentData || {}
    };
    
    console.log('Order creation successful, returning receipt data');
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: receiptData
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Order creation error:', error);
    console.error('Error stack:', error.stack);
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
    
    console.log('Fetching order by ID:', id);
    
    if (!id || isNaN(parseInt(id))) {
      console.log('Invalid order ID provided:', id);
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
      console.log('Order not found for ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    console.log('Order found:', orderRows[0]);
    
    // Get order details
    const [itemRows] = await pool.execute(`
      SELECT od.*, m.drug_name, m.dosage, m.form
      FROM order_details od
      LEFT JOIN inventory i ON od.inventory_id = i.inventory_id
      LEFT JOIN medicines m ON i.drug_id = m.drug_id
      WHERE od.order_id = ?
    `, [parseInt(id)]);
    
    console.log('Order items found:', itemRows.length, 'items');
    
    const order = {
      ...orderRows[0],
      items: itemRows,
      cashier_name: (orderRows[0].cashier_name || '').trim() || 'Staff',
      payment_info: {
        amount_paid: orderRows[0].amount_paid,
        change_amount: orderRows[0].change_amount,
        payment_type: orderRows[0].payment_type
      }
    };
    
    console.log('Returning order data:', order);
    
    res.json({
      success: true,
      data: order
    });
    
  } catch (error) {
    console.error('Order fetch error:', error);
    console.error('Error stack:', error.stack);
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
      cashier_name: (row.cashier_name || '').trim() || 'Staff',
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

// Get dashboard metrics (Admin access)
router.get('/dashboard/metrics', verifyToken, requireStaffOrAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const queryParams = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE DATE(o.order_date) BETWEEN ? AND ?';
      queryParams.push(startDate, endDate);
    }
    
    // Get total sales
    const [salesResult] = await pool.execute(`
      SELECT COALESCE(SUM(total_amount), 0) as total_sales
      FROM orders o
      ${dateFilter}
    `, queryParams);
    
    // Get total transactions
    const [transactionsResult] = await pool.execute(`
      SELECT COUNT(*) as total_transactions
      FROM orders o
      ${dateFilter}
    `, queryParams);
    
    // Get total items sold
    const [itemsResult] = await pool.execute(`
      SELECT COALESCE(SUM(od.quantity), 0) as total_items
      FROM orders o
      JOIN order_details od ON o.order_id = od.order_id
      ${dateFilter}
    `, queryParams);
    
    // Get total unique products
    const [productsResult] = await pool.execute(`
      SELECT COUNT(DISTINCT m.drug_id) as total_products
      FROM medicines m
      WHERE EXISTS (
        SELECT 1 FROM inventory i WHERE i.drug_id = m.drug_id AND i.stock_level > 0
      )
    `);
    
    res.json({
      success: true,
      data: {
        sales: salesResult[0].total_sales,
        transactions: transactionsResult[0].total_transactions,
        itemsSold: itemsResult[0].total_items,
        products: productsResult[0].total_products
      }
    });
    
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard metrics'
    });
  }
});

// Get top products for dashboard (Admin access)
router.get('/dashboard/products', verifyToken, requireStaffOrAdmin, async (req, res) => {
  try {
    const { startDate, endDate, limit = 6, page = 1 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let dateFilter = '';
    const queryParams = [];
    
    if (startDate && endDate) {
      dateFilter = 'AND DATE(o.order_date) BETWEEN ? AND ?';
      queryParams.push(startDate, endDate);
    }
    
    // Get products with sales data and accurate stock levels
    const salesQuery = `
      SELECT 
        m.drug_id,
        m.drug_name as name,
        COALESCE(sales_data.sold, 0) as sold,
        COALESCE(stock_data.available, 0) as available,
        CONCAT('₱', FORMAT(COALESCE(sales_data.sales_amount, 0), 2)) as sales
      FROM medicines m
      LEFT JOIN (
        SELECT 
          m2.drug_id,
          SUM(od.quantity) as sold,
          SUM(od.quantity * od.unit_price) as sales_amount
        FROM medicines m2
        JOIN inventory i2 ON m2.drug_id = i2.drug_id
        JOIN order_details od ON i2.inventory_id = od.inventory_id
        JOIN orders o ON od.order_id = o.order_id
        WHERE 1=1 ${dateFilter}
        GROUP BY m2.drug_id
      ) sales_data ON m.drug_id = sales_data.drug_id
      LEFT JOIN (
        SELECT 
          drug_id,
          SUM(stock_level) as available
        FROM inventory
        WHERE stock_level > 0
        GROUP BY drug_id
      ) stock_data ON m.drug_id = stock_data.drug_id
      WHERE stock_data.available > 0 OR sales_data.sold > 0
      ORDER BY sold DESC, sales_amount DESC
    `;
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM medicines m
      LEFT JOIN (
        SELECT 
          m2.drug_id,
          SUM(od.quantity) as sold
        FROM medicines m2
        JOIN inventory i2 ON m2.drug_id = i2.drug_id
        JOIN order_details od ON i2.inventory_id = od.inventory_id
        JOIN orders o ON od.order_id = o.order_id
        WHERE 1=1 ${dateFilter}
        GROUP BY m2.drug_id
      ) sales_data ON m.drug_id = sales_data.drug_id
      LEFT JOIN (
        SELECT 
          drug_id,
          SUM(stock_level) as available
        FROM inventory
        WHERE stock_level > 0
        GROUP BY drug_id
      ) stock_data ON m.drug_id = stock_data.drug_id
      WHERE stock_data.available > 0 OR sales_data.sold > 0
    `;
    
    // Execute count query
    const [countResult] = await pool.execute(countQuery, queryParams);
    const totalRecords = countResult[0].total;
    
    // Add pagination to main query
    const finalQuery = salesQuery + ' LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), parseInt(offset));
    
    const [rows] = await pool.execute(finalQuery, queryParams);
    
    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalRecords,
        totalPages: Math.ceil(totalRecords / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Dashboard products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard products'
    });
  }
});

// Get transaction details for dashboard (Admin access)
router.get('/dashboard/transactions', verifyToken, requireStaffOrAdmin, async (req, res) => {
  try {
    const { startDate, endDate, cashier, search, page = 1, limit = 50 } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
      SELECT 
        o.order_id as invoice,
        DATE_FORMAT(o.order_date, '%Y-%m-%d') as date,
        CONCAT('₱', FORMAT(o.total_amount, 2)) as total,
        CONCAT('₱', FORMAT(COALESCE(pay.amount_paid, o.total_amount), 2)) as paid,
        CONCAT('₱', FORMAT(COALESCE(pay.change_amount, 0), 2)) as \`change\`,
        COALESCE(pt.payment_type, 'Cash') as method,
        COALESCE(TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))), a.username, 'Staff') as cashier,
        o.order_id,
        o.order_date as raw_date,
        o.total_amount as raw_total,
        COALESCE(pay.amount_paid, o.total_amount) as raw_paid,
        COALESCE(pay.change_amount, 0) as raw_change
      FROM orders o
      LEFT JOIN accounts a ON o.account_id = a.account_id
      LEFT JOIN pharmacists p ON a.pharmacist_id = p.pharmacist_id
      LEFT JOIN payments pay ON o.order_id = pay.order_id
      LEFT JOIN payment_types pt ON pay.payment_type_id = pt.payment_type_id
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    if (startDate && endDate) {
      query += ' AND DATE(o.order_date) BETWEEN ? AND ?';
      queryParams.push(startDate, endDate);
    }
    
    if (cashier && cashier !== 'all') {
      query += ' AND (LOWER(TRIM(CONCAT(COALESCE(p.first_name, \'\'), \' \', COALESCE(p.last_name, \'\')))) LIKE LOWER(?) OR LOWER(a.username) LIKE LOWER(?))';
      queryParams.push(`%${cashier}%`, `%${cashier}%`);
    }
    
    if (search && search.trim()) {
      query += ` AND (
        o.order_id LIKE ? OR
        FORMAT(o.total_amount, 2) LIKE ? OR
        COALESCE(pt.payment_type, 'Cash') LIKE ? OR
        TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) LIKE ? OR
        a.username LIKE ?
      )`;
      const searchTerm = `%${search.trim()}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Get total count for pagination
    const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
    
    const [countResult] = await pool.execute(countQuery, queryParams);
    const totalRecords = countResult[0].total;
    
    query += ' ORDER BY o.order_date DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), parseInt(offset));
    
    const [rows] = await pool.execute(query, queryParams);
    
    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalRecords,
        totalPages: Math.ceil(totalRecords / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Dashboard transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard transactions'
    });
  }
});

// Get unique cashiers for filter dropdown (Admin access)
router.get('/dashboard/cashiers', verifyToken, requireStaffOrAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT DISTINCT 
        COALESCE(TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))), a.username, 'Staff') as cashier_name
      FROM orders o
      LEFT JOIN accounts a ON o.account_id = a.account_id
      LEFT JOIN pharmacists p ON a.pharmacist_id = p.pharmacist_id
      WHERE COALESCE(TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))), a.username, 'Staff') != ''
      ORDER BY cashier_name ASC
    `);
    
    res.json({
      success: true,
      data: rows.map(row => row.cashier_name)
    });
    
  } catch (error) {
    console.error('Dashboard cashiers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cashiers'
    });
  }
});

module.exports = router; 