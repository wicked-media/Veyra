export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-line" />
        <div className="h-7 w-64 animate-pulse rounded bg-line" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl border border-line bg-surface" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl border border-line bg-surface" />
    </div>
  );
}
