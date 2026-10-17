"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Maximize2 } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { Lightbox } from "@/components/lightbox";
import { withBase } from "@/lib/site";

const shots = [
  "dashboard",
  "dash-crm",
  "dash-sales",
  "dash-purchase",
  "dash-inventory",
  "dash-accounting",
  "dash-hr",
  "crm-leads",
  "quotations",
  "costing-sheets",
  "invoices",
  "stock-ledger",
  "trial-balance",
  "profit-loss",
  "payroll",
] as const;

export function Screenshots() {
  const t = useTranslations("screenshots");
  const lightbox = useTranslations("lightbox");
  const [index, setIndex] = useState<number | null>(null);
  const onClose = useCallback(() => setIndex(null), []);
  const onIndexChange = useCallback((next: number) => setIndex(next), []);

  const items = useMemo(
    () =>
      shots.map((key) => {
        const title = t(`items.${key}`);
        return {
          src: withBase(`/screens/full/${key}.webp`),
          alt: title,
          caption: title,
        };
      }),
    [t],
  );

  return (
    <section id="screenshots" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shots.map((key, i) => {
            const title = t(`items.${key}`);
            return (
              <Reveal key={key} delay={(i % 3) * 0.06}>
                <figure>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={lightbox("open", { title })}
                    className="group w-full rounded-2xl text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-brand focus-visible:ring-offset-2"
                  >
                    <div className="relative overflow-hidden rounded-2xl bg-lavender/40 p-2 transition-transform group-hover:-translate-y-1 group-focus-visible:-translate-y-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={withBase(`/screens/thumb/${key}.webp`)}
                        alt={title}
                        width={1036}
                        height={681}
                        loading={i < 3 ? "eager" : "lazy"}
                        decoding="async"
                        className="w-full h-auto"
                      />
                      <span className="pointer-events-none absolute end-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-midnight/75 text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        <Maximize2 className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </div>
                  </button>
                  <figcaption className="mt-3 text-center text-sm font-medium text-midnight/70">
                    {title}
                  </figcaption>
                </figure>
              </Reveal>
            );
          })}
        </div>
      </div>
      <Lightbox items={items} index={index} onClose={onClose} onIndexChange={onIndexChange} />
    </section>
  );
}
