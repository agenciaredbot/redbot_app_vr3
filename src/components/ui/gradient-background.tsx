interface GradientBackgroundProps {
  themeMode?: string;
}

export function GradientBackground({ themeMode = "dark" }: GradientBackgroundProps) {
  const isLight = themeMode === "light";

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-bg-primary" />
      {isLight ? (
        <>
          <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-accent-purple/5 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-accent-blue/5 rounded-full blur-[120px] animate-pulse [animation-delay:1s]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-accent-cyan/[0.03] rounded-full blur-[100px] animate-pulse [animation-delay:0.5s]" />
        </>
      ) : (
        <>
          <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-accent-purple/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-accent-blue/10 rounded-full blur-[120px] animate-pulse [animation-delay:1s]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-accent-cyan/5 rounded-full blur-[100px] animate-pulse [animation-delay:0.5s]" />
        </>
      )}
    </div>
  );
}
