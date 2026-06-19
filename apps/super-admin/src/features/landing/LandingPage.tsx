import LandingHeader from './components/LandingHeader';
import LandingHero from './components/LandingHero';
import LandingWhyChooseUs from './components/LandingWhyChooseUs';
import LandingAbout from './components/LandingAbout';
import LandingModules from './components/LandingModules';
import LandingCta from './components/LandingCta';
import LandingFooter from './components/LandingFooter';
import LandingJsonLd from './components/LandingJsonLd';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingJsonLd />
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingWhyChooseUs />
        <LandingAbout />
        <LandingModules />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
