export const SITE_URL = "https://sodraqam.com";
export const RAQAM_APP_URL = "https://erp.sodraqam.com";
export const LEAD_ENDPOINT = process.env.NEXT_PUBLIC_LEAD_ENDPOINT || "https://erp.sodraqam.com/api/website-lead";
export const CONTACT_EMAIL = "info@sodinfotech.com";
export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
/** Prefix an internal, locale-rooted path with the deployment base path. */
export function withBase(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${p}`;
}

export type Branch = { id: "qatar" | "uae" | "india"; address: string; phone?: string };
// Source: official SOD Infotech site https://sodinfotech.com/contact (branch list).
export const BRANCHES: Branch[] = [
  { id: "qatar", address: "Building No 43, Street 46, Zone 46 Doha, Qatar" },
  { id: "uae", address: "Meydan Grandstand, 6th Floor, Meydan Road, Nad Al Sheba Dubai, UAE", phone: "+971589074828" },
  { id: "india", address: "Jigsaw, Kandamkulathy Towers, MG Road, Ernakulam, Near Maharajas Metro Station, 682011" },
];
