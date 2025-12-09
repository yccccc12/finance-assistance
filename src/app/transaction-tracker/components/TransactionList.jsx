'use client';

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Icon from '@/components/ui/AppIcon';

const TransactionList = ({ transactions, onEditTransaction, onDeleteTransaction }) => {
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('most-recent');

  const categories = {
    'food': { label: 'Food & Dining', icon: 'ShoppingBagIcon', color: 'bg-orange-500' },
    'transport': { label: 'Transportation', icon: 'TruckIcon', color: 'bg-blue-500' },
    'entertainment': { label: 'Entertainment', icon: 'FilmIcon', color: 'bg-purple-500' },
    'healthcare': { label: 'Healthcare', icon: 'HeartIcon', color: 'bg-red-500' },
    'shopping': { label: 'Shopping', icon: 'ShoppingCartIcon', color: 'bg-pink-500' },
    'education': { label: 'Education', icon: 'AcademicCapIcon', color: 'bg-indigo-500' },
    'savings': { label: 'Savings', icon: 'BanknotesIcon', color: 'bg-green-500' },
    'other': { label: 'Other', icon: 'EllipsisHorizontalIcon', color: 'bg-gray-500' }
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      return 'No date';
    }
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Invalid Date';
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    })?.format(amount);
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) {
      return '';
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '';
      }
      // Format as YYYY-MM-DD for date input
      return date.toISOString().split('T')[0];
    } catch (error) {
      return '';
    }
  };

  const handleEditClick = (transaction) => {
    setEditingId(transaction?.id);
    // Preserve original transaction_type, default to 'expense' only if truly missing
    const originalTransactionType = transaction?.transaction_type;
    setEditFormData({
      description: transaction?.description || '',
      amount: transaction?.amount?.toString() || '',
      date: formatDateForInput(transaction?.date || transaction?.purchase_date),
      category: transaction?.category || '',
      transaction_type: originalTransactionType || 'expense'  // Use original value, only default if missing
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e?.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditSave = (id) => {
    // Capitalize description (first letter uppercase)
    let description = editFormData?.description?.trim() || '';
    if (description) {
      description = description[0].toUpperCase() + description.slice(1);
    }
    
    // Preserve transaction_type from editFormData, ensure it's set
    const transactionType = editFormData?.transaction_type || 'expense';
    
    const updatedTransaction = {
      id,
      description: description,
      amount: parseFloat(editFormData?.amount),
      date: editFormData?.date,
      category: editFormData?.category,
      transaction_type: transactionType,  // Always include transaction_type
      timestamp: new Date()?.toISOString()
    };
    onEditTransaction(updatedTransaction);
    setEditingId(null);
    setEditFormData({});
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleDeleteClick = (transaction) => {
    setTransactionToDelete(transaction);
    setDeleteConfirmId(transaction?.id);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmId) {
      onDeleteTransaction(deleteConfirmId);
      setDeleteConfirmId(null);
      setTransactionToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
    setTransactionToDelete(null);
  };

  // Filter and sort transactions
  const filteredAndSortedTransactions = transactions
    .filter(transaction => {
      if (selectedCategory === 'all') return true;
      return transaction?.category === selectedCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'most-recent') {
        const dateA = new Date(a?.date || a?.purchase_date || 0);
        const dateB = new Date(b?.date || b?.purchase_date || 0);
        return dateB - dateA; // Most recent first
      } else if (sortBy === 'least-recent') {
        const dateA = new Date(a?.date || a?.purchase_date || 0);
        const dateB = new Date(b?.date || b?.purchase_date || 0);
        return dateA - dateB; // Oldest first
      } else if (sortBy === 'high-to-low') {
        return (b?.amount || 0) - (a?.amount || 0); // Highest first
      } else if (sortBy === 'low-to-high') {
        return (a?.amount || 0) - (b?.amount || 0); // Lowest first
      }
      return 0;
    });

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && deleteConfirmId) {
        setDeleteConfirmId(null);
        setTransactionToDelete(null);
      }
    };

    if (deleteConfirmId) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [deleteConfirmId]);

  if (transactions?.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 shadow-sm text-center">
        <Icon name="DocumentTextIcon" size={48} variant="outline" className="text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Transactions Yet</h3>
        <p className="text-sm text-muted-foreground">
          Add your first transaction using the form above or voice input
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Delete Confirmation Modal */}
      {deleteConfirmId && transactionToDelete && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleDeleteCancel}
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
                  Delete Transaction?
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Are you sure you want to delete this transaction? This action cannot be undone.
                </p>
                <div className="bg-muted rounded-md p-3 mb-4">
                  <p className="text-sm font-medium text-foreground">{transactionToDelete?.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(transactionToDelete?.date || transactionToDelete?.purchase_date)}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {formatAmount(transactionToDelete?.amount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-md transition-quick border border-border"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-destructive hover:bg-destructive/90 rounded-md transition-quick flex items-center space-x-2"
              >
                <Icon name="TrashIcon" size={16} variant="solid" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg border border-border shadow-sm">
        <div className="p-6 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Recent Transactions</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredAndSortedTransactions?.length} transaction{filteredAndSortedTransactions?.length !== 1 ? 's' : ''}
                {selectedCategory !== 'all' && ` in ${categories[selectedCategory]?.label}`}
              </p>
            </div>
            <div className="flex items-center space-x-3 flex-shrink-0">
              {/* Category Filter Dropdown */}
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="appearance-none bg-background border border-input rounded-md px-4 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {Object.entries(categories).map(([key, category]) => (
                    <option key={key} value={key}>
                      {category.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Icon name="ChevronDownIcon" size={16} variant="outline" className="text-muted-foreground" />
                </div>
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-background border border-input rounded-md px-4 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  <option value="most-recent">Most Recent</option>
                  <option value="least-recent">Least Recent</option>
                  <option value="high-to-low">High to Low</option>
                  <option value="low-to-high">Low to High</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Icon name="ChevronDownIcon" size={16} variant="outline" className="text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="divide-y divide-border">
          {filteredAndSortedTransactions?.length === 0 ? (
            <div className="p-8 text-center">
              <Icon name="DocumentTextIcon" size={48} variant="outline" className="text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Transactions Found</h3>
              <p className="text-sm text-muted-foreground">
                {selectedCategory !== 'all' 
                  ? `No transactions found in ${categories[selectedCategory]?.label} category.`
                  : 'No transactions to display.'}
              </p>
            </div>
          ) : (
            filteredAndSortedTransactions?.map((transaction) => {
          const category = categories?.[transaction?.category] || categories?.other;
          const isEditing = editingId === transaction?.id;

          return (
            <div key={transaction?.id} className="p-4 hover:bg-muted/50 transition-quick">
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    name="description"
                    value={editFormData?.description}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      name="amount"
                      value={editFormData?.amount}
                      onChange={handleEditChange}
                      step="0.01"
                      className="px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      type="date"
                      name="date"
                      value={editFormData?.date}
                      onChange={handleEditChange}
                      className="px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  {/* Transaction Type Selector */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditFormData(prev => ({ ...prev, transaction_type: 'expense' }))}
                      className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-quick border ${
                        editFormData?.transaction_type === 'expense'
                          ? 'bg-red-500 text-white border-transparent'
                          : 'bg-background text-foreground border-input hover:bg-muted'
                      }`}
                    >
                      <Icon name="ArrowDownCircleIcon" size={16} variant={editFormData?.transaction_type === 'expense' ? 'solid' : 'outline'} />
                      <span>Expense (-)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditFormData(prev => ({ ...prev, transaction_type: 'income' }))}
                      className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-quick border ${
                        editFormData?.transaction_type === 'income'
                          ? 'bg-green-500 text-white border-transparent'
                          : 'bg-background text-foreground border-input hover:bg-muted'
                      }`}
                    >
                      <Icon name="ArrowUpCircleIcon" size={16} variant={editFormData?.transaction_type === 'income' ? 'solid' : 'outline'} />
                      <span>Income (+)</span>
                    </button>
                  </div>
                  {/* Category Dropdown */}
                  <div className="relative">
                    <label className="block text-xs font-medium text-foreground mb-1">Category</label>
                    <select
                      name="category"
                      value={editFormData?.category || ''}
                      onChange={handleEditChange}
                      className="w-full appearance-none bg-background border border-input rounded-md px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      <option value="">Select category</option>
                      {Object.entries(categories).map(([key, cat]) => (
                        <option key={key} value={key}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-2 top-8 pointer-events-none">
                      <Icon name="ChevronDownIcon" size={16} variant="outline" className="text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditSave(transaction?.id)}
                      className="flex-1 bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-quick"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleEditCancel}
                      className="flex-1 bg-muted text-foreground py-2 rounded-md text-sm font-medium hover:bg-muted/80 transition-quick"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${category?.color}`}>
                      <Icon name={category?.icon} size={20} variant="solid" className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {transaction?.description}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          transaction?.transaction_type === 'income' 
                            ? 'bg-green-500' 
                            : category?.color
                        } text-white`}>
                          {transaction?.transaction_type === 'income' ? 'Income' : category?.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(transaction?.date || transaction?.purchase_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 ml-4">
                    <span className={`text-lg font-semibold flex items-center space-x-1 ${
                      transaction?.transaction_type === 'income' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {transaction?.transaction_type === 'income' ? (
                        <>
                          <span>+</span>
                          <span>{formatAmount(transaction?.amount)}</span>
                        </>
                      ) : (
                        <>
                          <span>-</span>
                          <span>{formatAmount(transaction?.amount)}</span>
                        </>
                      )}
                    </span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEditClick(transaction)}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-quick"
                        aria-label="Edit transaction"
                      >
                        <Icon name="PencilIcon" size={18} variant="outline" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(transaction)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-quick"
                        aria-label="Delete transaction"
                      >
                        <Icon name="TrashIcon" size={18} variant="outline" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        }))}
      </div>
    </div>
    </>
  );
};

TransactionList.propTypes = {
  transactions: PropTypes?.arrayOf(
    PropTypes?.shape({
      id: PropTypes?.number?.isRequired,
      description: PropTypes?.string?.isRequired,
      amount: PropTypes?.number?.isRequired,
      date: PropTypes?.string?.isRequired,
      category: PropTypes?.string?.isRequired,
      timestamp: PropTypes?.string?.isRequired
    })
  )?.isRequired,
  onEditTransaction: PropTypes?.func?.isRequired,
  onDeleteTransaction: PropTypes?.func?.isRequired
};

export default TransactionList;