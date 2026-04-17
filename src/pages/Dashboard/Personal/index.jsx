import { useState } from 'react';
import { useStore } from '../../../stores/useStore';
import {
  Users, Plus, X, Stethoscope, Monitor, Search, Briefcase,
  Phone, Award, Palette, Clock, CheckCircle, Pencil, Trash2, ShieldOff,
  ShieldCheck, Key, Mail, RefreshCw, Lock
} from 'lucide-react';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';

const COLOR_OPTIONS = ['indigo', 'esmeralda', 'purpura', 'naranja', 'rojo', 'celeste'];
const COLOR_MAP = {
  indigo:    { bg: 'bg-indigo-500',   text: 'text-indigo-700',   light: 'bg-indigo-50'   },
  esmeralda: { bg: 'bg-emerald-500',  text: 'text-emerald-700',  light: 'bg-emerald-50'  },
  purpura:   { bg: 'bg-purple-500',   text: 'text-purple-700',   light: 'bg-purple-50'   },
  naranja:   { bg: 'bg-orange-500',   text: 'text-orange-700',   light: 'bg-orange-50'   },
  rojo:      { bg: 'bg-rose-500',     text: 'text-rose-700',     light: 'bg-rose-50'     },
  celeste:   { bg: 'bg-sky-500',      text: 'text-sky-700',      light: 'bg-sky-50'      },
};



