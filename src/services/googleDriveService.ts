import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Transaction, FinancialSummary, CategoryBudget, Member } from '../types';

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Workspace Scopes for Google Drive & Google Sheets
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
];

const provider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

export interface GoogleDriveUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// In-memory token cache (never stored in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let cachedUser: GoogleDriveUser | null = null;
let isSigningIn = false;

type AuthListener = (user: GoogleDriveUser | null, token: string | null) => void;
const authListeners: AuthListener[] = [];

export interface GoogleDriveConfig {
  spreadsheetId: string | null;
  spreadsheetName: string;
  spreadsheetUrl: string | null;
  lastSyncAt: string | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastError?: string;
  autoSync: boolean;
  syncCount: number;
}

const STORAGE_KEY = 'cf_google_drive_sheets_config';
const USER_PROFILE_KEY = 'cf_google_user_profile';

export const DEFAULT_DRIVE_CONFIG: GoogleDriveConfig = {
  spreadsheetId: null,
  spreadsheetName: 'Controle Financeiro - Backup Google Drive',
  spreadsheetUrl: null,
  lastSyncAt: null,
  syncStatus: 'idle',
  autoSync: false,
  syncCount: 0,
};

export const getGoogleDriveConfig = (): GoogleDriveConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_DRIVE_CONFIG;
    return { ...DEFAULT_DRIVE_CONFIG, ...JSON.parse(saved) };
  } catch {
    return DEFAULT_DRIVE_CONFIG;
  }
};

export const saveGoogleDriveConfig = (config: GoogleDriveConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Erro ao salvar configuração do Google Drive:', err);
  }
};

// Restore cached user profile (without token) on init
const getStoredUserProfile = (): GoogleDriveUser | null => {
  try {
    const saved = sessionStorage.getItem(USER_PROFILE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

// Dynamic loader for Google Identity Services script
export const loadGsiScript = (): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve();
    if ((window as any).google?.accounts?.oauth2) {
      return resolve();
    }
    const existing = document.getElementById('google-gsi-client');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
};

// Fetch Google Profile information using access token
const fetchGoogleUserInfo = async (token: string): Promise<GoogleDriveUser> => {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Não foi possível obter os dados do perfil Google.');
  }

  const data = await res.json();
  return {
    uid: data.sub || String(Date.now()),
    email: data.email || null,
    displayName: data.name || data.email || 'Usuário Google',
    photoURL: data.picture || null,
  };
};

// Request OAuth Access Token using Google Identity Services
const requestTokenViaGSI = async (clientId: string): Promise<string> => {
  await loadGsiScript();

  return new Promise((resolve, reject) => {
    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      return reject(new Error('Google Identity Services ainda está inicializando. Tente novamente em alguns segundos.'));
    }

    try {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: WORKSPACE_SCOPES.join(' '),
        callback: (response: any) => {
          if (response.error) {
            if (response.error === 'popup_closed_by_user' || response.error === 'access_denied') {
              reject(new Error('Autorização cancelada pelo usuário.'));
            } else {
              reject(new Error(response.error_description || response.error || 'Erro na autenticação do Google.'));
            }
            return;
          }
          if (!response.access_token) {
            reject(new Error('Nenhum token de acesso retornado pelo Google.'));
            return;
          }
          resolve(response.access_token);
        },
        error_callback: (err: any) => {
          reject(new Error(err?.message || 'Falha na janela de autenticação do Google.'));
        },
      });

      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } catch (err: any) {
      reject(err);
    }
  });
};

// Listen for Auth Changes
export const initGoogleAuth = (
  onAuthSuccess?: (user: GoogleDriveUser, token: string | null) => void,
  onAuthSignOut?: () => void
) => {
  const initialProfile = getStoredUserProfile();
  if (initialProfile && !cachedUser) {
    cachedUser = initialProfile;
  }

  const listener: AuthListener = (user, token) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else {
      if (onAuthSignOut) onAuthSignOut();
    }
  };

  authListeners.push(listener);

  if (cachedUser) {
    listener(cachedUser, cachedAccessToken);
  }

  const unsubFirebase = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser && !cachedUser) {
      const gUser: GoogleDriveUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      };
      cachedUser = gUser;
      sessionStorage.setItem(USER_PROFILE_KEY, JSON.stringify(gUser));
      listener(gUser, cachedAccessToken);
    }
  });

  return () => {
    const idx = authListeners.indexOf(listener);
    if (idx !== -1) authListeners.splice(idx, 1);
    unsubFirebase();
  };
};

