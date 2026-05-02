import ClientNavbar from "@/components/ClientNavbar";
import HeroSection from "@/components/HeroSection";
import FeatureCards from "@/components/landing/FeatureCards";
import SportCategoryFilter from "@/components/SportCategoryFilter";
import FeaturedAlbums from "@/components/FeaturedAlbums";
import PartnerCTA from "@/components/landing/PartnerCTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <ClientNavbar />
      <HeroSection />
      <FeatureCards />

      <div className="container mx-auto px-4 relative z-10">
        <SportCategoryFilter />
        <FeaturedAlbums />
      </div>

      <PartnerCTA />
      <Footer />
    </div>
  );
};

export default Index;
