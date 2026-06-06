import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Calendar, Eye, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Post = {
  id: string;
  title: string;
  slug: string;
  meta_description: string | null;
  featured_image: string | null;
  published_at: string | null;
  views_count: number;
};

const Blog = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("blog_posts")
        .select("id,title,slug,meta_description,featured_image,published_at,views_count")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      setPosts((data as Post[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Helmet>
        <title>Blog Viu Foto — Dicas e novidades para fotógrafos</title>
        <meta name="description" content="Conteúdo exclusivo para fotógrafos: como vender fotos online, marketing, equipamentos e cases reais de sucesso na Viu Foto." />
        <link rel="canonical" href="/blog" />
      </Helmet>
      <Navbar />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-primary/10 to-transparent border-b border-border">
          <div className="container mx-auto px-4 py-14 md:py-20 max-w-4xl text-center">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold tracking-wide mb-4">BLOG</span>
            <h1 className="text-4xl md:text-6xl font-black mb-4">Conteúdo que faz seu negócio crescer</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Dicas, estratégias e novidades para fotógrafos que querem vender mais online.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 py-10 max-w-6xl">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="aspect-[16/10] bg-muted animate-pulse" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-muted rounded animate-pulse w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">Nenhum artigo publicado ainda.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((p) => (
                <Link
                  key={p.id}
                  to={`/blog/${p.slug}`}
                  className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all flex flex-col"
                >
                  <div className="aspect-[16/10] bg-gradient-to-br from-primary/20 to-primary/5 relative overflow-hidden">
                    {p.featured_image ? (
                      <img src={p.featured_image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary/30 font-black text-5xl">VIU</div>
                    )}
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                      <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {p.published_at ? new Date(p.published_at).toLocaleDateString("pt-BR") : ""}</span>
                      <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" /> {p.views_count}</span>
                    </div>
                    <h2 className="font-bold text-lg leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">{p.title}</h2>
                    {p.meta_description && <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{p.meta_description}</p>}
                    <div className="mt-auto inline-flex items-center gap-1.5 text-sm text-primary font-semibold">
                      Ler artigo <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;