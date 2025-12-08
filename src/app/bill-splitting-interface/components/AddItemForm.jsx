'use client';

import { useState } from 'react';
import PropTypes from 'prop-types';
import Icon from '@/components/ui/AppIcon';

const AddItemForm = ({ onAdd, currency = 'RM' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    quantity: 1,
    unitPrice: ''
  });

  const handleChange = (e) => {
    const value = e?.target?.type === 'number' ? parseFloat(e?.target?.value) || 0 : e?.target?.value;
    setFormData(prev => ({
      ...prev,
      [e?.target?.name]: value
    }));
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (formData?.name?.trim() && formData?.unitPrice > 0) {
      onAdd({
        name: formData?.name,
        quantity: formData?.quantity,
        unitPrice: formData?.unitPrice
      });
      setFormData({ name: '', quantity: 1, unitPrice: '' });
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-quick"
      >
        <Icon name="PlusCircleIcon" size={20} variant="solid" />
        <span>Add Item</span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-muted rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-foreground">New Item</h4>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-background rounded-md transition-quick"
        >
          <Icon name="XMarkIcon" size={18} variant="outline" />
        </button>
      </div>
      <div>
        <label htmlFor="itemName" className="block text-sm font-medium text-foreground mb-1">
          Item Name
        </label>
        <input
          type="text"
          id="itemName"
          name="name"
          value={formData?.name}
          onChange={handleChange}
          placeholder="e.g., Caesar Salad"
          className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-foreground mb-1">
            Quantity
          </label>
          <input
            type="number"
            id="quantity"
            name="quantity"
            value={formData?.quantity}
            onChange={handleChange}
            min="1"
            className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
        </div>

        <div>
          <label htmlFor="unitPrice" className="block text-sm font-medium text-foreground mb-1">
            Price ({currency})
          </label>
          <input
            type="number"
            id="unitPrice"
            name="unitPrice"
            value={formData?.unitPrice}
            onChange={handleChange}
            min="0.01"
            step="0.01"
            placeholder="0.00"
            className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
        </div>
      </div>
      <button
        type="submit"
        className="w-full px-4 py-2 bg-accent text-accent-foreground rounded-md font-medium hover:bg-accent/90 transition-quick"
      >
        Add Item
      </button>
    </form>
  );
};

AddItemForm.propTypes = {
  onAdd: PropTypes?.func?.isRequired,
  currency: PropTypes?.string
};

export default AddItemForm;