// Sign in with Google (Firebase Auth as primary, GSI as fallback)
export const signInWithGoogle = async (): Promise<{ user: GoogleDriveUser; accessToken: string }> => {
  isSigningIn = true;
  try {
    let token: string | null = null;
    let user: GoogleDriveUser | null = null;

    // 1. Primary: Firebase Auth Popup (standard flow configured via set_up_oauth)
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        token = credential.accessToken;
        user = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
        };
      }
    } catch (fbErr: any) {
      console.warn('Firebase signInWithPopup avisou:', fbErr);
      if (fbErr.code === 'auth/popup-closed-by-user') {
        const cancelErr = new Error('A janela de login do Google foi fechada antes da confirmação. Clique novamente em "Entrar com o Google" quando desejar.');
        (cancelErr as any).code = 'auth/popup-closed-by-user';
        throw cancelErr;
      }
      if (fbErr.code === 'auth/popup-blocked') {
        const blockErr = new Error('O navegador bloqueou a janela pop-up do Google. Permita pop-ups para este site para fazer login com sua conta Google.');
        (blockErr as any).code = 'auth/popup-blocked';
        throw blockErr;
      }
      // If Firebase failed (e.g. domain authorization propagation delay), attempt GSI fallback
      const clientId = firebaseConfig.oAuthClientId;
      if (clientId) {
        try {
          token = await requestTokenViaGSI(clientId);
          user = await fetchGoogleUserInfo(token);
        } catch (gsiErr: any) {
          console.error('GSI fallback falhou:', gsiErr);
          throw fbErr; // throw original Firebase error
        }
      } else {
        throw fbErr;
      }
    }

    if (!token || !user) {
      throw new Error('Não foi possível obter o token de acesso da sua conta Google.');
    }

    cachedAccessToken = token;
    cachedUser = user;
    sessionStorage.setItem(USER_PROFILE_KEY, JSON.stringify(user));

    authListeners.forEach((l) => l(user, token));

    return { user, accessToken: token };
  } catch (error: any) {
    console.error('Erro no login do Google:', error);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const isExternalDomain = origin && !origin.includes('localhost') && !origin.includes('run.app');

    if (error.code === 'auth/unauthorized-domain' || error.message?.includes('origin_mismatch')) {
      const originMsg = isExternalDomain
        ? `O domínio "${origin}" precisa ser adicionado às Origens JavaScript autorizadas do Google Cloud Console.`
        : 'Aguarde alguns instantes enquanto a autorização do Google Cloud propaga e tente novamente.';
      const customErr = new Error(originMsg);
      (customErr as any).code = 'origin_mismatch';
      (customErr as any).origin = origin;
      throw customErr;
    }
    if (error.code === 'auth/popup-closed-by-user') {
      const cancelErr = new Error('A janela de login do Google foi fechada antes de concluir.');
      (cancelErr as any).code = 'auth/popup-closed-by-user';
      (cancelErr as any).origin = origin;
      throw cancelErr;
    }
    if (error.code === 'auth/popup-blocked') {
      const blockErr = new Error('O navegador bloqueou a janela pop-up do Google. Permita pop-ups para este site para fazer login.');
      (blockErr as any).code = 'auth/popup-blocked';
      throw blockErr;
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Sign out
export const signOutGoogle = async (): Promise<void> => {
  try {
    if (cachedAccessToken && (window as any).google?.accounts?.oauth2?.revoke) {
      (window as any).google.accounts.oauth2.revoke(cachedAccessToken, () => {});
    }
  } catch (err) {
    console.warn('Revoke token warning:', err);
  }

  try {
    await signOut(auth);
  } catch {
    // Ignore
  }

  cachedAccessToken = null;
  cachedUser = null;
  sessionStorage.removeItem(USER_PROFILE_KEY);
  authListeners.forEach((l) => l(null, null));
};

// Get current in-memory access token
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null): void => {
  cachedAccessToken = token;
};

// =========================================================================
// GOOGLE DRIVE & GOOGLE SHEETS API OPERATIONS
// =========================================================================

export interface DriveSpreadsheetItem {
  id: string;
  name: string;
  webViewLink?: string;
  modifiedTime?: string;
}

/**
 * List spreadsheets created in Google Drive by this app or matching the name
 */
export const listDriveSpreadsheets = async (
  token: string
): Promise<DriveSpreadsheetItem[]> => {
  const query = encodeURIComponent(
    "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink,modifiedTime)&pageSize=15&orderBy=modifiedTime desc`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Falha ao listar arquivos do Google Drive (${response.status})`
    );
  }

  const data = await response.json();
  return data.files || [];
};

