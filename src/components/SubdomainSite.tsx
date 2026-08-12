import { Route, Routes } from "react-router-dom";
import { usePhotographerSiteBySlug } from "@/hooks/usePhotographerSite";
import PhotographerPage from "@/pages/PhotographerPage";
import PhotographerPortfolioPage from "@/pages/PhotographerPortfolioPage";
import EventPage from "@/pages/EventPage";
import FotoPage from "@/pages/FotoPage";
import { ROOT_DOMAIN } from "@/lib/siteSlug";
import { Globe } from "lucide-react";

/**
 * Renderiza o site público de um fotógrafo quando o app é acessado
 * via subdomínio ({slug}.viufoto.com).
 */
export default function SubdomainSite({ slug }: { slug: string }) {
  const { data: site, isLoading } = usePhotographerSiteBySlug(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-secondary/60 flex items-center justify-center mx-auto mb-5">
            <Globe className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-foreground">Este endereço não existe</h1>
          <p className="text-muted-foreground mb-6">
            Não encontramos nenhum fotógrafo em <strong>{slug}.{ROOT_DOMAIN}</strong>.
            O endereço pode ter sido alterado ou removido.
          </p>
          <a
            href={`https://${ROOT_DOMAIN}`}
            className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-5 py-3 text-sm font-semibold hover:opacity-90 transition"
          >
            Ir para {ROOT_DOMAIN}
          </a>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/portfolio" element={<PhotographerPortfolioPage slug={slug} />} />
      <Route path="/evento/:id" element={<EventPage />} />
      <Route path="/foto/:photoId" element={<FotoPage />} />
      <Route path="/" element={<PhotographerPage slug={slug} />} />
      <Route path="*" element={<PhotographerPage slug={slug} />} />
    </Routes>
  );
}
