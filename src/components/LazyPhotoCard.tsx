import { useState, useRef, useEffect, memo } from "react";
import { Heart, Share2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface LazyPhotoCardProps {
  photoId: string;
  photoUrl: string;
  watermarkText: string;
  isFav: boolean;
  onToggleFavorite: (id: string) => void;
  onClick: () => void;
  price: number;
}

const LazyPhotoCard = memo(({ photoId, photoUrl, watermarkText, isFav, onToggleFavorite, onClick, price }: LazyPhotoCardProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative group cursor-pointer rounded-lg overflow-hidden aspect-[3/4] bg-secondary/30"
    >
      {isVisible && photoUrl ? (
        <>
          {!loaded && (
            <Skeleton className="absolute inset-0 rounded-none" />
          )}
          <div onClick={onClick} className="w-full h-full relative">
            <img
              src={photoUrl}
              alt=""
              loading="lazy"
              onLoad={() => setLoaded(true)}
              className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
            />
            {/* CSS watermark overlay — much lighter than canvas */}
            {loaded && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" aria-hidden="true">
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    background: `repeating-linear-gradient(
                      -30deg,
                      transparent,
                      transparent 60px,
                      rgba(255,255,255,0.03) 60px,
                      rgba(255,255,255,0.03) 61px
                    )`,
                  }}
                >
                  {/* Watermark text tiles */}
                  <div
                    className="absolute inset-0"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, 120px)",
                      gridTemplateRows: "repeat(auto-fill, 80px)",
                      gap: "20px",
                      padding: "10px",
                      transform: "rotate(-25deg) scale(1.5)",
                      transformOrigin: "center",
                    }}
                  >
                    {Array.from({ length: 20 }).map((_, i) => (
                      <span
                        key={i}
                        className="text-white/20 font-bold text-xs whitespace-nowrap select-none"
                        style={{ fontSize: "11px", letterSpacing: "1px" }}
                      >
                        {watermarkText}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="absolute top-2 right-2 flex gap-1.5 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const url = `${window.location.origin}/foto/${photoId}`;
                navigator.clipboard.writeText(url);
                toast.success("Link copiado!");
              }}
              className="p-2 rounded-full bg-black/40 text-white/80 hover:bg-black/60 backdrop-blur-sm transition-all transform active:scale-90"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(photoId);
                toast.success(isFav ? "Removido dos favoritos" : "Adicionado aos favoritos ❤️");
              }}
              className={`p-2 rounded-full backdrop-blur-sm transition-all transform active:scale-90 ${
                isFav
                  ? "bg-red-500/80 text-white shadow-lg shadow-red-500/30"
                  : "bg-black/40 text-white/80 hover:bg-black/60 hover:text-white"
              }`}
            >
              <Heart className={`w-4 h-4 transition-all ${isFav ? "fill-current scale-110" : ""}`} />
            </button>
          </div>

          <div className="absolute inset-0 bg-background/0 group-hover:bg-background/40 transition-all flex items-end p-2 pointer-events-none">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity w-full">
              <span className="text-primary font-bold text-xs bg-background/80 px-2 py-1 rounded">
                R$ {price.toFixed(2)}
              </span>
            </div>
          </div>
        </>
      ) : (
        <Skeleton className="w-full h-full rounded-none" />
      )}
    </div>
  );
});

LazyPhotoCard.displayName = "LazyPhotoCard";

export default LazyPhotoCard;
