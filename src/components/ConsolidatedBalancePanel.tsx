import React from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CalendarCheck,
  AlertTriangle,
} from 'lucide-react';
import { FinancialSummary } from '../types';
import { formatBRL } from '../services/exportService';

interface ConsolidatedBalancePanelProps {
  summary: FinancialSummary;
  periodName: string;
}

export const ConsolidatedBalancePanel: React.FC<ConsolidatedBalancePanelProps> = ({
  summary,
  periodName,
}) => {
  const isSaldoAtualPositive = summary.saldoAtual >= 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 md:p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-100 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Painel de Controle Consolidado em Tempo Real
            </h2>
          </div>
          <p className="text-xl font-extrabold text-slate-900 mt-0.5">
            Fluxo Financeiro • {periodName}
          </p>
        </div>

        {summary.faturasVencidasCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span>
              {summary.faturasVencidasCount} conta{summary.faturasVencidasCount > 1 ? 's' : ''} vencida{summary.faturasVencidasCount > 1 ? 's' : ''}! ({formatBRL(summary.faturasVencidasTotal)})
            </span>
          </div>
        )}
      </div>

      {/* Main Grid: Saldo Atual | Total de Entradas | Total de Saídas | Contas a Pagar | Contas a Receber */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mt-5">
        
        {/* 1. Saldo Atual */}
        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Saldo Atual</span>
            <div className={`p-1.5 rounded-lg ${isSaldoAtualPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div
              className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                isSaldoAtualPositive ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {formatBRL(summary.saldoAtual)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Entradas − Saídas pagas
            </div>
          </div>
        </div>

        {/* 2. Total de Entradas */}
        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Total de Entradas</span>
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-emerald-600">
              {formatBRL(summary.entradasTotal)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Receitas realizadas
            </div>
          </div>
        </div>

        {/* 3. Total de Saídas */}
        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Total de Saídas</span>
            <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-rose-600">
              {formatBRL(summary.saidasTotal)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Despesas já pagas
            </div>
          </div>
        </div>

        {/* 4. Contas a Pagar */}
        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Contas a Pagar</span>
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-amber-700">
              {formatBRL(summary.faltaPagarTotal)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {summary.faturasVencidasCount > 0 ? (
                <span className="text-red-600 font-semibold">
                  {summary.faturasVencidasCount} conta{summary.faturasVencidasCount > 1 ? 's' : ''} em atraso
                </span>
              ) : (
                'Despesas a vencer'
              )}
            </div>
          </div>
        </div>

        {/* 5. Contas a Receber */}
        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Contas a Receber</span>
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-blue-700">
              {formatBRL(summary.faltaReceberTotal)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Receitas previstas
            </div>
          </div>
        </div>

      </div>

      {/* Mini Summary Formula Bar */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-700">Demonstrativo:</span>
          <span>Saldo Atual: <strong className={isSaldoAtualPositive ? 'text-emerald-700' : 'text-rose-700'}>{formatBRL(summary.saldoAtual)}</strong></span>
          <span>•</span>
          <span>Entradas: <strong className="text-emerald-700">{formatBRL(summary.entradasTotal)}</strong></span>
          <span>•</span>
          <span>Saídas: <strong className="text-rose-700">{formatBRL(summary.saidasTotal)}</strong></span>
          <span>•</span>
          <span>A Pagar: <strong className="text-amber-700">{formatBRL(summary.faltaPagarTotal)}</strong></span>
          <span>•</span>
          <span>A Receber: <strong className="text-blue-700">{formatBRL(summary.faltaReceberTotal)}</strong></span>
        </div>
        <div className="text-[11px] text-slate-400">
          Atualizado em tempo real com base nos lançamentos do período
        </div>
      </div>
    </div>
  );
};
