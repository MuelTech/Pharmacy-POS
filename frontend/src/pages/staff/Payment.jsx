import React, { useState, useCallback, useEffect } from 'react';
import { ordersAPI } from '../../services/api';
import './Payment.css';

const Payment = ({ 
  isVisible, 
  calculations, 
  onClose, 
  onPaymentSuccess 
}) => {
  // Payment-specific state
  const [paymentType, setPaymentType] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [loadingPaymentTypes, setLoadingPaymentTypes] = useState(false);

  // Fetch payment types from database
  const fetchPaymentTypes = useCallback(async () => {
    try {
      setLoadingPaymentTypes(true);
      const response = await ordersAPI.getPaymentTypes();
      if (response.data.success) {
        setPaymentTypes(response.data.data);
        // Set first payment type as default if available
        if (response.data.data.length > 0) {
          setPaymentType(response.data.data[0].payment_type);
        }
      }
    } catch (error) {
      console.error('Failed to fetch payment types:', error);
      // Fallback to hardcoded options if API fails
      const fallbackTypes = [
        { payment_type_id: 1, payment_type: 'Cash' },
        { payment_type_id: 2, payment_type: 'Card' },
        { payment_type_id: 3, payment_type: 'GCash' },
        { payment_type_id: 4, payment_type: 'PayMaya' },
        { payment_type_id: 5, payment_type: 'Bank Transfer' }
      ];
      setPaymentTypes(fallbackTypes);
      setPaymentType('Cash');
    } finally {
      setLoadingPaymentTypes(false);
    }
  }, []);

  // Load payment types when component mounts or becomes visible
  useEffect(() => {
    if (isVisible && paymentTypes.length === 0) {
      fetchPaymentTypes();
    }
  }, [isVisible, fetchPaymentTypes, paymentTypes.length]);

  // Payment modal functions
  const handleNumberPadClick = useCallback((number) => {
    if (number === 'backspace') {
      setPaymentAmount(prev => prev.slice(0, -1));
    } else if (number === '.') {
      // Only add decimal point if there isn't one already
      setPaymentAmount(prev => {
        if (prev.includes('.')) {
          return prev;
        }
        return prev + '.';
      });
    } else {
      setPaymentAmount(prev => prev + number);
    }
  }, []);

  const handleConfirmPayment = useCallback(() => {
    const payment = parseFloat(paymentAmount) || 0;
    if (payment < calculations.grossPrice) {
      alert('Insufficient payment amount!');
      return;
    }
    
    const change = payment - calculations.grossPrice;
    const paymentData = {
      total: calculations.grossPrice,
      paid: payment,
      change: change,
      paymentType: paymentType
    };
    
    // Reset component state before notifying parent
    setPaymentAmount('');
    setPaymentType(paymentTypes.length > 0 ? paymentTypes[0].payment_type : '');

    // Notify parent component to show receipt
    onPaymentSuccess(paymentData);
  }, [paymentAmount, calculations.grossPrice, paymentType, onPaymentSuccess, paymentTypes]);

  const handleClose = useCallback(() => {
    setPaymentAmount('');
    setPaymentType(paymentTypes.length > 0 ? paymentTypes[0].payment_type : '');
    onClose();
  }, [onClose, paymentTypes]);

  // Don't render if not visible
  if (!isVisible) return null;

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal-content">
        {/* Modal Header */}
        <div className="payment-modal-header">
          <h2>Payment</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <div className="payment-modal-body">
          {/* Payment Type Selection */}
          <div className="payment-type-section">
            <label className="payment-type-label">Payment Method</label>
            <select 
              className="payment-type-dropdown"
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              disabled={loadingPaymentTypes}
            >
              {loadingPaymentTypes ? (
                <option value="">Loading payment methods...</option>
              ) : paymentTypes.length > 0 ? (
                paymentTypes.map((type) => (
                  <option key={type.payment_type_id} value={type.payment_type}>
                    {type.payment_type}
                  </option>
                ))
              ) : (
                <option value="">No payment methods available</option>
              )}
            </select>
          </div>

          {/* Payment Information */}
          <div className="payment-info">
            <div className="payment-row">
              <span>Price PHP</span>
              <span>₱{calculations.grossPrice.toLocaleString()}</span>
            </div>
            <div className="payment-row">
              <span>Payment PHP</span>
              <span>₱{paymentAmount || '0'}</span>
            </div>
            <div className="payment-row change-row">
              <span>Change</span>
              <span className="change-amount">
                ₱{paymentAmount && parseFloat(paymentAmount) >= calculations.grossPrice 
                  ? (parseFloat(paymentAmount) - calculations.grossPrice).toLocaleString() 
                  : '0'}
              </span>
            </div>
          </div>

          {/* Number Pad */}
          <div className="number-pad">
            <button onClick={() => handleNumberPadClick('1')}>1</button>
            <button onClick={() => handleNumberPadClick('2')}>2</button>
            <button onClick={() => handleNumberPadClick('3')}>3</button>
            <button onClick={() => handleNumberPadClick('4')}>4</button>
            <button onClick={() => handleNumberPadClick('5')}>5</button>
            <button onClick={() => handleNumberPadClick('6')}>6</button>
            <button onClick={() => handleNumberPadClick('7')}>7</button>
            <button onClick={() => handleNumberPadClick('8')}>8</button>
            <button onClick={() => handleNumberPadClick('9')}>9</button>
            <button className="dot-btn" onClick={() => handleNumberPadClick('.')}>.</button>
            <button onClick={() => handleNumberPadClick('0')}>0</button>
            <button className="clear-btn" onClick={() => handleNumberPadClick('backspace')}>⌫</button>
          </div>

          {/* Action Buttons */}
          <div className="payment-actions">
            <button 
              className="confirm-btn"
              onClick={handleConfirmPayment}
              disabled={!paymentAmount || parseFloat(paymentAmount) < calculations.grossPrice}
            >
              Confirm Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment; 