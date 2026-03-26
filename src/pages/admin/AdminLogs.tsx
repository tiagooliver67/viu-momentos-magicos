import { useState } from "react";
import { Search, Shield, AlertTriangle, Info, Bug, User, Clock } from "lucide-react";

const logs = [
  { id: 1, timestamp: "26/03/2026 14:32:05", level: "warning", action: "God Mode ativado", user: "admin@viufoto.com", target: "carlos@email.com", ip: "187.45.120.33" },
  { id: 2, timestamp: "26/03/2026 14:30:12", level: "info", action: "Evento aprovado", user: "admin@viufoto.com", target: "VERÃO RUN IRECÊ 2026", ip: "187.45.120.33" },
  { id: 3, timestamp: "26/03/2026 14:28:45", level: "error", action: "Falha no processamento de pagamento", user: "sistema", target: "Pedido #45821", ip: "10.0.0.1" },
  { id: 4, timestamp: "26/03/2026 14:25:30", level: "info", action: "Repasse iniciado", user: "admin@viufoto.com", target: "Ana Costa – R$ 5.200", ip: "187.45.120.33" },
  { id: 5, timestamp: "26/03/2026 14:20:15", level: "warning", action: "Rate limit atingido", user: "sistema", target: "API /photos/search", ip: "10.0.0.1" },
  { id: 6, timestamp: "26/03/2026 14:15:00", level: "info", action: "Novo fotógrafo cadastrado", user: "sistema", target: "Paulo Oliveira", ip: "201.12.45.78" },
  { id: 7, timestamp: "26/03/2026 14:10:22", level: "security", action: "Tentativa de acesso não autorizado", user: "desconhecido", target: "/admin/financeiro", ip: "45.123.67.89" },
  { id: 8, timestamp: "26/03/2026 14:05:11", level: "info", action: "Configuração alterada", user: "admin@viufoto.com", target: "Comissão Standard: 38% → 40%", ip: "187.45.120.33" },
  { id: 9, timestamp: "26/03/2026 13:58:33", level: "error", action: "Timeout no upload de fotos", user: "sistema", target: "Evento #142 – 45 fotos perdidas", ip: "10.0.0.1" },
  { id: 10, timestamp: "26/03/2026 13:50:00", level: "info", action: "Backup automático concluído", user: "sistema", target: "DB snapshot 03/26", ip: "10.0.0.1" },
];

const levelConfig: Record<string, { color: string; icon: any; bg: string }> = {
  info: { color: "text-accent", icon: Info, bg: "bg-accent/10" },
  warning: { color: "text-amber-500", icon: AlertTriangle, bg: "bg-amber-500/10" },
  error: { color: "text-destructive", icon: Bug, bg: "bg-destructive/10" },
  security: { color: "text-primary", icon: Shield, bg: "bg-primary/10" },
};

const AdminLogs = () => {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");

  const filtered = logs.filter((l) => {
    const matchSearch = l.action.toLowerCase().includes(search.toLowerCase()) || l.target.toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === "all" || l.level === levelFilter;
    return matchSearch && matchLevel;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Testes & Logs</h1>
        <p className="text-sm text-muted-foreground">Auditoria e debug da plataforma</p>
      </div>

      {/* God mode alert */}
      <div className="glass-card p-4 border-primary/30 bg-primary/5">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-semibold">Modo God</p>
            <p className="text-xs text-muted-foreground">Logar como qualquer usuário para debug. Todas as ações são registradas.</p>
          </div>
          <button className="ml-auto px-4 py-2 rounded-lg bg-primary/15 text-primary text-xs font-semibold hover:bg-primary/25 transition-colors">
            Ativar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 flex-1">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nos logs..." className="bg-transparent text-sm outline-none w-full" />
        </div>
        <div className="flex gap-2">
          {["all", "info", "warning", "error", "security"].map((l) => (
            <button
              key={l}
              onClick={() => setLevelFilter(l)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${levelFilter === l ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {l === "all" ? "Todos" : l.charAt(0).toUpperCase() + l.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Logs */}
      <div className="space-y-2">
        {filtered.map((log) => {
          const config = levelConfig[log.level] || levelConfig.info;
          const Icon = config.icon;
          return (
            <div key={log.id} className="glass-card p-4 hover:border-border transition-all">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold uppercase ${config.color}`}>{log.level}</span>
                    <span className="text-sm font-medium">{log.action}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {log.timestamp}</span>
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {log.user}</span>
                    <span>→ {log.target}</span>
                    <span className="font-mono">{log.ip}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminLogs;
