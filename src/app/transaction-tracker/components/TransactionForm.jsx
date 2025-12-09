'use client';

import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import Icon from '@/components/ui/AppIcon';
import { speechToText, parseTransaction } from '@/services/transactionApi';

const TransactionForm = ({ onAddTransaction }) => {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date()?.toISOString()?.split('T')?.[0],
    category: '',
    transaction_type: 'expense'  // 'income' or 'expense'
  });

  const [errors, setErrors] = useState({});
  
  // Voice input state
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [parsedTransaction, setParsedTransaction] = useState(null);
  const [showTranscriptionConfirmation, setShowTranscriptionConfirmation] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const categories = [
    { id: 'food', label: 'Food & Dining', icon: 'ShoppingBagIcon', color: 'bg-orange-500' },
    { id: 'transport', label: 'Transportation', icon: 'TruckIcon', color: 'bg-blue-500' },
    { id: 'entertainment', label: 'Entertainment', icon: 'FilmIcon', color: 'bg-purple-500' },
    { id: 'healthcare', label: 'Healthcare', icon: 'HeartIcon', color: 'bg-red-500' },
    { id: 'shopping', label: 'Shopping', icon: 'ShoppingCartIcon', color: 'bg-pink-500' },
    { id: 'education', label: 'Education', icon: 'AcademicCapIcon', color: 'bg-indigo-500' },
    { id: 'savings', label: 'Savings', icon: 'BanknotesIcon', color: 'bg-green-500' },
    { id: 'other', label: 'Other', icon: 'EllipsisHorizontalIcon', color: 'bg-gray-500' }
  ];

  const handleChange = (e) => {
    const { name, value } = e?.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors?.[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData?.description?.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData?.amount || parseFloat(formData?.amount) <= 0) {
      newErrors.amount = 'Valid amount is required';
    }

    if (!formData?.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData?.category) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleSubmit = (e) => {
    e?.preventDefault();

    if (validateForm()) {
      // Capitalize description (first letter uppercase)
      let description = formData?.description?.trim() || '';
      if (description) {
        description = description[0].toUpperCase() + description.slice(1);
      }
      
      const transaction = {
        id: Date.now(),
        description: description,
        amount: parseFloat(formData?.amount),
        date: formData?.date,
        category: formData?.category,
        transaction_type: formData?.transaction_type,
        timestamp: new Date()?.toISOString()
      };

      onAddTransaction(transaction);

      setFormData({
        description: '',
        amount: '',
        date: new Date()?.toISOString()?.split('T')?.[0],
        category: '',
        transaction_type: 'expense'
      });
      setErrors({});
    }
  };

  const handleCategorySelect = (categoryId) => {
    setFormData(prev => ({
      ...prev,
      category: categoryId
    }));
    if (errors?.category) {
      setErrors(prev => ({ ...prev, category: '' }));
    }
  };

  // Voice input handlers
  const startRecording = async () => {
    try {
      setVoiceError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        if (audioChunksRef.current.length === 0) {
          setVoiceError('No audio recorded. Please try again.');
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setVoiceError('Failed to access microphone. Please check permissions.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob) => {
    try {
      setIsTranscribing(true);
      setVoiceError('');
      
      // Step 1: Transcribe audio to text
      const sttResult = await speechToText(audioBlob);
      
      if (!sttResult?.text) {
        setVoiceError('No text was transcribed. Please try again.');
        return;
      }

      setTranscribedText(sttResult.text);
      setIsTranscribing(false);
      setIsParsing(true);

      // Step 2: Parse transaction data using AI
      try {
        const parsedData = await parseTransaction(sttResult.text);
        setParsedTransaction(parsedData);
        setShowTranscriptionConfirmation(true);
      } catch (parseError) {
        console.error('Error parsing transaction:', parseError);
        setVoiceError('Failed to parse transaction. Please try again.');
        // Still show transcription so user can manually fill the form
        setParsedTransaction(null);
        setShowTranscriptionConfirmation(true);
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      setVoiceError(error?.message || 'Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
      setIsParsing(false);
      audioChunksRef.current = [];
    }
  };

  const handleConfirmTranscription = () => {
    if (parsedTransaction) {
      // Auto-fill form with parsed data
      setFormData(prev => ({
        ...prev,
        description: parsedTransaction.description || transcribedText,
        amount: parsedTransaction.amount?.toString() || prev.amount,
        date: parsedTransaction.date || prev.date,
        category: parsedTransaction.category || prev.category,
        transaction_type: parsedTransaction.transaction_type || 'expense'  // AI detected or default to expense
      }));
      
      // Clear errors for all fields
      setErrors(prev => ({
        ...prev,
        description: '',
        amount: '',
        date: '',
        category: ''
      }));
    } else if (transcribedText) {
      // Fallback: just fill description if parsing failed
      setFormData(prev => ({
        ...prev,
        description: transcribedText
      }));
      if (errors?.description) {
        setErrors(prev => ({ ...prev, description: '' }));
      }
    }
    
    // Reset state
    setTranscribedText('');
    setParsedTransaction(null);
    setShowTranscriptionConfirmation(false);
    setVoiceError('');
  };

  const handleCancelTranscription = () => {
    setTranscribedText('');
    setParsedTransaction(null);
    setShowTranscriptionConfirmation(false);
    setVoiceError('');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-lg border border-border p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-foreground mb-6">Add Transaction</h2>
      {/* Description Field */}
      <div className="mb-4">
        <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
          Description
        </label>
        <div className="relative">
          <input
            type="text"
            id="description"
            name="description"
            value={formData?.description}
            onChange={handleChange}
            placeholder="e.g., Lunch at restaurant"
            className={`w-full px-4 py-2 pr-12 border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-quick ${
              errors?.description ? 'border-destructive' : 'border-input'
            }`}
          />
          {/* Voice Input Button */}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isTranscribing}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-quick ${
              isRecording
                ? 'bg-destructive text-white animate-pulse'
                : isTranscribing
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
            aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
            title={isRecording ? 'Stop recording' : 'Use voice input'}
          >
            <Icon
              name={isRecording ? 'StopIcon' : 'MicrophoneIcon'}
              size={18}
              variant="solid"
            />
          </button>
        </div>
        {errors?.description && (
          <p className="text-destructive text-sm mt-1">{errors?.description}</p>
        )}
        {voiceError && (
          <p className="text-destructive text-sm mt-1">{voiceError}</p>
        )}
        {isRecording && (
          <p className="text-primary text-sm mt-1 flex items-center">
            <Icon name="MicrophoneIcon" size={14} variant="solid" className="mr-1 animate-pulse" />
            Recording... Click the microphone again to stop
          </p>
        )}
        {isTranscribing && (
          <p className="text-primary text-sm mt-1 flex items-center">
            <Icon name="ArrowPathIcon" size={14} variant="solid" className="mr-1 animate-spin" />
            Transcribing audio...
          </p>
        )}
        {isParsing && (
          <p className="text-primary text-sm mt-1 flex items-center">
            <Icon name="ArrowPathIcon" size={14} variant="solid" className="mr-1 animate-spin" />
            Processing with AI...
          </p>
        )}
      </div>

      {/* Transcription Confirmation Modal */}
      {showTranscriptionConfirmation && transcribedText && (
        <div className="mb-4 p-4 bg-muted rounded-lg border border-border">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Icon name="MicrophoneIcon" size={20} variant="solid" className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                {parsedTransaction ? 'Transaction Detected' : 'Transcribed Text'}
              </h3>
            </div>
          </div>
          
          {/* Show original transcription */}
          <div className="bg-background p-3 rounded-md border border-border mb-3">
            <p className="text-xs text-muted-foreground mb-1">You said:</p>
            <p className="text-sm text-foreground italic">"{transcribedText}"</p>
          </div>

          {/* Show parsed transaction data */}
          {parsedTransaction && (
            <div className="bg-background p-4 rounded-md border border-border mb-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Detected Transaction:</p>
              
              {parsedTransaction.description && (
                <div className="flex items-center space-x-2">
                  <Icon name="DocumentTextIcon" size={14} variant="outline" className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Description:</span>
                  <span className="text-sm text-foreground font-medium">{parsedTransaction.description}</span>
                </div>
              )}
              
              {parsedTransaction.amount && (
                <div className="flex items-center space-x-2">
                  <Icon name="CurrencyDollarIcon" size={14} variant="outline" className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Amount:</span>
                  <span className={`text-sm font-medium ${
                    parsedTransaction.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {parsedTransaction.transaction_type === 'income' ? '+' : '-'}${parsedTransaction.amount.toFixed(2)}
                  </span>
                </div>
              )}
              
              {parsedTransaction.transaction_type && (
                <div className="flex items-center space-x-2">
                  <Icon name={parsedTransaction.transaction_type === 'income' ? 'ArrowUpCircleIcon' : 'ArrowDownCircleIcon'} size={14} variant="outline" className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Type:</span>
                  <span className={`text-sm font-medium ${
                    parsedTransaction.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {parsedTransaction.transaction_type === 'income' ? 'Income (+)' : 'Expense (-)'}
                  </span>
                </div>
              )}
              
              {parsedTransaction.date && (
                <div className="flex items-center space-x-2">
                  <Icon name="CalendarIcon" size={14} variant="outline" className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Date:</span>
                  <span className="text-sm text-foreground font-medium">{parsedTransaction.date}</span>
                </div>
              )}
              
              {parsedTransaction.category && (
                <div className="flex items-center space-x-2">
                  <Icon name="TagIcon" size={14} variant="outline" className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Category:</span>
                  <span className="text-sm text-foreground font-medium">
                    {categories?.find(c => c?.id === parsedTransaction.category)?.label || parsedTransaction.category}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleConfirmTranscription}
              className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-quick flex items-center justify-center space-x-2"
            >
              <Icon name="CheckCircleIcon" size={16} variant="solid" />
              <span>{parsedTransaction ? 'Confirm & Fill Form' : 'Use This Text'}</span>
            </button>
            <button
              type="button"
              onClick={handleCancelTranscription}
              className="flex-1 bg-muted text-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-muted/80 transition-quick flex items-center justify-center space-x-2 border border-border"
            >
              <Icon name="XMarkIcon" size={16} variant="solid" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}
      {/* Transaction Type Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-foreground mb-3">
          Transaction Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, transaction_type: 'expense' }))}
            className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-md border transition-quick ${
              formData?.transaction_type === 'expense'
                ? 'bg-red-500 text-white border-transparent'
                : 'bg-background text-foreground border-input hover:bg-muted'
            }`}
          >
            <Icon name="ArrowDownCircleIcon" size={20} variant={formData?.transaction_type === 'expense' ? 'solid' : 'outline'} />
            <span className="text-sm font-medium">Expense (-)</span>
          </button>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, transaction_type: 'income' }))}
            className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-md border transition-quick ${
              formData?.transaction_type === 'income'
                ? 'bg-green-500 text-white border-transparent'
                : 'bg-background text-foreground border-input hover:bg-muted'
            }`}
          >
            <Icon name="ArrowUpCircleIcon" size={20} variant={formData?.transaction_type === 'income' ? 'solid' : 'outline'} />
            <span className="text-sm font-medium">Income (+)</span>
          </button>
        </div>
      </div>

      {/* Amount and Date Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-foreground mb-2">
            Amount (USD)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData?.amount}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              className={`w-full pl-8 pr-4 py-2 border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-quick ${
                errors?.amount ? 'border-destructive' : 'border-input'
              }`}
            />
          </div>
          {errors?.amount && (
            <p className="text-destructive text-sm mt-1">{errors?.amount}</p>
          )}
        </div>

        <div>
          <label htmlFor="date" className="block text-sm font-medium text-foreground mb-2">
            Date
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData?.date}
            onChange={handleChange}
            max={new Date()?.toISOString()?.split('T')?.[0]}
            className={`w-full px-4 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-quick ${
              errors?.date ? 'border-destructive' : 'border-input'
            }`}
          />
          {errors?.date && (
            <p className="text-destructive text-sm mt-1">{errors?.date}</p>
          )}
        </div>
      </div>
      {/* Category Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-foreground mb-3">
          Category
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {categories?.map((category) => (
            <button
              key={category?.id}
              type="button"
              onClick={() => handleCategorySelect(category?.id)}
              className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-md border transition-quick ${
                formData?.category === category?.id
                  ? `${category?.color} text-white border-transparent`
                  : 'bg-background text-foreground border-input hover:bg-muted'
              }`}
            >
              <Icon name={category?.icon} size={18} variant={formData?.category === category?.id ? 'solid' : 'outline'} />
              <span className="text-sm font-medium">{category?.label}</span>
            </button>
          ))}
        </div>
        {errors?.category && (
          <p className="text-destructive text-sm mt-2">{errors?.category}</p>
        )}
      </div>
      {/* Submit Button */}
      <button
        type="submit"
        className="w-full bg-primary text-primary-foreground py-3 rounded-md font-semibold hover:bg-primary/90 transition-quick flex items-center justify-center space-x-2"
      >
        <Icon name="PlusCircleIcon" size={20} variant="solid" />
        <span>Add Transaction</span>
      </button>
    </form>
  );
};

TransactionForm.propTypes = {
  onAddTransaction: PropTypes?.func?.isRequired
};

export default TransactionForm;