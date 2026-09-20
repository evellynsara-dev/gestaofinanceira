import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ProfileMode,
  Transaction,
  Member,
  CategoryBudget,
  PaymentAccount,
  FinancialSummary,
  TransactionType,
} from './types';
import {
  getProfileMode,
  setProfileMode,
  getTransactions,
  saveTransactions,
  getMembers,
  saveMembers,
  getBudgets,
  saveBudgets,
  getAccounts,
  saveAccounts,
} from './services/storage';
import { calculateDueReminders, sendPushNotification } from './services/notifications';
import { Header } from './components/Header';
import { ConsolidatedBalancePanel } from './components/ConsolidatedBalancePanel';
import { FourQuadrants } from './components/FourQuadrants';
import { BudgetLimitsTracker } from './components/BudgetLimitsTracker';
import { ChartsView } from './components/ChartsView';
import { TransactionsTable } from './components/TransactionsTable';
import { CreditCardInvoiceForecast } from './components/CreditCardInvoiceForecast';
import { TransactionModal } from './components/TransactionModal';
import { ExportAndShareModal } from './components/ExportAndShareModal';
import { GoogleDriveSyncModal } from './components/GoogleDriveSyncModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { MembersModal } from './components/MembersModal';
import {
  GoogleDriveUser,
  GoogleDriveConfig,
  getGoogleDriveConfig,
  saveGoogleDriveConfig,
  initGoogleAuth,
  syncFinancialDataToSheets,
  getAccessToken,
} from './services/googleDriveService';

