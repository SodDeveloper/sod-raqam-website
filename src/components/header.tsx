"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Menu, X, Globe } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { DEMO_URL, withBase } from "@/lib/site";
import { cn } from "@/lib/utils";

export function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === "ar" ? "en" : "ar";
  const switchHref = withBase(pathname.replace(`/${locale}`, `/${other}`) || `/${other}/`);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 10);
    on();
    window.addEventListener("scroll", on);
    return () => window.removeEventListener("scroll", on);
  }, []);

  const links = [
    ["features", "#features"],
    ["modules", "#modules"],
    ["screenshots", "#screenshots"],
    ["why", "#why"],
    ["industries", "#industries"],
    ["faq", "#faq"],
    ["contact", "#contact"],
  ] as const;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all",
        scrolled ? "glass card-shadow" : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href={withBase(`/${locale}/`)} className="flex items-center gap-2">
          <Image src={withBase("/brand/logo-horizontal.svg")} alt="SOD Raqam" width={150} height={34} priority className="h-8 w-auto" />
        </a>
        <nav className="hidden items-center gap-6 lg:flex">
          {links.map(([k, h]) => (
            <a key={k} href={h} className="text-sm font-medium text-midnight/75 transition-colors hover:text-indigo-brand">
              {t(k)}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a href={switchHref} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-indigo-brand hover:bg-lavender">
            <Globe className="h-4 w-4" /> {t("langLabel")}
          </a>
          <ButtonLink href={DEMO_URL} target="_blank" rel="noopener" size="sm" className="hidden sm:inline-flex">
            {t("demo")}
          </ButtonLink>
          <button className="lg:hidden rounded-full p-2 text-midnight" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="glass border-t border-indigo-brand/10 lg:hidden">
          <nav className="flex flex-col px-4 py-3">
            {links.map(([k, h]) => (
              <a key={k} href={h} onClick={() => setOpen(false)} className="py-2.5 text-sm font-medium text-midnight/80">
                {t(k)}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
