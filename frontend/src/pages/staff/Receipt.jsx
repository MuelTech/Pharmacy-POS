import React from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import './Receipt.css';

const Receipt = ({ isVisible, onClose, receiptData, loading = false }) => {
  // Debug logging
  console.log('Receipt component rendered:', { isVisible, receiptData, loading });

  if (!isVisible) {
    console.log('Receipt not visible, returning null');
    return null;
  }

  // Format date for display
  const formatOrderDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-GB', { hour12: false });
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB', { hour12: false });
  };

  // Generate filename for PDF export
  const generateReceiptFilename = () => {
    const invoiceNumber = receiptData?.invoiceNumber || 'N/A';
    const date = receiptData?.orderDate ? new Date(receiptData.orderDate) : new Date();
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    const formattedTime = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS format
    
    return `Receipt_${invoiceNumber}_${formattedDate}_${formattedTime}`;
  };

  const handlePrint = () => {
    try {
      console.log('PDF Export started for receipt');
      console.log('Receipt data:', receiptData);
      
      // Create PDF with smaller receipt-like dimensions
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 200] // Thermal receipt width (80mm) with flexible height
      });
      
      let currentY = 10;
      
      // Add pharmacy header
      doc.setFont('courier', 'bold');
      doc.setFontSize(16);
      doc.text('PHARMALAT', 40, currentY, { align: 'center' });
      currentY += 8;
      
      // Add pharmacy details
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.text('123 MANILA, PHILIPPINES', 40, currentY, { align: 'center' });
      currentY += 4;
      doc.text('Tel: 0800 000 000', 40, currentY, { align: 'center' });
      currentY += 4;
      doc.text('VAT No: 10000000', 40, currentY, { align: 'center' });
      currentY += 6;
      
      // Add dashed line
      doc.setDrawColor(128, 128, 128); // Light gray color
      doc.setLineDashPattern([1, 1], 0);
      doc.line(5, currentY, 75, currentY);
      doc.setLineDashPattern([], 0);
      doc.setDrawColor(0, 0, 0); // Reset to black
      currentY += 6;
      
      // Add transaction info
      doc.setFontSize(8);
      doc.text(`Invoice: ${receiptData?.invoiceNumber || 'N/A'}`, 5, currentY);
      currentY += 4;
      doc.text(`Cashier: ${receiptData?.cashier || 'Staff'}`, 5, currentY);
      currentY += 4;
      doc.text(`Date: ${formatOrderDate(receiptData?.orderDate)}`, 5, currentY);
      currentY += 6;
      
      // Add dashed line
      doc.setDrawColor(128, 128, 128); // Light gray color
      doc.setLineDashPattern([1, 1], 0);
      doc.line(5, currentY, 75, currentY);
      doc.setLineDashPattern([], 0);
      doc.setDrawColor(0, 0, 0); // Reset to black
      currentY += 6;
      
      // Add items header
      doc.setFont('courier', 'bold');
      doc.text('ITEM', 5, currentY);
      doc.text('QTY', 50, currentY, { align: 'center' });
      doc.text('PRICE', 75, currentY, { align: 'right' });
      currentY += 4;
      
      // Add line under header
      doc.setDrawColor(128, 128, 128); // Light gray color
      doc.line(5, currentY, 75, currentY);
      doc.setDrawColor(0, 0, 0); // Reset to black
      currentY += 4;
      
      // Add items
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      
      receiptData?.orderItems?.forEach(item => {
        const itemName = item.drug_name || item.name || 'Unknown Item';
        const quantity = item.quantity || 0;
        const price = ((item.base_price || item.price || 0) * quantity);
        
        // Handle long item names by wrapping
        const maxWidth = 40;
        const splitText = doc.splitTextToSize(itemName, maxWidth);
        
        // Print item name (possibly multiline)
        doc.text(splitText, 5, currentY);
        const itemHeight = splitText.length * 3;
        
        // Print quantity and price on the last line of the item
        const itemEndY = currentY + itemHeight - 3;
        doc.text(quantity.toString(), 50, itemEndY, { align: 'center' });
        doc.text(`PHP ${price.toLocaleString()}`, 75, itemEndY, { align: 'right' });
        
        currentY += itemHeight + 2;
      });
      
      currentY += 2;
      
      // Add dashed line before totals
      doc.setDrawColor(128, 128, 128); // Light gray color
      doc.setLineDashPattern([1, 1], 0);
      doc.line(5, currentY, 75, currentY);
      doc.setLineDashPattern([], 0);
      doc.setDrawColor(0, 0, 0); // Reset to black
      currentY += 6;
      
      // Add totals
      const subtotal = receiptData?.calculations?.subtotal || 0;
      const discount = receiptData?.calculations?.discountAmount || 0;
      const grossPrice = receiptData?.calculations?.grossPrice || 0;
      const vat = grossPrice - (subtotal - discount);
      
      doc.setFontSize(8);
      doc.text('Subtotal:', 5, currentY);
      doc.text(`PHP ${subtotal.toLocaleString()}`, 75, currentY, { align: 'right' });
      currentY += 4;
      
      if (discount > 0) {
        doc.text('Discount:', 5, currentY);
        doc.text(`PHP ${discount.toLocaleString()}`, 75, currentY, { align: 'right' });
        currentY += 4;
      }
      
      doc.text('VAT (12%):', 5, currentY);
      doc.text(`PHP ${vat.toLocaleString()}`, 75, currentY, { align: 'right' });
      currentY += 4;
      
      // Add line before total
      doc.setDrawColor(128, 128, 128); // Light gray color
      doc.line(5, currentY, 75, currentY);
      doc.setDrawColor(0, 0, 0); // Reset to black
      currentY += 4;
      
      // Add total
      doc.setFont('courier', 'bold');
      doc.setFontSize(10);
      doc.text('TOTAL:', 5, currentY);
      doc.text(`PHP ${grossPrice.toLocaleString()}`, 75, currentY, { align: 'right' });
      currentY += 8;
      
      // Add dashed line
      doc.setDrawColor(128, 128, 128); // Light gray color
      doc.setLineDashPattern([1, 1], 0);
      doc.line(5, currentY, 75, currentY);
      doc.setLineDashPattern([], 0);
      doc.setDrawColor(0, 0, 0); // Reset to black
      currentY += 6;
      
      // Add payment info
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.text('PAYMENT DETAILS:', 5, currentY);
      currentY += 5;
      
      doc.text('Paid:', 5, currentY);
      doc.text(`PHP ${(receiptData?.paymentData?.paid || 0).toLocaleString()}`, 75, currentY, { align: 'right' });
      currentY += 4;
      
      doc.text('Change:', 5, currentY);
      doc.text(`PHP ${(receiptData?.paymentData?.change || 0).toLocaleString()}`, 75, currentY, { align: 'right' });
      currentY += 4;
      
      doc.text('Method:', 5, currentY);
      doc.text(`${receiptData?.paymentData?.paymentType || 'Cash'}`, 75, currentY, { align: 'right' });
      currentY += 8;
      
      // Add final dashed line
      doc.setDrawColor(128, 128, 128); // Light gray color
      doc.setLineDashPattern([1, 1], 0);
      doc.line(5, currentY, 75, currentY);
      doc.setLineDashPattern([], 0);
      doc.setDrawColor(0, 0, 0); // Reset to black
      currentY += 6;
      
      // Add footer
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.text('Thank you for shopping!', 40, currentY, { align: 'center' });
      currentY += 4;
      doc.text('Please come again!', 40, currentY, { align: 'center' });
      
      console.log('PDF generated successfully');
      
      // Save the PDF with custom filename
      const fileName = `${generateReceiptFilename()}.pdf`;
      doc.save(fileName);
      
      console.log('Receipt PDF export completed successfully');
    } catch (error) {
      console.error('Print/PDF error:', error);
      alert('Error generating PDF: ' + error.message);
    }
  };

  const handleClose = () => {
    onClose();
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