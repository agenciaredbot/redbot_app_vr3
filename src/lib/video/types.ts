/**
 * Video Creation Types — Revid AI API v3
 *
 * Types for the Revid video rendering integration.
 * Revid API docs: https://documenter.getpostman.com/view/36975521/2sBXcGEfaB
 */

// ── Revid API types ──

export type RevidWorkflow =
  | "script-to-video"
  | "ad-generator"
  | "prompt-to-video";

export type VideoProjectStatus =
  | "pending"
  | "rendering"
  | "completed"
  | "failed";

export interface RevidMediaItem {
  url: string;
  title: string;
  type: "image" | "video";
}

export interface RevidRenderPayload {
  webhookUrl?: string;
  workflow: RevidWorkflow;
  source?: {
    text?: string;
    prompt?: string;
    durationSeconds?: number;
  };
  media?: {
    type: "custom" | "moving-image" | "stock-video" | "ai-video";
    quality?: "pro" | "ultra";
    density?: "low" | "medium" | "high";
    animation?: "none" | "soft" | "dynamic" | "depth";
    useOnlyProvided?: boolean;
    turnImagesIntoVideos?: boolean;
    provided?: RevidMediaItem[];
  };
  voice?: {
    enabled: boolean;
    voiceId?: string;
    stability?: number;
    speed?: number;
  };
  captions?: {
    enabled: boolean;
    preset?: string;
    position?: "top" | "middle" | "bottom";
  };
  music?: {
    trackName?: string;
    enabled?: boolean;
  };
  aspectRatio?: string;
}

export interface RevidRenderResponse {
  success?: number;
  pid: string;
  workflow?: string;
  webhookUrl?: string;
  [key: string]: unknown;
}

export interface RevidStatusResponse {
  success?: number;
  pid?: string;
  status: string;           // "building" | "ready" | "failed"
  videoUrl?: string;         // CDN URL when ready
  creditsConsumed?: number;
  error?: string;
  [key: string]: unknown;
}

export interface RevidCreditEstimate {
  credits: number;
  breakdown?: Record<string, number>;
  [key: string]: unknown;
}

// ── DB row type ──

export interface VideoProject {
  id: string;
  organization_id: string;
  property_id: string;
  revid_project_id: string | null;
  revid_status: VideoProjectStatus;
  revid_video_url: string | null;
  revid_thumbnail_url: string | null;
  workflow: RevidWorkflow;
  script: string;
  images_used: string[];
  voice_id: string | null;
  music_track: string | null;
  aspect_ratio: string;
  credits_used: number | null;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
}

// ── Client request types ──

export interface CreateVideoRequest {
  propertyId: string;
  workflow: RevidWorkflow;
  script: string;
  imageUrls: string[];
  voiceId?: string;
  musicTrack?: string;
  aspectRatio?: string;
}

export interface VideoPreset {
  id: string;
  label: string;
  description: string;
  workflow: RevidWorkflow;
  icon: string;
}

// ── Presets for real estate ──

export const VIDEO_PRESETS: VideoPreset[] = [
  {
    id: "showcase",
    label: "Vitrina",
    description:
      "Video de presentación con las fotos de tu propiedad, narración y música.",
    workflow: "script-to-video",
    icon: "🏠",
  },
  {
    id: "ad",
    label: "Anuncio",
    description:
      "Video estilo publicitario optimizado para redes sociales.",
    workflow: "ad-generator",
    icon: "📢",
  },
  {
    id: "free",
    label: "Libre",
    description:
      "Describe lo que quieres y la IA genera el video completo.",
    workflow: "prompt-to-video",
    icon: "✨",
  },
];

// ── Voice options (ElevenLabs via Revid) ──

export interface VoiceOption {
  id: string;
  name: string;
  gender: "female" | "male";
  description: string;
  tags: string[];
}

export const VOICE_OPTIONS: VoiceOption[] = [
  // ── Femeninas ──
  {
    id: "SmgKjOvC1aIujLWcMzqq",
    name: "Alisson",
    gender: "female",
    description: "Voz cálida y natural con acento colombiano suave. Ideal para el mercado local.",
    tags: ["Colombiana", "Cálida", "Natural"],
  },
  {
    id: "cgSgspJ2msm6clMCkdW9",
    name: "Jessica",
    gender: "female",
    description: "Voz joven y energética. Perfecta para contenido dinámico y llamativo en redes sociales.",
    tags: ["Energética", "Joven", "Multiidioma"],
  },
  {
    id: "oWSxI36XAKnfMWmzmQok",
    name: "Milena",
    gender: "female",
    description: "Voz suave y elegante con tono neutral. Ideal para propiedades de lujo y contenido premium.",
    tags: ["Elegante", "Suave", "Neutral"],
  },
  // ── Masculinas ──
  {
    id: "VvYiNBPylZtUh8Bf6u8l",
    name: "Juan",
    gender: "male",
    description: "Voz amigable y cercana. Transmite confianza de forma natural y relajada.",
    tags: ["Amigable", "Cercano", "Relajado"],
  },
  {
    id: "GcbypXUfJn5DbptRc2U7",
    name: "Luján",
    gender: "male",
    description: "Voz cálida y profesional con tono neutro. Versátil para todo tipo de propiedades.",
    tags: ["Profesional", "Cálida", "Versátil"],
  },
  {
    id: "beQfcCW5PgdTQs4cETaz",
    name: "Juan (Conversacional)",
    gender: "male",
    description: "Voz natural estilo conversación. Como si un amigo te recomendara la propiedad.",
    tags: ["Conversacional", "Natural", "Casual"],
  },
  {
    id: "57D8YIbQSuE3REDPO6Vm",
    name: "Horacio",
    gender: "male",
    description: "Voz segura y con autoridad. Transmite solidez y confiabilidad para propiedades de alto valor.",
    tags: ["Seguro", "Confiable", "Autoridad"],
  },
];

export const DEFAULT_VOICE_ID = "SmgKjOvC1aIujLWcMzqq"; // Alisson — colombiana
export const DEFAULT_MUSIC_TRACK = "Observer";
