import { Building2, Coins, Lock, Languages, Hash, FileDown, History, LayoutDashboard } from "lucide-react";
import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/ui/reveal";

const icons = [Building2, Coins, Lock, Languages, Hash, FileDown, History, LayoutDashboard];

export function Platform() {
  const t = useTranslations("platform");
  const items = t.raw("items") as { title: string; desc: string }[];
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading title={t("title")} />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => {
            const Icon = icons[i % icons.length];
            return (
              <Reveal key={i} delay={(i % 4) * 0.05}>
                <div className="h-full rounded-2xl bg-lavender/50 p-5">
                  <Icon className="h-6 w-6 text-indigo-brand" />
                  <h3 className="mt-3 font-semibold text-midnight">{it.title}</h3>
                  <p className="mt-1.5 text-sm text-midnight/65">{it.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
