import {
  Users, ShoppingCart, Truck, Boxes, Calculator, UserCog, FileSpreadsheet, Globe2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/ui/reveal";

const icons = {
  crm: Users, sales: ShoppingCart, purchase: Truck, inventory: Boxes,
  accounting: Calculator, hr: UserCog, costing: FileSpreadsheet, multi: Globe2,
} as const;

export function Features() {
  const t = useTranslations("features");
  const keys = Object.keys(icons) as (keyof typeof icons)[];
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {keys.map((k, i) => {
            const Icon = icons[k];
            return (
              <Reveal key={k} delay={(i % 4) * 0.06}>
                <div className="group h-full rounded-2xl border border-indigo-brand/10 bg-white p-6 card-shadow transition-all hover:-translate-y-1 hover:border-violet-brand/30">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl brand-gradient text-white shadow-lg shadow-indigo-brand/20">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-midnight">{t(`items.${k}.title`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-midnight/65">{t(`items.${k}.desc`)}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
