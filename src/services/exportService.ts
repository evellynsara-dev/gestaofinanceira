import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Transaction, FinancialSummary, CategoryBudget, Member } from '../types';

export const formatBRL = (amount: number): string => {
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
};

export const formatDateBR = (dateStr?: string): string => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

// ==========================================
// 1. PDF EXPORT
// ==========================================
export const exportToPDF = (
  transactions: Transaction[],
  summary: FinancialSummary,
  budgets: CategoryBudget[],
  members: Member[],
  periodName: string,
  profileTitle: string
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const memberMap = new Map(members.map((m) => [m.id, m.name]));

  // Header
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`RELATÓRIO FINANCEIRO CONSOLIDADO`, 14, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${profileTitle} | Período: ${periodName}`, 14, 22);
  doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 28);

  // Consolidated Balance Overview Box
  doc.setFillColor(241, 245, 249); // Slate-100
  doc.roundedRect(14, 38, 182, 28, 3, 3, 'F');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('SALDO ATUAL EM CAIXA', 20, 46);
  doc.text('SALDO PREVISTO (FINAL)', 85, 46);
  doc.text('PREVISÃO DE MULTAS/ENCARGOS', 145, 46);

  doc.setFontSize(14);
  const saldoAtualColor = summary.saldoAtual >= 0 ? [16, 185, 129] : [239, 68, 68];
  doc.setTextColor(saldoAtualColor[0], saldoAtualColor[1], saldoAtualColor[2]);
  doc.text(formatBRL(summary.saldoAtual), 20, 56);

  const saldoProjColor = summary.saldoProjetado >= 0 ? [37, 99, 235] : [239, 68, 68];
  doc.setTextColor(saldoProjColor[0], saldoProjColor[1], saldoProjColor[2]);
  doc.text(formatBRL(summary.saldoProjetado), 85, 56);

  doc.setTextColor(239, 68, 68);
  doc.text(formatBRL(summary.faturasVencidasTotal), 145, 56);

  // 4 Quadrants Summary Row
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Entradas: ${formatBRL(summary.entradasTotal)}  |  Saídas: ${formatBRL(summary.saidasTotal)}  |  Falta Pagar: ${formatBRL(summary.faltaPagarTotal)}  |  Falta Receber: ${formatBRL(summary.faltaReceberTotal)}`,
    20,
    63
  );

  // Section 1: Detailed Transactions
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Demonstrativo dos 4 Quadros de Movimentações', 14, 74);

  const tableData = transactions.map((t) => {
    let typeLabel = 'Entrada';
    if (t.type === 'saida') typeLabel = 'Saída';
    if (t.type === 'falta_pagar') typeLabel = 'Falta Pagar';
    if (t.type === 'falta_receber') typeLabel = 'Falta Receber';

    let statusLabel = t.status === 'pago' ? 'Concluído' : t.status === 'atrasado' ? 'ATRASADO' : 'Pendente';

    return [
      formatDateBR(t.dueDate || t.date),
      t.description,
      typeLabel,
      t.category,
      memberMap.get(t.memberId) || 'Geral',
      statusLabel,
      formatBRL(t.amount),
    ];
  });

  autoTable(doc, {
    startY: 78,
    head: [['Data/Venc.', 'Descrição', 'Quadro', 'Categoria', 'Membro', 'Status', 'Valor']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 50 },
      2: { cellWidth: 24 },
      3: { cellWidth: 28 },
      4: { cellWidth: 25 },
      5: { cellWidth: 18 },
      6: { cellWidth: 25, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        if (data.cell.raw === 'Entrada') data.cell.styles.textColor = [16, 185, 129];
        if (data.cell.raw === 'Saída') data.cell.styles.textColor = [239, 68, 68];
        if (data.cell.raw === 'Falta Pagar') data.cell.styles.textColor = [245, 158, 11];
        if (data.cell.raw === 'Falta Receber') data.cell.styles.textColor = [59, 130, 246];
      }
      if (data.section === 'body' && data.column.index === 5 && data.cell.raw === 'ATRASADO') {
        data.cell.styles.textColor = [220, 38, 38];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // Section 2: Budget Limits Status
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  if (finalY < 240) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Acompanhamento de Limites de Orçamento por Categoria', 14, finalY);

    const budgetData = budgets
      .filter((b) => b.type === 'despesa')
      .map((b) => {
        const spent = transactions
          .filter((t) => t.category === b.category && (t.type === 'saida' || t.type === 'falta_pagar'))
          .reduce((acc, curr) => acc + curr.amount, 0);
        const percent = b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0;
        const saldoCat = b.monthlyLimit - spent;
        return [
          b.category,
          formatBRL(b.monthlyLimit),
          formatBRL(spent),
          `${percent.toFixed(1)}%`,
          formatBRL(saldoCat),
          percent > 100 ? 'ESTOURADO' : percent > 85 ? 'Alerta' : 'No Limite',
        ];
      });

    autoTable(doc, {
      startY: finalY + 4,
      head: [['Categoria', 'Limite Orçado', 'Gasto Realizado', '% Usado', 'Saldo Restante', 'Status']],
      body: budgetData,
      theme: 'grid',
      headStyles: {
        fillColor: [71, 85, 105],
        fontSize: 7.5,
      },
      bodyStyles: {
        fontSize: 7.5,
        cellPadding: 1.8,
      },
      columnStyles: {
        5: { fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          if (data.cell.raw === 'ESTOURADO') data.cell.styles.textColor = [220, 38, 38];
          else if (data.cell.raw === 'Alerta') data.cell.styles.textColor = [217, 119, 6];
          else data.cell.styles.textColor = [16, 185, 129];
        }
      },
    });
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Página ${i} de ${pageCount} - Controle Financeiro Compartilhado (Google Sheets Sync)`,
      105,
      290,
      { align: 'center' }
    );
  }

  doc.save(`relatorio_financeiro_${periodName.replace(/\s+/g, '_')}.pdf`);
};

// ==========================================
// 2. EXCEL EXPORT (Multiple Tabs)
// ==========================================
export const exportToExcel = (
  transactions: Transaction[],
  summary: FinancialSummary,
  budgets: CategoryBudget[],
  members: Member[],
  periodName: string
) => {
  const wb = XLSX.utils.book_new();
  const memberMap = new Map(members.map((m) => [m.id, m.name]));

  // Sheet 1: Resumo Executivo
  const resumoData = [
    ['SISTEMA DE CONTROLE FINANCEIRO COMPARTILHADO'],
    ['Período:', periodName],
    ['Data da Exportação:', new Date().toLocaleString('pt-BR')],
    [''],
    ['QUADRO FINANCEIRO', 'VALOR (R$)', 'DESCRIÇÃO'],
    ['Entradas Realizadas', summary.entradasTotal, 'Receitas já recebidas no mês'],
    ['Saídas Realizadas', summary.saidasTotal, 'Despesas já pagas no mês'],
    ['Falta Pagar', summary.faltaPagarTotal, 'Contas e faturas pendentes / a vencer'],
    ['Falta Receber', summary.faltaReceberTotal, 'Receitas esperadas / a receber'],
    [''],
    ['SALDO ATUAL EM CAIXA', summary.saldoAtual, 'Entradas - Saídas'],
    ['SALDO PROJETADO FINAL', summary.saldoProjetado, '(Entradas + Falta Receber) - (Saídas + Falta Pagar)'],
    ['TAXA DE ECONOMIA / MARGEM', `${summary.taxaPoupanca.toFixed(1)}%`, 'Percentual de sobra'],
    ['FATURAS EM RISCO / ATRASO', summary.faturasVencidasTotal, 'Valores atrasados com risco de multa'],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Executivo');

  // Sheet 2: Todas as Transações
  const txRows = transactions.map((t) => ({
    ID: t.id,
    Quadro: t.type === 'entrada' ? 'Entrada' : t.type === 'saida' ? 'Saída' : t.type === 'falta_pagar' ? 'Falta Pagar' : 'Falta Receber',
    Descrição: t.description,
    'Valor (R$)': t.amount,
    Categoria: t.category,
    'Data Lançamento': t.date,
    'Data Vencimento': t.dueDate || '-',
    'Data Pagamento': t.paidDate || '-',
    Status: t.status.toUpperCase(),
    'Membro Responsável': memberMap.get(t.memberId) || 'Geral',
    Conta: t.account,
    'Condição de Pagamento': t.paymentMode === 'parcelado' ? 'Parcelado' : t.paymentMode === 'recorrente' ? 'Recorrente' : 'À Vista',
    Parcela: t.paymentMode === 'parcelado' && t.installmentTotal ? `${t.installmentCurrent || 1}/${t.installmentTotal}` : '-',
    'Multa Prevista (R$)': t.finePenaltyEstimated || 0,
    Observações: t.notes || '',
  }));
  const wsTransactions = XLSX.utils.json_to_sheet(txRows);
  XLSX.utils.book_append_sheet(wb, wsTransactions, 'Todas as Transações');

  // Sheet 3: Falta Pagar (Atenção a Vencimentos e Multas)
  const faltaPagarRows = transactions
    .filter((t) => t.type === 'falta_pagar')
    .map((t) => ({
      Descrição: t.description,
      'Valor (R$)': t.amount,
      Vencimento: t.dueDate || '-',
      Status: t.status.toUpperCase(),
      'Membro Responsável': memberMap.get(t.memberId) || 'Geral',
      Categoria: t.category,
      'Multa Estimada': t.finePenaltyEstimated || 0,
      'Código de Barras / DDA': t.invoiceBarcode || '',
      Observações: t.notes || '',
    }));
  const wsFaltaPagar = XLSX.utils.json_to_sheet(faltaPagarRows);
  XLSX.utils.book_append_sheet(wb, wsFaltaPagar, 'Falta Pagar (Vencimentos)');

  // Sheet 4: Orçamentos vs Realizado
  const budgetRows = budgets
    .filter((b) => b.type === 'despesa')
    .map((b) => {
      const gasto = transactions
        .filter((t) => t.category === b.category && (t.type === 'saida' || t.type === 'falta_pagar'))
        .reduce((sum, item) => sum + item.amount, 0);
      return {
        Categoria: b.category,
        'Limite Mensal (R$)': b.monthlyLimit,
        'Total Gasto / Comprometido (R$)': gasto,
        'Saldo Restante (R$)': b.monthlyLimit - gasto,
        '% Utilizado': `${b.monthlyLimit > 0 ? ((gasto / b.monthlyLimit) * 100).toFixed(1) : 0}%`,
        Alerta: gasto > b.monthlyLimit ? 'ESTOURADO' : gasto > b.monthlyLimit * 0.85 ? 'ALERTA' : 'OK',
      };
    });
  const wsBudgets = XLSX.utils.json_to_sheet(budgetRows);
  XLSX.utils.book_append_sheet(wb, wsBudgets, 'Limites de Orçamento');

  XLSX.writeFile(wb, `controle_financeiro_${periodName.replace(/\s+/g, '_')}.xlsx`);
};

// ==========================================
// 2.1 GOOGLE SHEETS / PLANILHA BACKUP
// ==========================================
export const exportToGoogleSheetsBackup = (
  transactions: Transaction[],
  summary: FinancialSummary,
  budgets: CategoryBudget[],
  members: Member[],
  periodName: string
) => {
  const wb = XLSX.utils.book_new();
  const memberMap = new Map(members.map((m) => [m.id, m.name]));

  // Aba 1: Resumo_Executivo
  const resumoData = [
    ['BACKUP GOOGLE PLANILHAS - CONTROLE FINANCEIRO COMPARTILHADO'],
    ['Período de Referência:', periodName],
    ['Gerado em:', new Date().toLocaleString('pt-BR')],
    ['Destino:', 'Abrir ou Importar diretamente no Google Planilhas (drive.google.com / sheets.new)'],
    [''],
    ['INDICADOR FINANCEIRO', 'VALOR (R$)', 'STATUS / DETALHE'],
    ['Entradas Realizadas (Recebidas)', summary.entradasTotal, 'Receitas já recebidas no mês'],
    ['Saídas Realizadas (Pagas)', summary.saidasTotal, 'Despesas já pagas'],
    ['Falta Pagar (A Vencer / Vencido)', summary.faltaPagarTotal, 'Contas e faturas pendentes'],
    ['Falta Receber (Esperado)', summary.faltaReceberTotal, 'Receitas a receber'],
    [''],
    ['SALDO ATUAL EM CAIXA', summary.saldoAtual, summary.saldoAtual >= 0 ? 'Positivo' : 'Negativo'],
    ['SALDO PROJETADO FINAL', summary.saldoProjetado, summary.saldoProjetado >= 0 ? 'Superávit Previsto' : 'Déficit Previsto'],
    ['TAXA DE ECONOMIA / MARGEM', `${summary.taxaPoupanca.toFixed(1)}%`, 'Percentual poupado'],
    ['FATURAS EM ATRASO / RISCO', summary.faturasVencidasTotal, `${summary.faturasVencidasCount} conta(s) com risco de juros`],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

  // Aba 2: Transacoes
  const txRows = transactions.map((t) => ({
    'ID': t.id,
    'Tipo': t.type === 'entrada' ? 'Receita (Entrada)' : t.type === 'saida' ? 'Despesa (Saída)' : t.type === 'falta_pagar' ? 'Falta Pagar (Pendente)' : 'Falta Receber (Pendente)',
    'Descrição': t.description,
    'Valor (R$)': t.amount,
    'Categoria': t.category,
    'Data Competência': t.date,
    'Data Vencimento': t.dueDate || '-',
    'Data Pagamento': t.paidDate || '-',
    'Status': t.status.toUpperCase(),
    'Membro Responsável': memberMap.get(t.memberId) || 'Geral',
    'Conta': t.account,
    'Modo Pagamento': t.paymentMode === 'parcelado' ? 'Parcelado' : t.paymentMode === 'recorrente' ? 'Recorrente' : 'À Vista',
    'Parcela': t.paymentMode === 'parcelado' && t.installmentTotal ? `${t.installmentCurrent || 1}/${t.installmentTotal}` : '-',
    'Multa Prevista (R$)': t.finePenaltyEstimated || 0,
    'Cartão de Crédito': t.isCreditCard ? 'Sim' : 'Não',
    'Código de Barras': t.invoiceBarcode || '',
    'Observações': t.notes || '',
  }));
  const wsTransactions = XLSX.utils.json_to_sheet(txRows);
  XLSX.utils.book_append_sheet(wb, wsTransactions, 'Transacoes');

  // Aba 3: Pendencias_Pagar
  const pendencias = transactions
    .filter((t) => t.type === 'falta_pagar')
    .map((t) => ({
      'Conta / Fatura': t.description,
      'Valor (R$)': t.amount,
      'Vencimento': t.dueDate || '-',
      'Status': t.status.toUpperCase(),
      'Responsável': memberMap.get(t.memberId) || 'Geral',
      'Categoria': t.category,
      'Conta Pagamento': t.account,
      'Multa Estimada (R$)': t.finePenaltyEstimated || 0,
      'Linha Digitável / Barras': t.invoiceBarcode || '',
      'Notas': t.notes || '',
    }));
  const wsPendencias = XLSX.utils.json_to_sheet(pendencias);
  XLSX.utils.book_append_sheet(wb, wsPendencias, 'Contas_a_Pagar');

  // Aba 4: Orcamentos
  const orcamentos = budgets
    .filter((b) => b.type === 'despesa')
    .map((b) => {
      const gasto = transactions
        .filter((t) => t.category === b.category && (t.type === 'saida' || t.type === 'falta_pagar'))
        .reduce((sum, item) => sum + item.amount, 0);
      return {
        'Categoria': b.category,
        'Limite Mensal (R$)': b.monthlyLimit,
        'Gasto / Comprometido (R$)': gasto,
        'Saldo Disponível (R$)': b.monthlyLimit - gasto,
        '% Utilizado': `${b.monthlyLimit > 0 ? ((gasto / b.monthlyLimit) * 100).toFixed(1) : 0}%`,
        'Situação': gasto > b.monthlyLimit ? 'ESTOURADO' : gasto > b.monthlyLimit * 0.85 ? 'ALERTA' : 'DENTRO DO LIMITE',
      };
    });
  const wsOrcamentos = XLSX.utils.json_to_sheet(orcamentos);
  XLSX.utils.book_append_sheet(wb, wsOrcamentos, 'Orcamentos');

  // Aba 5: Membros
  const membrosRows = members.map((m) => ({
    'ID': m.id,
    'Nome': m.name,
    'Papel': m.role,
    'E-mail': m.email || '',
    'Telefone': m.phone || '',
  }));
  const wsMembros = XLSX.utils.json_to_sheet(membrosRows);
  XLSX.utils.book_append_sheet(wb, wsMembros, 'Usuarios_Membros');

  const nowStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `backup_google_planilhas_${periodName.replace(/\s+/g, '_')}_${nowStr}.xlsx`);
};

// ==========================================
// 3. WHATSAPP CONSOLIDATED REPORT
// ==========================================
export const generateWhatsAppReportText = (
  summary: FinancialSummary,
  periodName: string,
  profileTitle: string,
  overdueBills: Transaction[]
): string => {
  const saldoStatus = summary.saldoAtual >= 0 ? '🟢 Positivo' : '🔴 Negativo';
  const projStatus = summary.saldoProjetado >= 0 ? '📈 Superávit' : '📉 Atenção / Déficit';

  let text = `📊 *RELATÓRIO FINANCEIRO CONSOLIDADO*\n`;
  text += `🏛️ *${profileTitle}* | Período: *${periodName}*\n\n`;

  text += `💰 *SALDO ATUAL EM CAIXA:* ${formatBRL(summary.saldoAtual)} (${saldoStatus})\n`;
  text += `🔮 *SALDO PREVISTO (FINAL):* ${formatBRL(summary.saldoProjetado)} (${projStatus})\n`;
  text += `📊 *Taxa de Economia / Margem:* ${summary.taxaPoupanca.toFixed(1)}%\n\n`;

  text += `📋 *OS 4 QUADROS FINANCEIROS:*\n`;
  text += `🟢 *1. Entradas (Recebidas):* ${formatBRL(summary.entradasTotal)}\n`;
  text += `🔴 *2. Saídas (Pagas):* ${formatBRL(summary.saidasTotal)}\n`;
  text += `🟠 *3. Falta Pagar (Pendentes):* ${formatBRL(summary.faltaPagarTotal)}\n`;
  text += `🔵 *4. Falta Receber (Esperadas):* ${formatBRL(summary.faltaReceberTotal)}\n\n`;

  if (overdueBills.length > 0) {
    text += `⚠️ *ALERTA DE CONTAS VENCIDAS OU URGENTES:*\n`;
    overdueBills.slice(0, 4).forEach((bill) => {
      text += `• ${bill.description} - *${formatBRL(bill.amount)}* (Venc.: ${formatDateBR(bill.dueDate)})\n`;
    });
    text += `_Pagar com urgência para evitar multas e juros!_\n\n`;
  }

  text += `☁️ _Sincronizado automaticamente via Google Sheets & Apps Script_ 📱`;

  return text;
};

export const sendWhatsAppReport = (phone: string, text: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedText = encodeURIComponent(text);
  let url = `https://wa.me/?text=${encodedText}`;
  if (cleanPhone.length >= 10) {
    url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  window.open(url, '_blank');
};
