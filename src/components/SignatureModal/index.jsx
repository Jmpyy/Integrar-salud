import { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, Save, Trash2 } from 'lucide-react';

export default function SignatureModal({ isOpen, onClose, onSave, title = "Firma Digital del Paciente" }) {
  const sigCanvas = useRef(null);

  if (!isOpen) return null;

  const handleClear = () => {
    sigCanvas.current.clear();
  };

  const handleSave = () => {
    if (sigCanvas.current.isEmpty()) {
      alert("Por favor, firme antes de guardar.");
      return;
    }
    // Get the base64 URL of the signature image (PNG by default)
    const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
    onSave(dataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--bg-main)] rounded-2xl w-full max-w-lg shadow-2xl border border-[var(--border-color)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] bg-[var(--bg-card)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-hover)] rounded-xl transition-colors text-[var(--text-secondary)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body - Canvas Area */}
        <div className="p-6 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-900/50">
          <p className="text-sm text-[var(--text-secondary)] mb-4 text-center">
            Utilice el dedo o el mouse para firmar en el recuadro blanco inferior.
          </p>
          <div className="w-full bg-white border-2 border-dashed border-gray-300 rounded-xl overflow-hidden shadow-inner touch-none">
            <SignatureCanvas 
              ref={sigCanvas}
              penColor="black"
              canvasProps={{
                className: "w-full h-48 cursor-crosshair",
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-card)]">
          <button 
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 text-rose-500 hover:bg-rose-500/10 rounded-xl font-bold text-sm transition-colors"
          >
            <Trash2 size={16} />
            Borrar
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded-xl font-bold text-sm transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 bg-[var(--accent-primary)] hover:brightness-110 text-white rounded-xl font-bold text-sm transition-all shadow-md"
            >
              <Save size={16} />
              Confirmar Firma
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
