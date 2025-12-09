'use client';

import { useState, useEffect } from 'react';
import { checkHealth } from '@/lib/api';

export default function ConnectionStatus() {
  const [status, setStatus] = useState('checking'); // 'checking' | 'connected' | 'disconnected'
  const [message, setMessage] = useState('Checking backend connection...');

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const health = await checkHealth();
        if (health.taggunConfigured || health.receiptOcrConfigured) {
          setStatus('connected');
          setMessage('Backend connected - Receipt OCR ready');
        } else {
          setStatus('disconnected');
          setMessage('Backend connected but Receipt OCR not configured');
        }
      } catch (error) {
        setStatus('disconnected');
        setMessage('Cannot connect to backend. Make sure the server is running on http://localhost:8000');
      }
    };

    checkConnection();
    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
      status === 'connected' 
        ? 'bg-green-100 text-green-800' 
        : status === 'disconnected'
        ? 'bg-red-100 text-red-800'
        : 'bg-yellow-100 text-yellow-800'
    }`}>
      <div className={`w-2 h-2 rounded-full ${
        status === 'connected' 
          ? 'bg-green-500' 
          : status === 'disconnected'
          ? 'bg-red-500'
          : 'bg-yellow-500 animate-pulse'
      }`} />
      <span>{message}</span>
    </div>
  );
}

