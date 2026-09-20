import React, { useState } from 'react';
import { X, Tags, Plus, Trash2, TrendingUp, TrendingDown, Edit2, AlertCircle } from 'lucide-react';
import { CategoryBudget, ProfileMode } from '../types';
import { formatBRL } from '../services/exportService';

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgets: CategoryBudget[];
  onAddCategory: (category: string, monthlyLimit: number, type?: 'despesa' | 'receita', color?: string) => void;
  onUpdateBudget: (budgetId: string, newLimit: number) => void;
  onDeleteCategory: (id: string) => void;
  profileMode: ProfileMode;
}

const COLOR_OPTIONS = [
  '#3b82f6', // Azul
  '#10b981', // Verde
  '#f59e0b', // Âmbar
  '#ef4444', // Vermelho
  '#8b5cf6', // Roxo
  '#06b6d4', // Ciano
  '#ec4899', // Rosa
  '#64748b', // Slate
];

export const CategoriesModal: React.FC<CategoriesModalProps> = ({
  isOpen,
  onClose,
  budgets,
  onAddCategory,
  onUpdateBudget,
  onDeleteCategory,
  profileMode,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'despesa' | 'receita'>('despesa');
  const [limit, setLimit] = useState('1000');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLimitVal, setEditLimitVal] = useState('');

  if (!isOpen) return null;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const numLimit = parseFloat(limit) || 0;
    onAddCategory(name.trim(), numLimit, type, color);

    setName('');
    setLimit('1000');
    setShowAddForm(false);
  };

  const handleStartEdit = (b: CategoryBudget) => {
    setEditingId(b.id);
    setEditLimitVal(String(b.monthlyLimit));
  };

  const handleSaveEdit = (bId: string) => {
    const val = parseFloat(editLimitVal);
    if (!isNaN(val) && val >= 0) {
      onUpdateBudget(bId, val);
    }
    setEditingId(null);
  };

  const handleDelete = (id: string, catName: string) => {
    if (window.confirm(`Deseja remover a categoria "${catName}"?`)) {
      onDeleteCategory(id);
    }
  };

  const expenseCategories = budgets.filter((b) => b.type === 'despesa');
  const incomeCategories = budgets.filter((b) => b.type === 'receita');

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Tags className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Categorias Financeiras
              </h2>
              <p className="text-xs text-slate-500">
                {profileMode === 'familia' ? 'Categorias da Família' : 'Categorias da Empresa'}: cadastre suas despesas e receitas
              </p>
            </div>
          </div>
          <button
            id="btn-close-categories-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Action to show form */}
          {!showAddForm && (
            <button
              id="btn-show-add-category-form"
              type="button"
              onClick={() => setShowAddForm(true)}
              className="w-full py-3 px-4 border-2 border-dashed border-blue-300 rounded-xl text-blue-700 hover:bg-blue-50/60 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> Cadastrar Nova Categoria
            </button>
          )}

          {/* Add Category Form */}
          {showAddForm && (
            <form
              onSubmit={handleAddSubmit}
              className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                  Cadastrar Nova Categoria
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                >
                  Cancelar
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome da Categoria *
                </label>
                <input
                  id="input-category-name"
                  type="text"
                  required
                  placeholder="Ex: Alimentação, Aluguel, Vendas, Cursos..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setType('despesa')}
                      className={`py-1.5 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1 transition-all ${
                        type === 'despesa'
                          ? 'bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-400'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <TrendingDown className="w-3.5 h-3.5 text-rose-600" /> Despesa
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('receita')}
                      className={`py-1.5 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1 transition-all ${
                        type === 'receita'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 ring-2 ring-emerald-400'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Receita
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {type === 'despesa' ? 'Teto Mensal (R$)' : 'Meta Mensal (R$)'}
                  </label>
                  <input
                    id="input-category-limit"
                    type="number"
                    step="50"
                    placeholder="1000"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cor da Categoria
                </label>
                <div className="flex items-center gap-1.5 mt-1">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        color === c ? 'ring-2 ring-blue-500 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  id="btn-submit-category"
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-xs"
                >
                  Salvar Categoria
                </button>
              </div>
            </form>
          )}

          {/* Categories List */}
          <div className="space-y-4">
            {budgets.length === 0 ? (
              <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Tags className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  Nenhuma categoria cadastrada
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-3">
                  Cadastre categorias personalizadas para classificar suas despesas e receitas.
                </p>
                {!showAddForm && (
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Cadastrar Primeira Categoria
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Despesas */}
                {expenseCategories.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                      Categorias de Despesas ({expenseCategories.length})
                    </h4>
                    <div className="space-y-1.5">
                      {expenseCategories.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: b.color || '#3b82f6' }}
                            />
                            <span className="text-xs font-bold text-slate-800">
                              {b.category}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              • Limite: {formatBRL(b.monthlyLimit)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {editingId === b.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={editLimitVal}
                                  onChange={(e) => setEditLimitVal(e.target.value)}
                                  className="w-16 px-1.5 py-0.5 text-xs border border-blue-400 rounded"
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
                              <button
                                type="button"
                                onClick={() => handleStartEdit(b)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                                title="Editar Teto"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDelete(b.id, b.category)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                              title="Excluir Categoria"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Receitas */}
                {incomeCategories.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                      Categorias de Receitas ({incomeCategories.length})
                    </h4>
                    <div className="space-y-1.5">
                      {incomeCategories.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: b.color || '#10b981' }}
                            />
                            <span className="text-xs font-bold text-slate-800">
                              {b.category}
                            </span>
                            {b.monthlyLimit > 0 && (
                              <span className="text-[11px] text-slate-500">
                                • Meta: {formatBRL(b.monthlyLimit)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDelete(b.id, b.category)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                              title="Excluir Categoria"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>{budgets.length} categoria(s) cadastrada(s)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-semibold bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
