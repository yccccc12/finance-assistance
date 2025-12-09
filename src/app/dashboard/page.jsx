import Header from '@/components/common/Header';
import DashboardInteractive from './components/DashboardInteractive';

export const metadata = {
  title: 'Dashboard - FinanceAssist',
  description: 'Your financial command center with comprehensive monthly indicators, cash flow visualization, and AI-powered insights for informed decision-making.'
};

export default function DashboardPage() {
  const dashboardData = {
    metrics: [
      {
        title: 'Current Balance',
        value: '$12,458.32',
        change: '+8.2%',
        changeType: 'positive',
        icon: 'BanknotesIcon',
        iconColor: 'bg-primary'
      },
      {
        title: 'Monthly Spending',
        value: '$3,247.89',
        change: '-12.5%',
        changeType: 'positive',
        icon: 'CreditCardIcon',
        iconColor: 'bg-accent'
      },
      {
        title: 'Savings Rate',
        value: '32.4%',
        change: '+4.1%',
        changeType: 'positive',
        icon: 'ChartBarIcon',
        iconColor: 'bg-success'
      },
      {
        title: 'Financial Health',
        value: '85/100',
        change: '+3 points',
        changeType: 'positive',
        icon: 'HeartIcon',
        iconColor: 'bg-warning'
      }
    ],
    cashFlowData: [
      { month: 'Jul', income: 5200, expenses: 3800 },
      { month: 'Aug', income: 5400, expenses: 3950 },
      { month: 'Sep', income: 5100, expenses: 3700 },
      { month: 'Oct', income: 5600, expenses: 4100 },
      { month: 'Nov', income: 5300, expenses: 3850 },
      { month: 'Dec', income: 5500, expenses: 3248 }
    ],
    recentTransactions: [
      {
        id: 1,
        description: 'Whole Foods Market',
        amount: -127.45,
        date: '12/05/2025',
        category: 'Food & Dining',
        type: 'expense'
      },
      {
        id: 2,
        description: 'Monthly Salary',
        amount: 5500.00,
        date: '12/01/2025',
        category: 'Salary',
        type: 'income'
      },
      {
        id: 3,
        description: 'Uber Ride',
        amount: -24.80,
        date: '12/04/2025',
        category: 'Transportation',
        type: 'expense'
      },
      {
        id: 4,
        description: 'Netflix Subscription',
        amount: -15.99,
        date: '12/03/2025',
        category: 'Entertainment',
        type: 'expense'
      },
      {
        id: 5,
        description: 'Freelance Project',
        amount: 850.00,
        date: '12/02/2025',
        category: 'Freelance',
        type: 'income'
      }
    ],
    upcomingRenewals: [
      {
        id: 1,
        name: 'Netflix',
        amount: 15.99,
        renewalDate: '12/08/2025',
        daysUntil: 2
      },
      {
        id: 2,
        name: 'Spotify',
        amount: 9.99,
        renewalDate: '12/10/2025',
        daysUntil: 4
      },
      {
        id: 3,
        name: 'Amazon Prime',
        amount: 14.99,
        renewalDate: '12/12/2025',
        daysUntil: 6
      }
    ],
    categorySpending: [
      { name: 'Food & Dining', value: 847, percentage: 26 },
      { name: 'Transportation', value: 523, percentage: 16 },
      { name: 'Entertainment', value: 412, percentage: 13 },
      { name: 'Utilities', value: 385, percentage: 12 },
      { name: 'Healthcare', value: 298, percentage: 9 },
      { name: 'Shopping', value: 783, percentage: 24 }
    ],
    quickActions: [
      {
        title: 'Add Transaction',
        description: 'Manual or voice entry',
        icon: 'PlusCircleIcon',
        iconColor: 'bg-primary',
        href: '/transaction-tracker'
      },
      {
        title: 'Scan Receipt',
        description: 'OCR-powered processing',
        icon: 'CameraIcon',
        iconColor: 'bg-accent',
        href: '/receipt-scanner'
      },
      {
        title: 'AI Assistant',
        description: 'Get financial insights',
        icon: 'SparklesIcon',
        iconColor: 'bg-success',
        href: '/ai-assistant-chat'
      }
    ]
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-foreground">Financial Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Your comprehensive financial overview for December 2025
            </p>
          </div>

          <DashboardInteractive initialData={dashboardData} />
        </div>
      </main>
    </>
  );
}