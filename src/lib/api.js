/**
 * API client for backend services
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Upload and process a receipt image using the backend OCR service
 * @param {File} file - The receipt image file to process
 * @returns {Promise<Object>} - The processed receipt data
 */
export async function processReceipt(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/receipt/process`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error processing receipt:', error);
    throw error;
  }
}

/**
 * Check the health status of the backend API
 * @returns {Promise<Object>} - Health check response
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking health:', error);
    throw error;
  }
}

/**
 * Convert backend response format to frontend format
 * @param {Object} backendData - Data from backend API
 * @returns {Object} - Formatted data for frontend
 */
export function formatReceiptData(backendData) {
  if (!backendData || !backendData.data) {
    return null;
  }

  const { data } = backendData;

  // Helper function to format number fields
  const formatNumber = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? '' : num.toFixed(2);
  };

  return {
    storeName: data.storeName || data.store_name || 'Unknown Store',
    totalAmount: data.totalAmount?.toString() || data.total_amount?.toString() || '0.00',
    subtotal: formatNumber(data.subtotal),
    tax: formatNumber(data.tax),
    date: data.date || new Date().toISOString().split('T')[0],
    time: data.time,
    currency: data.currency || 'USD',
    paymentMethod: data.paymentMethod || data.payment_method,
    address: data.address,
    phone: data.phone,
    confidence: data.confidence,
    items: (data.items || []).map(item => ({
      name: item.name,
      price: item.price?.toString() || '0.00',
      quantity: item.quantity || 1,
      category: item.category
    }))
  };
}

