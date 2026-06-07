import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock } from 'lucide-react';

export default function CustomTimePicker({ value, onChange, min = "00:00", max = "23:59", step = 5, placeholder = "HH:MM", className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const popoverRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  // Parse HH:MM
  const parseTime = (t) => {
    if (!t) return { h: null, m: null };
    const [hStr, mStr] = t.split(':');
    return { h: parseInt(hStr, 10), m: parseInt(mStr, 10) };
  };

  const current = parseTime(value);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current && !containerRef.current.contains(event.target) &&
        popoverRef.current && !popoverRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Calcular posición
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const popoverHeight = 280; // aprox height
        let top = rect.bottom + window.scrollY + 8;
        if (spaceBelow < popoverHeight && rect.top > popoverHeight) {
          top = rect.top + window.scrollY - popoverHeight - 8;
        }
        setCoords({ top, left: rect.left + window.scrollX });
      }
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectHour = (h) => {
    let m = current.m !== null ? current.m : 0;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    onChange(timeStr);
  };

  const handleSelectMinute = (m) => {
    let h = current.h !== null ? current.h : 0;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    onChange(timeStr);
  };

  // Generate arrays for hours and minutes
  const minH = parseInt(min.split(':')[0], 10);
  const maxH = parseInt(max.split(':')[0], 10);
  
  const hours = [];
  for (let i = 0; i <= 23; i++) {
    if (i >= minH && i <= maxH) hours.push(i);
  }

  const minutes = [];
  for (let i = 0; i < 60; i += step) {
    minutes.push(i);
  }

  const displayFormat = value || '';

  // Auto scroll to selected item on open
  const hoursRef = useRef(null);
  const minsRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (hoursRef.current && current.h !== null) {
          const el = hoursRef.current.querySelector(`[data-val="${current.h}"]`);
          if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        if (minsRef.current && current.m !== null) {
          const el = minsRef.current.querySelector(`[data-val="${current.m}"]`);
          if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }, 50);
    }
  }, [isOpen]); // Intentionally not including current to only trigger on open

  const popoverContent = (
    <div 
      ref={popoverRef}
      style={{ top: coords.top, left: coords.left }}
      className="absolute p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl shadow-black/50 z-[99999] w-[220px] animate-fade-in-quick"
    >
      <div className="flex gap-2 h-[200px]">
        {/* Columna Horas */}
        <div className="flex-1 flex flex-col">
          <div className="text-[10px] font-black text-[var(--text-secondary)] text-center uppercase tracking-widest mb-2 opacity-50">Hora</div>
          <div ref={hoursRef} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1">
            {hours.map(h => {
              const isSelected = current.h === h;
              return (
                <button
                  key={h}
                  data-val={h}
                  type="button"
                  onClick={() => handleSelectHour(h)}
                  className={`py-2 px-1 text-sm font-bold rounded-lg transition-all
                    ${isSelected ? 'bg-[var(--accent-primary)] text-white shadow-md shadow-[var(--accent-primary)]/30' : 'text-[var(--text-primary)] hover:bg-[var(--accent-light)] hover:text-[var(--accent-primary)]'}
                  `}
                >
                  {String(h).padStart(2, '0')}
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-px bg-[var(--border-color)]/30 my-4"></div>

        {/* Columna Minutos */}
        <div className="flex-1 flex flex-col">
          <div className="text-[10px] font-black text-[var(--text-secondary)] text-center uppercase tracking-widest mb-2 opacity-50">Min</div>
          <div ref={minsRef} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 pl-1">
            {minutes.map(m => {
              const isSelected = current.m === m;
              return (
                <button
                  key={m}
                  data-val={m}
                  type="button"
                  onClick={() => handleSelectMinute(m)}
                  className={`py-2 px-1 text-sm font-bold rounded-lg transition-all
                    ${isSelected ? 'bg-[var(--accent-primary)] text-white shadow-md shadow-[var(--accent-primary)]/30' : 'text-[var(--text-primary)] hover:bg-[var(--accent-light)] hover:text-[var(--accent-primary)]'}
                  `}
                >
                  {String(m).padStart(2, '0')}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-color)]/30">
        <button
          type="button"
          onClick={() => { onChange(''); setIsOpen(false); }}
          className="text-[10px] font-black uppercase text-rose-400 hover:text-rose-300 transition-colors px-2 py-1"
        >
          Borrar
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-[10px] font-black uppercase text-[var(--accent-primary)] hover:brightness-110 transition-colors px-2 py-1"
        >
          Cerrar
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Input de Gatillo */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between cursor-pointer ${className} ${!value ? 'text-[var(--text-secondary)] opacity-50' : 'text-[var(--text-primary)]'}`}
      >
        <span>{displayFormat || placeholder}</span>
        <Clock size={16} className="text-[var(--text-secondary)] opacity-50 ml-2 shrink-0" />
      </div>

      {/* Popover del Selector de Horas */}
      {isOpen && createPortal(popoverContent, document.body)}
    </div>
  );
}
