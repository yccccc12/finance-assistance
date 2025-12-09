import Header from '@/components/common/Header';
import SubscriptionManagerInteractive from './components/SubscriptionManagerInteractive';

export const metadata = {
  title: 'Subscription Manager - FinanceAssist',
  description: 'Track and manage your recurring payments with renewal alerts and cost analysis for proactive subscription management'
};

export default function SubscriptionManagerPage() {
  const mockSubscriptions = [
    {
      id: "sub-1",
      serviceName: "Netflix Premium",
      cost: 19.99,
      billingFrequency: "monthly",
      nextPaymentDate: "2025-12-10",
      startDate: "2023-06-15",
      category: "Entertainment",
      icon: "FilmIcon",
      color: "bg-red-500",
      annualCost: 239.88,
      description: "4K streaming with 4 simultaneous screens"
    },
    {
      id: "sub-2",
      serviceName: "Spotify Family",
      cost: 16.99,
      billingFrequency: "monthly",
      nextPaymentDate: "2025-12-08",
      startDate: "2022-03-20",
      category: "Entertainment",
      icon: "MusicalNoteIcon",
      color: "bg-green-500",
      annualCost: 203.88,
      description: "Premium music streaming for 6 accounts"
    },
    {
      id: "sub-3",
      serviceName: "Adobe Creative Cloud",
      cost: 54.99,
      billingFrequency: "monthly",
      nextPaymentDate: "2025-12-15",
      startDate: "2023-01-10",
      category: "Productivity",
      icon: "BriefcaseIcon",
      color: "bg-blue-500",
      annualCost: 659.88,
      description: "All Adobe apps including Photoshop and Illustrator"
    },
    {
      id: "sub-4",
      serviceName: "Amazon Prime",
      cost: 139.00,
      billingFrequency: "yearly",
      nextPaymentDate: "2026-03-15",
      startDate: "2021-03-15",
      category: "Shopping",
      icon: "ShoppingBagIcon",
      color: "bg-orange-500",
      annualCost: 139.00,
      description: "Free shipping, Prime Video, and exclusive deals"
    },
    {
      id: "sub-5",
      serviceName: "Peloton Digital",
      cost: 12.99,
      billingFrequency: "monthly",
      nextPaymentDate: "2025-12-12",
      startDate: "2024-01-05",
      category: "Health & Fitness",
      icon: "HeartIcon",
      color: "bg-pink-500",
      annualCost: 155.88,
      description: "Access to thousands of workout classes"
    },
    {
      id: "sub-6",
      serviceName: "Coursera Plus",
      cost: 399.00,
      billingFrequency: "yearly",
      nextPaymentDate: "2026-02-20",
      startDate: "2024-02-20",
      category: "Education",
      icon: "AcademicCapIcon",
      color: "bg-purple-500",
      annualCost: 399.00,
      description: "Unlimited access to 7,000+ courses"
    },
    {
      id: "sub-7",
      serviceName: "Microsoft 365 Family",
      cost: 99.99,
      billingFrequency: "yearly",
      nextPaymentDate: "2026-04-10",
      startDate: "2022-04-10",
      category: "Productivity",
      icon: "DocumentTextIcon",
      color: "bg-blue-600",
      annualCost: 99.99,
      description: "Office apps and 1TB cloud storage for 6 users"
    },
    {
      id: "sub-8",
      serviceName: "Disney+ Bundle",
      cost: 13.99,
      billingFrequency: "monthly",
      nextPaymentDate: "2025-12-07",
      startDate: "2023-11-01",
      category: "Entertainment",
      icon: "TvIcon",
      color: "bg-indigo-500",
      annualCost: 167.88,
      description: "Disney+, Hulu, and ESPN+ streaming"
    }
  ];

  const mockRecommendations = [
    {
      id: "rec-1",
      title: "Switch to Annual Billing",
      description: "Save 16% on Netflix by switching from monthly to annual billing. You\'ll pay upfront but save $47.76 per year.",
      potentialSavings: 3.98,
      impact: "high",
      actionable: true
    },
    {
      id: "rec-2",
      title: "Bundle Your Streaming Services",
      description: "Consider bundling Disney+, Hulu, and ESPN+ instead of separate subscriptions to save on entertainment costs.",
      potentialSavings: 8.00,
      impact: "medium",
      actionable: true
    },
    {
      id: "rec-3",
      title: "Review Unused Subscriptions",
      description: "You haven't used Peloton Digital in the last 30 days. Consider pausing or canceling if you're not actively using it.",
      potentialSavings: 12.99,
      impact: "high",
      actionable: true
    }
  ];

  const pageData = {
    subscriptions: mockSubscriptions,
    recommendations: mockRecommendations
  };

  return (
    <>
      <Header />
      <main className="pt-16">
        <SubscriptionManagerInteractive initialData={pageData} />
      </main>
    </>
  );
}