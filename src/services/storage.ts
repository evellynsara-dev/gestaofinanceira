import { Member, CategoryBudget, Transaction, GoogleSheetsConfig, ProfileMode, PaymentAccount } from '../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase Configuration from Vite Environment Variables
export const SUPABASE_URL: string = (import.meta.env.VITE_SUPABASE_URL || '').trim();
export const SUPABASE_ANON_KEY: string = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

let _supabaseClient: SupabaseClient | null = null;

/**
 * Returns the initialized Supabase client singleton, or null if configuration is missing.
 */
export const getSupabaseClient = (): SupabaseClient | null => {
  if (_supabaseClient) return _supabaseClient;
  if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http')) {
    try {
      _supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
        },
      });
    } catch (err) {
      console.warn('Falha ao inicializar o Supabase client:', err);
      _supabaseClient = null;
    }
  }
  return _supabaseClient;
};

/**
 * Direct alias for the Supabase client
 */
export const supabase = getSupabaseClient();

/**
 * Checks if Supabase credentials are validly supplied
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http'));
};

const STORAGE_KEYS = {
  TRANSACTIONS: 'fin_control_transactions_v3',
  MEMBERS: 'fin_control_members_v1',
  BUDGETS: 'fin_control_budgets_v3',
  ACCOUNTS: 'fin_control_accounts_v3',
  SHEETS_CONFIG: 'fin_control_sheets_v1',
  PROFILE_MODE: 'fin_control_profile_mode_v1',
};

// Initial default payment accounts: empty by default so users register their own options
export const DEFAULT_ACCOUNTS: Record<ProfileMode, PaymentAccount[]> = {
  familia: [],
  empresa: [],
};

// Initial default members
export const DEFAULT_MEMBERS: Record<ProfileMode, Member[]> = {
  familia: [
    { id: 'm1', name: 'Carlos Silva (Pai)', role: 'Administrador', color: '#2563eb', avatar: '👨‍💼', email: 'carlos@familia.com', phone: '+55 11 98765-4321' },
    { id: 'm2', name: 'Mariana Silva (Mãe)', role: 'Administrador', color: '#db2777', avatar: '👩‍💼', email: 'mariana@familia.com', phone: '+55 11 98888-1122' },
    { id: 'm3', name: 'Lucas Silva (Filho)', role: 'Familiar', color: '#10b981', avatar: '👦', email: 'lucas@familia.com' },
    { id: 'm4', name: 'Beatriz Silva (Filha)', role: 'Familiar', color: '#8b5cf6', avatar: '👧', email: 'beatriz@familia.com' },
  ],
  empresa: [
    { id: 'm1', name: 'Roberto Mendes (Diretor)', role: 'Sócio', color: '#2563eb', avatar: '👔', email: 'roberto@empresa.com', phone: '+55 11 99111-2233' },
    { id: 'm2', name: 'Juliana Costa (Financeiro)', role: 'Financeiro', color: '#059669', avatar: '💼', email: 'juliana@empresa.com', phone: '+55 11 99222-3344' },
    { id: 'm3', name: 'Felipe Rocha (Operações)', role: 'Membro', color: '#d97706', avatar: '💻', email: 'felipe@empresa.com' },
  ]
};

// Initial category budgets: empty by default so users register their own options
export const DEFAULT_BUDGETS: Record<ProfileMode, CategoryBudget[]> = {
  familia: [],
  empresa: [],
};

// Initial transactions: start clean with 0 transactions
export const getInitialTransactions = (_mode: ProfileMode): Transaction[] => {
  return [];
};

export const DEFAULT_SHEETS_CONFIG: GoogleSheetsConfig = {
  scriptUrl: '',
  sheetId: 'Controle_Financeiro_Compartilhado_2026',
  autoSync: false,
  lastSyncAt: null,
  syncStatus: 'idle',
  syncCount: 0,
};

// Storage Operations
export const getProfileMode = (): ProfileMode => {
  const saved = localStorage.getItem(STORAGE_KEYS.PROFILE_MODE);
  return (saved === 'empresa' ? 'empresa' : 'familia');
};

export const setProfileMode = (mode: ProfileMode): void => {
  localStorage.setItem(STORAGE_KEYS.PROFILE_MODE, mode);
};

export const getTransactions = (mode: ProfileMode): Transaction[] => {
  const key = `${STORAGE_KEYS.TRANSACTIONS}_${mode}`;
  const saved = localStorage.getItem(key);
  if (!saved) {
    const initial = getInitialTransactions(mode);
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(saved);
  } catch (e) {
    console.error('Error parsing transactions', e);
    return getInitialTransactions(mode);
  }
};

// --- SUPABASE DATA MAPPERS & UTILITIES ---

export const mapTransactionToSupabaseRow = (t: Transaction, mode: ProfileMode) => ({
  id: t.id,
  profile_mode: mode,
  description: t.description,
  amount: Number(t.amount) || 0,
  type: t.type, // 'entrada' (receita), 'saida' (despesa), 'falta_pagar', 'falta_receber'
  category: t.category,
  date: t.date,
  due_date: t.dueDate || null,
  paid_date: t.paidDate || null,
  member_id: t.memberId,
  account: t.account,
  status: t.status,
  notes: t.notes || null,
  fine_penalty_estimated: t.finePenaltyEstimated ? Number(t.finePenaltyEstimated) : 0,
  invoice_barcode: t.invoiceBarcode || null,
  payment_mode: t.paymentMode || 'unico',
  installment_current: t.installmentCurrent || null,
  installment_total: t.installmentTotal || null,
  installment_group_id: t.installmentGroupId || null,
  recurrence_frequency: t.recurrenceFrequency || null,
  is_credit_card: Boolean(t.isCreditCard),
  updated_at: new Date().toISOString(),
});

const VALID_MEMBER_ROLES: Member['role'][] = ['Administrador', 'Membro', 'Sócio', 'Financeiro', 'Familiar'];
const VALID_TX_TYPES: Transaction['type'][] = ['entrada', 'saida', 'falta_pagar', 'falta_receber'];
const VALID_TX_STATUS: Transaction['status'][] = ['pago', 'pendente', 'atrasado'];
const VALID_PAYMENT_MODES: NonNullable<Transaction['paymentMode']>[] = ['unico', 'recorrente', 'parcelado'];
const VALID_ACCOUNT_TYPES: PaymentAccount['type'][] = ['cartao_credito', 'conta_corrente', 'dinheiro_caixa', 'poupanca_investimento', 'outros'];

export const mapSupabaseRowToTransaction = (row: any): Transaction => {
  const rowType = row.type as Transaction['type'];
  const type: Transaction['type'] = VALID_TX_TYPES.includes(rowType) ? rowType : 'saida';

  const rowStatus = row.status as Transaction['status'];
  const status: Transaction['status'] = VALID_TX_STATUS.includes(rowStatus) ? rowStatus : 'pendente';

  const rawPaymentMode = (row.payment_mode ?? row.paymentMode) as NonNullable<Transaction['paymentMode']>;
  const paymentMode = VALID_PAYMENT_MODES.includes(rawPaymentMode) ? rawPaymentMode : 'unico';

  return {
    id: String(row.id),
    description: String(row.description || ''),
    amount: Number(row.amount) || 0,
    type,
    category: row.category || 'Geral',
    date: row.date || new Date().toISOString().split('T')[0],
    dueDate: row.due_date ?? row.dueDate ?? undefined,
    paidDate: row.paid_date ?? row.paidDate ?? undefined,
    memberId: row.member_id ?? row.memberId ?? 'm1',
    account: row.account || 'Conta Principal',
    status,
    notes: row.notes || undefined,
    finePenaltyEstimated: row.fine_penalty_estimated !== undefined && row.fine_penalty_estimated !== null
      ? Number(row.fine_penalty_estimated)
      : row.finePenaltyEstimated !== undefined ? Number(row.finePenaltyEstimated) : undefined,
    invoiceBarcode: row.invoice_barcode ?? row.invoiceBarcode ?? undefined,
    paymentMode,
    installmentCurrent: row.installment_current ?? row.installmentCurrent ?? undefined,
    installmentTotal: row.installment_total ?? row.installmentTotal ?? undefined,
    installmentGroupId: row.installment_group_id ?? row.installmentGroupId ?? undefined,
    recurrenceFrequency: row.recurrence_frequency ?? row.recurrenceFrequency ?? undefined,
    isCreditCard: Boolean(row.is_credit_card ?? row.isCreditCard),
  };
};

export const mapMemberToSupabaseRow = (m: Member, mode: ProfileMode) => ({
  id: m.id,
  profile_mode: mode,
  name: m.name,
  role: m.role,
  color: m.color,
  avatar: m.avatar,
  email: m.email || null,
  phone: m.phone || null,
  updated_at: new Date().toISOString(),
});

export const mapSupabaseRowToMember = (row: any): Member => {
  const rawRole = row.role as Member['role'];
  const role: Member['role'] = VALID_MEMBER_ROLES.includes(rawRole) ? rawRole : 'Membro';

  return {
    id: String(row.id),
    name: String(row.name || ''),
    role,
    color: String(row.color || '#2563eb'),
    avatar: String(row.avatar || '👤'),
    email: row.email || undefined,
    phone: row.phone || undefined,
  };
};

export const mapBudgetToSupabaseRow = (b: CategoryBudget, mode: ProfileMode) => ({
  id: b.id,
  profile_mode: mode,
  category: b.category,
  monthly_limit: Number(b.monthlyLimit) || 0,
  color: b.color,
  icon: b.icon,
  type: b.type,
  updated_at: new Date().toISOString(),
});

export const mapSupabaseRowToBudget = (row: any): CategoryBudget => ({
  id: String(row.id),
  category: String(row.category || ''),
  monthlyLimit: Number(row.monthly_limit ?? row.monthlyLimit ?? 0),
  color: String(row.color || '#3b82f6'),
  icon: String(row.icon || 'Tag'),
  type: row.type === 'receita' ? 'receita' : 'despesa',
});

export const mapAccountToSupabaseRow = (a: PaymentAccount, mode: ProfileMode) => ({
  id: a.id,
  profile_mode: mode,
  name: a.name,
  type: a.type,
  closing_day: a.closingDay || null,
  due_day: a.dueDay || null,
  credit_limit: a.creditLimit ? Number(a.creditLimit) : null,
  color: a.color || '#2563eb',
  updated_at: new Date().toISOString(),
});

export const mapSupabaseRowToAccount = (row: any): PaymentAccount => {
  const rawType = (row.type as PaymentAccount['type']) || 'conta_corrente';
  const type = VALID_ACCOUNT_TYPES.includes(rawType) ? rawType : 'conta_corrente';

  return {
    id: String(row.id),
    name: String(row.name || ''),
    type,
    closingDay: row.closing_day ?? row.closingDay ?? undefined,
    dueDay: row.due_day ?? row.dueDay ?? undefined,
    creditLimit: row.credit_limit !== undefined && row.credit_limit !== null
      ? Number(row.credit_limit)
      : row.creditLimit !== undefined ? Number(row.creditLimit) : undefined,
    color: row.color || '#2563eb',
  };
};

// --- ASYNCHRONOUS SUPABASE PERSISTENCE FUNCTIONS ---

/**
 * Salva todas as transações (receitas e despesas) no Supabase
 */