/**
 * Create a fresh Google Spreadsheet directly in the user's Google Drive
 */
export const createGoogleDriveSpreadsheet = async (
  token: string,
  title: string
): Promise<{ id: string; url: string }> => {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';

  const body = {
    properties: {
      title: title || 'Controle Financeiro - Backup Google Drive',
    },
    sheets: [
      { properties: { title: 'Resumo' } },
      { properties: { title: 'Transações' } },
      { properties: { title: 'Contas a Pagar' } },
      { properties: { title: 'Orçamentos' } },
      { properties: { title: 'Membros' } },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message ||
        `Erro ao criar planilha no Google Drive (${response.status})`
    );
  }

  const data = await response.json();
  const id = data.spreadsheetId;
  const webViewLink =
    data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${id}/edit`;

  return { id, url: webViewLink };
};

/**
 * Ensure the required sheets exist in an existing spreadsheet
 */
const ensureSheetsExist = async (
  token: string,
  spreadsheetId: string,
  requiredTitles: string[]
) => {
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`;
  const metaRes = await fetch(metaUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!metaRes.ok) return; // Ignore if permission or not found

  const metaData = await metaRes.json();
  const existingTitles = new Set(
    (metaData.sheets || []).map((s: any) => s.properties?.title)
  );

  const missing = requiredTitles.filter((title) => !existingTitles.has(title));
  if (missing.length === 0) return;

  const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const requests = missing.map((title) => ({
    addSheet: {
      properties: { title },
    },
  }));

  await fetch(batchUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });
};

/**
 * Synchronize all financial data into the Google Sheets spreadsheet in Google Drive
 */
