import { useTranslations } from "next-intl";
import { withBase } from "@/lib/site";

/** Office countries shown as flags and names separated by pipes (same as the brochure). */
const COUNTRIES = [
  { id: "uae", flag: "ae" },
  { id: "qatar", flag: "qa" },
  { id: "india", flag: "in" },
] as const;

export function Branches({ variant = "cards" }: { variant?: "cards" | "footer" }) {
  const b = useTranslations("branches");
  const footer = variant === "footer";
  return (
    <ul
      className={
        footer
          ? "flex flex-wrap items-center gap-x-5 gap-y-3 text-base font-semibold text-white"
          : "flex flex-wrap items-center justify-center gap-x-6 gap-y-3 rounded-2xl border border-indigo-brand/10 bg-white px-6 py-5 text-lg font-semibold text-midnight card-shadow"
      }
    >
      {COUNTRIES.map((c, i) => (
        <li key={c.id} className="flex items-center gap-5">
          {i > 0 && <span aria-hidden="true" className={footer ? "h-5 w-px bg-white/25" : "h-6 w-px bg-midnight/15"} />}
          <span className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={withBase(`/flags/${c.flag}.svg`)} alt="" width={28} height={19} className="h-[19px] w-7 rounded-[3px] object-cover ring-1 ring-black/10" />
            {b(c.id)}
          </span>
        </li>
      ))}
    </ul>
  );
}
