import ClientNavbar from "@/components/ClientNavbar";
import HeroSection from "@/components/HeroSection";
import BenefitsStrip from "@/components/landing/BenefitsStrip";
import TechShowcase from "@/components/landing/TechShowcase";
import HowItWorks from "@/components/landing/HowItWorks";
import StartNowCTA from "@/components/landing/StartNowCTA";
import SportCategoryFilter from "@/components/SportCategoryFilter";
import FeaturedAlbums from "@/components/FeaturedAlbums";
import PartnerCTA from "@/components/landing/PartnerCTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <ClientNavbar />
      <HeroSection />
      <BenefitsStrip />
      <TechShowcase />
      <HowItWorks />

      <div className="container mx-auto px-4 relative z-10">
        <SportCategoryFilter />
        <FeaturedAlbums />
      </div>

      <StartNowCTA />
      <PartnerCTA />
      <Footer />
    </div>
  );
};

export default Index;
