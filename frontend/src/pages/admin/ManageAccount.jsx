import React, { useState, useEffect } from 'react';
import './ManageAccount.css';

const ManageAccount = ({ isOpen, onClose }) => {
  const [accounts, setAccounts] = useState([]);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    isActive: true,
    role: 'Staff',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    licenseNumber: ''
  });
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState({});

  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    const mockAccounts = [
      {
        id: 1,
        username: 'john_doe',
        role: 'Admin',
        isActive: true,
        lastLogin: '2024-03-15 10:30 AM',
        createdAt: '2024-01-15 08:00 AM',
        updatedAt: '2024-03-10 02:15 PM',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '123-456-7890',
        email: 'john@example.com',
        licenseNumber: 'PH12345'
      },
      {
        id: 2,
        username: 'jane_smith',
        role: 'Staff',
        isActive: true,
        lastLogin: '2024-03-15 09:15 AM',
        createdAt: '2024-02-01 09:30 AM',
        updatedAt: '2024-03-12 11:45 AM',
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '987-654-3210',
        email: 'jane@example.com',
        licenseNumber: 'ST67890'
      }
    ];
    setAccounts(mockAccounts);
  }, []);



  const validateForm = () => {
    const newErrors = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters long';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    } else if (!editMode || (editMode && formData.username !== accounts.find(acc => acc.id === editingId)?.username)) {
      // Check for duplicate username
      const isDuplicate = accounts.some(account => 
        account.username.toLowerCase() === formData.username.toLowerCase() && 
        account.id !== editingId
      );
      if (isDuplicate) {
        newErrors.username = 'Username already exists';
      }
    }

    // Password validation
    if (!editMode && !formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    } else if (!editMode || (editMode && formData.email !== accounts.find(acc => acc.id === editingId)?.email)) {
      // Check for duplicate email
      const isDuplicateEmail = accounts.some(account => 
        account.email.toLowerCase() === formData.email.toLowerCase() && 
        account.id !== editingId
      );
      if (isDuplicateEmail) {
        newErrors.email = 'Email already exists';
      }
    }

    // Phone number validation
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\d{3}-\d{3}-\d{4}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Phone number must be in format: 123-456-7890';
    }

    // License number validation
    if (!formData.licenseNumber.trim()) {
      newErrors.licenseNumber = 'License number is required';
    } else if (formData.licenseNumber.length < 5) {
      newErrors.licenseNumber = 'License number must be at least 5 characters long';
    }

    // Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatPhoneNumber = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as XXX-XXX-XXXX
    if (digits.length >= 6) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    } else if (digits.length >= 3) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }
    return digits;
  };

    const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === 'checkbox' ? checked : value;
    
    // Format phone number as user types
    if (name === 'phoneNumber') {
      newValue = formatPhoneNumber(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Clear general message when user starts typing
    if (message.text) {
      setMessage({ type: '', text: '' });
    }


  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    // Validate form
    if (!validateForm()) {
      setIsSubmitting(false);
      alert('Please fill in all required fields');
      return;
    }

    try {
      const currentDate = new Date().toLocaleString();
      
      if (editMode) {
        // Update existing account
        setAccounts(prev =>
          prev.map(account =>
            account.id === editingId
              ? { 
                  ...account, 
                  ...formData, 
                  updatedAt: currentDate,
                  // Don't update password if it's empty during edit
                  ...(formData.password ? {} : { password: account.password })
                }
              : account
          )
        );
        setSuccessMessage('Account updated successfully!');
        setShowSuccessPopup(true);
      } else {
        // Create new account
        const newAccount = {
          id: Date.now(),
          ...formData,
          lastLogin: 'Never',
          createdAt: currentDate,
          updatedAt: currentDate
        };
        
        setAccounts(prev => [...prev, newAccount]);
        setSuccessMessage('Account created successfully!');
        setShowSuccessPopup(true);
      }

      // Reset form after successful submission
      setTimeout(() => {
        resetForm();
        setShowSuccessPopup(false);
      }, 3000);

    } catch (error) {
      console.error('Error saving account:', error);
      setMessage({ type: 'error', text: 'Failed to save account. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (account) => {
    setEditMode(true);
    setEditingId(account.id);
    setFormData({
      username: account.username,
      password: '',
      isActive: account.isActive,
      role: account.role,
      firstName: account.firstName || '',
      lastName: account.lastName || '',
      phoneNumber: account.phoneNumber || '',
      email: account.email || '',
      licenseNumber: account.licenseNumber || ''
    });
  };

  const handleToggleStatus = (id) => {
    const currentDate = new Date().toLocaleString();
    setAccounts(prev =>
      prev.map(account =>
        account.id === id
          ? { ...account, isActive: !account.isActive, updatedAt: currentDate }
          : account
      )
    );
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      isActive: true,
      role: 'Staff',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      email: '',
      licenseNumber: ''
    });
    setEditMode(false);
    setEditingId(null);

          setErrors({});
      setMessage({ type: '', text: '' });
      setShowSuccessPopup(false);
      setSuccessMessage('');
  };

  if (!isOpen) return null;

  return (
    <div className="manage-account-modal">
      <div className="manage-account-content">
        <div className="manage-account-header">
          <h2>{editMode ? 'Edit Account' : 'Create New Account'}</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="scrollable-content">
          {message.text && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="account-form">
            <div className="form-section">
              <h3 className="section-title">Account Credentials</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="username">Username *</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Enter username"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password {!editMode && '*'}</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder={editMode ? "Leave blank to keep current password" : "Enter password"}
                    required={!editMode}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="role">Role *</label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Staff">Staff</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="status-label">Account Status</label>
                  <div className="toggle-container">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                      />
                      <span className="slider"></span>
                    </label>
                    <span className="status-text">{formData.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="section-title">Personal Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name *</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Enter first name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="lastName">Last Name *</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="phoneNumber">Phone Number *</label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="123-456-7890"
                    maxLength="12"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter email address"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="licenseNumber">License Number *</label>
                  <input
                    type="text"
                    id="licenseNumber"
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={handleInputChange}
                    placeholder="Enter license number"
                    required
                  />
                </div>
                <div className="form-group"></div> {/* Empty div for grid alignment */}
              </div>
            </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-button" 
              onClick={resetForm}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : editMode ? 'Update Account' : 'Create Account'}
            </button>
          </div>
        </form>

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

        <table className="accounts-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Created At</th>
              <th>Updated At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(account => (
              <tr key={account.id}>
                <td>{account.username}</td>
                <td>{account.role}</td>
                <td>{account.isActive ? 'Active' : 'Inactive'}</td>
                <td>{account.lastLogin}</td>
                <td>{account.createdAt}</td>
                <td>{account.updatedAt}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="action-button edit-button"
                      onClick={() => handleEdit(account)}
                    >
                      Edit
                    </button>
                    <button
                      className={`action-button ${account.isActive ? 'disable-button' : 'enable-button'}`}
                      onClick={() => handleToggleStatus(account.id)}
                    >
                      {account.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default ManageAccount; 