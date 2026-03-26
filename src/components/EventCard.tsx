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
}

const EventCard = ({ id, title, date, location, photoCount, imageUrl, isLive }: EventCardProps) => (
  <Link to={`/evento/${id}`} className="glass-card-hover group block overflow-hidden">
    <div className="relative aspect-[4/3] overflow-hidden">
      <img
        src={imageUrl}
        alt={title}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
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
      <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">{title}</h3>
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
