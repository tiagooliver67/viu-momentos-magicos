import { useState } from "react";
import { Image as ImageIcon, Plus, Star, Trash2, Upload, Save } from "lucide-react";
import { toast } from "sonner";

const TabPortfolio = () => {
  const categories = ["Corrida", "Ciclismo", "Triathlon", "Trail Run"];
  const [selectedCat, setSelectedCat] = useState("Corrida");
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Meu portfólio</h2>
        <p className="text-sm text-muted-foreground">Selecione suas melhores fotos para exibir publicamente no seu site</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button key={cat} onClick={() => setSelectedCat(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCat === cat ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"}`}>
            {cat}
          </button>
        ))}
        <button className="px-4 py-2 rounded-full text-sm font-medium bg-secondary/50 text-muted-foreground hover:bg-secondary flex items-center gap-1">
          <Plus className="w-3 h-3" /> Nova categoria
        </button>
      </div>
      <div className="glass-card p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-square rounded-xl bg-secondary/50 border border-border overflow-hidden relative group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <div className="flex gap-2">
                  <button className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30"><Star className="w-3.5 h-3.5 text-white" /></button>
                  <button className="p-1.5 rounded-lg bg-white/20 hover:bg-red-500/60"><Trash2 className="w-3.5 h-3.5 text-white" /></button>
                </div>
              </div>
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <ImageIcon className="w-8 h-8" />
              </div>
            </div>
          ))}
          <div className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary flex items-center justify-center cursor-pointer transition-colors group">
            <div className="text-center">
              <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors mx-auto" />
              <p className="text-xs text-muted-foreground mt-2">Adicionar</p>
            </div>
          </div>
        </div>
      </div>
      <button onClick={() => toast.success("Portfólio salvo!")} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] flex items-center gap-2">
        <Save className="w-4 h-4" /> Salvar portfólio
      </button>
    </div>
  );
};

export default TabPortfolio;