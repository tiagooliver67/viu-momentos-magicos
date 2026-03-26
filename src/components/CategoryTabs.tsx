import { useState } from "react";

const categories = [
  { id: "corrida", label: "Corrida de Rua", icon: "🏃" },
  { id: "ciclismo", label: "Ciclismo", icon: "🚴" },
  { id: "triathlon", label: "Triathlon", icon: "🏊" },
  { id: "futebol", label: "Futebol", icon: "⚽" },
  { id: "treinos", label: "Treinos", icon: "💪" },
  { id: "trail", label: "Trail Run", icon: "🏔️" },
  { id: "natacao", label: "Natação", icon: "🏊‍♂️" },
  { id: "crossfit", label: "CrossFit", icon: "🏋️" },
];

interface CategoryTabsProps {
  onSelect?: (id: string) => void;
}

const CategoryTabs = ({ onSelect }: CategoryTabsProps) => {
  const [active, setActive] = useState("corrida");

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => { setActive(cat.id); onSelect?.(cat.id); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
            active === cat.id
              ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(255,77,0,0.3)]"
              : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
          }`}
        >
          <span className="text-base">{cat.icon}</span>
          {cat.label}
        </button>
      ))}
    </div>
  );
};

export default CategoryTabs;
