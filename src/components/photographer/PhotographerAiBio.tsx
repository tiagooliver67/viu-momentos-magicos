import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  userId: string | undefined;
  /** Bio já salva no site (cache). Usada como fallback imediato. */
  initialBio?: string | null;
}

export default function PhotographerAiBio({ userId, initialBio }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["photographer-ai-bio", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-photographer-bio", {
        body: { user_id: userId },
      });
      if (error) throw error;
      return data as { bio: string };
    },
  });

  const bio = data?.bio ?? initialBio ?? null;
  if (isError && !bio) return null;

  return (
    <section className="container mx-auto px-4 pb-10">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-base font-bold text-foreground">Sobre o fotógrafo</h2>
          <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
            Gerado com IA
          </span>
        </div>
        {isLoading && !bio ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : bio ? (
          <p className="text-sm sm:text-[15px] text-foreground/90 leading-relaxed">{bio}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Bio em construção.</p>
        )}
      </div>
    </section>
  );
}