export const saveTransactionsToSupabase = async (
  mode: ProfileMode,
  transactions: Transaction[]
): Promise<{ success: boolean; count: number; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, error: 'Supabase não configurado (VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausentes).' };
  }

  try {
    const rows = transactions.map((t) => mapTransactionToSupabaseRow(t, mode));

    if (rows.length > 0) {
      const { error: upsertError } = await client
        .from('transactions')
        .upsert(rows, { onConflict: 'id' });

      if (upsertError) throw upsertError;

      // Deleta transações antigas deste perfil que foram excluídas pelo usuário
      const activeIds = transactions.map((t) => t.id);
      const { error: deleteError } = await client
        .from('transactions')
        .delete()
        .eq('profile_mode', mode)
        .not('id', 'in', `(${activeIds.map((id) => `"${id}"`).join(',')})`);

      if (deleteError) {
        console.warn('Aviso ao sincronizar exclusões de transações no Supabase:', deleteError.message);
      }
    } else {
      await client.from('transactions').delete().eq('profile_mode', mode);
    }

    return { success: true, count: rows.length };
  } catch (err: any) {
    console.error('Erro ao salvar transações no Supabase:', err);
    return { success: false, count: 0, error: err.message || String(err) };
  }
};

/**
 * Carrega todas as transações (receitas e despesas) do Supabase para o perfil atual
 */
