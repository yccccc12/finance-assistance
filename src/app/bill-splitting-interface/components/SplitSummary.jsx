import PropTypes from 'prop-types';
import Icon from '@/components/ui/AppIcon';

const SplitSummary = ({ subtotal, taxPercent, taxAmount, total, currency = '$' }) => {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
        <Icon name="CalculatorIcon" size={20} variant="outline" className="mr-2" />
        Bill Summary
      </h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium text-foreground">{currency}{subtotal?.toFixed(2)}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Tax ({taxPercent}%)</span>
          <span className="font-medium text-foreground">{currency}{taxAmount?.toFixed(2)}</span>
        </div>

        <div className="border-t border-border pt-3 mt-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">Total</span>
            <span className="text-2xl font-bold text-primary">{currency}{total?.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-muted rounded-md p-3 mt-4">
          <p className="text-xs text-muted-foreground">Each participant pays {taxPercent}% tax on their assigned items</p>
        </div>
      </div>
    </div>
  );
};

SplitSummary.propTypes = {
  subtotal: PropTypes?.number?.isRequired,
  taxPercent: PropTypes?.number?.isRequired,
  taxAmount: PropTypes?.number?.isRequired,
  total: PropTypes?.number?.isRequired,
  currency: PropTypes?.string
};

export default SplitSummary;