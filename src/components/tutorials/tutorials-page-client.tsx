"use client";

import { useState, useEffect } from "react";

interface Tutorial {
  id: string;
  title: string;
  description: string | null;
  youtube_url: string | null;
  category: "general" | "premium";
  sort_order: number;
}

interface TutorialsPageClientProps {
  hasPremium: boolean;
}

/**
 * Extract YouTube video ID from various URL formats
 */
function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function VideoCard({ tutorial }: { tutorial: Tutorial }) {
  const videoId = tutorial.youtube_url
    ? getYouTubeId(tutorial.youtube_url)
    : null;

  return (
    <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl overflow-hidden hover:border-white/[0.15] transition-colors">
      {/* Video Embed or Placeholder */}
      <div className="aspect-video bg-black/20 relative">
        {videoId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
            title={tutorial.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <svg
                className="w-12 h-12 text-text-muted mx-auto mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"
                />
              </svg>
              <p className="text-xs text-text-muted">Próximamente</p>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-text-primary line-clamp-2">
          {tutorial.title}
        </h3>
        {tutorial.description && (
          <p className="text-xs text-text-muted mt-1.5 line-clamp-2">
            {tutorial.description}
          </p>
        )}
      </div>
    </div>
  );
}

function PremiumLockedCard() {
  return (
    <div className="bg-bg-glass backdrop-blur-xl border border-accent-purple/20 rounded-2xl overflow-hidden col-span-full">
      <div className="p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-accent-purple"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          Tutoriales Premium
        </h3>
        <p className="text-sm text-text-secondary max-w-md mx-auto">
          Accede a tutoriales exclusivos con estrategias avanzadas,
          analítica profunda y más. Disponible en los planes Power y Omni.
        </p>
        <div className="mt-4">
          <span className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-accent-purple/10 text-accent-purple border border-accent-purple/20">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
              />
            </svg>
            Actualizar plan
          </span>
        </div>
      </div>
    </div>
  );
}

export function TutorialsPageClient({ hasPremium }: TutorialsPageClientProps) {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTutorials() {
      try {
        const res = await fetch("/api/tutorials");
        if (res.ok) {
          const data = await res.json();
          setTutorials(data.tutorials);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchTutorials();
  }, []);

  const generalTutorials = tutorials.filter((t) => t.category === "general");
  const premiumTutorials = tutorials.filter((t) => t.category === "premium");

  if (loading) {
    return (
      <div className="text-center py-12 text-text-muted">
        Cargando tutoriales...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Tutoriales</h1>
        <p className="text-text-secondary mt-1">
          Aprende a usar Redbot con nuestros videos tutoriales
        </p>
      </div>

      {tutorials.length === 0 ? (
        <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl p-12 text-center">
          <svg
            className="w-12 h-12 text-text-muted mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"
            />
          </svg>
          <p className="text-text-muted">
            Aún no hay tutoriales disponibles. Pronto agregaremos contenido.
          </p>
        </div>
      ) : (
        <>
          {/* General Tutorials */}
          {generalTutorials.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold text-text-primary">
                  Tutoriales Generales
                </h2>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-accent-blue/15 text-accent-blue border border-accent-blue/30">
                  {generalTutorials.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {generalTutorials.map((t) => (
                  <VideoCard key={t.id} tutorial={t} />
                ))}
              </div>
            </div>
          )}

          {/* Premium Tutorials */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-text-primary">
                Tutoriales Premium
              </h2>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-accent-purple/15 text-accent-purple border border-accent-purple/30">
                {hasPremium ? premiumTutorials.length : "Bloqueado"}
              </span>
            </div>
            {hasPremium ? (
              premiumTutorials.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {premiumTutorials.map((t) => (
                    <VideoCard key={t.id} tutorial={t} />
                  ))}
                </div>
              ) : (
                <div className="bg-bg-glass backdrop-blur-xl border border-border-glass rounded-2xl p-8 text-center">
                  <p className="text-text-muted text-sm">
                    Aún no hay tutoriales premium disponibles.
                  </p>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1">
                <PremiumLockedCard />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
