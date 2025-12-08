'use client';

import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Icon from '@/components/ui/AppIcon';
import { speechToText, parseSubscription } from '@/services/transactionApi';

const EditSubscriptionModal = ({ isOpen, onClose, onUpdate, subscription }) => {
  const [formData, setFormData] = useState({
    serviceName: '',
    cost: '',
    billingFrequency: 'monthly',
    nextPaymentDate: '',
    category: 'Entertainment',
    description: ''
  });

  const [errors, setErrors] = useState({});

  // Voice input state
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [parsedSubscription, setParsedSubscription] = useState(null);
  const [showTranscriptionConfirmation, setShowTranscriptionConfirmation] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Populate form when subscription changes
  useEffect(() => {
    if (subscription && isOpen) {
      const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        try {
          const date = new Date(dateString);
          return date.toISOString().split('T')[0];
        } catch {
          return '';
        }
      };

      setFormData({
        serviceName: subscription?.serviceName || '',
        cost: subscription?.cost?.toString() || '',
        billingFrequency: subscription?.billingFrequency || 'monthly',
        nextPaymentDate: formatDateForInput(subscription?.nextPaymentDate) || '',
        category: subscription?.category || 'Entertainment',
        description: subscription?.description || ''
      });
      setErrors({});
    }
  }, [subscription, isOpen]);

  const categories = [
    'Entertainment',
    'Productivity',
    'Health & Fitness',
    'Education',
    'Shopping',
    'Utilities',
    'Other'
  ];

  const frequencies = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' }
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

    if (!formData?.serviceName?.trim()) {
      newErrors.serviceName = 'Service name is required';
    }

    if (!formData?.cost || parseFloat(formData?.cost) <= 0) {
      newErrors.cost = 'Valid cost is required';
    }

    if (!formData?.nextPaymentDate) {
      newErrors.nextPaymentDate = 'Next payment date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
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
      
      const sttResult = await speechToText(audioBlob);
      
      if (!sttResult?.text) {
        setVoiceError('No text was transcribed. Please try again.');
        return;
      }

      setTranscribedText(sttResult.text);
      setIsTranscribing(false);
      setIsParsing(true);

      try {
        const parsedData = await parseSubscription(sttResult.text);
        setParsedSubscription(parsedData);
        setShowTranscriptionConfirmation(true);
      } catch (parseError) {
        console.error('Error parsing subscription:', parseError);
        setVoiceError('Failed to parse subscription. Please try again.');
        setParsedSubscription(null);
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
    if (parsedSubscription) {
      setFormData(prev => ({
        ...prev,
        serviceName: parsedSubscription.serviceName || prev.serviceName,
        cost: parsedSubscription.cost?.toString() || prev.cost,
        billingFrequency: parsedSubscription.billingFrequency || prev.billingFrequency,
        nextPaymentDate: parsedSubscription.nextPaymentDate || prev.nextPaymentDate,
        category: parsedSubscription.category || prev.category,
        description: parsedSubscription.description || prev.description
      }));
      
      setErrors({});
    } else if (transcribedText) {
      setFormData(prev => ({
        ...prev,
        serviceName: transcribedText
      }));
      if (errors?.serviceName) {
        setErrors(prev => ({ ...prev, serviceName: '' }));
      }
    }
    
    setTranscribedText('');
    setParsedSubscription(null);
    setShowTranscriptionConfirmation(false);
    setVoiceError('');
  };

  const handleCancelTranscription = () => {
    setTranscribedText('');
    setParsedSubscription(null);
    setShowTranscriptionConfirmation(false);
    setVoiceError('');
  };

  const handleSubmit = (e) => {
    e?.preventDefault();

    if (validateForm()) {
      onUpdate(subscription?.id, {
        ...formData,
        cost: parseFloat(formData?.cost)
      });
      setTranscribedText('');
      setParsedSubscription(null);
      setShowTranscriptionConfirmation(false);
    }
  };

  if (!isOpen || !subscription) return null;

  return (
    <div className="fixed inset-0 z-1030 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Edit Subscription</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-quick"
            aria-label="Close modal"
          >
            <Icon name="XMarkIcon" size={24} variant="outline" className="text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Service Name */}
          <div>
            <label htmlFor="serviceName" className="block text-sm font-medium text-foreground mb-2">
              Service Name *
            </label>
            <div className="relative">
              <input
                type="text"
                id="serviceName"
                name="serviceName"
                value={formData?.serviceName}
                onChange={handleChange}
                className={`w-full px-4 py-2 pr-16 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-quick ${
                  errors?.serviceName ? 'border-error' : 'border-input'
                }`}
                placeholder="e.g., Netflix, Spotify"
              />
              {/* Voice Input Button */}
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
                className={`absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-full transition-quick ${
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
            {errors?.serviceName && (
              <p className="text-error text-sm mt-1">{errors?.serviceName}</p>
            )}
            {voiceError && (
              <p className="text-error text-sm mt-1">{voiceError}</p>
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
            <div className="p-4 bg-muted rounded-lg border border-border">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Icon name="MicrophoneIcon" size={20} variant="solid" className="text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {parsedSubscription ? 'Subscription Detected' : 'Transcribed Text'}
                  </h3>
                </div>
              </div>
              
              <div className="bg-background p-3 rounded-md border border-border mb-3">
                <p className="text-xs text-muted-foreground mb-1">You said:</p>
                <p className="text-sm text-foreground italic">"{transcribedText}"</p>
              </div>

              {parsedSubscription && (
                <div className="bg-background p-4 rounded-md border border-border mb-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Detected Subscription:</p>
                  
                  {parsedSubscription.serviceName && (
                    <div className="flex items-center space-x-2">
                      <Icon name="TagIcon" size={14} variant="outline" className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Service:</span>
                      <span className="text-sm text-foreground font-medium">{parsedSubscription.serviceName}</span>
                    </div>
                  )}
                  
                  {parsedSubscription.cost && (
                    <div className="flex items-center space-x-2">
                      <Icon name="CurrencyDollarIcon" size={14} variant="outline" className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Cost:</span>
                      <span className="text-sm text-foreground font-medium">${parsedSubscription.cost.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {parsedSubscription.billingFrequency && (
                    <div className="flex items-center space-x-2">
                      <Icon name="ArrowPathIcon" size={14} variant="outline" className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Frequency:</span>
                      <span className="text-sm text-foreground font-medium capitalize">{parsedSubscription.billingFrequency}</span>
                    </div>
                  )}
                  
                  {parsedSubscription.nextPaymentDate && (
                    <div className="flex items-center space-x-2">
                      <Icon name="CalendarIcon" size={14} variant="outline" className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Next Payment:</span>
                      <span className="text-sm text-foreground font-medium">{parsedSubscription.nextPaymentDate}</span>
                    </div>
                  )}
                  
                  {parsedSubscription.category && (
                    <div className="flex items-center space-x-2">
                      <Icon name="TagIcon" size={14} variant="outline" className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Category:</span>
                      <span className="text-sm text-foreground font-medium">{parsedSubscription.category}</span>
                    </div>
                  )}

                  {parsedSubscription.description && (
                    <div className="flex items-start space-x-2">
                      <Icon name="DocumentTextIcon" size={14} variant="outline" className="text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <span className="text-xs text-muted-foreground">Description: </span>
                        <span className="text-sm text-foreground">{parsedSubscription.description}</span>
                      </div>
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
                  <span>{parsedSubscription ? 'Confirm & Fill Form' : 'Use This Text'}</span>
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

          {/* Cost */}
          <div>
            <label htmlFor="cost" className="block text-sm font-medium text-foreground mb-2">
              Cost (USD) *
            </label>
            <input
              type="number"
              id="cost"
              name="cost"
              value={formData?.cost}
              onChange={handleChange}
              step="0.01"
              min="0"
              className={`w-full px-4 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-quick ${
                errors?.cost ? 'border-error' : 'border-input'
              }`}
              placeholder="0.00"
            />
            {errors?.cost && (
              <p className="text-error text-sm mt-1">{errors?.cost}</p>
            )}
          </div>

          {/* Billing Frequency */}
          <div>
            <label htmlFor="billingFrequency" className="block text-sm font-medium text-foreground mb-2">
              Billing Frequency
            </label>
            <select
              id="billingFrequency"
              name="billingFrequency"
              value={formData?.billingFrequency}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-quick"
            >
              {frequencies?.map(freq => (
                <option key={freq?.value} value={freq?.value}>
                  {freq?.label}
                </option>
              ))}
            </select>
          </div>

          {/* Next Payment Date */}
          <div>
            <label htmlFor="nextPaymentDate" className="block text-sm font-medium text-foreground mb-2">
              Next Payment Date *
            </label>
            <input
              type="date"
              id="nextPaymentDate"
              name="nextPaymentDate"
              value={formData?.nextPaymentDate}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-quick ${
                errors?.nextPaymentDate ? 'border-error' : 'border-input'
              }`}
            />
            {errors?.nextPaymentDate && (
              <p className="text-error text-sm mt-1">{errors?.nextPaymentDate}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-foreground mb-2">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData?.category}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-quick"
            >
              {categories?.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
              Description (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData?.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-quick resize-none"
              placeholder="Add any additional notes..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-md text-foreground font-medium hover:bg-muted transition-quick"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-quick"
            >
              Update Subscription
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

EditSubscriptionModal.propTypes = {
  isOpen: PropTypes?.bool?.isRequired,
  onClose: PropTypes?.func?.isRequired,
  onUpdate: PropTypes?.func?.isRequired,
  subscription: PropTypes?.shape({
    id: PropTypes?.string?.isRequired,
    serviceName: PropTypes?.string?.isRequired,
    cost: PropTypes?.number?.isRequired,
    billingFrequency: PropTypes?.string?.isRequired,
    nextPaymentDate: PropTypes?.string?.isRequired,
    category: PropTypes?.string?.isRequired,
    description: PropTypes?.string
  })
};

export default EditSubscriptionModal;

