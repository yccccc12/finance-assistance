import PropTypes from 'prop-types';
import Icon from '@/components/ui/AppIcon';

const ReceiptItemCard = ({ item, participants, onToggleParticipant, onRemoveItem, currency = 'RM' }) => {
  const assignedCount = item?.assignedTo?.length || 0;
  const isShared = assignedCount > 1;

  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-smooth">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-foreground text-base">{item?.name}</h4>
          <p className="text-sm text-muted-foreground mt-1">
            Qty: {item?.quantity} × {currency}{item?.unitPrice?.toFixed(2)}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-lg font-bold text-foreground">
            {currency}{item?.totalPrice?.toFixed(2)}
          </span>
          <button
            onClick={() => onRemoveItem(item?.id)}
            className="p-1 hover:bg-destructive/10 rounded-md transition-quick"
            aria-label="Remove item"
          >
            <Icon name="TrashIcon" size={18} variant="outline" className="text-destructive" />
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Assigned to:</span>
          {isShared && (
            <span className="px-2 py-1 bg-accent/10 text-accent text-xs font-medium rounded-md">
              Shared
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {participants?.map((participant) => {
            const isAssigned = item?.assignedTo?.includes(participant?.id);
            return (
              <button
                key={participant?.id}
                onClick={() => onToggleParticipant(item?.id, participant?.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-quick ${
                  isAssigned
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {participant?.name}
              </button>
            );
          })}
        </div>

        {assignedCount === 0 && (
          <p className="text-xs text-warning mt-2 flex items-center">
            <Icon name="ExclamationTriangleIcon" size={14} variant="solid" className="mr-1" />
            Not assigned to anyone
          </p>
        )}
      </div>
    </div>
  );
};

ReceiptItemCard.propTypes = {
  item: PropTypes?.shape({
    id: PropTypes?.string?.isRequired,
    name: PropTypes?.string?.isRequired,
    quantity: PropTypes?.number?.isRequired,
    unitPrice: PropTypes?.number?.isRequired,
    totalPrice: PropTypes?.number?.isRequired,
    assignedTo: PropTypes?.arrayOf(PropTypes?.string)
  })?.isRequired,
  participants: PropTypes?.arrayOf(
    PropTypes?.shape({
      id: PropTypes?.string?.isRequired,
      name: PropTypes?.string?.isRequired
    })
  )?.isRequired,
  onToggleParticipant: PropTypes?.func?.isRequired,
  onRemoveItem: PropTypes?.func?.isRequired,
  currency: PropTypes?.string
};

export default ReceiptItemCard;