import { useRef } from 'react';
import { X, Printer, CheckCircle2, Calendar, User, Stethoscope, CreditCard, Receipt, Landmark } from 'lucide-react';

import { createPortal } from 'react-dom';

export default function PaymentReceiptModal({ appointment, doctor, onClose }) {
  const receiptRef = useRef(null);

  /* ── Derived data ── */
  const now = new Date();
  const receiptNumber = `RCP-${String(appointment.id).padStart(5, '0')}`;

  const consultorioConfig = (() => {
    try { return JSON.parse(localStorage.getItem('consultorio_config') || '{}'); }
    catch { return {}; }
  })();

  const businessName    = consultorioConfig.businessName || 'Integrar Salud';
  const businessAddress = consultorioConfig.address || '';
  const businessPhone   = consultorioConfig.phone   || '';

  const isPaid   = appointment.paymentStatus === 'pagado';
  const isSenado = appointment.paymentStatus === 'senado';
  const amount   = Number(isSenado ? appointment.paidAmount : (appointment.paymentAmount || appointment.paidAmount || 0));
  const method   = isSenado ? (appointment.paidMethod || 'Efectivo') : (appointment.paymentMethod || 'Efectivo');

  const appointmentDate = appointment.date
    ? new Date(appointment.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  const formatMoney = (v) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(v || 0);

  /* ── Print handler — opens a dedicated print window ── */
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=900,scrollbars=yes');
    if (!printWindow) { alert('Habilitá las ventanas emergentes para imprimir.'); return; }

    const statusLabel = isPaid ? 'PAGADO' : isSenado ? 'SEÑADO' : appointment.paymentStatus?.toUpperCase() || '—';
    const statusColor = isPaid ? '#10b981' : isSenado ? '#8b5cf6' : '#94a3b8';

    printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante ${receiptNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    :root {
      --primary: #2563eb;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --bg-light: #f8fafc;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Inter', system-ui, sans-serif; 
      background: #f1f5f9; 
      color: var(--text-main); 
      font-size: 14px; 
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    .print-wrapper {
      max-width: 800px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.05);
      padding: 60px;
      position: relative;
      overflow: hidden;
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 120px;
      font-weight: 800;
      color: rgba(0,0,0,0.02);
      white-space: nowrap;
      pointer-events: none;
      z-index: 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 50px;
      border-bottom: 2px solid var(--text-main);
      padding-bottom: 30px;
      position: relative;
      z-index: 1;
    }
    .company-info {
      display: flex;
      flex-direction: column;
    }
    .company-name {
      font-size: 28px;
      font-weight: 800;
      color: var(--text-main);
      letter-spacing: -0.02em;
    }
    .company-details {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 5px;
    }
    .receipt-title-box {
      text-align: right;
    }
    .receipt-title {
      font-size: 32px;
      font-weight: 300;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .receipt-number {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-main);
      margin-top: 5px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
      position: relative;
      z-index: 1;
    }
    .info-section {
      background: var(--bg-light);
      padding: 20px;
      border-radius: 6px;
      border: 1px solid var(--border);
    }
    .info-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      margin-bottom: 12px;
      display: block;
    }
    .info-row {
      display: flex;
      margin-bottom: 8px;
    }
    .info-row:last-child {
      margin-bottom: 0;
    }
    .info-key {
      width: 120px;
      font-size: 13px;
      color: var(--text-muted);
    }
    .info-val {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
      flex: 1;
    }
    table.details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 40px;
      position: relative;
      z-index: 1;
    }
    table.details-table th {
      background: var(--bg-light);
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      text-align: left;
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }
    table.details-table td {
      padding: 16px;
      border-bottom: 1px solid var(--border);
      font-size: 14px;
      font-weight: 500;
    }
    .td-service { color: var(--text-main); font-weight: 600; }
    .td-amount { text-align: right; font-weight: 700; }
    
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 50px;
      position: relative;
      z-index: 1;
    }
    .totals-box {
      width: 350px;
      background: var(--text-main);
      color: white;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .total-row.grand-total {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(255,255,255,0.2);
    }
    .total-label { font-size: 14px; color: rgba(255,255,255,0.8); }
    .total-value { font-size: 16px; font-weight: 600; }
    .grand-total-label { font-size: 18px; font-weight: 700; }
    .grand-total-value { font-size: 28px; font-weight: 800; letter-spacing: -0.03em; }
    
    .payment-status-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.05em;
      background: transparent;
      color: ${statusColor};
      border: 1px solid currentColor;
      text-transform: uppercase;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 60px;
      padding-top: 30px;
      border-top: 1px solid var(--border);
      position: relative;
      z-index: 1;
    }
    .signatures {
      display: flex;
      gap: 60px;
    }
    .signature-box {
      text-align: center;
      width: 200px;
    }
    .signature-line {
      border-top: 1px solid var(--text-main);
      margin-bottom: 8px;
      height: 40px; /* Space for physical signature */
    }
    .signature-text {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 500;
    }
    .footer-notes {
      font-size: 11px;
      color: var(--text-muted);
      text-align: right;
      max-width: 300px;
    }
    
    .afip-box {
      margin-top: 20px;
      padding: 16px;
      background: var(--bg-light);
      border: 1px dashed var(--border);
      border-radius: 6px;
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
    }

    @media print {
      body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-wrapper { margin: 0; padding: 20px; box-shadow: none; border-radius: 0; max-width: 100%; }
      .watermark { color: rgba(0,0,0,0.03); } 
    }
  </style>
