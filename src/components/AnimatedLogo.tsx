import React from "react";
import viufotoLogoLight from "@/assets/viufoto-logo-light.png.asset.json";
import viufotoLogoDark from "@/assets/viufoto-logo-dark.png.asset.json";

interface AnimatedLogoProps {
  className?: string;
}

/**
 * Logomarca oficial da ViuFoto.
 * Swap automático entre versão para fundo claro (padrão) e fundo escuro (.dark-theme),
 * controlado por CSS em src/index.css.
 */
const AnimatedLogo = React.forwardRef<HTMLSpanElement, AnimatedLogoProps>(
  ({ className = "h-6 sm:h-7" }, ref) => {
    return (
      <span ref={ref} className={`relative inline-block ${className}`} aria-label="ViuFoto">
        <img
          src={viufotoLogoLight.url}
          alt="ViuFoto"
          draggable={false}
          className="viufoto-logo-light h-full w-auto block select-none animate-fade-in"
        />
        <img
          src={viufotoLogoDark.url}
          alt="ViuFoto"
          draggable={false}
          className="viufoto-logo-dark h-full w-auto hidden select-none animate-fade-in"
        />
      </span>
    );
  }
);

AnimatedLogo.displayName = "AnimatedLogo";

export default AnimatedLogo;