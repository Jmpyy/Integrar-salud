import { useRef } from 'react';
import { X, Printer, CheckCircle2, Calendar, User, Stethoscope, CreditCard, Receipt } from 'lucide-react';

/**
 * PaymentReceiptModal
 * Props:
 *   - appointment: objeto del turno con { id, patient, title, date, time, paymentStatus, paymentMethod, paymentAmount, paidAmount, doctorId }
 *   - doctor: objeto del doctor { name, specialty }
 *   - onClose: fn
 */
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
  const amount   = Number(appointment.paidAmount  || appointment.paymentAmount || 0);
  const method   = appointment.paymentMethod || 'Efectivo';

  const appointmentDate = appointment.date
    ? new Date(appointment.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  const formatMoney = (v) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v || 0);

  /* ── Print handler — opens a dedicated print window ── */
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=480,height=700,scrollbars=yes');
    if (!printWindow) { alert('Habilitá las ventanas emergentes para imprimir.'); return; }

    const statusLabel = isPaid ? 'PAGADO' : isSenado ? 'SEÑADO' : appointment.paymentStatus?.toUpperCase() || '—';
    const statusColor = isPaid ? '#16a34a' : isSenado ? '#7c3aed' : '#94a3b8';
    const statusBg    = isPaid ? '#dcfce7' : isSenado ? '#ede9fe' : '#f1f5f9';

    printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante ${receiptNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', Arial, sans-serif; background: #fff; color: #1e293b; font-size: 13px; }
    .page { max-width: 420px; margin: 0 auto; padding: 32px 28px; }
    /* Header */
    .header { text-align: center; margin-bottom: 28px; }
    .logo-box { width: 52px; height: 52px; background: #4f46e5; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; }
    .logo-letter { color: white; font-size: 26px; font-weight: 900; line-height: 1; }
    .biz-name { font-size: 18px; font-weight: 900; color: #0f172a; letter-spacing: -0.02em; }
    .biz-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
    .receipt-chip { display: inline-block; margin-top: 12px; padding: 5px 16px; background: #f1f5f9; border-radius: 999px; font-size: 11px; font-weight: 700; color: #475569; letter-spacing: 0.06em; }
    /* Divider */
    .dashed { border: none; border-top: 2px dashed #e2e8f0; margin: 20px 0; }
    /* Sections */
    .section-label { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 8px; }
    .row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px; }
    .row .key { font-size: 12px; color: #64748b; }
    .row .val { font-size: 12px; font-weight: 700; color: #1e293b; text-align: right; max-width: 60%; }
    /* Amount block */
    .amount-block { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 18px; margin: 22px 0; text-align: center; }
    .amount-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; }
    .amount-value { font-size: 36px; font-weight: 900; color: #4f46e5; letter-spacing: -0.03em; margin-top: 4px; }
    .status-pill { display: inline-flex; align-items: center; gap: 5px; margin-top: 12px; padding: 4px 14px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; background: ${statusBg}; color: ${statusColor}; }
    .status-dot { width: 7px; height: 7px; border-radius: 50%; background: ${statusColor}; }
    /* Footer */
    .footer { margin-top: 28px; text-align: center; }
    .sig-line { width: 180px; height: 1px; background: #cbd5e1; margin: 36px auto 8px; }
    .sig-label { font-size: 10px; color: #94a3b8; }
    .disclaimer { font-size: 9.5px; color: #cbd5e1; margin-top: 14px; line-height: 1.5; }
    .print-date { font-size: 10px; color: #cbd5e1; margin-top: 6px; }
    @media print {
      body { padding: 0; }
      .page { padding: 20px; }
    }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-box"><div class="logo-letter">I</div></div>
    <div class="biz-name">${businessName}</div>
    ${businessAddress ? `<div class="biz-sub">${businessAddress}${businessPhone ? ' · ' + businessPhone : ''}</div>` : ''}
    <div class="receipt-chip">COMPROBANTE DE PAGO · ${receiptNumber}</div>
  </div>

  <hr class="dashed">

  <div class="section-label">Datos del Turno</div>
  <div class="row"><span class="key">Fecha del turno</span><span class="val">${appointmentDate}</span></div>
  <div class="row"><span class="key">Hora</span><span class="val">${appointment.time || '—'}</span></div>
  <div class="row"><span class="key">Motivo / Servicio</span><span class="val">${appointment.title || '—'}</span></div>

  <hr class="dashed">

  <div class="section-label">Paciente</div>
  <div class="row"><span class="key">Nombre</span><span class="val">${appointment.patient || '—'}</span></div>

  <hr class="dashed">

  <div class="section-label">Profesional</div>
  <div class="row"><span class="key">Nombre</span><span class="val">${doctor?.name || '—'}</span></div>
  ${doctor?.specialty ? `<div class="row"><span class="key">Especialidad</span><span class="val">${doctor.specialty}</span></div>` : ''}

    <div class="amount-block">
      <div class="amount-label">Total Abonado</div>
      <div class="amount-value">${formatMoney(amount)}</div>
      <div style="margin-top:8px;font-size:12px;font-weight:700;color:#475569;">📋 ${method}</div>
      <div class="status-pill"><span class="status-dot"></span>${statusLabel}</div>
    </div>

    ${appointment.afip_cae ? `
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:15px; margin-top:20px; font-size:11px; color:#475569;">
      <div style="font-weight:900; text-transform:uppercase; letter-spacing:0.1em; color:#64748b; margin-bottom:8px; display:flex; align-items:center; gap:5px;">
        🏛️ Información Fiscal AFIP
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span>Comprobante:</span>
        <span style="font-weight:700; color:#1e293b;">Factura N° ${String(appointment.afip_punto_venta || 1).padStart(5, '0')}-${String(appointment.afip_nro).padStart(8, '0')}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span>CAE:</span>
        <span style="font-weight:700; color:#1e293b;">${appointment.afip_cae}</span>
      </div>
      <div style="display:flex; justify-content:space-between;">
        <span>Vto. CAE:</span>
        <span style="font-weight:700; color:#1e293b;">${appointment.afip_cae_vence || '—'}</span>
      </div>
    </div>
    ` : ''}

    <div class="footer">
    <div class="sig-line"></div>
    <div class="sig-label">Firma del Profesional</div>
    <div class="disclaimer">Este comprobante no tiene validez tributaria. Solo acredita el pago del servicio de salud prestado.</div>
    <div class="print-date">Emitido el ${now.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })} a las ${now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>
  </div>
</div>
<script>setTimeout(() => { window.print(); }, 400);</script>
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

  return (
    <div className="fixed inset-0 bg-slate-950/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in-quick">
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
    </div>
  );
}
