import React, { useState, useMemo } from 'react';
import './Products.css';

const Products = ({ 
  isVisible, 
  onClose, 
  products, 
  onProductSelect 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Sorting function
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    if (!products || products.length === 0) {
      return [];
    }
    
    let filtered = products;
    
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
  }, [products, searchTerm, sortConfig]);

  if (!isVisible) return null;

  const handleProductClick = (product) => {
    if (onProductSelect) {
      onProductSelect(product);
    }
  };

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
          <h2>Products</h2>
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
                  onClick={() => handleSort('earliest_expiry')}
                >
                  Earliest Expiry {getSortIcon('earliest_expiry')}
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
              {filteredAndSortedProducts.map((product) => (
                <tr 
                  key={product.drug_id || product.id} 
                  className="product-row"
                  onClick={() => handleProductClick(product)}
                >
                  <td>
                    <div className="product-item">
                      <div className="product-image-placeholder">
                        {product.image_path ? (
                          <img 
                            src={product.image_path} 
                            alt={product.drug_name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span>NO IMAGE</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="product-name">
                    <div>
                      <div>{product.drug_name || 'Unknown'}</div>
                      <small style={{ color: '#666', fontSize: '11px' }}>
                        {product.dosage && product.form ? `${product.dosage} ${product.form}` : ''}
                      </small>
                    </div>
                  </td>
                  <td className="product-price">
                    PHP{(product.base_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="product-stock">
                    <span style={{ 
                      color: (product.total_stock || 0) > 10 ? '#059669' : 
                             (product.total_stock || 0) > 0 ? '#d97706' : '#dc2626'
                    }}>
                      {product.total_stock || 0}
                    </span>
                  </td>
                  <td className="product-expiry-date">
                    {product.earliest_expiry ? new Date(product.earliest_expiry).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="product-category">{product.category_name || 'N/A'}</td>
                </tr>
              ))}
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