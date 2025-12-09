import Header from '@/components/common/Header';
import Breadcrumb from '@/components/common/Breadcrumb';
import ReceiptScannerInteractive from './components/ReceiptScannerInteractive';

export const metadata = {
  title: 'Receipt Scanner - FinanceAssist',
  description: 'Scan and process receipts with OCR technology for automatic expense tracking and bill splitting'
};

export default function ReceiptScannerPage() {
  const breadcrumbSteps = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Receipt Scanner', path: '/receipt-scanner' }
  ];

  const mockRecentReceipts = [
    {
      id: 1,
      storeName: 'Target',
      totalAmount: '124.67',
      date: '12/04/2025',
      imageUrl: 'https://images.pexels.com/photos/4968391/pexels-photo-4968391.jpeg',
      itemCount: 8,
      isSplit: false
    },
    {
      id: 2,
      storeName: 'Starbucks',
      totalAmount: '18.50',
      date: '12/03/2025',
      imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24',
      itemCount: 3,
      isSplit: true
    },
    {
      id: 3,
      storeName: 'Amazon',
      totalAmount: '89.99',
      date: '12/02/2025',
      imageUrl: 'https://images.pixabay.com/photo/2017/08/10/08/47/laptop-2619564_1280.jpg',
      itemCount: 2,
      isSplit: false
    },
    {
      id: 4,
      storeName: 'Walmart',
      totalAmount: '156.32',
      date: '12/01/2025',
      imageUrl: 'https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg',
      itemCount: 15,
      isSplit: false
    },
    {
      id: 5,
      storeName: 'Chipotle',
      totalAmount: '42.75',
      date: '11/30/2025',
      imageUrl: 'https://images.unsplash.com/photo-1626074353765-517a681e40be',
      itemCount: 4,
      isSplit: true
    },
    {
      id: 6,
      storeName: 'CVS Pharmacy',
      totalAmount: '67.89',
      date: '11/29/2025',
      imageUrl: 'https://images.pixabay.com/photo/2016/11/29/03/36/architecture-1867187_1280.jpg',
      itemCount: 6,
      isSplit: false
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Breadcrumb steps={breadcrumbSteps} />

      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Receipt Scanner</h1>
            <p className="text-muted-foreground">
              Upload receipts to automatically extract expense data using OCR technology
            </p>
          </div>

          {/* Interactive Content */}
          <ReceiptScannerInteractive initialReceipts={mockRecentReceipts} />
        </div>
      </main>
    </div>
  );
}