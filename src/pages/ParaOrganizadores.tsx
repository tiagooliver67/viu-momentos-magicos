import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ClipboardList,
  QrCode,
  BarChart3,
  Tags,
  Ticket,
  FileSpreadsheet,
  Receipt,
  Camera,
  Link2,
  Trophy,
  Smartphone,
  Share2,
  Settings2,
} from "lucide-react";
import ClientNavbar from "@/components/ClientNavbar";
import Footer from "@/components/Footer";

const pillars = [
  {
    icon: ClipboardList,
    title: "Inscrições online com Pix",
    description:
      "Página pública pronta com formulário, categorias, lotes e pagamento via Pix. O participante se inscreve em menos de 2 minutos.",
  },
  {
    icon: QrCode,
    title: "Check-in mobile instantâneo",
    description:
      "Busque o participante pelo nome, CPF ou número e marque presença com um toque. Otimizado para o celular no dia do evento.",
  },
  {
    icon: BarChart3,
    title: "Dashboard em tempo real",
    description:
      "Acompanhe inscritos, pagos, pendentes, vagas restantes e check-ins realizados em uma visão única e clara.",
  },
];

const features = [
  { icon: Tags, title: "Categorias e lotes", desc: "Configure provas, distâncias e faixas de preço por período." },
  { icon: Ticket, title: "Cupons e limite de vagas", desc: "Crie cupons promocionais e defina capacidade máxima." },
  { icon: FileSpreadsheet, title: "Exportação CSV, Excel e PDF", desc: "Baixe a lista de inscritos no formato que precisar." },
  { icon: Receipt, title: "Comprovante de pagamento", desc: "Receba comprovantes Pix anexados pelo participante." },
  { icon: Camera, title: "Cobertura fotográfica oficial", desc: "Conecte fotógrafos parceiros e entregue fotos aos atletas." },
  { icon: Link2, title: "URL pública personalizada", desc: "Compartilhe um link curto e direto da sua prova." },
];

const steps = [
  { icon: Settings2, title: "Crie o evento", desc: "Defina nome, data, categorias, lotes e a chave Pix." },
  { icon: Share2, title: "Compartilhe o link", desc: "Divulgue a página pública nas redes e no WhatsApp." },
  { icon: Smartphone, title: "Gerencie e dê check-in", desc: "Acompanhe pelo painel e dê check-in pelo celular no dia." },
];

const faqs = [
  {
    q: "Quanto custa para usar?",
    a: "Criar e divulgar o evento é gratuito. As taxas são aplicadas apenas sobre as inscrições pagas processadas pela plataforma.",
  },
  {
    q: "Como funciona o recebimento via Pix?",
    a: "Você cadastra sua chave Pix e o participante recebe as instruções automaticamente após a inscrição. Os comprovantes ficam centralizados no painel.",
  },
  {
    q: "Consigo organizar a prova pelo celular?",
    a: "Sim. Todo o painel — incluindo check-in, busca de participantes e exportação — é mobile-first e funciona muito bem no smartphone.",
  },
  {
    q: "Preciso ter cobertura fotográfica para usar?",
    a: "Não. A gestão de inscrições é independente. Mas se quiser, você pode conectar a cobertura fotográfica oficial da ViuFoto à mesma prova.",
  },
];

export default function ParaOrganizadores() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ClientNavbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-28 pb-20 sm:pt-32 sm:pb-28 overflow-hidden">
          <div
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 0%, hsl(var(--primary) / 0.10) 0%, transparent 70%)",
            }}
          />
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-bold uppercase tracking-[0.18em] mb-6"
            >
              <Trophy className="w-4 h-4" />
              Para organizadores de eventos
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-black text-foreground tracking-tight leading-[1.05] mb-5"
            >
              Inscreva, organize e dê check-in
              <br className="hidden sm:block" />
              <span className="text-primary"> num só lugar.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-10"
            >
              A ViuFoto agora é também sua plataforma de gestão de eventos esportivos:
              página pública de inscrição, recebimento via Pix, check-in mobile e
              dashboard em tempo real.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <Link
                to="/cadastro/organizador"
                className="inline-flex items-center gap-2 px-7 py-3.5 min-h-[48px] rounded-xl bg-primary text-primary-foreground font-bold text-sm sm:text-base hover:bg-primary/90 transition-all hover:shadow-[0_8px_24px_-6px_hsl(var(--primary)/0.5)]"
              >
                Criar evento grátis
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center justify-center px-7 py-3.5 min-h-[48px] rounded-xl border border-border text-foreground font-semibold text-sm sm:text-base hover:bg-muted transition-colors"
              >
                Ver como funciona
              </a>
            </motion.div>
          </div>
        </section>

        {/* Pillars */}
        <section className="py-16 sm:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">
                Os 3 pilares
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
                Tudo o que você precisa pra rodar sua prova
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {pillars.map((p, i) => {
                const Icon = p.icon;
                return (
                  <motion.div
                    key={p.title}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
                    className="glass-card p-7 sm:p-8 transition-transform duration-300 hover:-translate-y-1"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
                      <Icon className="w-6 h-6 text-primary" strokeWidth={2.2} />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2.5 tracking-tight">{p.title}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{p.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section className="py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight mb-3">
                Recursos pensados pra simplificar
              </h2>
              <p className="text-base text-muted-foreground">
                Tudo o que você costumava juntar em planilhas, formulários e grupos de WhatsApp.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="p-6 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground mb-1.5">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="py-16 sm:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">
                Como funciona
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
                Do zero ao check-in em 3 passos
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {steps.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={s.title} className="relative p-7 rounded-2xl bg-card border border-border">
                    <div className="absolute -top-3 left-7 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      Passo {i + 1}
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mt-2 mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-1.5">{s.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Bridge: cobertura fotográfica */}
        <section className="py-16 sm:py-20">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="glass-card p-8 sm:p-12 grid grid-cols-1 md:grid-cols-[auto,1fr] gap-6 md:gap-10 items-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto md:mx-0">
                <Camera className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center md:text-left">
                <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2">
                  Mais que inscrições
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight mb-2">
                  Entregue fotos profissionais aos atletas
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Conecte sua prova ao ecossistema de fotógrafos parceiros da ViuFoto e
                  ofereça cobertura oficial com busca facial, pagamento integrado e
                  entrega automática — sem custo adicional para o organizador.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 sm:py-20 bg-muted/30">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
                Perguntas frequentes
              </h2>
            </div>
            <div className="space-y-3">
              {faqs.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-xl border border-border bg-card p-5 open:shadow-sm"
                >
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-semibold text-foreground">
                    {f.q}
                    <span className="text-primary transition-transform group-open:rotate-45 text-xl leading-none">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 sm:py-28">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4">
              Comece em 2 minutos
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground mb-8">
              Crie sua conta de organizador e publique seu primeiro evento hoje mesmo.
            </p>
            <Link
              to="/cadastro/organizador"
              className="inline-flex items-center gap-2 px-8 py-4 min-h-[52px] rounded-xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 transition-all hover:shadow-[0_8px_24px_-6px_hsl(var(--primary)/0.5)]"
            >
              Criar conta de organizador
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}