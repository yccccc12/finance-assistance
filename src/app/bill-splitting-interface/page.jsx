'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Header from '@/components/common/Header';
import Breadcrumb from '@/components/common/Breadcrumb';
import QuickActionButton from '@/components/common/QuickActionButton';
import BillSplittingInteractive from './components/BillSplittingInteractive';

function BillSplittingContent() {
  const searchParams = useSearchParams();
  
  const breadcrumbSteps = [
    { label: 'Receipt Scanner', path: '/receipt-scanner' },
    { label: 'Bill Splitting', path: '/bill-splitting-interface' }
  ];

  // Get receipt data from URL params (passed from receipt scanner)
  const storeName = searchParams.get('storeName');
  const totalAmount = searchParams.get('totalAmount');
  const receiptDate = searchParams.get('date');
  const itemsParam = searchParams.get('items');
  const taxParam = searchParams.get('tax');
  const subtotalParam = searchParams.get('subtotal');
  const currencyParam = searchParams.get('currency');

  let initialData;

  // Currency symbol mapping
  const getCurrencySymbol = (currencyCode) => {
    const currencyMap = {
      'USD': '$',
      'MYR': 'RM ',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'SGD': 'S$',
      'CNY': '¥',
      'INR': '₹',
      'AUD': 'A$',
      'CAD': 'C$'
    };
    return currencyMap[currencyCode] || currencyCode + ' ';
  };

  // Check if we have receipt data from scanner
  if (itemsParam) {
    try {
      const receiptItems = JSON.parse(itemsParam);
      
      // Transform receipt items to bill splitting format
      const transformedItems = receiptItems.map((item, index) => ({
        id: `item-${index + 1}`,
        name: item.name,
        quantity: item.quantity || 1,
        unitPrice: parseFloat(item.price),
        totalPrice: parseFloat(item.price) * (item.quantity || 1),
        assignedTo: []
      }));

      // Calculate subtotal from items
      const calculatedSubtotal = transformedItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const taxAmount = taxParam ? parseFloat(taxParam) : 0;
      const subtotal = subtotalParam ? parseFloat(subtotalParam) : calculatedSubtotal;
      
      // Calculate tax percentage: (tax / subtotal) * 100
      const taxPercent = subtotal > 0 && taxAmount > 0 
        ? parseFloat(((taxAmount / subtotal) * 100).toFixed(2))
        : 0;

      initialData = {
        storeName: storeName || 'Receipt',
        receiptDate: receiptDate,
        items: transformedItems,
        participants: [],
        taxPercent: taxPercent,
        currency: getCurrencySymbol(currencyParam || 'USD')
      };
    } catch (error) {
      console.error('Error parsing receipt data:', error);
      // Fall back to mock data if parsing fails
      initialData = getMockData();
    }
  } else {
    // Use mock data if no receipt data provided
    initialData = getMockData();
  }

  return (
    <>
      <Header />
      <Breadcrumb steps={breadcrumbSteps} />
      
      {/* Show receipt info banner if data is from scanner */}
      {storeName && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-2">
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-sm">
              <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="font-medium text-foreground">Receipt from {storeName}</span>
              {receiptDate && <span className="text-muted-foreground">• {new Date(receiptDate).toLocaleDateString()}</span>}
              {totalAmount && <span className="text-muted-foreground">• Total: ${totalAmount}</span>}
            </div>
          </div>
        </div>
      )}
      
      <BillSplittingInteractive initialData={initialData} />
      <QuickActionButton />
    </>
  );
}

function getMockData() {
  return {
    items: [
      {
        id: 'item-1',
        name: 'Caesar Salad',
        quantity: 2,
        unitPrice: 12.99,
        totalPrice: 25.98,
        assignedTo: []
      },
      {
        id: 'item-2',
        name: 'Grilled Salmon',
        quantity: 1,
        unitPrice: 24.99,
        totalPrice: 24.99,
        assignedTo: []
      },
      {
        id: 'item-3',
        name: 'Margherita Pizza',
        quantity: 1,
        unitPrice: 16.99,
        totalPrice: 16.99,
        assignedTo: []
      },
      {
        id: 'item-4',
        name: 'Iced Tea',
        quantity: 3,
        unitPrice: 3.50,
        totalPrice: 10.50,
        assignedTo: []
      }
    ],
    participants: [
      {
        id: 'participant-1',
        name: 'Sarah Johnson',
        contact: '+60123456789'
      },
      {
        id: 'participant-2',
        name: 'Michael Chen',
        contact: '+60198765432'
      }
    ]
  };
}

export default function BillSplittingInterface() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading bill splitting...</p>
        </div>
      </div>
    }>
      <BillSplittingContent />
    </Suspense>
  );
}