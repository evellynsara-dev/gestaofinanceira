import React, { useState } from 'react';
import { X, CreditCard, Plus, Trash2, Wallet, Building2, Banknote, Landmark, ShieldCheck } from 'lucide-react';
import { PaymentAccount, ProfileMode } from '../types';
import { formatBRL } from '../services/exportService';

interface AccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: PaymentAccount[];
  onSaveAccounts: (accounts: PaymentAccount[]) => void;
  profileMode: ProfileMode;
}

const COLOR_OPTIONS = [
  '#2563eb', // Azul
  '#8b5cf6', // Roxo
  '#059669', // Esmeralda
  '#f59e0b', // Âmbar
  '#ef4444', // Vermelho
  '#06b6d4', // Ciano
  '#ec4899', // Rosa
  '#1e293b', // Chumbo
];

export const AccountsModal: React.FC<AccountsModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onSaveAccounts,
  profileMode,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<PaymentAccount['type']>('conta_corrente');
  const [closingDay, setClosingDay] = useState('15');
  const [dueDay, setDueDay] = useState('22');
  const [creditLimit, setCreditLimit] = useState('5000');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);

  if (!isOpen) return null;

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newAcc: PaymentAccount = {
      id: `acc-${Date.now()}`,
      name: name.trim(),
      type,
      color,
      closingDay: type === 'cartao_credito' ? parseInt(closingDay) || 15 : undefined,
      dueDay: type === 'cartao_credito' ? parseInt(dueDay) || 22 : undefined,
      creditLimit: type === 'cartao_credito' ? parseFloat(creditLimit) || 0 : undefined,
    };

    onSaveAccounts([...accounts, newAcc]);
    setName('');
    setShowAddForm(false);
  };

  const handleDeleteAccount = (id: string, accName: string) => {
    if (window.confirm(`Deseja realmente remover a conta "${accName}"?`)) {
      onSaveAccounts(accounts.filter((a) => a.id !== id));
    }
  };

  const getTypeLabel = (t: PaymentAccount['type']) => {
    switch (t) {
      case 'cartao_credito':
        return 'Cartão de Crédito';
      case 'conta_corrente':
        return 'Conta Corrente';
      case 'dinheiro_caixa':
        return 'Dinheiro / Espécie';
      case 'poupanca_investimento':
        return 'Poupança / Investimento';
      default:
        return 'Outro';
    }
  };

  const getTypeIcon = (t: PaymentAccount['type']) => {
    switch (t) {
      case 'cartao_credito':
        return <CreditCard className="w-4 h-4 text-purple-600" />;
      case 'conta_corrente':
        return <Building2 className="w-4 h-4 text-blue-600" />;
      case 'dinheiro_caixa':
        return <Banknote className="w-4 h-4 text-emerald-600" />;
      case 'poupanca_investimento':
        return <Landmark className="w-4 h-4 text-cyan-600" />;
      default:
        return <Wallet className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Contas e Meios de Pagamento
              </h2>
              <p className="text-xs text-slate-500">
                {profileMode === 'familia' ? 'Contas familiares' : 'Contas empresariais'}: cadastre cartões, bancos ou caixas
              </p>
            </div>
          </div>
          <button
            id="btn-close-accounts-modal"
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
              id="btn-show-add-account-form"
              type="button"
              onClick={() => setShowAddForm(true)}
              className="w-full py-3 px-4 border-2 border-dashed border-indigo-300 rounded-xl text-indigo-700 hover:bg-indigo-50/60 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> Cadastrar Nova Conta ou Cartão
            </button>
          )}

          {/* Add Account Form */}
          {showAddForm && (
            <form
              onSubmit={handleAddAccount}
              className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  Cadastrar Nova Conta
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
                  Nome da Conta ou Cartão *
                </label>
                <input
                  id="input-account-name"
                  type="text"
                  required
                  placeholder="Ex: Nubank Roxinho, Banco Inter PJ, Carteira Dinheiro..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo do Meio de Pagamento
                  </label>
                  <select
                    id="select-account-type"
                    value={type}
                    onChange={(e) => setType(e.target.value as PaymentAccount['type'])}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="conta_corrente">🏦 Conta Corrente Bancária</option>
                    <option value="cartao_credito">💳 Cartão de Crédito</option>
                    <option value="dinheiro_caixa">💵 Dinheiro / Caixa Físico</option>
                    <option value="poupanca_investimento">📈 Poupança / Investimento</option>
                    <option value="outros">📁 Outro Meio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cor de Identificação
                  </label>
                  <div className="flex items-center gap-1.5 mt-1">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          color === c ? 'ring-2 ring-indigo-500 scale-110' : 'opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Specific fields for credit cards */}
              {type === 'cartao_credito' && (
                <div className="p-3 bg-white rounded-lg border border-indigo-200 space-y-2">
                  <span className="text-[11px] font-bold text-indigo-900 block">
                    Configurações da Fatura do Cartão:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Dia Fechamento:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={closingDay}
                        onChange={(e) => setClosingDay(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                        placeholder="Ex: 15"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Dia Vencimento:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={dueDay}
                        onChange={(e) => setDueDay(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                        placeholder="Ex: 22"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        Limite Total (R$):
                      </label>
                      <input
                        type="number"
                        step="100"
                        value={creditLimit}
                        onChange={(e) => setCreditLimit(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                        placeholder="Ex: 5000"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  id="btn-submit-account"
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-xs"
                >
                  Salvar Conta
                </button>
              </div>
            </form>
          )}

          {/* List of Accounts */}
          <div className="space-y-2">
            {accounts.length === 0 ? (
              <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  Nenhuma conta ou cartão cadastrado
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-3">
                  Cadastre suas contas correntes bancárias, cartões de crédito ou dinheiro para registrar seus lançamentos.
                </p>
                {!showAddForm && (
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Cadastrar Primeira Conta
                  </button>
                )}
              </div>
            ) : (
              accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${acc.color || '#6366f1'}20` }}
                    >
                      {getTypeIcon(acc.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">
                          {acc.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-slate-100 text-slate-600">
                          {getTypeLabel(acc.type)}
                        </span>
                      </div>
                      {acc.type === 'cartao_credito' && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {acc.closingDay ? `Fecha dia ${acc.closingDay}` : ''}
                          {acc.dueDay ? ` • Vence dia ${acc.dueDay}` : ''}
                          {acc.creditLimit ? ` • Limite: ${formatBRL(acc.creditLimit)}` : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteAccount(acc.id, acc.name)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Excluir Conta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>{accounts.length} conta(s) cadastrada(s)</span>
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
