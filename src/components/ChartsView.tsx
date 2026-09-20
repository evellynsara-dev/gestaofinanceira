import React, { useState } from 'react';
import {
  BarChart3,
  PieChart as PieChartIcon,
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Transaction, Member, CategoryBudget } from '../types';
import { formatBRL } from '../services/exportService';

interface ChartsViewProps {
  transactions: Transaction[];
  members: Member[];
  budgets: CategoryBudget[];
}

export const ChartsView: React.FC<ChartsViewProps> = ({
  transactions,
  members,
  budgets,
}) => {
  const [activeTab, setActiveTab] = useState<'categorias' | 'membros' | 'orcado'>('categorias');

  const memberMap = new Map(members.map((m) => [m.id, m]));

  // Categorias de saída
  const despesasPorCategoria: Record<string, number> = {};
  transactions
    .filter((t) => t.type === 'saida' || t.type === 'falta_pagar')
    .forEach((t) => {
      despesasPorCategoria[t.category] = (despesasPorCategoria[t.category] || 0) + t.amount;
    });

  const totalDespesas = Object.values(despesasPorCategoria).reduce((a, b) => a + b, 0);

  const sortedCategorias = Object.entries(despesasPorCategoria)
    .map(([cat, val]) => ({
      category: cat,
      amount: val,
      percent: totalDespesas > 0 ? (val / totalDespesas) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Gastos por membro da família/empresa
  const gastosPorMembro: Record<string, { name: string; amount: number; color: string; avatar: string }> = {};
  members.forEach((m) => {
    gastosPorMembro[m.id] = {
      name: m.name,
      amount: 0,
      color: m.color,
      avatar: m.avatar,
    };
  });

  transactions
    .filter((t) => t.type === 'saida' || t.type === 'falta_pagar')
    .forEach((t) => {
      if (gastosPorMembro[t.memberId]) {
        gastosPorMembro[t.memberId].amount += t.amount;
      }
    });

  const sortedMembros = Object.values(gastosPorMembro)
    .map((m) => ({
      ...m,
      percent: totalDespesas > 0 ? (m.amount / totalDespesas) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Totais para mini-gráfico comparativo
  const totalEntradas = transactions
    .filter((t) => t.type === 'entrada')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalFaltaReceber = transactions
    .filter((t) => t.type === 'falta_receber')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalSaidas = transactions
    .filter((t) => t.type === 'saida')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalFaltaPagar = transactions
    .filter((t) => t.type === 'falta_pagar')
    .reduce((acc, t) => acc + t.amount, 0);

  const maxBarValue = Math.max(totalEntradas + totalFaltaReceber, totalSaidas + totalFaltaPagar, 1);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 md:p-6 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              Gráficos de Acompanhamento Financeiro
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Visualize a evolução do fluxo e a divisão de gastos compartilhados
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('categorias')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTab === 'categorias'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Por Categoria
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('membros')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTab === 'membros'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Por Membro
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orcado')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTab === 'orcado'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Orçado vs Realizado
          </button>
        </div>
      </div>

      {/* Main Comparative Bar Chart */}
      <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200/60">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Comparativo Global de Receitas vs Despesas
        </h4>
        <div className="space-y-3">
          {/* Receitas Bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-emerald-800 flex items-center gap-1">
                <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
                Receitas Totais (Recebidas + Falta Receber)
              </span>
              <span className="font-mono font-bold text-emerald-700">
                {formatBRL(totalEntradas + totalFaltaReceber)}
              </span>
            </div>
            <div className="w-full h-4 bg-slate-200 rounded-full flex overflow-hidden">
              <div
                className="bg-emerald-600 h-full transition-all"
                style={{ width: `${(totalEntradas / maxBarValue) * 100}%` }}
                title={`Entradas Realizadas: ${formatBRL(totalEntradas)}`}
              ></div>
              <div
                className="bg-emerald-300 h-full transition-all"
                style={{ width: `${(totalFaltaReceber / maxBarValue) * 100}%` }}
                title={`Falta Receber: ${formatBRL(totalFaltaReceber)}`}
              ></div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
              <span>Realizadas: {formatBRL(totalEntradas)}</span>
              <span>A Receber: {formatBRL(totalFaltaReceber)}</span>
            </div>
          </div>

          {/* Despesas Bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-rose-800 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                Despesas Totais (Pagas + Falta Pagar)
              </span>
              <span className="font-mono font-bold text-rose-700">
                {formatBRL(totalSaidas + totalFaltaPagar)}
              </span>
            </div>
            <div className="w-full h-4 bg-slate-200 rounded-full flex overflow-hidden">
              <div
                className="bg-rose-600 h-full transition-all"
                style={{ width: `${(totalSaidas / maxBarValue) * 100}%` }}
                title={`Saídas Pagas: ${formatBRL(totalSaidas)}`}
              ></div>
              <div
                className="bg-amber-400 h-full transition-all"
                style={{ width: `${(totalFaltaPagar / maxBarValue) * 100}%` }}
                title={`Falta Pagar: ${formatBRL(totalFaltaPagar)}`}
              ></div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
              <span>Pagas: {formatBRL(totalSaidas)}</span>
              <span>A Pagar: {formatBRL(totalFaltaPagar)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Tab Content */}
      {activeTab === 'categorias' && (
        <div>
          <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center justify-between">
            <span>Composição dos Gastos por Categoria</span>
            <span className="text-slate-400 font-normal">Total: {formatBRL(totalDespesas)}</span>
          </h4>
          <div className="space-y-3">
            {sortedCategorias.map((item, idx) => {
              const colors = ['#2563eb', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#64748b'];
              const color = colors[idx % colors.length];

              return (
                <div key={item.category} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></span>
                      <span className="font-medium text-slate-800">{item.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px] font-mono">{item.percent.toFixed(1)}%</span>
                      <span className="font-mono font-bold text-slate-800">{formatBRL(item.amount)}</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${item.percent}%`, backgroundColor: color }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'membros' && (
        <div>
          <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center justify-between">
            <span>Divisão de Gastos entre os Membros</span>
            <span className="text-slate-400 font-normal">Total: {formatBRL(totalDespesas)}</span>
          </h4>
          <div className="space-y-3">
            {sortedMembros.map((m) => (
              <div key={m.name} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{m.avatar}</span>
                    <span className="font-semibold text-slate-800">{m.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px] font-mono">{m.percent.toFixed(1)}%</span>
                    <span className="font-mono font-bold text-slate-800">{formatBRL(m.amount)}</span>
                  </div>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${m.percent}%`, backgroundColor: m.color }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'orcado' && (
        <div>
          <h4 className="text-xs font-bold text-slate-700 mb-3">
            Comparação: Limite Orçado vs Gasto Realizado
          </h4>
          <div className="space-y-3">
            {budgets
              .filter((b) => b.type === 'despesa')
              .map((b) => {
                const spent = transactions
                  .filter((t) => t.category === b.category && (t.type === 'saida' || t.type === 'falta_pagar'))
                  .reduce((acc, curr) => acc + curr.amount, 0);

                const maxVal = Math.max(b.monthlyLimit, spent, 1);
                const isOver = spent > b.monthlyLimit;

                return (
                  <div key={b.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-800">{b.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">
                          Orçado: <strong className="font-mono">{formatBRL(b.monthlyLimit)}</strong>
                        </span>
                        <span>•</span>
                        <span className={`text-[11px] font-bold ${isOver ? 'text-red-600' : 'text-emerald-700'}`}>
                          Gasto: {formatBRL(spent)}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <div className="text-[10px] text-slate-400 mb-0.5">Teto Limite</div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${(b.monthlyLimit / maxVal) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 mb-0.5">Realizado</div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isOver ? 'bg-red-600' : 'bg-emerald-600'}`}
                            style={{ width: `${(spent / maxVal) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
