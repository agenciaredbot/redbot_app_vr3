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
    stylePrompt?: string;
    durationSeconds?: number;
  };
  media?: {
    type: "custom" | "moving-image" | "stock-video" | "ai-video";
    quality?: "standard" | "pro" | "ultra";
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
    enabled?: boolean;
    trackName?: string;
    generateMusic?: boolean;
    generationMusicPrompt?: string;
  };
  render?: {
    resolution?: "720p" | "1080p" | "4k";
  };
  options?: {
    soundEffects?: boolean;
    addStickers?: boolean;
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
  voiceSpeed?: number;
  musicTrack?: string;
  generateMusic?: boolean;
  musicPrompt?: string;
  captionPreset?: string;
  captionPosition?: "top" | "middle" | "bottom";
  enableCaptions?: boolean;
  enableVoice?: boolean;
  enableMusic?: boolean;
  aspectRatio?: string;
  resolution?: "720p" | "1080p" | "4k";
  mediaQuality?: "standard" | "pro" | "ultra";
  animation?: "none" | "soft" | "dynamic" | "depth";
  soundEffects?: boolean;
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
export const DEFAULT_MUSIC_TRACK = "Motivational";
export const DEFAULT_CAPTION_PRESET = "Wrap 1";
export const DEFAULT_RESOLUTION = "1080p";

// ── Caption presets ──

export interface CaptionPresetOption {
  id: string;
  label: string;
  description: string;
}

export const CAPTION_PRESETS: CaptionPresetOption[] = [
  { id: "Wrap 1", label: "Wrap 1", description: "Subtítulos envolventes con animación. El más popular." },
  { id: "Wrap 2", label: "Wrap 2", description: "Variante envolvente con estilo alternativo." },
  { id: "Revid", label: "Revid", description: "Estilo propio de Revid, moderno y limpio." },
  { id: "Hormozi", label: "Hormozi", description: "Estilo Alex Hormozi: grande, bold e impactante." },
  { id: "Basic", label: "Básico", description: "Subtítulos simples y legibles sin decoración." },
  { id: "Karate", label: "Karate", description: "Efecto dinámico con animación de corte rápido." },
  { id: "Pop", label: "Pop", description: "Estilo colorido y llamativo para contenido juvenil." },
  { id: "Neon", label: "Neon", description: "Efecto neón brillante sobre fondo oscuro." },
  { id: "Ali Abdaal", label: "Ali Abdaal", description: "Estilo educativo minimalista y elegante." },
  { id: "Faceless", label: "Faceless", description: "Optimizado para videos sin rostro (solo voz)." },
];

// ── Music tracks ──

export interface MusicTrackOption {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

export const MUSIC_TRACKS: MusicTrackOption[] = [
  { id: "Motivational", label: "Motivacional", emoji: "💪", description: "Energía positiva, ideal para propiedades aspiracionales" },
  { id: "Corporate", label: "Corporativo", emoji: "🏢", description: "Profesional y serio, ideal para oficinas y comercial" },
  { id: "Upbeat", label: "Upbeat", emoji: "🎵", description: "Ritmo alegre y dinámico para captar atención rápido" },
  { id: "Cinematic", label: "Cinemático", emoji: "🎬", description: "Épico y dramático, ideal para propiedades de lujo" },
  { id: "Chill", label: "Chill", emoji: "😌", description: "Relajado y suave, perfecto para casas campestres" },
  { id: "Happy", label: "Alegre", emoji: "😊", description: "Positivo y ligero, bueno para familias" },
  { id: "Epic", label: "Épico", emoji: "⚡", description: "Grandioso e imponente, para proyectos de gran escala" },
  { id: "Lo-Fi", label: "Lo-Fi", emoji: "🎧", description: "Ambiente tranquilo y moderno, estilo tendencia" },
  { id: "Observer", label: "Observer", emoji: "🔭", description: "Neutral y contemplativo, versátil para todo tipo" },
  { id: "Sad", label: "Melancólico", emoji: "🌧️", description: "Emotivo y profundo, para storytelling" },
];

// ── Resolution options ──

export interface ResolutionOption {
  id: "720p" | "1080p" | "4k";
  label: string;
  description: string;
}

export const RESOLUTION_OPTIONS: ResolutionOption[] = [
  { id: "720p", label: "720p", description: "Rápido, menos créditos" },
  { id: "1080p", label: "1080p HD", description: "Calidad estándar, recomendado" },
  { id: "4k", label: "4K Ultra HD", description: "Máxima calidad, más créditos" },
];

// ── Aspect ratio options ──

export interface AspectRatioOption {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export const ASPECT_RATIO_OPTIONS: AspectRatioOption[] = [
  { id: "9 / 16", label: "Vertical", icon: "📱", description: "TikTok, Reels, Shorts" },
  { id: "16 / 9", label: "Horizontal", icon: "🖥️", description: "YouTube, Web" },
  { id: "1 / 1", label: "Cuadrado", icon: "⬜", description: "Feed de Instagram" },
];

// ── Animation options ──

export interface AnimationOption {
  id: "none" | "soft" | "dynamic" | "depth";
  label: string;
  description: string;
}

export const ANIMATION_OPTIONS: AnimationOption[] = [
  { id: "soft", label: "Suave", description: "Movimiento sutil y elegante" },
  { id: "dynamic", label: "Dinámico", description: "Movimiento enérgico y llamativo" },
  { id: "depth", label: "Profundidad", description: "Efecto 3D con parallax" },
  { id: "none", label: "Sin animación", description: "Imágenes estáticas" },
];
