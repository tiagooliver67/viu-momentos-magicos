import { MapPin, Calendar, Camera } from "lucide-react";
import { Link } from "react-router-dom";

interface EventCardProps {
  id: string;
  title: string;
  date: string;
  location: string;
  photoCount: number;
  imageUrl: string;
  isLive?: boolean;
  index?: number;
}

const EventCard = ({ id, title, date, location, photoCount, imageUrl, isLive, index = 0 }: EventCardProps) => (
  <Link
    to={`/evento/${id}`}
    className="group block overflow-hidden rounded-2xl bg-card border border-border/50 card-hover-premium"
    style={{
      animationDelay: `${index * 80}ms`,
    }}
  >
    <div className="relative aspect-[4/3] overflow-hidden">
      <img
        src={imageUrl}
        alt={title}
        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
      {isLive && (
        <div className="absolute top-3 left-3">
          <span className="badge-live">AO VIVO</span>
        </div>
      )}
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs text-foreground/80">
        <Camera className="w-3.5 h-3.5" />
        <span>{photoCount.toLocaleString("pt-BR")} fotos</span>
      </div>
    </div>
    <div className="p-4">
      <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors duration-200">{title}</h3>
      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span>{date}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span>{location}</span>
        </div>
      </div>
    </div>
  </Link>
);

export default EventCard;