export const fetchTransactionsFromSupabase = async (
  mode: ProfileMode
): Promise<Transaction[] | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('transactions')
      .select('*')
      .eq('profile_mode', mode)
      .order('date', { ascending: false });

    if (error) throw error;
    if (!data || !Array.isArray(data)) return null;

    return data.map(mapSupabaseRowToTransaction);
  } catch (err: any) {
    console.error('Erro ao buscar transações do Supabase:', err);
    return null;
  }
};

/**
 * Salva todos os usuários/membros no Supabase
 */
export const saveMembersToSupabase = async (
  mode: ProfileMode,
  members: Member[]
): Promise<{ success: boolean; count: number; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, error: 'Supabase não configurado.' };
  }

  try {
    const rows = members.map((m) => mapMemberToSupabaseRow(m, mode));

    if (rows.length > 0) {
      const { error: upsertError } = await client
        .from('members')
        .upsert(rows, { onConflict: 'id' });

      if (upsertError) throw upsertError;

      const activeIds = members.map((m) => m.id);
      await client
        .from('members')
        .delete()
        .eq('profile_mode', mode)
        .not('id', 'in', `(${activeIds.map((id) => `"${id}"`).join(',')})`);
    } else {
      await client.from('members').delete().eq('profile_mode', mode);
    }

    return { success: true, count: rows.length };
  } catch (err: any) {
    console.error('Erro ao salvar membros no Supabase:', err);
    return { success: false, count: 0, error: err.message || String(err) };
  }
};

/**
 * Carrega todos os membros/usuários do Supabase
 */
export const fetchMembersFromSupabase = async (
  mode: ProfileMode
): Promise<Member[] | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('members')
      .select('*')
      .eq('profile_mode', mode);

    if (error) throw error;
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    return data.map(mapSupabaseRowToMember);
  } catch (err: any) {
    console.error('Erro ao buscar membros do Supabase:', err);
    return null;
  }
};

/**
 * Salva categorias de orçamentos (receitas e despesas) no Supabase
 */
export const saveBudgetsToSupabase = async (
  mode: ProfileMode,
  budgets: CategoryBudget[]
): Promise<{ success: boolean; count: number; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, error: 'Supabase não configurado.' };
  }

  try {
    const rows = budgets.map((b) => mapBudgetToSupabaseRow(b, mode));

    if (rows.length > 0) {
      const { error: upsertError } = await client
        .from('budgets')
        .upsert(rows, { onConflict: 'id' });

      if (upsertError) throw upsertError;

      const activeIds = budgets.map((b) => b.id);
      await client
        .from('budgets')
        .delete()
        .eq('profile_mode', mode)
        .not('id', 'in', `(${activeIds.map((id) => `"${id}"`).join(',')})`);
    } else {
      await client.from('budgets').delete().eq('profile_mode', mode);
    }

    return { success: true, count: rows.length };
  } catch (err: any) {
    console.error('Erro ao salvar orçamentos no Supabase:', err);
    return { success: false, count: 0, error: err.message || String(err) };
  }
};

