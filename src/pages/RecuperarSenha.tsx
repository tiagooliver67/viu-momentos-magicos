import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Informe seu email"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b border-border px-4 h-14 flex items-center justify-between">
        <Link to="/" className="text-xl font-black tracking-tight">
          <span className="text-primary">VIU</span><span className="text-foreground">FOTO</span>
        </Link>
        <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">← Voltar ao login</Link>
      </nav>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <h1 className="text-xl font-bold text-foreground">Email enviado!</h1>
              <p className="text-muted-foreground text-sm">Verifique sua caixa de entrada para redefinir sua senha.</p>
              <Link to="/login" className="text-primary font-semibold hover:underline text-sm">Voltar ao login</Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-2">Recuperar senha</h1>
              <p className="text-muted-foreground text-sm mb-6">Informe seu email para receber o link de redefinição.</p>
              <form onSubmit={handleReset} className="space-y-4">
                <Input type="email" placeholder="Digite seu email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" />
                <Button type="submit" className="w-full h-12 font-bold" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enviar link"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
