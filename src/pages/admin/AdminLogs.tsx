import { useEffect, useState } from "react";
import { Info, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type LogRow = {
  id: string;
  created_at: string;
  performed_by: string;
  target_user_id: string;
  action: string;
  details: any;
  performer_name?: string | null;
  target_name?: string | null;
};

const AdminLogs = () => {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      const rows = (data ?? []) as LogRow[];
      const ids = [...new Set(rows.flatMap((r) => [r.performed_by, r.target_user_id]).filter(Boolean))];
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
        const map = new Map((profs ?? []).map((p: any) => [p.user_id, p.full_name]));
        rows.forEach((r) => {
          r.performer_name = (map.get(r.performed_by) as string) ?? null;
          r.target_name = (map.get(r.target_user_id) as string) ?? null;
        });
      }
      setLogs(rows);
      setLoading(false);
    })();
  }, []);

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(s) ||
      (l.performer_name ?? "").toLowerCase().includes(s) ||
      (l.target_name ?? "").toLowerCase().includes(s) ||
      JSON.stringify(l.details).toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Testes & Logs</h1>
        <p className="text-sm text-muted-foreground">Auditoria de ações sensíveis do Super Admin</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar ação, usuário ou detalhe" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Info className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold mb-1">Nenhum log encontrado</h3>
          <p className="text-sm text-muted-foreground">Ações sensíveis aparecerão aqui automaticamente.</p>
        </div>
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left p-3">Quando</th>
                <th className="text-left p-3">Ação</th>
                <th className="text-left p-3">Admin</th>
                <th className="text-left p-3">Alvo</th>
                <th className="text-left p-3">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0 align-top">
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                  <td className="p-3"><Badge variant="outline">{l.action}</Badge></td>
                  <td className="p-3 text-xs">{l.performer_name ?? l.performed_by.slice(0, 8)}</td>
                  <td className="p-3 text-xs">{l.target_name ?? l.target_user_id.slice(0, 8)}</td>
                  <td className="p-3 text-xs text-muted-foreground"><pre className="whitespace-pre-wrap break-all max-w-md">{JSON.stringify(l.details, null, 2)}</pre></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminLogs;