/**
 * Carrega orçamentos e categorias do Supabase
 */
export const fetchBudgetsFromSupabase = async (
  mode: ProfileMode
): Promise<CategoryBudget[] | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('budgets')
      .select('*')
      .eq('profile_mode', mode);

    if (error) throw error;
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    return data.map(mapSupabaseRowToBudget);
  } catch (err: any) {
    console.error('Erro ao buscar orçamentos do Supabase:', err);
    return null;
  }
};

/**
 * Salva contas de pagamento no Supabase
 */
export const saveAccountsToSupabase = async (
  mode: ProfileMode,
  accounts: PaymentAccount[]
): Promise<{ success: boolean; count: number; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, error: 'Supabase não configurado.' };
  }

  try {
    const rows = accounts.map((a) => mapAccountToSupabaseRow(a, mode));

    if (rows.length > 0) {
      const { error: upsertError } = await client
        .from('accounts')
        .upsert(rows, { onConflict: 'id' });

      if (upsertError) throw upsertError;

      const activeIds = accounts.map((a) => a.id);
      await client
        .from('accounts')
        .delete()
        .eq('profile_mode', mode)
        .not('id', 'in', `(${activeIds.map((id) => `"${id}"`).join(',')})`);
    } else {
      await client.from('accounts').delete().eq('profile_mode', mode);
    }

    return { success: true, count: rows.length };
  } catch (err: any) {
    console.error('Erro ao salvar contas no Supabase:', err);
    return { success: false, count: 0, error: err.message || String(err) };
  }
};

/**
 * Carrega contas de pagamento do Supabase
 */
export const fetchAccountsFromSupabase = async (
  mode: ProfileMode
): Promise<PaymentAccount[] | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('accounts')
      .select('*')
      .eq('profile_mode', mode);

    if (error) throw error;
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    return data.map(mapSupabaseRowToAccount);
  } catch (err: any) {
    console.error('Erro ao buscar contas do Supabase:', err);
    return null;
  }
};

/**
 * Sincroniza todos os dados locais (transações, receitas, despesas, usuários e orçamentos) com o Supabase
 */
export const syncAllToSupabase = async (
  mode: ProfileMode
): Promise<{ success: boolean; message: string; details?: any }> => {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: 'Supabase não está configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.',
    };
  }

  const txs = getTransactions(mode);
  const mems = getMembers(mode);
  const bdgs = getBudgets(mode);
  const accs = getAccounts(mode);

  const [txRes, memRes, bdgRes, accRes] = await Promise.all([
    saveTransactionsToSupabase(mode, txs),
    saveMembersToSupabase(mode, mems),
    saveBudgetsToSupabase(mode, bdgs),
    saveAccountsToSupabase(mode, accs),
  ]);

  const allSuccess = txRes.success && memRes.success && bdgRes.success && accRes.success;
  const errorMsg = [txRes.error, memRes.error, bdgRes.error, accRes.error].filter(Boolean).join('; ');

  return {
    success: allSuccess,
    message: allSuccess
      ? `Sincronização concluída com sucesso! (${txRes.count} transações/receitas/despesas, ${memRes.count} usuários, ${bdgRes.count} categorias, ${accRes.count} contas salvas no Supabase)`
      : `Houve erro na sincronização: ${errorMsg}`,
    details: { txRes, memRes, bdgRes, accRes },
  };
};

/**
 * Baixa todos os dados do Supabase e atualiza o armazenamento local
 */
export const syncAllFromSupabase = async (
  mode: ProfileMode
): Promise<{
  success: boolean;
  message: string;
  transactions?: Transaction[];
  members?: Member[];
  budgets?: CategoryBudget[];
  accounts?: PaymentAccount[];
}> => {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: 'Supabase não configurado.',
    };
  }

  const [txs, mems, bdgs, accs] = await Promise.all([
    fetchTransactionsFromSupabase(mode),
    fetchMembersFromSupabase(mode),
    fetchBudgetsFromSupabase(mode),
    fetchAccountsFromSupabase(mode),
  ]);

  if (txs) {
    const key = `${STORAGE_KEYS.TRANSACTIONS}_${mode}`;
    localStorage.setItem(key, JSON.stringify(txs));
  }
  if (mems) {
    const key = `${STORAGE_KEYS.MEMBERS}_${mode}`;
    localStorage.setItem(key, JSON.stringify(mems));
  }
  if (bdgs) {
    const key = `${STORAGE_KEYS.BUDGETS}_${mode}`;
    localStorage.setItem(key, JSON.stringify(bdgs));
  }
  if (accs) {
    const key = `${STORAGE_KEYS.ACCOUNTS}_${mode}`;
    localStorage.setItem(key, JSON.stringify(accs));
  }

  return {
    success: true,
    message: 'Dados importados do Supabase com sucesso!',
    transactions: txs || undefined,
    members: mems || undefined,
    budgets: bdgs || undefined,
    accounts: accs || undefined,
  };
};

/**
 * Testa a conexão com o Supabase e a existência das tabelas
 */
