import PropTypes from 'prop-types';
import Icon from '@/components/ui/AppIcon';

const ParticipantCard = ({ participant, totalAmount, itemCount, onRemove, currency = 'RM' }) => {
  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-smooth">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Icon name="UserIcon" size={20} variant="solid" className="text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{participant?.name}</h4>
            <p className="text-sm text-muted-foreground flex items-center">
              <Icon name="PhoneIcon" size={14} variant="outline" className="mr-1" />
              {participant?.contact}
            </p>
          </div>
        </div>
        <button
          onClick={() => onRemove(participant?.id)}
          className="p-1 hover:bg-destructive/10 rounded-md transition-quick"
          aria-label="Remove participant"
        >
          <Icon name="XMarkIcon" size={18} variant="outline" className="text-destructive" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Items</p>
          <p className="text-lg font-bold text-foreground">{itemCount}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
          <p className="text-lg font-bold text-primary">{currency}{totalAmount?.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
};

ParticipantCard.propTypes = {
  participant: PropTypes?.shape({
    id: PropTypes?.string?.isRequired,
    name: PropTypes?.string?.isRequired,
    contact: PropTypes?.string?.isRequired
  })?.isRequired,
  totalAmount: PropTypes?.number?.isRequired,
  itemCount: PropTypes?.number?.isRequired,
  onRemove: PropTypes?.func?.isRequired,
  currency: PropTypes?.string
};

export default ParticipantCard;