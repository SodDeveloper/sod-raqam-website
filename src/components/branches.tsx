import { useTranslations } from "next-intl";
import { MapPin, Phone, Mail } from "lucide-react";
import { BRANCHES, CONTACT_EMAIL } from "@/lib/site";

/** Branch contact cards. Data from the official SOD Infotech site. */
export function Branches({ variant = "cards" }: { variant?: "cards" | "footer" }) {
  const t = useTranslations("contact");
  const b = useTranslations("branches");

  if (variant === "footer") {
    return (
      <div className="grid gap-6 sm:grid-cols-3">
        {BRANCHES.map((br) => (
          <div key={br.id}>
            <h4 className="text-sm font-semibold text-white">{b(br.id)}</h4>
            <p className="mt-2 text-sm leading-relaxed text-white/55">{br.address}</p>
            {br.phone && (
              <a href={`tel:${br.phone.replace(/\s/g, "")}`} dir="ltr" className="mt-1 inline-block text-sm text-white/70 hover:text-white">
                {br.phone}
              </a>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {BRANCHES.map((br) => (
        <div key={br.id} className="rounded-2xl border border-indigo-brand/10 bg-white p-5 card-shadow">
          <h4 className="font-semibold text-midnight">{b(br.id)}</h4>
          <div className="mt-3 flex items-start gap-2 text-sm text-midnight/70">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-violet-brand" />
            <span className="leading-relaxed">{br.address}</span>
          </div>
          {br.phone && (
            <a href={`tel:${br.phone.replace(/\s/g, "")}`} className="mt-3 flex items-center gap-2 text-sm text-indigo-brand hover:underline">
              <Phone className="h-4 w-4" />
              <span dir="ltr">{br.phone}</span>
              <span className="sr-only">{t("call")}</span>
            </a>
          )}
          <a href={`mailto:${CONTACT_EMAIL}`} className="mt-2 flex items-center gap-2 text-sm text-indigo-brand hover:underline">
            <Mail className="h-4 w-4" />
            <span dir="ltr">{CONTACT_EMAIL}</span>
          </a>
        </div>
      ))}
    </div>
  );
}
