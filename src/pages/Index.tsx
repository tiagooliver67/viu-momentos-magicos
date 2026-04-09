import ClientNavbar from "@/components/ClientNavbar";
import HeroSection from "@/components/HeroSection";
import SportCategoryFilter from "@/components/SportCategoryFilter";
import FeaturedAlbums from "@/components/FeaturedAlbums";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <ClientNavbar />
      <HeroSection />

      <div className="container mx-auto px-4 mt-12 relative z-10">
        {/* Filtro por modalidade */}
        <SportCategoryFilter />

        {/* Álbuns em Destaque */}
        <FeaturedAlbums />
      </div>

      <Footer />
    </div>
  );
};

export default Index;