</head>
<body>
<div class="print-wrapper">
  <div class="watermark">${businessName.toUpperCase()}</div>
  
  <div class="header">
    <div class="company-info">
      <div class="company-name">${businessName}</div>
      ${businessAddress ? `<div class="company-details">${businessAddress}</div>` : ''}
      ${businessPhone ? `<div class="company-details">Tel: ${businessPhone}</div>` : ''}
    </div>
    <div class="receipt-title-box">
      <div class="receipt-title">RECIBO</div>
      <div class="receipt-number">${receiptNumber}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-section">
      <span class="info-label">Facturado A</span>
      <div class="info-row">
        <span class="info-val" style="font-size:16px; margin-bottom: 4px;">${appointment.patient || '—'}</span>
      </div>
      <div class="info-row">
        <span class="info-key">Fecha de Emisión:</span>
        <span class="info-val">${now.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
      </div>
    </div>
    
    <div class="info-section">
      <span class="info-label">Detalle del Turno</span>
      <div class="info-row">
        <span class="info-key">Profesional:</span>
        <span class="info-val">${doctor?.name || '—'} ${doctor?.specialty ? `(${doctor.specialty})` : ''}</span>
      </div>
      <div class="info-row">
        <span class="info-key">Fecha del Turno:</span>
        <span class="info-val">${appointmentDate} - ${appointment.time || ''}</span>
      </div>
    </div>
  </div>

  <table class="details-table">
    <thead>
      <tr>
        <th style="width: 70%">Descripción del Servicio</th>
        <th style="text-align: right">Importe</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="td-service">${appointment.title || 'Consulta Médica'}</td>
        <td class="td-amount">${formatMoney(amount)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals-section">
    <div class="totals-box">
      <div class="total-row">
        <span class="total-label">Subtotal</span>
        <span class="total-value">${formatMoney(amount)}</span>
      </div>
      <div class="total-row">
        <span class="total-label">Método de Pago</span>
        <span class="total-value">${method}</span>
      </div>
      <div class="total-row grand-total">
        <span class="grand-total-label">Total Abonado</span>
        <span class="grand-total-value">${formatMoney(amount)}</span>
      </div>
      <div style="margin-top: 20px; text-align: center;">
        <span class="payment-status-badge">${statusLabel}</span>
      </div>
    </div>
  </div>

  ${appointment.afip_cae ? `
  <div class="afip-box">
    <div><strong>Comprobante AFIP:</strong> Factura N° ${String(appointment.afip_punto_venta || 1).padStart(5, '0')}-${String(appointment.afip_nro).padStart(8, '0')}</div>
    <div><strong>CAE:</strong> ${appointment.afip_cae}</div>
    <div><strong>Vto. CAE:</strong> ${appointment.afip_cae_vence || '—'}</div>
  </div>
  ` : ''}

  <div class="footer">
    <div class="signatures">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-text">Firma y Aclaración Paciente</div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-text">Firma Profesional / Institución</div>
      </div>
    </div>
    <div class="footer-notes">
      <p>Este documento acredita el pago del servicio prestado.</p>
      <p style="margin-top: 4px; opacity: 0.7;">Generado el ${now.toLocaleDateString('es-AR')} ${now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
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

  /* ── Status helpers ── */
  const statusLabel = isPaid ? 'Pagado' : isSenado ? 'Señado' : appointment.paymentStatus || '—';
  const statusColors = isPaid
    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    : isSenado
    ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/20'
    : 'bg-[var(--border-color)]/20 text-[var(--text-secondary)] border-[var(--border-color)]/30';

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/60 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in-quick">
      <div className="bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-3xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--accent-primary)]/10 rounded-2xl flex items-center justify-center">
              <Receipt size={20} className="text-[var(--accent-primary)]" />
            </div>
            <div>
              <h3 className="font-extrabold text-[var(--text-primary)] text-base">Comprobante de Pago</h3>
              <p className="text-[10px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-widest leading-none mt-1">{receiptNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-light)] rounded-xl transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Receipt Preview */}
        <div ref={receiptRef} className="overflow-y-auto max-h-[65vh] p-6 space-y-5 custom-scrollbar">
          {/* Business name */}
          <div className="text-center pb-6 border-b border-dashed border-[var(--border-color)]/50">
            <div className="w-14 h-14 bg-[var(--accent-primary)] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[var(--accent-primary)]/20 group hover:rotate-6 transition-transform">
              <span className="text-white font-black text-2xl leading-none">I</span>
            </div>
            <p className="font-black text-[var(--text-primary)] text-xl tracking-tight">{businessName}</p>
            {businessAddress && <p className="text-xs text-[var(--text-secondary)] font-bold mt-1 opacity-60">{businessAddress}</p>}
          </div>

          {/* Turno details */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-[var(--text-secondary)] opacity-40 uppercase tracking-widest mb-3">Detalle del Servicio</p>
            {[
              { label: 'Fecha del Turno', value: appointmentDate, Icon: Calendar },
              { label: 'Hora Programada', value: appointment.time || '—', Icon: null },
              { label: 'Motivo / Servicio', value: appointment.title || '—', Icon: Stethoscope },
            ].map(({ label, value, Icon }) => (
              <div key={label} className="flex items-center justify-between py-1">
                <span className="text-xs text-[var(--text-secondary)] font-bold flex items-center gap-2 opacity-70">
                  {Icon && <Icon size={12} className="text-[var(--accent-primary)]/40" />}
                  {label}
                </span>
                <span className="text-xs font-black text-[var(--text-primary)]">{value}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-[var(--border-color)]/50 pt-5 space-y-2">
            <p className="text-[10px] font-black text-[var(--text-secondary)] opacity-40 uppercase tracking-widest mb-3">Información del Paciente</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-secondary)] font-bold flex items-center gap-2 opacity-70">
                <User size={12} className="text-[var(--accent-primary)]/40" /> Nombre y Apellido
              </span>
              <span className="text-xs font-black text-[var(--text-primary)]">{appointment.patient || '—'}</span>
            </div>
          </div>

          {doctor && (
            <div className="border-t border-dashed border-[var(--border-color)]/50 pt-5 space-y-2">
              <p className="text-[10px] font-black text-[var(--text-secondary)] opacity-40 uppercase tracking-widest mb-3">Profesional a Cargo</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)] font-bold opacity-70">Nombre</span>
                <span className="text-xs font-black text-[var(--text-primary)]">{doctor.name}</span>
              </div>
              {doctor.specialty && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)] font-bold opacity-70">Especialidad</span>
                  <span className="text-xs font-black text-[var(--text-secondary)] opacity-80">{doctor.specialty}</span>
                </div>
              )}
            </div>
          )}

          {/* Amount block */}
          <div className="bg-[var(--bg-sidebar)]/50 border border-[var(--border-color)]/50 rounded-3xl p-6 text-center shadow-inner mt-4 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--accent-primary)]/20 to-transparent"></div>
            <p className="text-[11px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-widest mb-2">Monto Total Abonado</p>
            <p className="text-4xl font-black text-[var(--accent-primary)] tracking-tighter group-hover:scale-105 transition-transform duration-300">{formatMoney(amount)}</p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <span className="flex items-center gap-1.5 text-xs font-black text-[var(--text-secondary)] opacity-70">
                <CreditCard size={14} className="text-[var(--accent-primary)]/40" /> {method}
              </span>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-widest flex items-center gap-1.5 ${statusColors}`}>
                <CheckCircle2 size={12} />
                {statusLabel}
              </span>
            </div>
          </div>

          {/* AFIP Data */}
          {appointment.afip_cae && (
            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-3xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">
                <Landmark size={14} /> Información Fiscal
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--text-secondary)] font-bold">Comprobante</span>
                <span className="font-black text-[var(--text-primary)]">
                  {String(appointment.afip_punto_venta || 1).padStart(5, '0')}-{String(appointment.afip_nro).padStart(8, '0')}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--text-secondary)] font-bold">CAE</span>
                <span className="font-black text-[var(--text-primary)]">{appointment.afip_cae}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--text-secondary)] font-bold">Vto. CAE</span>
                <span className="font-black text-[var(--text-primary)]">{appointment.afip_cae_vence}</span>
              </div>
            </div>
          )}

          {/* Signature line */}
          <div className="text-center pt-2 border-t border-dashed border-[var(--border-color)]/30">
            <div className="w-40 h-px bg-[var(--border-color)]/50 mx-auto mt-8 mb-2" />
            <p className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest opacity-40">Firma del Profesional</p>
            <p className="text-[9px] text-[var(--text-secondary)] font-medium mt-4 leading-relaxed opacity-30 px-4">
              Este documento es un comprobante de pago interno.<br />
              No posee validez tributaria ante organismos fiscales.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 px-6 py-5 border-t border-[var(--border-color)]/30 bg-[var(--bg-sidebar)]/30">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 text-xs font-black text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-main)] hover:bg-[var(--accent-light)] rounded-2xl transition-all border border-[var(--border-color)] uppercase tracking-widest"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="flex-[1.5] py-3.5 text-xs font-black bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] rounded-2xl transition-all shadow-lg shadow-[var(--accent-primary)]/20 flex items-center justify-center gap-2 uppercase tracking-widest"
          >
            <Printer size={16} /> Imprimir Comprobante
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
