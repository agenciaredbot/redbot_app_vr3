export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-bg-primary" />
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-accent-purple/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-accent-blue/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-accent-cyan/5 rounded-full blur-[100px] animate-pulse" />
      </div>
      {children}
    </div>
  );
}
