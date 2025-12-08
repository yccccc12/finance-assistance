'use client';

import PropTypes from 'prop-types';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

const BillSplitPrompt = ({ receiptData, onDismiss }) => {
  if (!receiptData || receiptData?.items?.length < 2) {
    return null;
  }

  return (
    <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          <Icon name="UserGroupIcon" size={24} variant="solid" className="text-accent" />
        </div>

        <div className="flex-1">
          <h4 className="text-base font-semibold text-foreground mb-1">
            Split this bill with others?
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            This receipt has {receiptData?.items?.length} items. You can split the bill with friends and assign items to different people.
          </p>

          <div className="flex items-center space-x-3">
            <Link
              href={{
                pathname: '/bill-splitting-interface',
                query: {
                  storeName: receiptData?.storeName,
                  totalAmount: receiptData?.totalAmount,
                  date: receiptData?.date,
                  tax: receiptData?.tax || '',
                  subtotal: receiptData?.subtotal || '',
                  currency: receiptData?.currency || 'USD',
                  items: JSON.stringify(receiptData?.items)
                }
              }}
              className="px-4 py-2 bg-accent text-accent-foreground rounded-md font-medium hover:bg-accent/90 transition-quick flex items-center space-x-2"
            >
              <Icon name="CalculatorIcon" size={18} variant="solid" />
              <span>Split Bill</span>
            </Link>

            <button
              onClick={onDismiss}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-quick"
            >
              Not now
            </button>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground transition-quick"
        >
          <Icon name="XMarkIcon" size={20} variant="outline" />
        </button>
      </div>
    </div>
  );
};

BillSplitPrompt.propTypes = {
  receiptData: PropTypes?.shape({
    storeName: PropTypes?.string,
    totalAmount: PropTypes?.string,
    date: PropTypes?.string,
    tax: PropTypes?.oneOfType([PropTypes?.string, PropTypes?.number]),
    subtotal: PropTypes?.oneOfType([PropTypes?.string, PropTypes?.number]),
    items: PropTypes?.arrayOf(
      PropTypes?.shape({
        name: PropTypes?.string,
        price: PropTypes?.string
      })
    )
  }),
  onDismiss: PropTypes?.func?.isRequired
};

export default BillSplitPrompt;