import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar';
import Footer from '../../pages/Landing/components/Footer';
import FloatingWhatsApp from '../FloatingWhatsApp';

export default function PublicLayout() {
  const [publicConfig, setPublicConfig] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/settings/public`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setPublicConfig(data);
        }
      })
      .catch(console.error);
  }, []);

  // --- Branding Dinámico ---
  useEffect(() => {
    if (publicConfig?.primaryColor) {
      document.documentElement.style.setProperty('--color-rose-500', publicConfig.primaryColor);
      document.documentElement.style.setProperty('--color-rose-600', publicConfig.primaryColor);
      document.documentElement.style.setProperty('--accent-primary', publicConfig.primaryColor);
    }
  }, [publicConfig?.primaryColor]);

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-indigo-100 selection:text-indigo-900 flex flex-col">
      <Navbar config={publicConfig} />
      <main className="flex-1">
        <Outlet context={{ config: publicConfig }} />
      </main>
      <Footer config={publicConfig} />
      <FloatingWhatsApp phone={publicConfig?.phone} />
    </div>
  );
}
