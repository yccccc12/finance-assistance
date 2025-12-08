'use client';

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Icon from '@/components/ui/AppIcon';

const TaxTipControls = ({ onUpdate, initialTaxPercent, currency = 'RM' }) => {
  const [taxPercent, setTaxPercent] = useState(initialTaxPercent || 0);

  // Update tax when initialTaxPercent changes
  useEffect(() => {
    if (initialTaxPercent !== undefined && initialTaxPercent !== taxPercent) {
      setTaxPercent(initialTaxPercent);
      onUpdate({ taxPercent: initialTaxPercent });
    }
  }, [initialTaxPercent]);

  const handleChange = (value) => {
    setTaxPercent(value);
    onUpdate({ taxPercent: value });
  };

  const commonRates = [6, 10, 16];

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-base font-semibold text-foreground flex items-center mb-3">
        <Icon name="ReceiptPercentIcon" size={18} variant="outline" className="mr-2" />
        Tax Rate
      </h3>
      <div>
        <label htmlFor="tax" className="block text-sm font-medium text-foreground mb-2">
          Tax Percentage (%)
        </label>
        
        {/* Quick preset buttons */}
        <div className="flex gap-2 mb-2">
          {commonRates.map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => handleChange(rate)}
              className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-quick ${
                taxPercent === rate
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-primary/20'
              }`}
            >
              {rate}%
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="number"
            id="tax"
            value={taxPercent}
            onChange={(e) => handleChange(parseFloat(e?.target?.value) || 0)}
            min="0"
            max="100"
            step="0.1"
            placeholder="0"
            className="w-full px-3 py-2 pr-8 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Tax applied to each participant's items
        </p>
      </div>
    </div>
  );
};

TaxTipControls.propTypes = {
  onUpdate: PropTypes?.func?.isRequired,
  initialTaxPercent: PropTypes?.number,
  currency: PropTypes?.string
};

export default TaxTipControls;