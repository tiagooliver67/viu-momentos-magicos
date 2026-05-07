import { useEffect, useRef, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Download, Sparkles, Camera as CameraIcon } from "lucide-react";
import { toast } from "sonner";

interface PromoArtModalProps {
  open: boolean;
  onClose: () => void;
  event: {
    id: string;
    name: string;
    event_date: string;
    event_time?: string | null;
    location: string;
    cover_url?: string | null;
  };
  photographerName?: string;
}

type Format = "story" | "feed";
type TemplateId =
  | "story-bold"        // Texto gigante atravessando a foto
  | "story-split"       // Foto em cima, painel colorido embaixo
  | "story-frame"       // Moldura com cantos vazados
  | "feed-magazine"     // Estilo revista, faixa lateral
  | "feed-polaroid"     // Foto polaroid sobre fundo gradiente
  | "feed-grid";        // Foto cobre tudo + tarja inferior

const FORMATS: Record<Format, { w: number; h: number; label: string }> = {
  story: { w: 1080, h: 1920, label: "Story 9:16" },
  feed: { w: 1080, h: 1350, label: "Feed 4:5" },
};

const TEMPLATES: { id: TemplateId; format: Format; label: string }[] = [
  { id: "story-bold", format: "story", label: "Bold Type" },
  { id: "story-split", format: "story", label: "Split Color" },
  { id: "story-frame", format: "story", label: "Edge Frame" },
  { id: "feed-magazine", format: "feed", label: "Magazine" },
  { id: "feed-polaroid", format: "feed", label: "Polaroid" },
  { id: "feed-grid", format: "feed", label: "Bottom Bar" },
];

