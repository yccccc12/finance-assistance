'use client';

import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import ChatMessage from './ChatMessage';
import AIResponse from './AIResponse';
import TypingIndicator from './TypingIndicator';
import ChatInput from './ChatInput';
import QuickActionButtons from './QuickActionButtons';
import EmptyState from './EmptyState';
import { sendClaudeMessage } from '@/services/aiAssistantApi';
import { getAllTransactions } from '@/services/transactionApi';

const shouldFetchTransactions = (text) => {
  const lower = text?.toLowerCase() || '';
  return (
    lower?.includes('transaction') ||
    lower?.includes('transactions') ||
    lower?.includes('transcription') ||
    lower?.includes('spending') ||
    lower?.includes('expenses') ||
    lower?.includes('subscription') ||
    lower?.includes('subscriptions') ||
    lower?.includes('bill') ||
    lower?.includes('billing') ||
    lower?.includes('charge') ||
    lower?.includes('payment') ||
    lower?.includes('purchase')
  );
};

const formatTransactionsForPrompt = (transactions = []) => {
  if (!transactions?.length) return '';

  const recent = transactions?.slice(0, 8);
  const lines = recent?.map((t) => {
    const date = t?.purchase_date?.toString?.()?.split?.('T')?.[0] || t?.purchase_date || 'N/A';
    const category = t?.category || 'uncategorized';
    const description = t?.description || '';
    const amount = typeof t?.amount === 'number' ? t?.amount?.toFixed(2) : t?.amount;
    return `- ${date} | ${category} | $${amount} | ${description}`;
  });

  return `\n\nUse these recent transactions (latest first) if helpful:\n${lines?.join('\n')}`;
};

const AIAssistantInteractive = ({ initialMessages }) => {
  const [messages, setMessages] = useState(initialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (messageText) => {
    const userMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: new Date()?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      let messageWithContext = messageText;

      if (shouldFetchTransactions(messageText)) {
        try {
          const transactions = await getAllTransactions();
          const contextBlock = formatTransactionsForPrompt(transactions);
          if (contextBlock) {
            messageWithContext = `${messageText}${contextBlock}`;
          }
        } catch (fetchErr) {
          console.error('Transaction fetch for chat context failed:', fetchErr);
        }
      }

      const response = await sendClaudeMessage(messageWithContext);
      const aiMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: 'ai',
        text: response?.reply || 'Sorry, I was unable to generate a response.',
        timestamp: new Date()?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Claude API error:', error);
      const errorMessage = {
        id: `msg-${Date.now()}-ai-error`,
        sender: 'ai',
        text: 'I ran into an issue generating a response. Please try again.',
        timestamp: new Date()?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (query) => {
    handleSendMessage(query);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages?.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {messages?.map((message) => (
              message?.sender === 'user' ? (
                <ChatMessage key={message?.id} message={message} />
              ) : (
                <AIResponse key={message?.id} message={message} />
              )
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={chatEndRef} />
          </>
        )}
      </div>
      {/* Quick Actions (only show when no messages) */}
      {messages?.length === 0 && (
        <div className="px-4 pb-4">
          <QuickActionButtons onQuickAction={handleQuickAction} />
        </div>
      )}
      {/* Chat Input */}
      <ChatInput onSendMessage={handleSendMessage} isTyping={isTyping} />
    </div>
  );
};

AIAssistantInteractive.propTypes = {
  initialMessages: PropTypes?.arrayOf(
    PropTypes?.shape({
      id: PropTypes?.string?.isRequired,
      sender: PropTypes?.oneOf(['user', 'ai'])?.isRequired,
      text: PropTypes?.string?.isRequired,
      timestamp: PropTypes?.string?.isRequired
    })
  )?.isRequired
};

export default AIAssistantInteractive;