import { Link } from "react-router-dom";
import { Instagram, Facebook, Youtube } from "lucide-react";

const Footer = () => (
  <footer className="bg-card border-t border-border mt-20">
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
        <div>
          <h4 className="font-bold text-foreground mb-4">Institucional</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/sobre" className="hover:text-primary transition-colors">O que é o VIUFOTO</Link></li>
            <li><Link to="/blog" className="hover:text-primary transition-colors">Blog</Link></li>
            <li><Link to="/" className="hover:text-primary transition-colors">Pacotes/Preços</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-foreground mb-4">Venda suas fotos</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/cadastro/fotografo" className="hover:text-primary transition-colors">Sou Fotógrafo</Link></li>
            <li><Link to="/para-organizadores" className="hover:text-primary transition-colors">Sou Organizador</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-foreground mb-4">Conta</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/meus-pedidos" className="hover:text-primary transition-colors">Meus pedidos</Link></li>
            <li><Link to="/login" className="hover:text-primary transition-colors">Login</Link></li>
          </ul>
          <div className="mt-4 pt-3 border-t border-border">
            <Link to="/login/fotografo" className="text-primary font-semibold text-sm hover:underline">
              📸 Fotógrafo parceiro — acessar painel
            </Link>
          </div>
        </div>
        <div>
          <h4 className="font-bold text-foreground mb-4">Ajuda</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/ajuda" className="hover:text-primary transition-colors">Contate-nos</Link></li>
            <li><Link to="/ajuda" className="hover:text-primary transition-colors">Central de ajuda</Link></li>
            <li><Link to="/" className="hover:text-primary transition-colors">Buscar fotos</Link></li>
            <li><Link to="/termos-de-uso" className="hover:text-primary transition-colors">Termos de Uso</Link></li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border">
        <div className="flex items-center gap-2 mb-4 md:mb-0">
          <img src="/__l5e/assets-v1/bd9d1a9c-c356-4e66-aee1-85f9deaec7f0/viufoto-logo.png" alt="ViuFoto" className="h-6 w-auto" draggable={false} />
          <span className="text-xs text-muted-foreground">© 2026 Todos os direitos reservados</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><Instagram className="w-5 h-5" /></a>
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><Facebook className="w-5 h-5" /></a>
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><Youtube className="w-5 h-5" /></a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
