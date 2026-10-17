import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { DemoButton } from "@/components/demo/demo-dialog";
import { ButtonLink } from "@/components/ui/button-link";
import { Reveal } from "@/components/ui/reveal";

export function Cta() {
  const t = useTranslations("cta");
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl brand-gradient px-8 py-16 text-center text-white sm:px-16">
            <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "radial-gradient(30rem 30rem at 50% 120%, white, transparent 60%)" }} aria-hidden />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-3xl font-bold sm:text-4xl">{t("title")}</h2>
              <p className="mx-auto mt-4 max-w-xl text-white/80">{t("subtitle")}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <DemoButton variant="white" size="lg">
                  {t("button")} <ArrowRight className="h-5 w-5 rtl:rotate-180" />
                </DemoButton>
                <ButtonLink href="#contact" variant="outline" size="lg" className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:border-white/60">
                  {t("secondary")}
                </ButtonLink>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
