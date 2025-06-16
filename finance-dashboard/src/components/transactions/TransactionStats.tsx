import React from 'react';
import { Transaction } from '../../types/api';
import MetricCard from '../cards/MetricCard';

interface TransactionStatsProps {
  totalTransactions: number;
  currentPage: number;
  pageSize: number;
  transactions: Transaction[];
  totalSum: number;
  avgAmount: number;
}

function formatCurrency(amount: number): string {
  // Add validation to prevent NaN
  if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
    return '$0.00';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function safeNumber(value: any): number {
  // Convert to number and validate
  const num = typeof value === 'number' ? value : parseFloat(value);
  return (typeof num === 'number' && isFinite(num)) ? num : 0;
}

export default function TransactionStats({ 
  totalTransactions, 
  currentPage, 
  pageSize, 
  transactions,
  totalSum,
  avgAmount
}: TransactionStatsProps) {
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalTransactions);

  // CONVERTED: Individual MetricCard components using design system
  return (
    <>
      <MetricCard
        title="Total Results"
        value={safeNumber(totalTransactions).toLocaleString()}
        subtitle="Transactions found"
        variant="default"
      />

      <MetricCard
        title="Showing"
        value={`${startIndex}-${endIndex}`}
        subtitle="Current page results"
        variant="default"
      />

      <MetricCard
        title="Total Amount"
        value={formatCurrency(safeNumber(totalSum))}
        subtitle="Sum of all transactions"
        variant="default"
      />

      <MetricCard
        title="Average"
        value={formatCurrency(safeNumber(avgAmount))}
        subtitle="Per transaction average"
        variant="default"
      />
    </>
  );
}