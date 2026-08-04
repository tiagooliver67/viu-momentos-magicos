import { useAuth } from "@/contexts/AuthContext";
import { usePhotographerLevel } from "@/hooks/usePhotographerLevel";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Copy, Loader2, Star, Users, DollarSign, Clock, CheckCircle2, Trophy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { shareBaseUrl } from "@/lib/shareUrl";
import { formatBRL } from "@/lib/levels";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Embaixador() {
  const { user } = useAuth();
  const { level, isLoading } = usePhotographerLevel();

  // No backend, photographer_levels.is_ambassador define o estado
  const isAmbassador = level?.is_ambassador;

  const { data: stats } = useQuery({
    queryKey: ["ambassador-stats", user?.id],
    enabled: !!user?.id && isAmbassador,
    queryFn: async () => {
      // Aqui buscaríamos da tabela de indicações/comissões (referrals e referral_earnings)
      // Por enquanto mockando baseado na estrutura solicitada
      const { data: referrals } = await supabase.from("referrals" as any).select("id").eq("referrer_id", user!.id);
      return {
        referralCount: referrals?.length || 0,
        totalRevenue: 0,
        availablePayout: 0,
      };
    }
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  const referralUrl = level?.referrals_count !== undefined ? `${shareBaseUrl()}/r/${user?.id?.slice(0, 8)}` : ""; // Simplificando para o exemplo

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-4 pt-20 lg:pt-6 lg:p-8 overflow-auto max-w-5xl mx-auto w-full">
        {!isAmbassador ? (
          <div className="space-y-8 text-center py-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
              <Star className="w-10 h-10 text-primary fill-primary" />
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl font-bold tracking-tight">⭐ Programa Embaixador</h1>
              <div className="max-w-2xl mx-auto space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  O Programa Embaixador reúne fotógrafos que representam os valores da ViuFoto e contribuem para o crescimento da comunidade.
                </p>
                <p>
                  Os participantes são convidados diretamente pela equipe da ViuFoto.
                </p>
                <div className="bg-card border border-border p-6 rounded-2xl mt-8">
                  <p className="font-medium text-foreground">Atualmente você ainda não faz parte deste programa.</p>
                  <p className="text-sm">Continue evoluindo dentro da plataforma.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Star className="w-6 h-6 text-primary fill-primary" />
                <h1 className="text-2xl font-bold">Programa Embaixador</h1>
              </div>
              <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-sm">Parabéns!</p>
                  <p className="text-sm">Você faz parte do Programa Oficial de Embaixadores da ViuFoto.</p>
                </div>
              </div>
              <p className="text-muted-foreground text-sm mt-2">
                Seu papel é ajudar novos fotógrafos a conhecerem a plataforma e crescer junto com a comunidade.
              </p>
            </div>

            {/* Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3 rounded-2xl border border-primary/30 bg-primary/5 p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" /> Meu link de indicação
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Compartilhe este link e ganhe 1% da receita líquida da ViuFoto gerada pelas suas indicações nos primeiros 12 meses.
                  </p>
                </div>
                <div className="flex gap-2">
                  <input 
                    readOnly 
                    value={referralUrl} 
                    className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none" 
                  />
                  <button 
                    onClick={() => { navigator.clipboard.writeText(referralUrl); toast.success("Link copiado!"); }}
                    className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    Copiar Link
                  </button>
                </div>
              </div>

              <KpiCard icon={Users} label="Fotógrafos indicados" value={stats?.referralCount ?? 0} description="Quantidade de fotógrafos ativos" />
              <KpiCard icon={DollarSign} label="Receita gerada" value={formatBRL(stats?.totalRevenue ?? 0)} description="Valor total acumulado" />
              <KpiCard icon={Clock} label="Próximo pagamento" value={formatBRL(stats?.availablePayout ?? 0)} description="Valor disponível para saque" />
            </div>

            {/* Benefícios Futuros */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" /> Benefícios Futuros
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {["Acesso antecipado a novas funções", "Badges exclusivas no perfil", "Eventos presenciais VIP", "Comunidade privada de embaixadores"].map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 opacity-60">
                    <div className="w-2 h-2 rounded-full bg-primary/40" />
                    <span className="text-sm font-medium">{benefit}</span>
                    <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Em breve</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, description }: any) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-1">
      <div className="flex items-center justify-between">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <p className="text-2xl font-bold tracking-tight mt-2">{value}</p>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-[11px] text-muted-foreground">{description}</p>
    </div>
  );
}
