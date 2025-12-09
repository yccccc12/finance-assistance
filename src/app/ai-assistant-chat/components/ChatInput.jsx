'use client';

import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import Icon from '@/components/ui/AppIcon';
import { speechToText } from '@/services/transactionApi';

const ChatInput = ({ onSendMessage, isTyping }) => {
  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  useEffect(() => {
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

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (message?.trim() && !isTyping) {
      onSendMessage(message?.trim());
      setMessage('');
    }
  };

  const startRecording = async () => {
    try {
      setError('');
      audioChunksRef.current = [];

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Create MediaRecorder with WebM format
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
          setIsListening(false);
          setIsTranscribing(false);
          return;
        }

        setIsTranscribing(true);
        try {
          // Create blob from audio chunks
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
          
          // Send to backend /stt endpoint
          const result = await speechToText(audioBlob);
          const transcribedText = result.text || '';
          
          if (transcribedText) {
            setMessage(transcribedText);
          } else {
            setError('No speech detected. Please try again.');
          }
        } catch (err) {
          console.error('STT error:', err);
          setError(`Failed to transcribe audio: ${err.message || 'Please try again.'}`);
        } finally {
          setIsTranscribing(false);
          setIsListening(false);
          audioChunksRef.current = [];
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred. Please try again.');
        setIsListening(false);
        setIsTranscribing(false);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      setIsListening(true);
      mediaRecorder.start();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError(`Microphone access denied or not available: ${err.message || 'Please check your browser permissions.'}`);
      setIsListening(false);
      setIsTranscribing(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isListening) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        setIsListening(false);
      } catch (err) {
        console.error('Error stopping recording:', err);
        setIsListening(false);
        setIsTranscribing(false);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      }
    }
  };

  const handleVoiceInput = () => {
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border-t border-border p-4">
      <div className="flex items-end gap-3">
        {/* Voice Input Button */}
        <button
          type="button"
          onClick={handleVoiceInput}
          disabled={isTyping || isTranscribing}
          className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center transition-quick ${
            isListening
              ? 'bg-error text-error-foreground animate-pulse'
              : isTranscribing
              ? 'bg-muted text-muted-foreground cursor-wait'
              : 'bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label={isListening ? 'Stop recording' : 'Start voice input'}
        >
          <Icon name="MicrophoneIcon" size={24} variant={isListening ? 'solid' : 'outline'} />
        </button>

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e?.target?.value)}
            onKeyDown={(e) => {
              if (e?.key === 'Enter' && !e?.shiftKey) {
                e?.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={isListening ? 'Recording...' : isTranscribing ? 'Transcribing...' : 'Ask me anything about your finances...'}
            disabled={isTyping || isListening || isTranscribing}
            className="w-full px-4 py-3 pr-12 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            rows={1}
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!message?.trim() || isTyping}
          className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-lg flex items-center justify-center hover:bg-primary/90 transition-quick disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          <Icon name="PaperAirplaneIcon" size={24} variant="solid" />
        </button>
      </div>
      {(isListening || isTranscribing) && (
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
          <span className="w-2 h-2 bg-error rounded-full animate-pulse"></span>
          {isListening ? 'Recording... Speak your question' : 'Transcribing audio...'}
        </p>
      )}
      {error && (
        <p className="text-xs text-destructive mt-2">{error}</p>
      )}
    </form>
  );
};

ChatInput.propTypes = {
  onSendMessage: PropTypes?.func?.isRequired,
  isTyping: PropTypes?.bool?.isRequired
};

export default ChatInput;