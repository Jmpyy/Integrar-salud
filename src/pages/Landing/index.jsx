import Navbar from '../../components/Navbar';
import Hero from './components/Hero';
import Services from './components/Services';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Navbar />
      
      <main>
        {/* Aquí puedes ir colocando los componentes de tu Landing */}
        <Hero />
        <Services />
      </main>

    </div>
  );
}
