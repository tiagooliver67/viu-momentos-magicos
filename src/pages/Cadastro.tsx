import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Loader2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

export default function Cadastro() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromCheckout = (location.state as any)?.fromCheckout === true;
  const redirectTo = (location.state as any)?.from || "/login";
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    cpfCnpj: "",
    password: "",
    confirmPassword: "",
    experienceLevel: "",
    interest: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    if (form.password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("As senhas não conferem");
      return;
    }
    if (!agreed) {
      toast.error("Aceite os termos de uso para continuar");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          phone: form.phone,
          cpf_cnpj: form.cpfCnpj,
          experience_level: form.experienceLevel,
          interest: form.interest,
        },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Conta criada! Verifique seu email para confirmar o cadastro.");
    navigate("/login", { state: { from: redirectTo, fromCheckout } });
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
                Crie sua conta para finalizar a compra. Seus itens do carrinho estão salvos!
              </p>
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl p-8">
            <h1 className="text-2xl font-bold text-foreground mb-1">Crie sua conta no ViuFoto</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Já é cadastrado?{" "}
              <Link to="/login" state={{ from: redirectTo, fromCheckout }} className="text-primary font-semibold hover:underline">Efetuar login</Link>
            </p>

            <form onSubmit={handleSignup} className="space-y-4">
              <Input placeholder="Digite seu nome completo *" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} className="h-12" />
              <Input type="email" placeholder="Digite seu email *" value={form.email} onChange={(e) => update("email", e.target.value)} className="h-12" />
              <Input placeholder="CPF ou CNPJ" value={form.cpfCnpj} onChange={(e) => update("cpfCnpj", e.target.value)} className="h-12" />
              <Input placeholder="Número de celular" value={form.phone} onChange={(e) => update("phone", e.target.value)} className="h-12" />

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Crie sua senha *"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  className="h-12 pr-12"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirme sua senha *"
                  value={form.confirmPassword}
                  onChange={(e) => update("confirmPassword", e.target.value)}
                  className="h-12 pr-12"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <Select value={form.experienceLevel} onValueChange={(v) => update("experienceLevel", v)}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Nível de experiência em fotografia" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="iniciante">Iniciante</SelectItem>
                  <SelectItem value="intermediario">Intermediário</SelectItem>
                  <SelectItem value="profissional">Profissional</SelectItem>
                </SelectContent>
              </Select>

              <Select value={form.interest} onValueChange={(v) => update("interest", v)}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Qual seu interesse no ViuFoto?" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fotografo">Sou Fotógrafo</SelectItem>
                  <SelectItem value="organizador">Sou Organizador de Eventos</SelectItem>
                  <SelectItem value="ambos">Ambos</SelectItem>
                </SelectContent>
              </Select>

              <label className="flex items-start gap-2 text-sm text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 accent-primary" />
                <span>Ao criar uma conta, você concorda com os <span className="text-primary font-medium">Termos e Condições de uso</span></span>
              </label>

              <Button type="submit" className="w-full h-12 text-base font-bold" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Criar conta"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