export const testSupabaseConnection = async (): Promise<{
  success: boolean;
  message: string;
  tables: { transactions: boolean; members: boolean; budgets: boolean; accounts: boolean };
}> => {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.',
      tables: { transactions: false, members: false, budgets: false, accounts: false },
    };
  }

  const checkTable = async (tableName: string) => {
    try {
      const { error } = await client.from(tableName).select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  };

  const [t1, t2, t3, t4] = await Promise.all([
    checkTable('transactions'),
    checkTable('members'),
    checkTable('budgets'),
    checkTable('accounts'),
  ]);

  const allTablesOk = t1 && t2 && t3 && t4;
  return {
    success: allTablesOk,
    message: allTablesOk
      ? 'Conexão com o Supabase estabelecida com sucesso! Todas as tabelas encontradas.'
      : 'Conectado ao Supabase, mas uma ou mais tabelas ainda não foram criadas. Copie e execute o script SQL disponibilizado.',
    tables: {
      transactions: t1,
      members: t2,
      budgets: t3,
      accounts: t4,
    },
  };
};

/**
 * Gera o script SQL pronto para copiar e colar no Editor SQL do Supabase
 */
export const generateSupabaseSQLSchema = (): string => {
  return `-- ============================================================================
-- SCRIPT SQL DE CRIAÇÃO DAS TABELAS NO SUPABASE (CONTROLE FINANCEIRO)
-- Execute este script no menu "SQL Editor" do seu painel Supabase
-- ============================================================================

-- 1. TABELA DE TRANSAÇÕES (Receitas e Despesas)
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  profile_mode TEXT NOT NULL DEFAULT 'familia',
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  type TEXT NOT NULL, -- 'entrada' (receita), 'saida' (despesa), 'falta_pagar', 'falta_receber'
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  due_date TEXT,
  paid_date TEXT,
  member_id TEXT NOT NULL,
  account TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente', -- 'pago', 'pendente', 'atrasado'
  notes TEXT,
  fine_penalty_estimated NUMERIC(12, 2) DEFAULT 0,
  invoice_barcode TEXT,
  payment_mode TEXT DEFAULT 'unico', -- 'unico', 'recorrente', 'parcelado'
  installment_current INTEGER,
  installment_total INTEGER,
  installment_group_id TEXT,
  recurrence_frequency TEXT,
  is_credit_card BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE MEMBROS E USUÁRIOS
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  profile_mode TEXT NOT NULL DEFAULT 'familia',
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#2563eb',
  avatar TEXT NOT NULL DEFAULT '👤',
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE ORÇAMENTOS E CATEGORIAS (Receitas e Despesas)
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  profile_mode TEXT NOT NULL DEFAULT 'familia',
  category TEXT NOT NULL,
  monthly_limit NUMERIC(12, 2) NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icon TEXT NOT NULL DEFAULT 'Tag',
  type TEXT NOT NULL DEFAULT 'despesa', -- 'despesa', 'receita'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE CONTAS E MEIOS DE PAGAMENTO
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  profile_mode TEXT NOT NULL DEFAULT 'familia',
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'conta_corrente',
  closing_day INTEGER,
  due_day INTEGER,
  credit_limit NUMERIC(12, 2),
  color TEXT NOT NULL DEFAULT '#2563eb',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para a chave pública Anon
DROP POLICY IF EXISTS "Public access transactions" ON transactions;
CREATE POLICY "Public access transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access members" ON members;
CREATE POLICY "Public access members" ON members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access budgets" ON budgets;
CREATE POLICY "Public access budgets" ON budgets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access accounts" ON accounts;
CREATE POLICY "Public access accounts" ON accounts FOR ALL USING (true) WITH CHECK (true);
`;
};

// --- SYNCHRONOUS LOCAL ACCESSORS ---

export const saveTransactions = (mode: ProfileMode, transactions: Transaction[]): void => {
  const key = `${STORAGE_KEYS.TRANSACTIONS}_${mode}`;
  localStorage.setItem(key, JSON.stringify(transactions));
};

export const getMembers = (mode: ProfileMode): Member[] => {
  const key = `${STORAGE_KEYS.MEMBERS}_${mode}`;
  const saved = localStorage.getItem(key);
  if (!saved) {
    const initial = DEFAULT_MEMBERS[mode];
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(saved);
  } catch (e) {
    return DEFAULT_MEMBERS[mode];
  }
};

export const saveMembers = (mode: ProfileMode, members: Member[]): void => {
  const key = `${STORAGE_KEYS.MEMBERS}_${mode}`;
  localStorage.setItem(key, JSON.stringify(members));
};

export const getBudgets = (mode: ProfileMode): CategoryBudget[] => {
  const key = `${STORAGE_KEYS.BUDGETS}_${mode}`;
  const saved = localStorage.getItem(key);
  if (!saved) {
    const initial = DEFAULT_BUDGETS[mode];
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(saved);
  } catch (e) {
    return DEFAULT_BUDGETS[mode];
  }
};

export const saveBudgets = (mode: ProfileMode, budgets: CategoryBudget[]): void => {
  const key = `${STORAGE_KEYS.BUDGETS}_${mode}`;
  localStorage.setItem(key, JSON.stringify(budgets));
};

