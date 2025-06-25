import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { productsAPI, ordersAPI, authAPI } from '../../services/api';
import { getImageUrl, handleImageError } from '../../utils/imageUtils';
import { isLowStock, getStockColor, getLowStockIcon, getStockTooltip } from '../../utils/stockUtils';
import { useLowStockNotification } from '../../hooks/useLowStockNotification';
import LowStockNotification from '../../components/LowStockNotification';
import Payment from './Payment';
import Receipt from './Receipt';
import Products from './Products';
import './StaffDashboard.css';

const StaffDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // State management
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All Categories']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [orderItems, setOrderItems] = useState([]);
  const [discount, setDiscount] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [pharmacistInfo, setPharmacistInfo] = useState(null);

  // Low stock notification hook
  const {
    showNotification,
    closeNotification,
    lowStockProducts,
    lowStockCount,
    resetNotificationForNewSession,
    recheckLowStock,
    forceRecheckLowStock
  } = useLowStockNotification();

  // Fetch pharmacist information
  const fetchPharmacistInfo = useCallback(async () => {
    try {
      console.log('Fetching pharmacist info...');
      const response = await authAPI.getPharmacist();
      console.log('Pharmacist API response:', response.data);
      if (response.data.success) {
        console.log('Setting pharmacist info:', response.data.data);
        setPharmacistInfo(response.data.data);
      } else {
        console.log('Failed to fetch pharmacist info:', response.data.message);
      }
    } catch (error) {
      console.error('Failed to fetch pharmacist info:', error);
    }
  }, []);

  // Reusable function to load products and categories
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load products, categories, and pharmacist info in parallel
      // For staff dashboard, only load products that have stock and prioritize critical batches
      const [productsResponse, categoriesResponse] = await Promise.all([
        productsAPI.getAll({ in_stock: 'true', staff_priority: 'true' }),
        productsAPI.getCategories()
      ]);
      
      if (productsResponse.data.success) {
        console.log('Products loaded for staff dashboard:', productsResponse.data.data.length);
        console.log('Sample product:', productsResponse.data.data[0]);
        setProducts(productsResponse.data.data);
      }
      
      if (categoriesResponse.data.success) {
        const categoryNames = ['All Categories', ...categoriesResponse.data.data.map(cat => cat.category_name)];
        setCategories(categoryNames);
      }
      
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Function to reload only products data (for post-transaction updates)
  const reloadProducts = useCallback(async () => {
    try {
      // For staff dashboard, only load products that have stock and prioritize critical batches
      const productsResponse = await productsAPI.getAll({ in_stock: 'true', staff_priority: 'true' });
      
      if (productsResponse.data.success) {
        setProducts(productsResponse.data.data);
        console.log('Products data refreshed after transaction');
      }
    } catch (err) {
      console.error('Failed to reload products:', err);
      // Don't show error for background refresh, just log it
    }
  }, []);

  // Load products and categories on component mount
  useEffect(() => {
    loadData();
    fetchPharmacistInfo();
  }, [loadData, fetchPharmacistInfo]);

  // Memoized logout handler for better performance
  const handleLogout = useCallback(async () => {
    try {
      // Reset notification session when logging out
      resetNotificationForNewSession();
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [logout, navigate, resetNotificationForNewSession]);

  // Memoized filtered products to prevent unnecessary re-renders
  const filteredProducts = useMemo(() => {
    const filtered = products.filter(product => {
      const matchesSearch = product.drug_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All Categories' || 
        (product.category_name && product.category_name === selectedCategory);
      const hasStock = product.total_stock > 0;
      return matchesSearch && matchesCategory && hasStock;
    });
    console.log('Filtered products for display:', filtered.length);
    return filtered;
  }, [products, searchTerm, selectedCategory]);

  // Optimized add to order function
  const addToOrder = useCallback((product) => {
    setOrderItems(prevItems => {
      const existingItem = prevItems.find(item => item.drug_id === product.drug_id);
      if (existingItem) {
        return prevItems.map(item =>
          item.drug_id === product.drug_id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevItems, { 
          drug_id: product.drug_id,
          drug_name: product.drug_name,
          base_price: product.base_price,
          stock_level: product.total_stock,
          quantity: 1 
        }];
      }
    });
  }, []);

  // Optimized remove from order function
  const removeFromOrder = useCallback((drugId) => {
    setOrderItems(prevItems => prevItems.filter(item => item.drug_id !== drugId));
  }, []);

  // Optimized quantity update function
  const updateQuantity = useCallback((drugId, newQuantity) => {
    const quantity = parseInt(newQuantity) || 0;
    if (quantity <= 0) {
      removeFromOrder(drugId);
    } else {
      setOrderItems(prevItems => 
        prevItems.map(item =>
          item.drug_id === drugId
            ? { ...item, quantity }
            : item
        )
      );
    }
  }, [removeFromOrder]);

  // Memoized calculations for better performance
  const calculations = useMemo(() => {
    const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = orderItems.reduce((sum, item) => sum + (item.base_price * item.quantity), 0);
    const discountAmount = discount ? Math.round(subtotal * 0.20 * 100) / 100 : 0;
    const taxRate = 0.12;
    const grossPrice = Math.round((subtotal - discountAmount) * (1 + taxRate) * 100) / 100;
    
    return { totalItems, subtotal, discountAmount, grossPrice };
  }, [orderItems, discount]);

  // Optimized clear order function
  const cancelOrder = useCallback(() => {
    setOrderItems([]);
    setDiscount(false);
  }, []);

  // Payment handlers
  const handleOpenPayment = useCallback(() => {
    if (orderItems.length === 0) {
      // Use Electron's notification if available, fallback to alert
      if (window.electronAPI?.showNotification) {
        window.electronAPI.showNotification('Error', 'No items in the order!');
      } else {
        alert('No items in the order!');
      }
      return;
    }
    setShowPaymentModal(true);
  }, [orderItems.length]);

  const handleClosePayment = useCallback(() => {
    setShowPaymentModal(false);
  }, []);

  const handlePaymentSuccess = useCallback(async (paymentData) => {
    console.log('handlePaymentSuccess called with:', paymentData);
    
    try {
      setSubmittingOrder(true);
      
      // Prepare order data for API
      const orderData = {
        orderItems: orderItems.map(item => ({
          drug_id: item.drug_id,
          drug_name: item.drug_name,
          quantity: item.quantity,
          base_price: item.base_price
        })),
        discount,
        paymentData
      };
      
      // Submit order to API
      const response = await ordersAPI.create(orderData);
      
      if (response.data.success) {
        const receiptInfo = response.data.data;
        
        const newReceiptData = {
          ...receiptInfo,
          calculations,
          paymentData,
          orderItems: orderItems,
          invoiceNumber: receiptInfo.invoiceNumber,
          refNumber: receiptInfo.invoiceNumber,
          cashier: receiptInfo.cashier || pharmacistInfo?.user?.full_name || pharmacistInfo?.full_name || user?.username || 'Staff',
          orderId: receiptInfo.orderId,
          orderDate: receiptInfo.orderDate
        };
        
        console.log('Final receipt data with cashier:', newReceiptData);
        
        setReceiptData(newReceiptData);
        setShowPaymentModal(false);
        setShowReceiptModal(true);
        
        // Reload products data to reflect updated stock levels
        await reloadProducts();
        
        // Update low stock data after transaction (without showing notification again)
        setTimeout(() => {
          recheckLowStock();
        }, 1000); // Delay to ensure stock updates are complete
        
        console.log('Receipt modal should now be visible');
      } else {
        throw new Error(response.data.message || 'Failed to create order');
      }
      
    } catch (error) {
      console.error('Order submission error:', error);
      
      // Show error notification
      if (window.electronAPI?.showNotification) {
        window.electronAPI.showNotification('Error', error.response?.data?.message || error.message || 'Failed to create order');
      } else {
        alert(error.response?.data?.message || error.message || 'Failed to create order');
      }
    } finally {
      setSubmittingOrder(false);
    }
  }, [calculations, orderItems, user, discount, reloadProducts, pharmacistInfo]);

  const handleCloseReceipt = useCallback(() => {
    setShowReceiptModal(false);
    setReceiptData(null);
    cancelOrder();
  }, [cancelOrder]);

  // Products modal handlers
  const handleOpenProducts = useCallback(() => {
    setShowProductsModal(true);
  }, []);

  const handleCloseProducts = useCallback(() => {
    setShowProductsModal(false);
  }, []);

  const handleProductSelect = useCallback((product) => {
    addToOrder(product);
    setShowProductsModal(false);
  }, [addToOrder]);

  // Keyboard navigation support
  const handleKeyDown = useCallback((event, action, ...args) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action(...args);
    }
  }, []);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="staff-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <button 
            className="nav-btn products-btn active"
            onClick={handleOpenProducts}
            tabIndex="0"
          >
            <span className="icon">📦</span>
            Products
          </button>
        </div>
        <div className="header-right">
          <span className="user-info">👤 {pharmacistInfo?.user?.full_name || pharmacistInfo?.full_name || user?.username}</span>
          <button 
            className="nav-btn logout-btn" 
            onClick={handleLogout}
            tabIndex="0"
          >
            🚪 Log out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Left Side - Order Interface */}
        <div className="order-section">
          <div className="order-list">
            <table className="order-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>×</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item, index) => (
                  <tr key={item.drug_id}>
                    <td>{index + 1}</td>
                    <td title={item.drug_name} className="order-table-item-name">{item.drug_name}</td>
                    <td>
                      <input
                        type="number"
                        value={item.quantity}
                        min="1"
                        max="999"
                        onChange={(e) => updateQuantity(item.drug_id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.target.blur();
                          }
                        }}
                        className="qty-input"
                        tabIndex="0"
                      />
                    </td>
                    <td>PHP{(item.base_price * item.quantity).toLocaleString()}</td>
                    <td>
                      <button 
                        className="remove-btn"
                        onClick={() => removeFromOrder(item.drug_id)}
                        onKeyDown={(e) => handleKeyDown(e, removeFromOrder, item.drug_id)}
                        title={`Remove ${item.drug_name}`}
                        tabIndex="0"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
                {orderItems.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                      No items in order
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Order Summary */}
          <div className="order-summary">
            <div className="summary-row">
              <span>Total Item(s)</span>
              <span>{calculations.totalItems}</span>
            </div>
            <div className="summary-row">
              <span>Price</span>
              <span>PHP{calculations.subtotal.toLocaleString()}</span>
            </div>
            <div className="summary-row">
              <label className="discount-checkbox">
                <input
                  type="checkbox"
                  checked={discount}
                  onChange={(e) => setDiscount(e.target.checked)}
                  tabIndex="0"
                />
                Discount (20%)
              </label>
              <span>-PHP{calculations.discountAmount.toLocaleString()}</span>
            </div>
            <div className="summary-row gross-price">
              <span>Gross Price (inc 12% Tax)</span>
              <span>PHP{calculations.grossPrice.toLocaleString()}</span>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button 
                className="btn-cancel" 
                onClick={cancelOrder}
                disabled={orderItems.length === 0}
                tabIndex="0"
              >
                ❌ Cancel
              </button>
              <button 
                className="btn-pay" 
                onClick={handleOpenPayment}
                disabled={orderItems.length === 0}
                tabIndex="0"
              >
                💰 Pay
              </button>
            </div>
          </div>
        </div>

        {/* Right Side - Product Selection */}
        <div className="products-section">
          {/* Search and Filter */}
          <div className="search-filter">
            <input
              type="text"
              placeholder="Search products..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Products Grid */}
          <div className="products-grid">
            {filteredProducts.length > 0 ? (
              filteredProducts.map(product => (
                <div 
                  key={product.drug_id} 
                  className="product-card"
                  onClick={() => addToOrder(product)}
                  onKeyDown={(e) => handleKeyDown(e, addToOrder, product)}
                  tabIndex="0"
                  role="button"
                  aria-pressed="false"
                >
                  <div className={`product-image ${!product.image_path ? 'no-image' : ''}`}>
                    {product.image_path ? (
                      <img 
                        src={getImageUrl(product.image_path)} 
                        alt={product.drug_name}
                        onError={(e) => handleImageError(e, 'No Image')}
                      />
                    ) : null}
                    <span style={{ display: product.image_path ? 'none' : 'block' }}>No Image</span>
                  </div>
                  <div className="product-info">
                    <span 
                      className={`product-name ${isLowStock(product.total_stock, product.reorder_level) ? 'low-stock' : ''}`}
                      title={product.drug_name}
                      style={{ 
                        color: isLowStock(product.total_stock, product.reorder_level) ? '#dc2626' : '#918e8e'
                      }}
                    >
                      {product.drug_name}
                    </span>
                    <span 
                      className={`product-stock ${isLowStock(product.total_stock, product.reorder_level) ? 'low-stock' : ''}`}
                      title={getStockTooltip(product.total_stock, product.reorder_level)}
                      style={{ 
                        color: getStockColor(product.total_stock, product.reorder_level)
                      }}
                    >
                      Stock: {product.total_stock} {getLowStockIcon(product.total_stock, product.reorder_level)}
                    </span>
                    <span className="product-price">PHP{product.base_price.toLocaleString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>No products found.</p>
                <p>Try adjusting your search or filter.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <Payment
          isVisible={showPaymentModal}
          onClose={handleClosePayment}
          onPaymentSuccess={handlePaymentSuccess}
          calculations={calculations}
          orderItems={orderItems}
        />
      )}

      {showReceiptModal && (
        <Receipt
          isVisible={showReceiptModal}
          onClose={handleCloseReceipt}
          receiptData={receiptData}
        />
      )}

      {/* Products Modal */}
      {showProductsModal && (
        <Products
          isVisible={showProductsModal}
          onClose={handleCloseProducts}
          products={products}
          onProductSelect={handleProductSelect}
        />
      )}

      {/* Low Stock Notification */}
      <LowStockNotification
        isVisible={showNotification}
        onClose={closeNotification}
        lowStockCount={lowStockCount}
        lowStockProducts={lowStockProducts}
      />
    </div>
  );
};

export default StaffDashboard; 