'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PropTypes from 'prop-types';
import MetricCard from './MetricCard';
import CashFlowChart from './CashFlowChart';
import RecentTransactionItem from './RecentTransactionItem';
import UpcomingRenewalItem from './UpcomingRenewalItem';
import CategorySpendingChart from './CategorySpendingChart';
import QuickActionCard from './QuickActionCard';

const DashboardInteractive = ({ initialData }) => {
  const [metrics, setMetrics] = useState(initialData?.metrics);
  const [cashFlowData, setCashFlowData] = useState(initialData?.cashFlowData);
  const [recentTransactions, setRecentTransactions] = useState(initialData?.recentTransactions);
  const [upcomingRenewals, setUpcomingRenewals] = useState(initialData?.upcomingRenewals);
  const [categorySpending, setCategorySpending] = useState(initialData?.categorySpending);
  const [quickActions, setQuickActions] = useState(initialData?.quickActions);

  useEffect(() => {
    // Update state when initialData changes
    if (initialData) {
      setMetrics(initialData.metrics);
      setCashFlowData(initialData.cashFlowData);
      setRecentTransactions(initialData.recentTransactions);
      setUpcomingRenewals(initialData.upcomingRenewals);
      setCategorySpending(initialData.categorySpending);
      setQuickActions(initialData.quickActions);
    }
  }, [initialData]);

  return (
    <div className="space-y-6">
      {/* Financial Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics?.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>
      {/* Cash Flow Chart */}
      <CashFlowChart data={cashFlowData} />
      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions - Takes 2 columns */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Recent Transactions</h2>
              <p className="text-sm text-muted-foreground mt-1">Latest financial activities</p>
            </div>
            <Link 
              href="/transaction-tracker"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-quick"
            >
              View All
            </Link>
          </div>
          <div className="space-y-2">
            {recentTransactions?.length > 0 ? (
              recentTransactions?.map((transaction) => (
                <RecentTransactionItem key={transaction?.id} transaction={transaction} />
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No transactions yet</p>
                <p className="text-sm text-muted-foreground mt-1">Start tracking your finances</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Renewals - Takes 1 column */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">Upcoming Renewals</h2>
            <p className="text-sm text-muted-foreground mt-1">Next 7 days</p>
          </div>
          <div className="space-y-3">
            {upcomingRenewals?.length > 0 ? (
              upcomingRenewals?.map((renewal) => (
                <UpcomingRenewalItem key={renewal?.id} subscription={renewal} />
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No upcoming renewals</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Category Spending and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Spending Chart */}
        <CategorySpendingChart data={categorySpending} />

        {/* Quick Actions */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
            <p className="text-sm text-muted-foreground mt-1">Common tasks and tools</p>
          </div>
          <div className="space-y-3">
            {quickActions?.map((action, index) => (
              <QuickActionCard key={index} {...action} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

DashboardInteractive.propTypes = {
  initialData: PropTypes?.shape({
    metrics: PropTypes?.arrayOf(PropTypes?.shape({
      title: PropTypes?.string?.isRequired,
      value: PropTypes?.string?.isRequired,
      change: PropTypes?.string,
      changeType: PropTypes?.oneOf(['positive', 'negative', 'neutral']),
      icon: PropTypes?.string?.isRequired,
      iconColor: PropTypes?.string?.isRequired
    }))?.isRequired,
    cashFlowData: PropTypes?.arrayOf(PropTypes?.shape({
      month: PropTypes?.string?.isRequired,
      income: PropTypes?.number?.isRequired,
      expenses: PropTypes?.number?.isRequired
    }))?.isRequired,
    recentTransactions: PropTypes?.arrayOf(PropTypes?.shape({
      id: PropTypes?.number?.isRequired,
      description: PropTypes?.string?.isRequired,
      amount: PropTypes?.number?.isRequired,
      date: PropTypes?.string?.isRequired,
      category: PropTypes?.string?.isRequired,
      type: PropTypes?.oneOf(['income', 'expense'])?.isRequired
    }))?.isRequired,
    upcomingRenewals: PropTypes?.arrayOf(PropTypes?.shape({
      id: PropTypes?.number?.isRequired,
      name: PropTypes?.string?.isRequired,
      amount: PropTypes?.number?.isRequired,
      renewalDate: PropTypes?.string?.isRequired,
      daysUntil: PropTypes?.number?.isRequired
    }))?.isRequired,
    categorySpending: PropTypes?.arrayOf(PropTypes?.shape({
      name: PropTypes?.string?.isRequired,
      value: PropTypes?.number?.isRequired,
      percentage: PropTypes?.number?.isRequired
    }))?.isRequired,
    quickActions: PropTypes?.arrayOf(PropTypes?.shape({
      title: PropTypes?.string?.isRequired,
      description: PropTypes?.string?.isRequired,
      icon: PropTypes?.string?.isRequired,
      iconColor: PropTypes?.string?.isRequired,
      href: PropTypes?.string?.isRequired
    }))?.isRequired
  })?.isRequired
};

export default DashboardInteractive;