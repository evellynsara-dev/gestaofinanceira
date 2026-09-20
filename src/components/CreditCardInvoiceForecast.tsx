import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  TrendingUp,
  AlertCircle,
  Plus,
  Layers,
  Sparkles,
  User,
  ShieldAlert,
} from 'lucide-react';
import { Transaction, PaymentAccount, Member } from '../types';
import { formatBRL, formatDateBR } from '../services/exportService';

interface CreditCardInvoiceForecastProps {
  transactions: Transaction[];
  accounts: PaymentAccount[];
  members: Member[];
  selectedMonth: number;
  selectedYear: number;
  periodName: string;
  onOpenNewCreditCardTx: () => void;
}

export const CreditCardInvoiceForecast: React.FC<CreditCardInvoiceForecastProps> = ({
  transactions,
  accounts,
  members,
  selectedMonth,
  selectedYear,
  periodName,
  onOpenNewCreditCardTx,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Map of members
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  // Identify credit card accounts
  const creditCardAccounts = useMemo(() => {
    return accounts.filter(
      (acc) =>
        acc.type === 'cartao_credito' ||
        acc.name.toLowerCase().includes('cartão') ||
        acc.name.toLowerCase().includes('cartao') ||
        acc.name.toLowerCase().includes('credito') ||
        acc.name.toLowerCase().includes('crédito')
    );
  }, [accounts]);

  const creditCardAccountNames = useMemo(
    () => new Set(creditCardAccounts.map((a) => a.name.toLowerCase())),
    [creditCardAccounts]
  );

  // Check if a transaction is on a credit card
  const isCreditCardTx = (t: Transaction): boolean => {
    if (t.isCreditCard) return true;
    if (!t.account) return false;
    const accLower = t.account.toLowerCase();
    if (creditCardAccountNames.has(accLower)) return true;
    return (
      accLower.includes('cartão') ||
      accLower.includes('cartao') ||
      accLower.includes('credito') ||
      accLower.includes('crédito')
    );
  };

  // Helper for parsing date
  const parseTxDate = (t: Transaction) => {
    const dStr = t.dueDate || t.date;
    if (!dStr) return { year: selectedYear, month: selectedMonth };
    const [y, m] = dStr.split('-').map(Number);
    return { year: y, month: m - 1 };
  };

  // Current month credit card transactions
  const currentMonthCCTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!isCreditCardTx(t)) return false;
      // only expenses or pending payments count towards credit card invoices
      if (t.type !== 'saida' && t.type !== 'falta_pagar') return false;
      const { year, month } = parseTxDate(t);
      return year === selectedYear && month === selectedMonth;
    });
  }, [transactions, selectedYear, selectedMonth, creditCardAccounts]);

  // Total invoice for current month
  const currentInvoiceTotal = useMemo(() => {
    return currentMonthCCTransactions.reduce((acc, t) => acc + t.amount, 0);
  }, [currentMonthCCTransactions]);

  // Installments count and total in current month
  const currentInstallments = useMemo(() => {
    return currentMonthCCTransactions.filter(
      (t) => t.paymentMode === 'parcelado' || (t.installmentTotal && t.installmentTotal > 1)
    );
  }, [currentMonthCCTransactions]);

  // Recurring subscriptions count in current month
  const currentRecurring = useMemo(() => {
    return currentMonthCCTransactions.filter((t) => t.paymentMode === 'recorrente');
  }, [currentMonthCCTransactions]);

  // Forecast for next months (Month +1, Month +2, Month +3)
  const futureForecast = useMemo(() => {
    const getForecastForOffset = (monthOffset: number) => {
      let targetMonth = selectedMonth + monthOffset;
      let targetYear = selectedYear;
      while (targetMonth > 11) {
        targetMonth -= 12;
        targetYear += 1;
      }

      // 1. Transactions already scheduled for that specific month
      const scheduledTxs = transactions.filter((t) => {
        if (!isCreditCardTx(t)) return false;
        if (t.type !== 'saida' && t.type !== 'falta_pagar') return false;
        const { year, month } = parseTxDate(t);
        return year === targetYear && month === targetMonth;
      });

      const scheduledSum = scheduledTxs.reduce((sum, t) => sum + t.amount, 0);

      // 2. Projections from active installment transactions
      // If a transaction is in current month with installmentCurrent < installmentTotal,
      // and future installments aren't yet separate records:
      let projectedInstallmentSum = 0;
      currentMonthCCTransactions.forEach((t) => {
        if (
          t.paymentMode === 'parcelado' &&
          t.installmentCurrent &&
          t.installmentTotal &&
          t.installmentCurrent + monthOffset <= t.installmentTotal
        ) {
          // check if already has a record for that target month
          const alreadyHasRecord = scheduledTxs.some(
            (st) =>
              (st.installmentGroupId && st.installmentGroupId === t.installmentGroupId) ||
              (st.description.includes(t.description.split('(')[0].trim()) &&
                st.installmentCurrent === t.installmentCurrent! + monthOffset)
          );
          if (!alreadyHasRecord) {
            projectedInstallmentSum += t.amount;
          }
        }
      });

      // 3. Projections from recurring payments (subscriptions repeat every month)
      let projectedRecurringSum = 0;
      currentRecurring.forEach((t) => {
        const alreadyHasRecord = scheduledTxs.some(
          (st) => st.description.toLowerCase() === t.description.toLowerCase()
        );
        if (!alreadyHasRecord) {
          projectedRecurringSum += t.amount;
        }
      });

      const MONTH_NAMES_SHORT = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
      ];

      return {
        label: `${MONTH_NAMES_SHORT[targetMonth]}/${String(targetYear).slice(2)}`,
        total: scheduledSum + projectedInstallmentSum + projectedRecurringSum,
        month: targetMonth,
        year: targetYear,
      };
    };

    return [
      getForecastForOffset(1),
      getForecastForOffset(2),
      getForecastForOffset(3),
    ];
  }, [transactions, selectedMonth, selectedYear, currentMonthCCTransactions, currentRecurring]);

  // Breakdown by card
  const breakdownByCard = useMemo(() => {
    const map = new Map<string, { total: number; account?: PaymentAccount }>();

    currentMonthCCTransactions.forEach((t) => {
      const cardName = t.account || 'Cartão Padrão';
      const existing = map.get(cardName) || {
        total: 0,
        account: creditCardAccounts.find((a) => a.name === cardName),
      };
      existing.total += t.amount;
      map.set(cardName, existing);
    });

    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      total: data.total,
      account: data.account,
      limit: data.account?.creditLimit || 0,
      closingDay: data.account?.closingDay,
      dueDay: data.account?.dueDay,
    }));
  }, [currentMonthCCTransactions, creditCardAccounts]);

  // Breakdown by family/company member
  const breakdownByMember = useMemo(() => {
    const map = new Map<string, number>();
    currentMonthCCTransactions.forEach((t) => {
      const curr = map.get(t.memberId) || 0;
      map.set(t.memberId, curr + t.amount);
    });
    return Array.from(map.entries())
      .map(([mId, total]) => ({
        member: memberMap.get(mId),
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [currentMonthCCTransactions, memberMap]);

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 md:p-6 mb-8 relative overflow-hidden">
      {/* Top accent badge */}
      <div className="absolute -right-12 -top-12 w-36 h-36 rounded-full bg-gradient-to-br from-indigo-50 to-purple-100/60 pointer-events-none -z-0"></div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Previsão da Fatura do Cartão de Crédito
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {periodName}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Acompanhamento consolidado de compras, parcelas futuras e previsão de fechamento
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={onOpenNewCreditCardTx}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Nova Compra no Cartão
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              {isExpanded ? (
                <>
                  <span>Ocultar Detalhes</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Ver Lançamentos ({currentMonthCCTransactions.length})</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* 4 Cards Row: Current Invoice | Next Month | Active Installments | Cards Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5">
          {/* Card 1: Fatura Atual */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/60 to-purple-50/30 border border-indigo-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-900">
              <span>Fatura Estimada ({periodName.split(' ')[0]})</span>
              <span className="p-1 rounded bg-indigo-100 text-indigo-700">
                <CreditCard className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black font-mono tracking-tight text-indigo-950">
                {formatBRL(currentInvoiceTotal)}
              </div>
              <div className="text-[11px] text-indigo-700 font-medium mt-1 flex items-center gap-1">
                <span>{currentMonthCCTransactions.length} lançamento(s) no cartão</span>
              </div>
            </div>
          </div>

          {/* Card 2: Previsão Próximo Mês */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Previsão Próximo Mês ({futureForecast[0]?.label})</span>
              <span className="p-1 rounded bg-purple-100 text-purple-700">
                <TrendingUp className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black font-mono tracking-tight text-purple-900">
                {formatBRL(futureForecast[0]?.total || 0)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Parcelas ativas + Assinaturas fixas
              </div>
            </div>
          </div>

          {/* Card 3: Parcelas & Recorrências em Curso */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Compras Parceladas & Fixas</span>
              <span className="p-1 rounded bg-amber-100 text-amber-700">
                <Layers className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black font-mono tracking-tight text-slate-800">
                {currentInstallments.length} parcelada{currentInstallments.length !== 1 ? 's' : ''}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <span>{currentRecurring.length} assinatura(s) recorrente(s)</span>
              </div>
            </div>
          </div>

          {/* Card 4: Projeção M+2 e M+3 */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Projeção Futura (M+2 / M+3)</span>
              <span className="p-1 rounded bg-blue-100 text-blue-700">
                <Calendar className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">{futureForecast[1]?.label}:</span>
                <span className="font-mono font-bold text-slate-800">{formatBRL(futureForecast[1]?.total || 0)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">{futureForecast[2]?.label}:</span>
                <span className="font-mono font-bold text-slate-800">{formatBRL(futureForecast[2]?.total || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown by Card & Members */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
          {/* By Card */}
          <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/60">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
              Faturas por Cartão de Crédito
            </h4>
            {breakdownByCard.length === 0 ? (
              <div className="text-xs text-slate-400 py-2">
                Nenhum gasto registrado em cartões no período selecionado.
              </div>
            ) : (
              <div className="space-y-2.5">
                {breakdownByCard.map((item) => {
                  const percentOfLimit =
                    item.limit > 0 ? Math.min(100, Math.round((item.total / item.limit) * 100)) : 0;
                  return (
                    <div key={item.name} className="text-xs">
                      <div className="flex items-center justify-between font-semibold text-slate-800 mb-0.5">
                        <span className="truncate">{item.name}</span>
                        <span className="font-mono font-bold text-indigo-950">{formatBRL(item.total)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>
                          {item.closingDay && item.dueDay
                            ? `Fecha dia ${item.closingDay} • Vence dia ${item.dueDay}`
                            : 'Fatura Mensal'}
                        </span>
                        {item.limit > 0 && (
                          <span>
                            {percentOfLimit}% do limite ({formatBRL(item.limit)})
                          </span>
                        )}
                      </div>
                      {item.limit > 0 && (
                        <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              percentOfLimit > 85 ? 'bg-rose-500' : percentOfLimit > 60 ? 'bg-amber-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${percentOfLimit}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* By Member */}
          <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/60">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-purple-600" />
              Gastos no Cartão por Titular / Membro
            </h4>
            {breakdownByMember.length === 0 ? (
              <div className="text-xs text-slate-400 py-2">
                Nenhum membro com gastos de cartão registrados neste mês.
              </div>
            ) : (
              <div className="space-y-2">
                {breakdownByMember.map(({ member, total }) => {
                  const percentOfInvoice =
                    currentInvoiceTotal > 0 ? Math.round((total / currentInvoiceTotal) * 100) : 0;
                  return (
                    <div key={member?.id || 'unknown'} className="text-xs">
                      <div className="flex items-center justify-between font-semibold text-slate-800">
                        <span className="flex items-center gap-1.5">
                          <span>{member?.avatar || '👤'}</span>
                          <span>{member?.name || 'Geral'}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{formatBRL(total)}</span>
                          <span className="text-[10px] text-slate-400 font-medium">({percentOfInvoice}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-purple-600 transition-all"
                          style={{ width: `${percentOfInvoice}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Expandable Table: Current Month Credit Card Transactions */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Lançamentos que compõem a fatura do período:
            </h4>
            {currentMonthCCTransactions.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-xl">
                Nenhum lançamento no cartão neste mês. Clique em "+ Nova Compra no Cartão" para adicionar.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Data / Vencimento</th>
                      <th className="p-2.5">Descrição</th>
                      <th className="p-2.5">Cartão</th>
                      <th className="p-2.5">Tipo / Parcela</th>
                      <th className="p-2.5">Membro</th>
                      <th className="p-2.5 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {currentMonthCCTransactions.map((t) => {
                      const member = memberMap.get(t.memberId);
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/70">
                          <td className="p-2.5 font-mono text-slate-600 whitespace-nowrap">
                            {formatDateBR(t.dueDate || t.date)}
                          </td>
                          <td className="p-2.5 font-medium text-slate-800">
                            {t.description}
                          </td>
                          <td className="p-2.5 text-slate-600 whitespace-nowrap">
                            {t.account}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            {t.paymentMode === 'parcelado' || (t.installmentTotal && t.installmentTotal > 1) ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Parcela {t.installmentCurrent || 1}/{t.installmentTotal || 1}
                              </span>
                            ) : t.paymentMode === 'recorrente' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                Recorrente 🔁
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500">À Vista</span>
                            )}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            {member ? (
                              <span className="flex items-center gap-1 text-[11px] text-slate-700">
                                <span>{member.avatar}</span>
                                <span>{member.name.split(' ')[0]}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400">Geral</span>
                            )}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatBRL(t.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
