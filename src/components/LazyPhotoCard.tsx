import { useState, useRef, useEffect, memo } from "react";
import { Heart, Share2 } from "lucide-react";
import { toast } from "sonner";
import ProcessingPlaceholder from "@/components/ProcessingPlaceholder";

interface LazyPhotoCardProps {
  photoId: string;
  photoUrl: string;
  isFav: boolean;
  onToggleFavorite: (id: string) => void;
  onClick: () => void;
  /** When true, image loads eagerly with high fetch priority (above-the-fold) */
  priority?: boolean;
}

/**
 * Lazy-loaded photo card for gallery grid.
 * Watermark is baked into the image — no CSS overlay needed.
 */
const LazyPhotoCard = memo(({
  photoId,
  photoUrl,
  isFav,
  onToggleFavorite,
  onClick,
  priority = false,
}: LazyPhotoCardProps) => {
  const [isVisible, setIsVisible] = useState(priority);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [photoUrl]);

  return (
    <div
      ref={ref}
      className="relative group cursor-pointer rounded-lg overflow-hidden aspect-[3/4] bg-secondary/30"
    >
      {isVisible ? (
        <>
          {(!loaded || errored || !photoUrl) && <ProcessingPlaceholder variant="watermark" />}
          <div onClick={onClick} className="w-full h-full relative">
            {photoUrl && !errored && (
              <img
                src={photoUrl}
                alt=""
                loading={priority ? "eager" : "lazy"}
                decoding="async"
                {...(priority ? { fetchPriority: "high" as any } : { fetchPriority: "low" as any })}
                onLoad={() => setLoaded(true)}
                onError={() => setErrored(true)}
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
        <ProcessingPlaceholder variant="watermark" />
      )}
    </div>
  );
});

LazyPhotoCard.displayName = "LazyPhotoCard";

export default LazyPhotoCard;