export default function App() {
  const [profileMode, setProfileModeState] = useState<ProfileMode>(() => getProfileMode());

  // Date selectors (default to current system date)
  const today = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());

  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const periodName = `${MONTH_NAMES[selectedMonth]} de ${selectedYear}`;

  // Core Data
  const [transactions, setTransactions] = useState<Transaction[]>(() => getTransactions(getProfileMode()));
  const [members, setMembers] = useState<Member[]>(() => getMembers(getProfileMode()));
  const [budgets, setBudgets] = useState<CategoryBudget[]>(() => getBudgets(getProfileMode()));
  const [accounts, setAccounts] = useState<PaymentAccount[]>(() => getAccounts(getProfileMode()));

  // Google Drive & Auth State
  const [currentUser, setCurrentUser] = useState<GoogleDriveUser | null>(null);
  const [driveConfig, setDriveConfig] = useState<GoogleDriveConfig>(() => getGoogleDriveConfig());

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [defaultTxType, setDefaultTxType] = useState<TransactionType>('saida');

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

  // Initialize Google Auth state listener
  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user) => {
        setCurrentUser(user);
      },
      () => {
        setCurrentUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Handle full restore of backup data
  const handleRestoreSuccess = (restored: {
    transactions: Transaction[];
    members: Member[];
    budgets: CategoryBudget[];
    accounts: PaymentAccount[];
    profileMode: ProfileMode;
  }) => {
    setProfileModeState(restored.profileMode);
    setTransactions(restored.transactions);
    setMembers(restored.members);
    setBudgets(restored.budgets);
    setAccounts(restored.accounts);
  };

  // Switch Profile (Família vs Pequena Empresa)
  const handleToggleProfile = (newMode: ProfileMode) => {
    if (newMode === profileMode) return;
    setProfileMode(newMode);
    setProfileModeState(newMode);
    setTransactions(getTransactions(newMode));
    setMembers(getMembers(newMode));
    setBudgets(getBudgets(newMode));
    setAccounts(getAccounts(newMode));
  };

  // Persist whenever changes occur
  useEffect(() => {
    saveTransactions(profileMode, transactions);
  }, [transactions, profileMode]);

  useEffect(() => {
    saveMembers(profileMode, members);
  }, [members, profileMode]);

  useEffect(() => {
    saveBudgets(profileMode, budgets);
  }, [budgets, profileMode]);

  useEffect(() => {
    saveAccounts(profileMode, accounts);
  }, [accounts, profileMode]);

  useEffect(() => {
    saveGoogleDriveConfig(driveConfig);
  }, [driveConfig]);

  // Filter transactions for currently selected month/year
  const currentMonthTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const targetDate = t.dueDate || t.date;
      if (!targetDate) return true;
      const [y, m] = targetDate.split('-').map(Number);
      return y === selectedYear && m - 1 === selectedMonth;
    });
  }, [transactions, selectedMonth, selectedYear]);

  // Real-time Consolidated Financial Summary calculation
  const summary: FinancialSummary = useMemo(() => {
    let entradasTotal = 0;
    let saidasTotal = 0;
    let faltaPagarTotal = 0;
    let faltaReceberTotal = 0;
    let faturasVencidasCount = 0;
    let faturasVencidasTotal = 0;
    let faturasHojeCount = 0;
    let faturasProximasCount = 0;

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    currentMonthTransactions.forEach((t) => {
      if (t.type === 'entrada') {
        entradasTotal += t.amount;
      } else if (t.type === 'saida') {
        saidasTotal += t.amount;
      } else if (t.type === 'falta_pagar') {
        faltaPagarTotal += t.amount;

        if (t.dueDate) {
          const [y, m, d] = t.dueDate.split('-').map(Number);
          const due = new Date(y, m - 1, d);
          due.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((due.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays < 0) {
            faturasVencidasCount += 1;
            faturasVencidasTotal += t.amount;
          } else if (diffDays === 0) {
            faturasHojeCount += 1;
          } else if (diffDays <= 3) {
            faturasProximasCount += 1;
          }
        }
      } else if (t.type === 'falta_receber') {
        faltaReceberTotal += t.amount;
      }
    });

    const saldoAtual = entradasTotal - saidasTotal;
    const saldoProjetado = (entradasTotal + faltaReceberTotal) - (saidasTotal + faltaPagarTotal);
    const totalReceitas = entradasTotal + faltaReceberTotal;
    const taxaPoupanca = totalReceitas > 0 ? Math.max(0, (saldoProjetado / totalReceitas) * 100) : 0;

    return {
      entradasTotal,
      saidasTotal,
      faltaPagarTotal,
      faltaReceberTotal,
      saldoAtual,
      saldoProjetado,
      taxaPoupanca,
      faturasVencidasCount,
      faturasVencidasTotal,
      faturasHojeCount,
      faturasProximasCount,
    };
  }, [currentMonthTransactions]);

  // Due Reminders calculation
  const dueReminders = useMemo(() => {
    return calculateDueReminders(transactions);
  }, [transactions]);

  // Push notification alert check on load
  useEffect(() => {
    const overdueBills = dueReminders.filter((r) => r.status === 'vencido');
    const todayBills = dueReminders.filter((r) => r.status === 'vence_hoje');

    if (overdueBills.length > 0) {
      sendPushNotification(`⚠️ Alerta: ${overdueBills.length} fatura(s) vencida(s)!`, {
        body: `Evite multas e juros. Acesse o Controle Financeiro para verificar "${overdueBills[0].description}".`,
      });
    } else if (todayBills.length > 0) {
      sendPushNotification(`⏰ ${todayBills.length} fatura(s) vencem HOJE!`, {
        body: `Conta: ${todayBills[0].description} - R$ ${todayBills[0].amount.toFixed(2)}`,
      });
    }
  }, [dueReminders]);

  // Background Auto-sync with Google Drive & Planilhas (if enabled)
  useEffect(() => {
    if (driveConfig.autoSync && driveConfig.spreadsheetId && currentUser) {
      const token = getAccessToken();
      if (!token) return;

      const timer = setTimeout(async () => {
        try {
          await syncFinancialDataToSheets(
            token,
            driveConfig.spreadsheetId!,
            transactions,
            summary,
            budgets,
            members,
            periodName
          );
          const updated = {
            ...driveConfig,
            lastSyncAt: new Date().toLocaleString('pt-BR'),
            syncStatus: 'success' as const,
          };
          setDriveConfig(updated);
          saveGoogleDriveConfig(updated);
        } catch (err) {
          console.warn('Auto-sync Google Drive error:', err);
        }
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [
    transactions,
    budgets,
    members,
    driveConfig.autoSync,
    driveConfig.spreadsheetId,
    currentUser,
    summary,
    periodName,
  ]);

  // Actions
  const handleMarkAsPaid = (id: string) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            type: 'saida', // Automatically shifts from Falta Pagar to Saída!
            status: 'pago',
            paidDate: new Date().toISOString().split('T')[0],
          };
        }
        return t;
      })
    );
  };

  const handleMarkAsReceived = (id: string) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            type: 'entrada', // Automatically shifts from Falta Receber to Entrada!
            status: 'pago',
            paidDate: new Date().toISOString().split('T')[0],
          };
        }
        return t;
      })
    );
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSaveTransaction = (
    data: Omit<Transaction, 'id'> | Omit<Transaction, 'id'>[],
    id?: string
  ) => {
    if (id && !Array.isArray(data)) {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...data, id } : t))
      );
    } else if (Array.isArray(data)) {
      const newTxs: Transaction[] = data.map((item, idx) => ({
        ...item,
        id: `tx-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      }));
      setTransactions((prev) => [...newTxs, ...prev]);
    } else {
      const newTx: Transaction = {
        ...data,
        id: `tx-${Date.now()}`,
      };
      setTransactions((prev) => [newTx, ...prev]);
    }
  };

  const handleAddAccount = (newAccount: PaymentAccount) => {
    setAccounts((prev) => [...prev, newAccount]);
  };

  const handleUpdateBudget = (budgetId: string, newLimit: number) => {
    setBudgets((prev) =>
      prev.map((b) => (b.id === budgetId ? { ...b, monthlyLimit: newLimit } : b))
    );
  };

  const handleAddCategory = (category: string, monthlyLimit: number) => {
    const newBudget: CategoryBudget = {
      id: `cat-${Date.now()}`,
      category,
      monthlyLimit,
      color: '#3b82f6',
      icon: 'Tag',
      type: 'despesa',
    };
    setBudgets((prev) => [...prev, newBudget]);
  };

  const profileTitle = profileMode === 'familia' ? 'Controle Financeiro Familiar' : 'Finanças da Empresa';

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-800 flex flex-col">
      {/* Header with quick month switcher, push notifications, and actions */}
      <Header
        profileMode={profileMode}
        onToggleProfile={handleToggleProfile}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onChangeMonth={(m, y) => {
          setSelectedMonth(m);
          setSelectedYear(y);
        }}
        dueReminders={dueReminders}
        onOpenNewTransaction={() => {
          setEditingTransaction(null);
          setDefaultTxType('saida');
          setIsTxModalOpen(true);
        }}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenMembersModal={() => setIsMembersModalOpen(true)}
        onMarkAsPaid={handleMarkAsPaid}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 1. Real-time Consolidated Balance Control Panel */}
        <ConsolidatedBalancePanel
          summary={summary}
          periodName={periodName}
        />

        {/* 2. The Four Main Quadrants (Entradas | Saídas | Falta Pagar | Falta Receber) */}
        <FourQuadrants
          transactions={currentMonthTransactions}
          members={members}
          onOpenNewTransactionForType={(tType) => {
            setEditingTransaction(null);
            setDefaultTxType(tType);
            setIsTxModalOpen(true);
          }}
          onEditTransaction={(tx) => {
            setEditingTransaction(tx);
            setIsTxModalOpen(true);
          }}
          onDeleteTransaction={handleDeleteTransaction}
          onMarkAsPaid={handleMarkAsPaid}
          onMarkAsReceived={handleMarkAsReceived}
        />

        {/* 3. Category Budget Limits Tracker */}
        <BudgetLimitsTracker
          budgets={budgets}
          transactions={currentMonthTransactions}
          onUpdateBudget={handleUpdateBudget}
          onAddCategory={handleAddCategory}
        />

        {/* 4. Intuitive Tracking Charts */}
        <ChartsView
          transactions={currentMonthTransactions}
          members={members}
          budgets={budgets}
        />

        {/* 5. Full Transactions Table & Search */}
        <TransactionsTable
          transactions={currentMonthTransactions}
          members={members}
          budgets={budgets}
          onEditTransaction={(tx) => {
            setEditingTransaction(tx);
            setIsTxModalOpen(true);
          }}
          onDeleteTransaction={handleDeleteTransaction}
          onMarkAsPaid={handleMarkAsPaid}
          onMarkAsReceived={handleMarkAsReceived}
        />

        {/* 6. Previsão da Fatura do Cartão de Crédito no Rodapé */}
        <CreditCardInvoiceForecast
          transactions={transactions}
          accounts={accounts}
          members={members}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          periodName={periodName}
          onOpenNewCreditCardTx={() => {
            setEditingTransaction(null);
            setDefaultTxType('saida');
            setIsTxModalOpen(true);
          }}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Controle Financeiro Compartilhado • Sincronização Google Sheets & Apps Script
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span>4 Quadros Integrados</span>
            <span>•</span>
            <span>Previsão Fatura Cartão</span>
            <span>•</span>
            <span>Relatórios em PDF & Excel</span>
            <span>•</span>
            <span>WhatsApp 1-Clique</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        editingTransaction={editingTransaction}
        defaultType={defaultTxType}
        members={members}
        budgets={budgets}
        accounts={accounts}
        onAddCategory={handleAddCategory}
        onAddAccount={handleAddAccount}
      />

      <ExportAndShareModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        transactions={currentMonthTransactions}
        summary={summary}
        budgets={budgets}
        members={members}
        periodName={periodName}
        profileTitle={profileTitle}
      />

      <GoogleDriveSyncModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        currentUser={currentUser}
        onUserChange={setCurrentUser}
        transactions={transactions}
        summary={summary}
        budgets={budgets}
        members={members}
        periodName={periodName}
      />

      <MembersModal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        members={members}
        profileMode={profileMode}
        onSaveMembers={setMembers}
      />

      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        profileMode={profileMode}
        transactions={transactions}
        summary={summary}
        budgets={budgets}
        members={members}
        periodName={periodName}
        onRestoreSuccess={handleRestoreSuccess}
      />
    </div>
  );
}
