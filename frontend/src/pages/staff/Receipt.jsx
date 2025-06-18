import React from 'react';
import './Receipt.css';

const Receipt = ({ isVisible, onClose, receiptData, loading = false }) => {
  // Debug logging
  console.log('Receipt component rendered:', { isVisible, receiptData, loading });

  if (!isVisible) {
    console.log('Receipt not visible, returning null');
    return null;
  }

  const handlePrint = () => {
    try {
      window.print();
    } catch (error) {
      console.error('Print error:', error);
      alert('Print function not available');
    }
  };

  const handleClose = () => {
    onClose();
  };

  // Format date for display
  const formatOrderDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-GB', { hour12: false });
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB', { hour12: false });
  };

  // Show loading state
  if (loading) {
    return (
      <div 
        className="receipt-modal-overlay" 
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000
        }}
      >
        <div 
          className="receipt-modal-content" 
          style={{ 
            backgroundColor: 'white', 
            padding: '40px', 
            borderRadius: '8px', 
            textAlign: 'center'
          }}
        >
          <div style={{ marginBottom: '20px' }}>Loading receipt...</div>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <button 
            onClick={handleClose} 
            style={{ 
              marginTop: '20px',
              padding: '10px 15px', 
              backgroundColor: '#dc3545', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (!receiptData) {
    console.log('No receipt data, returning null');
    return null;
  }

  try {
    // Simple receipt component without external dependencies
    return (
      <div 
        className="receipt-modal-overlay" 
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000
        }}
      >
        <div 
          className="receipt-modal-content" 
          style={{ 
            backgroundColor: 'white', 
            padding: '20px', 
            borderRadius: '8px', 
            maxWidth: '500px', 
            maxHeight: '80vh',
            overflow: 'auto',
            margin: '20px'
          }}
        >
          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginBottom: '20px',
              borderBottom: '1px solid #ccc',
              paddingBottom: '10px'
            }}
          >
            <button 
              onClick={handlePrint} 
              style={{ 
                padding: '10px 20px', 
                backgroundColor: '#28a745', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Print Receipt
            </button>
            <button 
              onClick={handleClose} 
              style={{ 
                padding: '10px 15px', 
                backgroundColor: '#dc3545', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ×
            </button>
          </div>
          
          <div style={{ backgroundColor: 'white', color: 'black', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h1 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>PHARMALAT</h1>
              <p style={{ margin: '2px 0', fontSize: '12px' }}>123 MANILA, PHILIPPINES</p>
              <p style={{ margin: '2px 0', fontSize: '12px' }}>Tel: 0800 000 000</p>
              <p style={{ margin: '2px 0', fontSize: '12px' }}>VAT No: 10000000</p>
            </div>

            <div style={{ marginBottom: '20px', borderBottom: '1px dashed #ccc', paddingBottom: '15px' }}>
              <p style={{ margin: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                <span>Invoice:</span>
                <span>{receiptData?.invoiceNumber || 'N/A'}</span>
              </p>
              <p style={{ margin: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                <span>Cashier:</span>
                <span>{receiptData?.cashier || 'Staff'}</span>
              </p>
              <p style={{ margin: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                <span>Date:</span>
                <span>{formatOrderDate(receiptData?.orderDate)}</span>
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333' }}>
                    <th style={{ textAlign: 'left', padding: '8px 0' }}>Item</th>
                    <th style={{ textAlign: 'center', padding: '8px 0' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '8px 0' }}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptData?.orderItems?.map((item, index) => (
                    <tr key={index}>
                      <td style={{ padding: '8px 0' }}>{item.drug_name || item.name}</td>
                      <td style={{ textAlign: 'center', padding: '8px 0' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right', padding: '8px 0' }}>
                        PHP {((item.base_price || item.price) * item.quantity).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ borderTop: '1px dashed #ccc', paddingTop: '15px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Subtotal:</span>
                <span>PHP {receiptData?.calculations?.subtotal?.toLocaleString() || '0'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Discount:</span>
                <span>PHP {receiptData?.calculations?.discountAmount?.toLocaleString() || '0'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>VAT (12%):</span>
                <span>PHP {((receiptData?.calculations?.grossPrice || 0) - ((receiptData?.calculations?.subtotal || 0) - (receiptData?.calculations?.discountAmount || 0))).toLocaleString()}</span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontWeight: 'bold', 
                fontSize: '16px',
                borderTop: '1px solid #333',
                paddingTop: '10px'
              }}>
                <span>Total:</span>
                <span>PHP {receiptData?.calculations?.grossPrice?.toLocaleString() || '0'}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #ccc', paddingTop: '15px', marginBottom: '20px' }}>
              <p style={{ margin: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                <span>Paid:</span>
                <span>PHP {receiptData?.paymentData?.paid?.toLocaleString() || '0'}</span>
              </p>
              <p style={{ margin: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                <span>Change:</span>
                <span>PHP {receiptData?.paymentData?.change?.toLocaleString() || '0'}</span>
              </p>
              <p style={{ margin: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                <span>Method:</span>
                <span>{receiptData?.paymentData?.paymentType || 'Cash'}</span>
              </p>
            </div>

            <div style={{ textAlign: 'center', borderTop: '1px dashed #ccc', paddingTop: '15px' }}>
              <p style={{ margin: '0', fontSize: '12px' }}>Thank you for shopping with us!</p>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error rendering Receipt component:', error);
    return (
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        backgroundColor: 'rgba(255,0,0,0.8)', 
        color: 'white', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1>Receipt Error</h1>
          <p>Error: {error.message}</p>
          <button onClick={handleClose} style={{ padding: '10px 20px', marginTop: '10px' }}>
            Close
          </button>
        </div>
      </div>
    );
  }
};

export default Receipt; 