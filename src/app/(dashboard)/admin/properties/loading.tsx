export default function PropertiesLoading() {
  return (
    <div>
      <div className="h-8 w-48 bg-white/[0.05] rounded-lg animate-pulse mb-6" />
      <div className="rounded-2xl border border-border-glass bg-bg-glass overflow-hidden">
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-center">
              <div className="h-4 flex-1 bg-white/[0.05] rounded animate-pulse" />
              <div className="h-4 w-24 bg-white/[0.05] rounded animate-pulse" />
              <div className="h-4 w-20 bg-white/[0.05] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
