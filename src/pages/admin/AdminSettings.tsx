import { Settings, Palette } from "lucide-react";

const AdminSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações Globais</h1>
        <p className="text-sm text-muted-foreground">Configurações da plataforma</p>
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
            <input defaultValue="" placeholder="Ex: app.viufoto.com" className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Cor primária</label>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary border border-border" />
              <input defaultValue="#673DE6" className="bg-secondary/50 rounded-lg px-3 py-2 text-sm outline-none border border-border w-28" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Logo URL</label>
            <input defaultValue="" placeholder="https://..." className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary transition-colors" />
          </div>
        </div>
      </div>

      {/* Platform settings */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-lime" /> Configurações da Plataforma</h3>
        <p className="text-sm text-muted-foreground">
          As configurações globais serão implementadas conforme novas funcionalidades forem adicionadas.
        </p>
      </div>
    </div>
  );
};

export default AdminSettings;
