import type { ExchangeRequest, Transaction } from '@/types';

export function getAgentPointsMetrics(
  agentId: string,
  transactions: Transaction[],
  exchangeRequests: ExchangeRequest[]
) {
  const agentTransactions = transactions.filter((transaction) => transaction.agentId === agentId);
  const totalPending = agentTransactions
    .filter((transaction) => transaction.status === 'pending' || transaction.status === 'validated')
    .reduce((sum, transaction) => sum + transaction.commission, 0);
  const totalPaid = agentTransactions
    .filter((transaction) => transaction.status === 'paid')
    .reduce((sum, transaction) => sum + transaction.commission, 0);

  const agentExchangeHistory = exchangeRequests.filter((request) => request.agentId === agentId);
  const redeemedPointsByProgram = agentExchangeHistory.reduce<Record<string, number>>((accumulator, request) => {
    if (request.status === 'rejected') {
      return accumulator;
    }

    const key = `${request.businessName}-${request.programId}`;
    accumulator[key] = (accumulator[key] || 0) + request.pointsSpent;
    return accumulator;
  }, {});

  const totalRedeemed = Object.values(redeemedPointsByProgram).reduce((sum, value) => sum + value, 0);
  const totalAvailablePoints = Math.max(totalPending + totalPaid - totalRedeemed, 0);
  const totalCashExchanged = agentExchangeHistory
    .filter((request) => request.exchangeType === 'cash' && request.status === 'approved')
    .reduce((sum, request) => sum + (request.cashAmount || 0), 0);

  return {
    agentTransactions,
    agentExchangeHistory,
    redeemedPointsByProgram,
    totalPending,
    totalPaid,
    totalRedeemed,
    totalAvailablePoints,
    totalCashExchanged,
    totalGeneratedPoints: totalPending + totalPaid,
    pendingExchangeRequestsCount: agentExchangeHistory.filter((request) => request.status === 'requested').length,
  };
}
