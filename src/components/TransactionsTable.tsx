import React, { useState } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  Tag,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { Transaction, Member, TransactionType, CategoryBudget } from '../types';
import { formatBRL, formatDateBR } from '../services/exportService';

interface TransactionsTableProps {
  transactions: Transaction[];
  members: Member[];
  budgets: CategoryBudget[];
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onMarkAsPaid: (id: string) => void;
  onMarkAsReceived: (id: string) => void;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  members,
  budgets,
  onEditTransaction,
  onDeleteTransaction,
  onMarkAsPaid,
  onMarkAsReceived,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('todos');
  const [selectedMember, setSelectedMember] = useState<string>('todos');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'description'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const memberMap = new Map(members.map((m) => [m.id, m]));

  const filtered = transactions.filter((t) => {
    // Quadrant / Type Filter
    if (selectedType !== 'todos' && t.type !== selectedType) return false;
    // Member Filter
    if (selectedMember !== 'todos' && t.memberId !== selectedMember) return false;
    // Category Filter
    if (selectedCategory !== 'todos' && t.category !== selectedCategory) return false;
    // Search Term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchCat = t.category.toLowerCase().includes(q);
      const matchNotes = (t.notes || '').toLowerCase().includes(q);
      const matchAcc = (t.account || '').toLowerCase().includes(q);
      if (!matchDesc && !matchCat && !matchNotes && !matchAcc) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortField === 'date') {
      const dateA = a.dueDate || a.date;
      const dateB = b.dueDate || b.date;
      return sortOrder === 'desc' ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
    }
    if (sortField === 'amount') {
      return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
    }
    return sortOrder === 'desc'
      ? b.description.localeCompare(a.description)
      : a.description.localeCompare(b.description);
  });

  const handleSort = (field: 'date' | 'amount' | 'description') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const categories = Array.from(new Set(transactions.map((t) => t.category)));

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 md:p-6 mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Registro Geral de Lançamentos
          </h3>
          <p className="text-xs text-slate-500">
            Pesquise, filtre e audite todos os lançamentos compartilhados
          </p>
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Exibindo {sorted.length} de {transactions.length} registros
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-4">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por descrição, conta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 bg-slate-50/50"
          />
        </div>

        {/* Quadrant filter */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 bg-slate-50/50 text-slate-700"
        >
          <option value="todos">Todos os Quadros</option>
          <option value="entrada">🟢 Entradas (Recebidas)</option>
          <option value="saida">🔴 Saídas (Pagas)</option>
          <option value="falta_pagar">🟠 Falta Pagar (A Vencer)</option>
          <option value="falta_receber">🔵 Falta Receber (Esperadas)</option>
        </select>

        {/* Member filter */}
        <select
          value={selectedMember}
          onChange={(e) => setSelectedMember(e.target.value)}
          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 bg-slate-50/50 text-slate-700"
        >
          <option value="todos">Todos os Membros</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.avatar} {m.name}
            </option>
          ))}
        </select>

        {/* Category filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 bg-slate-50/50 text-slate-700"
        >
          <option value="todos">Todas as Categorias</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <th
                onClick={() => handleSort('date')}
                className="p-3 cursor-pointer hover:text-slate-900 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  Data/Vencimento
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('description')}
                className="p-3 cursor-pointer hover:text-slate-900 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Descrição & Detalhes
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="p-3">Quadro</th>
              <th className="p-3">Categoria</th>
              <th className="p-3">Membro</th>
              <th className="p-3">Status</th>
              <th
                onClick={() => handleSort('amount')}
                className="p-3 text-right cursor-pointer hover:text-slate-900 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  Valor
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="p-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                  Nenhum registro encontrado com os filtros selecionados.
                </td>
              </tr>
            ) : (
              sorted.map((t) => {
                const member = memberMap.get(t.memberId);
                const isOverdue = t.status === 'atrasado';

                return (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors group">
                    {/* Date / Due Date */}
                    <td className="p-3 whitespace-nowrap font-mono text-slate-600">
                      {formatDateBR(t.dueDate || t.date)}
                      {t.dueDate && (
                        <div className="text-[10px] text-slate-400">
                          {t.type === 'falta_pagar' ? 'Vencimento' : 'Lançamento'}
                        </div>
                      )}
                    </td>

                    {/* Description & Details */}
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-800">{t.description}</span>
                        {t.paymentMode === 'parcelado' && t.installmentTotal && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {t.installmentCurrent}/{t.installmentTotal}
                          </span>
                        )}
                        {t.paymentMode === 'recorrente' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            🔁 Recorrente
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{t.account}</span>
                        {t.finePenaltyEstimated && t.finePenaltyEstimated > 0 ? (
                          <span className="text-red-600 font-semibold">
                            • Multa: {formatBRL(t.finePenaltyEstimated)}
                          </span>
                        ) : null}
                        {t.notes && <span className="truncate max-w-[200px]">• {t.notes}</span>}
                      </div>
                    </td>

                    {/* Quadrant Badge */}
                    <td className="p-3 whitespace-nowrap">
                      {t.type === 'entrada' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Entrada
                        </span>
                      )}
                      {t.type === 'saida' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Saída
                        </span>
                      )}
                      {t.type === 'falta_pagar' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Falta Pagar
                        </span>
                      )}
                      {t.type === 'falta_receber' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Falta Receber
                        </span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="p-3 whitespace-nowrap text-slate-600 font-medium">
                      {t.category}
                    </td>

                    {/* Member */}
                    <td className="p-3 whitespace-nowrap">
                      {member ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium"
                          style={{ backgroundColor: `${member.color}15`, color: member.color }}
                        >
                          <span>{member.avatar}</span>
                          <span>{member.name.split(' ')[0]}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">Geral</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-3 whitespace-nowrap">
                      {t.status === 'pago' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle className="w-3 h-3" /> Concluído
                        </span>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 animate-pulse">
                          <AlertTriangle className="w-3 h-3" /> ATRASADO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                          <Clock className="w-3 h-3" /> Pendente
                        </span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="p-3 text-right whitespace-nowrap font-mono font-bold">
                      <span
                        className={
                          t.type === 'entrada'
                            ? 'text-emerald-600'
                            : t.type === 'saida'
                            ? 'text-rose-600'
                            : t.type === 'falta_pagar'
                            ? 'text-amber-700'
                            : 'text-blue-700'
                        }
                      >
                        {t.type === 'entrada' ? '+' : t.type === 'saida' ? '-' : ''}
                        {formatBRL(t.amount)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {t.type === 'falta_pagar' && (
                          <button
                            type="button"
                            onClick={() => onMarkAsPaid(t.id)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-semibold transition-colors"
                            title="Marcar como Pago"
                          >
                            Pagar
                          </button>
                        )}
                        {t.type === 'falta_receber' && (
                          <button
                            type="button"
                            onClick={() => onMarkAsReceived(t.id)}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-semibold transition-colors"
                            title="Marcar como Recebido"
                          >
                            Receber
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onEditTransaction(t)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                          title="Editar Lançamento"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Deseja excluir "${t.description}"?`)) {
                              onDeleteTransaction(t.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors"
                          title="Excluir Lançamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