export const getAccounts = (mode: ProfileMode): PaymentAccount[] => {
  const key = `${STORAGE_KEYS.ACCOUNTS}_${mode}`;
  const saved = localStorage.getItem(key);
  if (!saved) {
    const initial = DEFAULT_ACCOUNTS[mode];
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(saved);
  } catch (e) {
    return DEFAULT_ACCOUNTS[mode];
  }
};

export const saveAccounts = (mode: ProfileMode, accounts: PaymentAccount[]): void => {
  const key = `${STORAGE_KEYS.ACCOUNTS}_${mode}`;
  localStorage.setItem(key, JSON.stringify(accounts));
};

export const getSheetsConfig = (): GoogleSheetsConfig => {
  const saved = localStorage.getItem(STORAGE_KEYS.SHEETS_CONFIG);
  if (!saved) return DEFAULT_SHEETS_CONFIG;
  try {
    return { ...DEFAULT_SHEETS_CONFIG, ...JSON.parse(saved) };
  } catch (e) {
    return DEFAULT_SHEETS_CONFIG;
  }
};

export const saveSheetsConfig = (config: GoogleSheetsConfig): void => {
  localStorage.setItem(STORAGE_KEYS.SHEETS_CONFIG, JSON.stringify(config));
};

// Google Apps Script Code Generator
export const generateGoogleAppsScriptCode = (): string => {
  return `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT - SINCRONIZADOR DE CONTROLE FINANCEIRO COMPARTILHADO
 * =========================================================================
 * INSTRUÇÕES:
 * 1. Abra sua planilha no Google Sheets (planilha nova ou existente).
 * 2. No menu superior, clique em "Extensões" > "Apps Script".
 * 3. Apague qualquer código existente e cole este script completo.
 * 4. Clique em "Implantar" (canto superior direito) > "Nova Implantação".
 * 5. Clique no ícone de engrenagem ao lado de "Tipo" e selecione "Aplicativo da Web".
 * 6. Configurações essenciais:
 *    - Descrição: Sincronizador Financeiro
 *    - Executar como: Eu (seu email)
 *    - Quem tem acesso: Qualquer pessoa (Permite que o app web envie dados)
 * 7. Clique em "Implantar", conceda as permissões de acesso da sua conta Google.
 * 8. Copie a "URL do Aplicativo da Web" gerada e cole no Dashboard do App!
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var txSheet = getOrCreateSheet(ss, "Transacoes", [
      "ID", "Tipo", "Descricao", "Valor", "Categoria", "Data", "Vencimento", "Status", "Membro", "Conta", "Multa_Estimada", "Observacoes"
    ]);
    
    var data = txSheet.getDataRange().getValues();
    var headers = data[0];
    var transactions = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue;
      transactions.push({
        id: String(row[0]),
        type: String(row[1]),
        description: String(row[2]),
        amount: Number(row[3]) || 0,
        category: String(row[4]),
        date: String(row[5]),
        dueDate: String(row[6] || ""),
        status: String(row[7]),
        memberId: String(row[8]),
        account: String(row[9]),
        finePenaltyEstimated: Number(row[10]) || 0,
        notes: String(row[11] || "")
      });
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      count: transactions.length,
      timestamp: new Date().toISOString(),
      transactions: transactions
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Aba Transações
    var txSheet = getOrCreateSheet(ss, "Transacoes", [
      "ID", "Tipo", "Descricao", "Valor (R$)", "Categoria", "Data", "Data Vencimento", "Status", "Membro ID", "Conta", "Condicao_Pagamento", "Parcela", "Multa Prevista", "Observações"
    ]);
    
    if (payload.transactions && Array.isArray(payload.transactions)) {
      // Limpa dados antigos mantendo cabeçalho
      var lastRow = txSheet.getLastRow();
      if (lastRow > 1) {
        txSheet.getRange(2, 1, lastRow - 1, 14).clearContent();
      }
      
      var rows = payload.transactions.map(function(t) {
        var installmentInfo = t.installmentTotal ? (t.installmentCurrent + "/" + t.installmentTotal) : "-";
        return [
          t.id || "",
          t.type || "",
          t.description || "",
          t.amount || 0,
          t.category || "",
          t.date || "",
          t.dueDate || "",
          t.status || "",
          t.memberId || "",
          t.account || "",
          t.paymentMode || "unico",
          installmentInfo,
          t.finePenaltyEstimated || 0,
          t.notes || ""
        ];
      });
      
      if (rows.length > 0) {
        txSheet.getRange(2, 1, rows.length, 14).setValues(rows);
        txSheet.getRange(2, 4, rows.length, 1).setNumberFormat("R$ #,##0.00");
        txSheet.getRange(2, 13, rows.length, 1).setNumberFormat("R$ #,##0.00");
      }
    }
    
    // 2. Aba Resumo Financeiro Consolidado
    if (payload.summary) {
      var sumSheet = getOrCreateSheet(ss, "Resumo_Consolidado", ["Indicador", "Valor (R$)", "Data da Sincronização"]);
      var sumRows = [
        ["Total Entradas (Recebido)", payload.summary.entradasTotal || 0, new Date()],
        ["Total Saídas (Pago)", payload.summary.saidasTotal || 0, new Date()],
        ["Total Falta Pagar (A Vencer/Vencido)", payload.summary.faltaPagarTotal || 0, new Date()],
        ["Total Falta Receber", payload.summary.faltaReceberTotal || 0, new Date()],
        ["Saldo Atual em Caixa", payload.summary.saldoAtual || 0, new Date()],
        ["Saldo Previsto (Final do Mês)", payload.summary.saldoProjetado || 0, new Date()],
        ["Taxa de Poupança/Margem (%)", (payload.summary.taxaPoupanca || 0) + "%", new Date()]
      ];
      
      var lastSumRow = sumSheet.getLastRow();
      if (lastSumRow > 1) {
        sumSheet.getRange(2, 1, lastSumRow - 1, 3).clearContent();
      }
      sumSheet.getRange(2, 1, sumRows.length, 3).setValues(sumRows);
      sumSheet.getRange(2, 2, 6, 1).setNumberFormat("R$ #,##0.00");
    }

    // 3. Aba Orçamentos por Categoria
    if (payload.budgets && Array.isArray(payload.budgets)) {
      var bgSheet = getOrCreateSheet(ss, "Orcamento_Categorias", ["Categoria", "Tipo", "Limite Mensal (R$)"]);
      var bgRows = payload.budgets.map(function(b) {
        return [b.category, b.type, b.monthlyLimit];
      });
      var lastBgRow = bgSheet.getLastRow();
      if (lastBgRow > 1) {
        bgSheet.getRange(2, 1, lastBgRow - 1, 3).clearContent();
      }
      if (bgRows.length > 0) {
        bgSheet.getRange(2, 1, bgRows.length, 3).setValues(bgRows);
        bgSheet.getRange(2, 3, bgRows.length, 1).setNumberFormat("R$ #,##0.00");
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Dados sincronizados com sucesso na planilha do Google Sheets!",
      timestamp: new Date().toISOString(),
      receivedRows: payload.transactions ? payload.transactions.length : 0
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(spreadsheet, sheetName, headers) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#1e293b");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}
`;
};

