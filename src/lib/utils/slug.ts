/**
 * Generate a URL-friendly slug from a string.
 * Handles Spanish characters (accents, ñ).
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9\s-]/g, "") // Remove non-alphanumeric
    .replace(/\s+/g, "-") // Spaces to hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, ""); // Trim leading/trailing hyphens
}

/**
 * Generate a unique slug by appending a random suffix if needed.
 */
export function generateUniqueSlug(text: string): string {
  const base = generateSlug(text);
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}
