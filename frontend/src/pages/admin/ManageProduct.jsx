import React, { useState } from 'react';
import './ManageProduct.css';

const ManageProduct = ({ isVisible, onClose, products, setProducts }) => {
  // Form state
  const [formData, setFormData] = useState({
    drug_name: '',
    dosage: '',
    form: '',
    manufacturer: '',
    base_price: '',
    category: '',
    image_path: ''
  });

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // Success popup state
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission (UI-only)
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Reset form first to prevent input issues
    const currentFormData = { ...formData };
    
    if (isEditMode) {
      // Update existing product
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === editingProductId 
            ? { ...product, ...currentFormData, base_price: `PHP ${currentFormData.base_price}` }
            : product
        )
      );
      console.log('Updating product (UI-only):', currentFormData);
      setSuccessMessage('Product updated successfully!');
      setIsEditMode(false);
      setEditingProductId(null);
    } else {
      // Add new product
      const newProduct = {
        id: Date.now(), // Simple ID generation for demo
        ...currentFormData,
        base_price: `PHP ${currentFormData.base_price}`
      };
      setProducts(prevProducts => [...prevProducts, newProduct]);
      console.log('Adding product (UI-only):', currentFormData);
      setSuccessMessage('Product added successfully!');
    }
    
    // Clear form and show success popup
    clearForm();
    setShowSuccessPopup(true);
    
    // Auto-hide success popup after 3 seconds
    setTimeout(() => {
      setShowSuccessPopup(false);
    }, 3000);
  };

  // Format price input
  const handlePriceChange = (e) => {
    let value = e.target.value.replace(/[^\d.]/g, ''); // Remove non-numeric characters except decimal
    setFormData(prev => ({
      ...prev,
      base_price: value
    }));
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create a simulated path for the selected file
      const filePath = `/images/${file.name}`;
      setFormData(prev => ({
        ...prev,
        image_path: filePath
      }));
    }
  };

  // Trigger file input click
  const handleBrowseClick = () => {
    document.getElementById('file-input').click();
  };

  // Clear form function
  const clearForm = () => {
    setFormData({
      drug_name: '',
      dosage: '',
      form: '',
      manufacturer: '',
      base_price: '',
      category: '',
      image_path: ''
    });
    setIsEditMode(false);
    setEditingProductId(null);
  };

  // Handle edit button click
  const handleEdit = (product) => {
    setFormData({
      drug_name: product.drug_name,
      dosage: product.dosage,
      form: product.form,
      manufacturer: product.manufacturer,
      base_price: product.base_price.replace('PHP ', ''), // Remove PHP prefix for editing
      category: product.category,
      image_path: product.image_path
    });
    setIsEditMode(true);
    setEditingProductId(product.id);

    // Auto-scroll to form section
    setTimeout(() => {
      const formSection = document.querySelector('.form-section');
      if (formSection) {
        formSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100);
  };

  // Handle delete button click
  const handleDelete = (product) => {
    setProductToDelete(product);
    setShowDeleteConfirm(true);
  };

  // Confirm delete action
  const confirmDelete = () => {
    if (productToDelete) {
      setProducts(prevProducts => prevProducts.filter(product => product.id !== productToDelete.id));
      
      // If we're currently editing this product, clear the form
      if (editingProductId === productToDelete.id) {
        clearForm();
      }
      
      setShowDeleteConfirm(false);
      setProductToDelete(null);
    }
  };

  // Cancel delete action
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setProductToDelete(null);
  };

  if (!isVisible) return null;

  return (
    <div className="manage-product-overlay">
      <div className="manage-product-modal">
        {/* Modal Header */}
        <div className="modal-header">
          <h2>Manage Products</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Modal Content */}
        <div className="modal-content">
          {/* Input Form Section */}
          <div className="form-section">
            <h3>{isEditMode ? 'Edit Product' : 'Add Product'}</h3>
            <form onSubmit={handleSubmit} className="product-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="drug_name">Drug Name *</label>
                  <input
                    type="text"
                    id="drug_name"
                    name="drug_name"
                    value={formData.drug_name}
                    onChange={handleInputChange}
                    placeholder="Enter drug name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="dosage">Dosage *</label>
                  <select
                    id="dosage"
                    name="dosage"
                    value={formData.dosage}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select dosage</option>
                    
                    {/* Tablets/Capsules - mg */}
                    <option value="5mg">5mg</option>
                    <option value="10mg">10mg</option>
                    <option value="20mg">20mg</option>
                    <option value="25mg">25mg</option>
                    <option value="40mg">40mg</option>
                    <option value="50mg">50mg</option>
                    <option value="100mg">100mg</option>
                    <option value="125mg">125mg</option>
                    <option value="250mg">250mg</option>
                    <option value="500mg">500mg</option>
                    <option value="750mg">750mg</option>
                    <option value="1000mg">1000mg</option>
                    <option value="1mg">1mg</option>
                    <option value="2mg">2mg</option>
                    <option value="5mg">5mg</option>
                    
                    {/* Tablets/Capsules - mcg */}
                    <option value="25mcg">25mcg</option>
                    <option value="50mcg">50mcg</option>
                    <option value="100mcg">100mcg</option>
                    <option value="200mcg">200mcg</option>
                    <option value="400mcg">400mcg</option>
                    
                    {/* Liquids - ml */}
                    <option value="5ml">5ml</option>
                    <option value="10ml">10ml</option>
                    <option value="15ml">15ml</option>
                    <option value="30ml">30ml</option>
                    <option value="60ml">60ml</option>
                    <option value="100ml">100ml</option>
                    <option value="120ml">120ml</option>
                    <option value="250ml">250ml</option>
                    <option value="500ml">500ml</option>
                    
                    {/* Percentages for topicals/solutions */}
                    <option value="1%">1%</option>
                    <option value="2%">2%</option>
                    <option value="3%">3%</option>
                    <option value="5%">5%</option>
                    <option value="10%">10%</option>
                    <option value="15%">15%</option>
                    <option value="20%">20%</option>
                    
                    {/* Units for injections */}
                    <option value="10 units">10 units</option>
                    <option value="40 units">40 units</option>
                    <option value="100 units">100 units</option>
                    
                    {/* International Units */}
                    <option value="1000 IU">1000 IU</option>
                    <option value="2000 IU">2000 IU</option>
                    <option value="5000 IU">5000 IU</option>
                    <option value="10000 IU">10000 IU</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="form">Form *</label>
                  <select
                    id="form"
                    name="form"
                    value={formData.form}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select form</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Solution">Solution</option>
                    <option value="Injection">Injection</option>
                    <option value="Cream">Cream</option>
                    <option value="Ointment">Ointment</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="manufacturer">Manufacturer *</label>
                  <input
                    type="text"
                    id="manufacturer"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleInputChange}
                    placeholder="Enter manufacturer name"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="base_price">Base Price (PHP) *</label>
                  <div className="price-input">
                    <span className="currency-symbol">₱</span>
                    <input
                      type="text"
                      id="base_price"
                      name="base_price"
                      value={formData.base_price}
                      onChange={handlePriceChange}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="category">Category *</label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select category</option>
                    <option value="Cardiovascular">Cardiovascular</option>
                    <option value="Antiseptic">Antiseptic</option>
                    <option value="Muscle Relaxant">Muscle Relaxant</option>
                    <option value="Immunosuppressant">Immunosuppressant</option>
                    <option value="Analgesic">Analgesic</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="image_path">Image Path</label>
                  <div className="file-input-container">
                    <input
                      type="text"
                      id="image_path"
                      name="image_path"
                      value={formData.image_path}
                      onChange={handleInputChange}
                      placeholder="Enter image URL or file path"
                    />
                    <button 
                      type="button" 
                      className="browse-btn"
                      onClick={handleBrowseClick}
                    >
                      Browse
                    </button>
                    <input
                      type="file"
                      id="file-input"
                      accept="image/*"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="add-btn">
                  {isEditMode ? 'Update Product' : 'Add Product'}
                </button>
                <button type="button" className="clear-btn" onClick={clearForm}>
                  {isEditMode ? 'Cancel Edit' : 'Clear Form'}
                </button>
              </div>
            </form>
          </div>

          {/* Product Information Table Section */}
          <div className="table-section">
            <div className="table-header">
              <h3>Product Information</h3>
              <div className="table-info">
                <small>Total Products: {products.length}</small>
              </div>
            </div>
            
            <div className="products-table-container">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Dosage</th>
                    <th>Form</th>
                    <th>Manufacturer</th>
                    <th>Base Price</th>
                    <th>Category</th>
                    <th>Image Path</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="product-name">{product.drug_name}</div>
                      </td>
                      <td>{product.dosage}</td>
                      <td>{product.form}</td>
                      <td>
                        <div style={{ 
                          maxWidth: '150px', 
                          whiteSpace: 'normal', 
                          wordWrap: 'break-word',
                          lineHeight: '1.3'
                        }}>
                          {product.manufacturer}
                        </div>
                      </td>
                      <td>
                        <div className="product-price">{product.base_price}</div>
                      </td>
                      <td>
                        <div style={{ 
                          maxWidth: '120px', 
                          whiteSpace: 'normal', 
                          wordWrap: 'break-word',
                          lineHeight: '1.3'
                        }}>
                          {product.category}
                        </div>
                      </td>
                      <td>
                        <div className="image-path" title={product.image_path}>
                          {product.image_path}
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="edit-btn"
                            onClick={() => handleEdit(product)}
                            title="Edit Product"
                          >
                            ✏️
                          </button>
                          <button 
                            className="delete-btn"
                            onClick={() => handleDelete(product)}
                            title="Delete Product"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {products.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  No products available. Add your first product using the form above.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="delete-confirm-overlay">
            <div className="delete-confirm-modal">
              <div className="delete-confirm-header">
                <div className="delete-icon">🗑️</div>
                <h3>Delete Product</h3>
              </div>
              
              <div className="delete-confirm-content">
                <p>Are you sure you want to delete this product?</p>
                {productToDelete && (
                  <div className="product-preview">
                    <div className="preview-image">
                      <img 
                        src={productToDelete.image_path} 
                        alt={productToDelete.drug_name}
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/40x40/cccccc/666666?text=NO+IMG';
                        }}
                      />
                    </div>
                    <div className="preview-details">
                      <div className="preview-name">{productToDelete.drug_name}</div>
                      <div className="preview-info">{productToDelete.dosage} • {productToDelete.form}</div>
                    </div>
                  </div>
                )}
                <p className="warning-text">
                  <strong>⚠️ This action cannot be undone.</strong>
                </p>
              </div>
              
              <div className="delete-confirm-actions">
                <button className="cancel-delete-btn" onClick={cancelDelete}>
                  Cancel
                </button>
                <button className="confirm-delete-btn" onClick={confirmDelete}>
                  Delete Product
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Popup */}
        {showSuccessPopup && (
          <div className="success-popup-overlay">
            <div className="success-popup">
              <div className="success-icon">✅</div>
              <div className="success-message">{successMessage}</div>
              <button 
                className="success-close-btn" 
                onClick={() => setShowSuccessPopup(false)}
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageProduct; 