const ACCENT_PRESETS = [
  { name: "Lima", color: "#C8FF00", text: "#000000" },
  { name: "Azul", color: "#2563EB", text: "#FFFFFF" },
  { name: "Coral", color: "#FF5A4D", text: "#FFFFFF" },
  { name: "Roxo", color: "#7C3AED", text: "#FFFFFF" },
  { name: "Preto", color: "#0A0A0A", text: "#FFFFFF" },
];

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const drawCover = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number, dy: number, dw: number, dh: number
) => {
  const ratio = Math.max(dw / img.width, dh / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  const x = dx + (dw - w) / 2;
  const y = dy + (dh - h) / 2;
  ctx.drawImage(img, x, y, w, h);
};

const formatDate = (iso: string, time?: string | null) => {
  const d = new Date(iso);
  const date = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  return time ? `${date} • ${time.slice(0, 5)}` : date;
};

const PromoArtModal = ({ open, onClose, event, photographerName }: PromoArtModalProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [template, setTemplate] = useState<TemplateId>("story-bold");
  const [accent, setAccent] = useState(ACCENT_PRESETS[0]);
  const [showPhotographer, setShowPhotographer] = useState(true);
  const [showLocation, setShowLocation] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [customCta, setCustomCta] = useState("Suas fotos estão no ar!");
  const [busy, setBusy] = useState(false);

  const tplDef = useMemo(() => TEMPLATES.find(t => t.id === template)!, [template]);
  const dim = FORMATS[tplDef.format];

  const render = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = dim.w;
    canvas.height = dim.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setBusy(true);
    try {
      const cover = event.cover_url ? await loadImage(event.cover_url).catch(() => null) : null;
      ctx.fillStyle = "#0A0A0A";
      ctx.fillRect(0, 0, dim.w, dim.h);

      const url = `viufoto.com/evento/${event.id.slice(0, 8)}`;
      const dateStr = formatDate(event.event_date, event.event_time);

      switch (template) {
        case "story-bold": {
          if (cover) drawCover(ctx, cover, 0, 0, dim.w, dim.h);
          // dim overlay
          const grad = ctx.createLinearGradient(0, 0, 0, dim.h);
          grad.addColorStop(0, "rgba(0,0,0,0.55)");
          grad.addColorStop(0.5, "rgba(0,0,0,0.15)");
          grad.addColorStop(1, "rgba(0,0,0,0.85)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, dim.w, dim.h);

          // big title
          ctx.fillStyle = accent.color;
          ctx.font = "900 220px Inter, system-ui, sans-serif";
          ctx.textAlign = "left";
          ctx.fillText("FOTOS", 60, 1100);
          ctx.fillStyle = "#FFFFFF";
          ctx.fillText("NO AR", 60, 1300);

          // CTA strip
          ctx.fillStyle = accent.color;
          ctx.fillRect(0, 1380, dim.w, 90);
          ctx.fillStyle = accent.text;
          ctx.font = "700 38px Inter, system-ui, sans-serif";
          ctx.fillText(customCta.toUpperCase(), 60, 1438);

          // Event name
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "800 56px Inter, system-ui, sans-serif";
          wrapText(ctx, event.name, 60, 1560, dim.w - 120, 64);

          drawTopChip(ctx, photographerName, showPhotographer, accent);
          drawBottomMeta(ctx, { url, dateStr, location: event.location, showDate, showLocation });
          break;
        }
        case "story-split": {
          // Top: photo
          if (cover) drawCover(ctx, cover, 0, 0, dim.w, 1100);
          // Bottom: solid color block
          ctx.fillStyle = accent.color;
          ctx.fillRect(0, 1100, dim.w, dim.h - 1100);
          // Diagonal accent stripe
          ctx.fillStyle = "#0A0A0A";
          ctx.beginPath();
          ctx.moveTo(0, 1100);
          ctx.lineTo(dim.w, 1100);
          ctx.lineTo(dim.w, 1180);
          ctx.lineTo(0, 1240);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = accent.text;
          ctx.font = "900 140px Inter, sans-serif";
          ctx.textAlign = "left";
          ctx.fillText("FOTOS", 60, 1430);
          ctx.fillText("DISPONÍVEIS", 60, 1570);

          ctx.font = "600 42px Inter, sans-serif";
          wrapText(ctx, event.name, 60, 1670, dim.w - 120, 50);

          ctx.font = "500 34px Inter, sans-serif";
          if (showDate) ctx.fillText(`📅  ${dateStr}`, 60, 1790);
          if (showLocation) ctx.fillText(`📍  ${event.location}`, 60, 1840);

          drawTopChip(ctx, photographerName, showPhotographer, accent);
          // bottom URL bar
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(60, dim.h - 130, dim.w - 120, 80);
          ctx.fillStyle = "#0A0A0A";
          ctx.font = "800 36px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(url.toUpperCase(), dim.w / 2, dim.h - 78);
          break;
        }
        case "story-frame": {
          // Solid accent bg
          ctx.fillStyle = accent.color;
          ctx.fillRect(0, 0, dim.w, dim.h);
          // Photo inside frame
          if (cover) drawCover(ctx, cover, 80, 280, dim.w - 160, 1280);
          // Top label
          ctx.fillStyle = accent.text;
          ctx.font = "800 40px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`★  ${customCta.toUpperCase()}  ★`, dim.w / 2, 200);

          // Bottom info
          ctx.fillStyle = accent.text;
          ctx.textAlign = "center";
          ctx.font = "900 84px Inter, sans-serif";
          wrapText(ctx, event.name.toUpperCase(), 80, 1680, dim.w - 160, 90, "center");
          ctx.font = "500 36px Inter, sans-serif";
          if (showDate) ctx.fillText(dateStr, dim.w / 2, 1820);
          if (showLocation) ctx.fillText(event.location, dim.w / 2, 1870);

          drawTopChip(ctx, photographerName, showPhotographer, { color: "#0A0A0A", text: "#FFFFFF" });
          drawUrlPill(ctx, url, dim.w / 2, dim.h - 90, "#0A0A0A", "#FFFFFF");
          break;
        }
        case "feed-magazine": {
          // White bg
          ctx.fillStyle = "#FAFAFA";
          ctx.fillRect(0, 0, dim.w, dim.h);
          // Right photo (60% width)
          if (cover) drawCover(ctx, cover, dim.w * 0.4, 0, dim.w * 0.6, dim.h);
          // Left panel
          ctx.fillStyle = accent.color;
          ctx.fillRect(0, 0, dim.w * 0.4, dim.h);

          ctx.fillStyle = accent.text;
          ctx.textAlign = "left";
          ctx.font = "600 22px Inter, sans-serif";
          ctx.fillText("VIUFOTO  ◆  EDIÇÃO ESPECIAL", 50, 80);

          ctx.font = "900 96px Inter, sans-serif";
          wrapText(ctx, "FOTOS NO AR", 50, 280, dim.w * 0.4 - 100, 100);

          ctx.font = "700 28px Inter, sans-serif";
          wrapText(ctx, event.name, 50, dim.h * 0.55, dim.w * 0.4 - 100, 36);

          ctx.font = "500 22px Inter, sans-serif";
          let y = dim.h * 0.55 + 120;
          if (showDate) { ctx.fillText(dateStr, 50, y); y += 36; }
          if (showLocation) { ctx.fillText(event.location, 50, y); y += 36; }
          if (showPhotographer && photographerName) {
            y += 20;
            ctx.font = "600 20px Inter, sans-serif";
            ctx.fillText(`📷  ${photographerName}`, 50, y);
          }

          // bottom URL
          ctx.fillStyle = accent.text;
          ctx.fillRect(0, dim.h - 100, dim.w * 0.4, 100);
          ctx.fillStyle = accent.color;
          ctx.font = "800 26px Inter, sans-serif";
          ctx.fillText(url.toUpperCase(), 50, dim.h - 50);
          break;
        }
        case "feed-polaroid": {
          // gradient bg
          const g = ctx.createLinearGradient(0, 0, dim.w, dim.h);
          g.addColorStop(0, accent.color);
          g.addColorStop(1, "#0A0A0A");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, dim.w, dim.h);

          // Polaroid frame
          const px = 120, py = 140, pw = dim.w - 240, ph = pw;
          ctx.save();
          ctx.translate(dim.w / 2, py + ph / 2 + 40);
          ctx.rotate(-3 * Math.PI / 180);
          ctx.translate(-dim.w / 2, -(py + ph / 2 + 40));
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(px, py, pw, ph + 180);
          if (cover) drawCover(ctx, cover, px + 30, py + 30, pw - 60, ph - 60);
          ctx.fillStyle = "#0A0A0A";
          ctx.font = "700 40px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("FOTOS NO AR ✨", dim.w / 2, py + ph + 100);
          ctx.restore();

          // Bottom info
          ctx.fillStyle = "#FFFFFF";
          ctx.textAlign = "center";
          ctx.font = "800 56px Inter, sans-serif";
          wrapText(ctx, event.name, 80, dim.h - 280, dim.w - 160, 64, "center");
          ctx.font = "500 28px Inter, sans-serif";
          if (showDate) ctx.fillText(dateStr, dim.w / 2, dim.h - 200);
          if (showLocation) ctx.fillText(event.location, dim.w / 2, dim.h - 160);

          drawUrlPill(ctx, url, dim.w / 2, dim.h - 80, "#FFFFFF", accent.color);
          break;
        }
        case "feed-grid": {
          if (cover) drawCover(ctx, cover, 0, 0, dim.w, dim.h);
          // dark gradient bottom
          const g = ctx.createLinearGradient(0, dim.h * 0.4, 0, dim.h);
          g.addColorStop(0, "rgba(0,0,0,0)");
          g.addColorStop(1, "rgba(0,0,0,0.92)");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, dim.w, dim.h);

          // accent vertical bar
          ctx.fillStyle = accent.color;
          ctx.fillRect(60, dim.h - 380, 12, 280);

          ctx.fillStyle = "#FFFFFF";
          ctx.textAlign = "left";
          ctx.font = "600 24px Inter, sans-serif";
          ctx.fillText(customCta.toUpperCase(), 100, dim.h - 340);

          ctx.font = "900 72px Inter, sans-serif";
          wrapText(ctx, event.name, 100, dim.h - 250, dim.w - 200, 78);

          ctx.font = "500 28px Inter, sans-serif";
          let y = dim.h - 130;
          const parts: string[] = [];
          if (showDate) parts.push(dateStr);
          if (showLocation) parts.push(event.location);
          ctx.fillText(parts.join("  •  "), 100, y);

          drawTopChip(ctx, photographerName, showPhotographer, accent);
          drawUrlPill(ctx, url, dim.w / 2, dim.h - 50, accent.color, accent.text);
          break;
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar arte");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (open) render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, template, accent, showPhotographer, showLocation, showDate, customCta]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `viufoto-${template}-${event.id.slice(0, 8)}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Arte baixada! ✅");
    }, "image/png", 0.95);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Arte de Divulgação
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-6">
          {/* PREVIEW */}
          <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-center min-h-[500px] relative">
            {busy && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10 rounded-xl">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="max-h-[70vh] w-auto rounded-lg shadow-2xl bg-black"
              style={{ maxWidth: "100%", aspectRatio: `${dim.w}/${dim.h}` }}
            />
          </div>

          {/* CONTROLS */}
          <div className="space-y-5">
            {/* Templates */}
            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground mb-2 block">
                Modelo
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(t.id)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      template === t.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div
                      className="bg-muted rounded mb-1.5 mx-auto"
                      style={{
                        aspectRatio: t.format === "story" ? "9/16" : "4/5",
                        width: t.format === "story" ? "60%" : "80%",
                      }}
                    />
                    <p className="text-[10px] font-semibold text-foreground leading-tight">{t.label}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">{t.format}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Cor de destaque */}
            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground mb-2 block">
                Cor de destaque
              </Label>
              <div className="flex gap-2">
                {ACCENT_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => setAccent(p)}
                    className={`w-9 h-9 rounded-full border-2 transition-all ${
                      accent.name === p.name ? "border-foreground scale-110" : "border-border"
                    }`}
                    style={{ background: p.color }}
                    title={p.name}
                  />
                ))}
              </div>
            </div>

            {/* CTA */}
            <div>
              <Label htmlFor="cta" className="text-xs font-bold uppercase text-muted-foreground">
                Frase de chamada
              </Label>
              <Input
                id="cta"
                value={customCta}
                onChange={(e) => setCustomCta(e.target.value)}
                maxLength={40}
                className="mt-1"
              />
            </div>

            {/* Toggles */}
            <div className="space-y-3 rounded-xl border border-border p-3">
              <ToggleRow label="Nome do fotógrafo" value={showPhotographer} onChange={setShowPhotographer} />
              <ToggleRow label="Data do evento" value={showDate} onChange={setShowDate} />
              <ToggleRow label="Local" value={showLocation} onChange={setShowLocation} />
            </div>

            <Button onClick={handleDownload} disabled={busy} className="w-full h-12 text-base font-bold">
              <Download className="w-5 h-5 mr-2" />
              Baixar Arte (PNG)
            </Button>
            <p className="text-[11px] text-center text-muted-foreground">
              Imagem em alta qualidade, pronta para Instagram, WhatsApp e redes sociais.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ToggleRow = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-foreground">{label}</span>
    <Switch checked={value} onCheckedChange={onChange} />
  </div>
);

