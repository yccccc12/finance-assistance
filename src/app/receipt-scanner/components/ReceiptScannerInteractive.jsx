'use client';

import { useState } from 'react';
import PropTypes from 'prop-types';
import { useRouter } from 'next/navigation';
import UploadZone from './UploadZone';
import ProcessingIndicator from './ProcessingIndicator';
import ReceiptPreview from './ReceiptPreview';
import ExtractedDataForm from './ExtractedDataForm';
import BillSplitPrompt from './BillSplitPrompt';
import RecentReceipts from './RecentReceipts';
import { processReceipt, formatReceiptData } from '@/lib/api';

const ReceiptScannerInteractive = ({ initialReceipts }) => {
  const router = useRouter();
  const [processingStatus, setProcessingStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [showBillSplit, setShowBillSplit] = useState(false);
  const [error, setError] = useState(null);

  const processReceiptWithOCR = async (file) => {
    setProcessingStatus('uploading');
    setProgress(0);
    setError(null);

    try {
      // Update progress - uploading
      setProgress(20);
      setProcessingStatus('processing');

      // Call backend API
      const response = await processReceipt(file);

      // Update progress - processing
      setProgress(60);
      setProcessingStatus('extracting');

      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update progress - complete
      setProgress(100);
      setProcessingStatus('complete');

      // Format and set the extracted data
      const formattedData = formatReceiptData(response);
      
      if (formattedData) {
        setExtractedData(formattedData);
        setShowBillSplit(true);
      } else {
        throw new Error('Failed to extract receipt data');
      }

    } catch (err) {
      console.error('OCR processing error:', err);
      setProcessingStatus('error');
      setError(err.message || 'Failed to process receipt. Please try again.');
      
      // Show error for a moment then reset
      setTimeout(() => {
        handleReset();
      }, 3000);
    }
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setReceiptUrl(url);
    processReceiptWithOCR(file);
  };

  const handleSaveReceipt = (formData) => {
    console.log('Saving receipt data:', formData);
    alert(`Receipt saved successfully!\n\nStore: ${formData?.storeName}\nTotal: $${formData?.totalAmount}\nDate: ${formData?.date}\nItems: ${formData?.items?.length}`);
    
    handleReset();
  };

  const handleCancel = () => {
    handleReset();
  };

  const handleReset = () => {
    setProcessingStatus('idle');
    setProgress(0);
    setSelectedFile(null);
    setReceiptUrl('');
    setExtractedData(null);
    setShowBillSplit(false);
  };

  const handleDismissBillSplit = () => {
    setShowBillSplit(false);
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && processingStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Processing Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <p className="mt-2 text-xs text-red-600">
                Make sure the backend server is running and properly configured.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload or Processing Section */}
      {processingStatus === 'idle' && (
        <UploadZone onFileSelect={handleFileSelect} isProcessing={false} />
      )}

      {processingStatus !== 'idle' && processingStatus !== 'complete' && processingStatus !== 'error' && (
        <ProcessingIndicator status={processingStatus} progress={progress} />
      )}

      {/* Receipt Preview and Extracted Data */}
      {processingStatus === 'complete' && extractedData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <ReceiptPreview receiptUrl={receiptUrl} fileName={selectedFile?.name} />
          </div>

          <div className="space-y-4">
            {showBillSplit && (
              <BillSplitPrompt
                receiptData={extractedData}
                onDismiss={handleDismissBillSplit}
              />
            )}
            
            <ExtractedDataForm
              extractedData={extractedData}
              onSave={handleSaveReceipt}
              onCancel={handleCancel}
            />
          </div>
        </div>
      )}

      {/* Recent Receipts */}
      {processingStatus === 'idle' && (
        <RecentReceipts receipts={initialReceipts} />
      )}
    </div>
  );
};

ReceiptScannerInteractive.propTypes = {
  initialReceipts: PropTypes?.arrayOf(
    PropTypes?.shape({
      id: PropTypes?.number?.isRequired,
      storeName: PropTypes?.string?.isRequired,
      totalAmount: PropTypes?.string?.isRequired,
      date: PropTypes?.string?.isRequired,
      imageUrl: PropTypes?.string?.isRequired,
      itemCount: PropTypes?.number?.isRequired,
      isSplit: PropTypes?.bool
    })
  )
};

export default ReceiptScannerInteractive;