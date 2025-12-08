'use client';

import { useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import Icon from '@/components/ui/AppIcon';
import SubscriptionCard from './SubscriptionCard';
import SubscriptionSummary from './SubscriptionSummary';
import RenewalAlerts from './RenewalAlerts';
import SavingsRecommendations from './SavingsRecommendations';
import AddSubscriptionModal from './AddSubscriptionModal';
import EditSubscriptionModal from './EditSubscriptionModal';
import { 
  getAllSubscriptions, 
  createSubscription, 
  updateSubscription, 
  deleteSubscription 
} from '@/services/transactionApi';

const SubscriptionManagerInteractive = ({ initialData }) => {
  const [subscriptions, setSubscriptions] = useState(initialData?.subscriptions || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [cancelConfirmId, setCancelConfirmId] = useState(null);
  const [subscriptionToCancel, setSubscriptionToCancel] = useState(null);
  const [sortBy, setSortBy] = useState('nextPayment');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Load subscriptions from backend on mount
  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllSubscriptions();
      // Add icon and color mapping
      const subscriptionsWithIcons = data.map(sub => {
        const iconMap = {
          'Entertainment': 'FilmIcon',
          'Productivity': 'BriefcaseIcon',
          'Health & Fitness': 'HeartIcon',
          'Education': 'AcademicCapIcon',
          'Shopping': 'ShoppingBagIcon',
          'Utilities': 'BoltIcon',
          'Other': 'EllipsisHorizontalCircleIcon'
        };

        const colorMap = {
          'Entertainment': 'bg-red-500',
          'Productivity': 'bg-blue-500',
          'Health & Fitness': 'bg-green-500',
          'Education': 'bg-purple-500',
          'Shopping': 'bg-pink-500',
          'Utilities': 'bg-yellow-500',
          'Other': 'bg-gray-500'
        };

        return {
          ...sub,
          icon: iconMap[sub.category] || 'EllipsisHorizontalCircleIcon',
          color: colorMap[sub.category] || 'bg-gray-500',
        };
      });
      setSubscriptions(subscriptionsWithIcons);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      setError('Failed to load subscriptions. Please check your connection.');
      // Fallback to initialData if available
      if (initialData?.subscriptions) {
        setSubscriptions(initialData.subscriptions);
      }
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', 'Entertainment', 'Productivity', 'Health & Fitness', 'Education', 'Shopping', 'Utilities', 'Other'];

  const sortOptions = [
    { value: 'nextPayment', label: 'Next Payment' },
    { value: 'cost', label: 'Cost (High to Low)' },
    { value: 'name', label: 'Name (A-Z)' }
  ];

  const filteredAndSortedSubscriptions = useMemo(() => {
    let filtered = subscriptions;

    if (filterCategory !== 'all') {
      filtered = filtered?.filter(sub => sub?.category === filterCategory);
    }

    if (searchQuery?.trim()) {
      filtered = filtered?.filter(sub =>
        sub?.serviceName?.toLowerCase()?.includes(searchQuery?.toLowerCase())
      );
    }

    const sorted = [...filtered]?.sort((a, b) => {
      if (sortBy === 'nextPayment') {
        return new Date(a.nextPaymentDate) - new Date(b.nextPaymentDate);
      } else if (sortBy === 'cost') {
        return b?.cost - a?.cost;
      } else {
        return a?.serviceName?.localeCompare(b?.serviceName);
      }
    });

    return sorted;
  }, [subscriptions, sortBy, filterCategory, searchQuery]);

  const upcomingRenewals = useMemo(() => {
    const today = new Date();
    return subscriptions?.filter(sub => {
      const renewalDate = new Date(sub.nextPaymentDate);
      const diffTime = renewalDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7 && diffDays >= 0;
    });
  }, [subscriptions]);

  const summary = useMemo(() => {
    const totalMonthlyCost = subscriptions?.reduce((sum, sub) => {
      if (sub?.billingFrequency === 'monthly') return sum + sub?.cost;
      if (sub?.billingFrequency === 'quarterly') return sum + (sub?.cost / 3);
      if (sub?.billingFrequency === 'yearly') return sum + (sub?.cost / 12);
      return sum;
    }, 0);

    return {
      totalMonthlyCost,
      annualProjection: totalMonthlyCost * 12,
      activeCount: subscriptions?.length,
      upcomingRenewals: upcomingRenewals?.length,
      monthlyChange: 5.2
    };
  }, [subscriptions, upcomingRenewals]);

  const handleAddSubscription = async (newSub) => {
    try {
      setError(null);
      const createdSub = await createSubscription(newSub);
      
      const iconMap = {
        'Entertainment': 'FilmIcon',
        'Productivity': 'BriefcaseIcon',
        'Health & Fitness': 'HeartIcon',
        'Education': 'AcademicCapIcon',
        'Shopping': 'ShoppingBagIcon',
        'Utilities': 'BoltIcon',
        'Other': 'EllipsisHorizontalCircleIcon'
      };

      const colorMap = {
        'Entertainment': 'bg-red-500',
        'Productivity': 'bg-blue-500',
        'Health & Fitness': 'bg-green-500',
        'Education': 'bg-purple-500',
        'Shopping': 'bg-pink-500',
        'Utilities': 'bg-yellow-500',
        'Other': 'bg-gray-500'
      };

      const subscription = {
        ...createdSub,
        icon: iconMap?.[createdSub?.category] || 'EllipsisHorizontalCircleIcon',
        color: colorMap?.[createdSub?.category] || 'bg-gray-500',
        startDate: createdSub?.nextPaymentDate || newSub?.nextPaymentDate,
        annualCost: newSub?.billingFrequency === 'monthly' ? newSub?.cost * 12 :
                    newSub?.billingFrequency === 'quarterly' ? newSub?.cost * 4 :
                    newSub?.cost
      };

      setSubscriptions(prev => [...prev, subscription]);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error adding subscription:', error);
      setError('Failed to add subscription. Please try again.');
    }
  };

  const handleEditSubscription = (subscription) => {
    setEditingSubscription(subscription);
    setIsEditModalOpen(true);
  };

  const handleUpdateSubscription = async (id, updatedData) => {
    try {
      setError(null);
      // Use subscription_id if available, otherwise use id
      const subscriptionId = subscriptions.find(s => s.id === id)?.subscription_id || id;
      const updatedSub = await updateSubscription(subscriptionId, updatedData);
      
      const iconMap = {
        'Entertainment': 'FilmIcon',
        'Productivity': 'BriefcaseIcon',
        'Health & Fitness': 'HeartIcon',
        'Education': 'AcademicCapIcon',
        'Shopping': 'ShoppingBagIcon',
        'Utilities': 'BoltIcon',
        'Other': 'EllipsisHorizontalCircleIcon'
      };

      const colorMap = {
        'Entertainment': 'bg-red-500',
        'Productivity': 'bg-blue-500',
        'Health & Fitness': 'bg-green-500',
        'Education': 'bg-purple-500',
        'Shopping': 'bg-pink-500',
        'Utilities': 'bg-yellow-500',
        'Other': 'bg-gray-500'
      };

      const updatedSubscription = {
        ...updatedSub,
        id: updatedSub.id || id,
        icon: iconMap?.[updatedSub?.category] || 'EllipsisHorizontalCircleIcon',
        color: colorMap?.[updatedSub?.category] || 'bg-gray-500',
        startDate: subscriptions.find(s => s.id === id)?.startDate || updatedSub.nextPaymentDate,
        annualCost: updatedData?.billingFrequency === 'monthly' ? updatedData?.cost * 12 :
                    updatedData?.billingFrequency === 'quarterly' ? updatedData?.cost * 4 :
                    updatedData?.cost
      };

      setSubscriptions(prev => prev?.map(sub => sub?.id === id ? updatedSubscription : sub));
      setIsEditModalOpen(false);
      setEditingSubscription(null);
    } catch (error) {
      console.error('Error updating subscription:', error);
      setError('Failed to update subscription. Please try again.');
    }
  };

  const handleCancelClick = (subscription) => {
    setSubscriptionToCancel(subscription);
    setCancelConfirmId(subscription?.id);
  };

  const handleCancelConfirm = async () => {
    if (cancelConfirmId) {
      try {
        setError(null);
        // Use subscription_id if available, otherwise use id
        const subscriptionId = subscriptions.find(s => s.id === cancelConfirmId)?.subscription_id || cancelConfirmId;
        await deleteSubscription(subscriptionId);
        setSubscriptions(prev => prev?.filter(sub => sub?.id !== cancelConfirmId));
        setCancelConfirmId(null);
        setSubscriptionToCancel(null);
      } catch (error) {
        console.error('Error deleting subscription:', error);
        setError('Failed to delete subscription. Please try again.');
      }
    }
  };

  const handleCancelCancel = () => {
    setCancelConfirmId(null);
    setSubscriptionToCancel(null);
  };

  // Handle Escape key to close cancel confirmation modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && cancelConfirmId) {
        setCancelConfirmId(null);
        setSubscriptionToCancel(null);
      }
    };

    if (cancelConfirmId) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [cancelConfirmId]);

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
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Subscription Manager</h1>
          <p className="text-muted-foreground">
            Track and manage your recurring payments with renewal alerts
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Icon name="ExclamationTriangleIcon" size={20} variant="solid" className="text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-destructive hover:text-destructive/80"
            >
              <Icon name="XMarkIcon" size={16} variant="solid" />
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Icon name="ArrowPathIcon" size={64} variant="outline" className="text-muted-foreground mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Loading subscriptions...</h3>
            <p className="text-muted-foreground">Please wait while we fetch your data</p>
          </div>
        ) : (
          <>
        {/* Controls */}
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Icon
                  name="MagnifyingGlassIcon"
                  size={20}
                  variant="outline"
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e?.target?.value)}
                  placeholder="Search subscriptions..."
                  className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-quick"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e?.target?.value)}
                className="px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-quick"
              >
                {categories?.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e?.target?.value)}
                className="px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-quick"
              >
                {sortOptions?.map(opt => (
                  <option key={opt?.value} value={opt?.value}>
                    Sort: {opt?.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-quick"
              >
                <Icon name="PlusIcon" size={20} variant="solid" />
                <span>Add Subscription</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Subscriptions List */}
          <div className="lg:col-span-2 space-y-4">
            {filteredAndSortedSubscriptions?.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                <Icon name="RectangleStackIcon" size={64} variant="outline" className="text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No subscriptions found</h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery || filterCategory !== 'all' ?'Try adjusting your filters or search query' :'Start by adding your first subscription'}
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-quick"
                >
                  <Icon name="PlusIcon" size={20} variant="solid" />
                  <span>Add Your First Subscription</span>
                </button>
              </div>
            ) : (
              filteredAndSortedSubscriptions?.map(subscription => (
                <SubscriptionCard
                  key={subscription?.id}
                  subscription={subscription}
                  onEdit={handleEditSubscription}
                  onCancel={handleCancelClick}
                />
              ))
            )}
          </div>

          {/* Right Column - Summary & Alerts */}
          <div className="space-y-6">
            <SubscriptionSummary summary={summary} />
            <RenewalAlerts alerts={upcomingRenewals} />
            <SavingsRecommendations recommendations={initialData?.recommendations} />
          </div>
        </div>
          </>
        )}
        {/* Add Subscription Modal */}
        <AddSubscriptionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAdd={handleAddSubscription}
        />
        
        {/* Edit Subscription Modal */}
        <EditSubscriptionModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingSubscription(null);
          }}
          onUpdate={handleUpdateSubscription}
          subscription={editingSubscription}
        />

        {/* Cancel Confirmation Modal */}
        {cancelConfirmId && subscriptionToCancel && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={handleCancelCancel}
          >
            <div 
              className="bg-card rounded-lg border border-border shadow-lg max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start space-x-4 mb-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10">
                    <Icon name="ExclamationTriangleIcon" size={24} variant="solid" className="text-destructive" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Cancel Subscription?
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Are you sure you want to cancel this subscription? This action cannot be undone.
                  </p>
                  <div className="bg-muted rounded-md p-3 mb-4">
                    <p className="text-sm font-medium text-foreground">{subscriptionToCancel?.serviceName}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(subscriptionToCancel?.nextPaymentDate)}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(subscriptionToCancel?.cost)}/{subscriptionToCancel?.billingFrequency}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={handleCancelCancel}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-md transition-quick border border-border"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancelConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-destructive hover:bg-destructive/90 rounded-md transition-quick flex items-center space-x-2"
                >
                  <Icon name="XMarkIcon" size={16} variant="solid" />
                  <span>Cancel Subscription</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

SubscriptionManagerInteractive.propTypes = {
  initialData: PropTypes?.shape({
    subscriptions: PropTypes?.arrayOf(
      PropTypes?.shape({
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
      })
    )?.isRequired,
    recommendations: PropTypes?.arrayOf(
      PropTypes?.shape({
        id: PropTypes?.string?.isRequired,
        title: PropTypes?.string?.isRequired,
        description: PropTypes?.string?.isRequired,
        potentialSavings: PropTypes?.number?.isRequired,
        impact: PropTypes?.oneOf(['high', 'medium', 'low'])?.isRequired,
        actionable: PropTypes?.bool?.isRequired
      })
    )?.isRequired
  })?.isRequired
};

export default SubscriptionManagerInteractive;