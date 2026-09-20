import React, { useState, useRef } from 'react';
import {
  X,
  Database,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  FileSpreadsheet,
  Copy,
  Check,
  RefreshCw,
  HardDrive,
  Info,
} from 'lucide-react';
import { ProfileMode, Transaction, Member, CategoryBudget, PaymentAccount, FinancialSummary } from '../types';
import {
  downloadFullBackupFile,
  createFullBackupData,
  validateBackupJSON,
  restoreFullBackup,
  BackupValidationResult,
  getTransactions,
  getMembers,
  getBudgets,
  getAccounts,
} from '../services/storage';
import { exportToExcel } from '../services/exportService';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileMode: ProfileMode;
  transactions: Transaction[];
  summary: FinancialSummary;
  budgets: CategoryBudget[];
  members: Member[];
  periodName: string;
  onRestoreSuccess: (restoredData: {
    transactions: Transaction[];
    members: Member[];
    budgets: CategoryBudget[];
    accounts: PaymentAccount[];
    profileMode: ProfileMode;
  }) => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  profileMode,
  transactions,
  summary,
  budgets,
  members,
  periodName,
  onRestoreSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore'>('backup');
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Restore file state
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<BackupValidationResult | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Real-time current storage statistics
  const currentFamiliaTx = getTransactions('familia').length;
  const currentEmpresaTx = getTransactions('empresa').length;
  const currentFamiliaMembers = getMembers('familia').length;
  const currentEmpresaMembers = getMembers('empresa').length;

  const handleDownloadBackup = () => {
    try {
      const res = downloadFullBackupFile(profileMode);
      setFeedback({
        type: 'success',
        message: `Backup gerado com sucesso! Arquivo "${res.filename}" salvo no seu dispositivo.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Erro ao gerar backup: ' + (err.message || 'tente novamente.'),
      });
    }
  };

  const handleCopyJSON = () => {
    try {
      const data = createFullBackupData(profileMode);
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      setFeedback({
        type: 'success',
        message: 'Código do backup copiado para a área de transferência!',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Não foi possível copiar o backup: ' + err.message,
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setFeedback(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) {
        setFeedback({ type: 'error', message: 'Arquivo vazio ou ilegível.' });
        return;
      }
      const val = validateBackupJSON(content);
      setValidationResult(val);
      if (!val.valid) {
        setFeedback({ type: 'error', message: val.error || 'Arquivo de backup inválido.' });
      }
    };
    reader.onerror = () => {
      setFeedback({ type: 'error', message: 'Erro ao ler o arquivo selecionado.' });
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = () => {
    if (!validationResult || !validationResult.valid || !validationResult.payload) {
      setFeedback({ type: 'error', message: 'Por favor, selecione um arquivo de backup válido primeiro.' });
      return;
    }

    setIsRestoring(true);
    try {
      const result = restoreFullBackup(validationResult.payload, profileMode);
      onRestoreSuccess({
        transactions: result.transactions,
        members: result.members,
        budgets: result.budgets,
        accounts: result.accounts,
        profileMode: result.restoredMode,
      });

      setFeedback({
        type: 'success',
        message: 'Backup restaurado com sucesso! Seus lançamentos e configurações foram recuperados.',
      });

      // Clear file selection after 2s and keep modal open or let user see success
      setTimeout(() => {
        setSelectedFileName(null);
        setValidationResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 2500);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Erro ao restaurar backup: ' + (err.message || 'verifique o arquivo.'),
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Backup & Restauração de Dados
              </h3>
              <p className="text-xs text-slate-500">
                Guarde uma cópia segura dos seus lançamentos ou restaure um backup anterior
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 px-5 pt-3 gap-2 bg-slate-50/50">
          <button
            type="button"
            onClick={() => {
              setActiveTab('backup');
              setFeedback(null);
            }}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'backup'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Fazer Backup (Salvar)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('restore');
              setFeedback(null);
            }}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'restore'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Restaurar Backup (Carregar)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5">
          {/* Feedback Alert */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : feedback.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : feedback.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium leading-relaxed">{feedback.message}</div>
            </div>
          )}

          {/* TAB 1: FAZER BACKUP */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Resumo dos Dados Atuais Armazenados
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                    100% Offline & Seguro
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                    <span className="block text-[11px] text-slate-500">Família</span>
                    <span className="text-sm font-extrabold text-slate-800">{currentFamiliaTx} lançamentos</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                    <span className="block text-[11px] text-slate-500">Empresa</span>
                    <span className="text-sm font-extrabold text-slate-800">{currentEmpresaTx} lançamentos</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                    <span className="block text-[11px] text-slate-500">Membros</span>
                    <span className="text-sm font-extrabold text-slate-800">{currentFamiliaMembers + currentEmpresaMembers}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                    <span className="block text-[11px] text-slate-500">Categorias</span>
                    <span className="text-sm font-extrabold text-slate-800">13 limites</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">
                  O backup contém todos os seus dados dos dois perfis (Família e Empresa), contas bancárias, cartões, limites de orçamento e histórico completo.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  id="btn-download-backup-file"
                  type="button"
                  onClick={handleDownloadBackup}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Arquivo de Backup (.json)</span>
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => exportToExcel(transactions, summary, budgets, members, periodName)}
                    className="py-2.5 px-3 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    <span>Baixar Planilha Excel (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyJSON}
                    className="py-2.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                    <span>{copied ? 'Copiado!' : 'Copiar Texto JSON'}</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed">
                💡 <strong>Dica de Segurança:</strong> Salve o arquivo de backup no seu computador, pen drive ou envie para o seu próprio e-mail ou WhatsApp. Assim você nunca perde suas contas, mesmo trocando de aparelho ou limpando o navegador.
              </div>
            </div>
          )}

          {/* TAB 2: RESTAURAR BACKUP */}
          {activeTab === 'restore' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-600 leading-relaxed">
                Selecione o arquivo de backup <strong>.json</strong> baixado anteriormente para recuperar todos os seus lançamentos e configurações.
              </div>

              {/* Upload Drop/Picker Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/30 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-800">
                  {selectedFileName ? selectedFileName : 'Clique para selecionar o arquivo de backup (.json)'}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Formatos aceitos: arquivos gerados pelo Controle Financeiro (.json)
                </p>
              </div>

              {/* Validation Preview Card */}
              {validationResult && validationResult.valid && validationResult.stats && (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Arquivo de Backup Válido e Pronto para Restauração</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="bg-white p-2 rounded-lg border border-emerald-200 text-center">
                      <span className="block text-[10px] text-slate-500">Lançamentos Família</span>
                      <span className="font-extrabold text-slate-800">
                        {validationResult.stats.totalFamiliaTransactions}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-emerald-200 text-center">
                      <span className="block text-[10px] text-slate-500">Lançamentos Empresa</span>
                      <span className="font-extrabold text-slate-800">
                        {validationResult.stats.totalEmpresaTransactions}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-emerald-200 text-center col-span-2 sm:col-span-1">
                      <span className="block text-[10px] text-slate-500">Membros / Perfis</span>
                      <span className="font-extrabold text-slate-800">
                        {validationResult.stats.totalMembers}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600">
                    📅 <strong>Data do backup:</strong>{' '}
                    {new Date(validationResult.stats.exportedAt).toLocaleString('pt-BR')}
                  </div>

                  {/* Warning and Confirm Button */}
                  <div className="pt-2 border-t border-emerald-200/80 flex flex-col gap-2.5">
                    <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200/80">
                      ⚠️ Atenção: Ao restaurar, os dados contidos no arquivo substituirão os dados atuais do aplicativo.
                    </p>
                    <button
                      id="btn-confirm-restore"
                      type="button"
                      disabled={isRestoring}
                      onClick={handleExecuteRestore}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      {isRestoring ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Restaurando dados...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Confirmar e Restaurar Dados</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
