import { useEffect, useState } from "react";
import viufotoLogo from "@/assets/viufoto-logo.png.asset.json";
import viufotoPlay from "@/assets/viufoto-play.png.asset.json";

const SESSION_KEY = "viufoto:logo-pulsed";

interface AnimatedLogoProps {
  className?: string;
}

/**
 * Logomarca oficial da ViuFoto com pulse discreto no play (Play Pulse).
 * A animação roda apenas uma vez por sessão de navegação (sessionStorage).
 */
const AnimatedLogo = ({ className = "h-6 sm:h-7" }: AnimatedLogoProps) => {
  const [shouldPulse, setShouldPulse] = useState(false);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(SESSION_KEY)) {
        setShouldPulse(true);
        sessionStorage.setItem(SESSION_KEY, "1");
      }
    } catch {
      // sessionStorage indisponível — não anima para evitar loop
    }
  }, []);

  return (
    <div className={`relative inline-block ${className}`} aria-label="ViuFoto">
      <img
        src={viufotoLogo.url}
        alt="ViuFoto"
        className="h-full w-auto block select-none animate-fade-in"
        draggable={false}
      />
      {/* Overlay do play alinhado ao símbolo dentro do wordmark (bbox: 42.4%-50.8% x 33.5%-84.8%) */}
      <img
        src={viufotoPlay.url}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={`absolute pointer-events-none select-none ${
          shouldPulse ? "animate-logo-play-pulse" : "opacity-0"
        }`}
        style={{
          left: "42.4%",
          top: "33.5%",
          width: "8.4%",
          height: "51.3%",
          transformOrigin: "center",
        }}
      />
    </div>
  );
};

export default AnimatedLogo;