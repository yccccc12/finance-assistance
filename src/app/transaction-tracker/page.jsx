import Header from '@/components/common/Header';
import TransactionTrackerInteractive from './components/TransactionTrackerInteractive';

export const metadata = {
  title: 'Transaction Tracker - FinanceAssist',
  description: 'Add and manage your financial transactions with manual entry or voice input powered by intelligent categorization'
};

export default function TransactionTrackerPage() {
  return (
    <>
      <Header />
      <TransactionTrackerInteractive />
    </>
  );
}