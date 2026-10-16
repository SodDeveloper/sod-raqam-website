import { Store, HardHat, Factory, Briefcase } from "lucide-react";
import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/ui/reveal";

const icons = [Store, HardHat, Factory, Briefcase];

export function Industries() {
  const t = useTranslations("industries");
  const items = t.raw("items") as { title: string; desc: string }[];
  return (
    <section id="industries" className="mesh-bg py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => {
            const Icon = icons[i % icons.length];
            return (
              <Reveal key={i} delay={(i % 4) * 0.06}>
                <div className="h-full rounded-2xl border border-indigo-brand/10 bg-white p-6 card-shadow">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lavender">
                    <Icon className="h-6 w-6 text-indigo-brand" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-midnight">{it.title}</h3>
                  <p className="mt-2 text-sm text-midnight/65">{it.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
