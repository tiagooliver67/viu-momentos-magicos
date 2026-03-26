import { useState } from "react";
import { Settings, Percent, Palette, Globe, Shield, Bell } from "lucide-react";

const AdminSettings = () => {
  const [commissionStandard, setCommissionStandard] = useState(40);
  const [commissionHigh, setCommissionHigh] = useState(30);
  const [commissionPaygo, setCommissionPaygo] = useState(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações Globais</h1>
        <p className="text-sm text-muted-foreground">Planos, comissões e white-label</p>
      </div>

      {/* Commission models */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Percent className="w-5 h-5 text-primary" /> Modelos de Comissão</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: "Standard", desc: "Modelo padrão para fotógrafos", value: commissionStandard, setter: setCommissionStandard, color: "border-primary/30" },
            { name: "HighVolume", desc: "Alto volume de vendas", value: commissionHigh, setter: setCommissionHigh, color: "border-accent/30" },
            { name: "Pay as you go", desc: "Pague por uso", value: commissionPaygo, setter: setCommissionPaygo, color: "border-lime/30" },
          ].map((model) => (
            <div key={model.name} className={`border ${model.color} rounded-xl p-4 bg-secondary/20`}>
              <h4 className="font-bold text-sm">{model.name}</h4>
              <p className="text-xs text-muted-foreground mb-3">{model.desc}</p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={10}
                  max={60}
                  value={model.value}
                  onChange={(e) => model.setter(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="text-lg font-bold text-primary w-12 text-right">{model.value}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* White-label */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Palette className="w-5 h-5 text-accent" /> White-Label</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Nome da marca</label>
            <input defaultValue="VIUFOTO" className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Domínio personalizado</label>
            <input defaultValue="app.viufoto.com.br" className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Cor primária</label>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary border border-border" />
              <input defaultValue="#FF4D00" className="bg-secondary/50 rounded-lg px-3 py-2 text-sm outline-none border border-border w-28" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Logo URL</label>
            <input defaultValue="https://viufoto.com.br/logo.png" className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary transition-colors" />
          </div>
        </div>
      </div>

      {/* Platform settings */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-lime" /> Configurações da Plataforma</h3>
        <div className="space-y-4">
          {[
            { label: "Manutenção programada", desc: "Ativar modo manutenção para todas as páginas públicas", enabled: false },
            { label: "Cadastro aberto", desc: "Permitir novos cadastros de fotógrafos", enabled: true },
            { label: "VIU Pass ativo", desc: "Programa de fidelidade disponível para atletas", enabled: true },
            { label: "Reconhecimento Facial", desc: "IA de busca por selfie ativa", enabled: true },
            { label: "Notificações push", desc: "Enviar notificações para dispositivos móveis", enabled: false },
          ].map((setting) => (
            <div key={setting.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <div>
                <p className="text-sm font-medium">{setting.label}</p>
                <p className="text-xs text-muted-foreground">{setting.desc}</p>
              </div>
              <button className={`w-11 h-6 rounded-full transition-all ${setting.enabled ? "bg-primary" : "bg-secondary"} relative`}>
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${setting.enabled ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_rgba(255,77,0,0.3)]">
        Salvar configurações
      </button>
    </div>
  );
};

export default AdminSettings;
