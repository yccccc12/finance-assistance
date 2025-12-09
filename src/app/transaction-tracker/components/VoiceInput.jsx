'use client';

import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Icon from '@/components/ui/AppIcon';
import { speechToText } from '@/services/transactionApi';

const VoiceInput = ({ onTranscriptionComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [browserSupported, setBrowserSupported] = useState(true);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if MediaRecorder API is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
        setBrowserSupported(false);
      }
    }

    // Cleanup function to stop recording and release microphone on unmount
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          console.error('Error stopping recorder on unmount:', err);
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
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

  const startRecording = async () => {
    if (!browserSupported) {
      setError('Microphone access is not supported in your browser. Please use a modern browser like Chrome, Edge, or Firefox.');
      return;
    }

    try {
      setError('');
      setTranscript('');
      audioChunksRef.current = [];

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Create MediaRecorder with WebM format (same as TransactionForm)
      const mimeType = 'audio/webm;codecs=opus';
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release microphone
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        if (audioChunksRef.current.length === 0) {
          setError('No audio recorded. Please try again.');
          setIsProcessing(false);
          return;
        }

        setIsProcessing(true);
        try {
          // Create blob from audio chunks
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
          
          // Send to backend /stt endpoint
          const result = await speechToText(audioBlob);
          const transcribedText = result.text || '';
          
          setTranscript(transcribedText);
          
          if (transcribedText) {
            const parsedData = parseTranscript(transcribedText);
            onTranscriptionComplete(parsedData);
          } else {
            setError('No speech detected. Please try again.');
          }
        } catch (err) {
          console.error('STT error:', err);
          setError(`Failed to transcribe audio: ${err.message || 'Please try again.'}`);
        } finally {
          setIsProcessing(false);
          audioChunksRef.current = [];
        }
      }
    };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred. Please try again.');
        setIsRecording(false);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      setIsRecording(true);
      mediaRecorder.start();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError(`Microphone access denied or not available: ${err.message || 'Please check your browser permissions.'}`);
      setIsRecording(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
      } catch (err) {
        console.error('Error stopping recording:', err);
        setIsRecording(false);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      }
    }
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
              <p className="text-sm font-medium text-foreground">Recording...</p>
              <p className="text-xs text-muted-foreground">Click again to stop</p>
            </div>
          )}
          {isProcessing && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-primary">Transcribing audio...</p>
            </div>
          )}
          {!isRecording && !isProcessing && transcript && !error && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Transcribed:</p>
              <p className="text-sm text-muted-foreground italic">"{transcript}"</p>
            </div>
          )}
          {!isRecording && !isProcessing && !transcript && !error && (
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