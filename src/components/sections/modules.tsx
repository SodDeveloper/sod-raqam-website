import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/ui/reveal";

type Mod = { key: string; name: string; tagline: string; points: string[] };

export function Modules() {
  const t = useTranslations("modules");
  const list = t.raw("list") as Mod[];
  return (
    <section id="modules" className="mesh-bg py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        <div className="mt-14 space-y-6">
          {list.map((m, i) => (
            <Reveal key={m.key} delay={0.04}>
              <div className="grid gap-6 rounded-3xl border border-indigo-brand/10 bg-white/80 p-6 card-shadow lg:grid-cols-12 lg:p-8">
                <div className="lg:col-span-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-brand">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 text-2xl font-bold text-midnight">{m.name}</h3>
                  <p className="mt-2 text-indigo-brand/80 font-medium">{m.tagline}</p>
                </div>
                <div className="lg:col-span-8">
                  <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                    {m.points.map((p, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-midnight/75">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lavender">
                          <Check className="h-3.5 w-3.5 text-indigo-brand" />
                        </span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
