import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../../services/api';
import { useStore } from '../../../stores/useStore';
import toast from 'react-hot-toast';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
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
        <p className="text-gray-500">No tienes permisos para ver esta sección.</p>
      </div>
    );
  }

  const getLevelColor = (level) => {
    switch (level) {
      case 'INFO': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'WARN': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ERROR': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Auditoría y Seguridad</h1>
          <p className="text-sm text-gray-500 mt-1">Registro inmutable de actividad del sistema</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando registros...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay registros de auditoría disponibles.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha / Hora</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nivel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalles</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.created_at).toLocaleString('es-AR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border ${getLevelColor(log.level)}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.user_name ? `${log.user_name}` : 'Sistema / Anónimo'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">
                      {log.ip_address}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={JSON.stringify(log.details)}>
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
