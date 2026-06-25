import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Shield, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

type FraudCase = {
  id: string;
  subject_type: string;
  subject_id: string;
  user_id: string | null;
  score: number;
  status: "pending" | "cleared" | "blocked";
  signals: any[];
  decision_note: string | null;
  created_at: string;
};

export default function AdminAntifraude() {
  const [cases, setCases] = useState<FraudCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    let q = supabase.from("fraud_cases").select("*").order("score", { ascending: false }).order("created_at", { ascending: false });
    if (filter === "pending") q = q.eq("status", "pending");
    const { data, error } = await q.limit(100);
    if (error) toast.error(error.message);
    setCases((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const decide = async (id: string, decision: "cleared" | "blocked") => {
    const { error } = await supabase.rpc("fraud_decide_case", {
      _case_id: id, _decision: decision, _note: notes[id] ?? null,
    });
    if (error) return toast.error(error.message);
    toast.success(decision === "cleared" ? "Caso liberado" : "Caso bloqueado");
    load();
  };

  const scoreBadge = (s: number) => {
    if (s >= 70) return <Badge className="bg-destructive/15 text-destructive border-destructive/30">Alto · {s}</Badge>;
    if (s >= 40) return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Médio · {s}</Badge>;
    return <Badge variant="secondary">Baixo · {s}</Badge>;
  };

  const statusBadge = (s: string) => {
    if (s === "blocked") return <Badge className="bg-destructive/15 text-destructive">Bloqueado</Badge>;
    if (s === "cleared") return <Badge className="bg-emerald-500/15 text-emerald-600">Liberado</Badge>;
    return <Badge className="bg-amber-500/15 text-amber-600">Pendente</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-6 h-6 text-primary" /> Motor Antifraude</h1>
          <p className="text-sm text-muted-foreground">Revise sinais detectados antes de bloquear comissões ou participações.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={filter === "pending" ? "default" : "outline"} size="sm" onClick={() => setFilter("pending")}>Pendentes</Button>
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>Todos</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : cases.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
          Nenhum caso {filter === "pending" ? "pendente" : ""} no momento.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {cases.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    {c.subject_type} · <span className="font-mono text-xs">{c.subject_id.slice(0, 8)}</span>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(c.created_at).toLocaleString("pt-BR")}
                    {c.user_id && <> · usuário <span className="font-mono">{c.user_id.slice(0, 8)}</span></>}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {scoreBadge(c.score)}
                  {statusBadge(c.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-secondary/40 rounded-lg p-3 text-xs space-y-1">
                  {(c.signals ?? []).map((s, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="font-medium">{s.rule}</span>
                      <span className="text-muted-foreground">peso {s.weight}</span>
                    </div>
                  ))}
                </div>
                {c.status === "pending" && (
                  <>
                    <Textarea
                      placeholder="Nota da decisão (opcional)"
                      value={notes[c.id] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [c.id]: e.target.value }))}
                      className="text-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => decide(c.id, "cleared")}>
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Liberar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => decide(c.id, "blocked")}>
                        <XCircle className="w-4 h-4 mr-1" /> Bloquear
                      </Button>
                    </div>
                  </>
                )}
                {c.decision_note && (
                  <p className="text-xs text-muted-foreground border-t pt-2">Nota: {c.decision_note}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}