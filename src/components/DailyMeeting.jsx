import React, { useEffect, useRef, useState } from 'react';
import DailyIframe from '@daily-co/daily-js';
import { Loader2 } from 'lucide-react';
import api from '../services/api';

const DailyMeeting = ({ appointmentId, codigo, displayName, isModerator, onReadyToClose, onJoined }) => {
  const containerRef = useRef(null);
  const callObjectRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function initDaily() {
      try {
        setLoading(true);
        // 1. Obtener la URL dinámica de la sala desde nuestro backend
        const { data } = await api.get(`/telemedicine/get_room?id=${appointmentId}&codigo=${codigo}`);
        
        if (!data || !data.data || !data.data.url) {
          throw new Error('No se pudo obtener la URL de la sala');
        }
        
        const roomUrl = data.data.url;

        if (!isMounted || !containerRef.current) return;

        // 2. Crear el iframe de Daily Prebuilt
        const callFrame = DailyIframe.createFrame(containerRef.current, {
          iframeStyle: {
            width: '100%',
            height: '100%',
            border: '0',
            backgroundColor: '#000000',
          },
          showLeaveButton: true,
          showFullscreenButton: true,
        });

        callObjectRef.current = callFrame;

        // 3. Escuchar eventos
        callFrame.on('left-meeting', () => {
          if (onReadyToClose) onReadyToClose();
        });
        
        callFrame.on('joined-meeting', () => {
          setLoading(false);
          if (onJoined) onJoined();
        });

        callFrame.on('error', (e) => {
          console.error('Daily error:', e);
          if (isMounted) setError(e.errorMsg || 'Error de conexión');
          setLoading(false);
        });

        // 4. Unirse a la llamada
        await callFrame.join({ 
          url: roomUrl,
          userName: displayName,
          lang: 'es',
          theme: {
            colors: {
              accent: '#4f46e5', // indigo-600
              accentText: '#ffffff',
              background: '#0f172a', // slate-900
              backgroundAccent: '#1e293b', // slate-800
              baseText: '#f8fafc',
              border: '#334155',
              mainAreaBg: '#020617', // slate-950
              mainAreaBgAccent: '#0f172a',
              mainAreaText: '#f8fafc',
              supportiveText: '#94a3b8',
            }
          }
        });
        
      } catch (err) {
        console.error('Error inicializando Daily:', err);
        if (isMounted) setError('No se pudo establecer la conexión segura. Intentá nuevamente.');
        setLoading(false);
      }
    }

    initDaily();

    return () => {
      isMounted = false;
      if (callObjectRef.current) {
        callObjectRef.current.destroy();
        callObjectRef.current = null;
      }
    };
  }, [appointmentId, codigo, displayName, isModerator, onReadyToClose, onJoined]);

  return (
    <div className="w-full h-full relative bg-black">
      {loading && !error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900 text-white">
          <Loader2 size={40} className="animate-spin text-indigo-500 mb-4" />
          <p className="text-sm font-semibold animate-pulse text-indigo-200">Conectando a servidor seguro...</p>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
          <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mb-4 border border-rose-500/50">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-bold text-rose-400 mb-2">Error de Conexión</h3>
          <p className="text-sm text-slate-300 max-w-sm mb-6">{error}</p>
          <button 
            onClick={() => { if (onReadyToClose) onReadyToClose(); }}
            className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 font-bold rounded-xl shadow-lg transition-colors"
          >
            Volver e intentar de nuevo
          </button>
        </div>
      )}

      {/* Contenedor donde Daily.co inyectará el iframe */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

export default DailyMeeting;
