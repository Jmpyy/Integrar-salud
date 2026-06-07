import { useOutletContext } from 'react-router-dom';
import Hero from './components/Hero';
import QuickLinks from './components/QuickLinks';
import Services from './components/Services';
import Features from './components/Features';

export default function Landing() {
  const { config } = useOutletContext();

  return (
    <>
      <Hero config={config} />
      <QuickLinks />
      <Features config={config} />
      <Services config={config} />
    </>
  );
}
