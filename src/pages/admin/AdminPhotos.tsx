import { useState } from "react";
import { Search, Loader2, Camera, Calendar, Copy, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getPhotoCode, normalizePhotoCode } from "@/lib/photoCode";
import { getThumbCdnUrl, IS_LAMBDA_PIPELINE_ACTIVE } from "@/lib/cdnConfig";

interface PhotoResult {
  id: string;
  file_url: string;
  file_name: string | null;
  created_at: string;
  event_id: string;
  event_name?: string;
}

const AdminPhotos = () => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PhotoResult[] | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const normalized = normalizePhotoCode(code);
    if (normalized.length < 4) {
      toast.error("Informe ao menos 4 caracteres do ID");
      return;
    }
    setLoading(true);
    try {
      // UUIDs are stored with dashes — match by prefix on the canonical form.
      // Postgres accepts hex without dashes only via casting, so we use ilike on text.
      const prefix = normalized.slice(0, 8).toLowerCase();
      const formatted =
        prefix.length === 8
          ? `${prefix.slice(0, 8)}-%`
          : `${prefix}%`;

      const { data: photos, error } = await supabase
        .from("event_photos")
        .select("id, file_url, file_name, created_at, event_id")
        .ilike("id", formatted)
        .limit(50);

      if (error) throw error;

      const eventIds = Array.from(new Set((photos || []).map((p) => p.event_id)));
      const { data: events } = eventIds.length
        ? await supabase.from("events").select("id, name").in("id", eventIds)
        : { data: [] as any[] };

      const eventMap = new Map((events || []).map((e: any) => [e.id, e.name]));
      setResults(
        (photos || []).map((p) => ({
          ...p,
          event_name: eventMap.get(p.event_id) || "—",
        }))
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao buscar foto");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Buscar Foto por ID</h1>
        <p className="text-sm text-muted-foreground">
          Localize qualquer foto da plataforma usando o código exibido ao cliente (ex.: A1B2C3D4).
        </p>
      </div>

      <form onSubmit={handleSearch} className="glass-card p-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Cole o ID da foto (ex: A1B2C3D4)"
              className="bg-transparent text-sm outline-none w-full font-mono uppercase"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
          </button>
        </div>
      </form>

      {results && results.length === 0 && (
        <div className="glass-card p-8 text-center text-muted-foreground">
          <Camera className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma foto encontrada com esse código.</p>
        </div>
      )}

      {results && results.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {results.map((p) => {
            const thumb = IS_LAMBDA_PIPELINE_ACTIVE ? getThumbCdnUrl(p.file_url) : "";
            return (
              <div key={p.id} className="glass-card overflow-hidden flex flex-col">
                <div className="aspect-[3/4] bg-secondary/30 relative">
                  {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Camera className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-foreground">
                      ID: {getPhotoCode(p.id)}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(p.id);
                        toast.success("UUID copiado");
                      }}
                      className="p-1 rounded hover:bg-secondary text-muted-foreground"
                      title="Copiar UUID completo"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-muted-foreground truncate" title={p.event_name}>
                    {p.event_name}
                  </p>
                  <p className="text-muted-foreground/80 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </p>
                  <Link
                    to={`/foto/${p.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Abrir <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminPhotos;