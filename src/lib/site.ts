export const SITE_URL = "https://sodraqam.com";
export const DEMO_URL = "https://poc.soderp.com";
export const CONTACT_EMAIL = "info@sodtechnologies.com";
export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
/** Prefix an internal, locale-rooted path with the deployment base path. */
export function withBase(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${p}`;
}
