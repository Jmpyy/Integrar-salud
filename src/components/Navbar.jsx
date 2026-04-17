import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, User } from 'lucide-react'; // Usamos estos iconos para que se vea Pro

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* LADO IZQUIERDO: Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">I</span>
            </div>
            <span className="text-xl font-bold text-gray-800 tracking-tight">
              Integrar<span className="text-indigo-600">Salud</span>
            </span>
          </div>

          {/* CENTRO: Links de navegación (Ocultos en móvil) */}
          <div className="hidden md:flex space-x-8">
            <a href="#servicios" className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">
              Servicios
            </a>
            <a href="#contacto" className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">
              Contacto
            </a>
          </div>

          {/* LADO DERECHO: Botón de Acceso y Toggle Móvil */}
          <div className="flex items-center gap-4">
            <Link 
              to="/login" 
              className="hidden sm:flex items-center gap-2 bg-gray-50 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 px-4 py-2 rounded-lg font-medium transition-all duration-200 border border-gray-200 hover:border-indigo-200"
            >
              <User size={18} />
              <span>Acceso Staff</span>
            </Link>
            
            {/* Botón menú móvil */}
            <button 
              className="md:hidden text-gray-600 p-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

        </div>
      </div>

      {/* MENÚ MÓVIL DESPLEGABLE */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 animate-fade-in-up">
          <div className="px-4 pt-2 pb-6 space-y-2 shadow-lg">
            <a 
              href="#servicios" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-4 py-3 text-gray-700 font-medium hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors"
            >
              Servicios
            </a>
            <a 
              href="#contacto" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-4 py-3 text-gray-700 font-medium hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors"
            >
              Contacto
            </a>
            
            <div className="pt-4 mt-2 border-t border-gray-100">
              <Link 
                to="/login" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl font-semibold transition-all shadow-md"
              >
                <User size={18} />
                <span>Acceso Staff</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}