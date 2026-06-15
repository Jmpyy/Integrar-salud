import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import CustomDatePicker from './CustomDatePicker';

export default function CustomDateRangePicker({ dateFrom, dateTo, onChange, placeholder = "Rango de fechas", className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const displayFormat = dateFrom && dateTo 
    ? `${dateFrom.split('-').reverse().join('/')} - ${dateTo.split('-').reverse().join('/')}`
    : '';

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Input de Gatillo */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between cursor-pointer ${className} ${!dateFrom || !dateTo ? 'text-[var(--text-secondary)] opacity-50' : 'text-[var(--text-primary)]'}`}
      >
        <span>{displayFormat || placeholder}</span>
        <CalendarIcon size={16} className="text-[var(--text-secondary)] opacity-50 ml-2 shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-0 mt-2 p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl shadow-black/50 z-[100] w-[calc(100vw-32px)] max-w-[320px] sm:w-auto sm:min-w-[320px] animate-fade-in-quick origin-top sm:origin-top-right">
            <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold">Rango Personalizado</span>
                <button onClick={() => setIsOpen(false)} className="text-[var(--text-secondary)] hover:text-rose-500"><X size={16}/></button>
            </div>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1 uppercase">Desde</label>
                    <CustomDatePicker 
                        value={dateFrom} 
                        onChange={(val) => onChange({ dateFrom: val, dateTo })}
                        className="bg-[var(--bg-main)] px-3 py-2 rounded-xl text-sm border border-[var(--border-color)]"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1 uppercase">Hasta</label>
                    <CustomDatePicker 
                        value={dateTo} 
                        onChange={(val) => onChange({ dateFrom, dateTo: val })}
                        className="bg-[var(--bg-main)] px-3 py-2 rounded-xl text-sm border border-[var(--border-color)]"
                    />
                </div>
            </div>

            <div className="mt-6 flex justify-end">
                <button 
                    onClick={() => setIsOpen(false)}
                    className="bg-[var(--accent-primary)] text-white px-4 py-2 rounded-xl text-xs font-bold w-full"
                >
                    Aplicar Rango
                </button>
            </div>
        </div>
      )}
    </div>
  );
}
