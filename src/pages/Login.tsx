import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromCheckout = (location.state as any)?.fromCheckout === true;
  const redirectTo = (location.state as any)?.from || "/meus-pedidos";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      if (error.message.includes("Invalid login")) {
        toast.error("Email ou senha inválidos");
      } else if (error.message.includes("Email not confirmed")) {
        toast.error("Confirme seu email antes de fazer login");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("Login realizado!");
    navigate(redirectTo);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b border-border px-4 h-14 flex items-center justify-between">
        <Link to="/" className="text-xl font-black tracking-tight">
          <span className="text-primary">VIU</span>
          <span className="text-foreground">FOTO</span>
        </Link>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Voltar</Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {fromCheckout && (
            <div className="mb-4 p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
              <ShoppingCart className="w-5 h-5 text-primary flex-shrink-0" />
              <p className="text-sm text-foreground">
                Para continuar com a compra, faça login ou{" "}
                <Link to="/cadastro" state={{ from: redirectTo, fromCheckout: true }} className="text-primary font-semibold hover:underline">
                  crie sua conta
                </Link>
              </p>
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl p-8">
            <h1 className="text-2xl font-bold text-foreground mb-1">Faça login</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Ainda não possui cadastro?{" "}
              <Link to="/cadastro" state={{ from: redirectTo, fromCheckout }} className="text-primary font-semibold hover:underline">Clique aqui</Link>
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="email"
                placeholder="Digite seu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
              />
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <Link to="/recuperar-senha" className="block text-sm text-muted-foreground hover:text-foreground underline">
                Esqueci minha senha
              </Link>

              <Button type="submit" className="w-full h-12 text-base font-bold" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : fromCheckout ? "Entrar e continuar compra" : "Entrar"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">Fotógrafo ou Parceiro</p>
              <Link to="/login/fotografo" className="text-primary font-semibold text-sm hover:underline">
                ACESSAR PAINEL
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
