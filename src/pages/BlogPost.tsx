import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { renderMarkdown } from "@/lib/markdown";
import BlogLayout from "@/components/blog/BlogLayout";

type Post = {
  id: string;
  title: string;
  slug: string;
  content: string;
  meta_title: string | null;
  meta_description: string | null;
  featured_image: string | null;
  published_at: string | null;
  views_count: number;
  category?: string | null;
  read_minutes?: number | null;
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error || !data) {
        setNotFound(true);
      } else {
        setPost(data as Post);
        document.title = (data.meta_title || data.title) + " — Viu Foto";
        const meta = document.querySelector('meta[name="description"]');
        if (meta && data.meta_description) meta.setAttribute("content", data.meta_description);
        // increment views (fire-and-forget)
        (supabase as any).rpc("increment_blog_views", { _slug: slug });
      }
      setLoading(false);
    })();
  }, [slug]);

  return (
    <BlogLayout showFilters={false}>
      <div className="container mx-auto px-4 py-10 max-w-3xl">
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar para o blog
          </Link>

          {loading ? (
            <div className="space-y-4">
              <div className="h-10 bg-neutral-100 rounded animate-pulse w-3/4" />
              <div className="aspect-[16/9] bg-neutral-100 rounded-2xl animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 bg-neutral-100 rounded animate-pulse" />
                <div className="h-4 bg-neutral-100 rounded animate-pulse w-5/6" />
              </div>
            </div>
          ) : notFound || !post ? (
            <div className="text-center py-20">
              <h1 className="text-2xl font-bold mb-2 text-neutral-900">Artigo não encontrado</h1>
              <p className="text-neutral-500 mb-6">O artigo que você procura não existe ou ainda não foi publicado.</p>
              <Link to="/blog" className="inline-flex px-5 py-2.5 rounded-full bg-neutral-900 text-white font-medium">Ver outros artigos</Link>
            </div>
          ) : (
            <article>
              {post.category && (
                <span className="inline-flex w-fit px-2.5 py-1 rounded-full bg-[#FF4D00]/10 text-[#FF4D00] text-xs font-semibold tracking-wide uppercase mb-4">
                  {post.category}
                </span>
              )}
              <h1 className="text-3xl md:text-5xl font-black leading-tight mb-4 text-neutral-900">{post.title}</h1>
              <div className="flex items-center gap-4 text-sm text-neutral-500 mb-8">
                <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {post.published_at ? new Date(post.published_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : ""}</span>
                <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4" /> {post.read_minutes ?? 5} min de leitura</span>
              </div>
              {post.featured_image && (
                <div className="rounded-2xl overflow-hidden border border-neutral-200 mb-10">
                  <img src={post.featured_image} alt={post.title} className="w-full h-auto" />
                </div>
              )}
              <div className="prose-content text-neutral-800 text-lg leading-relaxed">
                {renderMarkdown(post.content)}
              </div>

              <div className="mt-12 p-6 md:p-8 rounded-2xl bg-neutral-900 text-white text-center">
                <h3 className="font-bold text-xl md:text-2xl mb-2">Pronto para vender suas fotos online?</h3>
                <p className="text-sm text-neutral-300 mb-5">Crie sua conta de fotógrafo na Viu Foto e comece a faturar com seus eventos.</p>
                <Link to="/cadastro/fotografo" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FF4D00] text-white font-medium hover:opacity-90">
                  Cadastrar-se como fotógrafo
                </Link>
              </div>
            </article>
          )}
      </div>
    </BlogLayout>
  );
};

export default BlogPost;