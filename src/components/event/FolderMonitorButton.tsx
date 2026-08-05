import * as React from "react";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Upload, FolderSync, Info, AlertCircle, FileWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { useFolderMonitor } from "@/hooks/useFolderMonitor";
import { toast } from "sonner";

interface Props {
  onUploadClick: () => void;
  onFilesDetected: (files: File[]) => Promise<void>;
  type: "photos" | "videos";
  isUploading: boolean;
}

export function FolderMonitorButton({ onUploadClick, onFilesDetected, type, isUploading }: Props) {
  const [showNamingDialog, setShowNamingDialog] = React.useState(false);
  const [showHowItWorks, setShowHowItWorks] = React.useState(false);
  const [showCompatibility, setShowCompatibility] = React.useState(false);
  
  const monitor = useFolderMonitor({
    onFilesDetected,
    type,
    enabled: true
  });

  const handleStartMonitor = () => {
    setShowNamingDialog(true);
  };

  const confirmStartMonitor = () => {
    setShowNamingDialog(false);
    monitor.startMonitoring();
  };

  const label = type === "photos" ? "fotos" : "vídeos";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center">
        <div className="flex -space-x-px">
          <Button 
            onClick={onUploadClick}
            disabled={isUploading || monitor.isMonitoring}
            className="rounded-r-none h-11 px-6 font-bold"
          >
            <Upload className="w-4 h-4 mr-2" />
            Enviar {label}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="default"
                disabled={isUploading || monitor.isMonitoring}
                className="rounded-l-none h-11 px-2 border-l border-white/20"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={onUploadClick} className="gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                Carregar arquivos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleStartMonitor} className="gap-2 cursor-pointer">
                <FolderSync className="w-4 h-4" />
                Monitorar pasta
                <Badge variant="secondary" className="ml-auto text-[10px] bg-emerald-500 text-white border-none">NOVO</Badge>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowHowItWorks(true)} className="gap-2 cursor-pointer text-muted-foreground">
                <Info className="w-4 h-4" />
                Como funciona?
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowCompatibility(true)} className="gap-2 cursor-pointer text-muted-foreground">
                <AlertCircle className="w-4 h-4" />
                Compatibilidade
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {monitor.isMonitoring && (
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={monitor.stopMonitoring}
            className="ml-3 animate-pulse"
          >
            Parar Monitoramento
          </Button>
        )}
      </div>

      {monitor.isMonitoring && (
        <div className="mt-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <div className="mt-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Monitoramento Ativo: <span className="text-emerald-600 font-mono">{monitor.directoryName}</span></p>
              <p className="text-xs text-muted-foreground mt-1">
                Aguardando novos arquivos exportados pelo seu software de edição...
              </p>
              <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  <strong>Importante:</strong> Mantenha esta aba aberta e visível. Se você trocar de aba ou minimizar a janela, o envio pausa e retoma quando a aba voltar a ficar visível.
                </p>
              </div>
              
              {monitor.errorLog.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                    <FileWarning className="w-3 h-3" /> Log de Erros / Alertas
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1 pr-2">
                    {monitor.errorLog.map((log, i) => (
                      <div key={i} className="text-[10px] py-1 border-b border-border/40 flex justify-between gap-4">
                        <span className="text-destructive font-medium truncate">{log.name}</span>
                        <span className="text-muted-foreground shrink-0">{log.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={showNamingDialog} onOpenChange={setShowNamingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Monitoramento</DialogTitle>
            <DialogDescription>
              Como você deseja que os arquivos sejam salvos no evento?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-4">
            <Button variant="outline" onClick={confirmStartMonitor} className="justify-start h-14 px-4 text-left">
              <div className="flex flex-col">
                <span className="font-bold">Manter nomes originais</span>
                <span className="text-xs text-muted-foreground font-normal">Usa o nome exato gerado pelo software.</span>
              </div>
            </Button>
            <Button variant="outline" onClick={confirmStartMonitor} className="justify-start h-14 px-4 text-left">
              <div className="flex flex-col">
                <span className="font-bold">Renomear arquivos</span>
                <span className="text-xs text-muted-foreground font-normal">Aplica o padrão de nomenclatura do evento.</span>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showHowItWorks} onOpenChange={setShowHowItWorks}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Como funciona o Monitoramento?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">1</div>
              <p className="text-sm">Escolha a pasta no seu computador e autorize o navegador a observá-la durante esta sessão.</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</div>
              <p className="text-sm">Configure seu software (Lightroom, Capture One, etc.) para exportar os arquivos prontos direto nesta pasta.</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">3</div>
              <p className="text-sm">Cada imagem ou vídeo novo entra automaticamente no evento, com marca d'água e processamento em tempo real.</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowHowItWorks(false)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCompatibility} onOpenChange={setShowCompatibility}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compatibilidade do Navegador</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">O recurso de Monitoramento de Pasta utiliza a tecnologia <strong>File System Access API</strong>, disponível apenas em navegadores modernos de desktop.</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-bold text-center">Chrome (Desktop)</div>
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-bold text-center">Edge (Desktop)</div>
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-bold text-center">Opera (Desktop)</div>
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold text-center">Safari / Firefox (Incompatível)</div>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
              Dispositivos móveis (iOS/Android) não suportam essa funcionalidade por questões de segurança do sistema operacional.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowCompatibility(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
