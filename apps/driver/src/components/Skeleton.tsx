export function StoreCardSkeleton() {
  return (
    <div className="card">
      <div className="flex gap-3">
        <div className="skeleton w-20 h-20 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-3 w-1/2" />
          <div className="skeleton h-3 w-2/3" />
        </div>
      </div>
    </div>
  );
}

export function StoreListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <StoreCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="skeleton aspect-square w-full" />
      <div className="p-3 space-y-2">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/3" />
      </div>
    </div>
  );
}
