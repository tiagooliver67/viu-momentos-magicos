import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { usePhotographerSiteBySlug } from "@/hooks/usePhotographerSite";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Camera, Instagram, Phone, Mail, ExternalLink, Facebook, Youtube, Linkedin, Twitter, Music2, Images } from "lucide-react";
import { Link } from "react-router-dom";
import ClientNavbar from "@/components/ClientNavbar";
import Footer from "@/components/Footer";
import PhotographerLevelSection from "@/components/photographer/PhotographerLevelSection";
import PhotographerAiBio from "@/components/photographer/PhotographerAiBio";
import { getCoverUrl } from "@/lib/eventCover";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious, PaginationEllipsis,
} from "@/components/ui/pagination";

const EVENTS_PAGE_SIZE = 9;

const PhotographerPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: site, isLoading } = usePhotographerSiteBySlug(slug);
  const [page, setPage] = useState(1);

  // Apply SEO title, keywords and description from the photographer's site settings
  useEffect(() => {
    if (!site) return;
    const title = site.seo_title || `${site.display_name || "Fotógrafo"} | ViuFoto`;
    document.title = title;
    if (site.seo_keywords) {
      let tag = document.querySelector('meta[name="keywords"]') as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.name = "keywords";
        document.head.appendChild(tag);
      }
      tag.content = site.seo_keywords;
    }
    const desc = (site.ai_bio || site.bio || "").trim().slice(0, 160);
    if (desc) {
      let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = desc;
    }
  }, [site]);

  const { data: eventsResult } = useQuery({
    queryKey: ["photographer-events", site?.user_id, page],
    queryFn: async () => {
      if (!site?.user_id) return { rows: [], total: 0 };
      const from = (page - 1) * EVENTS_PAGE_SIZE;
      const to = from + EVENTS_PAGE_SIZE - 1;
      const { data, count } = await supabase
        .from("events")
        .select("*", { count: "exact" })
        .eq("organizer_id", site.user_id)
        .eq("visibility", true)
        .order("event_date", { ascending: false })
        .range(from, to);
      return { rows: data || [], total: count ?? 0 };
    },
    enabled: !!site?.user_id,
    placeholderData: keepPreviousData,
  });
  const events = eventsResult?.rows ?? [];
  const totalEvents = eventsResult?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalEvents / EVENTS_PAGE_SIZE));

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

  const { data: photoCount } = useQuery({
    queryKey: ["photographer-photo-count", site?.user_id],
    queryFn: async () => {
      if (!site?.user_id) return 0;
      // count of photos across all events organized by this user
      const { data: evs } = await supabase
        .from("events")
        .select("id")
        .eq("organizer_id", site.user_id);
      const ids = (evs || []).map((e: any) => e.id);
      if (ids.length === 0) return 0;
      const { count } = await supabase
        .from("event_photos")
        .select("*", { count: "exact", head: true })
        .in("event_id", ids);
      return count || 0;
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
      <div className="min-h-screen bg-background flex flex-col">
        <ClientNavbar />
        <div className="flex-1 flex items-center justify-center pt-20">
          <div className="text-center">
            <Camera className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-foreground">Fotógrafo não encontrado</h1>
            <p className="text-muted-foreground mb-4">O perfil que você procura não existe ou foi removido.</p>
            <Link to="/" className="text-primary hover:underline font-medium">Voltar ao início</Link>
          </div>
        </div>
      </div>
    );
  }

  const primaryColor = site.primary_color || "#673DE6";

  const socialLinks = [
    { url: site.instagram, icon: Instagram, label: "Instagram" },
    { url: site.facebook, icon: Facebook, label: "Facebook" },
    { url: site.youtube, icon: Youtube, label: "YouTube" },
    { url: site.tiktok, icon: Music2, label: "TikTok" },
    { url: site.linkedin, icon: Linkedin, label: "LinkedIn" },
    { url: site.twitter, icon: Twitter, label: "X (Twitter)" },
    { url: site.whatsapp ? `https://wa.me/${site.whatsapp.replace(/\D/g, "")}` : null, icon: Phone, label: "WhatsApp" },
    { url: site.contact_email ? `mailto:${site.contact_email}` : null, icon: Mail, label: "Email" },
  ].filter(s => s.url);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ClientNavbar />

      {/* Hero Header */}
      <header className="relative pt-16" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}>
        {site.banner_url && (
          <img src={site.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        )}
        <div className="relative container mx-auto px-4 py-12 sm:py-16">
          <div className="flex flex-col items-center text-center">
            {site.avatar_url ? (
              <img src={site.avatar_url} alt={site.display_name || ""} className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white/30 object-cover shadow-lg mb-4" />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/20 flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg">
                {(site.display_name || "?")[0]}
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{site.display_name || "Fotógrafo"}</h1>
            {site.bio && <p className="text-white/80 text-sm sm:text-base mt-1 max-w-lg">{site.bio}</p>}

            {/* Stats */}
            <div className="flex gap-6 mt-5 text-white/90 text-sm">
              <div className="text-center">
                <p className="text-xl font-bold">{totalEvents}</p>
                <p className="text-white/60 text-xs">Eventos</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{photoCount || 0}</p>
                <p className="text-white/60 text-xs">Fotos</p>
              </div>
            </div>

            {/* Social */}
            {socialLinks.length > 0 && (
              <div className="flex gap-2 mt-5">
                {socialLinks.map((s, i) => (
                  <a key={i} href={s.url!} target="_blank" rel="noopener" title={s.label} className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors">
                    <s.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* "Vitrine" indicator */}
        <div className="relative bg-background border-t border-border">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Camera className="w-4 h-4 text-primary" />
              <span>Você está vendo os <strong className="text-foreground">últimos trabalhos</strong> de <strong className="text-foreground">{site.display_name || "Fotógrafo"}</strong></span>
            </div>
            <Link
              to={`/fotografo/${slug}/portfolio`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Images className="w-4 h-4" /> Ver portfólio completo
            </Link>
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
              className="px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-secondary/50 transition-colors flex items-center gap-1.5 text-foreground"
            >
              <ExternalLink className="w-3.5 h-3.5" /> {link.label}
            </a>
          ))}
        </div>
      )}

      {/* Nível & Conquistas */}
      <PhotographerLevelSection userId={site.user_id} />

      {/* Events */}
      <div id="eventos" className="container mx-auto px-4 py-8 flex-1">
        <h2 className="text-xl font-bold mb-6 text-foreground">Eventos</h2>
        {(!events || events.length === 0) ? (
          <div className="text-center py-16">
            <Camera className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum evento publicado ainda.</p>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event: any) => (
              <Link
                key={event.id}
                to={`/evento/${event.id}`}
                className="group rounded-xl overflow-hidden border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all"
              >
                <div className="aspect-[16/10] overflow-hidden bg-secondary/30">
                  {event.cover_url ? (
                    <img src={getCoverUrl(event.cover_url, 600) ?? undefined} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-sm line-clamp-2 text-foreground">{event.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(event.event_date).toLocaleDateString("pt-BR")}</span>
                    {event.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.location}</span>}
                  </div>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    event.status === "ativo" ? "bg-green-500/15 text-green-600" : event.status === "em_breve" ? "bg-yellow-500/15 text-yellow-600" : "bg-secondary text-muted-foreground"
                  }`}>
                    {event.status === "ativo" ? "ATIVO" : event.status === "em_breve" ? "EM BREVE" : "INATIVO"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#eventos"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) {
                        setPage(page - 1);
                        document.getElementById("eventos")?.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className={page === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => (
                    <span key={p} className="contents">
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <PaginationItem><PaginationEllipsis /></PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationLink
                          href="#eventos"
                          isActive={p === page}
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(p);
                            document.getElementById("eventos")?.scrollIntoView({ behavior: "smooth" });
                          }}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    </span>
                  ))}
                <PaginationItem>
                  <PaginationNext
                    href="#eventos"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages) {
                        setPage(page + 1);
                        document.getElementById("eventos")?.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
          </>
        )}
      </div>

      {/* AI Bio */}
      <PhotographerAiBio userId={site.user_id} initialBio={(site as any).ai_bio} />

      <Footer />
    </div>
  );
};

export default PhotographerPage;
