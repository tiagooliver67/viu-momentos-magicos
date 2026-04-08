import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2, Camera, Flag, User } from "lucide-react";
import { toast } from "sonner";

const ROLE_CONFIG: Record<string, { title: string; icon: typeof Camera; redirect: string; registerLink: string; registerLabel: string }> = {
  fotografo: {
    title: "Login — Fotógrafo",
    icon: Camera,
    redirect: "/dashboard",
    registerLink: "/cadastro/fotografo",
    registerLabel: "Criar conta de fotógrafo",
  },
  organizador: {
    title: "Login — Organizador",
    icon: Flag,
    redirect: "/dashboard",
    registerLink: "/cadastro/organizador",
    registerLabel: "Criar conta de organizador",
  },
};

export default function LoginRole() {
  const { role } = useParams<{ role: string }>();
  const config = ROLE_CONFIG[role || ""] || {
    title: "Faça login",
    icon: User,
    redirect: "/meus-pedidos",
    registerLink: "/cadastro",
    registerLabel: "Criar conta",
  };
  const Icon = config.icon;

  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Preencha todos os campos"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      if (error.message.includes("Invalid login")) toast.error("Email ou senha inválidos");
      else if (error.message.includes("Email not confirmed")) toast.error("Confirme seu email antes de fazer login");
      else toast.error(error.message);
      return;
    }
    toast.success("Login realizado!");
    navigate(config.redirect);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b border-border px-4 h-14 flex items-center justify-between">
        <Link to="/" className="text-xl font-black tracking-tight">
          <span className="text-primary">VIU</span><span className="text-foreground">FOTO</span>
        </Link>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Voltar</Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">{config.title}</h1>
            </div>

            <p className="text-muted-foreground text-sm mb-6">
              Não tem conta?{" "}
              <Link to={config.registerLink} className="text-primary font-semibold hover:underline">{config.registerLabel}</Link>
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <Input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} className="h-12" />
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="h-12 pr-12" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <Link to="/recuperar-senha" className="block text-sm text-muted-foreground hover:text-foreground underline">
                Esqueci minha senha
              </Link>

              <Button type="submit" className="w-full h-12 text-base font-bold" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar"}
              </Button>
            </form>

            {/* Fotógrafo parceiro section */}
            {role && (
              <div className="mt-6 pt-6 border-t border-border text-center">
                <p className="text-sm text-muted-foreground">
                  Fotógrafo ou Parceiro?{" "}
                  <Link to="/login/fotografo" className="text-primary font-semibold hover:underline">
                    Acessar painel
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
