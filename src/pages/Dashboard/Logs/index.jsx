import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import api from '../../../services/api';
import { useStore } from '../../../stores/useStore';
import toast from 'react-hot-toast';
import {
  Shield, Search, Filter, AlertTriangle, Info, AlertCircle,
  Activity, Users, Clock, X, Download, RefreshCw, Eye, FileText
} from 'lucide-react';

const formatDate = (dateString) => {
  if (!dateString) return 'Fecha inválida';
  try {
    const options = {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    return new Intl.DateTimeFormat('es-AR', options).format(new Date(dateString));
  } catch (error) {
    return new Date(dateString).toLocaleString('es-AR');
  }
};

const getRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return `Hace ${Math.max(0, diffInSeconds)} seg`;
  if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} hs`;
  return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
};

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);
  const { userRole } = useStore();

  useEffect(() => {
    if (userRole !== 'admin') return;

    const fetchLogs = async () => {
      try {
        const { data } = await api.get('/logs');
        setLogs(data.logs || []);
      } catch (err) {
        toast.error('Error al cargar los logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [userRole]);

  if (userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/20 flex items-center justify-center">
            <Shield size={36} className="text-rose-500 dark:text-rose-400" />
          </div>
          <p className="text-lg font-bold text-[var(--text-primary)]">Acceso Restringido</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">No tienes permisos para ver esta sección.</p>
        </div>
      </div>
    );
  }

  const filteredLogs = useMemo(() => {
    let filtered = logs;

    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.action?.toLowerCase().includes(term) ||
        log.user_name?.toLowerCase().includes(term) ||
        log.ip_address?.toLowerCase().includes(term) ||
        JSON.stringify(log.details).toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [logs, levelFilter, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: logs.length,
      info: logs.filter(l => l.level === 'INFO').length,
      warn: logs.filter(l => l.level === 'WARN').length,
      error: logs.filter(l => l.level === 'ERROR').length,
      critical: logs.filter(l => l.level === 'CRITICAL').length,
    };
  }, [logs]);

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('No hay logs para exportar');
      return;
    }
    
    const headers = ['Fecha', 'Nivel', 'Acción', 'Usuario', 'IP', 'Detalles'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log => {
        const details = log.details ? JSON.stringify(log.details).replace(/"/g, '""') : '';
        return [
          `"${formatDate(log.created_at)}"`,
          `"${log.level}"`,
          `"${log.action}"`,
          `"${log.user_name || 'Sistema'}"`,
          `"${log.ip_address || ''}"`,
          `"${details}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `logs_auditoria_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Logs exportados a CSV correctamente');
  };

  const getLevelConfig = (level) => {
    const configs = {
      INFO: {
        bg: 'bg-blue-500/10 dark:bg-blue-500/15',
        border: 'border-blue-500/20',
        text: 'text-blue-600 dark:text-blue-400',
        icon: Info,
        color: 'blue'
      },
      WARN: {
        bg: 'bg-amber-500/10 dark:bg-amber-500/15',
        border: 'border-amber-500/20',
        text: 'text-amber-600 dark:text-amber-400',
        icon: AlertTriangle,
        color: 'amber'
      },
      ERROR: {
        bg: 'bg-orange-500/10 dark:bg-orange-500/15',
        border: 'border-orange-500/20',
        text: 'text-orange-600 dark:text-orange-400',
        icon: AlertCircle,
        color: 'orange'
      },
      CRITICAL: {
        bg: 'bg-rose-500/10 dark:bg-rose-500/15',
        border: 'border-rose-500/20',
        text: 'text-rose-600 dark:text-rose-400',
        icon: AlertCircle,
        color: 'rose'
      },
    };
    return configs[level] || configs.INFO;
  };

  const statsConfig = [
    { label: 'Total Registros', value: stats.total, icon: Activity, color: 'indigo' },
    { label: 'Informativos', value: stats.info, icon: Info, color: 'blue' },
    { label: 'Advertencias', value: stats.warn, icon: AlertTriangle, color: 'amber' },
    { label: 'Errores', value: stats.error + stats.critical, icon: AlertCircle, color: 'rose' },
  ];

  const colorMap = {
    indigo: {
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
      border: 'border-indigo-500/20',
      text: 'text-indigo-500 dark:text-indigo-400',
      hover: 'hover:border-indigo-500/30'
    },
    blue: {
      bg: 'bg-blue-500/10 dark:bg-blue-500/15',
      border: 'border-blue-500/20',
      text: 'text-blue-500 dark:text-blue-400',
      hover: 'hover:border-blue-500/30'
    },
    amber: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/15',
      border: 'border-amber-500/20',
      text: 'text-amber-500 dark:text-amber-400',
      hover: 'hover:border-amber-500/30'
    },
    rose: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/15',
      border: 'border-rose-500/20',
      text: 'text-rose-500 dark:text-rose-400',
      hover: 'hover:border-rose-500/30'
    }
  };

  const levelFilters = [
    { key: 'all', label: 'Todos', count: stats.total },
    { key: 'INFO', label: 'Info', count: stats.info },
    { key: 'WARN', label: 'Warn', count: stats.warn },
    { key: 'ERROR', label: 'Error', count: stats.error },
    { key: 'CRITICAL', label: 'Critical', count: stats.critical },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 animate-fade-in-quick"
    >
      {/* ═══ HEADER ═══ */}
      <div className="glass-effect p-5 sm:p-6 rounded-3xl shadow-[var(--glass-shadow)] border border-[var(--glass-border)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50 pointer-events-none transition-transform duration-1000 group-hover:scale-110"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20 transform group-hover:rotate-6 transition-transform duration-500">
              <Shield size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
                Auditoría y <span className="text-indigo-500">Seguridad</span>
              </h1>
              <p className="text-sm text-[var(--text-secondary)] font-medium opacity-70 mt-0.5">
                Registro inmutable de actividad del sistema
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm"
              title="Exportar a CSV"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:shadow-md"
            >
              <RefreshCw size={16} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>
      </div>

      {/* ═══ STATS CARDS - CARRUSEL MÓVIL ═══ */}
      <div className="flex md:grid md:grid-cols-4 gap-3 sm:gap-4 overflow-x-auto md:overflow-visible hide-scrollbar py-2 md:py-0 snap-x snap-mandatory">
        {statsConfig.map((stat, idx) => {
          const Icon = stat.icon;
          const colors = colorMap[stat.color];

          return (
            <div
              key={idx}
              className={`card-premium rounded-2xl p-4 sm:p-5 border border-[var(--glass-border)] ${colors.hover} shrink-0 min-w-[180px] md:min-w-0 snap-start transition-all duration-300 group hover:shadow-md flex items-center gap-3 sm:gap-4`}
            >
              <div className={`${colors.bg} border ${colors.border} p-2.5 sm:p-3 rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-110`}>
                <Icon size={18} className={`${colors.text} sm:w-5 sm:h-5`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] sm:text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70 mb-0.5">
                  {stat.label}
                </p>
                <h4 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
                  {stat.value}
                </h4>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ FILTROS Y BÚSQUEDA ═══ */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Búsqueda */}
        <div className="relative group flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
          <input
            type="text"
            placeholder="Buscar por acción, usuario, IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl text-sm font-medium text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-light)] transition-all outline-none shadow-sm placeholder:text-[var(--text-secondary)]/60"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-lg transition-all"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filtros de nivel */}
        <div className="flex items-center gap-1 sm:gap-1.5 p-1.5 bg-[var(--bg-card)] border border-[var(--border-color)]/50 rounded-2xl shadow-sm overflow-x-auto hide-scrollbar">
          {levelFilters.map(f => {
            const isActive = levelFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setLevelFilter(f.key)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap
                  ${isActive
                    ? 'bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/25 translate-y-[-1px]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--accent-light)] hover:text-[var(--text-primary)]'
                  }`}
              >
                {f.label}
                {f.count > 0 && (
                  <span className={`min-w-[18px] h-4.5 flex items-center justify-center px-1 rounded-full text-[9px] font-black
                    ${isActive ? 'bg-white/25 text-white' : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)]'}`}>
                    {f.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ TABLA DE LOGS ═══ */}
      <div className="card-premium rounded-3xl overflow-hidden border border-[var(--glass-border)] shadow-sm">
        <div className="px-5 sm:px-6 py-4 border-b border-[var(--border-color)]/30 bg-[var(--bg-sidebar)]/50 flex items-center justify-between">
          <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2 text-sm sm:text-base">
            <Activity size={18} className="text-[var(--accent-primary)]" />
            Registros de Auditoría
          </h3>
          <span className="text-[10px] sm:text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-main)] px-2.5 py-1 rounded-full border border-[var(--border-color)]/40">
            {filteredLogs.length} registro{filteredLogs.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 border-4 border-[var(--accent-primary)]/20 rounded-full" />
              <div className="w-14 h-14 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
            </div>
            <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest">Cargando registros...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)]/40 flex items-center justify-center">
              <Shield size={36} className="text-[var(--text-secondary)] opacity-30" />
            </div>
            <p className="text-lg font-bold text-[var(--text-primary)] opacity-80 mb-2">
              {searchTerm || levelFilter !== 'all' ? 'No hay registros que coincidan' : 'No hay registros de auditoría'}
            </p>
            <p className="text-sm text-[var(--text-secondary)] opacity-60">
              {searchTerm || levelFilter !== 'all' ? 'Intenta con otros filtros o términos de búsqueda' : 'Los registros aparecerán aquí cuando haya actividad en el sistema'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-sidebar)]/30 border-b border-[var(--border-color)]/30 uppercase text-[10px] font-black tracking-widest text-[var(--text-secondary)] opacity-70">
                  <th className="px-6 py-4">Fecha / Hora</th>
                  <th className="px-6 py-4">Nivel</th>
                  <th className="px-6 py-4">Acción</th>
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">IP</th>
                  <th className="px-6 py-4 text-center">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/20">
                {filteredLogs.map((log) => {
                  const levelConfig = getLevelConfig(log.level);
                  const LevelIcon = levelConfig.icon;

                  return (
                    <tr key={log.id} className="hover:bg-[var(--accent-light)]/30 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <Clock size={13} className="text-[var(--accent-primary)] opacity-80" />
                            <span className="text-xs font-bold text-[var(--text-primary)]">
                              {formatDate(log.created_at)}
                            </span>
                          </div>
                          <span className="text-[10px] font-medium text-[var(--text-secondary)] ml-5 opacity-80">
                            {getRelativeTime(log.created_at)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border ${levelConfig.bg} ${levelConfig.border} ${levelConfig.text}`}>
                          <LevelIcon size={12} />
                          {log.level}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-hover)] flex items-center justify-center text-white text-[10px] font-black">
                            {log.user_name?.charAt(0) || 'S'}
                          </div>
                          <span className="text-xs font-bold text-[var(--text-primary)]">
                            {log.user_name || 'Sistema'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-mono font-bold text-[var(--text-secondary)] bg-[var(--bg-main)] px-2 py-1 rounded-md border border-[var(--border-color)]/40">
                          {log.ip_address}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {log.details ? (
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="p-2 text-[var(--accent-primary)] hover:bg-[var(--accent-light)] rounded-lg transition-all opacity-60 group-hover:opacity-100"
                            title="Ver detalles"
                          >
                            <Eye size={16} />
                          </button>
                        ) : (
                          <span className="text-xs text-[var(--text-secondary)] opacity-40">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ MODAL DE DETALLES ═══ */}
      {selectedLog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in-quick">
          <div className="bg-[var(--bg-card)] rounded-3xl shadow-2xl max-w-2xl w-full p-6 animate-scale-in border border-[var(--glass-border)] max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 ${getLevelConfig(selectedLog.level).bg} ${getLevelConfig(selectedLog.level).text} rounded-xl flex items-center justify-center border ${getLevelConfig(selectedLog.level).border}`}>
                  {React.createElement(getLevelConfig(selectedLog.level).icon, { size: 22 })}
                </div>
                <div>
                  <h3 className="text-lg font-black text-[var(--text-primary)]">Detalles del Registro</h3>
                  <p className="text-xs text-[var(--text-secondary)] font-medium">{selectedLog.action}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--bg-main)] p-4 rounded-xl border border-[var(--border-color)]/50">
                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70 mb-1">Nivel</p>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-black uppercase rounded-lg border ${getLevelConfig(selectedLog.level).bg} ${getLevelConfig(selectedLog.level).border} ${getLevelConfig(selectedLog.level).text}`}>
                    {selectedLog.level}
                  </span>
                </div>
                <div className="bg-[var(--bg-main)] p-4 rounded-xl border border-[var(--border-color)]/50">
                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70 mb-1">Fecha</p>
                  <p className="text-sm font-bold text-[var(--text-primary)] flex flex-col">
                    <span>{formatDate(selectedLog.created_at)}</span>
                    <span className="text-xs font-medium text-[var(--text-secondary)] opacity-80 mt-0.5">{getRelativeTime(selectedLog.created_at)}</span>
                  </p>
                </div>
                <div className="bg-[var(--bg-main)] p-4 rounded-xl border border-[var(--border-color)]/50">
                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70 mb-1">Usuario</p>
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    {selectedLog.user_name || 'Sistema / Anónimo'}
                  </p>
                </div>
                <div className="bg-[var(--bg-main)] p-4 rounded-xl border border-[var(--border-color)]/50">
                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70 mb-1">IP</p>
                  <p className="text-sm font-mono font-bold text-[var(--text-primary)]">
                    {selectedLog.ip_address}
                  </p>
                </div>
              </div>

              {selectedLog.details && (
                <div className="bg-[var(--bg-main)] p-4 rounded-xl border border-[var(--border-color)]/50">
                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70 mb-2">Detalles</p>
                  <pre className="text-xs font-mono text-[var(--text-primary)] bg-[var(--bg-card)] p-4 rounded-lg border border-[var(--border-color)]/30 overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedLog(null)}
                className="flex-1 py-3 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
