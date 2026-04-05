import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import EventCard from "@/components/EventCard";
import Footer from "@/components/Footer";
import { useRef } from "react";

const mockEvents = [
  {
    id: "1",
    title: "VERÃO RUN IRECÊ 2026",
    date: "22/03/2026",
    location: "Irecê, BA",
    photoCount: 2615,
    imageUrl: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&q=80",
    isLive: true,
  },
  {
    id: "2",
    title: "CORRIDA DO SIMTRANS",
    date: "24/03/2026",
    location: "Salvador, BA",
    photoCount: 1830,
    imageUrl: "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=600&q=80",
  },
  {
    id: "3",
    title: "IL RUN EXPERIENCE",
    date: "22/03/2026",
    location: "Vitória da Conquista, BA",
    photoCount: 3200,
    imageUrl: "https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=600&q=80",
  },
  {
    id: "4",
    title: "CORRIDA TRILHA",
    date: "22/03/2026",
    location: "Alagoinhas, BA",
    photoCount: 945,
    imageUrl: "https://images.unsplash.com/photo-1486218119243-13883505764c?w=600&q=80",
  },
];

const mockCycling = [
  {
    id: "5",
    title: "Tic Tac e Tri Swim",
    date: "18/03/2026",
    location: "Salvador, BA",
    photoCount: 1200,
    imageUrl: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&q=80",
  },
  {
    id: "6",
    title: "DMTB 26 DESAFIO",
    date: "10/03/2026",
    location: "Mato de São João, BA",
    photoCount: 890,
    imageUrl: "https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=600&q=80",
  },
];

const Index = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const categories = [
    "Corrida",
    "Ciclismo",
    "Triathlon",
    "Futebol",
    "Treinos",
    "Natação",
    "Crossfit",
    "Trail Run",
    "Duathlon",
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />

      <div className="container mx-auto px-4 -mt-10 relative z-10">
        {/* 🔥 CATEGORIAS COM SCROLL */}
        <div className="relative mt-8 mb-12">
          {/* esquerda */}
          <button
            onClick={() => scrollRef.current?.scrollBy({ left: -200, behavior: "smooth" })}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur px-2 py-1 rounded-lg border border-border"
          >
            ←
          </button>

          {/* lista */}
          <div ref={scrollRef} className="flex gap-8 overflow-x-auto no-scrollbar px-10 text-sm">
            {categories.map((item) => (
              <span key={item} className="category-item whitespace-nowrap font-medium">
                {item}
              </span>
            ))}
          </div>

          {/* direita */}
          <button
            onClick={() => scrollRef.current?.scrollBy({ left: 200, behavior: "smooth" })}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur px-2 py-1 rounded-lg border border-border"
          >
            →
          </button>
        </div>

        {/* Corrida */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Corrida de Rua</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Bahia</span>
              <button className="text-sm text-primary hover:underline">Todos os eventos</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {mockEvents.map((event) => (
              <EventCard key={event.id} {...event} />
            ))}
          </div>
        </section>

        {/* Ciclismo */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Ciclismo</h2>
            <button className="text-sm text-primary hover:underline">Todos os eventos</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {mockCycling.map((event) => (
              <EventCard key={event.id} {...event} />
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default Index;
