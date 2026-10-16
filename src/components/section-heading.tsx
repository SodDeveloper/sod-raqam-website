import { Reveal } from "@/components/ui/reveal";

export function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <h2 className="text-3xl font-bold tracking-tight text-midnight sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-lg text-midnight/65">{subtitle}</p>}
    </Reveal>
  );
}
