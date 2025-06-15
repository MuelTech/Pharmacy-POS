import React, { useState, useMemo } from 'react';
import './InventoryModal.css';
import SelectMedicineModal from './SelectMedicineModal';

const InventoryModal = ({ isOpen, onClose, products }) => {
  // Form state for adding new inventory
  const [formData, setFormData] = useState({
    batch_id: '',
    medicine_name: '',
    stock_level: '',
    expiry_date: '',
    reorder_level: '',
    date_received: new Date().toISOString().split('T')[0] // Current date as default
  });

  // State for inventory data
  const [inventoryData, setInventoryData] = useState([
    {
      id: 1,
      batch_id: 'BTH001',
      medicine_name: 'FUROSEMIDE',
      stock_level: 150,
      expiry_date: '2024-12-31',
      reorder_level: 20,
      date_received: '2024-01-15'
    },
    {
      id: 2,
      batch_id: 'BTH002',
      medicine_name: 'HYDROGEN PEROXIDE',
      stock_level: 85,
      expiry_date: '2024-10-15',
      reorder_level: 15,
      date_received: '2024-01-20'
    },
    {
      id: 3,
      batch_id: 'BTH003',
      medicine_name: 'METHOCARBAMOL',
      stock_level: 200,
      expiry_date: '2025-03-20',
      reorder_level: 25,
      date_received: '2024-02-01'
    },
    {
      id: 4,
      batch_id: 'BTH004',
      medicine_name: 'LIPITOR',
      stock_level: 75,
      expiry_date: '2024-11-30',
      reorder_level: 30,
      date_received: '2024-01-10'
    },
    {
      id: 5,
      batch_id: 'BTH005',
      medicine_name: 'TACROLIMUS',
      stock_level: 45,
      expiry_date: '2025-06-15',
      reorder_level: 10,
      date_received: '2024-02-05'
    }
  ]);

  // Table state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // State for SelectMedicineModal
  const [showSelectMedicineModal, setShowSelectMedicineModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);

  const itemsPerPage = 5;

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle numeric input with validation
  const handleNumericChange = (e) => {
    const { name, value } = e.target;
    // Only allow positive numbers
    if (value === '' || (Number(value) >= 0 && !isNaN(Number(value)))) {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.batch_id || !formData.medicine_name || !formData.stock_level || 
        !formData.expiry_date || !formData.reorder_level || !formData.date_received) {
      alert('Please fill in all required fields');
      return;
    }

    if (!selectedMedicine) {
      alert('Please select a medicine');
      return;
    }

    // Create new inventory item
    const newInventoryItem = {
      id: Date.now(),
      batch_id: formData.batch_id,
      medicine_name: formData.medicine_name,
      stock_level: Number(formData.stock_level),
      expiry_date: formData.expiry_date,
      reorder_level: Number(formData.reorder_level),
      date_received: formData.date_received
    };

    // Add to inventory data
    setInventoryData(prev => [...prev, newInventoryItem]);

    // Clear form
    setFormData({
      batch_id: '',
      medicine_name: '',
      stock_level: '',
      expiry_date: '',
      reorder_level: '',
      date_received: new Date().toISOString().split('T')[0]
    });
    setSelectedMedicine(null);

    // Show success message
    setSuccessMessage('Inventory item added successfully!');
    setShowSuccessPopup(true);
    setTimeout(() => setShowSuccessPopup(false), 3000);
  };

  // Sorting functionality
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

  // Filter and sort inventory data
  const filteredAndSortedData = useMemo(() => {
    let filtered = inventoryData.filter(item =>
      item.medicine_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.batch_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'expiry_date' || sortConfig.key === 'date_received') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        } else if (sortConfig.key === 'stock_level' || sortConfig.key === 'reorder_level') {
          aValue = Number(aValue);
          bValue = Number(bValue);
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
  }, [inventoryData, searchTerm, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredAndSortedData.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  // Check if stock is below reorder level
  const isLowStock = (stockLevel, reorderLevel) => {
    return stockLevel <= reorderLevel;
  };

  // Handle medicine selection from modal
  const handleMedicineSelect = (product) => {
    setSelectedMedicine(product);
    setFormData(prev => ({
      ...prev,
      medicine_name: product.drug_name
    }));
  };

  // Clear selected medicine
  const clearSelectedMedicine = () => {
    setSelectedMedicine(null);
    setFormData(prev => ({
      ...prev,
      medicine_name: ''
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="inventory-modal-overlay">
      <div className="inventory-modal">
        <div className="inventory-modal-header">
          <h2>Inventory Management</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="inventory-modal-content">
          {/* Add Medicine Form */}
          <div className="inventory-form-section">
            <h3>Add Medicine Stock</h3>
            <form onSubmit={handleSubmit} className="inventory-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="batch_id">Batch ID *</label>
                  <input
                    type="text"
                    id="batch_id"
                    name="batch_id"
                    value={formData.batch_id}
                    onChange={handleInputChange}
                    placeholder="Enter batch ID"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="medicine_name">Medicine Name *</label>
                  <div className="medicine-selector">
                    <div className="selected-medicine-display">
                      {selectedMedicine ? (
                        <div className="selected-medicine-info">
                          <div className="selected-medicine-details">
                            <div className="selected-medicine-name">{selectedMedicine.drug_name}</div>
                            <div className="selected-medicine-meta">
                              {selectedMedicine.dosage} • {selectedMedicine.form} • {selectedMedicine.manufacturer}
                            </div>
                          </div>
                          <button 
                            type="button" 
                            className="clear-selection-btn"
                            onClick={clearSelectedMedicine}
                            title="Clear selection"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="no-medicine-selected">
                          <span>No medicine selected</span>
                        </div>
                      )}
                    </div>
                    <button 
                      type="button" 
                      className="select-medicine-btn"
                      onClick={() => setShowSelectMedicineModal(true)}
                    >
                      {selectedMedicine ? 'Change Medicine' : 'Select Medicine'}
                    </button>
                  </div>
                  <input
                    type="hidden"
                    name="medicine_name"
                    value={formData.medicine_name}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="stock_level">Stock Level *</label>
                  <input
                    type="number"
                    id="stock_level"
                    name="stock_level"
                    value={formData.stock_level}
                    onChange={handleNumericChange}
                    placeholder="Enter stock quantity"
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="reorder_level">Reorder Level *</label>
                  <input
                    type="number"
                    id="reorder_level"
                    name="reorder_level"
                    value={formData.reorder_level}
                    onChange={handleNumericChange}
                    placeholder="Enter reorder level"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="expiry_date">Expiry Date *</label>
                  <input
                    type="date"
                    id="expiry_date"
                    name="expiry_date"
                    value={formData.expiry_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="date_received">Date Received *</label>
                  <input
                    type="date"
                    id="date_received"
                    name="date_received"
                    value={formData.date_received}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="add-btn">
                  Add to Inventory
                </button>
              </div>
            </form>
          </div>

          {/* Inventory Table */}
          <div className="inventory-table-section">
            <div className="table-header">
              <h3>Inventory Items</h3>
              <div className="table-controls">
                <input
                  type="text"
                  placeholder="Search inventory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <span className="item-count">
                  Showing {filteredAndSortedData.length} items
                </span>
              </div>
            </div>

            <div className="inventory-table-container">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('medicine_name')} className="sortable">
                      Medicine Name {getSortIcon('medicine_name')}
                    </th>
                    <th onClick={() => handleSort('batch_id')} className="sortable">
                      Batch ID {getSortIcon('batch_id')}
                    </th>
                    <th onClick={() => handleSort('stock_level')} className="sortable">
                      Stock Level {getSortIcon('stock_level')}
                    </th>
                    <th onClick={() => handleSort('expiry_date')} className="sortable">
                      Expiry Date {getSortIcon('expiry_date')}
                    </th>
                    <th onClick={() => handleSort('reorder_level')} className="sortable">
                      Reorder Level {getSortIcon('reorder_level')}
                    </th>
                    <th onClick={() => handleSort('date_received')} className="sortable">
                      Date Received {getSortIcon('date_received')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item) => (
                    <tr key={item.id} className={isLowStock(item.stock_level, item.reorder_level) ? 'low-stock' : ''}>
                      <td>{item.medicine_name}</td>
                      <td>{item.batch_id}</td>
                      <td>
                        <span className={isLowStock(item.stock_level, item.reorder_level) ? 'stock-warning' : ''}>
                          {item.stock_level}
                          {isLowStock(item.stock_level, item.reorder_level) && ' ⚠️'}
                        </span>
                      </td>
                      <td>{formatDate(item.expiry_date)}</td>
                      <td>{item.reorder_level}</td>
                      <td>{formatDate(item.date_received)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  Previous
                </button>
                
                {[...Array(totalPages)].map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handlePageChange(index + 1)}
                    className={`pagination-btn ${currentPage === index + 1 ? 'active' : ''}`}
                  >
                    {index + 1}
                  </button>
                ))}
                
                <button 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Success Popup */}
        {showSuccessPopup && (
          <div className="success-popup">
            <div className="success-popup-content">
              <span className="success-icon">✓</span>
              <span className="success-message">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Select Medicine Modal */}
        <SelectMedicineModal
          isOpen={showSelectMedicineModal}
          onClose={() => setShowSelectMedicineModal(false)}
          products={products || []}
          onSelectMedicine={handleMedicineSelect}
        />
      </div>
    </div>
  );
};

export default InventoryModal; 