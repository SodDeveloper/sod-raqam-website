"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Mail, ArrowRight, CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Reveal } from "@/components/ui/reveal";
import { CONTACT_EMAIL, DEMO_URL } from "@/lib/site";
import { Branches } from "@/components/branches";

const ENDPOINT =
  process.env.NEXT_PUBLIC_LEAD_ENDPOINT ||
  "https://erp.sodraqam.com/api/website-lead";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/;

type Status = "idle" | "sending" | "ok" | "err";

export function Contact() {
  const t = useTranslations("contact");
  const f = useTranslations("form");
  const locale = useLocale();
  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState("");
  const countries = f.raw("countries") as string[];
  const interests = f.raw("interests") as string[];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries()) as Record<string, string>;
    if (!data.name?.trim() || !data.email?.trim() || !data.phone?.trim()) {
      setStatus("err"); setMsg(f("required")); return;
    }
    if (!EMAIL_RE.test(data.email)) {
      setStatus("err"); setMsg(f("invalidEmail")); return;
    }
    setStatus("sending"); setMsg("");
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, locale }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("ok"); setMsg(f("success"));
      (e.target as HTMLFormElement).reset();
    } catch {
      setStatus("err"); setMsg(f("error"));
    }
  }

  const field =
    "w-full rounded-xl border border-indigo-brand/15 bg-white px-4 py-3 text-sm text-midnight placeholder:text-midnight/40 focus:border-violet-brand focus:outline-none focus:ring-2 focus:ring-violet-brand/25";

  return (
    <section id="contact" className="mesh-bg py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight text-midnight sm:text-4xl">{t("title")}</h2>
            <p className="mt-4 text-lg text-midnight/65">{t("subtitle")}</p>
            <div className="mt-8 space-y-4">
              <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-3 text-midnight/80 hover:text-indigo-brand">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white card-shadow">
                  <Mail className="h-5 w-5 text-indigo-brand" />
                </span>
                <span><span className="block text-xs text-midnight/50">{t("email")}</span>{CONTACT_EMAIL}</span>
              </a>
            </div>
            <div className="mt-10 rounded-2xl border border-indigo-brand/10 bg-white/70 p-6 card-shadow">
              <h3 className="font-semibold text-midnight">{t("demoTitle")}</h3>
              <p className="mt-1.5 text-sm text-midnight/65">{t("demoDesc")}</p>
              <ButtonLink href={DEMO_URL} target="_blank" rel="noopener" variant="outline" size="sm" className="mt-4">
                {t("demoButton")} <ExternalLink className="h-4 w-4" />
              </ButtonLink>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            {status === "ok" ? (
              <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-indigo-brand/10 bg-white p-10 text-center card-shadow">
                <CheckCircle2 className="h-14 w-14 text-green-500" />
                <h3 className="mt-4 text-xl font-bold text-midnight">{f("successTitle")}</h3>
                <p className="mt-2 text-midnight/65">{msg}</p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="rounded-3xl border border-indigo-brand/10 bg-white p-6 card-shadow sm:p-8" noValidate>
                {/* honeypot */}
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <label className="mb-1.5 block text-sm font-medium text-midnight">{f("name")} *</label>
                    <input name="name" required placeholder={f("namePh")} className={field} />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="mb-1.5 block text-sm font-medium text-midnight">{f("company")}</label>
                    <input name="company" placeholder={f("companyPh")} className={field} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-midnight">{f("email")} *</label>
                    <input name="email" type="email" required placeholder={f("emailPh")} className={field} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-midnight">{f("phone")} *</label>
                    <input name="phone" required placeholder={f("phonePh")} className={field} dir="ltr" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-midnight">{f("country")}</label>
                    <select name="country" className={field} defaultValue="">
                      <option value="" disabled>—</option>
                      {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-midnight">{f("interest")}</label>
                    <select name="interest" className={field} defaultValue="">
                      <option value="" disabled>—</option>
                      {interests.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-midnight">{f("message")}</label>
                    <textarea name="message" rows={4} placeholder={f("messagePh")} className={field} />
                  </div>
                </div>
                {status === "err" && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{msg}</span>
                  </div>
                )}
                <Button type="submit" size="lg" className="mt-6 w-full" disabled={status === "sending"}>
                  {status === "sending" ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> {f("submitting")}</>
                  ) : (
                    <>{f("submit")} <ArrowRight className="h-5 w-5 rtl:rotate-180" /></>
                  )}
                </Button>
                <p className="mt-3 text-center text-xs text-midnight/50">{f("consent")}</p>
              </form>
            )}
          </Reveal>
        </div>

        <div className="mt-12">
          <Reveal>
            <h3 className="text-center text-xl font-bold text-midnight sm:text-2xl">{t("branchesTitle")}</h3>
            <div className="mx-auto mt-6 max-w-5xl">
              <Branches />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
