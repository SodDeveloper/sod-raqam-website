import type { ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Poppins, IBM_Plex_Sans_Arabic } from "next/font/google";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";
import "../globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const isAr = locale === "ar";
  const url = `${SITE_URL}/${locale}/`;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t("title"),
      template: `%s — SOD Raqam`,
    },
    description: t("description"),
    applicationName: "SOD Raqam",
    keywords: [
      "ERP software",
      "ERP UAE",
      "ERP Qatar",
      "GCC ERP",
      "Laravel ERP",
      "accounting software",
      "inventory management",
      "CRM",
      "SOD Raqam",
    ],
    alternates: {
      canonical: url,
      languages: {
        en: `${SITE_URL}/en/`,
        ar: `${SITE_URL}/ar/`,
        "x-default": `${SITE_URL}/en/`,
      },
    },
    openGraph: {
      type: "website",
      url,
      siteName: "SOD Raqam",
      title: t("title"),
      description: t("description"),
      locale: isAr ? "ar_AE" : "en_US",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "SOD Raqam" }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: ["/og.png"],
    },
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon-32x32.png", sizes: "32x32" },
      ],
      apple: "/apple-touch-icon.png",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className={`${poppins.variable} ${arabic.variable}`}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
