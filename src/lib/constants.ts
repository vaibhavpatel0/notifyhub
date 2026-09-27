/**
 * Announcement categories. Stored as a slug in announcements.category,
 * which accepts any slug so colleges can get custom categories later
 * without a schema change.
 */
export const CATEGORIES = [
  { value: "academic", label: "Academic" },
  { value: "examination", label: "Examination" },
  { value: "placement", label: "Placement" },
  { value: "event", label: "Event" },
  { value: "workshop", label: "Workshop" },
  { value: "holiday", label: "Holiday" },
  { value: "circular", label: "Circular" },
  { value: "general", label: "General" },
  { value: "important", label: "Important" },
  { value: "other", label: "Other" },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];

export function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** Filter chips shown on the public announcements page (spec: All, Academic, Exams, Placements, Events, Workshops, Urgent). */
export const QUICK_FILTERS = [
  { key: "all", label: "All" },
  { key: "urgent", label: "Urgent" },
  { key: "academic", label: "Academic" },
  { key: "examination", label: "Exams" },
  { key: "placement", label: "Placements" },
  { key: "event", label: "Events" },
  { key: "workshop", label: "Workshops" },
  { key: "holiday", label: "Holidays" },
  { key: "circular", label: "Circulars" },
] as const;

/**
 * Portal accent colours a college can choose from. Each passes WCAG AA
 * (4.5:1) for white text, so buttons and the header always stay readable.
 */
export const BRAND_COLORS = [
  { value: "#1f4e8c", label: "Registry blue" },
  { value: "#7a1f2b", label: "Maroon" },
  { value: "#1d5c45", label: "Forest" },
  { value: "#0f5c6e", label: "Teal" },
  { value: "#3b3f8f", label: "Indigo" },
  { value: "#5a4214", label: "Bronze" },
  { value: "#1f2a37", label: "Charcoal" },
] as const;

export const UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
export const ATTACHMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ...IMAGE_TYPES,
];
export const STORAGE_BUCKET = "college-files";
