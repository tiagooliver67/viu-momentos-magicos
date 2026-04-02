import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    }
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Mínimo 6 caracteres"); return; }
    if (password !== confirm) { toast.error("As senhas não conferem"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Senha atualizada!");
    navigate("/dashboard");
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Link inválido ou expirado.</p>
          <Link to="/recuperar-senha" className="text-primary hover:underline">Solicitar novo link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b border-border px-4 h-14 flex items-center">
        <Link to="/" className="text-xl font-black tracking-tight">
          <span className="text-primary">VIU</span><span className="text-foreground">FOTO</span>
        </Link>
      </nav>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-foreground mb-6">Definir nova senha</h1>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="relative">
              <Input type={show ? "text" : "password"} placeholder="Nova senha" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 pr-12" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <Input type="password" placeholder="Confirmar nova senha" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-12" />
            <Button type="submit" className="w-full h-12 font-bold" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salvar senha"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
