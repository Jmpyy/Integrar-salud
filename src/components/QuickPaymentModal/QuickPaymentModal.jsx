import { useState, useEffect } from 'react';
import { useStore } from '../../stores/useStore';
import { toast } from 'react-hot-toast';
import { X, CheckCircle2, Receipt, Landmark, RefreshCw } from 'lucide-react';
import PaymentReceiptModal from '../PaymentReceiptModal/PaymentReceiptModal';
import { afipService } from '../../services/afip';

const METHODS = ['Efectivo', 'Transferencia', 'Débito', 'Tarjeta'];

/**
 * QuickPaymentModal
 * Fast payment registration straight from Consultorio.
 * Props: appointment, doctor, onClose, onPaid (optional callback)
 */
export default function QuickPaymentModal({ appointment, doctor, onClose, onPaid }) {
  const store = useStore();

  const [amount,  setAmount]  = useState(String(appointment.paymentAmount || ''));
  const [method,  setMethod]  = useState(appointment.paymentMethod || 'Efectivo');
  const [notes,   setNotes]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [paidApp, setPaidApp] = useState(null); // show receipt after success
  
  const [emitAfip, setEmitAfip] = useState(false);
  const [isAfipConfigured, setIsAfipConfigured] = useState(false);

  useEffect(() => {
    checkAfip();
  }, []);

  const checkAfip = async () => {
    try {
      const conf = await afipService.getConfig();
      if (conf && conf.cuit && conf.has_cert) {
        setIsAfipConfigured(true);
        // Si está configurado, por defecto activamos emitir si el pago es total? (opcional)
      }
    } catch (e) {
      console.error("AFIP check failed", e);
    }
  };

  const fmt = (v) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) return toast.error('Ingresá un monto válido.');

    setSaving(true);
    try {
      const updatedFields = {
        paymentStatus: 'pagado',
        paymentMethod: method,
        paidAmount: num,
      };

      await store.updateAppointment(appointment.id, updatedFields);
      const tx = await store.createTransaction({
        date:      new Date().toISOString(),
        type:      'Ingreso',
        concept:   `Cobro — ${appointment.title} · ${appointment.patient}`,
        method,
        amount:    num,
        notes:     notes || `Cobro desde Consultorio (Turno #${appointment.id})`,
        doctor_id: appointment.doctorId,
        patient_id: appointment.patientId ?? null,
      });

      let afipData = null;
      if (emitAfip && tx?.id) {
        try {
          toast.loading('Comunicando con AFIP...', { id: 'afip' });
          afipData = await afipService.emitInvoice(tx.id);
          toast.success('¡Factura AFIP emitida!', { id: 'afip' });
        } catch (e) {
          toast.error('Error AFIP: El cobro se registró pero la factura falló.', { id: 'afip' });
        }
      }

      const updated = { 
        ...appointment, 
        ...updatedFields,
        afip_cae: afipData?.cae,
        afip_nro: afipData?.numero 
      };
      setPaidApp(updated);
      if (onPaid) onPaid(updated);
      toast.success(`¡Cobro registrado! ${fmt(num)}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error al registrar el cobro.');
    } finally {
      setSaving(false);
    }
  };

  /* ── After success: show receipt ── */
  if (paidApp) {
    return (
      <PaymentReceiptModal
        appointment={paidApp}
        doctor={doctor}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in-quick">
      <div className="bg-[var(--bg-card)] border border-[var(--glass-border)] rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-fade-in-up">

        {/* Coloured header */}
        <div className="bg-gradient-to-br from-emerald-500/90 to-teal-600/90 px-5 py-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black text-emerald-50/70 uppercase tracking-widest mb-1.5">Cobro Rápido</p>
              <h3 className="text-white font-black text-2xl leading-tight">{appointment.patient}</h3>
              <p className="text-emerald-50/80 text-sm font-bold mt-1">{appointment.title}</p>
              {doctor && (
                <p className="text-emerald-100/60 text-[11px] font-bold mt-2 uppercase tracking-wider">
                  {doctor.name}{doctor.specialty ? ` · ${doctor.specialty}` : ''}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-emerald-100 hover:text-white hover:bg-white/20 rounded-xl transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Amount */}
          <div>
            <label className="block text-[11px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-widest mb-2 ml-1">
              Monto a cobrar
            </label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-emerald-500/30 group-focus-within:text-emerald-500 transition-colors">$</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                min="1"
                required
                autoFocus
                className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] group-focus-within:border-emerald-500/50 rounded-2xl pl-10 pr-4 py-4 text-2xl font-black text-emerald-500 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-emerald-500/20"
              />
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-[11px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-widest mb-2 ml-1">
              Método de pago
            </label>
            <div className="grid grid-cols-2 gap-2">
              {METHODS.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`py-3 rounded-xl text-xs font-black border transition-all uppercase tracking-wider ${
                    method === m
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                      : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-500'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-black text-[var(--text-secondary)] opacity-50 uppercase tracking-widest mb-2 ml-1">
              Observaciones <span className="normal-case font-bold opacity-40">(opcional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Obra social Galeno · Sesión N° 4"
              className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-primary)] outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all placeholder:text-[var(--text-secondary)]/30"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 text-xs font-black text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-main)] hover:bg-[var(--accent-light)] rounded-2xl border border-[var(--border-color)] transition-all uppercase tracking-widest"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !amount || Number(amount) <= 0}
              className="flex-[2] py-3.5 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-widest"
            >
              {saving ? (
              onClick={() => setEmitAfip(!emitAfip)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                emitAfip 
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600' 
                : 'bg-slate-500/5 border-slate-200/10 text-slate-400 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Landmark size={18} className={emitAfip ? 'text-indigo-500' : ''} />
                <div className="text-left">
                  <p className="text-[11px] font-black uppercase tracking-widest">Emitir Factura AFIP</p>
                  <p className="text-[9px] font-bold opacity-70">Se generará un CAE electrónico oficial</p>
                </div>
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-colors ${emitAfip ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${emitAfip ? 'left-5.5' : 'left-0.5'}`} />
              </div>
            </button>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? <RefreshCw className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
            <span className="uppercase tracking-[0.2em] text-xs">Confirmar Cobro</span>
          </button>
        </form>
      </div>
    </div>
  );
}
