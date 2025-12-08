'use client';

import { useState } from 'react';
import PropTypes from 'prop-types';
import Icon from '@/components/ui/AppIcon';

const AddParticipantForm = ({ onAdd }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact: ''
  });

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e?.target?.name]: e?.target?.value
    }));
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (formData?.name?.trim() && formData?.contact?.trim()) {
      onAdd(formData);
      setFormData({ name: '', contact: '' });
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-quick"
      >
        <Icon name="PlusIcon" size={20} variant="solid" />
        <span>Add Participant</span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-muted rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-foreground">New Participant</h4>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-background rounded-md transition-quick"
        >
          <Icon name="XMarkIcon" size={18} variant="outline" />
        </button>
      </div>
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
          Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData?.name}
          onChange={handleChange}
          placeholder="Enter name"
          className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          required
        />
      </div>
      <div>
        <label htmlFor="contact" className="block text-sm font-medium text-foreground mb-1">
          Contact (Phone/WhatsApp)
        </label>
        <input
          type="tel"
          id="contact"
          name="contact"
          value={formData?.contact}
          onChange={handleChange}
          placeholder="e.g., +60123456789"
          className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          required
        />
      </div>
      <button
        type="submit"
        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-quick"
      >
        Add Participant
      </button>
    </form>
  );
};

AddParticipantForm.propTypes = {
  onAdd: PropTypes?.func?.isRequired
};

export default AddParticipantForm;