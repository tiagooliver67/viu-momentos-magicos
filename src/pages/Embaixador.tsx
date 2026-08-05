import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePhotographerLevel } from "@/hooks/usePhotographerLevel";
import DashboardSidebar from "@/components/DashboardSidebar";
import {
  Loader2, Star, Users, DollarSign, Clock, CheckCircle2, Trophy, Link2,
  Share2, TrendingUp, Wallet, CalendarDays, Heart, Calculator, Sparkles,
  Shield, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { shareBaseUrl } from "@/lib/shareUrl";
import { formatBRL } from "@/lib/levels";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import { useAmbassadorProgram, useAmbassadorReferralCode } from "@/hooks/useAmbassadorProgram";
import {
  AMBASSADOR_PCT, COMMISSION_MONTHS, PLATFORM_FEE_PCT, ambassadorShare, platformRevenue,
} from "@/lib/ambassador";
import { PageTitle, PageSubtitle, SectionTitle, CardTitle } from "@/components/ui/Typography";

const STEPS = [
  {
    n: "1",
    icon: Share2,
    title: "Convide fotógrafos",
    text: "Compartilhe seu link exclusivo de indicação. Todo fotógrafo que criar a conta por esse link fica vinculado ao seu perfil de Embaixador.",
  },
  {
    n: "2",
    icon: TrendingUp,
    title: "O fotógrafo começa a vender",
    text: "Sempre que esse fotógrafo realizar vendas na plataforma, a ViuFoto recebe normalmente a sua comissão.",
  },
  {
    n: "3",
    icon: DollarSign,
    title: "Você recebe sua participação",
    text: `Durante os primeiros ${COMMISSION_MONTHS} meses, você recebe ${AMBASSADOR_PCT}% da receita líquida da ViuFoto gerada por esse fotógrafo.`,
  },
  {
    n: "4",
    icon: Wallet,
    title: "Pagamento",
    text: "Seu saldo é atualizado automaticamente. Os pagamentos seguem o calendário financeiro da plataforma: período de apuração, prazo de segurança e valor mínimo para saque.",
  },
];

const RULES = [
  "O fotógrafo deve criar a conta utilizando o seu link exclusivo.",
  "O vínculo ocorre apenas no cadastro inicial.",
  `A comissão é válida por ${COMMISSION_MONTHS} meses a partir do cadastro do fotógrafo.`,
  "A comissão é calculada sobre a receita líquida da ViuFoto, não sobre o faturamento do fotógrafo.",
  "Não existe sistema multinível.",
  "Não existe comissão sobre indicações indiretas.",
  "O saldo é atualizado automaticamente conforme as vendas são confirmadas.",
  "Os pagamentos seguem o calendário financeiro da plataforma.",
  "Casos de fraude poderão ser revisados pela ViuFoto.",
  "Acesse a Política Oficial do Programa para ver as regras de validade de indicação e antifraude.",
];

const FUTURE_BENEFITS = [
  "Acesso antecipado a novas funcionalidades",
  "Badge exclusivo no perfil",
  "Comunidade privada de Embaixadores",
  "Eventos presenciais exclusivos",
  "Participação em testes Beta",
];

export default function Embaixador() {
  const { user } = useAuth();
  const { level, isLoading } = usePhotographerLevel();
  const isAmbassador = !!level?.is_ambassador;

  const { data: code } = useAmbassadorReferralCode();
  const { data, isLoading: loadingData } = useAmbassadorProgram(isAmbassador);

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

  const referralUrl = code ? `${shareBaseUrl()}/r/${code}` : "";
  const stats = data?.stats;

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-4 pt-24 lg:p-8 overflow-auto max-w-6xl mx-auto w-full">
        <div className="space-y-10 pb-16">
          <div className="mb-12">
            <PageTitle>Programa Embaixador</PageTitle>
            <PageSubtitle className="mt-3 max-w-2xl text-lg">
              Indique novos fotógrafos para a ViuFoto e receba 1% de toda a receita líquida gerada por eles. Para sempre.
            </PageSubtitle>
          </div>
          {/* Hero antigo removido ou adaptado conforme nova estrutura */}
          <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-10">
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-primary/10 blur-3xl" aria-hidden />
            <div className="relative space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-bold uppercase tracking-wider">
                <Star className="w-3.5 h-3.5 fill-current" /> Programa oficial
              </span>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Programa Embaixador ViuFoto</h1>
              <p className="text-muted-foreground max-w-2xl leading-relaxed">
                Um programa de reconhecimento para fotógrafos que ajudam a construir a comunidade ViuFoto.
                Indique novos fotógrafos e receba <strong className="text-foreground">{AMBASSADOR_PCT}% da receita líquida da ViuFoto</strong> gerada
                por eles durante os primeiros {COMMISSION_MONTHS} meses.
              </p>

              {isAmbassador ? (
                <div className="rounded-2xl border border-cta/30 bg-cta/10 p-4 flex items-start gap-3 max-w-2xl">
                  <CheckCircle2 className="w-5 h-5 text-cta flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-bold text-foreground">Parabéns! Você é um Embaixador oficial.</p>
                    <p className="text-muted-foreground">Seu papel é apresentar a ViuFoto a novos fotógrafos e crescer junto com a comunidade.</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-background/70 p-4 max-w-2xl">
                  <p className="font-medium text-foreground text-sm">Você ainda não faz parte do Programa Embaixador.</p>
                  <p className="text-sm text-muted-foreground">
                    Os participantes são convidados diretamente pela equipe da ViuFoto. Continue evoluindo na plataforma — abaixo você
                    encontra todas as regras e simulações do programa.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Link de indicação */}
          {isAmbassador && (
            <section className="rounded-2xl border border-primary/25 bg-primary/5 p-6 space-y-4">
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <Link2 className="w-4 h-4" /> Meu link de indicação
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Todo fotógrafo que criar a conta por este link fica vinculado ao seu perfil.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  readOnly
                  value={referralUrl}
                  className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none"
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(referralUrl); toast.success("Link copiado!"); }}
                  disabled={!referralUrl}
                  className="px-6 py-2.5 bg-cta text-cta-foreground font-bold rounded-xl hover:bg-cta-dark transition-colors disabled:opacity-50"
                >
                  Copiar link
                </button>
              </div>
            </section>
          )}

          {/* Dashboard */}
          {isAmbassador && (
            <section className="space-y-4">
              <SectionTitle icon={TrendingUp} title="Seu desempenho" subtitle="Indicadores atualizados automaticamente." />
              {loadingData ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-28 rounded-2xl border border-border bg-muted/30 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <KpiCard icon={Users} label="Fotógrafos indicados" value={String(stats?.totalReferrals ?? 0)} description="Total cadastrado pelo seu link" />
                  <KpiCard icon={Sparkles} label="Fotógrafos ativos" value={String(stats?.activeReferrals ?? 0)} description="Continuam vendendo na plataforma" />
                  <KpiCard icon={DollarSign} label="Receita gerada" value={formatBRL(stats?.platformRevenue ?? 0)} description="Receita da ViuFoto vinda das suas indicações" />
                  <KpiCard icon={CalendarDays} label="Comissão deste mês" value={formatBRL(stats?.monthCommission ?? 0)} description="Apurado no mês atual" />
                  <KpiCard icon={Clock} label="Próximo pagamento" value={formatBRL(stats?.nextPayout ?? 0)} description="Previsto para o próximo ciclo" />
                  <KpiCard icon={Wallet} label="Total recebido" value={formatBRL(stats?.totalReceived ?? 0)} description="Desde o início do programa" />
                </div>
              )}
            </section>
          )}

          {/* Impacto */}
          {isAmbassador && (stats?.totalReferrals ?? 0) > 0 && (
            <section className="rounded-2xl border border-border bg-card p-6 flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold">Seu impacto na comunidade</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Graças às suas indicações, <strong className="text-foreground">{stats?.totalReferrals} novos fotógrafos</strong> passaram a
                  utilizar a ViuFoto{(stats?.activeReferrals ?? 0) > 0 && <> — e {stats?.activeReferrals} seguem ativos vendendo suas fotos.</>}
                </p>
              </div>
            </section>
          )}

          {/* Como funciona */}
          <section className="space-y-4">
            <SectionTitle icon={Sparkles} title="Como funciona?" subtitle="Em quatro etapas simples." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {STEPS.map((s) => (
                <div key={s.n} className="rounded-2xl border border-border bg-card p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center">{s.n}</span>
                    <s.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <h3 className="font-bold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5 text-sm">
              <strong className="text-foreground">Importante:</strong>{" "}
              <span className="text-muted-foreground">
                a comissão é calculada sobre a receita da ViuFoto, e não sobre o faturamento total do fotógrafo.
              </span>
            </div>
          </section>

          {/* Exemplo de cálculo */}
          <section className="space-y-4">
            <SectionTitle icon={Calculator} title="Exemplo de cálculo" subtitle="Para eliminar qualquer dúvida." />
            <CalcExample />
          </section>

          {/* Simulador */}
          <section className="space-y-4">
            <SectionTitle icon={TrendingUp} title="Simulador de crescimento" subtitle="Projete seus ganhos ajustando os valores." />
            <GrowthSimulator />
          </section>

          {/* Histórico */}
          {isAmbassador && (
            <section className="space-y-4">
              <SectionTitle icon={Users} title="Minhas indicações" subtitle="Acompanhe cada fotógrafo indicado." />
              <ReferralsTable rows={data?.referrals ?? []} loading={loadingData} />

              <SectionTitle icon={Wallet} title="Histórico de pagamentos" subtitle="Competência, valor e status." />
              <PayoutsTable rows={data?.payouts ?? []} loading={loadingData} />
            </section>
          )}

          {/* Regras */}
          <section className="space-y-4">
            <SectionTitle icon={CheckCircle2} title="Regras do Programa" subtitle="Transparência total." />
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="rules" className="rounded-2xl border border-border bg-card px-6">
                <AccordionTrigger className="font-bold">Ver resumo das regras</AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-3 pb-2">
                    {RULES.map((r) => (
                      <li key={r} className="flex gap-3 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="policy" className="rounded-2xl border border-border bg-card px-6">
                <AccordionTrigger className="font-bold text-primary">Política Oficial do Programa</AccordionTrigger>
                <AccordionContent className="space-y-6 pb-6 pt-2">
                  <div className="space-y-4">
                    <h4 className="font-bold text-foreground">Princípio Fundamental</h4>
                    <p className="text-sm text-muted-foreground">
                      O Programa de Embaixadores da ViuFoto foi criado para reconhecer fotógrafos que apresentam a plataforma a novos profissionais.
                      A comissão é válida exclusivamente para fotógrafos que nunca tiveram qualquer relacionamento anterior com a ViuFoto.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-foreground flex items-center gap-2">
                      <Users className="w-4 h-4" /> Critérios para uma indicação válida
                    </h4>
                    <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                      <li>O fotógrafo nunca tiver criado uma conta na ViuFoto anteriormente.</li>
                      <li>O fotógrafo nunca tiver iniciado um cadastro.</li>
                      <li>O fotógrafo nunca tiver utilizado login social (Google, Meta ou outro).</li>
                      <li>A conta for criada utilizando o link oficial de indicação do Embaixador.</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-foreground flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Mecanismos Antifraude
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Para garantir a integridade do programa, a ViuFoto utiliza mecanismos automáticos e manuais de validação, incluindo histórico de contas, CPF/CNPJ, e-mail, telefone, dispositivo e endereço IP.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-foreground flex items-center gap-2">
                      <DollarSign className="w-4 h-4" /> Comissão do Programa
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      O Embaixador receberá <strong>1% da receita líquida</strong> gerada pela ViuFoto através de cada fotógrafo indicado, durante os primeiros <strong>12 meses</strong> de atividade. Após esse período, a comissão é encerrada automaticamente.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <Link to="/ajuda" className="text-xs text-primary hover:underline flex items-center gap-1">
                      Ver política completa na Central de Ajuda <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          {/* Benefícios futuros */}
          <section className="space-y-4">
            <SectionTitle icon={Trophy} title="Benefícios futuros" subtitle="Em desenvolvimento para os Embaixadores." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {FUTURE_BENEFITS.map((b) => (
                <div key={b} className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/60">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                  <span className="text-sm font-medium text-muted-foreground">{b}</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-background border border-border rounded-full px-2 py-0.5">
                    Em breve
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <h2 className="font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, description }: { icon: any; label: string; value: string; description: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-1">
      <Icon className="w-5 h-5 text-primary" />
      <p className="text-xl md:text-2xl font-bold tracking-tight mt-2">{value}</p>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-[11px] text-muted-foreground leading-snug">{description}</p>
    </div>
  );
}

function CalcExample() {
  const sales = 15000;
  const platform = platformRevenue(sales);
  const share = ambassadorShare(platform);
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      <p className="text-sm text-muted-foreground">
        Imagine que você indicou um fotógrafo e, durante um mês, ele vendeu <strong className="text-foreground">{formatBRL(sales)}</strong>.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CalcStep label={`Comissão ViuFoto (${PLATFORM_FEE_PCT}%)`} formula={`${formatBRL(sales)} × ${PLATFORM_FEE_PCT}%`} value={formatBRL(platform)} />
        <CalcStep label={`Sua participação (${AMBASSADOR_PCT}%)`} formula={`${formatBRL(platform)} × ${AMBASSADOR_PCT}%`} value={formatBRL(share)} highlight />
        <CalcStep label={`Em ${COMMISSION_MONTHS} meses`} formula={`${formatBRL(share)} × ${COMMISSION_MONTHS}`} value={formatBRL(share * COMMISSION_MONTHS)} />
      </div>
      <p className="text-xs text-muted-foreground">
        Você continua recebendo essa participação durante os primeiros {COMMISSION_MONTHS} meses desse fotógrafo.
      </p>
    </div>
  );
}

function CalcStep({ label, formula, value, highlight }: { label: string; formula: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-cta/30 bg-cta/10" : "border-border bg-muted/20"}`}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xs text-muted-foreground mt-2 font-mono">{formula}</p>
      <p className={`text-xl font-bold mt-1 ${highlight ? "text-cta" : ""}`}>{value}</p>
    </div>
  );
}

function GrowthSimulator() {
  const [count, setCount] = useState(20);
  const [revenuePer, setRevenuePer] = useState(500);

  const result = useMemo(() => {
    const monthlyPlatform = count * revenuePer;
    const monthly = ambassadorShare(monthlyPlatform);
    return { monthlyPlatform, monthly, yearly: monthly * COMMISSION_MONTHS };
  }, [count, revenuePer]);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Fotógrafos indicados</span>
            <span className="font-bold text-primary">{count}</span>
          </div>
          <Slider value={[count]} min={1} max={200} step={1} onValueChange={([v]) => setCount(v)} />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Receita mensal da ViuFoto por fotógrafo</span>
            <span className="font-bold text-primary">{formatBRL(revenuePer)}</span>
          </div>
          <Slider value={[revenuePer]} min={50} max={5000} step={50} onValueChange={([v]) => setRevenuePer(v)} />
        </div>
        <p className="text-xs text-muted-foreground">
          Simulação ilustrativa. Os valores reais dependem das vendas efetivas de cada fotógrafo indicado.
        </p>
      </div>

      <div className="space-y-3">
        <SimRow label="Receita mensal da plataforma" formula={`${count} × ${formatBRL(revenuePer)}`} value={formatBRL(result.monthlyPlatform)} />
        <SimRow label={`Sua participação (${AMBASSADOR_PCT}%)`} formula={`${formatBRL(result.monthlyPlatform)} × ${AMBASSADOR_PCT}%`} value={`${formatBRL(result.monthly)} / mês`} highlight />
        <SimRow label={`Em ${COMMISSION_MONTHS} meses`} formula={`${formatBRL(result.monthly)} × ${COMMISSION_MONTHS}`} value={formatBRL(result.yearly)} />
      </div>
    </div>
  );
}

function SimRow({ label, formula, value, highlight }: { label: string; formula: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${highlight ? "border-cta/30 bg-cta/10" : "border-border bg-muted/20"}`}>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
        <p className="text-xs text-muted-foreground font-mono truncate">{formula}</p>
      </div>
      <p className={`text-lg font-bold whitespace-nowrap ${highlight ? "text-cta" : ""}`}>{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-cta/10 text-cta border-cta/30",
    paid: "bg-cta/10 text-cta border-cta/30",
    pago: "bg-cta/10 text-cta border-cta/30",
    pending: "bg-muted text-muted-foreground border-border",
    blocked: "bg-destructive/10 text-destructive border-destructive/30",
  };
  const labels: Record<string, string> = {
    active: "Ativo", paid: "Pago", pago: "Pago", pending: "Pendente", blocked: "Bloqueado",
  };
  return (
    <span className={`inline-flex text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${map[status] ?? map.pending}`}>
      {labels[status] ?? status}
    </span>
  );
}

function ReferralsTable({ rows, loading }: { rows: any[]; loading?: boolean }) {
  if (loading) return <div className="h-32 rounded-2xl border border-border bg-muted/30 animate-pulse" />;
  if (!rows.length) {
    return (
      <EmptyState text="Você ainda não possui indicações. Compartilhe seu link exclusivo para começar." />
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-card overflow-x-auto">
      <table className="w-full text-sm min-w-[720px]">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr className="text-left">
            <Th>Fotógrafo</Th><Th>Cadastro</Th><Th>Status</Th><Th>Comissão restante</Th><Th>Receita gerada</Th><Th>Comissão acumulada</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <Td className="font-medium">{r.name}</Td>
              <Td>{new Date(r.createdAt).toLocaleDateString("pt-BR")}</Td>
              <Td><StatusPill status={r.status} /></Td>
              <Td>{r.monthsLeft > 0 ? `${r.monthsLeft} ${r.monthsLeft === 1 ? "mês" : "meses"}` : "Encerrada"}</Td>
              <Td>{formatBRL(r.grossSales)}</Td>
              <Td className="font-bold">{formatBRL(r.commission)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PayoutsTable({ rows, loading }: { rows: any[]; loading?: boolean }) {
  if (loading) return <div className="h-24 rounded-2xl border border-border bg-muted/30 animate-pulse" />;
  if (!rows.length) return <EmptyState text="Nenhum pagamento realizado até o momento." />;
  return (
    <div className="rounded-2xl border border-border bg-card overflow-x-auto">
      <table className="w-full text-sm min-w-[520px]">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr className="text-left"><Th>Competência</Th><Th>Valor</Th><Th>Data</Th><Th>Status</Th></tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-t border-border">
              <Td className="capitalize">{p.competence}</Td>
              <Td className="font-bold">{formatBRL(p.amount)}</Td>
              <Td>{p.date ? new Date(p.date).toLocaleDateString("pt-BR") : "—"}</Td>
              <Td><StatusPill status={p.status} /></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">{children}</th>
);
const Td = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <td className={`px-4 py-3 whitespace-nowrap ${className}`}>{children}</td>
);
