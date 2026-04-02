import { useParams } from "react-router-dom";
import { usePhotographerSiteBySlug } from "@/hooks/usePhotographerSite";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Camera, Instagram, Phone, Mail, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

const PhotographerPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: site, isLoading } = usePhotographerSiteBySlug(slug);

  const { data: events } = useQuery({
    queryKey: ["photographer-events", site?.user_id],
    queryFn: async () => {
      if (!site?.user_id) return [];
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("organizer_id", site.user_id)
        .eq("visibility", true)
        .order("event_date", { ascending: false });
      return data || [];
    },
    enabled: !!site?.user_id,
  });

  const { data: customLinks } = useQuery({
    queryKey: ["public-links", site?.user_id],
    queryFn: async () => {
      if (!site?.user_id) return [];
      const { data } = await supabase
        .from("custom_links")
        .select("*")
        .eq("user_id", site.user_id)
        .order("sort_order");
      return data || [];
    },
    enabled: !!site?.user_id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Fotógrafo não encontrado</h1>
          <Link to="/" className="text-primary hover:underline">Voltar ao início</Link>
        </div>
      </div>
    );
  }

  const primaryColor = site.primary_color || "#FF4D00";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header
        className="relative"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
      >
        {site.banner_url && (
          <img src={site.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        )}
        <div className="relative container mx-auto px-4 py-8 flex flex-col sm:flex-row items-center gap-4">
          {site.avatar_url ? (
            <img src={site.avatar_url} alt="" className="w-20 h-20 rounded-full border-4 border-white/30 object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
              {(site.display_name || "?")[0]}
            </div>
          )}
          <div className="text-center sm:text-left text-white">
            <h1 className="text-2xl font-bold">{site.display_name || "Fotógrafo"}</h1>
            {site.bio && <p className="text-white/80 text-sm mt-1 max-w-lg">{site.bio}</p>}
          </div>
          <div className="sm:ml-auto flex gap-2">
            {site.instagram && (
              <a href={site.instagram} target="_blank" rel="noopener" className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white">
                <Instagram className="w-5 h-5" />
              </a>
            )}
            {site.whatsapp && (
              <a href={`https://wa.me/${site.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white">
                <Phone className="w-5 h-5" />
              </a>
            )}
            {site.contact_email && (
              <a href={`mailto:${site.contact_email}`} className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white">
                <Mail className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Custom Links */}
      {customLinks && customLinks.length > 0 && (
        <div className="container mx-auto px-4 py-4 flex gap-2 flex-wrap justify-center">
          {customLinks.map((link: any) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener"
              className="px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-secondary/50 transition-colors flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> {link.label}
            </a>
          ))}
        </div>
      )}

      {/* Events */}
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-xl font-bold mb-6">Eventos</h2>
        {(!events || events.length === 0) ? (
          <p className="text-muted-foreground text-center py-12">Nenhum evento publicado ainda.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {events.map((event: any) => (
              <Link
                key={event.id}
                to={`/evento/${event.id}`}
                className="group rounded-xl overflow-hidden border border-border bg-card hover:border-primary/30 transition-all"
              >
                <div className="aspect-[16/10] overflow-hidden bg-secondary/30">
                  {event.cover_url ? (
                    <img src={event.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-sm line-clamp-2">{event.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(event.event_date).toLocaleDateString("pt-BR")}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.location}</span>
                  </div>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    event.status === "ativo" ? "bg-lime/20 text-lime" : event.status === "em_breve" ? "bg-accent/20 text-accent" : "bg-secondary text-muted-foreground"
                  }`}>
                    {event.status === "ativo" ? "ATIVO" : event.status === "em_breve" ? "EM BREVE" : "INATIVO"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default PhotographerPage;