export const syncFinancialDataToSheets = async (
  token: string,
  spreadsheetId: string,
  transactions: Transaction[],
  summary: FinancialSummary,
  budgets: CategoryBudget[],
  members: Member[],
  periodName: string
): Promise<{ success: boolean; message: string; updatedSheetsCount: number }> => {
  // 1. Ensure sheets exist
  const sheetNames = ['Resumo', 'Transações', 'Contas a Pagar', 'Orçamentos', 'Membros'];
  await ensureSheetsExist(token, spreadsheetId, sheetNames);

  // 2. Clear old data to prevent stale leftover rows
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`;
  await fetch(clearUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ranges: [
        'Resumo!A1:Z100',
        'Transações!A1:Z3000',
        "'Contas a Pagar'!A1:Z2000",
        'Orçamentos!A1:Z200',
        'Membros!A1:Z100',
      ],
    }),
  });

  // 3. Build data payloads
  const memberMap = new Map(members.map((m) => [m.id, m.name]));

  // Sheet: Resumo
  const resumoValues: any[][] = [
    ['CONTROLE FINANCEIRO COMPARTILHADO - GOOGLE DRIVE & PLANILHAS'],
    ['Período de Competência:', periodName],
    ['Último Backup em Tempo Real:', new Date().toLocaleString('pt-BR')],
    ['Armazenado em:', 'Google Drive Pessoal (via Login Google)'],
    [''],
    ['INDICADOR FINANCEIRO', 'VALOR (R$)', 'STATUS / DETALHE'],
    ['Entradas Recebidas', summary.entradasTotal, 'Receitas confirmadas no mês'],
    ['Saídas Pagas', summary.saidasTotal, 'Despesas quitadas'],
    ['Falta Pagar (Pendentes)', summary.faltaPagarTotal, 'Contas e faturas a vencer'],
    ['Falta Receber (Esperado)', summary.faltaReceberTotal, 'Recebimentos previstos'],
    [''],
    ['SALDO ATUAL EM CAIXA', summary.saldoAtual, summary.saldoAtual >= 0 ? 'Positivo' : 'Negativo'],
    ['SALDO PROJETADO FINAL', summary.saldoProjetado, summary.saldoProjetado >= 0 ? 'Superávit' : 'Déficit'],
    ['TAXA DE ECONOMIA', `${summary.taxaPoupanca.toFixed(1)}%`, 'Margem poupada'],
    ['FATURAS EM ATRASO', summary.faturasVencidasTotal, `${summary.faturasVencidasCount} conta(s) em atraso`],
  ];

  // Sheet: Transações
  const txHeader = [
    'ID',
    'Tipo',
    'Descrição',
    'Valor (R$)',
    'Categoria',
    'Data Competência',
    'Vencimento',
    'Data Pagamento',
    'Status',
    'Responsável',
    'Conta',
    'Modo Pagamento',
    'Parcela',
    'Multa Prevista (R$)',
    'Cartão de Crédito',
    'Código de Barras',
    'Observações',
  ];

  const txValues: any[][] = [
    txHeader,
    ...transactions.map((t) => [
      t.id,
      t.type === 'entrada'
        ? 'Receita'
        : t.type === 'saida'
        ? 'Despesa'
        : t.type === 'falta_pagar'
        ? 'Falta Pagar'
        : 'Falta Receber',
      t.description,
      t.amount,
      t.category,
      t.date,
      t.dueDate || '',
      t.paidDate || '',
      t.status.toUpperCase(),
      memberMap.get(t.memberId) || 'Geral',
      t.account,
      t.paymentMode === 'parcelado'
        ? 'Parcelado'
        : t.paymentMode === 'recorrente'
        ? 'Recorrente'
        : 'À Vista',
      t.paymentMode === 'parcelado' && t.installmentTotal
        ? `${t.installmentCurrent || 1}/${t.installmentTotal}`
        : '',
      t.finePenaltyEstimated || 0,
      t.isCreditCard ? 'Sim' : 'Não',
      t.invoiceBarcode || '',
      t.notes || '',
    ]),
  ];

  // Sheet: Contas a Pagar
  const pagarHeader = [
    'Conta / Fatura',
    'Valor (R$)',
    'Vencimento',
    'Status',
    'Responsável',
    'Categoria',
    'Conta',
    'Multa Estimada (R$)',
    'Código de Barras / Linha Digitável',
    'Observações',
  ];

  const pendencias = transactions.filter((t) => t.type === 'falta_pagar');
  const pagarValues: any[][] = [
    pagarHeader,
    ...pendencias.map((t) => [
      t.description,
      t.amount,
      t.dueDate || '',
      t.status.toUpperCase(),
      memberMap.get(t.memberId) || 'Geral',
      t.category,
      t.account,
      t.finePenaltyEstimated || 0,
      t.invoiceBarcode || '',
      t.notes || '',
    ]),
  ];

  // Sheet: Orçamentos
  const orcamentoHeader = [
    'Categoria',
    'Limite Mensal (R$)',
    'Gasto / Comprometido (R$)',
    'Saldo Disponível (R$)',
    '% Utilizado',
    'Situação',
  ];

  const despesaBudgets = budgets.filter((b) => b.type === 'despesa');
  const orcamentoValues: any[][] = [
    orcamentoHeader,
    ...despesaBudgets.map((b) => {
      const gasto = transactions
        .filter((t) => t.category === b.category && (t.type === 'saida' || t.type === 'falta_pagar'))
        .reduce((sum, item) => sum + item.amount, 0);
      const saldo = b.monthlyLimit - gasto;
      const pct = b.monthlyLimit > 0 ? ((gasto / b.monthlyLimit) * 100).toFixed(1) : '0.0';
      const situacao =
        gasto > b.monthlyLimit
          ? 'ESTOURADO'
          : gasto > b.monthlyLimit * 0.85
          ? 'ALERTA'
          : 'DENTRO DO LIMITE';
      return [b.category, b.monthlyLimit, gasto, saldo, `${pct}%`, situacao];
    }),
  ];

  // Sheet: Membros
  const membrosHeader = ['ID', 'Nome', 'Papel', 'E-mail', 'Telefone'];
  const membrosValues: any[][] = [
    membrosHeader,
    ...members.map((m) => [m.id, m.name, m.role, m.email || '', m.phone || '']),
  ];

  // 4. Batch update values to Google Sheets
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const updatePayload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      { range: 'Resumo!A1', values: resumoValues },
      { range: 'Transações!A1', values: txValues },
      { range: "'Contas a Pagar'!A1", values: pagarValues },
      { range: 'Orçamentos!A1', values: orcamentoValues },
      { range: 'Membros!A1', values: membrosValues },
    ],
  };

  const updateResponse = await fetch(updateUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updatePayload),
  });

  if (!updateResponse.ok) {
    const errorData = await updateResponse.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message ||
        `Erro ao gravar dados na planilha do Google (${updateResponse.status})`
    );
  }

  return {
    success: true,
    message: `Planilha atualizada com sucesso no Google Drive (${transactions.length} lançamentos)!`,
    updatedSheetsCount: 5,
  };
};
