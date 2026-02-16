interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-12 h-12",
};

export function LoadingSpinner({ size = "md", className = "" }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        className={`animate-spin ${sizeMap[size]}`}
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          className="opacity-20"
          cx="12"
          cy="12"
          r="10"
          stroke="url(#spinner-gradient)"
          strokeWidth="3"
        />
        <path
          className="opacity-80"
          fill="url(#spinner-gradient)"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
        <defs>
          <linearGradient id="spinner-gradient" x1="0" y1="0" x2="24" y2="24">
            <stop stopColor="#3B82F6" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner size="lg" />
    </div>
  );
}
