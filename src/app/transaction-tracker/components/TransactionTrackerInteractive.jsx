'use client';

import { useState, useEffect } from 'react';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';
import Icon from '@/components/ui/AppIcon';
import { 
  getAllTransactions, 
  createTransaction, 
  updateTransaction, 
  deleteTransaction 
} from '@/services/transactionApi';

const TransactionTrackerInteractive = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load transactions from backend on mount
  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllTransactions();
      // Normalize transaction data: convert purchase_date to date
      const normalizedData = data.map(transaction => ({
        ...transaction,
        date: transaction.purchase_date || transaction.date || null
      }));
      setTransactions(normalizedData);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setError('Failed to load transactions. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async (transaction) => {
    try {
      const newTransaction = await createTransaction(transaction);
      // Normalize the new transaction: convert purchase_date to date
      const normalizedTransaction = {
        ...newTransaction,
        date: newTransaction.purchase_date || newTransaction.date || null
      };
      setTransactions(prev => [normalizedTransaction, ...prev]);
      return { success: true, data: normalizedTransaction };
    } catch (error) {
      console.error('Error adding transaction:', error);
      setError('Failed to add transaction. Please try again.');
      return { success: false, error };
    }
  };

  const handleEditTransaction = async (updatedTransaction) => {
    try {
      const result = await updateTransaction(updatedTransaction.id, {
        description: updatedTransaction.description,
        amount: updatedTransaction.amount,
        date: updatedTransaction.date,
        category: updatedTransaction.category
      });
      // Normalize the updated transaction: convert purchase_date to date
      const normalizedResult = {
        ...result,
        date: result.purchase_date || result.date || null
      };
      setTransactions(prev =>
        prev?.map(t => (t?.id === normalizedResult?.id ? normalizedResult : t))
      );
    } catch (error) {
      console.error('Error updating transaction:', error);
      setError('Failed to update transaction. Please try again.');
    }
  };

  const handleDeleteTransaction = async (id) => {
    try {
      await deleteTransaction(id);
      setTransactions(prev => prev?.filter(t => t?.id !== id));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      setError('Failed to delete transaction. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Transaction Tracker</h1>
          <p className="text-muted-foreground">
            Add transactions manually or use the microphone button for voice input
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
            <p>{error}</p>
            <button 
              onClick={() => setError(null)} 
              className="text-sm underline mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Icon name="ArrowPathIcon" size={64} variant="outline" className="text-muted-foreground mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Loading transactions...</h3>
            <p className="text-muted-foreground">Please wait while we fetch your data</p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <TransactionForm onAddTransaction={handleAddTransaction} />
            </div>

            <TransactionList
              transactions={transactions}
              onEditTransaction={handleEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default TransactionTrackerInteractive;