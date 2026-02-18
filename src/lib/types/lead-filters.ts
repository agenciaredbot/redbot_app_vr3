export interface LeadFiltersState {
  search: string;
  stage: string;
  tags: string[]; // array of tag UUIDs
  source: string;
  budgetMin: string;
  budgetMax: string;
  timeline: string;
  preferredZones: string;
  dateFrom: string; // ISO date string yyyy-mm-dd
  dateTo: string;
}

export const EMPTY_FILTERS: LeadFiltersState = {
  search: "",
  stage: "",
  tags: [],
  source: "",
  budgetMin: "",
  budgetMax: "",
  timeline: "",
  preferredZones: "",
  dateFrom: "",
  dateTo: "",
};

/**
 * Convert filter state to URLSearchParams for the /api/leads endpoint.
 */
export function filtersToParams(
  filters: LeadFiltersState,
  page?: number,
  limit?: number
): URLSearchParams {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  if (filters.search) params.set("search", filters.search);
  if (filters.stage) params.set("stage", filters.stage);
  if (filters.tags.length > 0) params.set("tags", filters.tags.join(","));
  if (filters.source) params.set("source", filters.source);
  if (filters.budgetMin) params.set("budget_min", filters.budgetMin);
  if (filters.budgetMax) params.set("budget_max", filters.budgetMax);
  if (filters.timeline) params.set("timeline", filters.timeline);
  if (filters.preferredZones)
    params.set("preferred_zones", filters.preferredZones);
  if (filters.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters.dateTo) params.set("date_to", filters.dateTo);
  return params;
}

/**
 * Count active advanced filters (excludes search and stage which are always visible in toolbar).
 */
export function countActiveFilters(filters: LeadFiltersState): number {
  let count = 0;
  if (filters.tags.length > 0) count++;
  if (filters.source) count++;
  if (filters.budgetMin || filters.budgetMax) count++;
  if (filters.timeline) count++;
  if (filters.preferredZones) count++;
  if (filters.dateFrom || filters.dateTo) count++;
  return count;
}
