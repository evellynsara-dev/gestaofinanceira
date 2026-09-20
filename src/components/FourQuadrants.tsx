import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CalendarCheck,
  Plus,
  AlertCircle,
  Check,
  Tag,
  AlertTriangle,
  MoreVertical,
} from 'lucide-react';
import { Transaction, Member, TransactionType } from '../types';
import { formatBRL, formatDateBR } from '../services/exportService';

interface FourQuadrantsProps {
  transactions: Transaction[];
  members: Member[];
  onOpenNewTransactionForType: (type: TransactionType) => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onMarkAsPaid: (id: string) => void;
  onMarkAsReceived: (id: string) => void;
}

export const FourQuadrants: React.FC<FourQuadrantsProps> = ({
  transactions,
  members,
  onOpenNewTransactionForType,
  onEditTransaction,
  onDeleteTransaction,
  onMarkAsPaid,
  onMarkAsReceived,
}) => {
  const memberMap = new Map(members.map((m) => [m.id, m]));

  const entradas = transactions.filter((t) => t.type === 'entrada');
  const saidas = transactions.filter((t) => t.type === 'saida');
  const faltaPagar = transactions.filter((t) => t.type === 'falta_pagar');
  const faltaReceber = transactions.filter((t) => t.type === 'falta_receber');

  const totalEntradas = entradas.reduce((acc, t) => acc + t.amount, 0);
  const totalSaidas = saidas.reduce((acc, t) => acc + t.amount, 0);
  const totalFaltaPagar = faltaPagar.reduce((acc, t) => acc + t.amount, 0);
  const totalFaltaReceber = faltaReceber.reduce((acc, t) => acc + t.amount, 0);

  // Helper for due status
  const getDueStatusBadge = (dueDate?: string) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = dueDate.split('-').map(Number);
    const due = new Date(y, m - 1, d);
    due.setHours(0, 0, 0, 0);

    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
          <AlertTriangle className="w-2.5 h-2.5" />
          Atrasado ({Math.abs(diff)}d)
        </span>
      );
    } else if (diff === 0) {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
          ⏰ Vence Hoje!
        </span>
      );
    } else if (diff <= 3) {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
          Vence em {diff}d
        </span>
      );
    }
    return (
      <span className="text-[10px] text-slate-500">
        Venc.: {formatDateBR(dueDate)}
      </span>
    );
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Os Quatro Quadros Financeiros
          </h3>
          <p className="text-xs text-slate-500">
            Acompanhamento centralizado e registro compartilhado entre membros
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* QUADRO 1: ENTRADAS */}
        <div className="bg-white rounded-xl border border-emerald-200 shadow-xs flex flex-col h-[460px] overflow-hidden">
          {/* Header */}
          <div className="p-3.5 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                  1. Entradas (Recebidas)
                </h4>
                <div className="text-lg font-black font-mono text-emerald-700">
                  {formatBRL(totalEntradas)}
                </div>
              </div>
            </div>
            <button
              id="btn-add-entrada"
              type="button"
              onClick={() => onOpenNewTransactionForType('entrada')}
              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1 transition-colors"
              title="Nova Entrada"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-slate-100">
            {entradas.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Nenhuma entrada registrada neste mês.
              </div>
            ) : (
              entradas.map((t) => {
                const member = memberMap.get(t.memberId);
                return (
                  <div key={t.id} className="pt-2 first:pt-0 group">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-slate-800 truncate">
                          {t.description}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 flex-wrap">
                          <span className="inline-flex items-center gap-0.5 text-slate-600">
                            <Tag className="w-2.5 h-2.5 text-slate-400" />
                            {t.category}
                          </span>
                          {member && (
                            <span
                              className="px-1.5 py-0.2 rounded text-[10px] font-medium"
                              style={{ backgroundColor: `${member.color}15`, color: member.color }}
                            >
                              {member.avatar} {member.name.split(' ')[0]}
                            </span>
                          )}
                          <span className="text-slate-400">{formatDateBR(t.date)}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-xs text-emerald-600">
                          +{formatBRL(t.amount)}
                        </div>
                        <button
                          type="button"
                          onClick={() => onEditTransaction(t)}
                          className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-400 hover:text-slate-700 transition-opacity"
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="p-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 text-center font-medium">
            {entradas.length} lançamento{entradas.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* QUADRO 2: SAÍDAS */}
        <div className="bg-white rounded-xl border border-rose-200 shadow-xs flex flex-col h-[460px] overflow-hidden">
          {/* Header */}
          <div className="p-3.5 bg-rose-50/70 border-b border-rose-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-950">
                  2. Saídas (Pagas)
                </h4>
                <div className="text-lg font-black font-mono text-rose-700">
                  {formatBRL(totalSaidas)}
                </div>
              </div>
            </div>
            <button
              id="btn-add-saida"
              type="button"
              onClick={() => onOpenNewTransactionForType('saida')}
              className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs flex items-center gap-1 transition-colors"
              title="Nova Saída"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-slate-100">
            {saidas.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Nenhuma despesa paga registrada.
              </div>
            ) : (
              saidas.map((t) => {
                const member = memberMap.get(t.memberId);
                return (
                  <div key={t.id} className="pt-2 first:pt-0 group">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-slate-800 truncate">
                          {t.description}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 flex-wrap">
                          <span className="inline-flex items-center gap-0.5 text-slate-600">
                            <Tag className="w-2.5 h-2.5 text-slate-400" />
                            {t.category}
                          </span>
                          {member && (
                            <span
                              className="px-1.5 py-0.2 rounded text-[10px] font-medium"
                              style={{ backgroundColor: `${member.color}15`, color: member.color }}
                            >
                              {member.avatar} {member.name.split(' ')[0]}
                            </span>
                          )}
                          <span className="text-slate-400">{formatDateBR(t.paidDate || t.date)}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-xs text-rose-600">
                          -{formatBRL(t.amount)}
                        </div>
                        <button
                          type="button"
                          onClick={() => onEditTransaction(t)}
                          className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-400 hover:text-slate-700 transition-opacity"
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="p-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 text-center font-medium">
            {saidas.length} pagamento{saidas.length !== 1 ? 's' : ''} efetuado{saidas.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* QUADRO 3: FALTA PAGAR (Contas a Vencer & Atrasadas com Alerta) */}
        <div className="bg-white rounded-xl border border-amber-300 shadow-xs flex flex-col h-[460px] overflow-hidden">
          {/* Header */}
          <div className="p-3.5 bg-amber-50/80 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950">
                  3. Falta Pagar (A Vencer)
                </h4>
                <div className="text-lg font-black font-mono text-amber-700">
                  {formatBRL(totalFaltaPagar)}
                </div>
              </div>
            </div>
            <button
              id="btn-add-falta-pagar"
              type="button"
              onClick={() => onOpenNewTransactionForType('falta_pagar')}
              className="p-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs flex items-center gap-1 transition-colors"
              title="Nova Conta a Pagar"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-slate-100">
            {faltaPagar.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Tudo em dia! Nenhuma conta pendente para pagar.
              </div>
            ) : (
              faltaPagar.map((t) => {
                const member = memberMap.get(t.memberId);
                const isOverdue = t.status === 'atrasado';
                return (
                  <div key={t.id} className="pt-2 first:pt-0 group">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-slate-800 truncate flex items-center gap-1.5">
                          {t.description}
                        </div>

                        {/* Due status badge & penalty warning */}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {getDueStatusBadge(t.dueDate)}
                          {t.finePenaltyEstimated && t.finePenaltyEstimated > 0 ? (
                            <span className="text-[10px] text-red-600 font-semibold">
                              Multa est.: {formatBRL(t.finePenaltyEstimated)}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                          {member && (
                            <span
                              className="px-1.5 py-0.2 rounded text-[10px] font-medium"
                              style={{ backgroundColor: `${member.color}15`, color: member.color }}
                            >
                              {member.avatar} {member.name.split(' ')[0]}
                            </span>
                          )}
                          <span className="text-slate-400 truncate">{t.account}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end">
                        <div className="font-mono font-bold text-xs text-amber-700">
                          {formatBRL(t.amount)}
                        </div>
                        {/* Action: Pagar Agora */}
                        <button
                          type="button"
                          onClick={() => onMarkAsPaid(t.id)}
                          className="mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-0.5 transition-colors shadow-xs"
                          title="Marcar como Pago (Move para Saídas)"
                        >
                          <Check className="w-2.5 h-2.5" /> Pagar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="p-2 bg-amber-50/50 border-t border-amber-200 text-[11px] text-amber-800 text-center font-medium">
            {faltaPagar.length} fatura{faltaPagar.length !== 1 ? 's' : ''} pendente{faltaPagar.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* QUADRO 4: FALTA RECEBER */}
        <div className="bg-white rounded-xl border border-blue-200 shadow-xs flex flex-col h-[460px] overflow-hidden">
          {/* Header */}
          <div className="p-3.5 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-950">
                  4. Falta Receber (Esperadas)
                </h4>
                <div className="text-lg font-black font-mono text-blue-700">
                  {formatBRL(totalFaltaReceber)}
                </div>
              </div>
            </div>
            <button
              id="btn-add-falta-receber"
              type="button"
              onClick={() => onOpenNewTransactionForType('falta_receber')}
              className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center gap-1 transition-colors"
              title="Novo Valor a Receber"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-slate-100">
            {faltaReceber.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Nenhum valor a receber previsto no momento.
              </div>
            ) : (
              faltaReceber.map((t) => {
                const member = memberMap.get(t.memberId);
                return (
                  <div key={t.id} className="pt-2 first:pt-0 group">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-slate-800 truncate">
                          {t.description}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 flex-wrap">
                          <span className="text-[10px] text-blue-700 font-medium">
                            Previsto: {formatDateBR(t.dueDate || t.date)}
                          </span>
                          {member && (
                            <span
                              className="px-1.5 py-0.2 rounded text-[10px] font-medium"
                              style={{ backgroundColor: `${member.color}15`, color: member.color }}
                            >
                              {member.avatar} {member.name.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end">
                        <div className="font-mono font-bold text-xs text-blue-700">
                          {formatBRL(t.amount)}
                        </div>
                        {/* Action: Receber Agora */}
                        <button
                          type="button"
                          onClick={() => onMarkAsReceived(t.id)}
                          className="mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-0.5 transition-colors shadow-xs"
                          title="Marcar como Recebido (Move para Entradas)"
                        >
                          <Check className="w-2.5 h-2.5" /> Receber
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="p-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 text-center font-medium">
            {faltaReceber.length} previsão{faltaReceber.length !== 1 ? 'ões' : ''} de receita
          </div>
        </div>

      </div>
    </div>
  );
};
