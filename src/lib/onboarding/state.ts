/** Serializable onboarding state shared by the server actions and the wizard UI. */
export interface AnalysisSummary {
  status: "completed" | "failed" | "blocked";
  name: string | null;
  description: string | null;
  logo: string | null;
  address: string | null;
  phones: string[];
  emails: string[];
  officialEmails: string[];
  departments: { code: string; name: string }[];
  pagesVisited: string[];
  error?: string;
}

export interface WizardState {
  stage: number;
  college: {
    name: string;
    shortName: string | null;
    website: string;
    domain: string;
    description: string | null;
    address: string | null;
    phone: string | null;
    officialEmail: string | null;
    slug: string | null;
    status: string;
    verificationStatus: string;
    verificationMethod: string | null;
  };
  contact: { name: string; email: string; phone: string | null };
  analysis: AnalysisSummary | null;
  verification: {
    email: string | null;
    dnsHost: string;
    dnsValue: string;
    metaTag: string;
  };
  departments: { code: string; name: string }[];
  portal: { url: string; host: string; adminUrl: string; published: boolean } | null;
  /** Only present right after the account step, when department heads were added. */
  hodInvites?: HodInvite[];
}

export interface HodInvite {
  department: string;
  name: string;
  email: string;
  /** sent: email delivered; link: share the link by hand; existing: can sign in now. */
  status: "sent" | "link" | "existing" | "failed";
  link?: string;
}

export const STAGES = [
  "Website submitted",
  "Website analysed",
  "Official email detected",
  "Email verification",
  "College verification",
  "Address selection",
  "Account created",
  "Portal published",
] as const;
