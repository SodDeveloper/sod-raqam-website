import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/sections/hero";
import { Features } from "@/components/sections/features";
import { Modules } from "@/components/sections/modules";
import { Screenshots } from "@/components/sections/screenshots";
import { Platform } from "@/components/sections/platform";
import { Why } from "@/components/sections/why";
import { Industries } from "@/components/sections/industries";
import { Faq } from "@/components/sections/faq";
import { Cta } from "@/components/sections/cta";
import { Contact } from "@/components/sections/contact";
import { DemoProvider } from "@/components/demo/demo-dialog";
import { SITE_URL } from "@/lib/site";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "faq" });
  const meta = await getTranslations({ locale, namespace: "meta" });
  const faqItems = t.raw("items") as { q: string; a: string }[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "SOD Raqam",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: meta("description"),
        url: `${SITE_URL}/${locale}/`,
        offers: { "@type": "Offer", availability: "https://schema.org/InStock" },
        publisher: { "@type": "Organization", name: "SOD Technologies" },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqItems.map((it) => ({
          "@type": "Question",
          name: it.q,
          acceptedAnswer: { "@type": "Answer", text: it.a },
        })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <DemoProvider>
        <Header />
        <main>
          <Hero />
          <Features />
          <Modules />
          <Screenshots />
          <Platform />
          <Why />
          <Industries />
          <Faq />
          <Cta />
          <Contact />
        </main>
        <Footer />
      </DemoProvider>
    </>
  );
}
