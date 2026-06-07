import { Mail, Phone, MapPin, Instagram, Facebook, Linkedin, Activity, Heart, Shield, Award, Users, Github } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Footer({ config }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentYear = new Date().getFullYear();

  const address = config?.address || 'Av. Principal 1234, CABA, Argentina';
  const phone = config?.phone || '+54 11 1234-5678';
  const email = config?.email || 'info@integrarsalud.com';
  const businessName = config?.businessName || 'IntegrarSalud';

  return (
    <footer id="contacto" className="bg-slate-950 text-white pt-24 pb-12 overflow-hidden relative">
      {/* Background Decor - Optimized */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
          
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-8">
              <img src={config?.logoUrl || "/pwa-192x192.png"} alt={businessName} className="w-12 h-12 rounded-2xl shadow-lg shadow-indigo-500/20 object-contain bg-white/5 p-1" />
              <span className="text-3xl font-black tracking-tighter">
                {businessName}
              </span>
            </div>
            <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-sm">
              Especialistas en salud mental con un enfoque humano y profesional. Tu bienestar es nuestra prioridad.
            </p>
            <div className="flex items-center gap-4">
              {config?.instagram && (
                <a href={config.instagram} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all border border-white/10">
                  <Instagram size={20} />
                </a>
              )}
              {config?.facebook && (
                <a href={config.facebook} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all border border-white/10">
                  <Facebook size={20} />
                </a>
              )}
              {config?.linkedin && (
                <a href={config.linkedin} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all border border-white/10">
                  <Linkedin size={20} />
                </a>
              )}
            </div>
          </div>

          {/* Links Column 1 */}
          <div>
            <h4 className="text-lg font-black mb-8 uppercase tracking-widest text-indigo-400">Servicios</h4>
            <ul className="space-y-4">
              {[
                { name: 'Evaluación Integral', isPage: true, target: '/servicios/evaluacion' },
                { name: 'Psiquiatría Infanto-Juvenil', isPage: true, target: '/servicios/infanto-juvenil' },
                { name: 'Psiquiatría Adultos', isPage: true, target: '/servicios/adultos' },
                { name: 'Tratamiento Farmacológico', isPage: true, target: '/servicios/farmacologia' },
                { name: 'Trámites y CUD', isPage: true, target: '/tramites' }
              ].map(item => (
                <li key={item.name}>
                  <a 
                    href={item.isPage ? item.target : `#${item.target}`} 
                    onClick={(e) => {
                      e.preventDefault();
                      if (item.isPage) {
                        navigate(item.target);
                        window.scrollTo(0, 0);
                      } else {
                        if (location.pathname !== '/') {
                          navigate('/');
                          setTimeout(() => {
                            document.getElementById(item.target)?.scrollIntoView({ behavior: 'smooth' });
                          }, 100);
                        } else {
                          document.getElementById(item.target)?.scrollIntoView({ behavior: 'smooth' });
                        }
                      }
                    }}
                    className="text-slate-400 hover:text-white font-bold transition-colors cursor-pointer"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Info Column */}
          <div>
            <h4 className="text-lg font-black mb-8 uppercase tracking-widest text-indigo-400">Atención</h4>
            <ul className="space-y-6 text-slate-400">
              <li>
                <span className="block font-black text-white mb-1">Psiquiatría (Presencial/Virtual)</span>
                Miércoles y Sábados<br/>09:00 hs a 16:00 hs
              </li>
              <li>
                <span className="block font-black text-white mb-1">Psicología (Virtual)</span>
                Lunes y Martes<br/>16:00 hs a 20:00 hs
              </li>
              <li>
                <span className="block font-black text-white mb-1">Modalidades</span>
                Presencial, Virtual (plataforma propia) y Visitas a Domicilio
              </li>
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h4 className="text-lg font-black mb-8 uppercase tracking-widest text-indigo-400">Contacto</h4>
            <ul className="space-y-6">
              <li className="flex items-start gap-4 text-slate-400">
                <MapPin className="text-indigo-400 shrink-0" size={20} />
                <span className="font-bold">{address}</span>
              </li>
              <li className="flex items-center gap-4 text-slate-400">
                <Phone className="text-indigo-400 shrink-0" size={20} />
                <span className="font-bold">{phone}</span>
              </li>
              <li className="flex items-center gap-4 text-slate-400">
                <Mail className="text-indigo-400 shrink-0" size={20} />
                <span className="font-bold">{email}</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Badges Section */}
        <div className="py-12 border-t border-white/5 flex flex-wrap items-center justify-center gap-12 opacity-40 hover:opacity-80 transition-opacity">
           <div className="flex items-center gap-2 font-black uppercase tracking-[0.2em] text-xs"><Shield size={16}/> Datos Protegidos</div>
           <div className="flex items-center gap-2 font-black uppercase tracking-[0.2em] text-xs"><Award size={16}/> Certificación Médica</div>
           <div className="flex items-center gap-2 font-black uppercase tracking-[0.2em] text-xs"><Heart size={16}/> Cuidado Empático</div>
           <div className="flex items-center gap-2 font-black uppercase tracking-[0.2em] text-xs"><Users size={16}/> Atención Integral</div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-slate-500 text-sm font-bold">
          <p>© {currentYear} {businessName}. Todos los derechos reservados.</p>
          
          <div className="flex flex-col md:flex-row items-center gap-3 text-xs bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
            <span>Desarrollado con ❤️ por <span className="text-white tracking-wide">BuildStack Studio</span></span>
            <div className="flex items-center gap-3 md:border-l md:border-white/10 md:pl-3">
              <a href="https://instagram.com/buildstack.studio" target="_blank" rel="noopener noreferrer" className="hover:text-pink-400 transition-colors" title="Instagram"><Instagram size={14} /></a>
              <a href="https://www.linkedin.com/in/uanpablofigueroa/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors" title="LinkedIn"><Linkedin size={14} /></a>
              <a href="https://github.com/Jmpyy" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" title="GitHub"><Github size={14} /></a>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <a 
              href="/privacidad" 
              onClick={(e) => { e.preventDefault(); navigate('/privacidad'); window.scrollTo(0, 0); }} 
              className="hover:text-white transition-colors cursor-pointer"
            >
              Política de Privacidad
            </a>
            <a 
              href="/terminos" 
              onClick={(e) => { e.preventDefault(); navigate('/terminos'); window.scrollTo(0, 0); }} 
              className="hover:text-white transition-colors cursor-pointer"
            >
              Términos de Servicio
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
