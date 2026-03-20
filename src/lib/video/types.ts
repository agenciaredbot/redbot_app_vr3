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
  id: string;
  status?: string;
  [key: string]: unknown;
}

export interface RevidStatusResponse {
  status: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  creditsUsed?: number;
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

// ── Default voice for Spanish (Colombia) ──
export const DEFAULT_VOICE_ID = "cgSgspJ2msm6clMCkdW9"; // ElevenLabs Spanish voice
export const DEFAULT_MUSIC_TRACK = "Observer";
