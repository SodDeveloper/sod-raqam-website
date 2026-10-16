import { Link2, Languages, Globe, ShieldCheck, Zap, Headset } from "lucide-react";
import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/ui/reveal";

const icons = [Link2, Languages, Globe, ShieldCheck, Zap, Headset];

export function Why() {
  const t = useTranslations("why");
  const items = t.raw("items") as { title: string; desc: string }[];
  return (
    <section id="why" className="relative overflow-hidden brand-gradient py-20 sm:py-28 text-white">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(40rem 40rem at 80% 0%, white, transparent 60%)" }} aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h2>
        </Reveal>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it, i) => {
            const Icon = icons[i % icons.length];
            return (
              <Reveal key={i} delay={(i % 3) * 0.06}>
                <div className="h-full rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm">
                  <Icon className="h-7 w-7 text-white/90" />
                  <h3 className="mt-4 text-lg font-semibold">{it.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/75">{it.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
