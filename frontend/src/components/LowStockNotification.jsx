import React, { useState, useEffect } from 'react';
import './LowStockNotification.css';

const LowStockNotification = ({ 
  isVisible, 
  onClose, 
  lowStockCount = 0, 
  lowStockProducts = [] 
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      // Auto-close after 10 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const handleClose = () => {
    setIsAnimating(false);
    // Wait for animation to complete before hiding
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div className={`low-stock-notification ${isAnimating ? 'show' : 'hide'}`}>
      <div className="notification-header">
        <div className="notification-icon">
          <span className="warning-icon">⚠️</span>
        </div>
        <div className="notification-title">
          <strong>Low Stock Alert!</strong>
        </div>
        <button className="notification-close" onClick={handleClose}>
          ×
        </button>
      </div>
      
      <div className="notification-content">
        <p className="notification-message">
          {lowStockCount === 1 
            ? `1 product is running low on stock.`
            : `${lowStockCount} products are running low on stock.`
          }
        </p>
        
        {lowStockProducts.length > 0 && (
          <div className="low-stock-list">
            {lowStockProducts.slice(0, 3).map((product, index) => (
              <div key={product.drug_id || index} className="low-stock-item">
                <span className="product-name">{product.drug_name}</span>
                <span className="stock-info">
                  Stock: {product.total_stock || product.stock_level}
                  {product.reorder_level && ` (Reorder: ${product.reorder_level})`}
                </span>
              </div>
            ))}
            {lowStockProducts.length > 3 && (
              <div className="more-items">
                +{lowStockProducts.length - 3} more items
              </div>
            )}
          </div>
        )}
        
        <div className="notification-actions">
          <p className="action-text">
            Please check inventory and reorder soon.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LowStockNotification; 