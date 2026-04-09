import { useNavigate } from "react-router-dom";

const categories = [
  {
    id: "corrida_rua",
    label: "Corrida de Rua",
    emoji: "🏃",
    image: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400&q=70",
  },
  {
    id: "corrida_trilha",
    label: "Corrida de Trilha",
    emoji: "🌲",
    image: "https://images.unsplash.com/photo-1486218119243-13883505764c?w=400&q=70",
  },
  {
    id: "ciclismo",
    label: "Ciclismo",
    emoji: "🚴",
    image: "https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=400&q=70",
  },
  {
    id: "triathlon",
    label: "Triathlon",
    emoji: "🏅",
    image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&q=70",
  },
  {
    id: "futebol",
    label: "Futebol",
    emoji: "⚽",
    image: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400&q=70",
  },
  {
    id: "outros",
    label: "Outros",
    emoji: "📸",
    image: "https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=400&q=70",
  },
];

const SportCategoryFilter = () => {
  const navigate = useNavigate();

  const handleClick = (categoryId: string) => {
    navigate(`/buscar?categoria=${categoryId}`);
  };

  return (
    <section className="mb-14">
      <h2 className="text-2xl font-bold text-foreground mb-6">Explorar por modalidade</h2>
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleClick(cat.id)}
            className="group relative aspect-[3/4] sm:aspect-[3/4] rounded-2xl overflow-hidden transition-all hover:scale-[1.03] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <img
              src={cat.image}
              alt={cat.label}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3 text-center">
              <span className="text-2xl mb-1 block">{cat.emoji}</span>
              <span className="text-white text-xs sm:text-sm font-semibold leading-tight block">
                {cat.label}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default SportCategoryFilter;
