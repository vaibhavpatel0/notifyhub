export type CollegeStatus = "onboarding" | "pending_review" | "active" | "suspended" | "rejected";
export type VerificationStatus = "pending" | "manual_review" | "verified" | "rejected";
export type AdminRole = "college_admin" | "department_admin";
export type ContentScope = "college" | "department";
export type ContentStatus = "draft" | "published" | "archived";

export interface HomepageSections {
  urgent: boolean;
  important: boolean;
  announcements: boolean;
  events: boolean;
  departments: boolean;
  about: boolean;
  contact: boolean;
}

export interface SocialLinks {
  website?: string;
  facebook?: string;
  instagram?: string;
  x?: string;
  linkedin?: string;
  youtube?: string;
}

export interface College {
  id: string;
  name: string;
  short_name: string | null;
  slug: string | null;
  official_website: string;
  website_domain: string;
  official_email: string | null;
  description: string | null;
  about: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  welcome_heading: string | null;
  welcome_text: string | null;
  address: string | null;
  phone: string | null;
  contact_email: string | null;
  social_links: SocialLinks;
  brand_color: string;
  timezone: string;
  homepage_sections: HomepageSections;
  is_demo: boolean;
  status: CollegeStatus;
  verification_status: VerificationStatus;
  verification_method: string | null;
  verified: boolean;
  verified_at: string | null;
  published_at: string | null;
  status_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  college_id: string;
  name: string;
  code: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  head_name: string | null;
  show_head: boolean;
  status: "active" | "hidden";
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DepartmentRef {
  id: string;
  name: string;
  code: string;
  slug: string;
}

export interface Announcement {
  id: string;
  college_id: string;
  department_id: string | null;
  ref_no: number | null;
  ref_year: number | null;
  title: string;
  description: string;
  category: string;
  scope: ContentScope;
  attachment_url: string | null;
  attachment_name: string | null;
  image_url: string | null;
  is_urgent: boolean;
  is_pinned: boolean;
  status: ContentStatus;
  published_at: string;
  expires_at: string | null;
  view_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  department?: DepartmentRef | null;
}

/** Row returned by the search_announcements RPC */
export interface AnnouncementSearchRow {
  id: string;
  ref_no: number | null;
  ref_year: number | null;
  title: string;
  description: string;
  category: string;
  scope: ContentScope;
  department_id: string | null;
  department_name: string | null;
  department_code: string | null;
  department_slug: string | null;
  attachment_url: string | null;
  image_url: string | null;
  is_urgent: boolean;
  is_pinned: boolean;
  published_at: string;
  expires_at: string | null;
  total_count: number;
}

export interface CampusEvent {
  id: string;
  college_id: string;
  department_id: string | null;
  scope: ContentScope;
  title: string;
  description: string;
  venue: string | null;
  organizer: string | null;
  starts_at: string;
  ends_at: string | null;
  image_url: string | null;
  registration_url: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  countdown_enabled: boolean;
  status: ContentStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  department?: DepartmentRef | null;
}

export interface AdminMember {
  id: string;
  college_id: string;
  user_id: string;
  name: string;
  email: string;
  role: AdminRole;
  department_id: string | null;
  status: "active" | "disabled";
  created_at: string;
  department?: DepartmentRef | null;
}

export interface NotificationRow {
  id: string;
  college_id: string | null;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  college_id: string | null;
  admin_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string | null;
  created_at: string;
}

/** Normalised result of a server action, safe to hand to the client. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
