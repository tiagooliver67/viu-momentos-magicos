import { Camera } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-[70vh] sm:min-h-[85vh] flex items-center justify-center overflow-hidden pt-14 sm:pt-0">
      {/* IMAGEM */}
      <img
        src={heroBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover brightness-[0.7] contrast-[1.05] scale-[1.05]"
        width={1920}
        height={1080}
      />

      {/* OVERLAY */}
      <div className="absolute inset-0 bg-black/60" />

      {/* GRADIENTE */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-black/90" />

      {/* CONTEÚDO */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6 backdrop-blur-sm"
          style={{ animation: "fade-in-up 0.6s ease-out" }}
        >
          <Camera className="w-4 h-4" />
          Conectando atletas às suas melhores fotos.
        </div>

        {/* Headline */}
        <h1
          className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-white/95 leading-tight mb-6"
          style={{ animation: "fade-in-up 0.6s ease-out 0.1s", animationFillMode: "both" }}
        >
          Reviva seu momento. <br />
          <span className="text-primary shimmer-text">Encontre suas fotos agora.</span>
        </h1>

        {/* Sub */}
        <p
          className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto"
          style={{ animation: "fade-in-up 0.6s ease-out 0.2s", animationFillMode: "both" }}
        >
          Fotos e vídeos dos seus eventos esportivos, organizados e prontos para você.
        </p>
      </div>
    </section>
  );
};

export default HeroSection;
