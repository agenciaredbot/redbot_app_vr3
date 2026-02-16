import { CURRENCY_OPTIONS, PROPERTY_TYPES, BUSINESS_TYPES, PIPELINE_STAGES } from "@/config/constants";

export function formatPrice(amount: number, currency: string = "COP"): string {
  const currencyInfo = CURRENCY_OPTIONS.find((c) => c.value === currency);
  const symbol = currencyInfo?.symbol || "$";

  if (currency === "COP") {
    return `${symbol}${amount.toLocaleString("es-CO")}`;
  }

  return `${symbol}${(amount / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatArea(m2: number | null): string {
  if (!m2) return "-";
  return `${m2.toLocaleString("es-CO")} m²`;
}

export function formatPropertyType(type: string): string {
  return PROPERTY_TYPES.find((t) => t.value === type)?.label || type;
}

export function formatBusinessType(type: string): string {
  return BUSINESS_TYPES.find((t) => t.value === type)?.label || type;
}

export function formatPipelineStage(stage: string): string {
  return PIPELINE_STAGES.find((s) => s.value === stage)?.label || stage;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getI18nText(jsonb: unknown, locale: string = "es"): string {
  if (!jsonb) return "";
  if (typeof jsonb === "string") return jsonb;
  if (typeof jsonb === "object" && jsonb !== null) {
    const obj = jsonb as Record<string, string>;
    return obj[locale] || obj["es"] || obj["en"] || "";
  }
  return "";
}
