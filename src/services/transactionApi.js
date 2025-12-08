// src/services/transactionApi.js

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_URL = `${API_BASE_URL}/transactions`;

console.log("🔧 API Configuration:", {
  API_BASE_URL,
  API_URL,
  env: process.env.NEXT_PUBLIC_API_URL
});

export const getAllTransactions = async () => {
  console.log("📡 Fetching transactions from:", API_URL);
  const res = await fetch(API_URL, {
    method: "GET",
    headers: {
      "accept": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to load transactions");
  }

  return res.json();
};

export const createTransaction = async (transaction) => {
  const payload = {
    user_id: transaction.user_id ?? 1,   // default to user 1 for now
    amount: transaction.amount,
    category: transaction.category,
    description: transaction.description,
    purchase_date: transaction.date,     // backend requires purchase_date
  };

  console.log("📤 Creating transaction:", { API_URL, payload });
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "accept": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("Failed to create transaction: " + err);
  }

  return res.json();
};

export const updateTransaction = async (id, transaction) => {
  const payload = {
    user_id: transaction.user_id ?? 1,
    amount: transaction.amount,
    category: transaction.category,
    description: transaction.description,
    purchase_date: transaction.date,
  };

  const res = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "accept": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("Failed to update transaction: " + err);
  }

  return res.json();
};

export const deleteTransaction = async (id) => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    headers: {
      "accept": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to delete transaction");
  }

  return true;
};

export const speechToText = async (audioBlob) => {
  const res = await fetch(`${API_BASE_URL}/stt`, {
    method: "POST",
    headers: {
      "accept": "application/json",
    },
    body: audioBlob,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("Failed to transcribe audio: " + err);
  }

  return res.json();
};

export const parseTransaction = async (text) => {
  const res = await fetch(`${API_BASE_URL}/parse-transaction`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "accept": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("Failed to parse transaction: " + err);
  }

  return res.json();
};

export const parseSubscription = async (text) => {
  const res = await fetch(`${API_BASE_URL}/parse-subscription`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "accept": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("Failed to parse subscription: " + err);
  }

  return res.json();
};

// Subscription API functions
const SUBSCRIPTIONS_API_URL = `${API_BASE_URL}/subscriptions`;

export const getAllSubscriptions = async () => {
  console.log("📡 Fetching subscriptions from:", SUBSCRIPTIONS_API_URL);
  const res = await fetch(SUBSCRIPTIONS_API_URL, {
    method: "GET",
    headers: {
      "accept": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to load subscriptions");
  }

  const data = await res.json();
  // Transform backend format to frontend format
  return data.map(sub => ({
    id: sub.subscription_id?.toString() || sub.id,
    subscription_id: sub.subscription_id,
    serviceName: sub.service_name,
    cost: sub.cost,
    payment_date: sub.payment_date,
    nextPaymentDate: sub.payment_date, // Using payment_date as nextPaymentDate
    category: sub.category || 'Other',
    description: sub.description || '',
    billingFrequency: 'monthly', // Default since backend doesn't have this field
    startDate: sub.payment_date, // Using payment_date as startDate
    annualCost: sub.cost * 12, // Default calculation
  }));
};

export const createSubscription = async (subscription) => {
  // Transform frontend format to backend format
  const payload = {
    service_name: subscription.serviceName,
    cost: parseFloat(subscription.cost),
    payment_date: subscription.nextPaymentDate || subscription.payment_date,
    category: subscription.category || 'Other',
    description: subscription.description || '',
  };

  console.log("📤 Creating subscription:", { SUBSCRIPTIONS_API_URL, payload });
  const res = await fetch(SUBSCRIPTIONS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "accept": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("Failed to create subscription: " + err);
  }

  const data = await res.json();
  // Transform backend response to frontend format
  return {
    id: data.subscription_id?.toString() || data.id,
    subscription_id: data.subscription_id,
    serviceName: data.service_name,
    cost: data.cost,
    payment_date: data.payment_date,
    nextPaymentDate: data.payment_date,
    category: data.category || 'Other',
    description: data.description || '',
    billingFrequency: subscription.billingFrequency || 'monthly',
    startDate: data.payment_date,
    annualCost: data.cost * (subscription.billingFrequency === 'yearly' ? 1 : subscription.billingFrequency === 'quarterly' ? 4 : 12),
  };
};

export const updateSubscription = async (id, subscription) => {
  // Transform frontend format to backend format
  const payload = {};
  if (subscription.serviceName !== undefined) payload.service_name = subscription.serviceName;
  if (subscription.cost !== undefined) payload.cost = parseFloat(subscription.cost);
  if (subscription.nextPaymentDate !== undefined) payload.payment_date = subscription.nextPaymentDate;
  if (subscription.payment_date !== undefined) payload.payment_date = subscription.payment_date;
  if (subscription.category !== undefined) payload.category = subscription.category;
  if (subscription.description !== undefined) payload.description = subscription.description;

  const res = await fetch(`${SUBSCRIPTIONS_API_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "accept": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("Failed to update subscription: " + err);
  }

  const data = await res.json();
  // Transform backend response to frontend format
  return {
    id: data.subscription_id?.toString() || data.id,
    subscription_id: data.subscription_id,
    serviceName: data.service_name,
    cost: data.cost,
    payment_date: data.payment_date,
    nextPaymentDate: data.payment_date,
    category: data.category || 'Other',
    description: data.description || '',
    billingFrequency: subscription.billingFrequency || 'monthly',
    startDate: data.payment_date,
    annualCost: data.cost * (subscription.billingFrequency === 'yearly' ? 1 : subscription.billingFrequency === 'quarterly' ? 4 : 12),
  };
};

export const deleteSubscription = async (id) => {
  const res = await fetch(`${SUBSCRIPTIONS_API_URL}/${id}`, {
    method: "DELETE",
    headers: {
      "accept": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to delete subscription");
  }

  return true;
};