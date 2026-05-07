import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const TERMS_VERSION = "2026-05";

export default function TermsGate() {
  const { user, profile, roles, loading, refreshProfile, signOut } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  // Only enforce on photographers (parceiros)
  const isPhotographer = roles.includes("photographer");
  const needsAcceptance =
    !loading && !!user && !!profile && isPhotographer && !profile.terms_accepted_at;

  if (!needsAcceptance) return null;

  const handleAccept = async () => {
    if (!agreed || !user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        terms_accepted_at: new Date().toISOString(),
        terms_version: TERMS_VERSION,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível registrar o aceite. Tente novamente.");
      return;
    }
    await refreshProfile();
    toast.success("Termos aceitos. Bem-vindo(a) à ViuFoto!");
  };

  const handleDecline = async () => {
    await signOut();
    toast.info("Para usar a plataforma como fotógrafo é necessário aceitar os Termos de Uso.");
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-lg [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl">Termos de Uso — Fotógrafo Parceiro</DialogTitle>
          <DialogDescription>
            Antes de continuar, é necessário ler e aceitar os Termos de Uso da ViuFoto para
            fotógrafos parceiros. Este aceite é obrigatório no primeiro acesso.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm space-y-2">
          <p className="text-foreground/80">
            Os termos cobrem direitos autorais, comissões, uso da plataforma, responsabilidades e
            proteção de dados (LGPD).
          </p>
          <Link
            to="/termos-de-uso"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-primary font-semibold hover:underline"
          >
            Ler Termos de Uso completos
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <label className="flex items-start gap-2 text-sm text-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 accent-primary w-4 h-4"
          />
          <span>
            Li e concordo com os <strong>Termos de Uso</strong> da ViuFoto para fotógrafos parceiros
            e declaro ser o titular dos direitos autorais das imagens que publicar.
          </span>
        </label>

        <div className="flex flex-col sm:flex-row-reverse gap-2 pt-2">
          <Button
            onClick={handleAccept}
            disabled={!agreed || saving}
            className="flex-1 h-12 font-bold"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Aceitar e continuar"}
          </Button>
          <Button
            variant="outline"
            onClick={handleDecline}
            disabled={saving}
            className="flex-1 h-12"
          >
            Recusar e sair
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}