// --- BACKUP & RESTAURAÇÃO COMPLETA DE DADOS ---

export interface FullBackupPayload {
  version: number;
  appName: string;
  exportedAt: string;
  activeProfileMode: ProfileMode;
  data: {
    familia: {
      transactions: Transaction[];
      members: Member[];
      budgets: CategoryBudget[];
      accounts: PaymentAccount[];
    };
    empresa: {
      transactions: Transaction[];
      members: Member[];
      budgets: CategoryBudget[];
      accounts: PaymentAccount[];
    };
  };
  sheetsConfig?: GoogleSheetsConfig;
}

export interface BackupValidationResult {
  valid: boolean;
  error?: string;
  payload?: FullBackupPayload;
  stats?: {
    exportedAt: string;
    totalFamiliaTransactions: number;
    totalEmpresaTransactions: number;
    totalMembers: number;
    totalBudgets: number;
    totalAccounts: number;
  };
}

/**
 * Gera o objeto completo de backup de ambos os perfis (Família e Empresa)
 */
export const createFullBackupData = (activeMode?: ProfileMode): FullBackupPayload => {
  const currentMode = activeMode || getProfileMode();
  return {
    version: 1,
    appName: 'Controle Financeiro Compartilhado',
    exportedAt: new Date().toISOString(),
    activeProfileMode: currentMode,
    data: {
      familia: {
        transactions: getTransactions('familia'),
        members: getMembers('familia'),
        budgets: getBudgets('familia'),
        accounts: getAccounts('familia'),
      },
      empresa: {
        transactions: getTransactions('empresa'),
        members: getMembers('empresa'),
        budgets: getBudgets('empresa'),
        accounts: getAccounts('empresa'),
      },
    },
    sheetsConfig: getSheetsConfig(),
  };
};

/**
 * Faz o download do arquivo de backup (.json) no navegador do usuário
 */
