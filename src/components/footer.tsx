import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { DemoLink } from "@/components/demo/demo-dialog";
import { CONTACT_EMAIL, withBase } from "@/lib/site";
import { Branches } from "@/components/branches";

export function Footer() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");
  const c = useTranslations("contact");
  const locale = useLocale();
  const year = new Date().getFullYear();
  return (
    <footer className="bg-midnight text-white/80">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Image src={withBase("/brand/logo-white.svg")} alt="SOD Raqam" width={160} height={36} className="h-9 w-auto" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">{t("tagline")}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">{t("product")}</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><a href="#features" className="hover:text-white">{nav("features")}</a></li>
              <li><a href="#modules" className="hover:text-white">{nav("modules")}</a></li>
              <li><a href="#screenshots" className="hover:text-white">{nav("screenshots")}</a></li>
              <li><DemoLink className="text-start hover:text-white">{nav("demo")}</DemoLink></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">{t("company")}</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><a href="#why" className="hover:text-white">{nav("why")}</a></li>
              <li><a href="#industries" className="hover:text-white">{nav("industries")}</a></li>
              <li><a href="#contact" className="hover:text-white">{nav("contact")}</a></li>
              <li className="mt-4 border-t border-white/10 pt-4 text-white/55">{c("email")}: <a href={`mailto:${CONTACT_EMAIL}`} dir="ltr" className="text-white/80 hover:text-white">{CONTACT_EMAIL}</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-white/10 pt-10">
          <h4 className="text-sm font-semibold text-white">{t("offices")}</h4>
          <div className="mt-5">
            <Branches variant="footer" />
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row">
          <p>© {year} SOD Raqam. {t("rights")}</p>
        </div>
      </div>
    </footer>
  );
}
