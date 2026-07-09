import { useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { BarChart3, Zap, Target, Users, Sparkles, FileText } from "lucide-react";
import MarketingDashboardTab from "@/components/marketing/MarketingDashboardTab";
import MarketingPixelsTab from "@/components/marketing/MarketingPixelsTab";
import MarketingComingSoon from "@/components/marketing/MarketingComingSoon";

type Tab = "dashboard" | "pixels" | "campanhas" | "publicos" | "ia" | "relatorios";

const TABS: { id: Tab; label: string; icon: any; badge?: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "pixels", label: "Pixels", icon: Zap },
  { id: "campanhas", label: "Campanhas", icon: Target, badge: "Em breve" },
  { id: "publicos", label: "Públicos", icon: Users, badge: "Em breve" },
  { id: "ia", label: "IA Estratégica", icon: Sparkles, badge: "Em breve" },
  { id: "relatorios", label: "Relatórios", icon: FileText, badge: "Em breve" },
];

const Marketing = () => {
  const [tab, setTab] = useState<Tab>("dashboard");

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-4 pt-20 lg:pt-6 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <header className="mb-6">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Marketing</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pixels, campanhas e inteligência de vendas para o seu negócio de fotografia.
            </p>
          </header>

          <div className="border-b border-border mb-6 overflow-x-auto">
            <nav className="flex gap-1 min-w-max">
              {TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      active
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <t.icon className="w-4 h-4" />
                    {t.label}
                    {t.badge && (
                      <span className="text-[10px] font-semibold uppercase bg-secondary text-muted-foreground rounded px-1.5 py-0.5">
                        {t.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {tab === "dashboard" && <MarketingDashboardTab />}
          {tab === "pixels" && <MarketingPixelsTab />}
          {tab === "campanhas" && (
            <MarketingComingSoon
              title="Campanhas de anúncios"
              description="Em breve: crie, pause e monitore campanhas do Meta Ads e Google Ads sem sair da ViuFoto."
            />
          )}
          {tab === "publicos" && (
            <MarketingComingSoon
              title="Públicos e remarketing"
              description="Em breve: descubra automaticamente quem encontrou fotos mas não comprou, e ative remarketing com um clique."
            />
          )}
          {tab === "ia" && (
            <MarketingComingSoon
              title="IA Estratégica"
              description="Em breve: insights sobre por que um evento vendeu menos, melhor preço e melhor momento para anunciar."
            />
          )}
          {tab === "relatorios" && (
            <MarketingComingSoon
              title="Relatórios avançados"
              description="Em breve: ROI, ROAS, ticket médio por evento e por modalidade em gráficos exportáveis."
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Marketing;