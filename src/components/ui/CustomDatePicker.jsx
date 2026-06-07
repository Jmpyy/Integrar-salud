import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

const DAYS_OF_WEEK = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function CustomDatePicker({ value, onChange, min, max, isDateDisabled, placeholder = "Seleccionar fecha", className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const popoverRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  // Parse input value (YYYY-MM-DD)
  const parsedValue = value ? new Date(value + 'T12:00:00Z') : null;
  const [currentMonth, setCurrentMonth] = useState(parsedValue ? parsedValue.getMonth() : new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(parsedValue ? parsedValue.getFullYear() : new Date().getFullYear());

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
      // Actualizar coordenadas al abrir
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Evitar que se salga por abajo
        const spaceBelow = window.innerHeight - rect.bottom;
        const popoverHeight = 350; // altura aproximada del calendario
        let top = rect.bottom + window.scrollY + 8;
        if (spaceBelow < popoverHeight && rect.top > popoverHeight) {
          top = rect.top + window.scrollY - popoverHeight - 8;
        }
        setCoords({ top, left: rect.left + window.scrollX });
      }
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T12:00:00Z');
      setCurrentMonth(d.getMonth());
      setCurrentYear(d.getFullYear());
    }
  }, [value]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const handleSelectDate = (day) => {
    // Format YYYY-MM-DD
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const setToday = () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => {
    let day = new Date(year, month, 1).getDay();
    // Convert Sunday(0) to 6, Monday(1) to 0, etc.
    return day === 0 ? 6 : day - 1;
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const displayFormat = parsedValue 
    ? `${String(parsedValue.getDate()).padStart(2, '0')}/${String(parsedValue.getMonth() + 1).padStart(2, '0')}/${parsedValue.getFullYear()}`
    : '';

  const [viewMode, setViewMode] = useState('days'); // 'days', 'months', 'years'

  const popoverContent = (
    <div 
      ref={popoverRef}
      style={{ top: coords.top, left: coords.left }}
      className="absolute p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl shadow-black/50 z-[99999] w-[300px] animate-fade-in-quick overflow-hidden flex flex-col"
    >
      {viewMode === 'days' && (
        <>
          {/* Cabecera: Mes/Año y flechas */}
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={handlePrevMonth} className="p-2 hover:bg-[var(--accent-light)] rounded-lg transition-all text-[var(--text-secondary)] hover:text-[var(--accent-primary)]">
              <ChevronLeft size={18} />
            </button>
            <div className="text-sm font-black text-[var(--text-primary)] capitalize tracking-wide flex items-center justify-center gap-1">
              <button 
                type="button"
                onClick={() => setViewMode('months')}
                className="hover:text-[var(--accent-primary)] transition-colors px-1 py-0.5 rounded"
              >
                {MONTHS[currentMonth]}
              </button>
              <button 
                type="button"
                onClick={() => setViewMode('years')}
                className="font-medium text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors px-1 py-0.5 rounded"
              >
                {currentYear}
              </button>
            </div>
            <button type="button" onClick={handleNextMonth} className="p-2 hover:bg-[var(--accent-light)] rounded-lg transition-all text-[var(--text-secondary)] hover:text-[var(--accent-primary)]">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Días de la Semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="text-center text-[10px] font-black text-[var(--text-secondary)] opacity-50 uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Grilla de Días */}
          <div className="grid grid-cols-7 gap-1">
            {blanks.map(blank => (
              <div key={`blank-${blank}`} className="w-8 h-8"></div>
            ))}
            {days.map(day => {
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = value === dateStr;
              
              // Validate min/max if needed
              let disabled = false;
              if (min && dateStr < min) disabled = true;
              if (max && dateStr > max) disabled = true;
              if (typeof isDateDisabled === 'function' && isDateDisabled(dateStr)) disabled = true;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelectDate(day)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all mx-auto
                    ${disabled ? 'opacity-20 cursor-not-allowed' : 'hover:bg-[var(--accent-light)] hover:text-[var(--accent-primary)] cursor-pointer'}
                    ${isSelected ? 'bg-[var(--accent-primary)] text-white shadow-md shadow-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)] hover:text-white' : 'text-[var(--text-primary)]'}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-color)]/30">
            <button
              type="button"
              onClick={() => { onChange(''); setIsOpen(false); }}
              className="text-[10px] font-black uppercase text-rose-400 hover:text-rose-300 transition-colors px-2 py-1"
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={setToday}
              className="text-[10px] font-black uppercase text-[var(--accent-primary)] hover:brightness-110 transition-colors px-2 py-1"
            >
              Hoy
            </button>
          </div>
        </>
      )}

      {viewMode === 'months' && (
        <div className="flex flex-col h-[310px] animate-fade-in-quick">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <button type="button" onClick={() => setViewMode('days')} className="p-2 hover:bg-[var(--accent-light)] rounded-lg transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <ChevronLeft size={18} />
            </button>
            <div className="text-sm font-black text-[var(--text-primary)] capitalize tracking-wide">
              Seleccionar Mes
            </div>
            <div className="w-9"></div>
          </div>
          <div className="grid grid-cols-3 gap-2 flex-1 content-start">
            {MONTHS.map((m, i) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setCurrentMonth(i);
                  setViewMode('days');
                }}
                className={`py-4 rounded-xl text-xs font-bold transition-all ${currentMonth === i ? 'bg-[var(--accent-primary)] text-white shadow-md shadow-[var(--accent-primary)]/30' : 'hover:bg-[var(--accent-light)] text-[var(--text-primary)]'}`}
              >
                {m.substring(0,3)}
              </button>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'years' && (
        <div className="flex flex-col h-[310px] animate-fade-in-quick">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <button type="button" onClick={() => setViewMode('days')} className="p-2 hover:bg-[var(--accent-light)] rounded-lg transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <ChevronLeft size={18} />
            </button>
            <div className="text-sm font-black text-[var(--text-primary)] capitalize tracking-wide">
              Seleccionar Año
            </div>
            <div className="w-9"></div>
          </div>
          <div className="grid grid-cols-4 gap-2 overflow-y-auto custom-scrollbar pr-2 pb-2 content-start">
            {Array.from({ length: 150 }, (_, i) => new Date().getFullYear() + 10 - i).map(y => (
              <button
                key={y}
                type="button"
                onClick={() => {
                  setCurrentYear(y);
                  setViewMode('days');
                }}
                className={`py-3 rounded-xl text-xs font-bold transition-all ${currentYear === y ? 'bg-[var(--accent-primary)] text-white shadow-md shadow-[var(--accent-primary)]/30' : 'hover:bg-[var(--accent-light)] text-[var(--text-primary)]'}`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Input de Gatillo */}
      <div 
        onClick={() => { setIsOpen(!isOpen); setViewMode('days'); }}
        className={`flex items-center justify-between cursor-pointer ${className} ${!value ? 'text-[var(--text-secondary)] opacity-50' : 'text-[var(--text-primary)]'}`}
      >
        <span>{displayFormat || placeholder}</span>
        <CalendarIcon size={16} className="text-[var(--text-secondary)] opacity-50 ml-2 shrink-0" />
      </div>

      {/* Popover del Calendario renderizado en el body para evitar recortes de overflow */}
      {isOpen && createPortal(popoverContent, document.body)}
    </div>
  );
}
