import { useState, useEffect, useMemo } from 'react';
import { 
  Pill, Search, Plus, Trash2, Pencil, 
  Activity, Info, AlertCircle, Loader2,
  ChevronRight, Filter, Download, Minus
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { medicationsService } from '../../../services/medications';
import { useStore } from '../../../stores/useStore';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';

export default function MedicamentosPage() {
  const store = useStore();
  const [meds, setMeds] = useState([]);
  const [activePrescriptions, setActivePrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('vademecum'); // 'vademecum' | 'prescripciones'
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    doses: '',
    description: ''
  });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null });

  useEffect(() => {
    loadMeds();
  }, []);

  const loadMeds = async () => {
    setLoading(true);
    try {
      const [data, prescriptions] = await Promise.all([
        medicationsService.getAll(),
        medicationsService.getActivePrescriptions()
      ]);
      setMeds(data || []);
      setActivePrescriptions(prescriptions || []);
    } catch (err) {
      toast.error('Error al cargar el vademécum o prescripciones');
    } finally {
      setLoading(false);
    }
  };

  const filteredMeds = useMemo(() => {
    return meds.filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.active_ingredient && m.active_ingredient.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [meds, searchTerm]);

  // Las prescripciones activas ahora se cargan directamente desde el backend en loadMeds()

  const handleUpdateStock = async (med, delta) => {
    const newQty = Math.max(0, (med.quantity || 0) + delta);
    try {
      await medicationsService.update(med.id, { ...med, quantity: newQty });
      setMeds(prev => prev.map(m => m.id === med.id ? { ...m, quantity: newQty } : m));
    } catch (err) {
      toast.error('Error al actualizar stock');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMed) {
        await medicationsService.update(editingMed.id, formData);
        toast.success('Medicamento actualizado');
      } else {
        await medicationsService.create(formData);
        toast.success('Medicamento añadido al inventario');
      }
      setIsModalOpen(false);
      setEditingMed(null);
      setFormData({ name: '', doses: '', description: '' });
      loadMeds();
    } catch (err) {
      toast.error('Error al guardar');
    }
  };

  const handleDelete = async () => {
    try {
      await medicationsService.remove(deleteConfirm.id);
      toast.success('Eliminado correctamente');
      setDeleteConfirm({ isOpen: false, id: null });
      loadMeds();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-quick">
      {/* HEADER & STATS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 glass-effect p-8 rounded-[2.5rem] shadow-[var(--glass-shadow)] border border-[var(--glass-border)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-rose-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50 pointer-events-none transition-transform group-hover:scale-110 duration-1000"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-500/20 transform group-hover:rotate-6 transition-transform">
              <Pill size={24} />
            </div>
            <h2 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">
              Gestión de <span className="text-rose-500">Medicamentos</span>
            </h2>
          </div>
          <p className="text-sm text-[var(--text-secondary)] font-medium opacity-70 ml-1">
            Vademécum clínico y lista de fármacos frecuentes
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
           <button 
             onClick={() => { setEditingMed(null); setFormData({ name: '', doses: '', description: '' }); setIsModalOpen(true); }}
             className="px-6 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg shadow-rose-500/20 transition-all hover:-translate-y-0.5 active:scale-95"
           >
             <Plus size={18} />
             Añadir Nuevo
           </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 p-1.5 bg-[var(--bg-card)] border border-[var(--border-color)]/50 rounded-2xl w-fit shadow-sm">
        <button 
          onClick={() => setActiveTab('vademecum')}
          className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'vademecum' ? 'bg-rose-500 text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-light)]'}`}
        >
          Vademécum
        </button>
        <button 
          onClick={() => setActiveTab('prescripciones')}
          className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'prescripciones' ? 'bg-rose-500 text-white shadow-md' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-light)]'}`}
        >
          Pacientes en Tratamiento
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="relative group max-w-xl">
        <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-40 group-focus-within:text-rose-500 group-focus-within:opacity-100 transition-all" />
        <input id="searchTerm" name="searchTerm"
          type="text"
          placeholder={activeTab === 'vademecum' ? "Buscar por nombre (ej: Alprazolam)..." : "Buscar por paciente o medicamento..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-14 pr-10 py-5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-[2rem] text-sm font-bold text-[var(--text-primary)] focus:border-rose-500/50 focus:ring-8 focus:ring-rose-500/5 transition-all outline-none shadow-inner placeholder:text-[var(--text-secondary)]/30"
        />
      </div>

      {/* CONTENT GRID */}
      {activeTab === 'vademecum' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4 text-rose-500/30">
               <Loader2 size={48} className="animate-spin" />
               <p className="text-sm font-black uppercase tracking-widest">Sincronizando vademécum...</p>
            </div>
          ) : filteredMeds.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
               <Pill size={48} className="mx-auto text-slate-200 mb-4" />
               <p className="text-slate-500 font-bold">No se encontraron medicamentos en la lista.</p>
            </div>
          ) : (
            filteredMeds.map(med => (
              <div key={med.id} className="card-premium p-6 group hover:border-rose-200/50 transition-all flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-rose-500/10 text-rose-600 rounded-xl flex items-center justify-center">
                    <Pill size={20} />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => { setEditingMed(med); setFormData({ name: med.name, doses: med.doses, description: med.description }); setIsModalOpen(true); }}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    >
                      <Pencil size={14} />
                    </button>
                    <button 
                      onClick={() => setDeleteConfirm({ isOpen: true, id: med.id })}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-base font-black text-[var(--text-primary)] mb-1 leading-tight uppercase tracking-tighter">{med.name}</h3>
                  <p className="text-xs font-bold text-rose-500 uppercase tracking-wide mb-3">{med.doses || 'Dosis no especificadas'}</p>
                </div>

                {med.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 italic opacity-80 mt-2">{med.description}</p>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Paciente</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Medicamento</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dosis / Frec.</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Inicio</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activePrescriptions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-20 text-center text-slate-400 font-bold italic">No hay prescripciones activas registradas en el sistema.</td>
                  </tr>
                ) : (
                  activePrescriptions.map((pres, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <p className="text-sm font-black text-[var(--text-primary)]">{pres.patientName}</p>
                        <p className="text-[10px] font-bold text-slate-400">ID: #{pres.patientId}</p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                            <Pill size={14} />
                          </div>
                          <p className="text-sm font-bold text-slate-700">{pres.drug}</p>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-medium text-slate-600">{pres.dose}</p>
                        <p className="text-xs text-slate-400 italic">{pres.frequency}</p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs font-bold text-slate-500">{new Date(pres.start_date).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase rounded-full border border-emerald-200">Activa</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL NUEVO/EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-card)] rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-[var(--border-color)] animate-slide-up">
             <div className="px-8 py-6 bg-rose-500 flex justify-between items-center text-white">
                <div>
                  <h3 className="text-xl font-black tracking-tight">{editingMed ? 'Editar Medicamento' : 'Nuevo Fármaco'}</h3>
                  <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Vademécum Clínico</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-all">
                   <Plus size={24} className="rotate-45" />
                </button>
             </div>
             
             <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Comercial</label>
                      <input id="name" name="name" 
                        required
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-5 py-4 bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-2xl text-sm font-bold outline-none focus:border-rose-500 transition-all"
                        placeholder="Ej: Clonagin"
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dosis Disponibles (Separadas por guion o coma)</label>
                      <input id="doses" name="doses" 
                        type="text" 
                        value={formData.doses}
                        onChange={(e) => setFormData({...formData, doses: e.target.value})}
                        className="w-full px-5 py-4 bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-2xl text-sm font-bold outline-none focus:border-rose-500 transition-all"
                        placeholder="Ej: 0.5 mg - 2 mg - gotas"
                      />
                   </div>

                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción / Notas</label>
                      <textarea id="description" name="description" 
                        rows="3"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full px-5 py-4 bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-2xl text-sm font-bold outline-none focus:border-rose-500 transition-all resize-none"
                        placeholder="Indicaciones especiales, contraindicaciones..."
                      />
                   </div>
                </div>

                <div className="flex gap-3 pt-4">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-[var(--bg-main)] text-[var(--text-secondary)] font-black rounded-2xl hover:bg-[var(--accent-light)] hover:text-[var(--text-primary)] transition-all">Cancelar</button>
                   <button type="submit" className="flex-[2] py-4 bg-rose-500 text-white font-black rounded-2xl hover:bg-rose-600 shadow-lg shadow-rose-500/20 transition-all">Guardar Medicamento</button>
                </div>
             </form>
          </div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={deleteConfirm.isOpen}
        title="¿Eliminar medicamento?"
        message="Esta acción quitará el fármaco del vademécum global. No afectará a las prescripciones ya realizadas a pacientes."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
        confirmText="Sí, eliminar"
        type="danger"
      />
    </div>
  );
}
