export type TransactionType = 'entrada' | 'saida' | 'falta_pagar' | 'falta_receber';

export type TransactionStatus = 'pago' | 'pendente' | 'atrasado';

export type PaymentMode = 'unico' | 'recorrente' | 'parcelado';

export interface PaymentAccount {
  id: string;
  name: string;
  type: 'cartao_credito' | 'conta_corrente' | 'dinheiro_caixa' | 'poupanca_investimento' | 'outros';
  color?: string;
  closingDay?: number; // Dia de fechamento da fatura (ex: dia 20)
  dueDay?: number;     // Dia de vencimento da fatura (ex: dia 28)
  creditLimit?: number; // Limite total do cartão (ex: 5000)
}

export interface Member {
  id: string;
  name: string;
  role: 'Administrador' | 'Membro' | 'Sócio' | 'Financeiro' | 'Familiar';
  color: string;
  avatar: string;
  email?: string;
  phone?: string;
}

export interface CategoryBudget {
  id: string;
  category: string;
  monthlyLimit: number;
  color: string;
  icon: string;
  type: 'despesa' | 'receita';
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD for falta_pagar / falta_receber
  paidDate?: string;
  memberId: string;
  account: string; // 'Conta Principal', 'Cartão de Crédito', etc.
  status: TransactionStatus;
  notes?: string;
  finePenaltyEstimated?: number; // Estimated penalty/interest if overdue
  invoiceBarcode?: string;

  // Recorrência e Parcelamento
  paymentMode?: PaymentMode; // 'unico' | 'recorrente' | 'parcelado'
  installmentCurrent?: number; // Parcela atual (ex: 1)
  installmentTotal?: number;   // Total de parcelas (ex: 12)
  installmentGroupId?: string; // ID para agrupar parcelas da mesma compra
  recurrenceFrequency?: 'mensal' | 'anual' | 'semanal';
  isCreditCard?: boolean;
}

export interface GoogleSheetsConfig {
  scriptUrl: string; // Web app URL of Google Apps Script
  sheetId: string;
  autoSync: boolean;
  lastSyncAt: string | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastError?: string;
  syncCount: number;
}

export interface FinancialSummary {
  entradasTotal: number;
  saidasTotal: number;
  faltaPagarTotal: number;
  faltaReceberTotal: number;
  saldoAtual: number; // Entradas - Saídas
  saldoProjetado: number; // (Entradas + Falta Receber) - (Saídas + Falta Pagar)
  taxaPoupanca: number; // % economizada ou margem
  faturasVencidasCount: number;
  faturasVencidasTotal: number;
  faturasHojeCount: number;
  faturasProximasCount: number;
}

export interface DueReminder {
  id: string;
  transactionId: string;
  description: string;
  amount: number;
  dueDate: string;
  daysRemaining: number;
  status: 'vencido' | 'vence_hoje' | 'vence_em_breve' | 'normal';
  category: string;
  memberId: string;
}

export type ProfileMode = 'familia' | 'empresa';
