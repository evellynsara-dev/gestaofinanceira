import React, { useState } from 'react';
import {
  X,
  FileText,
  FileSpreadsheet,
  Share2,
  Copy,
  Check,
  Send,
  Download,
  Phone,
} from 'lucide-react';
import { Transaction, FinancialSummary, CategoryBudget, Member } from '../types';
import {
  exportToPDF,
  exportToExcel,
  exportToGoogleSheetsBackup,
  generateWhatsAppReportText,
  sendWhatsAppReport,
} from '../services/exportService';

interface ExportAndShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  summary: FinancialSummary;
  budgets: CategoryBudget[];
  members: Member[];
  periodName: string;
  profileTitle: string;
}

export const ExportAndShareModal: React.FC<ExportAndShareModalProps> = ({
  isOpen,
  onClose,
  transactions,
  summary,
  budgets,
  members,
  periodName,
  profileTitle,
}) => {
  const [copied, setCopied] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  if (!isOpen) return null;

  const overdueBills = transactions.filter((t) => t.type === 'falta_pagar');
  const whatsAppText = generateWhatsAppReportText(summary, periodName, profileTitle, overdueBills);

  const handleCopy = () => {
    navigator.clipboard.writeText(whatsAppText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    sendWhatsAppReport(phoneNumber, whatsAppText);
  };

  const handleExportPDF = () => {
    exportToPDF(transactions, summary, budgets, members, periodName, profileTitle);
  };

  const handleExportExcel = () => {
    exportToExcel(transactions, summary, budgets, members, periodName);
  };

  const handleExportGoogleSheets = () => {
    exportToGoogleSheetsBackup(transactions, summary, budgets, members, periodName);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Exportação de Relatórios & Compartilhamento
              </h3>
              <p className="text-xs text-slate-500">
                Gere arquivos em PDF, Excel ou envie o resumo consolidado no WhatsApp
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

        <div className="p-5 space-y-6 text-xs">
          {/* Export Options Grid (PDF & Excel) */}
          <div>
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">
              1. Exportar Documentos Oficiais
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Google Sheets Backup Card */}
              <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 hover:border-emerald-400 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-emerald-700 mb-2">
                    <FileSpreadsheet className="w-5 h-5" />
                    <span className="font-bold text-slate-900 text-sm">Backup Google Planilhas</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Arquivo pronto para importar no <strong>Google Sheets</strong> (drive / sheets.new) com 5 abas organizadas: Resumo, Transações, Contas a Pagar, Orçamentos e Membros.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportGoogleSheets}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar Backup Planilha
                </button>
              </div>

              {/* Excel Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:border-slate-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-emerald-600 mb-2">
                    <FileSpreadsheet className="w-5 h-5" />
                    <span className="font-bold text-slate-900 text-sm">Planilha em Excel</span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Arquivo XLSX formatado com fórmulas e abas de Resumo Executivo, Transações, Vencimentos e Limites de Orçamento.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar Excel (.xlsx)
                </button>
              </div>

              {/* PDF Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:border-slate-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-rose-600 mb-2">
                    <FileText className="w-5 h-5" />
                    <span className="font-bold text-slate-900 text-sm">Relatório em PDF</span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Documento diagramado com resumo do saldo consolidado, demonstrativo dos 4 quadros e status dos orçamentos por categoria.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar PDF (.pdf)
                </button>
              </div>
            </div>
          </div>

          {/* WhatsApp Direct Share Section */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                2. Enviar Relatório Consolidado pelo WhatsApp
              </h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                1-Clique
              </span>
            </div>

            {/* Target Phone Input */}
            <div className="mb-3">
              <label className="block font-semibold text-slate-700 mb-1">
                Número de WhatsApp de Destino (Opcional)
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ex: 5511999998888 ou deixe em branco para escolher no WhatsApp"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Se deixar em branco, o WhatsApp abrirá sua lista de conversas para você escolher o grupo da família ou da empresa.
              </p>
            </div>

            {/* Message Preview Box */}
            <div className="p-3.5 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap border border-slate-800">
              {whatsAppText}
            </div>

            {/* WhatsApp Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado para Área de Transferência!' : 'Copiar Texto'}</span>
              </button>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar pelo WhatsApp Agora</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
