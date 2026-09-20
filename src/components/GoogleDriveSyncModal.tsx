import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Plus,
  FolderOpen,
  LogOut,
  Download,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
  Copy,
  Check,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';
import {
  Transaction,
  FinancialSummary,
  CategoryBudget,
  Member,
} from '../types';
import {
  GoogleDriveUser,
  GoogleDriveConfig,
  getGoogleDriveConfig,
  saveGoogleDriveConfig,
  signInWithGoogle,
  signOutGoogle,
  getAccessToken,
  listDriveSpreadsheets,
  createGoogleDriveSpreadsheet,
  syncFinancialDataToSheets,
  DriveSpreadsheetItem,
} from '../services/googleDriveService';
import { exportToGoogleSheetsBackup, exportToExcel } from '../services/exportService';

interface GoogleDriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: GoogleDriveUser | null;
  onUserChange: (user: GoogleDriveUser | null) => void;
  transactions: Transaction[];
  summary: FinancialSummary;
  budgets: CategoryBudget[];
  members: Member[];
  periodName: string;
}

export const GoogleDriveSyncModal: React.FC<GoogleDriveSyncModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
  transactions,
  summary,
  budgets,
  members,
  periodName,
}) => {
  const [driveConfig, setDriveConfig] = useState<GoogleDriveConfig>(() =>
    getGoogleDriveConfig()
  );
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isLoadingSheetsList, setIsLoadingSheetsList] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<DriveSpreadsheetItem[]>([]);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // External Domain & Hosting Helper State
  const [showDomainGuide, setShowDomainGuide] = useState(false);
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const isExternalHosting = currentOrigin && !currentOrigin.includes('localhost') && !currentOrigin.includes('run.app');

  // Destructive/Mutation Confirmation dialog state (Mandatory for Workspace APIs)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const saved = getGoogleDriveConfig();
      setDriveConfig(saved);
      setFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyOrigin = () => {
    if (currentOrigin) {
      navigator.clipboard.writeText(currentOrigin);
      setCopiedOrigin(true);
      setTimeout(() => setCopiedOrigin(false), 2500);
    }
  };

  // Handle Google Login
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setFeedback(null);
    try {
      const { user, accessToken } = await signInWithGoogle();
      onUserChange(user);
      setFeedback({
        type: 'success',
        message: `Conectado com sucesso como ${user.displayName || user.email}!`,
      });

      // If user doesn't have a spreadsheet yet, auto-search or prompt
      if (!driveConfig.spreadsheetId && accessToken) {
        try {
          const files = await listDriveSpreadsheets(accessToken);
          if (files.length > 0) {
            setAvailableSheets(files);
            setShowDrivePicker(true);
          }
        } catch {
          // Non-blocking
        }
      }
    } catch (err: any) {
      const isOriginError =
        err?.code === 'origin_mismatch' ||
        err?.message?.includes('origin_mismatch') ||
        err?.message?.includes('Google Cloud Console') ||
        err?.code === 'auth/unauthorized-domain';

      const isUserCancellation =
        err?.code === 'auth/popup-closed-by-user' ||
        err?.message?.includes('fechada') ||
        err?.message?.includes('cancelada');

      if (isOriginError) {
        setShowDomainGuide(true);
        setFeedback({
          type: 'error',
          message:
            `O Google bloqueou o login porque o domínio "${currentOrigin}" ainda não foi adicionado nas "Origens JavaScript autorizadas" do Google Cloud. Veja as instruções abaixo para autorizar.`,
        });
      } else if (isUserCancellation) {
        // If cancellation happened on external domain, user probably closed the error popup
        if (isExternalHosting) {
          setShowDomainGuide(true);
        }
        setFeedback({
          type: 'info',
          message:
            'A janela de login do Google foi fechada. Se a janela continha o erro "400: origin_mismatch", siga as instruções do painel de autorização abaixo.',
        });
      } else {
        setFeedback({
          type: 'error',
          message:
            err.message ||
            'Erro ao fazer login com o Google. Por favor, tente novamente.',
        });
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Sign out
  const handleLogout = async () => {
    try {
      await signOutGoogle();
      onUserChange(null);
      const updated = {
        ...driveConfig,
        syncStatus: 'idle' as const,
      };
      setDriveConfig(updated);
      saveGoogleDriveConfig(updated);
      setFeedback({
        type: 'info',
        message: 'Desconectado da conta Google com sucesso.',
      });
    } catch (err: any) {
      console.error('Erro ao sair:', err);
    }
  };

  // Create new Spreadsheet in Google Drive
  const handleCreateSpreadsheet = async () => {
    const token = getAccessToken();
    if (!token) {
      setFeedback({
        type: 'error',
        message: 'Sua sessão expirou. Por favor, faça login com o Google novamente.',
      });
      return;
    }

    setIsCreatingSheet(true);
    setFeedback(null);
    try {
      const sheetName = `Controle Financeiro - Planilha (${new Date().toLocaleDateString('pt-BR')})`;
      const { id, url } = await createGoogleDriveSpreadsheet(token, sheetName);

      const updated: GoogleDriveConfig = {
        ...driveConfig,
        spreadsheetId: id,
        spreadsheetName: sheetName,
        spreadsheetUrl: url,
        syncStatus: 'idle',
      };
      setDriveConfig(updated);
      saveGoogleDriveConfig(updated);

      setFeedback({
        type: 'success',
        message: 'Nova planilha criada com sucesso no seu Google Drive! Clique em "Fazer Backup Agora" para enviar os dados.',
      });
      setShowDrivePicker(false);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Erro ao criar planilha no Google Drive.',
      });
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // List existing spreadsheets in Google Drive
  const handleLoadDriveSpreadsheets = async () => {
    const token = getAccessToken();
    if (!token) {
      setFeedback({
        type: 'error',
        message: 'Faça login com o Google primeiro para listar suas planilhas.',
      });
      return;
    }

    setIsLoadingSheetsList(true);
    setFeedback(null);
    try {
      const files = await listDriveSpreadsheets(token);
      setAvailableSheets(files);
      setShowDrivePicker(true);
      if (files.length === 0) {
        setFeedback({
          type: 'info',
          message: 'Nenhuma planilha encontrada recentemente no seu Google Drive. Você pode criar uma nova com 1 clique abaixo.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Erro ao buscar arquivos no Google Drive.',
      });
    } finally {
      setIsLoadingSheetsList(false);
    }
  };

  // Select an existing spreadsheet
  const handleSelectSpreadsheet = (item: DriveSpreadsheetItem) => {
    const url = item.webViewLink || `https://docs.google.com/spreadsheets/d/${item.id}/edit`;
    const updated: GoogleDriveConfig = {
      ...driveConfig,
      spreadsheetId: item.id,
      spreadsheetName: item.name,
      spreadsheetUrl: url,
    };
    setDriveConfig(updated);
    saveGoogleDriveConfig(updated);
    setShowDrivePicker(false);
    setFeedback({
      type: 'success',
      message: `Planilha "${item.name}" selecionada!`,
    });
  };

  // Execute sync after confirmation
  const handleConfirmSync = async () => {
    setShowConfirmModal(false);
    const token = getAccessToken();
    if (!token || !currentUser) {
      setFeedback({
        type: 'error',
        message: 'Por favor, faça login com sua conta Google para sincronizar.',
      });
      return;
    }

    if (!driveConfig.spreadsheetId) {
      setFeedback({
        type: 'error',
        message: 'Nenhuma planilha selecionada. Crie uma nova ou escolha uma existente no seu Drive.',
      });
      return;
    }

    setIsSyncing(true);
    setFeedback(null);
    try {
      const result = await syncFinancialDataToSheets(
        token,
        driveConfig.spreadsheetId,
        transactions,
        summary,
        budgets,
        members,
        periodName
      );

      const now = new Date().toLocaleString('pt-BR');
      const updated: GoogleDriveConfig = {
        ...driveConfig,
        lastSyncAt: now,
        syncStatus: 'success',
        syncCount: (driveConfig.syncCount || 0) + 1,
      };
      setDriveConfig(updated);
      saveGoogleDriveConfig(updated);

      setFeedback({
        type: 'success',
        message: `✓ Backup realizado com sucesso! Todas as 5 abas foram atualizadas na sua planilha do Google Drive.`,
      });
    } catch (err: any) {
      const errMsg = err.message || 'Erro ao sincronizar dados com o Google Planilhas.';
      const updated: GoogleDriveConfig = {
        ...driveConfig,
        syncStatus: 'error',
        lastError: errMsg,
      };
      setDriveConfig(updated);
      saveGoogleDriveConfig(updated);

      setFeedback({
        type: 'error',
        message: errMsg,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Toggle Auto-sync
  const handleToggleAutoSync = (checked: boolean) => {
    const updated = {
      ...driveConfig,
      autoSync: checked,
    };
    setDriveConfig(updated);
    saveGoogleDriveConfig(updated);
  };

  // Fast offline Excel download
  const handleDownloadBackup = () => {
    exportToGoogleSheetsBackup(transactions, summary, budgets, members, periodName);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-blue-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base leading-none">
                  Google Drive & Google Planilha
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Login Google Oficial
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Backup e sincronização direta no seu Google Drive pessoal
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

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs sm:text-sm">
          {/* Feedback message */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : feedback.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              {feedback.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              {feedback.type === 'error' && (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              {feedback.type === 'info' && (
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium">{feedback.message}</div>
            </div>
          )}

          {/* Section 1: Authentication with Google Login */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Google User'}
                    className="w-11 h-11 rounded-full border-2 border-emerald-500 shadow-2xs"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-200">
                    {currentUser?.email ? currentUser.email[0].toUpperCase() : 'G'}
                  </div>
                )}
                <div>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>{currentUser ? currentUser.displayName || 'Usuário Google' : 'Conta Google não conectada'}</span>
                    {currentUser && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Autenticado"></span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {currentUser?.email || 'Faça login para salvar seus backups diretamente no Google Drive'}
                  </p>
                </div>
              </div>

              {/* Login / Logout Button */}
              {currentUser ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-red-700 bg-white hover:bg-red-50 border border-slate-200 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Desconectar</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="flex items-center justify-center gap-2.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 shadow-xs hover:shadow-sm transition-all"
                >
                  {isLoggingIn ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                  )}
                  <span>{isLoggingIn ? 'Conectando...' : 'Entrar com o Google'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Hosting Domain Helper & Origin Authorization Guide */}
          {(showDomainGuide || (isExternalHosting && !currentUser)) && (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 space-y-3 animate-in fade-in">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                      Autorização necessária para: {currentOrigin || 'seu domínio'}
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Por segurança, o Google exige que este endereço esteja listado no seu Google Cloud Console para liberar o login.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDomainGuide(!showDomainGuide)}
                  className="text-amber-800 hover:text-amber-950 text-xs font-semibold shrink-0"
                >
                  {showDomainGuide ? 'Ocultar' : 'Como autorizar?'}
                </button>
              </div>

              {showDomainGuide && (
                <div className="space-y-3 pt-2 border-t border-amber-200/60 text-xs text-slate-700">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-600">Seu endereço web:</span>
                    <code className="px-2 py-1 bg-white border border-amber-300 rounded font-mono text-[11px] text-slate-800 select-all">
                      {currentOrigin}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyOrigin}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded font-semibold text-[11px] transition-colors"
                    >
                      {copiedOrigin ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedOrigin ? 'Copiado!' : 'Copiar URL'}</span>
                    </button>
                  </div>

                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-700 leading-relaxed bg-white/70 p-3 rounded-lg border border-amber-200/60">
                    <li>
                      Abra o{' '}
                      <a
                        href="https://console.cloud.google.com/apis/credentials?project=gen-lang-client-0070516740"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline font-bold inline-flex items-center gap-0.5"
                      >
                        Google Cloud Console
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>
                      Em <strong>IDs do cliente OAuth 2.0</strong>, clique no seu cliente.
                    </li>
                    <li>
                      Na seção <strong>Origens JavaScript autorizadas</strong>, clique em <strong>+ Adicionar URI</strong> e cole a URL copiada: <code className="text-amber-900 font-mono">{currentOrigin}</code>
                    </li>
                    <li>
                      Clique em <strong>Salvar</strong> na parte inferior da página.
                    </li>
                  </ol>

                  {/* Immediate Alternative: Download XLSX */}
                  <div className="pt-2 border-t border-amber-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-600">
                      💡 <strong>Não quer configurar agora?</strong> Você pode baixar a planilha com as 5 abas formatadas imediatamente:
                    </span>
                    <button
                      type="button"
                      onClick={() => exportToExcel(transactions, summary, budgets, members, periodName)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-2xs transition-colors shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar Planilha (.xlsx)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 2: Active Google Spreadsheet in Drive */}
          {currentUser && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4 text-emerald-600" />
                  <span>Planilha no Google Drive</span>
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadDriveSpreadsheets}
                    disabled={isLoadingSheetsList}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-medium hover:underline flex items-center gap-1"
                  >
                    {isLoadingSheetsList ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <FolderOpen className="w-3 h-3" />
                    )}
                    <span>Buscar no Drive</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateSpreadsheet}
                    disabled={isCreatingSheet}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline flex items-center gap-1"
                  >
                    {isCreatingSheet ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                    <span>Criar Nova Planilha</span>
                  </button>
                </div>
              </div>

              {/* Current Active Spreadsheet Card */}
              {driveConfig.spreadsheetId ? (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>{driveConfig.spreadsheetName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3">
                        <span>ID: {driveConfig.spreadsheetId.substring(0, 16)}...</span>
                        {driveConfig.lastSyncAt && (
                          <span>Último backup: {driveConfig.lastSyncAt}</span>
                        )}
                      </div>
                    </div>

                    {driveConfig.spreadsheetUrl && (
                      <a
                        href={driveConfig.spreadsheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-2xs transition-colors shrink-0"
                      >
                        <span>Abrir no Google Planilhas</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-center space-y-3">
                  <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
                  <div>
                    <p className="font-semibold text-slate-800 text-xs">
                      Nenhuma planilha do Google Drive vinculada ainda
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Crie uma planilha formatada automaticamente ou selecione uma existente
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleCreateSpreadsheet}
                      disabled={isCreatingSheet}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      {isCreatingSheet ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>Criar Planilha no Drive</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadDriveSpreadsheets}
                      disabled={isLoadingSheetsList}
                      className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Buscar no Drive</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Spreadsheets List Dropdown/Picker if triggered */}
              {showDrivePicker && availableSheets.length > 0 && (
                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-bold border-b pb-1.5">
                    <span>Selecione uma planilha encontrada no seu Google Drive:</span>
                    <button
                      type="button"
                      onClick={() => setShowDrivePicker(false)}
                      className="text-slate-400 hover:text-slate-600 text-[11px]"
                    >
                      Fechar lista
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {availableSheets.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectSpreadsheet(item)}
                        className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          driveConfig.spreadsheetId === item.id
                            ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <span className="block truncate">{item.name}</span>
                          <span className="text-[10px] text-slate-400">
                            Modificado em:{' '}
                            {item.modifiedTime
                              ? new Date(item.modifiedTime).toLocaleDateString('pt-BR')
                              : '-'}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Data Synchronized Structure & Explanation */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Abas que serão sincronizadas ({transactions.length} lançamentos):</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <strong className="block text-slate-800 text-xs">Resumo</strong>
                <span className="text-[10px] text-slate-500">Saldos e alertas</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <strong className="block text-slate-800 text-xs">Transações</strong>
                <span className="text-[10px] text-slate-500">Todas as receitas e despesas</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <strong className="block text-slate-800 text-xs">Contas a Pagar</strong>
                <span className="text-[10px] text-slate-500">Vencimentos e multas</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <strong className="block text-slate-800 text-xs">Orçamentos</strong>
                <span className="text-[10px] text-slate-500">Limites por categoria</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200 col-span-2 sm:col-span-1">
                <strong className="block text-slate-800 text-xs">Membros</strong>
                <span className="text-[10px] text-slate-500">Contatos e papéis</span>
              </div>
            </div>
          </div>

          {/* Section 4: Auto-sync & Options */}
          {currentUser && driveConfig.spreadsheetId && (
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label
                  htmlFor="auto-sync-drive"
                  className="font-bold text-slate-800 text-xs cursor-pointer block"
                >
                  Sincronização Automática
                </label>
                <p className="text-[11px] text-slate-500">
                  Atualizar a planilha no Google Drive sempre que adicionar ou editar um lançamento
                </p>
              </div>
              <input
                id="auto-sync-drive"
                type="checkbox"
                checked={driveConfig.autoSync}
                onChange={(e) => handleToggleAutoSync(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
            </div>
          )}

          {/* Section 5: Offline Backup File Alternative */}
          <div className="p-3.5 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span>Quer também um arquivo de backup local?</span>
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Baixe o arquivo (.xlsx) com as 5 abas para abrir ou guardar no seu computador.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg font-bold text-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadSuccess ? '✓ Baixado!' : 'Baixar Arquivo'}</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="text-[11px] text-slate-500 text-center sm:text-left">
            {currentUser ? (
              <span>Conectado como <strong>{currentUser.email}</strong></span>
            ) : (
              <span>Autenticação 100% segura via Google OAuth</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
            >
              Fechar
            </button>

            {currentUser && driveConfig.spreadsheetId && (
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={isSyncing}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all"
              >
                {isSyncing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>{isSyncing ? 'Sincronizando...' : 'Fazer Backup no Google Drive'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Workspace Explicit User Confirmation Dialog (MANDATORY for Mutating/Overwriting Workspace data) */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Confirmar Atualização da Planilha
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Deseja atualizar a planilha <strong>"{driveConfig.spreadsheetName}"</strong> no seu Google Drive com todos os dados atuais ({transactions.length} lançamentos e {budgets.length} orçamentos)?
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800">O que será atualizado:</div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                <li>Resumo Executivo com saldos consolidado e projetado</li>
                <li>Transações completas do período ({periodName})</li>
                <li>Quadro de contas a pagar e multas previstas</li>
                <li>Status dos limites de orçamento</li>
                <li>Lista de membros da equipe / família</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSync}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <span>Confirmar e Fazer Backup</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