export const downloadFullBackupFile = (activeMode?: ProfileMode): { filename: string; sizeBytes: number } => {
  const backupData = createFullBackupData(activeMode);
  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = `backup-financeiro-${dateStr}-${timeStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { filename, sizeBytes: blob.size };
};

/**
 * Valida o conteúdo de um arquivo de backup
 */
export const validateBackupJSON = (content: string): BackupValidationResult => {
  try {
    const parsed = JSON.parse(content);

    // Formato 1: Backup Completo Oficial (com 'data' e 'familia'/'empresa')
    if (parsed && typeof parsed === 'object' && parsed.data && (parsed.data.familia || parsed.data.empresa)) {
      const famTx = parsed.data.familia?.transactions || [];
      const empTx = parsed.data.empresa?.transactions || [];
      const famMem = parsed.data.familia?.members || [];
      const empMem = parsed.data.empresa?.members || [];
      const famBdg = parsed.data.familia?.budgets || [];
      const empBdg = parsed.data.empresa?.budgets || [];
      const famAcc = parsed.data.familia?.accounts || [];
      const empAcc = parsed.data.empresa?.accounts || [];

      return {
        valid: true,
        payload: parsed as FullBackupPayload,
        stats: {
          exportedAt: parsed.exportedAt || new Date().toISOString(),
          totalFamiliaTransactions: famTx.length,
          totalEmpresaTransactions: empTx.length,
          totalMembers: famMem.length + empMem.length,
          totalBudgets: famBdg.length + empBdg.length,
          totalAccounts: famAcc.length + empAcc.length,
        },
      };
    }

    // Formato 2: Lista direta de transações
    if (Array.isArray(parsed)) {
      const isTxList = parsed.every((item) => item && typeof item === 'object' && ('amount' in item || 'description' in item));
      if (isTxList) {
        const synthetic: FullBackupPayload = {
          version: 1,
          appName: 'Controle Financeiro Importado',
          exportedAt: new Date().toISOString(),
          activeProfileMode: 'familia',
          data: {
            familia: {
              transactions: parsed,
              members: DEFAULT_MEMBERS.familia,
              budgets: DEFAULT_BUDGETS.familia,
              accounts: DEFAULT_ACCOUNTS.familia,
            },
            empresa: {
              transactions: getInitialTransactions('empresa'),
              members: DEFAULT_MEMBERS.empresa,
              budgets: DEFAULT_BUDGETS.empresa,
              accounts: DEFAULT_ACCOUNTS.empresa,
            },
          },
        };
        return {
          valid: true,
          payload: synthetic,
          stats: {
            exportedAt: new Date().toISOString(),
            totalFamiliaTransactions: parsed.length,
            totalEmpresaTransactions: 0,
            totalMembers: DEFAULT_MEMBERS.familia.length,
            totalBudgets: DEFAULT_BUDGETS.familia.length,
            totalAccounts: DEFAULT_ACCOUNTS.familia.length,
          },
        };
      }
    }

    // Formato 3: Objeto com transações e membros na raiz
    if (parsed && typeof parsed === 'object' && (parsed.transactions || parsed.members || parsed.budgets)) {
      const txs = parsed.transactions || [];
      const synthetic: FullBackupPayload = {
        version: 1,
        appName: 'Controle Financeiro Importado',
        exportedAt: parsed.exportedAt || new Date().toISOString(),
        activeProfileMode: parsed.activeProfileMode || 'familia',
        data: {
          familia: {
            transactions: txs,
            members: parsed.members || DEFAULT_MEMBERS.familia,
            budgets: parsed.budgets || DEFAULT_BUDGETS.familia,
            accounts: parsed.accounts || DEFAULT_ACCOUNTS.familia,
          },
          empresa: {
            transactions: getInitialTransactions('empresa'),
            members: DEFAULT_MEMBERS.empresa,
            budgets: DEFAULT_BUDGETS.empresa,
            accounts: DEFAULT_ACCOUNTS.empresa,
          },
        },
      };
      return {
        valid: true,
        payload: synthetic,
        stats: {
          exportedAt: parsed.exportedAt || new Date().toISOString(),
          totalFamiliaTransactions: txs.length,
          totalEmpresaTransactions: 0,
          totalMembers: (parsed.members || DEFAULT_MEMBERS.familia).length,
          totalBudgets: (parsed.budgets || DEFAULT_BUDGETS.familia).length,
          totalAccounts: (parsed.accounts || DEFAULT_ACCOUNTS.familia).length,
        },
      };
    }

    return {
      valid: false,
      error: 'O arquivo selecionado não possui um formato de backup válido para o Controle Financeiro.',
    };
  } catch (err: any) {
    return {
      valid: false,
      error: 'Erro ao interpretar o arquivo: ' + (err.message || 'formato JSON corrompido'),
    };
  }
};

/**
 * Restaura o backup completo no armazenamento local
 */
export const restoreFullBackup = (
  payload: FullBackupPayload,
  activeMode: ProfileMode
): {
  success: boolean;
  restoredMode: ProfileMode;
  transactions: Transaction[];
  members: Member[];
  budgets: CategoryBudget[];
  accounts: PaymentAccount[];
} => {
  // Salva dados de Família se presentes
  if (payload.data?.familia) {
    saveTransactions('familia', payload.data.familia.transactions || []);
    saveMembers('familia', payload.data.familia.members || DEFAULT_MEMBERS.familia);
    saveBudgets('familia', payload.data.familia.budgets || DEFAULT_BUDGETS.familia);
    saveAccounts('familia', payload.data.familia.accounts || DEFAULT_ACCOUNTS.familia);
  }

  // Salva dados de Empresa se presentes
  if (payload.data?.empresa) {
    saveTransactions('empresa', payload.data.empresa.transactions || []);
    saveMembers('empresa', payload.data.empresa.members || DEFAULT_MEMBERS.empresa);
    saveBudgets('empresa', payload.data.empresa.budgets || DEFAULT_BUDGETS.empresa);
    saveAccounts('empresa', payload.data.empresa.accounts || DEFAULT_ACCOUNTS.empresa);
  }

  // Restaura o modo ou mantém o ativo
  const targetMode = payload.activeProfileMode || activeMode;
  setProfileMode(targetMode);

  if (payload.sheetsConfig) {
    saveSheetsConfig(payload.sheetsConfig);
  }

  return {
    success: true,
    restoredMode: targetMode,
    transactions: getTransactions(targetMode),
    members: getMembers(targetMode),
    budgets: getBudgets(targetMode),
    accounts: getAccounts(targetMode),
  };
};
