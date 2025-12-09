'use client';

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Icon from '@/components/ui/AppIcon';

const VoiceInput = ({ onTranscriptionComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [browserSupported, setBrowserSupported] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setBrowserSupported(false);
      }
    }
  }, []);

  const parseTranscript = (text) => {
    const lowerText = text?.toLowerCase();
    
    const amountMatch = lowerText?.match(/(\d+(?:\.\d{2})?)\s*(?:dollars?|usd|\$)?/);
    const amount = amountMatch ? parseFloat(amountMatch?.[1]) : 0;

    let category = 'other';
    const categoryKeywords = {
      'food': ['lunch', 'dinner', 'breakfast', 'restaurant', 'food', 'coffee', 'meal'],
      'transport': ['uber', 'taxi', 'gas', 'fuel', 'parking', 'bus', 'train'],
      'entertainment': ['movie', 'netflix', 'spotify', 'concert', 'game'],
      'healthcare': ['doctor', 'pharmacy', 'medicine', 'hospital', 'clinic'],
      'shopping': ['amazon', 'walmart', 'target', 'store', 'shopping'],
      'education': ['book', 'course', 'tuition', 'school', 'class'],
      'savings': ['savings', 'deposit', 'investment', 'save']
    };

    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords?.some(keyword => lowerText?.includes(keyword))) {
        category = cat;
        break;
      }
    }

    let description = text;
    if (amountMatch) {
      description = text?.replace(amountMatch?.[0], '')?.trim();
    }
    description = description?.replace(/^(spent|paid|bought|purchased)\s+/i, '')?.trim();

    return {
      description: description || 'Voice transaction',
      amount,
      category,
      date: new Date()?.toISOString()?.split('T')?.[0]
    };
  };

  const startRecording = () => {
    if (!browserSupported) {
      setError('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    setError('');
    setTranscript('');
    setIsRecording(true);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const current = event?.resultIndex;
      const transcriptText = event?.results?.[current]?.[0]?.transcript;
      setTranscript(transcriptText);
    };

    recognition.onerror = (event) => {
      setIsRecording(false);
      setError(`Error: ${event?.error}. Please try again.`);
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (transcript) {
        setIsProcessing(true);
        setTimeout(() => {
          const parsedData = parseTranscript(transcript);
          onTranscriptionComplete(parsedData);
          setTranscript('');
          setIsProcessing(false);
        }, 500);
      }
    };

    recognition?.start();
  };

  const stopRecording = () => {
    setIsRecording(false);
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Voice Input</h2>
        {!browserSupported && (
          <span className="text-xs text-warning bg-warning/10 px-2 py-1 rounded">
            Limited Support
          </span>
        )}
      </div>

      <div className="flex flex-col items-center space-y-4">
        {/* Microphone Button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing || !browserSupported}
          className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-smooth ${
            isRecording
              ? 'bg-destructive hover:bg-destructive/90 animate-pulse'
              : isProcessing
              ? 'bg-muted cursor-not-allowed' :'bg-primary hover:bg-primary/90'
          } ${!browserSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          <Icon
            name={isRecording ? 'StopIcon' : 'MicrophoneIcon'}
            size={32}
            variant="solid"
            className="text-white"
          />
          {isRecording && (
            <span className="absolute inset-0 rounded-full border-4 border-destructive animate-ping opacity-75"></span>
          )}
        </button>

        {/* Status Text */}
        <div className="text-center min-h-[60px]">
          {isRecording && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Listening...</p>
              {transcript && (
                <p className="text-sm text-muted-foreground italic">"{transcript}"</p>
              )}
            </div>
          )}
          {isProcessing && (
            <p className="text-sm font-medium text-primary">Processing transaction...</p>
          )}
          {!isRecording && !isProcessing && !error && (
            <p className="text-sm text-muted-foreground">
              Tap the microphone to start recording
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-muted rounded-md p-4 w-full">
          <p className="text-xs font-medium text-foreground mb-2">Example phrases:</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• "Spent 25 dollars on lunch at restaurant"</li>
            <li>• "Paid 50 for uber ride"</li>
            <li>• "Bought groceries for 120 dollars"</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

VoiceInput.propTypes = {
  onTranscriptionComplete: PropTypes?.func?.isRequired
};

export default VoiceInput;