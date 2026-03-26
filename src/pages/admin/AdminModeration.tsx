import { useState } from "react";
import { Flag, CheckCircle, XCircle, AlertTriangle, MessageSquare, Image } from "lucide-react";

const reports = [
  { id: 1, type: "photo", reporter: "João Mendes", reason: "Conteúdo inadequado", target: "Foto #28451 – VERÃO RUN", date: "26/03/2026 14:30", severity: "high", status: "pending" },
  { id: 2, type: "event", reporter: "Sistema IA", reason: "Possível fraude de preço", target: "Evento: Night Run Special", date: "26/03/2026 12:15", severity: "medium", status: "pending" },
  { id: 3, type: "user", reporter: "Ana Costa", reason: "Perfil falso", target: "Usuário: fake_runner_2026", date: "25/03/2026 22:00", severity: "high", status: "pending" },
  { id: 4, type: "photo", reporter: "Maria Lima", reason: "Marca d'água incorreta", target: "Foto #31205 – ECO RUN", date: "25/03/2026 18:45", severity: "low", status: "resolved" },
  { id: 5, type: "comment", reporter: "Sistema IA", reason: "Linguagem ofensiva detectada", target: "Comentário em VERÃO RUN", date: "25/03/2026 16:20", severity: "medium", status: "pending" },
];

const severityColors: Record<string, string> = {
  high: "bg-destructive/15 text-destructive",
  medium: "bg-amber-500/15 text-amber-500",
  low: "bg-muted text-muted-foreground",
};

const typeIcons: Record<string, any> = {
  photo: Image,
  event: Flag,
  user: AlertTriangle,
  comment: MessageSquare,
};

const AdminModeration = () => {
  const [filter, setFilter] = useState("all");

  const filtered = reports.filter((r) => filter === "all" || r.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Moderação</h1>
        <p className="text-sm text-muted-foreground">Revisão de conteúdo e denúncias</p>
      </div>

      <div className="flex gap-2">
        {["all", "pending", "resolved"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            {f === "all" ? "Todos" : f === "pending" ? "Pendentes" : "Resolvidos"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((report) => {
          const Icon = typeIcons[report.type] || Flag;
          return (
            <div key={report.id} className="glass-card-hover p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{report.target}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Reportado por: {report.reporter} · {report.date}
                    </p>
                    <p className="text-xs mt-1">{report.reason}</p>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${severityColors[report.severity]}`}>
                      {report.severity.toUpperCase()}
                    </span>
                  </div>
                </div>

                {report.status === "pending" && (
                  <div className="flex gap-1 shrink-0">
                    <button className="p-2 rounded-lg hover:bg-lime/15 transition-colors" title="Aprovar">
                      <CheckCircle className="w-5 h-5 text-lime" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-destructive/15 transition-colors" title="Remover">
                      <XCircle className="w-5 h-5 text-destructive" />
                    </button>
                  </div>
                )}
                {report.status === "resolved" && (
                  <span className="text-xs text-lime font-semibold bg-lime/10 px-2 py-1 rounded-full">Resolvido</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminModeration;
