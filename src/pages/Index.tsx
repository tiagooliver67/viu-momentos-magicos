@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 4%;
    --foreground: 0 0% 95%;
    --card: 0 0% 7%;
    --card-foreground: 0 0% 95%;
    --popover: 0 0% 7%;
    --popover-foreground: 0 0% 95%;
    --primary: 18 100% 50%;
    --primary-foreground: 0 0% 100%;
    --secondary: 0 0% 12%;
    --secondary-foreground: 0 0% 95%;
    --muted: 0 0% 15%;
    --muted-foreground: 0 0% 55%;
    --accent: 186 100% 50%;
    --accent-foreground: 0 0% 4%;
    --lime: 82 100% 50%;
    --lime-foreground: 0 0% 4%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 0 0% 15%;
    --input: 0 0% 15%;
    --ring: 18 100% 50%;
    --radius: 0.75rem;

    /* Glassmorphism Avançado */
    --glass-bg: rgba(255, 255, 255, 0.06);
    --glass-border: rgba(255, 255, 255, 0.08);
    --glow-primary: 0 0 30px rgba(255, 77, 0, 0.3);
    --glow-accent: 0 0 30px rgba(0, 240, 255, 0.2);
  }

  .clean-theme {
    --background: 0 0% 98%;
    --foreground: 0 0% 12%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 12%;
    --glass-bg: rgba(0, 0, 0, 0.04);
    --glass-border: rgba(0, 0, 0, 0.09);
    --glow-primary: 0 0 30px rgba(255, 77, 0, 0.15);
  }

  * { @apply border-border; }

  body {
    @apply bg-background text-foreground font-sans antialiased;
    font-family: 'Inter', system-ui, sans-serif;
  }
}

@layer components {
  /* ==================== GLASSMORPHISM PREMIUM ==================== */
  .glass {
    background: var(--glass-bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border);
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.25),
      inset 0 1px 1px rgba(255, 255, 255, 0.1);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .glass-strong {
    background: var(--glass-bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border);
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.3),
      inset 0 1px 1px rgba(255, 255, 255, 0.1);
  }

  .glass-card {
    @apply glass rounded-3xl;
  }

  .glass-card-hover {
    @apply glass-card transition-all duration-400 hover:-translate-y-3 hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(255,77,0,0.25)];
  }

  /* Navbar Premium */
  nav {
    background: rgba(10, 10, 10, 0.85) !important;
    backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  }

  /* Neon & Glow */
  .glow-text {
    text-shadow: 0 0 30px #FF4D00,
                 0 0 60px #FF4D00;
  }

  .neon-border {
    box-shadow: 0 0 15px rgba(255, 77, 0, 0.3),
                inset 0 0 15px rgba(255, 77, 0, 0.1);
  }

  /* Badge AO VIVO mais premium */
  .badge-live {
    @apply inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest;
    background: rgba(255, 77, 0, 0.2);
    color: #FF4D00;
    border: 1px solid rgba(255, 77, 0, 0.4);
  }

  .badge-live::before {
    content: '';
    @apply w-2 h-2 rounded-full animate-pulse;
    background: #FF4D00;
    box-shadow: 0 0 12px #FF4D00;
  }

  /* Animações extras */
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-12px); }
  }
  .animate-float { animation: float 6s ease-in-out infinite; }
}

@layer utilities {
  .hero-parallax {
    transition: transform 0.1s ease-out;
  }
}