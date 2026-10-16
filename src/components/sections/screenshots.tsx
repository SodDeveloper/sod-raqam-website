import Image from "next/image";
import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { withBase } from "@/lib/site";

const shots = [
  "dashboard", "crm-leads", "quotations", "costing-sheets",
  "invoices", "stock-ledger", "trial-balance", "profit-loss", "payroll",
] as const;

export function Screenshots() {
  const t = useTranslations("screenshots");
  return (
    <section id="screenshots" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shots.map((s, i) => (
            <Reveal key={s} delay={(i % 3) * 0.06}>
              <figure className="group overflow-hidden rounded-2xl">
                <div className="overflow-hidden rounded-2xl bg-lavender/40 p-2 transition-transform group-hover:-translate-y-1">
                  <Image
                    src={withBase(`/screens/${s}.png`)}
                    alt={t(`items.${s}`)}
                    width={1100}
                    height={760}
                    className="w-full h-auto"
                  />
                </div>
                <figcaption className="mt-3 text-center text-sm font-medium text-midnight/70">
                  {t(`items.${s}`)}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
