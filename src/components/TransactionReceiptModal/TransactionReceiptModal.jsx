import { useRef } from 'react';
import { X, Printer, CheckCircle2, ArrowUpRight, ArrowDownRight, CreditCard, Receipt, Building } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function TransactionReceiptModal({ transaction, onClose }) {
  const receiptRef = useRef(null);

  /* ── Derived data ── */
  const now = new Date();
  const receiptPrefix = transaction.type === 'Ingreso' ? 'REC' : 'EGR';
  const receiptNumber = `${receiptPrefix}-${String(transaction.id).padStart(5, '0')}`;

  const consultorioConfig = (() => {
    try { return JSON.parse(localStorage.getItem('consultorio_config') || '{}'); }
    catch { return {}; }
  })();

  const businessName    = consultorioConfig.businessName || 'Integrar Salud';
  const businessAddress = consultorioConfig.address || '';
  const businessPhone   = consultorioConfig.phone   || '';

  const amount = Number(transaction.amount || 0);
  const method = transaction.method || 'Efectivo';
  
  const txDate = transaction.date
    ? new Date(transaction.date.includes('T') ? transaction.date : transaction.date.replace(' ', 'T')).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  const formatMoney = (v) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(v || 0);

  const statusLabel = transaction.type === 'Ingreso' ? 'COBRADO' : 'PAGADO';
  const statusColorHex = transaction.type === 'Ingreso' ? '#10b981' : '#f43f5e';

  /* ── Honorarios Logic ── */
  let receiptTitle = `Comprobante de ${transaction.type}`;
  let isHonorarios = false;
  let receptor = '—';

  const conceptLower = (transaction.concept || '').toLowerCase();
  if (transaction.type === 'Egreso' && (conceptLower.includes('honorario') || conceptLower.includes('sueldo') || conceptLower.includes('liquidaci'))) {
    receiptTitle = 'Liquidación de Honorarios';
    isHonorarios = true;
    
    // Extract name from "Cierre de Honorarios - Vargas Leonardo"
    if (transaction.concept.includes(' - ')) {
       receptor = transaction.concept.split(' - ')[1].trim();
    } else if (transaction.concept.includes(' — ')) {
       receptor = transaction.concept.split(' — ')[1].trim();
    } else if (transaction.concept.includes(':')) {
       receptor = transaction.concept.split(':')[1].trim();
    }
  }

  /* ── Print handler ── */
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=900,scrollbars=yes');
    if (!printWindow) { alert('Habilitá las ventanas emergentes para imprimir.'); return; }

    printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante ${receiptNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
    
    :root {
      --primary: #1e1b4b;
      --accent: ${transaction.type === 'Ingreso' ? '#10b981' : '#f43f5e'};
      --text-main: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --bg-light: #f8fafc;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Outfit', system-ui, sans-serif; 
      background: #e2e8f0; 
      color: var(--text-main); 
      font-size: 14px; 
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    
    .receipt-container {
      max-width: 760px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 24px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.08);
      position: relative;
      overflow: hidden;
    }
    .top-band {
      height: 12px;
      background: var(--accent);
    }
    .receipt-content {
      padding: 60px;
    }
    
    .header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 50px;
    }
    .logo {
      width: 56px;
      height: 56px;
      background: white;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 16px rgba(30, 27, 75, 0.15);
      overflow: hidden;
    }
    .logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .company-info { flex: 1; }
    .company-name {
      font-size: 24px;
      font-weight: 800;
      color: var(--text-main);
      letter-spacing: -0.02em;
      line-height: 1.1;
    }
    .company-contact {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
      font-weight: 500;
      display: flex;
      gap: 12px;
    }
    .company-contact span:not(:last-child)::after {
      content: '•';
      margin-left: 12px;
      color: var(--border);
    }
    
    .receipt-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: 24px;
      border-bottom: 2px solid var(--text-main);
      margin-bottom: 40px;
    }
    .title {
      font-size: 13px;
      font-weight: 800;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.15em;
    }
    .receipt-no {
      font-size: 24px;
      font-weight: 800;
      color: var(--text-main);
      letter-spacing: -0.02em;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
    }
    .info-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: var(--text-muted);
      margin-bottom: 12px;
    }
    .info-value {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 4px;
      line-height: 1.2;
    }
    .info-sub {
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 500;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 40px;
    }
    .items-table th {
      text-align: left;
      padding: 0 0 16px 0;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
    }
    .items-table td {
      padding: 24px 0;
      border-bottom: 1px dashed var(--border);
    }
    .service-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-main);
    }
    .service-amount {
      font-size: 16px;
      font-weight: 700;
      text-align: right;
    }

    .summary-section {
      display: flex;
      justify-content: flex-end;
      align-items: flex-start;
      gap: 40px;
      margin-bottom: 60px;
    }
    .summary-details {
      flex: 1;
      max-width: 320px;
    }
    .summary-line {
      display: flex;
      justify-content: space-between;
      padding: 14px 0;
      border-bottom: 1px dashed var(--border);
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .summary-line span:last-child {
      color: var(--text-main);
      font-weight: 700;
    }
    
    .total-block {
      background: var(--bg-light);
      padding: 32px 40px;
      border-radius: 20px;
      text-align: right;
      min-width: 340px;
      border: 1px solid var(--border);
    }
    .total-label {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    .total-amount {
      font-size: 46px;
      font-weight: 800;
      color: var(--text-main);
      letter-spacing: -0.04em;
      line-height: 1;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      background: ${statusColorHex}15;
      color: ${statusColorHex};
      border-radius: 100px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 32px;
      border-top: 1px solid var(--border);
    }
    .disclaimer {
      font-size: 11px;
      color: var(--text-muted);
      font-weight: 500;
      line-height: 1.6;
    }
    .generation {
      font-size: 10px;
      color: var(--text-muted);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    @media print {
      body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .receipt-container { margin: 0; padding: 0; box-shadow: none; border-radius: 0; max-width: 100%; border: none; }
      .top-band { display: none; }
      .receipt-content { padding: 20px; }
    }
  </style>
</head>
<body>
<div class="receipt-container">
  <div class="top-band"></div>
  
  <div class="receipt-content">
    <div class="header">
      <div class="logo"><img src="${window.location.origin}/pwa-192x192.png" alt="Logo" /></div>
      <div class="company-info">
        <div class="company-name">${businessName}</div>
        <div class="company-contact">
          ${businessAddress ? `<span>${businessAddress}</span>` : ''}
          ${businessPhone ? `<span>Tel: ${businessPhone}</span>` : ''}
        </div>
      </div>
    </div>

    <div class="receipt-header">
      <div class="title">${receiptTitle}</div>
      <div class="receipt-no">${receiptNumber}</div>
    </div>

    <div class="grid-2">
      <div>
        <div class="info-label">${isHonorarios ? 'Entidad Pagadora' : 'Emisor'}</div>
        <div class="info-value">${businessName}</div>
        <div class="info-sub">Fecha de Registro: ${txDate}</div>
      </div>
      <div>
        <div class="info-label">${isHonorarios ? 'A Favor De' : 'Categoría'}</div>
        <div class="info-value">${isHonorarios ? receptor : transaction.type}</div>
        <div class="info-sub" style="margin-top:4px;">${isHonorarios ? 'Liquidación Interna' : 'Asiento Interno de Finanzas'}</div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Concepto / Detalle</th>
          <th style="text-align: right">Importe Neto</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="service-title">${transaction.concept || 'Movimiento de Caja'}</td>
          <td class="service-amount">${formatMoney(amount)}</td>
        </tr>
      </tbody>
    </table>

    <div class="summary-section">
      <div class="summary-details">
        <div class="summary-line">
          <span>Método de Pago</span>
          <span>${method}</span>
        </div>
        <div class="summary-line">
          <span>Estado del Movimiento</span>
          <span class="status-badge">${statusLabel}</span>
        </div>
      </div>
      <div class="total-block">
        <div class="total-label">Total ${transaction.type === 'Ingreso' ? 'Recibido' : 'Entregado'}</div>
        <div class="total-amount" style="color: var(--accent);">${formatMoney(amount)}</div>
      </div>
    </div>

    ${transaction.notes ? `
    <div style="margin-bottom: 40px; padding: 20px; background: #f8fafc; border-radius: 12px; font-size: 13px; color: #64748b;">
      <strong style="color: #0f172a;">Observaciones:</strong><br>
      ${transaction.notes}
    </div>
    ` : ''}

    ${transaction.type === 'Egreso' ? `
    <div style="margin-top: 60px; margin-bottom: 20px; display: flex; justify-content: flex-end;">
      <div style="text-align: center; width: 250px;">
        <div style="border-top: 1px solid var(--text-main); margin-bottom: 8px;"></div>
        <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em;">
          Firma y Aclaración<br>
          <span style="font-size: 9px; opacity: 0.7;">(Recibí Conforme)</span>
        </div>
      </div>
    </div>
    ` : ''}

    <div class="footer">
      <div class="disclaimer">
        Este documento es un comprobante de control interno.<br>
        No posee validez tributaria ante organismos fiscales.
      </div>
      <div class="generation">
        Generado el ${now.toLocaleDateString('es-AR')} ${now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  </div>
</div>
<script>
  window.onload = function() {
    setTimeout(() => { window.print(); }, 500);
  }
</script>
</body>
</html>`);
    printWindow.document.close();
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 z-[99999] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in-quick">
      <div className="bg-white rounded-[32px] w-full max-w-[460px] shadow-2xl flex flex-col overflow-hidden animate-fade-in-up border border-slate-200/50">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${transaction.type === 'Ingreso' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <Receipt size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base tracking-tight">{receiptTitle}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{receiptNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Receipt Preview Body */}
        <div ref={receiptRef} className="overflow-y-auto max-h-[65vh] p-8 space-y-8 bg-white custom-scrollbar">
          
          {/* Business Info */}
          <div className="flex justify-between items-start">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-[14px] flex items-center justify-center shadow-md overflow-hidden p-1 border border-slate-100">
                   <img src="/pwa-192x192.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                   <h2 className="text-lg font-extrabold text-slate-900 tracking-tight leading-none">{businessName}</h2>
                   <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2 mt-1.5">
                      {businessAddress && <span>{businessAddress}</span>}
                   </div>
                </div>
             </div>
          </div>

          <div className="h-px bg-slate-100 w-full" />

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-6">
             <div>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">{isHonorarios ? 'Entidad Pagadora' : 'Categoría'}</p>
                <p className="text-sm font-bold text-slate-800 leading-tight">{isHonorarios ? businessName : transaction.type}</p>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">{txDate}</p>
             </div>
             <div>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">{isHonorarios ? 'A favor de' : 'Concepto'}</p>
                <p className="text-sm font-bold text-slate-800 leading-tight truncate" title={isHonorarios ? receptor : transaction.concept}>{isHonorarios ? receptor : transaction.concept}</p>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">{isHonorarios ? 'Liquidación Interna' : 'Asiento Financiero'}</p>
             </div>
          </div>

          <div className="h-px bg-slate-100 w-full" />

          {/* Amount Block */}
          <div className="bg-slate-50/80 rounded-3xl p-6 flex justify-between items-center border border-slate-100">
             <div>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Monto Neto</p>
                <p className="text-3xl font-extrabold tracking-tighter" style={{ color: statusColorHex }}>{formatMoney(amount)}</p>
             </div>
             <div className="text-right space-y-3">
                <div className="inline-flex px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border"
                     style={{ color: statusColorHex, borderColor: `${statusColorHex}30`, backgroundColor: `${statusColorHex}10` }}>
                  {statusLabel}
                </div>
                <p className="text-[11px] font-bold text-slate-500 flex items-center justify-end gap-1.5">
                   <CreditCard size={12} className="text-slate-400" /> {method}
                </p>
             </div>
          </div>

          {transaction.notes && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-1">
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Notas</p>
              <p className="text-xs font-medium text-slate-600">{transaction.notes}</p>
            </div>
          )}

          {/* Disclaimer */}
          <div className="text-center pt-2">
            <p className="text-[9px] text-slate-400 font-medium leading-relaxed px-4">
              Documento de control interno.<br />
              Sin validez tributaria.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={handlePrint}
            className="w-full py-4 text-xs font-extrabold bg-slate-900 text-white hover:bg-slate-800 rounded-2xl transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2 uppercase tracking-widest"
          >
            <Printer size={16} /> Imprimir / PDF
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
