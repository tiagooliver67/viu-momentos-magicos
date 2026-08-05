import React from "react";
import { cn } from "@/lib/utils";

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
}

/**
 * H1 para páginas internas do Dashboard.
 * Padronizado conforme auditoria: 30px (text-3xl) | Bold (700) | Gray-900 (#111827)
 */
export const PageTitle = ({ children, className, ...props }: TypographyProps) => (
  <h1 
    className={cn("text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight", className)} 
    {...props}
  >
    {children}
  </h1>
);

/**
 * Subtexto logo abaixo do H1.
 * Padronizado conforme auditoria: 14px (text-sm) | Normal (400) | Gray-500 (#6B7280)
 */
export const PageSubtitle = ({ children, className, ...props }: TypographyProps) => (
  <p 
    className={cn("text-sm text-muted-foreground", className)} 
    {...props}
  >
    {children}
  </p>
);

/**
 * H2 para divisões de seção.
 * Padronizado conforme auditoria: 24px (text-2xl) | Bold (700) | Gray-900 (#111827)
 */
export const SectionTitle = ({ children, className, ...props }: TypographyProps) => (
  <h2 
    className={cn("text-xl sm:text-2xl font-bold tracking-tight text-foreground", className)} 
    {...props}
  >
    {children}
  </h2>
);

/**
 * H3 para títulos de cards ou subseções.
 * Padronizado conforme auditoria: 18px (text-lg) | Bold (700) | Gray-900 (#111827)
 */
export const CardTitle = ({ children, className, ...props }: TypographyProps) => (
  <h3 
    className={cn("text-base sm:text-lg font-bold text-foreground", className)} 
    {...props}
  >
    {children}
  </h3>
);

/**
 * Texto secundário/apoio.
 * Padronizado conforme auditoria: 12px (text-xs) | Medium (500) | Gray-500 (#6B7280)
 */
export const Caption = ({ children, className, ...props }: TypographyProps) => (
  <span 
    className={cn("text-xs font-medium text-muted-foreground leading-normal", className)} 
    {...props}
  >
    {children}
  </span>
);
