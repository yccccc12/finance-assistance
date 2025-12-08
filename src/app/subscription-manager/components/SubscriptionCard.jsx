'use client';

import { useState } from 'react';
import PropTypes from 'prop-types';
import Icon from '@/components/ui/AppIcon';

const SubscriptionCard = ({ subscription, onEdit, onCancel }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getDaysUntilRenewal = () => {
    const today = new Date();
    const renewalDate = new Date(subscription.nextPaymentDate);
    const diffTime = renewalDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilRenewal = getDaysUntilRenewal();
  const isUpcoming = daysUntilRenewal <= 7 && daysUntilRenewal >= 0;
  const isOverdue = daysUntilRenewal < 0;

  const getStatusColor = () => {
    if (isOverdue) return 'text-error';
    if (isUpcoming) return 'text-warning';
    return 'text-success';
  };

  const getStatusBgColor = () => {
    if (isOverdue) return 'bg-error/10 border-error/20';
    if (isUpcoming) return 'bg-warning/10 border-warning/20';
    return 'bg-success/10 border-success/20';
  };

  const getStatusText = () => {
    if (isOverdue) return 'Overdue';
    if (isUpcoming) return `Due in ${daysUntilRenewal} days`;
    return 'Active';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    })?.format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className={`bg-card border rounded-lg p-4 transition-smooth hover:shadow-md ${getStatusBgColor()}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${subscription?.color}`}>
            <Icon name={subscription?.icon} size={24} variant="solid" className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground truncate">
              {subscription?.serviceName}
            </h3>
            <p className="text-sm text-muted-foreground">{subscription?.category}</p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-muted rounded transition-quick"
          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
        >
          <Icon
            name={isExpanded ? 'ChevronUpIcon' : 'ChevronDownIcon'}
            size={20}
            variant="outline"
            className="text-muted-foreground"
          />
        </button>
      </div>
      {/* Cost and Frequency */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(subscription?.cost)}
          </p>
          <p className="text-sm text-muted-foreground">per {subscription?.billingFrequency}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()} ${getStatusBgColor()}`}>
          {getStatusText()}
        </div>
      </div>
      {/* Next Payment */}
      <div className="flex items-center space-x-2 mb-4 text-sm">
        <Icon name="CalendarIcon" size={16} variant="outline" className="text-muted-foreground" />
        <span className="text-muted-foreground">Next payment:</span>
        <span className="font-medium text-foreground">{formatDate(subscription?.nextPaymentDate)}</span>
      </div>
      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-border pt-4 mt-4 space-y-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Started</p>
              <p className="font-medium text-foreground">{formatDate(subscription?.startDate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Annual Cost</p>
              <p className="font-medium text-foreground">
                {formatCurrency(subscription?.annualCost)}
              </p>
            </div>
          </div>

          {subscription?.description && (
            <div>
              <p className="text-muted-foreground text-sm mb-1">Description</p>
              <p className="text-sm text-foreground">{subscription?.description}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={() => onEdit(subscription)}
              className="flex items-center space-x-2 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-quick"
            >
              <Icon name="PencilIcon" size={16} variant="solid" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => onCancel(subscription)}
              className="flex items-center space-x-2 px-3 py-2 bg-destructive text-destructive-foreground rounded-md text-sm font-medium hover:bg-destructive/90 transition-quick"
            >
              <Icon name="XMarkIcon" size={16} variant="solid" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

SubscriptionCard.propTypes = {
  subscription: PropTypes?.shape({
    id: PropTypes?.string?.isRequired,
    serviceName: PropTypes?.string?.isRequired,
    cost: PropTypes?.number?.isRequired,
    billingFrequency: PropTypes?.string?.isRequired,
    nextPaymentDate: PropTypes?.string?.isRequired,
    startDate: PropTypes?.string?.isRequired,
    category: PropTypes?.string?.isRequired,
    icon: PropTypes?.string?.isRequired,
    color: PropTypes?.string?.isRequired,
    annualCost: PropTypes?.number?.isRequired,
    description: PropTypes?.string
  })?.isRequired,
  onEdit: PropTypes?.func?.isRequired,
  onCancel: PropTypes?.func?.isRequired
};

export default SubscriptionCard;