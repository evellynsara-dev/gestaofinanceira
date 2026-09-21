import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Calendar,
  AlertTriangle,
  User,
  Tag,
  CreditCard,
  FileText,
  Clock,
  Repeat,
  Layers,
  Check,
  Building2,
  Wallet,
} from 'lucide-react';
import {
  Transaction,
  TransactionType,
  Member,
  CategoryBudget,
  PaymentAccount,
  PaymentMode,
} from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    transaction: Omit<Transaction, 'id'> | Omit<Transaction, 'id'>[],
    id?: string
  ) => void;
  editingTransaction?: Transaction | null;
  defaultType?: TransactionType;
  defaultAccount?: string;
  members: Member[];
  budgets: CategoryBudget[];
  accounts: PaymentAccount[];
  onAddCategory?: (category: string, limit: number) => void;
  onAddAccount?: (account: PaymentAccount) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTransaction,
  defaultType = 'saida',
  defaultAccount,
  members,
  budgets,
  accounts,
  onAddCategory,
  onAddAccount,
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>(defaultType);
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [memberId, setMemberId] = useState(members[0]?.id || '');
  const [account, setAccount] = useState('Conta Principal');
  const [notes, setNotes] = useState('');
  const [finePenaltyEstimated, setFinePenaltyEstimated] = useState('');
  const [invoiceBarcode, setInvoiceBarcode] = useState('');

  // Payment mode: Único | Recorrente | Parcelado
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('unico');
  const [installmentCurrent, setInstallmentCurrent] = useState(1);
  const [installmentTotal, setInstallmentTotal] = useState(2);
  const [installmentPricingMode, setInstallmentPricingMode] = useState<'total' | 'parcela'>('total');
  const [generateFutureInstallments, setGenerateFutureInstallments] = useState(true);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'mensal' | 'anual' | 'semanal'>('mensal');

  // Inline Category Creator/Editor
  const [showAddCategoryInline, setShowAddCategoryInline] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatLimit, setNewCatLimit] = useState('1000');

  // Inline Account Creator/Editor
  const [showAddAccountInline, setShowAddAccountInline] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<PaymentAccount['type']>('cartao_credito');
  const [newAccClosingDay, setNewAccClosingDay] = useState('15');
  const [newAccDueDay, setNewAccDueDay] = useState('22');
  const [newAccLimit, setNewAccLimit] = useState('5000');

  useEffect(() => {
    if (editingTransaction) {
      setDescription(editingTransaction.description);
      setAmount(String(editingTransaction.amount));
      setType(editingTransaction.type);
      setCategory(editingTransaction.category);
      setDate(editingTransaction.date);
      setDueDate(editingTransaction.dueDate || '');
      setMemberId(editingTransaction.memberId);
      setAccount(editingTransaction.account);
      setNotes(editingTransaction.notes || '');
      setFinePenaltyEstimated(
        editingTransaction.finePenaltyEstimated ? String(editingTransaction.finePenaltyEstimated) : ''
      );
      setInvoiceBarcode(editingTransaction.invoiceBarcode || '');

      setPaymentMode(editingTransaction.paymentMode || 'unico');
      setInstallmentCurrent(editingTransaction.installmentCurrent || 1);
      setInstallmentTotal(editingTransaction.installmentTotal || 2);
      setRecurrenceFrequency(editingTransaction.recurrenceFrequency || 'mensal');
      setGenerateFutureInstallments(false);
    } else {
      setDescription('');
      setAmount('');
      setType(defaultType);
      const filteredBudgets = budgets.filter((b) =>
        defaultType === 'entrada' || defaultType === 'falta_receber'
          ? b.type === 'receita'
          : b.type === 'despesa'
      );
      setCategory(filteredBudgets[0]?.category || budgets[0]?.category || '');
      setDate(new Date().toISOString().split('T')[0]);
      setDueDate(defaultType === 'falta_pagar' ? new Date().toISOString().split('T')[0] : '');
      setMemberId(members[0]?.id || '');
      setAccount(defaultAccount || accounts[0]?.name || '');
      setNotes('');
      setFinePenaltyEstimated('');
      setInvoiceBarcode('');

      setPaymentMode('unico');
      setInstallmentCurrent(1);
      setInstallmentTotal(2);
      setInstallmentPricingMode('total');
      setGenerateFutureInstallments(true);
      setRecurrenceFrequency('mensal');
    }

    setShowAddCategoryInline(false);
    setShowAddAccountInline(false);
  }, [editingTransaction, defaultType, defaultAccount, isOpen, members, budgets, accounts]);

  if (!isOpen) return null;

  // Quick category creation
  const handleSaveInlineCategory = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const limit = parseFloat(newCatLimit) || 1000;
    if (onAddCategory) {
      onAddCategory(newCatName.trim(), limit);
    }
    setCategory(newCatName.trim());
    setNewCatName('');
    setShowAddCategoryInline(false);
  };

  // Quick account creation
  const handleSaveInlineAccount = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;
    const newAcc: PaymentAccount = {
      id: `acc-${Date.now()}`,
      name: newAccName.trim(),
      type: newAccType,
      closingDay: newAccType === 'cartao_credito' ? parseInt(newAccClosingDay) || 15 : undefined,
      dueDay: newAccType === 'cartao_credito' ? parseInt(newAccDueDay) || 22 : undefined,
      creditLimit: newAccType === 'cartao_credito' ? parseFloat(newAccLimit) || 5000 : undefined,
      color: newAccType === 'cartao_credito' ? '#8b5cf6' : '#2563eb',
    };
    if (onAddAccount) {
      onAddAccount(newAcc);
    }
    setAccount(newAcc.name);
    setNewAccName('');
    setShowAddAccountInline(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rawAmount = parseFloat(amount);
    if (isNaN(rawAmount) || rawAmount <= 0) {
      alert('Por favor, informe um valor válido.');
      return;
    }

    if (!category.trim()) {
      alert('Por favor, cadastre ou selecione uma categoria para classificar este lançamento.');
      return;
    }

    if (!account.trim()) {
      alert('Por favor, cadastre ou selecione uma conta ou cartão para este lançamento.');
      return;
    }

    // Determine if it's credit card
    const isCreditCard =
      account.toLowerCase().includes('cartão') ||
      account.toLowerCase().includes('cartao') ||
      account.toLowerCase().includes('credito') ||
      account.toLowerCase().includes('crédito');

    const isPaid = type === 'entrada' || type === 'saida';
    const isOverdue =
      type === 'falta_pagar' && dueDate && new Date(dueDate) < new Date(new Date().setHours(0, 0, 0, 0));

    // Handle installment generation for new transactions
    if (!editingTransaction && paymentMode === 'parcelado' && generateFutureInstallments && installmentTotal > 1) {
      const perInstallmentAmount =
        installmentPricingMode === 'total'
          ? parseFloat((rawAmount / installmentTotal).toFixed(2))
          : rawAmount;

      const groupId = `grp-${Date.now()}`;
      const batchTransactions: Omit<Transaction, 'id'>[] = [];

      for (let i = 1; i <= installmentTotal; i++) {
        // Calculate date for installment i (spaced by 1 month)
        const baseDate = new Date(type === 'falta_pagar' || type === 'falta_receber' ? (dueDate || date) : date);
        baseDate.setMonth(baseDate.getMonth() + (i - 1));
        const formattedDate = baseDate.toISOString().split('T')[0];

        const isCurrentFirst = i === 1;
        const currentType = isCurrentFirst ? type : (type === 'saida' ? 'falta_pagar' : type);
        const currentStatus = isCurrentFirst && isPaid ? 'pago' : 'pendente';

        batchTransactions.push({
          description: `${description.trim()} (${i}/${installmentTotal})`,
          amount: perInstallmentAmount,
          type: currentType,
          category: category || 'Geral',
          date: formattedDate,
          dueDate: currentType === 'falta_pagar' || currentType === 'falta_receber' ? formattedDate : undefined,
          paidDate: currentStatus === 'pago' ? formattedDate : undefined,
          memberId,
          account,
          status: currentStatus,
          notes: notes.trim() ? `${notes.trim()} - Parcela ${i}/${installmentTotal}` : `Parcela ${i}/${installmentTotal}`,
          paymentMode: 'parcelado',
          installmentCurrent: i,
          installmentTotal: installmentTotal,
          installmentGroupId: groupId,
          isCreditCard,
        });
      }

      onSave(batchTransactions);
      onClose();
      return;
    }

    // Single transaction or edited transaction
    const finalAmount =
      paymentMode === 'parcelado' && installmentPricingMode === 'total' && installmentTotal > 1 && !editingTransaction
        ? parseFloat((rawAmount / installmentTotal).toFixed(2))
        : rawAmount;

    const data: Omit<Transaction, 'id'> = {
      description:
        paymentMode === 'parcelado' && !description.includes('(')
          ? `${description.trim()} (${installmentCurrent}/${installmentTotal})`
          : description.trim(),
      amount: finalAmount,
      type,
      category: category || 'Geral',
      date,
      dueDate: type === 'falta_pagar' || type === 'falta_receber' ? dueDate || date : undefined,
      paidDate: isPaid ? date : undefined,
      memberId,
      account,
      status: isPaid ? 'pago' : isOverdue ? 'atrasado' : 'pendente',
      notes: notes.trim() || undefined,
      finePenaltyEstimated: finePenaltyEstimated ? parseFloat(finePenaltyEstimated) : undefined,
      invoiceBarcode: invoiceBarcode.trim() || undefined,
      paymentMode,
      installmentCurrent: paymentMode === 'parcelado' ? installmentCurrent : undefined,
      installmentTotal: paymentMode === 'parcelado' ? installmentTotal : undefined,
      recurrenceFrequency: paymentMode === 'recorrente' ? recurrenceFrequency : undefined,
      isCreditCard,
    };

    onSave(data, editingTransaction?.id);
    onClose();
  };

  const relevantBudgets = budgets.filter((b) =>
    type === 'entrada' || type === 'falta_receber' ? b.type === 'receita' : b.type === 'despesa'
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-20">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento Financeiro'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure categoria, conta, parcelamento ou recorrência
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs">
          {/* Quadro Selector (The 4 Quadrants) */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Escolha o Quadro Financeiro:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setType('entrada')}
                className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                  type === 'entrada'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">Entrada</div>
                  <div className="text-[10px] text-slate-500 truncate">Receita paga</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('saida')}
                className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                  type === 'saida'
                    ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">Saída</div>
                  <div className="text-[10px] text-slate-500 truncate">Despesa paga</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('falta_pagar')}
                className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                  type === 'falta_pagar'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">Falta Pagar</div>
                  <div className="text-[10px] text-slate-500 truncate">Conta a vencer</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('falta_receber')}
                className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                  type === 'falta_receber'
                    ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">Falta Receber</div>
                  <div className="text-[10px] text-slate-500 truncate">Receita futura</div>
                </div>
              </button>
            </div>
          </div>

          {/* Description & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Descrição do Lançamento *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Fatura Celular, Supermercado, Aluguel..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {paymentMode === 'parcelado'
                  ? installmentPricingMode === 'total'
                    ? 'Valor Total Compra (R$) *'
                    : 'Valor da Parcela (R$) *'
                  : 'Valor (R$) *'}
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-slate-900"
              />
            </div>
          </div>

          {/* PAYMENT MODE: Único | Recorrente | Parcelado */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <label className="block font-bold text-slate-700 mb-1.5">
              Condição de Pagamento:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMode('unico')}
                className={`py-2 px-2.5 rounded-lg font-bold text-xs border text-center transition-all ${
                  paymentMode === 'unico'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                À Vista / Único
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('recorrente')}
                className={`py-2 px-2.5 rounded-lg font-bold text-xs border text-center flex items-center justify-center gap-1.5 transition-all ${
                  paymentMode === 'recorrente'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
                Recorrente
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('parcelado')}
                className={`py-2 px-2.5 rounded-lg font-bold text-xs border text-center flex items-center justify-center gap-1.5 transition-all ${
                  paymentMode === 'parcelado'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Parcelado
              </button>
            </div>

            {/* Recurrent Options */}
            {paymentMode === 'recorrente' && (
              <div className="mt-3 pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Frequência da Recorrência:</span>
                  <select
                    value={recurrenceFrequency}
                    onChange={(e) => setRecurrenceFrequency(e.target.value as any)}
                    className="px-2 py-1 border border-purple-300 rounded-lg bg-white font-medium text-slate-800"
                  >
                    <option value="mensal">Mensal (Todo mês)</option>
                    <option value="anual">Anual (Uma vez por ano)</option>
                    <option value="semanal">Semanal</option>
                  </select>
                </div>
                <div className="text-[11px] text-purple-700">
                  Ideal para assinaturas, aluguel, salários e contas fixas
                </div>
              </div>
            )}

            {/* Installment Options */}
            {paymentMode === 'parcelado' && (
              <div className="mt-3 pt-2.5 border-t border-slate-200 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Quantidade de Parcelas
                    </label>
                    <select
                      value={installmentTotal}
                      onChange={(e) => setInstallmentTotal(parseInt(e.target.value) || 2)}
                      className="w-full px-2.5 py-1.5 border border-indigo-300 rounded-lg bg-white font-mono font-bold text-slate-900"
                    >
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24, 36, 48].map((n) => (
                        <option key={n} value={n}>
                          {n}x parcelas
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Modo do Valor Informado
                    </label>
                    <select
                      value={installmentPricingMode}
                      onChange={(e) => setInstallmentPricingMode(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 border border-indigo-300 rounded-lg bg-white text-slate-800"
                    >
                      <option value="total">Valor Total da Compra</option>
                      <option value="parcela">Valor por Parcela</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Cálculo da Parcela
                    </label>
                    <div className="px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg font-mono font-bold text-indigo-950 text-xs">
                      {amount && parseFloat(amount) > 0 ? (
                        installmentPricingMode === 'total' ? (
                          <span>
                            {installmentTotal}x de R${' '}
                            {(parseFloat(amount) / installmentTotal).toFixed(2)}
                          </span>
                        ) : (
                          <span>
                            Total: R${' '}
                            {(parseFloat(amount) * installmentTotal).toFixed(2)}
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 font-normal">Informe o valor acima</span>
                      )}
                    </div>
                  </div>
                </div>

                {!editingTransaction && (
                  <label className="flex items-center gap-2 cursor-pointer pt-1 text-slate-700">
                    <input
                      type="checkbox"
                      checked={generateFutureInstallments}
                      onChange={(e) => setGenerateFutureInstallments(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-xs">
                      Gerar automaticamente as próximas {installmentTotal - 1} parcelas nos meses seguintes (1/{installmentTotal}, 2/{installmentTotal}...)
                    </span>
                  </label>
                )}
              </div>
            )}
          </div>

          {/* EDITABLE CATEGORY & MEMBER */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Category with Edit / Add button */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">
                  Categoria / Orçamento *
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddCategoryInline(!showAddCategoryInline)}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" />
                  {showAddCategoryInline ? 'Fechar' : 'Nova Categoria'}
                </button>
              </div>

              {!showAddCategoryInline ? (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                >
                  {budgets.length === 0 && (
                    <option value="">Nenhuma categoria cadastrada (clique em "Nova Categoria")</option>
                  )}
                  {budgets.length > 0 && !category && (
                    <option value="">Selecione uma categoria...</option>
                  )}
                  {relevantBudgets.length > 0
                    ? relevantBudgets.map((b) => (
                        <option key={b.id} value={b.category}>
                          {b.category}
                        </option>
                      ))
                    : budgets.map((b) => (
                        <option key={b.id} value={b.category}>
                          {b.category}
                        </option>
                      ))}
                </select>
              ) : (
                <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold text-blue-900 mb-0.5">
                      Nome da Nova Categoria:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Pet Shop, Streaming, Manutenção..."
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-blue-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-blue-900 mb-0.5">
                      Limite Mensal Teto (R$):
                    </label>
                    <input
                      type="number"
                      step="50"
                      placeholder="1000"
                      value={newCatLimit}
                      onChange={(e) => setNewCatLimit(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-blue-300 rounded bg-white"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryInline(false)}
                      className="px-2 py-1 text-[11px] text-slate-600 hover:text-slate-800"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveInlineCategory}
                      className="px-3 py-1 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                      Salvar Categoria
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Member */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Membro Responsável *
              </label>
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.avatar} {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* DATES & EDITABLE ACCOUNT / PAYMENT METHOD */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Date */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {type === 'falta_pagar' || type === 'falta_receber'
                  ? 'Data Prevista / Vencimento *'
                  : 'Data do Pagamento *'}
              </label>
              <input
                type="date"
                required
                value={type === 'falta_pagar' || type === 'falta_receber' ? dueDate || date : date}
                onChange={(e) => {
                  if (type === 'falta_pagar' || type === 'falta_receber') {
                    setDueDate(e.target.value);
                  } else {
                    setDate(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            {/* Editable Account with Add / Edit button */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">
                  Conta / Meio de Pagamento *
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddAccountInline(!showAddAccountInline)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" />
                  {showAddAccountInline ? 'Fechar' : 'Nova Conta / Cartão'}
                </button>
              </div>

              {!showAddAccountInline ? (
                <select
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white font-medium"
                >
                  {accounts.length === 0 ? (
                    <option value="">Nenhuma conta cadastrada (clique em "Nova Conta / Cartão")</option>
                  ) : (
                    <>
                      {!account && <option value="">Selecione a conta / meio de pagamento...</option>}
                      {accounts.filter((a) => a.type === 'cartao_credito').length > 0 && (
                        <optgroup label="Cartões de Crédito">
                          {accounts
                            .filter((a) => a.type === 'cartao_credito')
                            .map((a) => (
                              <option key={a.id} value={a.name}>
                                💳 {a.name} {a.closingDay ? `(Fecha dia ${a.closingDay})` : ''}
                              </option>
                            ))}
                        </optgroup>
                      )}
                      {accounts.filter((a) => a.type !== 'cartao_credito').length > 0 && (
                        <optgroup label="Contas Bancárias & Carteiras">
                          {accounts
                            .filter((a) => a.type !== 'cartao_credito')
                            .map((a) => (
                              <option key={a.id} value={a.name}>
                                🏦 {a.name}
                              </option>
                            ))}
                        </optgroup>
                      )}
                    </>
                  )}
                </select>
              ) : (
                <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-lg space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-900 mb-0.5">
                      Nome da Conta ou Cartão:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Cartão Nubank Ultravioleta, Itaú Débito..."
                      value={newAccName}
                      onChange={(e) => setNewAccName(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-indigo-300 rounded bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-900 mb-0.5">
                        Tipo de Meio:
                      </label>
                      <select
                        value={newAccType}
                        onChange={(e) => setNewAccType(e.target.value as any)}
                        className="w-full px-2 py-1 text-xs border border-indigo-300 rounded bg-white"
                      >
                        <option value="cartao_credito">Cartão de Crédito</option>
                        <option value="conta_corrente">Conta Corrente</option>
                        <option value="dinheiro_caixa">Dinheiro / Caixa</option>
                        <option value="poupanca_investimento">Poupança / Reserva</option>
                      </select>
                    </div>

                    {newAccType === 'cartao_credito' ? (
                      <div>
                        <label className="block text-[10px] font-bold text-indigo-900 mb-0.5">
                          Limite Total (R$):
                        </label>
                        <input
                          type="number"
                          placeholder="5000"
                          value={newAccLimit}
                          onChange={(e) => setNewAccLimit(e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-indigo-300 rounded bg-white"
                        />
                      </div>
                    ) : (
                      <div></div>
                    )}
                  </div>

                  {newAccType === 'cartao_credito' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-indigo-900 mb-0.5">
                          Dia Fechamento:
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          placeholder="Ex: 15"
                          value={newAccClosingDay}
                          onChange={(e) => setNewAccClosingDay(e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-indigo-300 rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-indigo-900 mb-0.5">
                          Dia Vencimento:
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          placeholder="Ex: 22"
                          value={newAccDueDay}
                          onChange={(e) => setNewAccDueDay(e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-indigo-300 rounded bg-white"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddAccountInline(false)}
                      className="px-2 py-1 text-[11px] text-slate-600 hover:text-slate-800"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveInlineAccount}
                      className="px-3 py-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
                    >
                      Salvar Conta / Cartão
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fine Penalty Estimate & Barcode (Only for Falta Pagar) */}
          {type === 'falta_pagar' && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
              <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Prevenção de Multas e Juros por Atraso</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-amber-950 mb-0.5">
                    Estimativa de Multa se Atrasar (R$)
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    placeholder="Ex: 25,00 (2% + juros)"
                    value={finePenaltyEstimated}
                    onChange={(e) => setFinePenaltyEstimated(e.target.value)}
                    className="w-full px-3 py-1.5 border border-amber-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-amber-950 mb-0.5">
                    Código de Barras / Linha Digitável
                  </label>
                  <input
                    type="text"
                    placeholder="Cole o código do boleto..."
                    value={invoiceBarcode}
                    onChange={(e) => setInvoiceBarcode(e.target.value)}
                    className="w-full px-3 py-1.5 border border-amber-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Observações / Comprovante
            </label>
            <textarea
              rows={2}
              placeholder="Anotações adicionais, detalhes da compra, comprovante..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
            ></textarea>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {editingTransaction
                ? 'Salvar Alterações'
                : paymentMode === 'parcelado' && generateFutureInstallments && installmentTotal > 1
                ? `Confirmar e Gerar ${installmentTotal} Parcelas`
                : 'Confirmar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
