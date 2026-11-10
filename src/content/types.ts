// Content schema — single source of truth for the reader (static HTML) and KimOS (laptop UI).
// Data lives in src/content/*.json and must satisfy these types.

export interface Profile {
  name: string;            // "Kim Edrian Binasoy"
  shortName: string;       // "Kim"
  partner: string;         // "Wingwing"
  location: string;        // "Toronto, Canada"
  status: string;          // "Open to work"
  roles: string[];         // ["Cloud & DevOps Engineer", "QA Automation", "AI"]
  tagline: string;         // one-liner
  bio: string[];           // paragraphs
  stats: { value: string; label: string }[];
  links: { label: string; href: string; kind: "github" | "linkedin" | "email" | "site" | "resume" | "other" }[];
  resumePdf: string;       // "/Kim_Binasoy_Resume.pdf"
}

export interface Cert {
  id: string;              // kebab-case, e.g. "gcp-devops"
  issuer: string;          // "Google Cloud"
  name: string;
  blurb: string;
  vendor: "gcp" | "azure" | "aws" | "google-ai" | "other";
  featured: boolean;       // false for the "also certified" list
}

export interface SkillGroup {
  title: string;
  items: string[];
}

export interface Job {
  id: string;
  role: string;
  company: string;
  start: string;           // as written in source, e.g. "2024"
  end: string;             // "Present" allowed
  location?: string;
  summary?: string;
  bullets: string[];
}

export interface Project {
  id: string;
  name: string;
  tagline: string;
  description: string;
  tags: string[];
  href?: string;
  metric?: string;
}

export interface Photo {
  id: string;
  src: string;             // path under /photos/
  caption: string;
  alt: string;
}

export interface Content {
  profile: Profile;
  certs: Cert[];
  skills: SkillGroup[];
  experience: Job[];
  projects: Project[];
  photos: Photo[];
}
