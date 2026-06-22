import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BlogLayout from "@/components/blog/BlogLayout";

type Post = {
  id: string;
  title: string;
  slug: string;
  meta_description: string | null;
  featured_image: string | null;
  published_at: string | null;
  views_count: number;
  category?: string | null;
  read_minutes?: number | null;
};

const Blog = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("Todos");
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.title = "Blog Viu Foto — Dicas e novidades para fotógrafos";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Conteúdo exclusivo para fotógrafos: como vender fotos online, marketing, equipamentos e cases reais de sucesso na Viu Foto.");
    (async () => {
      const { data } = await (supabase as any)
        .from("blog_posts")
        .select("id,title,slug,meta_description,featured_image,published_at,views_count,category,read_minutes")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      setPosts((data as Post[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      const matchCat = category === "Todos" || (p.category ?? "Geral") === category;
      const q = query.trim().toLowerCase();
      const matchQ = !q || p.title.toLowerCase().includes(q) || (p.meta_description ?? "").toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [posts, category, query]);

  const [featured, ...rest] = filtered;

  return (
    <BlogLayout
      activeCategory={category}
      onCategoryChange={setCategory}
      searchQuery={query}
      onSearchChange={setQuery}
    >
      <section className="container mx-auto px-4 max-w-6xl py-10 md:py-14">
        <header className="mb-10 max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-neutral-900 mb-3">
            Conteúdo que faz seu negócio crescer
          </h1>
          <p className="text-neutral-600 text-base md:text-lg">
            Dicas, estratégias e cases reais para fotógrafos que querem vender mais online.
          </p>
        </header>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
                  <div className="aspect-[16/10] bg-neutral-100 animate-pulse" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-neutral-100 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-neutral-100 rounded animate-pulse w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-neutral-500">Nenhum artigo encontrado.</div>
          ) : (
            <>
              {featured && (
                <Link
                  to={`/blog/${featured.slug}`}
                  className="group block mb-12 rounded-3xl overflow-hidden border border-neutral-200 hover:border-neutral-300 transition-colors"
                >
                  <div className="grid md:grid-cols-2 gap-0">
                    <div className="aspect-[16/10] md:aspect-auto bg-neutral-100 overflow-hidden">
                      {featured.featured_image ? (
                        <img src={featured.featured_image} alt={featured.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-300 font-black text-6xl">VIU</div>
                      )}
                    </div>
                    <div className="p-6 md:p-10 flex flex-col justify-center">
                      <span className="inline-flex w-fit px-2.5 py-1 rounded-full bg-[#673DE6]/10 text-[#673DE6] text-xs font-semibold tracking-wide uppercase mb-4">
                        {featured.category ?? "Geral"}
                      </span>
                      <h2 className="text-2xl md:text-4xl font-black tracking-tight text-neutral-900 mb-3 group-hover:text-[#673DE6] transition-colors">
                        {featured.title}
                      </h2>
                      {featured.meta_description && (
                        <p className="text-neutral-600 mb-5 line-clamp-3">{featured.meta_description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-neutral-500">
                        <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {featured.published_at ? new Date(featured.published_at).toLocaleDateString("pt-BR") : ""}</span>
                        <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {featured.read_minutes ?? 5} min de leitura</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {rest.map((p) => (
                  <Link
                    key={p.id}
                    to={`/blog/${p.slug}`}
                    className="group flex flex-col"
                  >
                    <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-neutral-100 mb-4">
                      {p.featured_image ? (
                        <img src={p.featured_image} alt={p.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-300 font-black text-4xl">VIU</div>
                      )}
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#673DE6] mb-2">
                      {p.category ?? "Geral"}
                    </span>
                    <h2 className="font-bold text-lg leading-snug mb-2 text-neutral-900 group-hover:text-[#673DE6] transition-colors line-clamp-2">
                      {p.title}
                    </h2>
                    {p.meta_description && <p className="text-sm text-neutral-600 line-clamp-2 mb-3">{p.meta_description}</p>}
                    <div className="mt-auto flex items-center gap-4 text-xs text-neutral-500">
                      <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {p.published_at ? new Date(p.published_at).toLocaleDateString("pt-BR") : ""}</span>
                      <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {p.read_minutes ?? 5} min</span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
      </section>
    </BlogLayout>
  );
};

export default Blog;