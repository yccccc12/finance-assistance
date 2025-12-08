'use client';

import { useState } from 'react';
import PropTypes from 'prop-types';
import Icon from '@/components/ui/AppIcon';
import ReceiptItemCard from './ReceiptItemCard';
import ParticipantCard from './ParticipantCard';
import AddParticipantForm from './AddParticipantForm';
import AddItemForm from './AddItemForm';
import SplitSummary from './SplitSummary';
import TaxTipControls from './TaxTipControls';

const BillSplittingInteractive = ({ initialData }) => {
  const [items, setItems] = useState(initialData?.items || []);
  const [participants, setParticipants] = useState(initialData?.participants || []);
  const [taxTipData, setTaxTipData] = useState({
    taxPercent: initialData?.taxPercent || 0
  });
  const [currency, setCurrency] = useState(initialData?.currency || '$');
  const [showExportModal, setShowExportModal] = useState(false);

  const calculateSubtotal = () => {
    return items?.reduce((sum, item) => sum + item?.totalPrice, 0);
  };

  const calculateTaxAmount = () => {
    const subtotal = calculateSubtotal();
    return subtotal * (taxTipData?.taxPercent / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTaxAmount();
  };

  const calculateParticipantAmount = (participantId) => {
    const participantItems = items?.filter(item => 
      item?.assignedTo?.includes(participantId)
    );

    let itemsTotal = 0;
    participantItems?.forEach(item => {
      const shareCount = item?.assignedTo?.length;
      itemsTotal += item?.totalPrice / shareCount;
    });

    // Apply tax percentage to participant's items
    const taxAmount = itemsTotal * (taxTipData?.taxPercent / 100);
    return itemsTotal + taxAmount;
  };

  const handleToggleParticipant = (itemId, participantId) => {
    setItems(prev => prev?.map(item => {
      if (item?.id === itemId) {
        const assignedTo = item?.assignedTo || [];
        const isAssigned = assignedTo?.includes(participantId);
        return {
          ...item,
          assignedTo: isAssigned
            ? assignedTo?.filter(id => id !== participantId)
            : [...assignedTo, participantId]
        };
      }
      return item;
    }));
  };

  const handleRemoveItem = (itemId) => {
    setItems(prev => prev?.filter(item => item?.id !== itemId));
  };

  const handleAddItem = (itemData) => {
    const newItem = {
      id: `item-${Date.now()}`,
      name: itemData?.name,
      quantity: itemData?.quantity,
      unitPrice: itemData?.unitPrice,
      totalPrice: itemData?.quantity * itemData?.unitPrice,
      assignedTo: []
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleAddParticipant = (participantData) => {
    const newParticipant = {
      id: `participant-${Date.now()}`,
      name: participantData?.name,
      contact: participantData?.contact
    };
    setParticipants(prev => [...prev, newParticipant]);
  };

  const handleRemoveParticipant = (participantId) => {
    setParticipants(prev => prev?.filter(p => p?.id !== participantId));
    setItems(prev => prev?.map(item => ({
      ...item,
      assignedTo: item?.assignedTo?.filter(id => id !== participantId) || []
    })));
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  const sendViaWhatsApp = (participant) => {
    const participantItems = items.filter(item => 
      item?.assignedTo?.includes(participant.id)
    );
    
    let itemsTotal = 0;
    let itemsList = participantItems.map(item => {
      const shareCount = item.assignedTo.length;
      const itemShare = item.totalPrice / shareCount;
      itemsTotal += itemShare;
      return `• ${item.name} (${shareCount > 1 ? `split ${shareCount} ways` : 'yours'}): ${currency}${itemShare.toFixed(2)}`;
    }).join('\n');

    const taxAmount = itemsTotal * (taxTipData?.taxPercent / 100);
    const totalAmount = itemsTotal + taxAmount;

    const message = `🧾 *Bill Split Summary*\n\n` +
      `Hi ${participant.name}! Here's your share:\n\n` +
      `📍 ${initialData?.storeName || 'Restaurant'}\n` +
      `📅 ${initialData?.receiptDate ? new Date(initialData.receiptDate).toLocaleDateString() : 'Today'}\n\n` +
      `*Your Items:*\n${itemsList}\n\n` +
      `Subtotal: ${currency}${itemsTotal.toFixed(2)}\n` +
      `Tax (${taxTipData?.taxPercent}%): ${currency}${taxAmount.toFixed(2)}\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `*TOTAL: ${currency}${totalAmount.toFixed(2)}*`;

    // Clean phone number (remove spaces, dashes, parentheses)
    const cleanPhone = participant.contact.replace(/[\s\-\(\)]/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const sendToAll = () => {
    participants.forEach((participant) => {
      setTimeout(() => sendViaWhatsApp(participant), 500);
    });
    setShowExportModal(false);
  };

  const getParticipantItemCount = (participantId) => {
    return items?.filter(item => item?.assignedTo?.includes(participantId))?.length;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Split the Bill</h1>
          <p className="text-muted-foreground">
            Assign items to participants and calculate individual amounts
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Items */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground flex items-center">
                  <Icon name="ShoppingBagIcon" size={24} variant="outline" className="mr-2" />
                  Receipt Items ({items?.length})
                </h2>
              </div>

              <div className="space-y-3 mb-4">
                {items?.length === 0 ? (
                  <div className="text-center py-12">
                    <Icon name="ReceiptPercentIcon" size={48} variant="outline" className="mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No items added yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Add items to start splitting</p>
                  </div>
                ) : (
                  items?.map(item => (
                    <ReceiptItemCard
                      key={item?.id}
                      item={item}
                      participants={participants}
                      onToggleParticipant={handleToggleParticipant}
                      onRemoveItem={handleRemoveItem}
                      currency={currency}
                    />
                  ))
                )}
              </div>

              <AddItemForm onAdd={handleAddItem} currency={currency} />
            </div>
          </div>

          {/* Right Column - Participants & Summary */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                <Icon name="UsersIcon" size={24} variant="outline" className="mr-2" />
                Participants ({participants?.length})
              </h2>

              <div className="space-y-3 mb-4">
                {participants?.length === 0 ? (
                  <div className="text-center py-8">
                    <Icon name="UserPlusIcon" size={40} variant="outline" className="mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Add participants to split bill</p>
                  </div>
                ) : (
                  participants?.map(participant => (
                    <ParticipantCard
                      key={participant?.id}
                      participant={participant}
                      totalAmount={calculateParticipantAmount(participant?.id)}
                      itemCount={getParticipantItemCount(participant?.id)}
                      onRemove={handleRemoveParticipant}
                      currency={currency}
                    />
                  ))
                )}
              </div>

              <AddParticipantForm onAdd={handleAddParticipant} />
            </div>

            <TaxTipControls onUpdate={setTaxTipData} initialTaxPercent={taxTipData?.taxPercent} currency={currency} />

            <SplitSummary
              subtotal={calculateSubtotal()}
              taxPercent={taxTipData?.taxPercent}
              taxAmount={calculateTaxAmount()}
              total={calculateTotal()}
              currency={currency}
            />

            <button
              onClick={handleExport}
              disabled={participants?.length === 0 || items?.length === 0}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-success text-success-foreground rounded-lg font-medium hover:bg-success/90 transition-quick disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="ShareIcon" size={20} variant="solid" />
              <span>Export & Share</span>
            </button>
          </div>
        </div>
      </div>
      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-1030 p-4">
          <div className="bg-card rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-foreground">Send Bill Split</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 hover:bg-muted rounded-md transition-quick"
              >
                <Icon name="XMarkIcon" size={20} variant="outline" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Send each participant their share via WhatsApp
            </p>

            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {participants.map(participant => (
                <button
                  key={participant.id}
                  onClick={() => sendViaWhatsApp(participant)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-muted hover:bg-success/10 hover:border-success rounded-lg transition-quick border border-border"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-success/20 rounded-full flex items-center justify-center">
                      <Icon name="ChatBubbleBottomCenterTextIcon" size={16} variant="solid" className="text-success" />
                    </div>
                    <div className="text-left">
                      <p className="text-foreground font-medium">{participant.name}</p>
                      <p className="text-xs text-muted-foreground">{participant.contact}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{currency}{calculateParticipantAmount(participant.id).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">via WhatsApp</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <button 
                onClick={sendToAll}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-success text-success-foreground rounded-lg font-medium hover:bg-success/90 transition-quick"
              >
                <Icon name="PaperAirplaneIcon" size={20} variant="solid" />
                <span>Send to All Participants</span>
              </button>

              <button 
                onClick={() => setShowExportModal(false)}
                className="w-full px-4 py-2 text-muted-foreground hover:text-foreground transition-quick"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

BillSplittingInteractive.propTypes = {
  initialData: PropTypes?.shape({
    storeName: PropTypes?.string,
    receiptDate: PropTypes?.string,
    taxPercent: PropTypes?.number,
    currency: PropTypes?.string,
    items: PropTypes?.arrayOf(
      PropTypes?.shape({
        id: PropTypes?.string?.isRequired,
        name: PropTypes?.string?.isRequired,
        quantity: PropTypes?.number?.isRequired,
        unitPrice: PropTypes?.number?.isRequired,
        totalPrice: PropTypes?.number?.isRequired,
        assignedTo: PropTypes?.arrayOf(PropTypes?.string)
      })
    ),
    participants: PropTypes?.arrayOf(
      PropTypes?.shape({
        id: PropTypes?.string?.isRequired,
        name: PropTypes?.string?.isRequired,
        contact: PropTypes?.string?.isRequired
      })
    )
  })?.isRequired
};

export default BillSplittingInteractive;