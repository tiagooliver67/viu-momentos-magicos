import { useState, useRef, useEffect, memo } from "react";
import { Heart, Share2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface LazyPhotoCardProps {
  photoId: string;
  photoUrl: string;
  fallbackPhotoUrl?: string;
  isFav: boolean;
  onToggleFavorite: (id: string) => void;
  onClick: () => void;
  /** When true, image loads eagerly with high fetch priority (above-the-fold) */
  priority?: boolean;
  unavailableLabel?: string;
}

/**
 * Lazy-loaded photo card for gallery grid.
 * Watermark is baked into the image — no CSS overlay needed.
 */
const LazyPhotoCard = memo(({
  photoId,
  photoUrl,
  fallbackPhotoUrl,
  isFav,
  onToggleFavorite,
  onClick,
  priority = false,
  unavailableLabel = "Miniatura indisponível",
}: LazyPhotoCardProps) => {
  const [isVisible, setIsVisible] = useState(priority);
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(photoUrl);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentSrc(photoUrl);
    setLoaded(false);
    setHasError(false);
  }, [photoUrl, fallbackPhotoUrl]);

  useEffect(() => {
    if (priority) return;
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
  }, [priority]);

  return (
    <div
      ref={ref}
      className="relative group cursor-pointer rounded-lg overflow-hidden aspect-[3/4] bg-secondary/30"
    >
      {isVisible && currentSrc ? (
        <>
          {!loaded && !hasError && <Skeleton className="absolute inset-0 rounded-none" />}
          <div onClick={!hasError ? onClick : undefined} className="w-full h-full relative">
            {hasError ? (
              <div className="absolute inset-0 flex items-center justify-center bg-secondary/60 p-3 text-center">
                <span className="text-xs font-medium text-muted-foreground">{unavailableLabel}</span>
              </div>
            ) : (
              <img
                src={currentSrc}
                alt=""
                loading={priority ? "eager" : "lazy"}
                decoding="async"
                {...(priority ? { fetchPriority: "high" as any } : { fetchPriority: "low" as any })}
                onLoad={() => setLoaded(true)}
                onError={() => {
                  if (fallbackPhotoUrl && currentSrc !== fallbackPhotoUrl) {
                    setLoaded(false);
                    setCurrentSrc(fallbackPhotoUrl);
                    return;
                  }
                  setLoaded(true);
                  setHasError(true);
                }}
                className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
              />
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

          <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-all pointer-events-none" />
        </>
      ) : (
        <Skeleton className="w-full h-full rounded-none" />
      )}
    </div>
  );
});

LazyPhotoCard.displayName = "LazyPhotoCard";

export default LazyPhotoCard;
