import React, { useState } from 'react';
import {
  Bell,
  Download,
  Plus,
  RefreshCw,
  Users,
  Building2,
  Home,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Volume2,
  FileSpreadsheet,
  Database,
} from 'lucide-react';
import { ProfileMode, DueReminder } from '../types';
import { formatBRL, formatDateBR } from '../services/exportService';
import { playNotificationSound, requestPushPermission } from '../services/notifications';

interface HeaderProps {
  profileMode: ProfileMode;
  onToggleProfile: (mode: ProfileMode) => void;
  selectedMonth: number; // 0 - 11
  selectedYear: number;
  onChangeMonth: (month: number, year: number) => void;
  dueReminders: DueReminder[];
  onOpenNewTransaction: () => void;
  onOpenExportModal: () => void;
  onOpenBackupModal: () => void;
  onOpenMembersModal: () => void;
  onMarkAsPaid: (transactionId: string) => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const Header: React.FC<HeaderProps> = ({
  profileMode,
  onToggleProfile,
  selectedMonth,
  selectedYear,
  onChangeMonth,
  dueReminders,
  onOpenNewTransaction,
  onOpenExportModal,
  onOpenBackupModal,
  onOpenMembersModal,
  onMarkAsPaid,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  const urgentCount = dueReminders.filter((r) => r.status === 'vencido' || r.status === 'vence_hoje').length;

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      onChangeMonth(11, selectedYear - 1);
    } else {
      onChangeMonth(selectedMonth - 1, selectedYear);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      onChangeMonth(0, selectedYear + 1);
    } else {
      onChangeMonth(selectedMonth + 1, selectedYear);
    }
  };

  const handleEnablePush = async () => {
    const granted = await requestPushPermission();
    setPushEnabled(granted);
    if (granted) {
      playNotificationSound();
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3.5 gap-3">
          
          {/* Logo & Profile Mode Switcher */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm">
                <span className="text-emerald-400 text-lg">$</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none">
                    Controle Financeiro
                  </h1>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {profileMode === 'familia' ? 'Gestão Compartilhada Familiar' : 'Finanças para Pequenas Empresas'}
                </p>
              </div>
            </div>

            {/* Profile Switcher Tabs (Mobile & Desktop) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 ml-3">
              <button
                id="btn-profile-familia"
                type="button"
                onClick={() => onToggleProfile('familia')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  profileMode === 'familia'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Home className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Família</span>
              </button>
              <button
                id="btn-profile-empresa"
                type="button"
                onClick={() => onToggleProfile('empresa')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  profileMode === 'empresa'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-purple-600" />
                <span className="hidden sm:inline">Empresa</span>
              </button>
            </div>
          </div>

          {/* Month Selector & Action Controls */}
          <div className="flex flex-wrap items-center justify-between md:justify-end gap-2">
            
            {/* Month Picker */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                title="Mês Anterior"
              >
                ‹
              </button>
              <span className="font-semibold text-slate-800 px-2 min-w-[110px] text-center">
                {MONTH_NAMES[selectedMonth]} {selectedYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                title="Próximo Mês"
              >
                ›
              </button>
            </div>

            {/* Backup & Restaurar Dados Button */}
            <button
              id="btn-backup-restore"
              type="button"
              onClick={onOpenBackupModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-2xs"
              title="Fazer Backup ou Restaurar Lançamentos e Configurações"
            >
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span>Backup & Restaurar</span>
            </button>

            {/* Notification Bell with Badge */}
            <div className="relative">
              <button
                id="btn-notification-bell"
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2 rounded-lg border transition-all ${
                  urgentCount > 0
                    ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 animate-pulse'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                title="Lembretes de Vencimento de Faturas"
              >
                <Bell className="w-4 h-4" />
                {dueReminders.length > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 px-1.5 py-0.2 min-w-4 text-[10px] font-bold rounded-full text-white text-center leading-tight ${
                      urgentCount > 0 ? 'bg-red-600' : 'bg-slate-700'
                    }`}
                  >
                    {dueReminders.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-700" />
                      <span className="text-xs font-bold text-slate-800">
                        Vencimentos de Faturas ({dueReminders.length})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Fechar
                    </button>
                  </div>

                  {/* Push Status / Enable Bar */}
                  <div className="my-2 p-2 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>{pushEnabled ? 'Push Ativado no Navegador' : 'Notificações de Fatura'}</span>
                    </div>
                    {!pushEnabled ? (
                      <button
                        type="button"
                        onClick={handleEnablePush}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-[11px] font-medium hover:bg-blue-700 transition-colors"
                      >
                        Ativar Push
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={playNotificationSound}
                        className="text-[11px] text-blue-600 hover:underline"
                      >
                        Testar Som
                      </button>
                    )}
                  </div>

                  {/* Reminders List */}
                  <div className="max-h-72 overflow-y-auto space-y-2 mt-2 pr-1">
                    {dueReminders.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-500 opacity-60" />
                        Nenhuma fatura pendente no momento!
                      </div>
                    ) : (
                      dueReminders.map((rem) => {
                        const isOverdue = rem.status === 'vencido';
                        const isToday = rem.status === 'vence_hoje';

                        return (
                          <div
                            key={rem.id}
                            className={`p-2.5 rounded-lg border text-xs transition-all ${
                              isOverdue
                                ? 'bg-red-50 border-red-200 text-red-900'
                                : isToday
                                ? 'bg-amber-50 border-amber-200 text-amber-900'
                                : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-semibold text-xs leading-snug">
                                {rem.description}
                              </div>
                              <span className="font-mono font-bold whitespace-nowrap">
                                {formatBRL(rem.amount)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between mt-1.5 text-[11px]">
                              <div className="flex items-center gap-1">
                                {isOverdue ? (
                                  <span className="inline-flex items-center gap-1 font-bold text-red-600">
                                    <AlertTriangle className="w-3 h-3" />
                                    Vencido ({Math.abs(rem.daysRemaining)}d atrás)
                                  </span>
                                ) : isToday ? (
                                  <span className="font-bold text-amber-700">
                                    ⏰ Vence Hoje!
                                  </span>
                                ) : (
                                  <span className="text-slate-500">
                                    Vence em {rem.daysRemaining} dias ({formatDateBR(rem.dueDate)})
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  onMarkAsPaid(rem.transactionId);
                                  setShowNotifications(false);
                                }}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-medium transition-colors"
                              >
                                Marcar Pago
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Members Button */}
            <button
              id="btn-members-modal"
              type="button"
              onClick={onOpenMembersModal}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              title="Gerenciar Membros da Família ou Equipe"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Membros</span>
            </button>

            {/* Export & WhatsApp Report Button */}
            <button
              id="btn-export-reports"
              type="button"
              onClick={onOpenExportModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors shadow-xs"
              title="Exportar em PDF, Excel ou Enviar no WhatsApp"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Relatórios / WhatsApp</span>
            </button>

            {/* Add Transaction Button */}
            <button
              id="btn-new-transaction"
              type="button"
              onClick={onOpenNewTransaction}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Lançamento</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
