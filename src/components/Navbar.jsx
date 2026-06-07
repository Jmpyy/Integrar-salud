import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User, Activity, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar({ config }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const businessName = config?.businessName || 'IntegrarSalud';

  // Separamos el nombre para el styling de "Salud" si existe en la palabra.
  // Si no es "IntegrarSalud", simplemente lo mostramos entero.
  const isDefaultName = businessName.toLowerCase().includes('integrar');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Servicios', isPage: false, target: 'servicios' },
    { name: 'Sobre el Profesional', isPage: true, target: '/profesional' },
    { name: 'Trámites y CUD', isPage: true, target: '/tramites' },
    { name: 'Información', isPage: true, target: '/info' },
    { name: 'Contacto', isPage: false, target: 'contacto' },
  ];

  const handleNavClick = (e, link) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);

    if (link.isPage) {
      navigate(link.target);
      window.scrollTo(0, 0);
    } else {
      if (location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          document.getElementById(link.target)?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        document.getElementById(link.target)?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/80 backdrop-blur-xl border-b border-slate-100 py-3 shadow-sm' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12">
          
          {/* LADO IZQUIERDO: Logo */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <img src={config?.logoUrl || "/pwa-192x192.png"} alt={`${businessName} Logo`} className="w-10 h-10 rounded-2xl shadow-sm object-contain" />
            <span className="text-2xl font-black text-slate-900 tracking-tighter">
              {businessName}
            </span>
          </motion.div>

          {/* CENTRO: Links (Ocultos en móvil) */}
          <div className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a 
                key={link.name}
                href={link.isPage ? link.target : `#${link.target}`} 
                onClick={(e) => handleNavClick(e, link)}
                className={`font-bold text-sm tracking-wide transition-colors relative group ${
                  location.pathname === link.target 
                    ? 'text-indigo-600' 
                    : 'text-slate-600 hover:text-indigo-600'
                }`}
              >
                {link.name}
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-indigo-600 transition-all ${
                  location.pathname === link.target ? 'w-full' : 'w-0 group-hover:w-full'
                }`}></span>
              </a>
            ))}
          </div>

          {/* LADO DERECHO: Acceso */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <Link 
              to="/virtual"
              className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold text-sm rounded-xl transition-colors"
            >
              <User size={18} /> Portal Paciente
            </Link>
            <Link 
              to="/login"
              className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-sm rounded-xl transition-colors shadow-lg shadow-indigo-200"
            >
              Acceso <ArrowRight size={18} />
            </Link>
            
            <button 
              className="md:hidden text-slate-900 p-2 hover:bg-slate-50 rounded-xl transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </motion.div>

        </div>
      </div>

      {/* MENÚ MÓVIL DESPLEGABLE */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-slate-50 shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-10 space-y-4">
              {navLinks.map((link) => (
                <a 
                  key={link.name}
                  href={link.isPage ? link.target : `#${link.target}`} 
                  onClick={(e) => handleNavClick(e, link)}
                  className={`block text-xl sm:text-2xl font-black transition-colors ${
                    location.pathname === link.target 
                      ? 'text-indigo-600' 
                      : 'text-slate-900 hover:text-indigo-600'
                  }`}
                >
                  {link.name}
                </a>
              ))}
              <div className="pt-6 border-t border-slate-100 flex flex-col gap-3">
                <Link 
                  to="/virtual"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-bold text-lg flex items-center justify-center gap-2"
                >
                  <User size={24} /> Portal Paciente
                </Link>
                <Link 
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-xl shadow-indigo-200"
                >
                  Acceso Profesionales <ArrowRight size={24} />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}