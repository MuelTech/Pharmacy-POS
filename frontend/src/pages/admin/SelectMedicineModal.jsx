import React, { useState, useMemo } from 'react';
import './SelectMedicineModal.css';
import { getImageUrl, handleImageError } from '../../utils/imageUtils';

const SelectMedicineModal = ({ isOpen, onClose, products, onSelectMedicine }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Filter and sort products based on search term and sort config
  const filteredAndSortedProducts = useMemo(() => {
    if (!products || products.length === 0) {
      return [];
    }
    
    let filtered = products.filter(product =>
      product.drug_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.form.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'base_price') {
          // Remove PHP prefix and convert to number for sorting
          aValue = Number(aValue.replace('PHP ', '')) || 0;
          bValue = Number(bValue.replace('PHP ', '')) || 0;
        } else {
          aValue = String(aValue).toLowerCase();
          bValue = String(bValue).toLowerCase();
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

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return '↑↓';
    }
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  // Handle medicine selection
  const handleMedicineSelect = (product) => {
    onSelectMedicine(product);
    onClose();
  };

  // Clear search when modal closes
  const handleClose = () => {
    setSearchTerm('');
    setSortConfig({ key: null, direction: 'asc' });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="select-medicine-overlay">
      <div className="select-medicine-modal">
        <div className="select-medicine-header">
          <h2>Select Medicine</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <div className="select-medicine-content">
          {/* Search Section */}
          <div className="search-section">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search medicines by name, category, manufacturer, or form..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
                autoFocus
              />
              <div className="search-icon">🔍</div>
            </div>
            <div className="search-results-count">
              {filteredAndSortedProducts.length} medicine{filteredAndSortedProducts.length !== 1 ? 's' : ''} found
            </div>
          </div>

          {/* Medicines List */}
          <div className="medicines-list-container">
            {filteredAndSortedProducts.length > 0 ? (
              <div className="medicines-grid">
                {filteredAndSortedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="medicine-card"
                    onClick={() => handleMedicineSelect(product)}
                  >
                    <div className="medicine-image">
                      <img 
                        src={getImageUrl(product.image_path) || 'https://via.placeholder.com/60x60/cccccc/666666?text=MED'} 
                        alt={product.drug_name}
                        onError={(e) => handleImageError(e, 'MED')}
                      />
                    </div>
                    <div className="medicine-details">
                      <div className="medicine-name">{product.drug_name}</div>
                      <div className="medicine-info">
                        <span className="dosage">{product.dosage}</span>
                        <span className="form">{product.form}</span>
                      </div>
                      <div className="medicine-meta">
                        <div className="manufacturer">{product.manufacturer}</div>
                        <div className="category">{product.category}</div>
                      </div>
                      <div className="medicine-price">{product.base_price}</div>
                    </div>
                    <div className="select-indicator">
                      <span>Select</span>
                      <div className="select-arrow">→</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-results">
                <div className="no-results-icon">🔍</div>
                <div className="no-results-title">No medicines found</div>
                <div className="no-results-message">
                  Try adjusting your search terms or check if medicines are available in the product catalog.
                </div>
              </div>
            )}
          </div>

          {/* Quick Filters */}
          <div className="quick-filters">
            <div className="filter-label">Quick sort:</div>
            <button 
              className={`filter-btn ${sortConfig.key === 'drug_name' ? 'active' : ''}`}
              onClick={() => handleSort('drug_name')}
            >
              Name {sortConfig.key === 'drug_name' ? getSortIcon('drug_name') : ''}
            </button>
            <button 
              className={`filter-btn ${sortConfig.key === 'category' ? 'active' : ''}`}
              onClick={() => handleSort('category')}
            >
              Category {sortConfig.key === 'category' ? getSortIcon('category') : ''}
            </button>
            <button 
              className={`filter-btn ${sortConfig.key === 'base_price' ? 'active' : ''}`}
              onClick={() => handleSort('base_price')}
            >
              Price {sortConfig.key === 'base_price' ? getSortIcon('base_price') : ''}
            </button>
            <button 
              className={`filter-btn ${sortConfig.key === 'manufacturer' ? 'active' : ''}`}
              onClick={() => handleSort('manufacturer')}
            >
              Manufacturer {sortConfig.key === 'manufacturer' ? getSortIcon('manufacturer') : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectMedicineModal; 