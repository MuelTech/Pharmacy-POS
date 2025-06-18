// Utility functions for stock management and alerts

/**
 * Check if a product is low on stock
 * @param {number} currentStock - Current stock level
 * @param {number} reorderLevel - Reorder level threshold
 * @returns {boolean} - True if stock is low (at or below reorder level)
 */
export const isLowStock = (currentStock, reorderLevel) => {
  const stock = Number(currentStock) || 0;
  const reorder = Number(reorderLevel) || 0;
  
  // If no reorder level is set, consider it low stock if below 10 units
  if (reorder === 0) {
    return stock <= 10;
  }
  
  return stock <= reorder;
};

/**
 * Get stock level CSS classes based on stock status
 * @param {number} currentStock - Current stock level
 * @param {number} reorderLevel - Reorder level threshold
 * @returns {string} - CSS class string
 */
export const getStockClass = (currentStock, reorderLevel) => {
  if (isLowStock(currentStock, reorderLevel)) {
    return 'low-stock';
  }
  return '';
};

/**
 * Get stock level color based on stock status
 * @param {number} currentStock - Current stock level
 * @param {number} reorderLevel - Reorder level threshold
 * @returns {string} - Color value
 */
export const getStockColor = (currentStock, reorderLevel) => {
  if (isLowStock(currentStock, reorderLevel)) {
    return '#dc2626'; // Red for low stock
  }
  
  const stock = Number(currentStock) || 0;
  if (stock > 50) {
    return '#059669'; // Green for good stock
  } else if (stock > 20) {
    return '#d97706'; // Orange for medium stock
  } else {
    return '#dc2626'; // Red for very low stock
  }
};

/**
 * Get warning icon for low stock
 * @param {number} currentStock - Current stock level
 * @param {number} reorderLevel - Reorder level threshold
 * @returns {string} - Warning icon or empty string
 */
export const getLowStockIcon = (currentStock, reorderLevel) => {
  return isLowStock(currentStock, reorderLevel) ? '⚠️' : '';
};

/**
 * Get tooltip text for stock status
 * @param {number} currentStock - Current stock level
 * @param {number} reorderLevel - Reorder level threshold
 * @returns {string} - Tooltip text
 */
export const getStockTooltip = (currentStock, reorderLevel) => {
  const stock = Number(currentStock) || 0;
  const reorder = Number(reorderLevel) || 0;
  
  if (isLowStock(currentStock, reorderLevel)) {
    if (reorder > 0) {
      return `Low stock! Current: ${stock}, Reorder level: ${reorder}. Please reorder soon.`;
    } else {
      return `Low stock! Current: ${stock}. Please reorder soon.`;
    }
  }
  
  return `Stock level: ${stock}${reorder > 0 ? `, Reorder at: ${reorder}` : ''}`;
}; 