/* helpers */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: CanvasTextAlign = "left"
) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  ctx.textAlign = align;
  const drawX = align === "center" ? x + maxWidth / 2 : x;
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + " ";
    if (ctx.measureText(test).width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), drawX, yy);
      line = words[i] + " ";
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), drawX, yy);
}

function drawTopChip(
  ctx: CanvasRenderingContext2D,
  name: string | undefined,
  show: boolean,
  accent: { color: string; text: string }
) {
  if (!show || !name) return;
  ctx.fillStyle = accent.color;
  const padX = 30, padY = 18;
  ctx.font = "700 28px Inter, sans-serif";
  const label = `📷 ${name}`;
  const w = ctx.measureText(label).width + padX * 2;
  const x = 60, y = 60;
  roundRect(ctx, x, y, w, 60, 30);
  ctx.fill();
  ctx.fillStyle = accent.text;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + padX, y + 30);
  ctx.textBaseline = "alphabetic";
}

function drawBottomMeta(
  ctx: CanvasRenderingContext2D,
  o: { url: string; dateStr: string; location: string; showDate: boolean; showLocation: boolean }
) {
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "500 32px Inter, sans-serif";
  ctx.textAlign = "left";
  let y = 1640;
  if (o.showDate) { ctx.fillText(`📅  ${o.dateStr}`, 60, y); y += 46; }
  if (o.showLocation) ctx.fillText(`📍  ${o.location}`, 60, y);
  drawUrlPill(ctx, o.url, ctx.canvas.width / 2, ctx.canvas.height - 80, "#FFFFFF", "#0A0A0A");
}

function drawUrlPill(
  ctx: CanvasRenderingContext2D,
  url: string,
  cx: number,
  cy: number,
  bg: string,
  fg: string
) {
  ctx.font = "800 32px Inter, sans-serif";
  const text = url.toUpperCase();
  const padX = 36, h = 64;
  const w = ctx.measureText(text).width + padX * 2;
  ctx.fillStyle = bg;
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy);
  ctx.textBaseline = "alphabetic";
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default PromoArtModal;