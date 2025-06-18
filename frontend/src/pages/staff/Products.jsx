import React, { useState, useMemo, useEffect } from 'react';
import './Products.css';
import { getImageUrl, handleImageError } from '../../utils/imageUtils';
import { isLowStock, getStockColor, getLowStockIcon, getStockTooltip } from '../../utils/stockUtils';
import { productsAPI } from '../../services/api';

const Products = ({ 
  isVisible, 
  onClose, 
  products, 
  onProductSelect 
}) => {
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Fetch all product batches for staff view
  useEffect(() => {
    if (isVisible) {
      const fetchAllProducts = async () => {
        try {
          setLoading(true);
          const response = await productsAPI.getAll({ staff_view: 'true' });
          if (response.data.success) {
            setAllProducts(response.data.data);
          }
        } catch (error) {
          console.error('Failed to fetch all product batches:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchAllProducts();
    }
  }, [isVisible]);

  // Sorting function
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort products - use allProducts for staff view
  const filteredAndSortedProducts = useMemo(() => {
    const productsToUse = allProducts.length > 0 ? allProducts : products || [];
    if (productsToUse.length === 0) {
      return [];
    }
    
    let filtered = productsToUse;
    
    // Filter by search term
    if (searchTerm.trim()) {
      filtered = products.filter(product => 
        (product.drug_name && product.drug_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.category_name && product.category_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.manufacturer && product.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Sort products
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        // Handle different data types
        if (sortConfig.key === 'base_price' || sortConfig.key === 'total_stock') {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
        } else if (sortConfig.key === 'earliest_expiry') {
          aValue = new Date(aValue || 0);
          bValue = new Date(bValue || 0);
        } else {
          aValue = String(aValue || '').toLowerCase();
          bValue = String(bValue || '').toLowerCase();
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filtered;
  }, [allProducts, products, searchTerm, sortConfig]);

  if (!isVisible) return null;

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return '↑↓';
    }
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="products-modal-overlay">
      <div className="products-modal">
        <div className="products-header">
          <h2>Products Inventory (View Only)</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="products-search">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="products-table-container">
          <table className="products-table">
            <thead>
              <tr>
                <th>Item</th>
                <th 
                  className="sortable" 
                  onClick={() => handleSort('drug_name')}
                >
                  Name {getSortIcon('drug_name')}
                </th>
                <th 
                  className="sortable" 
                  onClick={() => handleSort('base_price')}
                >
                  Price {getSortIcon('base_price')}
                </th>
                <th 
                  className="sortable" 
                  onClick={() => handleSort('total_stock')}
                >
                  Stock {getSortIcon('total_stock')}
                </th>
                <th 
                  className="sortable" 
                  onClick={() => handleSort('batch_number')}
                >
                  Batch Number {getSortIcon('batch_number')}
                </th>
                <th 
                  className="sortable" 
                  onClick={() => handleSort('earliest_expiry')}
                >
                  Expiry Date {getSortIcon('earliest_expiry')}
                </th>
                <th 
                  className="sortable" 
                  onClick={() => handleSort('date_received')}
                >
                  Date Received {getSortIcon('date_received')}
                </th>
                <th 
                  className="sortable" 
                  onClick={() => handleSort('category_name')}
                >
                  Category {getSortIcon('category_name')}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>
                    Loading products...
                  </td>
                </tr>
              ) : (
                filteredAndSortedProducts.map((product, index) => (
                  <tr 
                    key={`${product.drug_id}-${product.inventory_id}-${index}`} 
                    className="product-row read-only"
                  >
                    <td>
                      <div className="product-item">
                        <div className="product-image-placeholder">
                          {product.image_path ? (
                            <img 
                              src={getImageUrl(product.image_path)} 
                              alt={product.drug_name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => handleImageError(e, 'NO IMAGE')}
                            />
                          ) : (
                            <span>NO IMAGE</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={`product-name ${isLowStock(product.total_stock, product.reorder_level) ? 'low-stock-alert' : ''}`}>
                      <div>
                        <div 
                          style={{ 
                            color: isLowStock(product.total_stock, product.reorder_level) ? '#dc2626' : '#111827'
                          }}
                        >
                          {product.drug_name || 'Unknown'}
                        </div>
                        <small style={{ color: '#666', fontSize: '11px' }}>
                          {product.dosage && product.form ? `${product.dosage} ${product.form}` : ''}
                        </small>
                        {product.manufacturer && (
                          <small style={{ color: '#999', fontSize: '10px', display: 'block' }}>
                            {product.manufacturer}
                          </small>
                        )}
                      </div>
                    </td>
                    <td className="product-price">
                      PHP{(product.base_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`product-stock ${isLowStock(product.total_stock, product.reorder_level) ? 'low-stock-alert' : ''}`}>
                      <span 
                        style={{ 
                          color: getStockColor(product.total_stock, product.reorder_level)
                        }}
                        title={getStockTooltip(product.total_stock, product.reorder_level)}
                      >
                        {product.total_stock || 0} {getLowStockIcon(product.total_stock, product.reorder_level)}
                      </span>
                    </td>
                    <td className="product-batch">
                      <span style={{ color: '#666', fontWeight: '500' }}>
                        {product.batch_number || 'N/A'}
                      </span>
                    </td>
                    <td className="product-expiry-date">
                      <span style={{ 
                        color: product.earliest_expiry ? (
                          new Date(product.earliest_expiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? '#dc2626' : '#666'
                        ) : '#999'
                      }}>
                        {product.earliest_expiry ? new Date(product.earliest_expiry).toLocaleDateString() : 'N/A'}
                      </span>
                    </td>
                    <td className="product-date-received">
                      {product.date_received ? new Date(product.date_received).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="product-category">{product.category_name || 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {filteredAndSortedProducts.length === 0 && (
            <div className="no-products">
              <p>No products found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Products; 