'use client';

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Icon from '@/components/ui/AppIcon';

const ExtractedDataForm = ({ extractedData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    storeName: '',
    totalAmount: '',
    subtotal: '',
    tax: '',
    date: '',
    currency: 'USD',
    items: []
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (extractedData) {
      setFormData({
        storeName: extractedData?.storeName || '',
        totalAmount: extractedData?.totalAmount || '',
        subtotal: extractedData?.subtotal || '',
        tax: extractedData?.tax || '',
        date: extractedData?.date || '',
        currency: extractedData?.currency || 'USD',
        items: extractedData?.items || []
      });
    }
  }, [extractedData]);

  const handleInputChange = (e) => {
    const { name, value } = e?.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors?.[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData?.items];
    updatedItems[index] = {
      ...updatedItems?.[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev?.items, { name: '', price: '' }]
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev?.items?.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData?.storeName?.trim()) {
      newErrors.storeName = 'Store name is required';
    }

    if (!formData?.totalAmount || parseFloat(formData?.totalAmount) <= 0) {
      newErrors.totalAmount = 'Valid total amount is required';
    }

    if (!formData?.date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    
    if (validateForm()) {
      onSave(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Extracted Receipt Data</h3>
        <div className="flex items-center space-x-3">
          {formData?.currency && formData?.currency !== 'USD' && (
            <div className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded">
              Currency: {formData?.currency}
            </div>
          )}
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Icon name="PencilIcon" size={16} variant="outline" />
            <span>Edit to correct any errors</span>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        {/* Store Name */}
        <div>
          <label htmlFor="storeName" className="block text-sm font-medium text-foreground mb-1">
            Store Name *
          </label>
          <input
            type="text"
            id="storeName"
            name="storeName"
            value={formData?.storeName}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-quick ${
              errors?.storeName ? 'border-error' : 'border-input'
            }`}
            placeholder="Enter store name"
          />
          {errors?.storeName && (
            <p className="text-xs text-error mt-1">{errors?.storeName}</p>
          )}
        </div>

        {/* Total Amount */}
        <div>
          <label htmlFor="totalAmount" className="block text-sm font-medium text-foreground mb-1">
            Total Amount *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <input
              type="number"
              id="totalAmount"
              name="totalAmount"
              value={formData?.totalAmount}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              className={`w-full pl-8 pr-4 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-quick ${
                errors?.totalAmount ? 'border-error' : 'border-input'
              }`}
              placeholder="0.00"
            />
          </div>
          {errors?.totalAmount && (
            <p className="text-xs text-error mt-1">{errors?.totalAmount}</p>
          )}
        </div>

        {/* Amount Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          {/* Subtotal */}
          <div>
            <label htmlFor="subtotal" className="block text-sm font-medium text-foreground mb-1">
              Subtotal
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input
                type="number"
                id="subtotal"
                name="subtotal"
                value={formData?.subtotal}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="w-full pl-8 pr-2 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-quick text-sm"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Tax */}
          <div>
            <label htmlFor="tax" className="block text-sm font-medium text-foreground mb-1">
              Tax
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input
                type="number"
                id="tax"
                name="tax"
                value={formData?.tax}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="w-full pl-8 pr-2 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-quick text-sm"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Date */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-foreground mb-1">
            Date *
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData?.date}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-quick ${
              errors?.date ? 'border-error' : 'border-input'
            }`}
          />
          {errors?.date && (
            <p className="text-xs text-error mt-1">{errors?.date}</p>
          )}
        </div>

        {/* Items List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-foreground">
              Items ({formData?.items?.length})
            </label>
            <button
              type="button"
              onClick={handleAddItem}
              className="text-xs text-primary hover:text-primary/80 font-medium transition-quick flex items-center space-x-1"
            >
              <Icon name="PlusCircleIcon" size={16} variant="solid" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {formData?.items?.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No items extracted. Click "Add Item" to add manually.
              </div>
            ) : (
              formData?.items?.map((item, index) => (
                <div key={index} className="flex items-center space-x-2 bg-muted/30 p-3 rounded-md">
                  <input
                    type="text"
                    value={item?.name}
                    onChange={(e) => handleItemChange(index, 'name', e?.target?.value)}
                    placeholder="Item name"
                    className="flex-1 px-3 py-1.5 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="relative w-28">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <input
                      type="number"
                      value={item?.price}
                      onChange={(e) => handleItemChange(index, 'price', e?.target?.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full pl-6 pr-2 py-1.5 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="p-1.5 text-error hover:bg-error/10 rounded-md transition-quick"
                  >
                    <Icon name="TrashIcon" size={16} variant="outline" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-input rounded-md text-foreground hover:bg-muted transition-quick"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-quick flex items-center space-x-2"
        >
          <Icon name="CheckIcon" size={20} variant="solid" />
          <span>Save Receipt</span>
        </button>
      </div>
    </form>
  );
};

ExtractedDataForm.propTypes = {
  extractedData: PropTypes?.shape({
    storeName: PropTypes?.string,
    totalAmount: PropTypes?.string,
    subtotal: PropTypes?.oneOfType([PropTypes?.string, PropTypes?.number]),
    tax: PropTypes?.oneOfType([PropTypes?.string, PropTypes?.number]),
    date: PropTypes?.string,
    currency: PropTypes?.string,
    items: PropTypes?.arrayOf(
      PropTypes?.shape({
        name: PropTypes?.string,
        price: PropTypes?.string
      })
    )
  }),
  onSave: PropTypes?.func?.isRequired,
  onCancel: PropTypes?.func?.isRequired
};

export default ExtractedDataForm;