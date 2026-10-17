"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight, Sparkles } from "lucide-react";
import { DemoButton } from "@/components/demo/demo-dialog";
import { ButtonLink } from "@/components/ui/button-link";
import { withBase } from "@/lib/site";

export function Hero() {
  const t = useTranslations("hero");
  return (
    <section className="relative overflow-hidden mesh-bg pt-28 pb-20 sm:pt-32 lg:pt-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-violet-brand/25 bg-white/70 px-4 py-1.5 text-sm font-medium text-indigo-brand"
            >
              <Sparkles className="h-4 w-4 text-violet-brand" />
              {t("eyebrow")}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-midnight sm:text-5xl lg:text-6xl"
            >
              {t("title")} <span className="brand-text-gradient">{t("titleAccent")}</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="mt-6 max-w-xl text-lg leading-relaxed text-midnight/70"
            >
              {t("subtitle")}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.19 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <DemoButton size="lg">
                {t("ctaDemo")} <ArrowRight className="h-5 w-5 rtl:rotate-180" />
              </DemoButton>
              <ButtonLink href="#features" variant="outline" size="lg">
                {t("ctaExplore")}
              </ButtonLink>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-6 text-sm text-midnight/55"
            >
              {t("trust")}
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="absolute -inset-6 brand-gradient opacity-20 blur-3xl rounded-full" aria-hidden />
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <Image
                src={withBase("/screens/hero-dashboard.png")}
                alt={t("mockupAlt")}
                width={1200}
                height={820}
                priority
                className="w-full h-auto drop-shadow-2xl"
              />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
