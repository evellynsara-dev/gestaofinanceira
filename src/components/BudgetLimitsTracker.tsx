import React, { useState } from 'react';
import {
  Target,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Plus,
  TrendingDown,
  ShieldCheck,
} from 'lucide-react';
import { CategoryBudget, Transaction } from '../types';
import { formatBRL } from '../services/exportService';

interface BudgetLimitsTrackerProps {
  budgets: CategoryBudget[];
  transactions: Transaction[];
  onUpdateBudget: (budgetId: string, newLimit: number) => void;
  onAddCategory: (category: string, limit: number) => void;
}

export const BudgetLimitsTracker: React.FC<BudgetLimitsTrackerProps> = ({
  budgets,
  transactions,
  onUpdateBudget,
  onAddCategory,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempLimit, setTempLimit] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatLimit, setNewCatLimit] = useState('');

  // Only expense categories have budget limits
  const expenseBudgets = budgets.filter((b) => b.type === 'despesa');

  const handleStartEdit = (b: CategoryBudget) => {
    setEditingId(b.id);
    setTempLimit(String(b.monthlyLimit));
  };

  const handleSaveEdit = (bId: string) => {
    const val = parseFloat(tempLimit);
    if (!isNaN(val) && val >= 0) {
      onUpdateBudget(bId, val);
    }
    setEditingId(null);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const limit = parseFloat(newCatLimit) || 1000;
    onAddCategory(newCatName.trim(), limit);
    setNewCatName('');
    setNewCatLimit('');
    setShowAddModal(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 md:p-6 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">
              Limites de Orçamento por Categoria
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Defina tetos mensais de gastos para manter as despesas familiares ou empresariais sob controle
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" /> Nova Categoria
        </button>
      </div>

      {/* Grid of Budget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
        {expenseBudgets.map((b) => {
          // Total spent: saídas + falta pagar (já comprometido no mês)
          const spent = transactions
            .filter((t) => t.category === b.category && (t.type === 'saida' || t.type === 'falta_pagar'))
            .reduce((acc, curr) => acc + curr.amount, 0);

          const percent = b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0;
          const isOverLimit = percent > 100;
          const isWarning = percent >= 80 && percent <= 100;
          const remaining = b.monthlyLimit - spent;

          return (
            <div
              key={b.id}
              className={`p-4 rounded-xl border transition-all ${
                isOverLimit
                  ? 'bg-red-50/40 border-red-200 shadow-xs'
                  : isWarning
                  ? 'bg-amber-50/40 border-amber-200 shadow-xs'
                  : 'bg-slate-50/60 border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 truncate">
                    {b.category}
                  </h4>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Gasto + Comprometido: <strong className="font-mono text-slate-700">{formatBRL(spent)}</strong>
                  </div>
                </div>

                {isOverLimit ? (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                    <AlertTriangle className="w-3 h-3" /> Estourado!
                  </span>
                ) : isWarning ? (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    Atenção (80%+)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                    <ShieldCheck className="w-3 h-3" /> No Limite
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-2 mt-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isOverLimit ? 'bg-red-600' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, percent)}%` }}
                ></div>
              </div>

              {/* Limit Edit & Remaining */}
              <div className="flex items-center justify-between mt-3 text-xs pt-2 border-t border-slate-100">
                <div>
                  {editingId === b.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-slate-400">R$</span>
                      <input
                        type="number"
                        value={tempLimit}
                        onChange={(e) => setTempLimit(e.target.value)}
                        className="w-20 px-1.5 py-0.5 text-xs border border-blue-400 rounded bg-white"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(b.id)}
                        className="px-1.5 py-0.5 text-[10px] bg-blue-600 text-white rounded font-bold"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 text-[11px]">Teto:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {formatBRL(b.monthlyLimit)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(b)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded"
                        title="Alterar Limite de Orçamento"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-right text-[11px]">
                  {remaining >= 0 ? (
                    <span className="text-emerald-700 font-medium">
                      Sobra: <strong className="font-mono">{formatBRL(remaining)}</strong>
                    </span>
                  ) : (
                    <span className="text-red-600 font-bold">
                      Excesso: <strong className="font-mono">-{formatBRL(Math.abs(remaining))}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add Category */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-5">
            <h4 className="text-sm font-bold text-slate-900 mb-3">
              Definir Novo Orçamento de Categoria
            </h4>
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Assinaturas & Streaming, Pet Shop, etc."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Limite Mensal Máximo (R$)
                </label>
                <input
                  type="number"
                  required
                  step="50"
                  placeholder="Ex: 800"
                  value={newCatLimit}
                  onChange={(e) => setNewCatLimit(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Salvar Limite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
