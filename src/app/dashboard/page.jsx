'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/common/Header';
import DashboardInteractive from './components/DashboardInteractive';
import Icon from '@/components/ui/AppIcon';
import { getDashboardData } from '@/services/transactionApi';

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getDashboardData();
        setDashboardData(data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    
    // Refresh dashboard data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-foreground">Financial Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Your comprehensive financial overview for {currentMonth} {currentYear}
            </p>
          </div>

          {loading && (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <Icon name="ArrowPathIcon" size={64} variant="outline" className="text-muted-foreground mx-auto mb-4 animate-spin" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Loading dashboard data...</h3>
              <p className="text-muted-foreground">Please wait while we fetch your data</p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
              <p className="text-destructive">Error: {error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && dashboardData && (
            <DashboardInteractive initialData={dashboardData} />
          )}
        </div>
      </main>
    </>
  );
}