export default function PersonalPage() {
  const store = useStore();
  const doctors = store.doctors;
  const userRole = store.userRole;
  const adminStaff = store.adminStaff;
  const [staffTab, setStaffTab] = useState('medicos');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalRole, setModalRole] = useState('medico');
  const [toastMsg, setToastMsg] = useState('');
  const [editingId, setEditingId] = useState(null); // null = crear nuevo, id = editar existente
  const [confirmDeleteDoctor, setConfirmDeleteDoctor] = useState(null);
  const [confirmDeleteStaff, setConfirmDeleteStaff] = useState(null);
  const [createdCredentials, setCreatedCredentials] = useState(null); // { email, password, name }
  const [resetPasswordUser, setResetPasswordUser] = useState(null); // { id, name }
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [confirmRevokeUser, setConfirmRevokeUser] = useState(null); // { id, name }

  // Form state
  const [form, setForm] = useState({
    name: '', specialty: '', license: '', color: 'indigo', phone: '',
    adminRole: 'Recepcionista', shift: 'Mañana', remuneration: '',
    email: '', password: '' // Para creación de admin
  });

  const BLANK_FORM = { name: '', specialty: '', license: '', color: 'indigo', phone: '', adminRole: 'Recepcionista', shift: 'Mañana', remuneration: '', remunerationType: 'fijo' };

  const openNewEmployee = () => { setEditingId(null); setForm(BLANK_FORM); setShowModal(true); };

  const openEditDoctor = (doc) => {
    setModalRole('medico');
    setEditingId(doc.id);
    setForm({ name: doc.name, specialty: doc.specialty || '', license: doc.license || '', color: doc.color || 'indigo', phone: doc.phone || '', adminRole: 'Recepcionista', shift: 'Mañana', remuneration: doc.remuneration || '', remunerationType: doc.remunerationType || 'fijo' });
    setShowModal(true);
  };

  const openEditAdmin = (emp) => {
    setModalRole('recepcion');
    setEditingId(emp.id);
    setForm({ name: emp.name, specialty: '', license: '', color: 'indigo', phone: emp.phone || '', adminRole: emp.role || 'Recepcionista', shift: emp.shift || 'Mañana', remuneration: emp.remuneration || '', remunerationType: emp.remunerationType || 'fijo' });
    setShowModal(true);
  };

  // Access guard
  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)] gap-4">
        <div className="p-6 bg-[var(--accent-primary)]/10 rounded-full">
          <ShieldOff size={56} className="text-[var(--accent-primary)]" />
        </div>
        <h2 className="text-2xl font-black text-[var(--text-primary)]">Acceso Denegado</h2>
        <p className="text-sm font-medium opacity-70">Este módulo es de acceso restringido para Administradores.</p>
      </div>
    );
  }

  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3500); };

  const handleSave = async (e) => {
    e.preventDefault();

    // Si hay monto fijo NUEVO (no edición), inyectar Egreso en el Libro Diario de Finanzas
    const injectarEgreso = editingId === null && form.remunerationType === 'fijo' && Number(form.remuneration) > 0;
    let createdEntityId = null;

    try {
      if (modalRole === 'medico') {
        const remuData = { remuneration: form.remuneration, remunerationType: form.remunerationType };
        if (editingId !== null) {
          await store.updateDoctor(editingId, { name: form.name, specialty: form.specialty, license: form.license, color: form.color, phone: form.phone, ...remuData });
          showToast(`✓ Datos de ${form.name} actualizados.`);
        } else {
          const newDoc = {
            name: form.name,
            specialty: form.specialty,
            license: form.license,
            color: form.color,
            phone: form.phone,
            ...remuData,
            schedule: { 1: { start: 9, end: 18 }, 3: { start: 9, end: 18 }, 5: { start: 9, end: 18 } }
          };
          const created = await store.createDoctor(newDoc);
          createdEntityId = created.doctor.id;
          // Refetch para obtener el doctor con ID real de la BD
          await store.fetchDoctors();
          setCreatedCredentials({ name: form.name, email: created.email, password: created.password, role: 'Médico' });
        }
      } else if (modalRole === 'recepcion') {
        const remuData = { remuneration: form.remuneration, remunerationType: form.remunerationType };
        if (editingId !== null) {
          await store.updateStaff(editingId, { name: form.name, role: form.adminRole, shift: form.shift, phone: form.phone, ...remuData });
          showToast(`✓ Datos de ${form.name} actualizados.`);
        } else {
          const created = await store.createStaff({ name: form.name, role: form.adminRole, shift: form.shift, phone: form.phone, ...remuData });
          createdEntityId = created.staff.id;
          await store.fetchAdminStaff();
          setCreatedCredentials({ name: form.name, email: created.email, password: created.password, role: 'Administrativo' });
        }
      } else if (modalRole === 'admin') {
        // CREACIÓN DE ADMIN GLOBAL
        await store.createUser({ name: form.name, email: form.email, password: form.password });
        showToast(`✓ Administrador ${form.name} creado.`);
        setShowModal(false);
      }

      // VINCULACIÓN CON FINANZAS: inyectar egreso automático si es monto fijo
      if (injectarEgreso && createdEntityId) {
        const label = modalRole === 'medico' ? `Honorarios — ${form.name}` : `Sueldo — ${form.name}`;
        await store.createTransaction({
          date: new Date().toISOString(),
          type: 'Egreso',
          concept: label,
          method: 'Transferencia',
          amount: Number(form.remuneration),
          doctor_id: modalRole === 'medico' ? createdEntityId : null,
          staff_id: modalRole !== 'medico' ? createdEntityId : null
        });
        // Refetch transactions
        await store.fetchTransactions();
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      showToast(`❌ Error: ${error.response?.data?.message || error.message || 'No se pudo guardar'}`);
      return; // No cerrar el modal si hay error
    }

    setForm(BLANK_FORM);
    setEditingId(null);
    setShowModal(false);
  };

  const filteredDoctors = doctors.filter(d => d && d.name && d.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredAdmin = adminStaff.filter(a => a && a.name && a.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex flex-col min-h-0 h-[calc(100vh-12rem)] animate-fade-in-quick px-2 sm:px-6 py-2 sm:py-4 overflow-y-auto print:overflow-visible custom-scrollbar relative bg-[var(--bg-main)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-[2.5rem]">

      {/* TOAST */}
      {toastMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-full font-black shadow-2xl z-50 animate-bounce">
          {toastMsg}
        </div>
      )}

      {/* MODAL NUEVO EMPLEADO */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in-quick">
          <div className="bg-[var(--bg-card)] rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar border border-[var(--glass-border)]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-3">
                <div className="p-2 bg-[var(--accent-primary)]/10 rounded-xl">
                  {editingId ? <Pencil size={18} className="text-[var(--accent-primary)]" /> : <Plus size={20} className="text-[var(--accent-primary)]" />}
                </div>
                {editingId ? 'Editar Perfil' : 'Gestionar Nuevo Alta'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"><X size={24} /></button>
            </div>

            {/* Selector de tipo */}
            <div className="flex bg-[var(--bg-main)] rounded-2xl p-1.5 mb-8 gap-1.5 border border-[var(--border-color)]/30">
              <button
                type="button"
                onClick={() => setModalRole('medico')}
                className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${modalRole === 'medico' ? 'bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/20' : 'text-[var(--text-secondary)] opacity-60 hover:opacity-100 hover:bg-[var(--bg-card)]'}`}
              >
                <Stethoscope size={15} /> Médico
              </button>
              <button
                type="button"
                onClick={() => setModalRole('recepcion')}
                className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${modalRole === 'recepcion' ? 'bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/20' : 'text-[var(--text-secondary)] opacity-60 hover:opacity-100 hover:bg-[var(--bg-card)]'}`}
              >
                <Monitor size={15} /> Staff
              </button>
              <button
                type="button"
                onClick={() => setModalRole('admin')}
                className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${modalRole === 'admin' ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20' : 'text-[var(--text-secondary)] opacity-60 hover:opacity-100 hover:bg-[var(--bg-card)]'}`}
              >
                <ShieldCheck size={15} /> Admin
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest opacity-70">Identificación / Nombre Completo *</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/10 transition-all" placeholder="Ej: Lic. Laura Gómez" />
              </div>

              <div>
                <label className="block text-[10px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest opacity-70">Línea de Contacto Directo</label>
                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/10 transition-all" placeholder="Ej: 11 5000-0000" />
              </div>

              {modalRole === 'medico' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-[10px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest opacity-70">Especialidad *</label>
                       <input required value={form.specialty} onChange={e => setForm({...form, specialty: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] transition-all" placeholder="Ej: Psicología" />
                     </div>
                     <div>
                       <label className="block text-[10px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest opacity-70">Matrícula</label>
                       <input value={form.license} onChange={e => setForm({...form, license: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] transition-all" placeholder="Ej: MN-12345" />
                     </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-[0.2em] flex items-center gap-2 opacity-70"><Palette size={12} /> Personalización Agenda</label>
                    <div className="flex gap-3 flex-wrap bg-[var(--bg-main)]/50 p-4 rounded-2xl border border-[var(--border-color)]/30">
                      {COLOR_OPTIONS.map(c => (
                        <button
                          key={c} type="button"
                          onClick={() => setForm({...form, color: c})}
                          className={`w-9 h-9 rounded-full ${COLOR_MAP[c].bg} transition-all relative ${form.color === c ? 'ring-4 ring-[var(--accent-primary)]/20 scale-110 shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                          title={c}
                        >
                          {form.color === c && <div className="absolute inset-0 m-auto w-2 h-2 bg-white rounded-full"></div>}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : modalRole === 'recepcion' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest opacity-70">Rol Asignado</label>
                    <select value={form.adminRole} onChange={e => setForm({...form, adminRole: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] transition-all">
                      <option className="bg-[var(--bg-card)]">Recepcionista</option>
                      <option className="bg-[var(--bg-card)]">Secretaría</option>
                      <option className="bg-[var(--bg-card)]">Administración</option>
                      <option className="bg-[var(--bg-card)]">Coordinación</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest opacity-70 flex items-center gap-1.5"><Clock size={11} /> Turno Horario</label>
                    <select value={form.shift} onChange={e => setForm({...form, shift: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] transition-all">
                      <option className="bg-[var(--bg-card)]">Mañana</option>
                      <option className="bg-[var(--bg-card)]">Tarde</option>
                      <option className="bg-[var(--bg-card)]">Doble Turno</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 bg-rose-500/5 p-6 rounded-2xl border border-rose-500/20">
                   <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                     <ShieldCheck size={14} /> Credenciales Maestro
                   </p>
                   <div>
                     <label className="block text-[10px] font-black text-[var(--text-secondary)] mb-2 uppercase opacity-70 tracking-widest">Email Corporativo</label>
                     <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/10" placeholder="admin@consultorio.com" />
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-[var(--text-secondary)] mb-2 uppercase opacity-70 tracking-widest">Token / Password Temporal</label>
                     <input required type="text" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/10" placeholder="Min. 6 caracteres" />
                   </div>
                </div>
              )}

              {/* REMUNERACIÓN - universal con toggle % / Monto Fijo */}
              <div className="border-t border-[var(--border-color)]/30 pt-6 space-y-4">
                <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] opacity-80 flex items-center gap-2">💰 Modelo de Contraprestación</label>
                
                {/* Toggle tipo */}
                <div className="flex bg-[var(--bg-main)] rounded-xl p-1.5 gap-1.5 border border-[var(--border-color)]/30">
                  <button type="button" onClick={() => setForm({...form, remunerationType: 'porcentaje', remuneration: ''})}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                      form.remunerationType === 'porcentaje' ? 'bg-[var(--accent-primary)] text-white shadow-md' : 'text-[var(--text-secondary)] opacity-60 hover:opacity-100'
                    }`}>
                    Honorario %
                  </button>
                  <button type="button" onClick={() => setForm({...form, remunerationType: 'fijo', remuneration: ''})}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                      form.remunerationType === 'fijo' ? 'bg-[var(--accent-primary)] text-white shadow-md' : 'text-[var(--text-secondary)] opacity-60 hover:opacity-100'
                    }`}>
                    Sueldo Fijo $
                  </button>
                </div>

                {form.remunerationType === 'porcentaje' ? (
                  <div className="space-y-4 animate-fade-in-quick">
                    <div className="relative flex items-center">
                      <input type="number" min="0" max="100" step="1"
                        value={form.remuneration}
                        onChange={e => setForm({...form, remuneration: e.target.value})}
                        className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl pl-6 pr-12 py-3.5 text-xl font-black text-emerald-500 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                        placeholder="0" />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl font-black text-emerald-500/50">%</span>
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] font-bold px-1 opacity-60 leading-relaxed uppercase tracking-wider">Compensación por producción variable. No impacta de forma automática en el Libro Diario.</p>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in-quick">
                    <div className="relative flex items-center">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-sky-500/50">$</span>
                      <input type="number" min="0" step="1000"
                        value={form.remuneration}
                        onChange={e => setForm({...form, remuneration: e.target.value})}
                        className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl pl-12 pr-6 py-3.5 text-xl font-black text-sky-500 outline-none focus:border-sky-500/50 focus:ring-4 focus:ring-sky-500/5 transition-all"
                        placeholder="0.00" />
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] font-bold px-1 opacity-60 leading-relaxed uppercase tracking-wider">Carga fija operativa. Al guardar, se inyectará el movimiento contable en el Dashboard de Finanzas.</p>
                  </div>
                )}
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-[var(--accent-primary)]/20 active:scale-95 uppercase tracking-[0.2em] text-xs">
                  {editingId ? 'Actualizar Ficha de Empleado' : 'Finalizar Alta y Dar Acceso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-3">
            <div className="p-2 bg-[var(--accent-primary)]/10 rounded-xl">
              <Users className="text-[var(--accent-primary)]" />
            </div>
            Gestión de Personal
          </h2>
          <p className="text-sm font-medium text-[var(--text-secondary)] mt-1.5 opacity-70">Administración táctica del equipo clínico y administrativo del consultorio.</p>
        </div>
        <button
          onClick={() => openNewEmployee()}
          className="bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-black px-6 py-3.5 rounded-2xl flex items-center gap-3 shadow-xl shadow-[var(--accent-primary)]/20 active:scale-95 transition-all text-xs uppercase tracking-widest shrink-0"
        >
          <Plus size={18} /> Nuevo Alta
        </button>
      </div>

      {/* STATS RÁPIDOS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Cluster Total', value: doctors.length + adminStaff.length, icon: Users, color: 'text-[var(--accent-primary)]', bg: 'bg-[var(--accent-primary)]/10' },
          { label: 'Operadores Clínicos', value: doctors.length, icon: Stethoscope, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Staff Recepción', value: adminStaff.length, icon: Monitor, color: 'text-sky-500', bg: 'bg-sky-500/10' },
          { label: 'Disponibilidad', value: '100%', icon: CheckCircle, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        ].map(({ label, value, icon: StatIcon, color, bg }, i) => (
          <div key={i} className="card-premium rounded-2xl p-5 border border-[var(--border-color)]/30 shadow-sm flex items-center gap-4 group">
            <div className={`${bg} p-3 rounded-2xl group-hover:scale-110 transition-transform duration-500`}>
              <StatIcon size={22} className={color} />
            </div>
            <div>
              <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 mb-0.5">{label}</p>
              <p className="text-2xl font-black text-[var(--text-primary)] leading-none">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="card-premium rounded-3xl border border-[var(--border-color)]/50 shadow-xl flex flex-1 min-h-[600px] flex-col overflow-hidden">
        {/* TABS + SEARCH */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--border-color)]/50 px-6 pt-6 pb-0 gap-4 bg-[var(--bg-sidebar)]/30">
          <div className="flex gap-2">
            {[ ['medicos', Stethoscope, 'Clínico'], ['admin', Monitor, 'Soporte'], ['seguridad', ShieldCheck, 'Sistemas'] ].map(([tabId, TabIcon, label]) => (
              <button key={tabId} 
                onClick={() => {
                  setStaffTab(tabId);
                  if (tabId === 'seguridad') store.fetchUsers();
                }} 
                className={`px-6 py-4 rounded-t-2xl font-black text-[10px] uppercase tracking-[0.15em] flex items-center gap-2 transition-all ${staffTab === tabId ? 'bg-[var(--bg-card)] text-[var(--accent-primary)] border border-[var(--border-color)] border-b-transparent relative top-[1px] shadow-[0_-5px_15px_rgba(0,0,0,0.03)]' : 'text-[var(--text-secondary)] opacity-60 hover:opacity-100 hover:bg-[var(--bg-main)]'}`}>
                <TabIcon size={16} /> {label}
              </button>
            ))}
          </div>
          <div className="relative pb-4 sm:pb-4 group">
            <Search size={16} className="absolute left-4 top-[45%] -translate-y-1/2 text-[var(--text-secondary)] opacity-50 group-hover:text-[var(--accent-primary)] transition-colors" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o ID..."
              className="pl-11 pr-5 py-2.5 bg-[var(--bg-main)]/50 border border-[var(--border-color)] rounded-2xl text-sm font-bold text-[var(--text-primary)] outline-none focus:bg-[var(--bg-card)] focus:border-[var(--accent-primary)] transition-all w-full sm:w-64 placeholder:text-[var(--text-secondary)]/30"
            />
          </div>
        </div>

        {/* TABLE CONTENT - SCOLL RESPONSIVO */}
        <div className="flex-1 overflow-x-auto custom-scrollbar-horizontal bg-[var(--bg-card)]">
           <div className="min-w-[900px] sm:min-w-0 px-8 py-2">

          {/* SEGURIDAD Y CUENTAS */}
          {staffTab === 'seguridad' && (
            <div className="animate-fade-in-quick">
              <div className="p-8 bg-[var(--accent-primary)]/5 border-b border-[var(--accent-primary)]/10 rounded-[2rem] flex items-center justify-between mb-6 mt-4">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-[var(--accent-primary)]/20 rounded-2xl flex items-center justify-center text-[var(--accent-primary)] shadow-inner">
                    <ShieldCheck size={28} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Ecosistema de Acceso Centralizado</h4>
                    <p className="text-xs text-[var(--text-secondary)] font-bold mt-1 opacity-70">Control de privilegios y auditoría de cuentas activas en la red clínica.</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setModalRole('admin'); setEditingId(null); setForm({...BLANK_FORM, email: '', password: ''}); setShowModal(true); }}
                  className="bg-[var(--accent-primary)] text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl shadow-xl shadow-[var(--accent-primary)]/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Plus size={16} /> Alta Admin Maestro
                </button>
              </div>

              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="bg-transparent">
                    <th className="py-4 px-6 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60">Operador / Identidad</th>
                    <th className="py-4 px-4 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60">Punto de Enlace (Email)</th>
                    <th className="py-4 px-4 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 text-center">Nivel de Privilegio</th>
                    <th className="py-4 px-4 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 text-center">Estado del Token</th>
                    <th className="py-4 px-6 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 text-right">Mandos</th>
                  </tr>
                </thead>
                <tbody className="space-y-4">
                  {store.users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase())).map(user => (
                    <tr key={user.id} className="bg-[var(--bg-main)]/30 hover:bg-[var(--bg-card)] transition-all group rounded-2xl overflow-hidden border border-[var(--border-color)]/20">
                      <td className="py-5 px-6 rounded-l-2xl border-l border-y border-[var(--border-color)]/20">
                        <div className="flex items-center gap-4">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm border shadow-sm ${user.role === 'admin' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : user.role === 'medico' ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                            {user.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-black text-[var(--text-primary)]">{user.name}</p>
                            <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-50 mt-0.5">
                              {user.doctor_name ? `Clínico: ${user.doctor_name}` : user.staff_name ? `Support: ${user.staff_name}` : 'Super Administrador'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-4 border-y border-[var(--border-color)]/20">
                        <div className="flex items-center gap-3">
                          <Mail size={16} className="text-[var(--text-secondary)] opacity-40" />
                          <span className="text-xs font-mono font-black text-[var(--text-primary)]/80 tracking-tight">{user.email}</span>
                        </div>
                      </td>
                      <td className="py-5 px-4 text-center border-y border-[var(--border-color)]/20">
                        <span className={`inline-block px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                          user.role === 'admin' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 
                          user.role === 'medico' ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20' : 
                          'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-5 px-4 text-center border-y border-[var(--border-color)]/20">
                        {user.must_change_password ? (
                           <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase rounded-xl border border-amber-500/20 shadow-sm">
                             <RefreshCw size={12} className="animate-spin-slow" /> Rotación Pendiente
                           </div>
                        ) : (
                           <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase rounded-xl border border-emerald-500/20">
                             <CheckCircle size={12} /> Sync Verificada
                           </div>
                        )}
                      </td>
                      <td className="py-5 px-6 text-right rounded-r-2xl border-r border-y border-[var(--border-color)]/20">
                         <div className="flex items-center justify-end gap-3 opacity-40 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => { setResetPasswordUser({ id: user.id, name: user.name }); setResetPasswordValue(''); }}
                              className="p-2.5 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-light)] rounded-2xl transition-all shadow-sm border border-transparent hover:border-[var(--accent-primary)]/20" 
                              title="Configurar Token"
                            >
                              <Key size={18} />
                            </button>
                            <button 
                              onClick={() => setConfirmRevokeUser({ id: user.id, name: user.name })}
                              className="p-2.5 text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all shadow-sm border border-transparent hover:border-rose-500/20" 
                              title="Revocar Credencial"
                            >
                              <Trash2 size={18} />
                            </button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* MÉDICOS */}
          {staffTab === 'medicos' && (
            <table className="w-full text-left border-separate border-spacing-y-4 animate-fade-in-quick mt-4">
              <thead>
                <tr className="bg-transparent">
                  <th className="py-3 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60">Especialista / Clínica</th>
                  <th className="py-3 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 hidden sm:table-cell">Credencial MN</th>
                  <th className="py-3 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 hidden md:table-cell">Enlace Directo</th>
                  <th className="py-3 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 text-center">Firma Visual</th>
                  <th className="py-3 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 text-right">Comandos</th>
                </tr>
              </thead>
              <tbody className="space-y-4">
                {filteredDoctors.map(doc => (
                  <tr key={doc.id} className="bg-[var(--bg-main)]/30 hover:bg-[var(--bg-card)] transition-all group hover:scale-[1.01] transform duration-300">
                    <td className="py-5 px-4 rounded-l-3xl border-l border-y border-[var(--border-color)]/20">
                      <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center font-black text-white shadow-xl ${COLOR_MAP[doc.color]?.bg || 'bg-[var(--accent-primary)]'} border-2 border-white/20`}>
                          {doc.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-black text-[var(--text-primary)] tracking-tight">{doc.name}</p>
                          <p className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-widest opacity-80 mt-1">{doc.specialty}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-2 hidden sm:table-cell border-y border-[var(--border-color)]/20">
                      <span className="text-[11px] font-mono font-black text-[var(--text-secondary)] bg-[var(--bg-main)] px-3 py-1.5 rounded-xl border border-[var(--border-color)]/30">{doc.license || 'GEN-CLINIC'}</span>
                    </td>
                    <td className="py-5 px-2 hidden md:table-cell border-y border-[var(--border-color)]/20">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-[var(--text-primary)] flex items-center gap-2 opacity-80"><Phone size={14} className="text-[var(--accent-primary)]"/> {doc.phone || '+54 --- ---'}</span>
                      </div>
                    </td>
                    <td className="py-5 px-2 text-center border-y border-[var(--border-color)]/20">
                      <div className="flex justify-center">
                        <div className={`w-4 h-4 rounded-full ring-8 ring-offset-2 ${COLOR_MAP[doc.color]?.bg || 'bg-[var(--accent-primary)]'} ring-[var(--bg-main)] shadow-inner`}></div>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-right rounded-r-3xl border-r border-y border-[var(--border-color)]/20">
                      <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditDoctor(doc)} className="p-3 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-light)] rounded-2xl transition-all border border-transparent hover:border-[var(--accent-primary)]/20"><Pencil size={18} /></button>
                        <button onClick={() => setConfirmDeleteDoctor(doc.id)} className="p-3 text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all border border-transparent hover:border-rose-500/20"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDoctors.length === 0 && (
                  <tr><td colSpan={5} className="py-20 text-center text-[var(--text-secondary)] text-sm font-black uppercase tracking-[0.2em] opacity-40">No hay registros clínicos en el cluster actual.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {/* ADMINISTRATIVOS */}
          {staffTab === 'admin' && (
            <table className="w-full text-left border-separate border-spacing-y-4 animate-fade-in-quick mt-4">
              <thead>
                <tr className="bg-transparent">
                  <th className="py-3 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60">Agente Operativo</th>
                  <th className="py-3 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 hidden sm:table-cell">Función Crítica</th>
                  <th className="py-3 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 hidden md:table-cell">Bloque Horario</th>
                  <th className="py-3 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 text-center">Carga Salarial</th>
                  <th className="py-3 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 text-right">Acciones de Red</th>
                </tr>
              </thead>
              <tbody className="space-y-4">
                {filteredAdmin.map(emp => (
                  <tr key={emp.id} className="bg-[var(--bg-main)]/30 hover:bg-[var(--bg-card)] transition-all group rounded-2xl border border-[var(--border-color)]/20">
                    <td className="py-5 px-4 rounded-l-3xl border-l border-y border-[var(--border-color)]/20">
                       <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-[1.25rem] bg-[var(--bg-main)] flex items-center justify-center font-black text-[var(--text-secondary)] border border-[var(--border-color)]/50 shadow-inner">
                          {emp.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-black text-[var(--text-primary)] tracking-tight">{emp.name}</p>
                          <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 mt-1">{emp.phone || 'Contacto no vinculado'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-2 hidden sm:table-cell border-y border-[var(--border-color)]/20">
                      <span className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest bg-[var(--accent-light)]/50 px-3 py-1.5 rounded-xl border border-[var(--accent-primary)]/10">{emp.role}</span>
                    </td>
                    <td className="py-5 px-2 hidden md:table-cell border-y border-[var(--border-color)]/20">
                      <div className="flex items-center gap-2 text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-tighter opacity-70">
                        <Clock size={16} className="text-[var(--accent-primary)] opacity-60" /> {emp.shift}
                      </div>
                    </td>
                    <td className="py-5 px-2 text-center border-y border-[var(--border-color)]/20">
                       <span className={`text-sm font-black font-mono tracking-tighter ${emp.remunerationType === 'fijo' ? 'text-sky-500' : 'text-emerald-500'}`}>
                         {emp.remunerationType === 'fijo' ? '$' : ''}{Number(emp.remuneration || 0).toLocaleString()}{emp.remunerationType === 'porcentaje' ? '%' : ''}
                       </span>
                    </td>
                    <td className="py-5 px-6 text-right rounded-r-3xl border-r border-y border-[var(--border-color)]/20">
                       <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditAdmin(emp)} className="p-3 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-light)] rounded-2xl transition-all border border-transparent hover:border-[var(--accent-primary)]/20"><Pencil size={18} /></button>
                        <button onClick={() => setConfirmDeleteStaff(emp.id)} className="p-3 text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all border border-transparent hover:border-rose-500/20"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredAdmin.length === 0 && (
                  <tr><td colSpan={5} className="py-20 text-center text-[var(--text-secondary)] text-sm font-black uppercase tracking-[0.2em] opacity-40">No se encontraron agentes de soporte.</td></tr>
                )}
              </tbody>
            </table>
          )}
           </div>
        </div>
      </div>

      {/* CONFIRM DIALOGS */}
      <ConfirmDialog
        isOpen={confirmDeleteDoctor !== null}
        onConfirm={() => {
          const doc = doctors.find(d => d.id === confirmDeleteDoctor);
          store.deleteDoctor(confirmDeleteDoctor);
          showToast(`${doc?.name || 'Profesional'} fue eliminado del equipo.`);
          setConfirmDeleteDoctor(null);
        }}
        onCancel={() => setConfirmDeleteDoctor(null)}
        title="Eliminar profesional"
        description="¿Estás seguro de que deseas eliminar este profesional del equipo? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="danger"
      />
      <ConfirmDialog
        isOpen={confirmDeleteStaff !== null}
        onConfirm={() => {
          const emp = adminStaff.find(a => a.id === confirmDeleteStaff);
          store.deleteStaff(confirmDeleteStaff);
          showToast(`${emp?.name || 'Empleado'} fue eliminado del personal.`);
          setConfirmDeleteStaff(null);
        }}
        onCancel={() => setConfirmDeleteStaff(null)}
        title="Eliminar empleado"
        description="¿Estás seguro de que deseas eliminar este empleado del personal? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="danger"
      />

      {/* MODAL: RESTABLECER CONTRASEÑA */}
      {resetPasswordUser && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in-quick">
          <div className="bg-[var(--bg-card)] rounded-[3rem] p-10 w-full max-w-sm shadow-2xl relative overflow-hidden border border-[var(--border-color)]/20">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[var(--accent-primary)] to-purple-500"></div>
            <div className="w-16 h-16 bg-[var(--accent-light)] rounded-2xl flex items-center justify-center mx-auto mb-8 text-[var(--accent-primary)] shadow-inner">
              <Key size={32} />
            </div>
            <h3 className="text-xl font-black text-[var(--text-primary)] text-center mb-2 tracking-tight">Restablecer Token</h3>
            <p className="text-xs font-bold text-[var(--text-secondary)] text-center mb-8 px-2 opacity-70 uppercase tracking-widest leading-relaxed">
              Generar nueva contraseña temporal de acceso para <strong className="text-[var(--text-primary)]">{resetPasswordUser.name}</strong>
            </p>
            <div className="space-y-6">
              <div className="relative group">
                <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-40 group-focus-within:text-[var(--accent-primary)] transition-colors" />
                <input
                  type="text"
                  autoFocus
                  value={resetPasswordValue}
                  onChange={e => setResetPasswordValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && resetPasswordValue.trim()) {
                      store.updateUser(resetPasswordUser.id, { password: resetPasswordValue.trim() });
                      showToast(`✓ Contraseña de ${resetPasswordUser.name} actualizada.`);
                      setResetPasswordUser(null);
                    }
                  }}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl pl-14 pr-5 py-4 text-sm font-black text-[var(--text-primary)] outline-none focus:bg-[var(--bg-card)] focus:border-[var(--accent-primary)] transition-all shadow-inner tracking-widest"
                  placeholder="TOKEN-MÍN-6"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setResetPasswordUser(null)}
                  className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-[var(--text-secondary)] hover:bg-[var(--bg-main)] transition-all opacity-60 hover:opacity-100"
                >
                  Abortar
                </button>
                <button
                  disabled={!resetPasswordValue.trim()}
                  onClick={() => {
                    store.updateUser(resetPasswordUser.id, { password: resetPasswordValue.trim() });
                    showToast(`✓ Contraseña de ${resetPasswordUser.name} actualizada.`);
                    setResetPasswordUser(null);
                  }}
                  className="flex-2 py-4 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] transition-all shadow-xl shadow-[var(--accent-primary)]/20 disabled:grayscale disabled:opacity-30 active:scale-95"
                >
                  Actualizar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REVOCAR ACCESO */}
      <ConfirmDialog
        isOpen={confirmRevokeUser !== null}
        onConfirm={() => {
          store.deleteUser(confirmRevokeUser.id);
          showToast(`Acceso de ${confirmRevokeUser.name} revocado.`);
          setConfirmRevokeUser(null);
        }}
        onCancel={() => setConfirmRevokeUser(null)}
        title="Revocar acceso"
        description={`¿Revocar acceso permanentemente a ${confirmRevokeUser?.name}? Se eliminará su cuenta de usuario del sistema.`}
        confirmText="Revocar"
        variant="danger"
      />

      {/* MODAL DE CREDENCIALES GENERADAS */}
      {createdCredentials && (
        <div className="fixed inset-0 bg-slate-900/80 z-[60] flex items-center justify-center p-4 backdrop-blur-xl animate-fade-in-quick">
          <div className="bg-[var(--bg-card)] rounded-[3rem] p-10 w-full max-w-sm shadow-2xl text-center relative overflow-hidden border border-white/10">
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-emerald-400 via-[var(--accent-primary)] to-indigo-600"></div>
            
            <div className="w-24 h-24 bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-emerald-500 shadow-inner">
               <CheckCircle size={48} />
            </div>
            
            <h3 className="text-2xl font-black text-[var(--text-primary)] mb-2 tracking-tight">¡Operador Vinculado!</h3>
            <p className="text-xs font-bold text-[var(--text-secondary)] mb-10 px-4 opacity-70 leading-relaxed uppercase tracking-wider">
              Se ha dado de alta a <strong className="text-[var(--text-primary)]">{createdCredentials.name}</strong> en el sistema. 
              Copiá y compartí estas credenciales de acceso:
            </p>
            
            <div className="space-y-4 mb-10">
               <div className="bg-[var(--bg-main)] border border-[var(--border-color)]/30 rounded-2xl p-5 text-left relative group hover:border-[var(--accent-primary)]/30 transition-colors shadow-inner">
                  <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] block mb-2 opacity-50">Email Institucional</span>
                  <code className="text-sm font-black text-[var(--accent-primary)] break-all font-mono leading-none">{createdCredentials.email}</code>
               </div>
               <div className="bg-[var(--bg-main)] border border-[var(--border-color)]/30 rounded-2xl p-5 text-left relative group hover:border-emerald-500/30 transition-colors shadow-inner">
                  <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] block mb-2 opacity-50">Token de Activación</span>
                  <code className="text-sm font-black text-emerald-500 font-mono leading-none tracking-widest">{createdCredentials.password || 'integrar_2024'}</code>
               </div>
            </div>

            <button 
              onClick={() => setCreatedCredentials(null)}
              className="w-full bg-[var(--text-primary)] hover:bg-black text-[var(--bg-card)] font-black py-4.5 rounded-2xl transition-all shadow-xl hover:shadow-black/20 active:scale-95 uppercase tracking-[0.2em] text-[10px]"
            >
              Completado & Salir
            </button>
            <div className="mt-6 flex items-center justify-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-tighter opacity-50">Canales de enlace configurados correctamente</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
