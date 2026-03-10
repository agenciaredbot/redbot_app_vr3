/**
 * Social Publishing — Types
 *
 * Defines types for Late API integration and social media publishing.
 * Each tenant has their own Late account/API key.
 */

// ──────────────────────────────────────────────
//  Late API response types (raw from API)
// ──────────────────────────────────────────────

/** Raw account shape returned by Late API GET /v1/accounts */
export interface LateRawAccount {
  _id: string;
  platform: string;
  username: string;
  displayName?: string;
  profileUrl?: string;
  isActive?: boolean;
  profileId?: { _id: string; name: string; slug: string };
}

/** Normalized account used throughout Redbot */
export interface LateAccount {
  id: string;
  platform: string;
  username: string;
  displayName: string;
  profilePictureUrl?: string;
}

export interface LatePresignedUrlResponse {
  uploadUrl: string;
  publicUrl: string;
}

export interface LatePostResponse {
  _id: string;
  status: string;
  platforms?: Array<{
    platform: string;
    accountId: unknown;
    status: string;
    platformPostId?: string;
    platformPostUrl?: string;
    publishedAt?: string;
  }>;
}

// ──────────────────────────────────────────────
//  DB types (matching migration)
// ──────────────────────────────────────────────

export type SocialPostStatus = "pending" | "publishing" | "published" | "failed";

export interface SocialConnection {
  id: string;
  organization_id: string;
  platform: string;
  api_key: string;
  is_active: boolean;
  connected_accounts: LateAccount[];
  last_validated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialPost {
  id: string;
  organization_id: string;
  property_id: string;
  connection_id: string;
  platform: string;
  platform_post_id: string | null;
  platform_post_url: string | null;
  status: SocialPostStatus;
  caption: string | null;
  images_used: string[];
  error_message: string | null;
  published_at: string | null;
  created_at: string;
}

// ──────────────────────────────────────────────
//  Publish request types
// ──────────────────────────────────────────────

export interface PublishCarouselRequest {
  propertyId: string;
  accountId: string;
  caption: string;
  imageUrls: string[];
}

export interface PublishCarouselResult {
  success: boolean;
  postUrl?: string;
  postId?: string;
  error?: string;
}
