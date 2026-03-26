import { useState } from "react";
import { MessageSquare, Clock, CheckCircle, AlertCircle, Zap, User } from "lucide-react";

const tickets = [
  { id: "T-1247", subject: "Não consigo baixar minhas fotos", user: "João Mendes", email: "joao@email.com", category: "download", priority: "high", status: "open", created: "26/03/2026 14:30", aiSuggestion: "O problema pode estar relacionado ao navegador. Sugira limpar cache ou trocar de navegador." },
  { id: "T-1246", subject: "Pagamento não processado", user: "Fernanda Reis", email: "fernanda@email.com", category: "payment", priority: "urgent", status: "open", created: "26/03/2026 13:15", aiSuggestion: "Verificar status do gateway de pagamento. Possível timeout na transação." },
  { id: "T-1245", subject: "Como faço para me cadastrar como fotógrafo?", user: "Lucas Amaral", email: "lucas@email.com", category: "onboarding", priority: "medium", status: "open", created: "26/03/2026 11:00", aiSuggestion: "Enviar link do cadastro de fotógrafo e documentação necessária." },
  { id: "T-1244", subject: "Reconhecimento facial não encontrou minhas fotos", user: "Maria Lima", email: "maria@email.com", category: "feature", priority: "medium", status: "in_progress", created: "25/03/2026 22:30", aiSuggestion: "Verificar qualidade da selfie enviada. Solicitar nova foto com melhor iluminação." },
  { id: "T-1243", subject: "Quero cancelar meu VIU Pass", user: "Roberto Alves", email: "roberto@email.com", category: "subscription", priority: "low", status: "resolved", created: "25/03/2026 18:00", aiSuggestion: "Processar cancelamento e oferecer desconto de retenção de 30%." },
];

const priorityColors: Record<string, string> = {
  urgent: "bg-destructive/15 text-destructive",
  high: "bg-amber-500/15 text-amber-500",
  medium: "bg-accent/15 text-accent",
  low: "bg-muted text-muted-foreground",
};

const statusColors: Record<string, string> = {
  open: "bg-primary/15 text-primary",
  in_progress: "bg-amber-500/15 text-amber-500",
  resolved: "bg-lime/15 text-lime",
};

const AdminSupport = () => {
  const [filter, setFilter] = useState("all");
  const filtered = tickets.filter((t) => filter === "all" || t.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Suporte</h1>
        <p className="text-sm text-muted-foreground">Tickets centralizados com sugestões de IA</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Abertos", value: "23", icon: AlertCircle, color: "text-primary" },
          { label: "Em andamento", value: "8", icon: Clock, color: "text-amber-500" },
          { label: "Resolvidos hoje", value: "15", icon: CheckCircle, color: "text-lime" },
          { label: "Tempo médio", value: "2.4h", icon: Zap, color: "text-accent" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4">
            <s.icon className={`w-5 h-5 ${s.color} mb-1`} />
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["all", "open", "in_progress", "resolved"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            {f === "all" ? "Todos" : f === "open" ? "Abertos" : f === "in_progress" ? "Em andamento" : "Resolvidos"}
          </button>
        ))}
      </div>

      {/* Tickets */}
      <div className="space-y-3">
        {filtered.map((ticket) => (
          <div key={ticket.id} className="glass-card-hover p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-muted-foreground">{ticket.id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${priorityColors[ticket.priority]}`}>
                    {ticket.priority.toUpperCase()}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[ticket.status]}`}>
                    {ticket.status === "open" ? "Aberto" : ticket.status === "in_progress" ? "Em andamento" : "Resolvido"}
                  </span>
                </div>
                <h3 className="font-semibold text-sm">{ticket.subject}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <User className="w-3 h-3" /> {ticket.user} · {ticket.created}
                </p>
              </div>
            </div>

            {/* AI suggestion */}
            <div className="bg-accent/5 border border-accent/15 rounded-lg p-3 mt-2">
              <p className="text-xs font-semibold text-accent mb-1 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Sugestão IA
              </p>
              <p className="text-xs text-muted-foreground">{ticket.aiSuggestion}</p>
            </div>

            <div className="flex gap-2 mt-3">
              <button className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all">
                Responder
              </button>
              <button className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition-all">
                Usar sugestão IA
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminSupport;
