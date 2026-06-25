import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { usePhotographerSiteBySlug } from "@/hooks/usePhotographerSite";
import { Camera, ArrowLeft, Image as ImageIcon } from "lucide-react";
import ClientNavbar from "@/components/ClientNavbar";
import Footer from "@/components/Footer";

const categories = ["Corrida", "Ciclismo", "Triathlon", "Trail Run"];

const PhotographerPortfolioPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: site, isLoading } = usePhotographerSiteBySlug(slug);
  const [cat, setCat] = useState("Corrida");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <ClientNavbar />
        <div className="flex-1 flex items-center justify-center pt-20">
          <div className="text-center">
            <Camera className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-foreground">Fotógrafo não encontrado</h1>
            <Link to="/" className="text-primary hover:underline font-medium">Voltar ao início</Link>
          </div>
        </div>
      </div>
    );
  }

  const primaryColor = site.primary_color || "#673DE6";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ClientNavbar />

      <header className="pt-20 pb-6" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}>
        <div className="container mx-auto px-4">
          <Link to={`/fotografo/${slug}`} className="inline-flex items-center gap-2 text-white/90 hover:text-white text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> Voltar para o perfil
          </Link>
          <div className="flex items-center gap-4">
            {site.avatar_url ? (
              <img src={site.avatar_url} alt="" className="w-16 h-16 rounded-full border-2 border-white/40 object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold">
                {(site.display_name || "?")[0]}
              </div>
            )}
            <div>
              <p className="text-white/70 text-xs uppercase tracking-wide">Portfólio</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{site.display_name || "Fotógrafo"}</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 flex-1">
        <div className="flex gap-2 flex-wrap mb-6">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                cat === c ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <ImageIcon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground mb-1">Portfólio em construção</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {site.display_name || "Este fotógrafo"} ainda não publicou fotos selecionadas na categoria <strong>{cat}</strong>.
            Em breve você poderá conferir os melhores trabalhos aqui.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PhotographerPortfolioPage;