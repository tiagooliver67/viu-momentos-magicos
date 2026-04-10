const EventCardSkeleton = () => (
  <div className="overflow-hidden rounded-2xl bg-card border border-border/50">
    <div className="relative aspect-[4/3] shimmer-skeleton" />
    <div className="p-4 space-y-3">
      <div className="h-4 w-3/4 rounded shimmer-skeleton" />
      <div className="space-y-2">
        <div className="h-3 w-1/2 rounded shimmer-skeleton" />
        <div className="h-3 w-2/3 rounded shimmer-skeleton" />
      </div>
    </div>
  </div>
);

export default EventCardSkeleton;
